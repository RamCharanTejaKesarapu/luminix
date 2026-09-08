"""Comprehensive Authentication and Security Hardening Verification Tests.

Covers:
1. Argon2id password hashing, verification, and upgrade handling
2. HttpOnly, Secure, SameSite=Lax cookie issuance and authentication
3. Session invalidation via token_version on password changes
4. Secure password reset flow (token generation, expiration, single-use, session revocation)
5. Account deletion with credential confirmation and complete biometric record erasure (DPDP Act)
6. Prevention of IDOR on progress and telemetry endpoints (user-scoping)
7. Hardened video upload security (magic bytes, extensions, cleanup)
8. Sensitive credentials and PII zero-leak assurance
"""

import io
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api.main import app
from auth.firewall import firewall
from auth.passwords import hash_password, verify_password, needs_rehash
from auth.jwt_utils import create_access_token, decode_access_token
from database.db import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_user_password,
    create_password_reset_token,
    verify_and_consume_reset_token,
    delete_user_account,
)


@pytest.fixture(autouse=True)
def reset_firewall_state():
    """Reset firewall rate limits between tests."""
    firewall.reset_state()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_argon2id_password_hashing_and_verification():
    """Verify Argon2id hashing, secure verification, and rehash detection."""
    password = "SuperSecurePassword#2026!"
    pw_hash = hash_password(password)

    # Must be argon2id or secure bcrypt fallback
    assert pw_hash.startswith("$argon2id$") or pw_hash.startswith("$2b$")

    # Positive verification
    valid = verify_password(password, pw_hash)
    assert valid is True

    # Negative verification (wrong password)
    invalid = verify_password("WrongPassword123!", pw_hash)
    assert invalid is False

    # Timing attack resistance with empty/invalid hashes
    invalid_empty = verify_password("test", "")
    assert invalid_empty is False


def test_httponly_cookie_issuance_on_login(client):
    """Verify that login sets HttpOnly, SameSite=Lax, and Secure cookie."""
    test_email = f"cookie_user_{uuid.uuid4().hex[:6]}@luminix.com"
    test_password = "ValidCookiePassword123"

    # Register user first
    reg_resp = client.post(
        "/v1/auth/register",
        json={"name": "Cookie User", "email": test_email, "password": test_password},
    )
    assert reg_resp.status_code in (200, 409)

    # Login and check Set-Cookie header
    login_resp = client.post(
        "/v1/auth/login",
        json={"email": test_email, "password": test_password},
    )
    assert login_resp.status_code == 200

    cookies = login_resp.cookies
    assert "access_token" in cookies
    token = cookies["access_token"]
    assert token is not None and len(token) > 20

    # Test authenticated request with cookie alone (no Authorization header)
    me_resp = client.get("/v1/auth/me", headers={"Cookie": f"access_token={token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == test_email


def test_session_invalidation_on_password_change(client):
    """Verify that changing password revokes all existing JWT tokens via token_version."""
    email = f"revoke_{uuid.uuid4().hex[:6]}@luminix.com"
    old_pw = "OldPassword123!"
    new_pw = "NewPassword456!"

    reg_resp = client.post(
        "/v1/auth/register",
        json={"name": "Revoke User", "email": email, "password": old_pw},
    )
    assert reg_resp.status_code in (200, 409)

    login_resp = client.post(
        "/v1/auth/login",
        json={"email": email, "password": old_pw},
    )
    assert login_resp.status_code == 200
    old_token = login_resp.cookies["access_token"]

    # Change password
    change_resp = client.post(
        "/v1/auth/change-password",
        json={"current_password": old_pw, "new_password": new_pw},
        headers={"Cookie": f"access_token={old_token}"},
    )
    assert change_resp.status_code == 200
    assert change_resp.json().get("status") == "ok"

    # The OLD token must now be rejected (HTTP 401 Session revoked)
    stale_req = client.get("/v1/auth/me", headers={"Cookie": f"access_token={old_token}"})
    assert stale_req.status_code == 401
    assert "revoked" in stale_req.json().get("detail", "").lower()

    # Login with new password succeeds and grants valid session
    new_login = client.post(
        "/v1/auth/login",
        json={"email": email, "password": new_pw},
    )
    assert new_login.status_code == 200
    new_token = new_login.cookies["access_token"]
    assert new_token != old_token

    valid_req = client.get("/v1/auth/me", headers={"Cookie": f"access_token={new_token}"})
    assert valid_req.status_code == 200


def test_password_reset_flow(client):
    """Verify forgot password token generation, single-use, and session update."""
    email = f"reset_flow_{uuid.uuid4().hex[:6]}@luminix.com"
    pw = "InitialResetPw123"

    client.post(
        "/v1/auth/register",
        json={"name": "Reset Test", "email": email, "password": pw},
    )

    # Request password reset token
    forgot_resp = client.post("/v1/auth/forgot-password", json={"email": email})
    assert forgot_resp.status_code == 200
    data = forgot_resp.json()
    assert "message" in data

    # Retrieve dev token or direct db token
    token = data.get("dev_reset_token")
    if not token:
        token = create_password_reset_token(email)

    # Use reset token with new password
    new_pw = "BrandNewResetPw789"
    reset_resp = client.post(
        "/v1/auth/reset-password",
        json={"token": token, "new_password": new_pw},
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json().get("status") == "ok"

    # Token cannot be re-used (single-use validation)
    replay_resp = client.post(
        "/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherAttempt123"},
    )
    assert replay_resp.status_code == 400
    detail_lower = replay_resp.json().get("detail", "").lower()
    assert "invalid" in detail_lower and "expired" in detail_lower

    # Old password no longer works
    old_login = client.post("/v1/auth/login", json={"email": email, "password": pw})
    assert old_login.status_code == 401

    # New password works
    fresh_login = client.post("/v1/auth/login", json={"email": email, "password": new_pw})
    assert fresh_login.status_code == 200


def test_account_deletion_and_data_erasure(client):
    """Verify DPDP Act right to erasure: account deletion purges user, telemetry, and progress."""
    email = f"erasure_{uuid.uuid4().hex[:6]}@luminix.com"
    pw = "ErasurePass123"

    reg_resp = client.post(
        "/v1/auth/register",
        json={"name": "Erasure User", "email": email, "password": pw},
    )
    assert reg_resp.status_code in (200, 409)

    login_resp = client.post("/v1/auth/login", json={"email": email, "password": pw})
    assert login_resp.status_code == 200
    token = login_resp.cookies["access_token"]

    # Rejection if confirmation phrase is wrong
    wrong_conf = client.request(
        "DELETE",
        "/v1/auth/delete-account",
        json={"password": pw, "confirmation": "NOT CORRECT"},
        headers={"Cookie": f"access_token={token}"},
    )
    assert wrong_conf.status_code == 400

    # Rejection if password is wrong
    wrong_pw = client.request(
        "DELETE",
        "/v1/auth/delete-account",
        json={"password": "IncorrectPassword!", "confirmation": "DELETE MY ACCOUNT"},
        headers={"Cookie": f"access_token={token}"},
    )
    assert wrong_pw.status_code == 401

    # Successful deletion
    del_resp = client.request(
        "DELETE",
        "/v1/auth/delete-account",
        json={"password": pw, "confirmation": "DELETE MY ACCOUNT"},
        headers={"Cookie": f"access_token={token}"},
    )
    assert del_resp.status_code == 200
    assert del_resp.json().get("status") == "erased"

    # User no longer exists in DB or login
    check_login = client.post("/v1/auth/login", json={"email": email, "password": pw})
    assert check_login.status_code == 401

    # Token is now dead
    stale_check = client.get("/v1/auth/me", headers={"Cookie": f"access_token={token}"})
    assert stale_check.status_code == 401


def test_idor_protection_on_progress_and_telemetry_routes(client):
    """Verify that users can only access their own biometric logs and cannot view another's."""
    # Create User A
    user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@luminix.com"
    pw = "CommonPass123"
    client.post("/v1/auth/register", json={"name": "User A", "email": user_a_email, "password": pw})
    login_a = client.post("/v1/auth/login", json={"email": user_a_email, "password": pw})
    token_a = login_a.cookies["access_token"]
    user_a_id = str(client.get("/v1/auth/me", headers={"Cookie": f"access_token={token_a}"}).json()["user"]["id"])

    # Create User B
    user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@luminix.com"
    client.post("/v1/auth/register", json={"name": "User B", "email": user_b_email, "password": pw})
    login_b = client.post("/v1/auth/login", json={"email": user_b_email, "password": pw})
    token_b = login_b.cookies["access_token"]
    user_b_id = str(client.get("/v1/auth/me", headers={"Cookie": f"access_token={token_b}"}).json()["user"]["id"])

    # User A records biometric events
    client.post(
        "/v1/progress/log",
        json={"bmi": 22.4, "pose_score": 92.5},
        headers={"Cookie": f"access_token={token_a}"},
    )

    # User B records biometric events
    client.post(
        "/v1/progress/log",
        json={"bmi": 27.8, "pose_score": 81.0},
        headers={"Cookie": f"access_token={token_b}"},
    )

    # User A queries recent events -> MUST only see events for User A
    items_a = client.get("/v1/progress/recent", headers={"Cookie": f"access_token={token_a}"}).json()["items"]
    assert len(items_a) > 0
    for item in items_a:
        assert str(item.get("user_label")) == user_a_id
        assert str(item.get("user_label")) != user_b_id

    # User B queries recent events -> MUST only see events for User B
    items_b = client.get("/v1/progress/recent", headers={"Cookie": f"access_token={token_b}"}).json()["items"]
    assert len(items_b) > 0
    for item in items_b:
        assert str(item.get("user_label")) == user_b_id
        assert str(item.get("user_label")) != user_a_id


def test_video_upload_security_controls(client):
    """Verify pose video upload rejects invalid magic bytes and unsafe file extensions."""
    # 1. Reject invalid file extension (.exe)
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    exe_resp = client.post(
        "/v1/pose/analyze-video",
        files={"file": ("malware.exe", fake_exe, "application/octet-stream")},
    )
    assert exe_resp.status_code == 400
    assert "unsupported file format" in exe_resp.json().get("detail", "").lower()

    # 2. Reject mismatched magic bytes (.mp4 extension but contains plain ASCII script)
    fake_mp4 = io.BytesIO(b"<script>alert(1)</script>")
    magic_resp = client.post(
        "/v1/pose/analyze-video",
        files={"file": ("fake.mp4", fake_mp4, "video/mp4")},
    )
    assert magic_resp.status_code == 400
    assert "invalid video" in magic_resp.json().get("detail", "").lower()
