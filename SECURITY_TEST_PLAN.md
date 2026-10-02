# Luminix — Security Test Plan & Verification Protocol

## 1. Overview & Objectives

The Luminix Security Test Plan ensures continuous verification of all application security controls, prevents authorization regressions, guards against secret leakage, and strictly maintains the **Zero UI/UX Change Policy**.

---

## 2. Test Execution Environments

- **Automated CI/CD Test Environment:** Python 3.14+ test runner executing `pytest` with `pytest-anyio` and Starlette `TestClient`.
- **Database Vault:** In-memory or isolated file-backed SQLite database (`backend/data/health_intel.sqlite`).
- **Network / Protocol Layer:** Local loopback testing with simulated HTTPS reverse proxy headers (`X-Forwarded-For`, `X-Real-IP`).

---

## 3. Core Test Scenarios

### Scenario A: Broken Object Level Authorization (BOLA/IDOR)
- **Objective:** Verify that User B cannot query or manipulate User A's health records.
- **Test Cases:**
  1. `test_bola_unauthorized_user_health_data_blocked`:
     - Create Alice (User 1) and Bob (User 2).
     - Bob requests `GET /api/v1/health/latest?user_id=alice_id` with Bob's JWT.
     - **Expected Result:** HTTP 403 Forbidden with `"Access denied: You are not authorized to access another user's health telemetry."`
  2. `test_bola_unauthenticated_access_to_named_user_blocked`:
     - Unauthenticated client requests `GET /api/v1/health/latest?user_id=alice_id`.
     - **Expected Result:** HTTP 401 Unauthorized with `"Authentication required to access user-specific health telemetry."`
  3. `test_user_can_access_own_health_telemetry`:
     - Alice requests `GET /api/v1/health/latest?user_id=alice_id` with Alice's JWT.
     - **Expected Result:** HTTP 200 OK returning legitimate telemetry.

### Scenario B: Telemetry Spoofing & Sample Ingestion Integrity
- **Objective:** Verify that sample payloads cannot forge user ownership during synchronization.
- **Test Cases:**
  1. `test_sync_blocks_sample_user_id_spoofing`:
     - Alice submits a sync payload containing `userId: bob_id`.
     - **Expected Result:** HTTP 403 Forbidden.
  2. `test_dpdp_account_deletion_erases_health_samples`:
     - User initiates account deletion via `/v1/auth/delete-account`.
     - **Expected Result:** Complete data sanitization; subsequent queries return no orphaned records.

### Scenario C: Unrestricted File Upload & Magic Byte Bypass
- **Objective:** Ensure non-video and malicious executable uploads are rejected before filesystem persistence.
- **Test Cases:**
  1. `test_combined_with_upload_blocks_executable_files`:
     - Upload `.exe` file with PE header to `/v1/report/combined-with-upload`.
     - **Expected Result:** HTTP 400 Bad Request with `"Unsupported file format"`.
  2. `test_combined_with_upload_validates_magic_bytes`:
     - Upload `.mp4` file containing ASCII script (`<?php phpinfo(); ?>`).
     - **Expected Result:** HTTP 400 Bad Request with `"Invalid video header"`.
  3. `test_video_upload_security_controls`:
     - Upload file exceeding 15MB.
     - **Expected Result:** HTTP 413 Payload Too Large.

### Scenario D: Path Traversal & Local File Inclusion
- **Objective:** Prevent arbitrary host file disclosure in video generation pipelines.
- **Test Cases:**
  1. `test_video_generate_blocks_path_traversal`:
     - Submit `pose_preview_path: "../../../../../etc/passwd"`.
     - **Expected Result:** HTTP 400 or 403 rejection.
  2. `test_video_generate_blocks_non_image_extension`:
     - Submit `pose_preview_path: "backend/api/main.py"`.
     - **Expected Result:** HTTP 400 Bad Request.

### Scenario E: Secret Redaction & Information Leakage
- **Objective:** Verify zero credential and server path exposure in public endpoints.
- **Test Cases:**
  1. `test_config_ai_key_redacts_secret_keys`:
     - Query `GET /v1/config/ai-key`.
     - **Expected Result:** Response contains `"configured": bool` but strictly lacks `"key"`.
  2. `test_health_endpoint_redacts_filesystem_paths`:
     - Query `GET /health`.
     - **Expected Result:** Response lacks `"output_dir"`, containing `"output_dir_ready": bool`.

### Scenario F: OWASP Security Headers & CSP
- **Objective:** Ensure browser enforcement of frame protection, HTTPS, and WebSocket communication.
- **Test Cases:**
  1. `test_owasp_security_headers_present`:
     - Inspect headers on `/health`.
     - **Expected Result:** `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, `Strict-Transport-Security`.
  2. `test_csp_allows_secure_websockets`:
     - Inspect `Content-Security-Policy`.
     - **Expected Result:** `connect-src` contains `ws:` and `wss:`.

---

## 4. Visual & UX Regression Protocol

To strictly enforce the **Zero UI/UX Modification Policy**, every release must pass visual regression checks:
1. **HTML Template Byte Verification:** Ensure `index.html`, `auth.html`, `privacy.html`, `terms.html`, and `accessibility.html` have zero modified DOM nodes.
2. **CSS Rule Consistency:** Verify stylesheet files are untouched.
3. **Responsive & Animation Verification:** Inspect Kyoto-inspired UI themes, dark mode contrast ratios, and MediaPipe overlay canvases to confirm identical visual behavior.
