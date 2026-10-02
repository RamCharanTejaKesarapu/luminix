# Luminix — Security Remediation Changelog

**Audit Date:** October 2, 2026  
**Version:** 2.1.0-secure  
**Policy Adherence:** **ZERO UI/UX MODIFICATION POLICY** (100% Visual and Design Preservation)

---

## 1. Summary of Changes

| Component / File | Type | Summary of Security Changes | Visual / UX Impact |
| :--- | :--- | :--- | :--- |
| `backend/api/main.py` | Security Patch | Configured explicit CORS allowlist; redacted raw Gemini API key in `/v1/config/ai-key`; removed host filesystem path disclosure in `/health`; added extension allowlist, magic byte checks, and 15MB limit in `/v1/report/combined-with-upload`; added path canonicalization and traversal guards in `/v1/video/generate`; eliminated `os.environ` key mutation in `/v1/luna/chat`; randomized PDF/email dossier filenames | **Zero Change** |
| `backend/api/health_routes.py` | Security Patch | Implemented `_resolve_authorized_user_id` across all health endpoints; blocked horizontal privilege escalation (BOLA) returning HTTP 403/401; isolated WebSocket streams per user; added 64KB message cap on `/live/ws` | **Zero Change** |
| `backend/database/db.py` | Security Patch | Hardened `save_health_samples` to enforce caller-authorized user ID binding on all ingested sample dictionaries | **Zero Change** |
| `backend/auth/oauth.py` | Security Patch | Modified `oauth_success_redirect` to route to `/?auth_success=1`, preventing JWT access token leakage in query strings; rely strictly on `HttpOnly` cookies | **Zero Change** |
| `backend/auth/firewall.py` | Security Patch | Added `ws:` and `wss:` protocols to `connect-src` directive in `Content-Security-Policy` | **Zero Change** |
| `backend/analysis_module/gemini_integration.py` | Security Patch | Added explicit `api_key` parameter support to `configure_gemini`, `get_generative_model`, `generate_content_with_fallback`, and `luna_chat_gemini` | **Zero Change** |
| `frontend/app.js` | Secret Removal | Removed hardcoded base64 Gemini API key constants; updated client to proxy AI queries through backend serverless endpoints | **Zero Change** |
| `frontend/nutrition.js` | Secret Removal | Removed hardcoded base64 Gemini API key constants; updated `syncServerKey` to check `configured` boolean rather than storing raw key in window scope | **Zero Change** |
| `frontend/auth.js` | Security Patch | Updated `handleTokenFromUrl` to support `auth_success` via `fetchMe()` using `HttpOnly` credentials and immediately cleanse URL parameters via `history.replaceState` | **Zero Change** |
| `frontend/firebase_service.js` | Secret Removal | Removed hardcoded fallback Firebase credentials; updated configuration to load from secure deployment injections | **Zero Change** |
| `frontend/functions/chat.js` | Secret Removal | Removed hardcoded fallback base64 API key in Netlify serverless chat function | **Zero Change** |
| `frontend/functions/recipes.js` | Secret Removal | Removed hardcoded fallback base64 API key in Netlify serverless recipe function | **Zero Change** |
| `tests/test_bugfixes_and_audit.py` | Test Hygiene | Randomized test user email in fixture to guarantee idempotent database test execution | **Zero Change** |
| `tests/test_security_audit_remediation.py` | Security Tests | Created 13 automated security regression tests validating BOLA, uploads, traversal, redaction, and headers | **Zero Change** |

---

## 2. Visual Regression Audit Sign-Off

- **HTML Templates:** 0 files changed.
- **CSS Stylesheets:** 0 files changed.
- **Layouts & Typography:** 100% identical.
- **Micro-Animations & Visual Themes:** 100% preserved.
- **Regression Suite:** 46 passed tests, 0 failures.
