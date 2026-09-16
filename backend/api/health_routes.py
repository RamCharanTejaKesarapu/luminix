"""
LUMINIX — Health Device Integration & Mobile Bridge Router
Architectural Specification: 13 HTTP Endpoints + 1 WebSocket Channel
1.  POST /api/v1/health/connect (Device & Session Authentication)
2.  GET  /api/v1/health/permissions (Permissions Matrix Query)
3.  POST /api/v1/health/sync (Incremental Batch Sync & Deduplication + Auto Risk Evaluation)
4.  POST /api/v1/health/samples (Single Sample Ingestion)
5.  POST /api/v1/health/batch (Multi-Sample Raw Ingestion)
6.  GET  /api/v1/health/latest (Latest Available Vitals & Strict BP Status)
7.  GET  /api/v1/health/history (Historical Metric Samples Time-Series)
8.  GET  /api/v1/health/summary (Aggregated Daily Health Summary)
9.  GET  /api/v1/health/devices (Registered Wearables & Direct BLE Cuffs)
10. GET  /api/v1/health/sources (Supported Bridge Sources & Readiness Status)
11. POST /api/v1/health/live/start (Start Live Continuous Sensor Session)
12. POST /api/v1/health/live/stop (Stop Live Continuous Sensor Session)
13. POST /api/v1/health/risk-analysis (Execute Multi-Signal Heart Risk Engine)
+ 14. WebSocket /api/v1/health/live/ws (1 Hz Live Telemetry Stream)
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

try:
    from analysis_module.heart_risk_engine import HeartRiskEngine, HeatRiskEngine
    from database.db import (
        get_health_sample_history,
        get_latest_health_samples,
        save_health_samples,
    )
except ImportError:
    from backend.analysis_module.heart_risk_engine import HeartRiskEngine, HeatRiskEngine
    from backend.database.db import (
        get_health_sample_history,
        get_latest_health_samples,
        save_health_samples,
    )

router = APIRouter(prefix="/api/v1/health", tags=["health_bridge"])


# ── Pydantic Request & Response Schemas ─────────────────────────────────────

class HealthConnectRequest(BaseModel):
    device_name: Optional[str] = Field("Luminix Mobile Bridge", description="Device or bridge identifier")
    device_id: Optional[str] = Field(None, description="Optional hardware device ID")
    device_type: Optional[str] = Field("smartwatch", description="smartwatch, phone, direct_bp_device, ble_sensor")
    source: str = Field("healthkit", description="healthkit, health_connect, direct_bp_device, ble_sensor, ble_omron")
    platform: Optional[str] = Field(None, description="ios, android, ble, web")
    app_version: Optional[str] = Field(None, description="Luminix mobile companion version")
    user_id: Optional[str] = "default"


class HealthSampleItem(BaseModel):
    userId: Optional[str] = None
    metric: str
    value: Optional[float] = None
    unit: Optional[str] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    timestamp: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    source: Optional[str] = "healthkit"
    device: Optional[str] = None
    device_id: Optional[str] = None
    quality: Optional[str] = "device_measured"


class HealthBatchRequest(BaseModel):
    userId: Optional[str] = "default"
    source: Optional[str] = "healthkit"
    device: Optional[str] = None
    samples: List[HealthSampleItem] = []


class HealthSyncRequest(BaseModel):
    userId: Optional[str] = "default"
    sync_mode: Optional[str] = "incremental"
    lastSyncTimestamp: Optional[str] = None
    source: Optional[str] = "healthkit"
    samples: Optional[List[HealthSampleItem]] = []


class HeartRiskAnalysisRequest(BaseModel):
    user_id: Optional[str] = "default"
    temperature_f: Optional[float] = None
    relative_humidity: Optional[float] = None
    ambient_temp_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    current_heart_rate: Optional[float] = None
    heart_rate: Optional[float] = None
    baseline_heart_rate: Optional[float] = None
    hrv: Optional[float] = None
    hrv_ms: Optional[float] = None
    activity_state: Optional[str] = None
    activity_level: Optional[str] = None
    body_temp_f: Optional[float] = None
    body_temp_c: Optional[float] = None
    spo2: Optional[float] = None
    respiratory_rate: Optional[float] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    bp_age_seconds: Optional[float] = None
    signal_confidence: Optional[float] = 0.95
    sensor_contact: Optional[bool] = True
    motion_artifact: Optional[bool] = False


# Alias for backward compatibility
HeatRiskAnalysisRequest = HeartRiskAnalysisRequest


class LiveSessionRequest(BaseModel):
    userId: Optional[str] = "default"
    sessionType: Optional[str] = "monitoring"  # "monitoring", "workout"
    source: Optional[str] = "healthkit"
    device: Optional[str] = None


# ── Active In-Memory Registry & Live State ─────────────────────────────────
# Real Device Policy: Zero pre-seeded or fake devices. Only devices that physically connect
# via POST /api/v1/health/connect or authenticate via BLE/Companion are registered.
_registered_devices: Dict[str, Dict[str, Any]] = {}

_active_live_sessions: Dict[str, Dict[str, Any]] = {}


# ── WebSocket Manager for Live Monitoring (Section 5 & 13) ──────────────────

class LiveConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, data: Dict[str, Any]):
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(data))
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections.discard(d)


live_manager = LiveConnectionManager()


# ── REST API Endpoints ──────────────────────────────────────────────────────

@router.post("/connect")
def connect_health_source(payload: HealthConnectRequest) -> Dict[str, Any]:
    """Connects and registers a mobile health bridge or direct device."""
    dev_name = payload.device_name or "Luminix Mobile Bridge"
    dev_id = payload.device_id or dev_name.lower().replace(" ", "_")
    _registered_devices[dev_id] = {
        "id": dev_id,
        "name": dev_name,
        "device_type": payload.device_type,
        "source": payload.source,
        "platform": payload.platform or ("iOS" if payload.source == "healthkit" else "Android"),
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "status": "connected",
    }
    return {
        "status": "connected",
        "device_id": dev_id,
        "name": dev_name,
        "source": payload.source,
        "bridge": "Luminix Mobile Health Bridge",
        "protocol": "Luminix Mobile Health Bridge v1.0",
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/disconnect")
def disconnect_health_source(device_id: Optional[str] = None) -> Dict[str, Any]:
    """Disconnects an active registered health device or clears all active links."""
    global _registered_devices
    if device_id and device_id in _registered_devices:
        del _registered_devices[device_id]
    else:
        _registered_devices.clear()
    return {
        "status": "disconnected",
        "message": "Real device successfully unlinked. Zero active telemetry.",
        "connected_devices": list(_registered_devices.values()),
    }


@router.get("/permissions")
def get_supported_health_permissions() -> Dict[str, Any]:
    """Returns supported health metric permissions across HealthKit and Health Connect."""
    return {
        "categories": {
            "activity": ["steps", "distance", "active_calories", "exercise", "workouts", "walking", "running", "cycling"],
            "cardiovascular": ["heart_rate", "resting_heart_rate", "hrv", "blood_pressure", "spo2", "vo2_max"],
            "respiratory": ["respiratory_rate"],
            "sleep": ["sleep_duration", "sleep_start_end", "awake", "rem", "deep", "light_core"],
            "body": ["weight", "body_temperature", "body_fat", "blood_glucose"],
            "other": ["workouts", "calories", "recovery_metrics"],
        },
        "platforms": {
            "ios": {"bridge": "Apple HealthKit", "framework": "HealthKit.framework", "sdk": "react-native-health"},
            "android": {"bridge": "Google Health Connect", "package": "androidx.health.connect.client", "sdk": "react-native-health-connect"},
            "direct": {"bridge": "BLE Health Peripheral", "standards": ["GATT Heart Rate 0x180D", "GATT Blood Pressure 0x1810"]},
        },
    }


@router.post("/sync")
def sync_health_records(payload: HealthSyncRequest) -> Dict[str, Any]:
    """
    Incremental synchronization from mobile local DB to Luminix backend.
    Architectural Pipeline: FETCH → Sync → Validate → Risk Engine → Return updated risk
    """
    user_id = payload.userId or "default"
    saved = 0
    if payload.samples:
        sample_dicts = []
        for s in payload.samples:
            d = s.model_dump()
            if not d.get("userId"):
                d["userId"] = user_id
            if not d.get("timestamp"):
                d["timestamp"] = datetime.now(timezone.utc).isoformat()
            sample_dicts.append(d)
        saved = save_health_samples(sample_dicts, user_id=user_id)

    now_iso = datetime.now(timezone.utc).isoformat()

    # Automatically execute Multi-Signal Heart Risk Engine after sync
    latest = get_latest_health_samples(user_id=user_id)
    hr = latest.get("heart_rate", {}).get("value")
    hrv = latest.get("hrv", {}).get("value")
    temp = latest.get("body_temperature", {}).get("value")
    spo2 = latest.get("spo2", {}).get("value")
    resp = latest.get("respiratory_rate", {}).get("value")
    bp_sample = latest.get("blood_pressure")
    systolic = bp_sample.get("systolic") if bp_sample else None
    diastolic = bp_sample.get("diastolic") if bp_sample else None
    bp_timestamp = bp_sample.get("timestamp") if bp_sample else None
    bp_source = bp_sample.get("source") if bp_sample else None

    risk_evaluation = HeartRiskEngine.evaluate(
        heart_rate=hr,
        hrv=hrv,
        temperature_c=temp,
        spo2=spo2,
        respiratory_rate=resp,
        systolic=systolic,
        diastolic=diastolic,
        bp_timestamp=bp_timestamp,
        bp_source=bp_source,
    )

    return {
        "success": True,
        "synced": True,
        "inserted": saved,
        "saved_count": saved,
        "next_sync_cursor": now_iso,
        "source": payload.source,
        "user_id": user_id,
        "risk_evaluation": risk_evaluation,
        "latest_vitals": latest,
    }


@router.post("/samples")
def ingest_health_sample(sample: HealthSampleItem) -> Dict[str, Any]:
    """Ingests a single normalized health sample."""
    user_id = sample.userId or "default"
    d = sample.model_dump()
    if not d.get("userId"):
        d["userId"] = user_id
    save_health_samples([d], user_id=user_id)
    return {"status": "saved", "metric": sample.metric, "timestamp": sample.timestamp}


@router.post("/batch")
def ingest_health_batch(batch: HealthBatchRequest) -> Dict[str, Any]:
    """Ingests a batch of normalized health samples from Luminix Mobile Bridge."""
    user_id = batch.userId or "default"
    if not batch.samples:
        return {"status": "empty", "saved_count": 0}

    sample_dicts = []
    for s in batch.samples:
        d = s.model_dump()
        if not d.get("userId"):
            d["userId"] = user_id
        sample_dicts.append(d)
    saved = save_health_samples(sample_dicts, user_id=user_id)

    return {
        "status": "saved",
        "saved_count": saved,
        "source": batch.source,
        "device": batch.device,
        "user_id": user_id,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/latest")
def get_latest_health_metrics(
    user_id: str = Query("default"),
    ambient_temp: float = Query(28.0),
    humidity: float = Query(55.0),
) -> Dict[str, Any]:
    """
    Returns the latest available snapshot for each vital and executes the Heat Risk Engine.
    Strictly displays genuine Blood Pressure age/timestamp (no estimated or fake BP).
    """
    latest = get_latest_health_samples(user_id=user_id)

    # Extract vitals for risk engine
    hr = latest.get("heart_rate", {}).get("value")
    hrv = latest.get("hrv", {}).get("value")
    temp = latest.get("body_temperature", {}).get("value")
    spo2 = latest.get("spo2", {}).get("value")
    resp = latest.get("respiratory_rate", {}).get("value")

    # Strict Blood Pressure Handling (Section 6)
    bp_sample = latest.get("blood_pressure")
    systolic = bp_sample.get("systolic") if bp_sample else None
    diastolic = bp_sample.get("diastolic") if bp_sample else None
    bp_timestamp = bp_sample.get("timestamp") if bp_sample else None
    bp_source = bp_sample.get("source") if bp_sample else None

    # Determine activity level from steps/calories
    steps = latest.get("steps", {}).get("value", 0) or 0
    activity_level = "MODERATE" if steps > 5000 else "LOW"

    # Evaluate Multi-Signal Heart Risk & Cardio Load
    risk_evaluation = HeartRiskEngine.evaluate(
        heart_rate=hr,
        hrv=hrv,
        temperature_c=temp,
        activity_level=activity_level,
        spo2=spo2,
        respiratory_rate=resp,
        systolic=systolic,
        diastolic=diastolic,
        bp_timestamp=bp_timestamp,
        bp_source=bp_source,
        ambient_temp_c=ambient_temp,
        humidity_percent=humidity,
    )

    # Enrich every metric with provenance age string and time string
    from analysis_module.heart_risk_engine import compute_measurement_age_string
    for m_key, m_val in latest.items():
        if isinstance(m_val, dict) and m_val.get("timestamp"):
            ts = m_val["timestamp"]
            m_val["age_str"] = compute_measurement_age_string(ts)
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                m_val["time_str"] = dt.strftime("%H:%M:%S")
            except Exception:
                m_val["time_str"] = "--:--:--"

    # Strict Blood Pressure enrichment
    bp_status = risk_evaluation.get("blood_pressure_status", {})
    if bp_sample:
        latest["blood_pressure"]["is_recent"] = bp_status.get("has_recent_bp", False)
        latest["blood_pressure"]["age_seconds"] = bp_status.get("bp_age_seconds")
        latest["blood_pressure"]["age_str"] = bp_status.get("bp_age")
        latest["blood_pressure"]["status_text"] = bp_status.get("bp_display", "No recent measurement")
        latest["blood_pressure"]["display"] = bp_status.get("bp_display", "No recent measurement")
    else:
        latest["blood_pressure"] = {
            "metric": "blood_pressure",
            "is_recent": False,
            "age_seconds": None,
            "age_str": "No recent measurement",
            "status_text": "No recent measurement",
            "display": "No recent measurement",
            "systolic": None,
            "diastolic": None,
            "source": "None",
        }

    return {
        "user_id": user_id,
        "is_device_connected": len(_registered_devices) > 0,
        "connected_devices": list(_registered_devices.values()),
        "metrics": latest,
        "risk_evaluation": risk_evaluation,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/history")
def get_metric_history(
    user_id: str = Query("default"),
    metric: str = Query("heart_rate"),
    limit: int = Query(50, le=200),
) -> Dict[str, Any]:
    """Returns time-series historical records for dashboard charts."""
    history = get_health_sample_history(user_id=user_id, metric=metric, limit=limit)
    return {
        "user_id": user_id,
        "metric": metric,
        "count": len(history),
        "history": history,
    }


@router.get("/summary")
def get_health_summary(user_id: str = Query("default")) -> Dict[str, Any]:
    """Returns aggregated day summary for activity, sleep, and cardiovascular metrics."""
    latest = get_latest_health_samples(user_id=user_id)

    steps = latest.get("steps", {}).get("value")
    dist = latest.get("distance", {}).get("value")
    cals = latest.get("active_calories", {}).get("value")
    hr = latest.get("heart_rate", {}).get("value")
    hrv = latest.get("hrv", {}).get("value")
    sleep = latest.get("sleep_duration", {}).get("value")
    bp = latest.get("blood_pressure")

    return {
        "user_id": user_id,
        "activity": {
            "steps": int(steps) if steps is not None else None,
            "step_goal": 10000,
            "distance_km": float(dist) if dist is not None else None,
            "calories_burned": float(cals) if cals is not None else None,
        },
        "cardiovascular": {
            "latest_hr": hr,
            "latest_hrv": hrv,
            "has_bp": (bp is not None and bp.get("systolic") is not None),
        },
        "sleep": {
            "duration_hours": sleep,
            "quality_rating": ("GOOD" if sleep >= 7.0 else "FAIR") if sleep is not None else None,
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/devices")
def get_connected_devices() -> Dict[str, Any]:
    """Returns the list of registered devices and sources."""
    return {"devices": list(_registered_devices.values()), "count": len(_registered_devices)}


@router.get("/sources")
def get_available_sources() -> Dict[str, Any]:
    """Returns supported sources for the Luminix Health Data Layer."""
    return {
        "sources": [
            {"id": "healthkit", "name": "Apple HealthKit", "platform": "iOS", "status": "active"},
            {"id": "health_connect", "name": "Google Health Connect", "platform": "Android", "status": "active"},
            {"id": "direct_bp_device", "name": "Dedicated BLE Blood Pressure Monitor", "platform": "BLE Direct", "status": "active"},
            {"id": "ble_omron", "name": "Omron Evolv BLE Blood Pressure", "platform": "BLE Direct", "status": "active"},
            {"id": "ble_sensor", "name": "Generic BLE Heart Rate & Cadence Sensor", "platform": "Web Bluetooth / Native BLE", "status": "active"},
        ]
    }


@router.post("/live/start")
def start_live_monitoring(payload: LiveSessionRequest) -> Dict[str, Any]:
    """Initializes a live telemetry monitoring session."""
    user_id = payload.userId or "default"
    # STRICT REAL DEVICE REQUIREMENT: Cannot start live session if no real device is connected
    if len(_registered_devices) == 0:
        raise HTTPException(
            status_code=400,
            detail="No health device currently connected. Pair an authentic wearable or mobile bridge first."
        )
    session_id = f"session_{user_id}_{int(datetime.now(timezone.utc).timestamp())}"
    _active_live_sessions[user_id] = {
        "session_id": session_id,
        "user_id": user_id,
        "session_type": payload.sessionType or "monitoring",
        "source": payload.source or "healthkit",
        "device": payload.device or "Active Wearable",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }
    return {
        "status": "started",
        "session_id": session_id,
        "websocket_url": "/api/v1/health/live/ws",
        "message": "Live monitoring session initialized. Connect via WebSocket for real-time telemetry stream.",
    }


@router.post("/live/stop")
def stop_live_monitoring(user_id: str = Query("default")) -> Dict[str, Any]:
    """Concludes an active live telemetry session."""
    if user_id in _active_live_sessions:
        _active_live_sessions[user_id]["status"] = "concluded"
        _active_live_sessions[user_id]["ended_at"] = datetime.now(timezone.utc).isoformat()
    return {"status": "stopped", "user_id": user_id}


@router.get("/risk-analysis")
def run_heat_risk_analysis(
    user_id: str = Query("default"),
    ambient_temp: float = Query(28.0),
    humidity: float = Query(55.0),
) -> Dict[str, Any]:
    """Runs the Multi-Signal Heart Risk Engine on active vitals and environmental metrics."""
    latest = get_latest_health_samples(user_id=user_id)

    hr = latest.get("heart_rate", {}).get("value")
    hrv = latest.get("hrv", {}).get("value")
    temp = latest.get("body_temperature", {}).get("value")
    spo2 = latest.get("spo2", {}).get("value")
    resp = latest.get("respiratory_rate", {}).get("value")

    bp_sample = latest.get("blood_pressure")
    systolic = bp_sample.get("systolic") if bp_sample else None
    diastolic = bp_sample.get("diastolic") if bp_sample else None
    bp_timestamp = bp_sample.get("timestamp") if bp_sample else None
    bp_source = bp_sample.get("source") if bp_sample else None

    return HeartRiskEngine.evaluate(
        heart_rate=hr,
        hrv=hrv,
        temperature_c=temp,
        spo2=spo2,
        respiratory_rate=resp,
        systolic=systolic,
        diastolic=diastolic,
        bp_timestamp=bp_timestamp,
        bp_source=bp_source,
        ambient_temp_c=ambient_temp,
        humidity_percent=humidity,
    )


@router.post("/risk-analysis")
def post_heat_risk_analysis(payload: Optional[HeartRiskAnalysisRequest] = None) -> Dict[str, Any]:
    """
    Runs the Multi-Signal Heart Risk Engine with specified inputs or latest user vitals.
    Architectural Primary Route: POST /api/v1/health/risk-analysis
    """
    req = payload or HeartRiskAnalysisRequest()
    user_id = req.user_id or "default"
    latest = get_latest_health_samples(user_id=user_id)

    amb_c = req.ambient_temp_c
    if amb_c is None and req.temperature_f is not None:
        amb_c = (req.temperature_f - 32.0) * 5.0 / 9.0
    if amb_c is None:
        amb_c = 28.0

    hum = req.humidity_percent
    if hum is None and req.relative_humidity is not None:
        hum = req.relative_humidity
    if hum is None:
        hum = 55.0

    hr = req.current_heart_rate if req.current_heart_rate is not None else req.heart_rate
    if hr is None:
        hr = latest.get("heart_rate", {}).get("value")

    hrv = req.hrv if req.hrv is not None else req.hrv_ms
    if hrv is None:
        hrv = latest.get("hrv", {}).get("value")

    base_hr = req.baseline_heart_rate if req.baseline_heart_rate is not None else 68.0

    b_temp = req.body_temp_c
    if b_temp is None and req.body_temp_f is not None:
        b_temp = (req.body_temp_f - 32.0) * 5.0 / 9.0
    if b_temp is None:
        b_temp = latest.get("body_temperature", {}).get("value")

    act = req.activity_state or req.activity_level or "MODERATE"
    spo2 = req.spo2 if req.spo2 is not None else latest.get("spo2", {}).get("value")
    resp = req.respiratory_rate if req.respiratory_rate is not None else latest.get("respiratory_rate", {}).get("value")

    bp_sample = latest.get("blood_pressure")
    systolic = req.systolic if req.systolic is not None else (bp_sample.get("systolic") if bp_sample else None)
    diastolic = req.diastolic if req.diastolic is not None else (bp_sample.get("diastolic") if bp_sample else None)

    bp_ts = None
    if req.bp_age_seconds is not None:
        bp_ts = (datetime.now(timezone.utc) - timedelta(seconds=req.bp_age_seconds)).isoformat()
    elif bp_sample:
        bp_ts = bp_sample.get("timestamp")

    bp_src = bp_sample.get("source") if bp_sample else "direct_device"

    return HeartRiskEngine.evaluate(
        heart_rate=hr,
        hrv=hrv,
        baseline_hr=base_hr,
        temperature_c=b_temp,
        activity_level=act,
        spo2=spo2,
        respiratory_rate=resp,
        systolic=systolic,
        diastolic=diastolic,
        bp_timestamp=bp_ts,
        bp_source=bp_src,
        ambient_temp_c=amb_c,
        humidity_percent=hum,
        signal_confidence=req.signal_confidence if req.signal_confidence is not None else 0.95,
        sensor_contact=req.sensor_contact if req.sensor_contact is not None else True,
        motion_artifact=req.motion_artifact if req.motion_artifact is not None else False,
    )


# ── Live Monitoring WebSocket Pipeline (Section 5 & 13) ─────────────────────

@router.websocket("/live/ws")
async def health_live_websocket(websocket: WebSocket):
    """
    Bi-directional streaming WebSocket for real-time live sensor telemetry.
    Receives live sensor readings from Mobile Bridge and streams risk alerts to Web Dashboard.
    """
    await live_manager.connect(websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
            except Exception:
                continue

            msg_type = msg.get("type", "sample")

            if msg_type in ("telemetry", "sample", "live_packet"):
                # Normalize and persist to time-series DB if requested
                user_id = msg.get("userId", "default")
                samples = msg.get("samples", [])
                if samples:
                    save_health_samples(samples, user_id=user_id)

                # Extract latest vitals for instant real-time risk check
                hr = msg.get("heartRate")
                temp = msg.get("temperature")
                spo2 = msg.get("spo2")
                resp = msg.get("respiratoryRate")
                bp = msg.get("bloodPressure")
                sys_val = bp.get("systolic") if isinstance(bp, dict) else None
                dia_val = bp.get("diastolic") if isinstance(bp, dict) else None
                bp_ts = bp.get("timestamp") if isinstance(bp, dict) else None

                risk = HeatRiskEngine.evaluate(
                    heart_rate=hr,
                    temperature_c=temp,
                    activity_level=msg.get("activityLevel", "MODERATE"),
                    spo2=spo2,
                    respiratory_rate=resp,
                    systolic=sys_val,
                    diastolic=dia_val,
                    bp_timestamp=bp_ts,
                    ambient_temp_c=msg.get("ambientTemp", 28.0),
                    humidity_percent=msg.get("humidity", 55.0),
                )

                # Broadcast live telemetry update and risk assessment to dashboard
                broadcast_packet = {
                    "type": "live_update",
                    "user_id": user_id,
                    "telemetry": {
                        "heartRate": hr,
                        "intensity": msg.get("intensity", "AEROBIC"),
                        "caloriesBurned": msg.get("caloriesBurned"),
                        "cadence": msg.get("cadence"),
                        "temperature": temp,
                        "spo2": spo2,
                        "respiratoryRate": resp,
                        "bloodPressure": bp,
                    },
                    "risk": risk,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await live_manager.broadcast(broadcast_packet)

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}))

    except WebSocketDisconnect:
        live_manager.disconnect(websocket)
    except Exception:
        live_manager.disconnect(websocket)
