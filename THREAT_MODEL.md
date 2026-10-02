# Luminix — Threat Model & Security Architecture Analysis

**Framework:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**System Classification:** Health Intelligence, Biomechanics Analysis, & Telemetry Platform  
**Data Classification:** Sensitive Personal Data / Health Metrics (DPDP Act 2023, HIPAA Guidelines)

---

## 1. Trust Boundaries & Data Flow Diagram

```
[ UNTRUSTED ZONE: Public Internet ]
           │
           │ TLS 1.3 / HTTPS / WSS
           ▼
╔══════════════════════════════════════════════════════════════════╗
║ TRUST BOUNDARY 1: Web Application Firewall & Rate Limiting       ║
║ - IP Resolution (X-Forwarded-For Sanitization)                   ║
║ - WAF Threat Inspection (SQLi, XSS, Path Traversal, Scanners)    ║
║ - Per-Endpoint Leaky Bucket Rate Limiting                        ║
╚══════════════════════════════════════════════════════════════════╝
           │
           ▼
╔══════════════════════════════════════════════════════════════════╗
║ TRUST BOUNDARY 2: Authentication & Authorization Gateway         ║
║ - JWT Signature & Token Version Verification                     ║
║ - Caller User ID Scoping (_resolve_authorized_user_id)           ║
║ - Multi-Tenant WebSocket Channel Isolation                       ║
╚══════════════════════════════════════════════════════════════════╝
           │
           ▼
╔══════════════════════════════════════════════════════════════════╗
║ TRUST BOUNDARY 3: Core Application Services & Pipeline Validation║
║ - Video Magic Byte & Size Verification                           ║
║ - Path Canonicalization & Traversal Defense                      ║
║ - Ephemeral File Storage with Immediate Unlink                   ║
║ - AI Prompt Boundary Enforcement (Zero os.environ Overwrite)     ║
╚══════════════════════════════════════════════════════════════════╝
           │
           ▼
╔══════════════════════════════════════════════════════════════════╗
║ TRUST BOUNDARY 4: Data Persistence & Hardware Controller         ║
║ - Parameterized SQLite Queries (SQLAlchemy Core)                 ║
║ - User-Partitioned Row Ownership                                 ║
║ - Bluetooth Native Hardware Isolation                            ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. STRIDE Threat Assessment & Mitigations

### 2.1 Spoofing (Identity & Telemetry)
- **Threat S1: User Impersonation via Forged JWT**
  - *Vector:* Attacker generates self-signed JWT or exploits weak signing key.
  - *Mitigation:* Cryptographically random 256-bit secret key; HMAC-SHA256 verification; token version invalidation on password change.
- **Threat S2: Health Telemetry Ingestion Spoofing**
  - *Vector:* Attacker sends `/api/v1/health/sync` payload with `userId: "victim_id"` to pollute health records.
  - *Mitigation:* `_resolve_authorized_user_id` strictly binds the ingestion pipeline to the authenticated session ID, rejecting mismatched user IDs with HTTP 403.

### 2.2 Tampering (Data & Integrity)
- **Threat T1: Biometric Sample Tampering**
  - *Vector:* Malicious wearable bridge modifies timestamps or values to trigger false clinical risk scores.
  - *Mitigation:* Server-side range validation on systolic/diastolic BP, heart rate, and BMI; database schema constraints.
- **Threat T2: Malicious Executable Upload as Video**
  - *Vector:* Attacker renames executable malware (`exploit.exe` to `video.mp4`) and uploads to `/v1/report/combined-with-upload`.
  - *Mitigation:* Format extension allowlist (`.mp4`, `.mov`, `.avi`, `.webm`) combined with binary magic byte inspection (`ftyp`, `moov`, `mdat`, `RIFF`, `\x1a\x45\xdf\xa3`).

### 2.3 Repudiation
- **Threat R1: Denying Telemetry Ingestion or Account Actions**
  - *Vector:* User claims unauthorized account deletion or data wipe.
  - *Mitigation:* Dedicated audit event logging (`database.db.log_event` and `log_security_event`) tracking IP, timestamp, action, and authenticated identity.

### 2.4 Information Disclosure
- **Threat I1: BOLA / Horizontal Data Exposure**
  - *Vector:* Attacker queries `/api/v1/health/latest?user_id=123` to inspect another user's blood pressure and heart rate.
  - *Mitigation:* Strict session scoping in `_resolve_authorized_user_id`. Mismatched requests return HTTP 403; unauthenticated requests return HTTP 401.
- **Threat I2: Production Secret Leakage via Client Endpoints**
  - *Vector:* Unauthenticated caller queries `/v1/config/ai-key` or extracts base64 tokens from frontend JavaScript.
  - *Mitigation:* Complete removal of hardcoded client keys; `/v1/config/ai-key` returns only configuration booleans; AI requests proxied through server.
- **Threat I3: Local File Inclusion / Path Traversal**
  - *Vector:* Attacker submits `pose_preview_path: "../../../etc/passwd"` to `/v1/video/generate`.
  - *Mitigation:* Strict path canonicalization; traversal token rejection; containment checks within `OUTPUT`, `ASSETS_DIR`, and `STATIC_DIR`.
- **Threat I4: Cross-User Telemetry Eavesdropping on WebSockets**
  - *Vector:* Attacker connects to `/live/ws` and intercepts broadcasts from other users.
  - *Mitigation:* Authenticated WebSocket handshake and isolated per-user socket pools (`user_connections: Dict[str, Set[WebSocket]]`).

### 2.5 Denial of Service (DoS)
- **Threat D1: Brute Force Authentication & Signup Exhaustion**
  - *Vector:* Distributed credential stuffing against `/v1/auth/login` and `/v1/auth/register`.
  - *Mitigation:* Independent rate-limiting buckets enforcing a maximum of 5 attempts per 15 minutes per IP.
- **Threat D2: Memory Exhaustion via Oversized Payloads**
  - *Vector:* Large POST payloads flooding memory buffers.
  - *Mitigation:* Pre-body `Content-Length` enforcement (1MB standard, 15MB upload); deep JSON size limits.

### 2.6 Elevation of Privilege
- **Threat E1: Global Process Key Overwrite**
  - *Vector:* Attacker passes arbitrary `apiKey` to `/v1/luna/chat`, overwriting `os.environ["GEMINI_API_KEY"]` for all server threads.
  - *Mitigation:* Refactored `gemini_integration.py` to pass keys as isolated function arguments without process environment mutation.

---

## 3. Residual Risk & Ongoing Assurance

1. **Dependency Monitoring:** Continuous Dependabot / pip-audit scanning for upstream Python and Node.js security advisories.
2. **Key Rotation Protocol:** Mandatory 90-day rotation for OAuth client secrets, SendGrid keys, and Gemini API tokens.
3. **Audit Trail Verification:** Periodic reviews of `security_logs` table to detect reconnaissance or automated scanning patterns.
