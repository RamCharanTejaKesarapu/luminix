"""Security Hardening and Production Readiness Verification Tests.

Tests:
1. Strict 5-attempt rate limit on auth endpoints per 15 minutes
2. 429 Too Many Requests response with Retry-After header
3. Universal API rate limiting
4. Payload size rejection (HTTP 413) for requests > 1MB
5. Malformed JSON rejection (HTTP 400)
6. WAF injection blocking (HTTP 403) for SQLi/XSS in query and body
7. Public compliance routes: /privacy, /terms, /robots.txt, /sitemap.xml
"""

import json
import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api.main import app
from auth.firewall import firewall


@pytest.fixture(autouse=True)
def reset_firewall_state():
    """Reset firewall state before each test so tests don't interfere with each other."""
    firewall.reset_state()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_public_legal_and_seo_routes(client):
    """Verify that /privacy, /terms, /robots.txt, /sitemap.xml serve correctly."""
    r_privacy = client.get("/privacy")
    assert r_privacy.status_code == 200
    assert "ZERO-LEAK PRIVACY COVENANT" in r_privacy.text
    assert "WebAssembly" in r_privacy.text

    r_terms = client.get("/terms")
    assert r_terms.status_code == 200
    assert "NON-MEDICAL ADVICE COVENANT" in r_terms.text

    r_a11y = client.get("/accessibility")
    assert r_a11y.status_code == 200
    assert "WCAG 2.1 LEVEL AA" in r_a11y.text
    assert "Keyboard Navigation" in r_a11y.text

    r_robots = client.get("/robots.txt")
    assert r_robots.status_code == 200
    assert "Allow: /privacy" in r_robots.text
    assert "Allow: /terms" in r_robots.text
    assert "Allow: /accessibility" in r_robots.text

    r_sitemap = client.get("/sitemap.xml")
    assert r_sitemap.status_code == 200
    assert "/privacy" in r_sitemap.text
    assert "/terms" in r_sitemap.text
    assert "/accessibility" in r_sitemap.text


def test_auth_login_rate_limiting_max_5_attempts(client):
    """Verify that login endpoint rejects the 6th attempt within 15 minutes with HTTP 429."""
    headers = {"X-Forwarded-For": "203.0.113.42"}
    payload = {"email": "attacker@test.com", "password": "wrongpassword"}

    # First 5 attempts should pass through to auth handler (returning 401 or 422, but not 429)
    for i in range(5):
        resp = client.post("/v1/auth/login", json=payload, headers=headers)
        assert resp.status_code in (401, 400, 422), f"Attempt {i+1} failed unexpectedly with {resp.status_code}"
        assert resp.headers.get("X-RateLimit-Limit") == "5"
        assert int(resp.headers.get("X-RateLimit-Remaining", 0)) == 5 - (i + 1)

    # 6th attempt MUST be blocked by firewall with HTTP 429 Too Many Requests
    resp_blocked = client.post("/v1/auth/login", json=payload, headers=headers)
    assert resp_blocked.status_code == 429
    assert resp_blocked.headers.get("X-Firewall-Status") == "RATE_LIMITED"
    assert "Retry-After" in resp_blocked.headers
    retry_after = int(resp_blocked.headers["Retry-After"])
    assert 0 < retry_after <= 900
    data = resp_blocked.json()
    assert "Rate limit exceeded" in data["error"]
    assert data["rule"] == "login"


def test_auth_signup_rate_limiting_max_5_attempts(client):
    """Verify that registration/signup endpoint rejects the 6th attempt within 15 minutes with HTTP 429."""
    headers = {"X-Forwarded-For": "203.0.113.43"}
    payload = {"name": "Test User", "email": "register_test@example.com", "password": "validpassword123"}

    # Register first time succeeds (200), subsequent attempts fail with 409 Conflict, but count toward 5 limit
    for i in range(5):
        resp = client.post("/v1/auth/register", json=payload, headers=headers)
        assert resp.status_code in (200, 409), f"Attempt {i+1} got unexpected status {resp.status_code}"
        assert resp.headers.get("X-RateLimit-Limit") == "5"
        assert int(resp.headers.get("X-RateLimit-Remaining", 0)) == 5 - (i + 1)

    # 6th attempt MUST be blocked by firewall with HTTP 429
    resp_blocked = client.post("/v1/auth/register", json=payload, headers=headers)
    assert resp_blocked.status_code == 429
    assert resp_blocked.headers.get("X-Firewall-Status") == "RATE_LIMITED"
    assert resp_blocked.json()["rule"] == "signup"


def test_login_and_signup_independent_rate_limit_buckets(client):
    """Verify that hitting the 5-attempt limit on login does NOT block signup (and vice versa)."""
    headers = {"X-Forwarded-For": "203.0.113.44"}
    login_payload = {"email": "dual_test@example.com", "password": "wrongpassword"}
    register_payload = {"name": "Dual User", "email": "dual_test@example.com", "password": "correctpassword123"}

    # Exhaust all 5 login attempts
    for _ in range(5):
        client.post("/v1/auth/login", json=login_payload, headers=headers)

    # 6th login attempt is blocked
    resp_login_blocked = client.post("/v1/auth/login", json=login_payload, headers=headers)
    assert resp_login_blocked.status_code == 429

    # Signup endpoint must STILL be available (independent rate-limiting bucket)
    resp_signup = client.post("/v1/auth/register", json=register_payload, headers=headers)
    assert resp_signup.status_code in (200, 409), f"Signup was unexpectedly blocked with {resp_signup.status_code}"
    assert resp_signup.headers.get("X-RateLimit-Limit") == "5"


def test_every_endpoint_rate_limiting_and_isolation(client):
    """Verify that resource-intensive endpoints have their own strict limit (video/generate = 5/min)
    and that hitting this limit does NOT block other endpoints like /health or /v1/gym/categories."""
    headers = {"X-Forwarded-For": "203.0.113.45"}

    # /v1/video/generate has limit of 5 requests per 60 seconds
    for i in range(5):
        resp = client.post("/v1/video/generate", json={"workout_type": "squat"}, headers=headers)
        # Any response other than 429 indicates request was admitted
        assert resp.status_code != 429, f"Request {i+1} was unexpectedly rate limited"
        assert resp.headers.get("X-RateLimit-Limit") == "5"

    # 6th request to video/generate is blocked with 429
    resp_blocked = client.post("/v1/video/generate", json={"workout_type": "squat"}, headers=headers)
    assert resp_blocked.status_code == 429
    assert resp_blocked.headers.get("X-Firewall-Status") == "RATE_LIMITED"
    assert resp_blocked.json()["rule"] == "video_generate"

    # Crucially: /health ping MUST STILL BE ACCESSIBLE (independent per-endpoint bucket)
    resp_health = client.get("/health", headers=headers)
    assert resp_health.status_code == 200
    assert resp_health.headers.get("X-RateLimit-Limit") == "120"

    # /v1/gym/categories MUST ALSO STILL BE ACCESSIBLE
    resp_gym = client.get("/v1/gym/categories", headers=headers)
    assert resp_gym.status_code == 200
    assert resp_gym.headers.get("X-RateLimit-Limit") == "60"


def test_oversized_payload_rejection_http_413(client):
    """Verify that requests exceeding 1MB are rejected immediately with HTTP 413."""
    headers = {
        "X-Forwarded-For": "203.0.113.99",
        "Content-Length": str(2 * 1024 * 1024),  # 2MB header
        "Content-Type": "application/json"
    }
    # Test via pre-body Content-Length check
    resp = client.post("/v1/auth/login", content=b"{}", headers=headers)
    assert resp.status_code == 413
    assert resp.headers.get("X-Firewall-Status") == "BLOCKED_PAYLOAD_TOO_LARGE"
    assert "Payload Too Large" in resp.json()["error"]


def test_malformed_json_rejection_http_400(client):
    """Verify that malformed JSON payloads return HTTP 400 before reaching business logic."""
    headers = {
        "X-Forwarded-For": "203.0.113.101",
        "Content-Type": "application/json"
    }
    malformed_raw = b"{ this is broken json: "
    resp = client.post("/v1/auth/login", content=malformed_raw, headers=headers)
    assert resp.status_code == 400
    assert resp.headers.get("X-Firewall-Status") == "BLOCKED_MALFORMED_JSON"
    assert "Malformed JSON payload" in resp.json()["detail"]


def test_waf_threat_injection_blocked_http_403(client):
    """Verify that SQLi and XSS in request body are blocked with HTTP 403."""
    headers = {
        "X-Forwarded-For": "203.0.113.105",
        "Content-Type": "application/json"
    }

    # SQL Injection payload in body
    sqli_payload = {"email": "victim@test.com", "password": "' OR '1'='1' --"}
    resp = client.post("/v1/auth/login", json=sqli_payload, headers=headers)
    assert resp.status_code == 403
    assert resp.headers.get("X-Firewall-Status") == "BLOCKED"

    # XSS payload in body
    xss_payload = {"name": "<script>alert('pwned')</script>", "email": "clean@test.com", "password": "password123"}
    resp_xss = client.post("/v1/auth/register", json=xss_payload, headers=headers)
    assert resp_xss.status_code == 403
    assert resp_xss.headers.get("X-Firewall-Status") == "BLOCKED"


def test_owasp_security_headers_present(client):
    """Verify that all responses include recommended OWASP security headers."""
    resp = client.get("/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=(self)" in resp.headers.get("Permissions-Policy", "")
