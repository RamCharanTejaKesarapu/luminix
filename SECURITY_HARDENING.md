# Luminix — Security Hardening Guide & Architecture Standards

This guide outlines the security hardening architecture, operational guidelines, and secure coding standards implemented across the Luminix platform.

---

## 1. Zero UI/UX Impact Mandate

All security controls must conform to the **Zero UI/UX Modification Policy**:
- **Design Preservation:** Typography, spacing, colors, layouts, animations, transitions, and component appearance must never be modified under the guise of security remediation.
- **Workflow Preservation:** Legitimate user interactions, biometric data visualization, and navigation flows must remain identical.
- **Defense at the Protocol & Data Layers:** Hardening is implemented within middleware, authentication dependencies, database queries, file decoders, and API gateways.

---

## 2. Authentication & Session Architecture

### Argon2id Password Hashing
- Luminix utilizes **Argon2id** (`time_cost=2`, `memory_cost=102400 KiB`, `parallelism=8`) for credential storage, resistant to GPU/ASIC-accelerated brute force attacks.
- Passwords have strict validation rules: minimum 8 characters, maximum 128 characters, requiring mixed alphanumeric and special characters.

### JWT Cryptographic Management
- Tokens are signed with HMAC-SHA256 using 256-bit cryptographically secure keys (`secrets.token_urlsafe(32)`).
- Session tokens include a `token_version` claim. Password changes and account terminations increment the user's `token_version`, instantly invalidating all previously issued JWTs.
- Tokens are transmitted via **HttpOnly, Secure, SameSite=Lax** cookies with a strict 72-hour lifespan.

### OAuth 2.0 Flow Hardening
- Authorization codes from Google and GitHub are exchanged server-side over TLS.
- Cross-Site Request Forgery (CSRF) protection is enforced using short-lived (10-minute TTL) cryptographic state tokens stored in a memory cache.
- OAuth redirect URLs **never include access tokens in query parameters** (`/?auth_success=1`). Sessions are initialized solely from HttpOnly cookies.

---

## 3. Authorization & BOLA / IDOR Prevention

Every API route touching biometric and health telemetry adheres to the following authorization pipeline:

```
Incoming Request
      │
      ▼
Resolve Authentication (JWT in HttpOnly Cookie or Bearer Header)
      │
      ├──> If Unauthenticated & Accessing Named User: HTTP 401 Unauthorized
      ├──> If Authenticated: Extract caller user ID from token ("sub")
      │
      ▼
Authorize Requested Resource Scope:
      │
      ├──> If caller_id != requested_user_id: HTTP 403 Forbidden
      └──> If caller_id == requested_user_id: Grant Access
```

### Ingestion Pipeline Integrity
- Data ingestion pipelines (`/api/v1/health/sync`, `/api/v1/health/batch`, `/api/v1/health/samples`) explicitly bind all persisted records to the verified `caller_id`.
- Client-provided `user_id` fields within telemetry dictionaries are stripped and overwritten with the authenticated identity before database insertion.

---

## 4. Multi-Tenant WebSocket Channel Isolation

The real-time telemetry streaming gateway (`/live/ws`) enforces multi-tenant isolation:
1. **Mandatory Token Authentication:** Clients must present a valid session token via the query parameter (`?token=...`) during handshake.
2. **Channel Partitioning:** The `LiveConnectionManager` maintains isolated per-user socket pools (`user_connections: Dict[str, Set[WebSocket]]`).
3. **Eavesdropping Prevention:** Real-time biometric broadcasts (`heart_rate`, `blood_pressure`, `spo2`) are routed exclusively to sockets registered to the originating user ID.
4. **Frame Size Capping:** Incoming messages are capped at 64KB to prevent memory exhaustion attacks.

---

## 5. File Upload & Magic Byte Security

All endpoints accepting binary uploads (`/v1/pose/analyze-video`, `/v1/report/combined-with-upload`) implement five layers of defensive filtering:
1. **Extension Allowlisting:** Only approved video formats are accepted (`.mp4`, `.mov`, `.avi`, `.webm`).
2. **File Size Enforcement:** Hard cap of 15MB per file before processing.
3. **Magic Byte Verification:** File headers are inspected for authentic format signatures:
   - MP4 / MOV: `ftyp`, `moov`, or `mdat` within the first 32 bytes.
   - AVI: `RIFF....AVI ` signature.
   - WebM: `\x1a\x45\xdf\xa3` Matroska header.
4. **Collision-Proof Storage:** Uploaded files are written with randomized names (`pose_{uuid}.mp4`).
5. **Ephemeral Storage Lifecycle:** Ingestion files are deleted in `finally:` blocks immediately after pose landmarks and kinematic telemetry are extracted.

---

## 6. Path Traversal & Local File Inclusion Defense

Endpoints accepting filesystem references (e.g. `pose_preview_path` in `/v1/video/generate`):
- Explicitly reject path traversal tokens (`..`, `\x00`).
- Canonicalize paths via `Path.resolve()`.
- Validate that the target path is strictly contained within approved system directories (`OUTPUT`, `ASSETS_DIR`, `STATIC_DIR`).
- Require valid image file extensions (`.png`, `.jpg`, `.jpeg`, `.webp`).

---

## 7. AI Security & Process Memory Isolation

1. **Zero Secret Leakage:** The `/v1/config/ai-key` endpoint is fully redacted to return only configuration status. Client-side source code is cleansed of hardcoded API keys.
2. **Process Integrity:** API calls to Google Gemini pass the active API key directly as a function argument, avoiding mutation of global `os.environ["GEMINI_API_KEY"]`.
3. **Prompt Injection Mitigation:** System instructions in `gemini_integration.py` use structured delimiters, clinical role boundaries, and strict output schema enforcement.
4. **Request Bounds:** Incoming user prompts and meal queries are bounded via Pydantic (`max_length=4000` for chat, `max_length=1000` for food queries).

---

## 8. HTTP Security Headers & Content Security Policy

The Luminix Security Firewall automatically injects OWASP-recommended security headers on every response:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
- `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://www.gstatic.com https://apis.google.com`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `img-src 'self' data: https: blob:`
  - `media-src 'self' data: blob:`
  - `connect-src 'self' ws: wss: https://cdn.jsdelivr.net https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://generativelanguage.googleapis.com`
  - `frame-ancestors 'self'`
