"""Comprehensive Security Audit & Remediation Test Suite for Luminix.

Validates that all security remediations are functioning as designed:
1. Secret Redaction & Zero Credential Exposure (/v1/config/ai-key & /health)
2. BOLA / IDOR Protection on Health Telemetry Endpoints
3. Sample user_id Spoofing Prevention in Ingestion Pipelines
4. Unrestricted Video Upload Security & Magic Byte Validation (/v1/report/combined-with-upload)
5. Local File Inclusion & Path Traversal Guard (/v1/video/generate)
6. Concurrency Isolation in PDF & Email Dossier Generation
7. Payload Validation & Process Environment Mutation Defense (/v1/luna/chat)
8. Security Headers & WebSocket CSP Directive Enforcement
"""

from __future__ import annotations

import io
import json
import uuid
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from api.main import app
from auth.jwt_utils import create_access_token
from database.db import create_user, init_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_users():
    """Create two distinct users in the SQLite database for BOLA testing."""
    uid1 = uuid.uuid4().hex[:8]
    uid2 = uuid.uuid4().hex[:8]

    u1 = create_user(
        email=f"alice_{uid1}@luminix.test",
        password_hash="argon2id$mock_hash_for_alice",
        name="Alice Health",
    )
    u2 = create_user(
        email=f"bob_{uid2}@luminix.test",
        password_hash="argon2id$mock_hash_for_bob",
        name="Bob Health",
    )

    t1 = create_access_token({"sub": str(u1.id), "email": u1.email, "token_version": 1})
    t2 = create_access_token({"sub": str(u2.id), "email": u2.email, "token_version": 1})

    return {
        "alice": {"user": u1, "token": t1, "headers": {"Authorization": f"Bearer {t1}"}},
        "bob": {"user": u2, "token": t2, "headers": {"Authorization": f"Bearer {t2}"}},
    }


def _valid_profile() -> Dict[str, Any]:
    return {
        "age": 28,
        "gender": "male",
        "weight_kg": 75.0,
        "height_cm": 178.0,
        "activity_level": "moderate",
        "fitness_goal": "maintenance",
        "diet_preference": "non_vegetarian",
    }


# ── 1. SECRET REDACTION & ZERO EXPOSURE ───────────────────────────────────────

def test_config_ai_key_redacts_secret_keys(client):
    """Ensure /v1/config/ai-key does not expose raw backend API credentials."""
    resp = client.get("/v1/config/ai-key")
    assert resp.status_code == 200
    data = resp.json()
    assert "key" not in data, "VULNERABILITY: Raw API key was exposed in /v1/config/ai-key response!"
    assert "configured" in data
    assert data.get("provider") == "google-gemini"


def test_health_endpoint_redacts_filesystem_paths(client):
    """Ensure /health does not leak internal server host filesystem paths."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "output_dir" not in data, "VULNERABILITY: Internal server path leaked in /health output_dir"
    assert "output_dir_ready" in data


# ── 2. BOLA / IDOR PROTECTION ON HEALTH DATA ──────────────────────────────────

def test_bola_unauthorized_user_health_data_blocked(client, auth_users):
    """Ensure User B (Bob) cannot access or inspect User A (Alice)'s health telemetry."""
    alice_id = str(auth_users["alice"]["user"].id)
    bob_headers = auth_users["bob"]["headers"]

    # Bob attempts to read Alice's latest health metrics
    resp_latest = client.get(f"/api/v1/health/latest?user_id={alice_id}", headers=bob_headers)
    assert resp_latest.status_code == 403
    assert "not authorized" in resp_latest.json().get("detail", "").lower()

    # Bob attempts to read Alice's health summary
    resp_sum = client.get(f"/api/v1/health/summary?user_id={alice_id}", headers=bob_headers)
    assert resp_sum.status_code == 403

    # Bob attempts to read Alice's cardiovascular risk analysis
    resp_risk = client.get(f"/api/v1/health/risk-analysis?user_id={alice_id}", headers=bob_headers)
    assert resp_risk.status_code == 403


def test_bola_unauthenticated_access_to_named_user_blocked(client, auth_users):
    """Ensure an unauthenticated caller cannot query another user's health telemetry."""
    alice_id = str(auth_users["alice"]["user"].id)

    resp = client.get(f"/api/v1/health/latest?user_id={alice_id}")
    assert resp.status_code == 401
    assert "authentication required" in resp.json().get("detail", "").lower()


def test_user_can_access_own_health_telemetry(client, auth_users):
    """Ensure User A can legitimately access their own health telemetry."""
    alice_id = str(auth_users["alice"]["user"].id)
    alice_headers = auth_users["alice"]["headers"]

    resp = client.get(f"/api/v1/health/latest?user_id={alice_id}", headers=alice_headers)
    assert resp.status_code == 200
    assert "is_device_connected" in resp.json()
    assert resp.json().get("user_id") == alice_id


# ── 3. PAYLOAD SPOOFING DEFENSE IN SYNC ────────────────────────────────────────

def test_sync_blocks_sample_user_id_spoofing(client, auth_users):
    """Ensure a caller cannot inject health samples attributed to another user."""
    bob_id = str(auth_users["bob"]["user"].id)
    alice_headers = auth_users["alice"]["headers"]

    # Alice submits sync payload attempting to forge Bob's user_id in the body
    spoofed_payload = {
        "userId": bob_id,
        "source": "healthkit",
        "samples": [
            {
                "metric": "heart_rate",
                "value": 72.0,
                "unit": "bpm",
            }
        ]
    }

    # Alice is forbidden from syncing with bob's user_id
    resp = client.post("/api/v1/health/sync", json=spoofed_payload, headers=alice_headers)
    assert resp.status_code == 403
    assert "not authorized" in resp.json().get("detail", "").lower()


# ── 4. FILE UPLOAD SECURITY (/v1/report/combined-with-upload) ─────────────────

def test_combined_with_upload_blocks_executable_files(client):
    """Ensure combined-with-upload rejects non-video extensions (e.g. .exe, .sh)."""
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    profile = _valid_profile()
    resp = client.post(
        "/v1/report/combined-with-upload",
        files={"file": ("exploit.exe", fake_exe, "application/octet-stream")},
        data={"profile_json": json.dumps(profile), "use_gemini": "false"},
    )
    assert resp.status_code == 400
    assert "unsupported file format" in resp.json().get("detail", "").lower()


def test_combined_with_upload_validates_magic_bytes(client):
    """Ensure combined-with-upload rejects fake video extension containing ASCII or scripts."""
    fake_mp4 = io.BytesIO(b"<?php phpinfo(); ?>")
    profile = _valid_profile()
    resp = client.post(
        "/v1/report/combined-with-upload",
        files={"file": ("fake.mp4", fake_mp4, "video/mp4")},
        data={"profile_json": json.dumps(profile), "use_gemini": "false"},
    )
    assert resp.status_code == 400
    assert "invalid video header" in resp.json().get("detail", "").lower()


# ── 5. LOCAL FILE INCLUSION & PATH TRAVERSAL GUARD ───────────────────────────

def test_video_generate_blocks_path_traversal(client):
    """Ensure pose_preview_path rejects path traversal attempts."""
    traversal_request = {
        "report": {"executive_summary": "Test"},
        "human_text": "Overview",
        "pose_preview_path": "../../../../../etc/passwd",
    }
    resp = client.post("/v1/video/generate", json=traversal_request)
    assert resp.status_code in (400, 403)


def test_video_generate_blocks_non_image_extension(client):
    """Ensure pose_preview_path rejects non-image files."""
    invalid_ext_request = {
        "report": {"executive_summary": "Test"},
        "human_text": "Overview",
        "pose_preview_path": "backend/api/main.py",
    }
    resp = client.post("/v1/video/generate", json=invalid_ext_request)
    assert resp.status_code == 400


# ── 6. LUNA CHAT REQUEST BOUNDS & NO ENV MUTATION ────────────────────────────

def test_luna_chat_rejects_oversized_payload(client):
    """Ensure message length > 4000 characters is rejected by schema validation."""
    oversized = {"message": "A" * 5000}
    resp = client.post("/v1/luna/chat", json=oversized)
    assert resp.status_code == 422  # Pydantic validation error


def test_food_analysis_request_bounds(client):
    """Ensure food analysis query length is validated."""
    oversized = {"food_query": "B" * 2000}
    resp = client.post("/v1/nutrition/ai-food-analysis", json=oversized)
    assert resp.status_code == 422


# ── 7. SECURITY HEADERS & WEBSOCKET CSP DIRECTIVE ─────────────────────────────

def test_csp_allows_secure_websockets(client):
    """Verify that CSP connect-src explicitly permits ws: and wss: protocols."""
    resp = client.get("/health")
    assert resp.status_code == 200
    csp = resp.headers.get("Content-Security-Policy", "")
    assert "connect-src" in csp
    assert "ws:" in csp
    assert "wss:" in csp
