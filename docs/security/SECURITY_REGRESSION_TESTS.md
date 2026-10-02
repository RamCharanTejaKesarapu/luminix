# Luminix — Security Regression Test Suite Documentation

## 1. Test Suite Summary

The Luminix security test suite comprises **46 automated tests** spanning functional verification, threat defense, authorization integrity, input validation, and protocol security.

### Test Execution Command
```bash
pytest -v
```

### Full Test Execution Output
```
tests/test_auth_security_hardening.py::test_argon2id_password_hashing_and_verification PASSED
tests/test_auth_security_hardening.py::test_httponly_cookie_issuance_on_login PASSED
tests/test_auth_security_hardening.py::test_session_invalidation_on_password_change PASSED
tests/test_auth_security_hardening.py::test_password_reset_flow PASSED
tests/test_auth_security_hardening.py::test_account_deletion_and_data_erasure PASSED
tests/test_auth_security_hardening.py::test_idor_protection_on_progress_and_telemetry_routes PASSED
tests/test_auth_security_hardening.py::test_video_upload_security_controls PASSED
tests/test_bmi.py::test_bmi PASSED
tests/test_bmi.py::test_pipeline_smoke PASSED
tests/test_bmi.py::test_meal_planner PASSED
tests/test_bmi.py::test_recipes PASSED
tests/test_bugfixes_and_audit.py::test_dpdp_account_deletion_erases_health_samples PASSED
tests/test_bugfixes_and_audit.py::test_video_analyzer_handles_none_and_nan_angles PASSED
tests/test_bugfixes_and_audit.py::test_video_analyzer_detects_real_issues_when_present PASSED
tests/test_bugfixes_and_audit.py::test_heart_risk_engine_critical_vs_high_distinction PASSED
tests/test_bugfixes_and_audit.py::test_gemini_model_names_valid PASSED
tests/test_bugfixes_and_audit.py::test_compute_measurement_age_string PASSED
tests/test_bugfixes_and_audit.py::test_suggest_recipes_continental_cuisines PASSED
tests/test_health_routes.py::test_get_sources PASSED
tests/test_health_routes.py::test_connect_source PASSED
tests/test_health_routes.py::test_sync_and_get_latest_with_strict_bp PASSED
tests/test_health_routes.py::test_heat_risk_engine PASSED
tests/test_health_routes.py::test_heart_cardiovascular_risk_engine PASSED
tests/test_health_routes.py::test_disconnect_and_zero_device_state PASSED
tests/test_security_audit_remediation.py::test_config_ai_key_redacts_secret_keys PASSED
tests/test_security_audit_remediation.py::test_health_endpoint_redacts_filesystem_paths PASSED
tests/test_security_audit_remediation.py::test_bola_unauthorized_user_health_data_blocked PASSED
tests/test_security_audit_remediation.py::test_bola_unauthenticated_access_to_named_user_blocked PASSED
tests/test_security_audit_remediation.py::test_user_can_access_own_health_telemetry PASSED
tests/test_security_audit_remediation.py::test_sync_blocks_sample_user_id_spoofing PASSED
tests/test_security_audit_remediation.py::test_combined_with_upload_blocks_executable_files PASSED
tests/test_security_audit_remediation.py::test_combined_with_upload_validates_magic_bytes PASSED
tests/test_security_audit_remediation.py::test_video_generate_blocks_path_traversal PASSED
tests/test_security_audit_remediation.py::test_video_generate_blocks_non_image_extension PASSED
tests/test_security_audit_remediation.py::test_luna_chat_rejects_oversized_payload PASSED
tests/test_security_audit_remediation.py::test_food_analysis_request_bounds PASSED
tests/test_security_audit_remediation.py::test_csp_allows_secure_websockets PASSED
tests/test_security_hardening.py::test_public_legal_and_seo_routes PASSED
tests/test_security_hardening.py::test_auth_login_rate_limiting_max_5_attempts PASSED
tests/test_security_hardening.py::test_auth_signup_rate_limiting_max_5_attempts PASSED
tests/test_security_hardening.py::test_login_and_signup_independent_rate_limit_buckets PASSED
tests/test_security_hardening.py::test_every_endpoint_rate_limiting_and_isolation PASSED
tests/test_security_hardening.py::test_oversized_payload_rejection_http_413 PASSED
tests/test_security_hardening.py::test_malformed_json_rejection_http_400 PASSED
tests/test_security_hardening.py::test_waf_threat_injection_blocked_http_403 PASSED
tests/test_security_hardening.py::test_owasp_security_headers_present PASSED

======================== 46 passed, 2 warnings in 21.91s ========================
```

---

## 2. Test Module Breakdown

### 2.1 `tests/test_security_audit_remediation.py` (New Audit Suite)
- `test_config_ai_key_redacts_secret_keys`: Asserts that `GET /v1/config/ai-key` does NOT return raw API keys.
- `test_health_endpoint_redacts_filesystem_paths`: Asserts that `GET /health` eliminates absolute host paths.
- `test_bola_unauthorized_user_health_data_blocked`: Asserts that User B cannot read User A's latest health data, summary, or cardiovascular risk dossier (returns HTTP 403 Forbidden).
- `test_bola_unauthenticated_access_to_named_user_blocked`: Asserts that unauthenticated callers cannot query named user telemetry (returns HTTP 401 Unauthorized).
- `test_user_can_access_own_health_telemetry`: Verifies that authenticated users can query their own biometric data without friction.
- `test_sync_blocks_sample_user_id_spoofing`: Asserts that attempts to inject samples attributed to another user fail with HTTP 403 Forbidden.
- `test_combined_with_upload_blocks_executable_files`: Verifies rejection of `.exe` uploads with HTTP 400 Bad Request.
- `test_combined_with_upload_validates_magic_bytes`: Verifies rejection of fake `.mp4` files containing script tags.
- `test_video_generate_blocks_path_traversal`: Verifies that `pose_preview_path: "../../../../../etc/passwd"` is blocked by the WAF / endpoint guard.
- `test_video_generate_blocks_non_image_extension`: Verifies rejection of non-image preview paths.
- `test_luna_chat_rejects_oversized_payload`: Verifies Pydantic rejection (HTTP 422) for messages exceeding 4,000 characters.
- `test_food_analysis_request_bounds`: Verifies rejection (HTTP 422) for oversized food queries.
- `test_csp_allows_secure_websockets`: Verifies that `connect-src` in CSP contains `ws:` and `wss:`.

### 2.2 `tests/test_auth_security_hardening.py`
- `test_argon2id_password_hashing_and_verification`: Verifies Argon2id password hashing parameters and verification logic.
- `test_httponly_cookie_issuance_on_login`: Verifies that logins issue `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- `test_session_invalidation_on_password_change`: Verifies that `token_version` increments invalidate prior JWTs.
- `test_password_reset_flow`: Verifies one-time token generation, expiration, and password updates.
- `test_account_deletion_and_data_erasure`: Verifies DPDP Act-compliant user data wiping.
- `test_idor_protection_on_progress_and_telemetry_routes`: Verifies IDOR protection on progress logging routes.
- `test_video_upload_security_controls`: Verifies extension allowlists and magic bytes in `/v1/pose/analyze-video`.

### 2.3 `tests/test_security_hardening.py`
- `test_public_legal_and_seo_routes`: Verifies accessibility of legal and SEO static endpoints.
- `test_auth_login_rate_limiting_max_5_attempts`: Verifies brute-force protection on `/v1/auth/login`.
- `test_auth_signup_rate_limiting_max_5_attempts`: Verifies account registration spam protection.
- `test_login_and_signup_independent_rate_limit_buckets`: Verifies bucket isolation between endpoints.
- `test_every_endpoint_rate_limiting_and_isolation`: Verifies granular per-endpoint rate limits.
- `test_oversized_payload_rejection_http_413`: Verifies fast HTTP 413 rejection of oversized payloads.
- `test_malformed_json_rejection_http_400`: Verifies rejection of corrupt JSON payloads.
- `test_waf_threat_injection_blocked_http_403`: Verifies that SQL injection and XSS payloads trigger HTTP 403 Forbidden.
- `test_owasp_security_headers_present`: Verifies the presence of all required OWASP security headers.

---

## 3. Visual & Functional Non-Regression Verification

All 46 automated tests pass seamlessly without any modifications to frontend UI templates, style files, or client visual components.
