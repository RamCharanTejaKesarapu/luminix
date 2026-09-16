"""Tests for Luminix Final Health Device Integration Architecture.

Tests:
1. GET /api/v1/health/sources
2. POST /api/v1/health/connect
3. POST /api/v1/health/sync (with normalized samples)
4. GET /api/v1/health/latest (with strict Blood Pressure verification)
5. POST /api/v1/health/risk-analysis (Heat Risk Engine + disclaimer)
6. GET /api/v1/health/devices
7. GET /api/v1/health/summary
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api.main import app
from auth.firewall import firewall
from database.db import init_db


@pytest.fixture(autouse=True)
def reset_state():
    firewall.reset_state()
    init_db()
    yield


def test_get_sources():
    client = TestClient(app)
    res = client.get("/api/v1/health/sources")
    assert res.status_code == 200
    data = res.json()
    assert "sources" in data
    source_ids = [s["id"] for s in data["sources"]]
    assert "healthkit" in source_ids
    assert "health_connect" in source_ids
    assert "ble_omron" in source_ids


def test_connect_source():
    client = TestClient(app)
    res = client.post(
        "/api/v1/health/connect",
        json={
            "source": "healthkit",
            "device_id": "apple-watch-s9-001",
            "device_name": "Apple Watch Series 9",
            "app_version": "1.0.0",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "connected"
    assert data["bridge"] == "Luminix Mobile Health Bridge"


def test_sync_and_get_latest_with_strict_bp():
    client = TestClient(app)

    # 1. Sync batch of health metrics including heart rate, steps, hrv, spo2, blood pressure
    payload = {
        "source": "healthkit",
        "sync_mode": "incremental",
        "samples": [
            {
                "metric": "heart_rate",
                "value": 78.5,
                "unit": "bpm",
                "quality": "calibrated",
                "source": "healthkit",
            },
            {
                "metric": "steps",
                "value": 4520,
                "unit": "count",
                "quality": "calibrated",
                "source": "healthkit",
            },
            {
                "metric": "blood_pressure",
                "systolic": 118,
                "diastolic": 76,
                "unit": "mmHg",
                "quality": "cuff_verified",
                "source": "ble_omron",
                "device_id": "omron-bp-7450",
            },
            {
                "metric": "spo2",
                "value": 98.0,
                "unit": "%",
                "quality": "calibrated",
                "source": "healthkit",
            },
        ],
    }

    sync_res = client.post("/api/v1/health/sync", json=payload)
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["success"] is True
    assert sync_data["inserted"] == 4
    # Verify automatic risk analysis returned on sync (FETCH -> Sync -> Validate -> Risk Engine)
    assert "risk_evaluation" in sync_data
    assert sync_data["risk_evaluation"]["risk_level"] in ("LOW", "MODERATE", "HIGH", "CRITICAL")

    # 2. Query latest metrics
    latest_res = client.get("/api/v1/health/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert "metrics" in latest_data
    assert "heart_rate" in latest_data["metrics"]
    assert latest_data["metrics"]["heart_rate"]["value"] == 78.5

    # 3. Strict Blood Pressure verification
    bp_data = latest_data["metrics"].get("blood_pressure")
    assert bp_data is not None
    assert bp_data["systolic"] == 118
    assert bp_data["diastolic"] == 76
    assert bp_data["is_recent"] is True
    assert bp_data["age_seconds"] is not None
    assert bp_data["source"] == "ble_omron"
    assert bp_data["status_text"] != "No recent measurement"


def test_heat_risk_engine():
    client = TestClient(app)

    # Moderate heat risk evaluation
    payload = {
        "temperature_f": 92.0,
        "relative_humidity": 65.0,
        "current_heart_rate": 115.0,
        "baseline_heart_rate": 72.0,
        "activity_state": "active",
        "body_temp_f": 99.8,
        "spo2": 97.0,
        "systolic": 128,
        "diastolic": 82,
        "bp_age_seconds": 120,
    }

    risk_res = client.post("/api/v1/health/risk-analysis", json=payload)
    assert risk_res.status_code == 200
    data = risk_res.json()

    assert "heat_index_f" in data
    assert "heat_index_category" in data
    assert "risk_score" in data
    assert "risk_level" in data
    assert "alert_triggered" in data
    assert "recommendations" in data
    assert "disclaimer" in data
    assert "risk_model_architecture" in data
    assert data["risk_model_architecture"]["is_clinically_validated"] is False
    assert data["blood_pressure_status"]["measurement_label"] == "latest_available_bp_measurement"
    # Verify clinical decision support disclaimer is present
    assert "investigational / decision-support" in data["disclaimer"]


def test_heart_cardiovascular_risk_engine():
    client = TestClient(app)

    # High cardiac strain scenario: elevated resting HR, suppressed HRV, elevated BP
    payload = {
        "current_heart_rate": 135.0,
        "baseline_heart_rate": 65.0,
        "activity_state": "resting",
        "hrv_ms": 16.0,
        "spo2": 92.0,
        "systolic": 155,
        "diastolic": 96,
        "bp_age_seconds": 60,
        "temperature_f": 78.0,
        "relative_humidity": 45.0,
    }

    risk_res = client.post("/api/v1/health/risk-analysis", json=payload)
    assert risk_res.status_code == 200
    data = risk_res.json()

    assert data["risk_level"] in ("HIGH", "CRITICAL", "EXTREME")
    assert data["risk_score"] > 40
    assert data["alert_triggered"] is True
    # Verify cardiac triggers list
    triggers = data.get("triggers", [])
    assert any("tachycardia" in t.lower() or "resting" in t.lower() or "hr" in t.lower() for t in triggers)
    assert any("hrv" in t.lower() or "autonomic" in t.lower() for t in triggers)
    # Verify non-clinical prototype disclaimer
    assert data["risk_model_architecture"]["is_clinically_validated"] is False
    assert "prototype" in data["disclaimer"].lower() or "decision-support" in data["disclaimer"].lower()


def test_disconnect_and_zero_device_state():
    client = TestClient(app)

    # 1. Connect a device first
    connect_res = client.post(
        "/api/v1/health/connect",
        json={
            "source": "healthkit",
            "device_id": "real-apple-watch-001",
            "device_name": "Apple Watch Ultra 2",
        },
    )
    assert connect_res.status_code == 200

    # Verify connected
    devices_res = client.get("/api/v1/health/devices")
    assert devices_res.status_code == 200
    assert len(devices_res.json()["devices"]) > 0

    # 2. Disconnect
    disconnect_res = client.post("/api/v1/health/disconnect")
    assert disconnect_res.status_code == 200
    assert disconnect_res.json()["status"] == "disconnected"

    # 3. Verify no devices registered
    devices_after = client.get("/api/v1/health/devices")
    assert len(devices_after.json()["devices"]) == 0

    # 4. Verify latest endpoint reports is_device_connected == False
    latest_res = client.get("/api/v1/health/latest")
    assert latest_res.status_code == 200
    assert latest_res.json()["is_device_connected"] is False
    assert latest_res.json()["connected_devices"] == []


