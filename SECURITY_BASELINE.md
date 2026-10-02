# Luminix — Security Baseline

**Audit Date:** October 2, 2026  
**Phase:** 2 — Full Penetration Testing & Hardening  
**Policy:** ZERO UI/UX modification. Security changes only.  
**Auditor Role:** Senior Application Security Engineer / Penetration Tester

---

## 1. Application Architecture

| Component | Technology | Notes |
|---|---|---|
| Backend API | FastAPI (Python) | Async ASGI with Uvicorn |
| Database | SQLite via SQLAlchemy ORM | Parameterized queries only |
| Auth | JWT (PyJWT 2.15.1) + Argon2id | HttpOnly cookies, SameSite=Lax |
| OAuth | Google + GitHub OAuth 2.0 | State-validated CSRF protection |
| AI Integration | Google Gemini (generative-ai) | Per-request key isolation |
| Frontend | Vanilla HTML/CSS/JS | No framework; static files |
| WAF/Firewall | Custom SecurityFirewallMiddleware | Rate limiting, WAF patterns, CSP |
| File Storage | Local filesystem (ephemeral) | UUID-randomized, auto-deleted |
| Cloud | Firebase Admin SDK | Firestore telemetry sync |
| Deployment | Netlify (frontend) + Vercel/Heroku (backend) | Environment-variable secrets |

---

## 2. Endpoint Inventory

### Public (Unauthenticated) Endpoints
| Endpoint | Method | Notes |
|---|---|---|
| `/health` | GET | Internal health check — no sensitive data |
| `/v1/config/ai-key` | GET | Returns `configured: bool` only (no key) |
| `/v1/auth/register` | POST | Rate-limited 5/15min |
| `/v1/auth/login` | POST | Rate-limited 5/15min, Argon2id |
| `/v1/auth/forgot-password` | POST | Rate-limited, timing-safe response |
| `/v1/auth/reset-password` | POST | Single-use SHA-256 token, 15min TTL |
| `/v1/auth/google/login` | GET | OAuth redirect |
| `/v1/auth/github/login` | GET | OAuth redirect |
| `/v1/auth/google/callback` | GET | State-validated, JWT in cookie |
| `/v1/auth/github/callback` | GET | State-validated, JWT in cookie |
| `/v1/nutrition/*` | POST | No PII required — computation endpoints |
| `/v1/cook/suggest` | POST | No auth required — recipe lookup |
| `/v1/generate-plan` | POST | No auth required — plan generator |
| `/v1/gym/*` | GET | No auth required — static exercise data |
| `/v1/yoga/poses` | GET | No auth required — static pose library |
| `/v1/luna/chat` | POST | No auth required — AI chat |
| `/v1/report/*` | POST/GET | No auth required — report generation |
| `/v1/telemetry/sync` | POST | No auth — mobile companion bridge |
| `/v1/telemetry/live` | GET | No auth — polling endpoint |
| `/v1/bluetooth/*` | GET/POST | No auth — local BLE operations |
| `/v1/device/*` | GET/POST | No auth — Find My Device |
| `/v1/creator/donation` | POST | No auth — donation pledge |
| `/v1/firebase/*` | GET | Public config only (no secrets) |
| `/v1/progress/recent` | GET | Optional auth — scoped by user |
| `/v1/progress/log` | POST | Optional auth — scoped by user |

### Protected (Authentication Required) Endpoints
| Endpoint | Method | Guard |
|---|---|---|
| `/v1/auth/me` | GET | `get_current_user` |
| `/v1/auth/profile` | PUT | `get_current_user` |
| `/v1/auth/change-password` | POST | `get_current_user` |
| `/v1/auth/delete-account` | DELETE | `get_current_user` |
| `/v1/auth/logout` | POST | `get_current_user` |
| `/v1/auth/firewall/status` | GET | `get_current_user` |
| `/v1/auth/firewall/logs` | GET | `get_current_user` |
| `/api/v1/health/*` | ALL | `get_current_user` (BOLA-scoped) |
| `/api/v1/health/live/ws` | WS | JWT cookie or query token |

### WebSocket Endpoints
| Endpoint | Auth | Notes |
|---|---|---|
| `/api/v1/health/live/ws` | Optional JWT (cookie or `?token=`) | User-isolated; defaults to "default" channel |

---

## 3. Pre-Hardening Security State (Phase 1 — Completed)

| Category | Finding | Status |
|---|---|---|
| Secrets | Hardcoded base64 Gemini API keys in 4 frontend files | ✅ Fixed |
| BOLA/IDOR | Health endpoints returned cross-user data | ✅ Fixed |
| Path Traversal | `/v1/video/generate` allowed `../` traversal | ✅ Fixed |
| File Upload | Missing magic byte validation, no size limit | ✅ Fixed |
| CORS | Wildcard `*` origin policy | ✅ Fixed |
| AI Secret Exposure | `/v1/config/ai-key` returned raw API key | ✅ Fixed |
| OAuth Token Leak | JWT in redirect URL query param | ✅ Fixed |
| WebSocket CSP | Missing `ws:` / `wss:` in connect-src | ✅ Fixed |
| XSS | `data.device_name`, AI tips, deficiencies in innerHTML | ✅ Fixed (Phase 2) |
| CVEs | PyJWT 12 CVEs, Pillow 4 CVEs, urllib3 3 CVEs, ecdsa 2 CVEs | ✅ Fixed (Phase 2) |
| JWT Library | python-jose (CVE via ecdsa) | ✅ Migrated to PyJWT |
| Error Disclosure | Raw exception text in HTTP error responses | ✅ Fixed (Phase 2) |
| IP Spoofing | X-Forwarded-For donation rate limit bypass | ✅ Fixed (Phase 2) |
| Prompt Injection | user_context passed raw to AI prompt | ✅ Fixed (Phase 2) |
| AI Error Leak | `gemini_error: str(exc)` in API responses | ✅ Fixed (Phase 2) |

---

## 4. Current Security Controls

### Authentication
- Argon2id password hashing (memory-hard, OWASP recommended)
- JWT signed with HS256 using 64-byte cryptographically random key
- `token_version` mechanism to invalidate all sessions on password change
- HttpOnly, SameSite=Lax cookies — XSS cannot steal tokens
- Secure flag enabled in non-development environments

### Authorization
- All health data endpoints enforce `_resolve_authorized_user_id()`
- BOLA blocked at API layer — User A cannot access User B's data
- WebSocket connections are channel-isolated per user ID
- Firewall/logs endpoints require authentication

### Rate Limiting
- 40+ endpoint-specific rate limit rules in `SecurityFirewallMiddleware`
- Auth endpoints: 5 attempts / 15 minutes
- AI endpoints: 20 requests / minute
- Upload endpoints: 10 requests / minute
- Donation: 5 per day (IP + email dual check)

### WAF / Injection Prevention
- SQL injection: SQLAlchemy ORM — parameterized queries throughout
- Command injection: `subprocess` calls use hardcoded literal args only
- Path traversal: canonical path enforcement with directory containment
- XSS: `escapeHtml()` helper in all 4 frontend files with dynamic data

### File Upload Security
- Extension allowlist: `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`
- Magic byte validation for each allowed format
- 15MB size limit
- UUID-randomized filenames (no user-controlled names)
- Ephemeral deletion after processing

### CORS
- Explicit origin allowlist (no wildcard)
- Credentialed requests validated against allowlist

### Security Headers
- Content-Security-Policy (full directives including ws:/wss:)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (in production)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy configured

### Dependencies
- pip-audit: 0 known CVEs
- PyJWT 2.15.1 (replaces python-jose + ecdsa)
- Pillow 12.3.0
- urllib3 2.8.0
- All security-sensitive packages pinned in requirements.txt

### AI Security
- System prompt separated from user content
- user_context sanitized: blocked keys, scalar-only values, 200-char cap
- No raw exception text returned to clients
- Prompt injection prevention via key blocklist

### Logging
- Security events logged to SQLite (`security_logs` table)
- Sensitive data masked in logs (`_mask_sensitive()`)
- Passwords, tokens, API keys never logged

---

## 5. Remaining Risks / Accepted Risk

| Risk | Severity | Reason Not Fixed | Compensating Control |
|---|---|---|---|
| `/v1/telemetry/sync` unauthenticated | Low | Mobile companion devices (companion.html) cannot send cookies across different origins/ports | 60 req/min rate limit; in-memory only, not user health DB |
| Token in JSON response body | Informational | Some integrations may rely on the token from body | Token also in HttpOnly cookie; JS cannot access cookie |
| Gemini model FutureWarning | Informational | Requires upstream API migration (google.genai) | Functionality not impacted; schedule migration separately |
| In-memory telemetry state | Low | Server restart clears state | Ephemeral by design; not health-record storage |

---

*Last Updated: October 2, 2026 — Phase 2 Penetration Testing Complete*
