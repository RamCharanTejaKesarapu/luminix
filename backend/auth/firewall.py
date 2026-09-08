"""Luminix Security Firewall — WAF Threat Detection, Rate Limiting, & Security Headers.

Provides multi-layer application security:
1. Per-Endpoint Rate Limiting (Dedicated 5 attempts / 15 mins for login & signup; individual buckets for all endpoints)
2. WAF Threat Inspection (SQLi, XSS, Path Traversal, Command Injection, Malicious Scanners, Null-bytes)
3. Payload Protection (Fast 413 rejection for oversized payloads; 400 for malformed JSON)
4. Deep JSON Payload Sanitization (Recursive scanning of request bodies)
5. OWASP Recommended Security Headers
6. Security Audit Logging & SQLite persistence
"""

from __future__ import annotations

import json
import os
import re
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from database.db import log_security_event

# ── WAF Threat Signatures ─────────────────────────────────────────────────────

SQLI_PATTERNS = [
    re.compile(r"(\bunion\s+select\b)", re.IGNORECASE),
    re.compile(r"(\bselect\s+.*\s+from\s+information_schema\b)", re.IGNORECASE),
    re.compile(r"(\b(or|and)\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?)", re.IGNORECASE),
    re.compile(r"(\b(drop|truncate|alter)\s+table\b)", re.IGNORECASE),
    re.compile(r"(\bsleep\s*\(\s*\d+\s*\))", re.IGNORECASE),
    re.compile(r"(\bbenchmark\s*\(\s*\d+\s*,\s*.*\))", re.IGNORECASE),
    re.compile(r"(--\s*$|/\*.*?\*/)", re.IGNORECASE),
]

XSS_PATTERNS = [
    re.compile(r"(<\s*script[^>]*>)", re.IGNORECASE),
    re.compile(r"(javascript\s*:)", re.IGNORECASE),
    re.compile(r"(on(error|load|click|mouseover|submit)\s*=)", re.IGNORECASE),
    re.compile(r"(<\s*iframe[^>]*>)", re.IGNORECASE),
    re.compile(r"(<\s*svg[^>]*onload\s*=)", re.IGNORECASE),
]

PATH_TRAVERSAL_PATTERNS = [
    re.compile(r"(\.\./|\.\.\\)", re.IGNORECASE),
    re.compile(r"(/etc/passwd|/etc/shadow|/proc/self/environ|win\.ini|boot\.ini)", re.IGNORECASE),
]

CMD_INJECTION_PATTERNS = [
    re.compile(r"(\||;|&&)\s*(cat|ls|rm|curl|wget|bash|sh|nc|python|perl)\b", re.IGNORECASE),
    re.compile(r"(\$\(.*\)|`.*`)", re.IGNORECASE),
]

BAD_USER_AGENTS = [
    "sqlmap",
    "nikto",
    "acunetix",
    "dirbuster",
    "gobuster",
    "masscan",
    "zgrab",
    "wpscan",
    "nmap",
    "havij",
]

# ── Granular Per-Endpoint Rate Limit Configuration ───────────────────────────
# Format: (path_prefix, max_requests, window_seconds, rule_id, description)
ENDPOINT_RATE_LIMIT_RULES: List[Tuple[str, int, float, str, str]] = [
    # 1. Critical Auth Endpoints (Max 5 attempts / 15 mins for login & signup)
    ("/v1/auth/login", 5, 900.0, "login", "User sign-in attempt (max 5 / 15 mins)"),
    ("/v1/auth/register", 5, 900.0, "signup", "User registration / signup (max 5 / 15 mins)"),
    ("/v1/auth/forgot-password", 5, 900.0, "forgot_password", "Password recovery dispatch (max 5 / 15 mins)"),
    ("/v1/auth/reset-password", 5, 900.0, "reset_password", "Password reset execution (max 5 / 15 mins)"),
    ("/v1/auth/change-password", 5, 900.0, "change_password", "Password change execution (max 5 / 15 mins)"),
    ("/v1/auth/delete-account", 5, 900.0, "delete_account", "Account deletion execution (max 5 / 15 mins)"),
    ("/v1/auth/oauth-sync", 20, 60.0, "oauth_sync", "OAuth profile synchronization"),
    ("/v1/auth/google", 20, 60.0, "oauth_google", "Google OAuth authentication flow"),
    ("/v1/auth/github", 20, 60.0, "oauth_github", "GitHub OAuth authentication flow"),
    ("/v1/auth/me", 60, 60.0, "auth_me", "Current session user profile"),
    ("/v1/auth/profile", 30, 60.0, "auth_profile", "Biometric profile update"),
    ("/v1/auth/logout", 30, 60.0, "auth_logout", "Sign out session"),
    ("/v1/auth/firewall", 60, 60.0, "auth_firewall", "Firewall security telemetry"),
    ("/v1/auth", 30, 60.0, "auth_general", "General authentication & session sync"),

    # 2. Resource-Intensive AI & Generation Endpoints
    ("/v1/luna/chat", 20, 60.0, "luna_chat", "Conversational AI coaching"),
    ("/v1/nutrition/ai-food-analysis", 15, 60.0, "ai_food_analysis", "Multimodal food vision analysis"),
    ("/v1/video/generate", 5, 60.0, "video_generate", "HD biomechanical video render"),
    ("/v1/report/export-pdf", 10, 60.0, "export_pdf", "Clinical PDF dossier export"),
    ("/v1/export/pdf", 10, 60.0, "export_pdf_alt", "Clinical PDF dossier export (direct)"),
    ("/v1/report/send-email", 5, 60.0, "send_email", "Email report dispatch"),
    ("/v1/email-report", 5, 60.0, "send_email_alt", "Email report dispatch (direct)"),
    ("/v1/report/combined-with-upload", 10, 60.0, "report_upload", "Combined report with video ingestion"),
    ("/v1/report/combined", 20, 60.0, "report_combined", "Combined report synthesis"),
    ("/v1/pose/analyze-video", 10, 60.0, "pose_video_analysis", "Kinematic video telemetry"),
    ("/v1/pose-analysis", 30, 60.0, "pose_analysis", "Real-time pose landmark stream"),
    ("/v1/nutrition/metrics-and-plan", 30, 60.0, "nutrition_plan", "Nutrition calculation and diet planner"),
    ("/v1/nutrition/weekly-plan", 20, 60.0, "nutrition_weekly", "Weekly dietary schedule"),
    ("/v1/nutrition/metrics", 30, 60.0, "nutrition_metrics", "Basal metabolic rate and macro metrics"),
    ("/v1/generate-plan", 20, 60.0, "generate_plan", "AI workout regimen generation"),
    ("/v1/cook/suggest", 30, 60.0, "cook_suggest", "Recipe and culinary suggestion engine"),

    # 3. Telemetry, BLE & Hardware
    ("/v1/device/ring/status", 120, 60.0, "device_ring_status", "Device ring polling status"),
    ("/v1/device/ring/stop", 30, 60.0, "device_ring_stop", "Stop device alarm"),
    ("/v1/device/ring", 10, 60.0, "device_ring", "Wearable siren alert trigger"),
    ("/v1/device/proximity", 60, 60.0, "device_proximity", "BLE RSSI proximity calculation"),
    ("/v1/telemetry/live", 120, 60.0, "telemetry_live", "Live vitals high-frequency polling"),
    ("/v1/telemetry/sync", 60, 60.0, "telemetry_sync", "Live wearable vitals sync"),
    ("/v1/telemetry/record", 60, 60.0, "telemetry_record", "Wearable telemetry ledger"),
    ("/v1/telemetry/reset", 30, 60.0, "telemetry_reset", "Telemetry session reset"),
    ("/v1/telemetry/history", 60, 60.0, "telemetry_history", "Historical telemetry query"),
    ("/v1/bluetooth/force-pair-request", 30, 60.0, "bt_pair_request", "BLE pairing trigger"),
    ("/v1/bluetooth/state", 60, 60.0, "bt_state", "BLE adapter state"),
    ("/v1/bluetooth/scan", 30, 60.0, "bt_scan", "BLE peripheral scanning"),
    ("/v1/bluetooth/devices", 30, 60.0, "bt_devices", "BLE device management"),
    ("/v1/bluetooth/connect", 20, 60.0, "bt_connect", "BLE connection establishment"),
    ("/v1/firebase/client-config", 60, 60.0, "firebase_config", "Firebase client configuration"),
    ("/v1/firebase/status", 60, 60.0, "firebase_status", "Firebase connectivity status"),

    # 4. Content & Exercise
    ("/v1/gym/categories", 60, 60.0, "gym_categories", "Gym exercise categories"),
    ("/v1/gym/plan", 60, 60.0, "gym_plan", "Gym workout routine"),
    ("/v1/gym-plan", 60, 60.0, "gym_plan_full", "Complete gym workout regimen"),
    ("/v1/yoga/poses", 60, 60.0, "yoga_poses", "Yoga asanas library"),
    ("/v1/progress/recent", 60, 60.0, "progress_recent", "Recent exercise progress"),
    ("/v1/progress/log", 30, 60.0, "progress_log", "Workout progress submission"),
    ("/download/video", 20, 60.0, "download_video", "Video file download"),

    # 5. Health & Diagnostic Probe
    ("/health", 120, 60.0, "health_check", "Firewall and service health ping"),

    # 6. Public Pages & Static Assets
    ("/auth", 60, 60.0, "page_auth", "Authentication UI view"),
    ("/privacy", 60, 60.0, "page_privacy", "Privacy policy covenant"),
    ("/terms", 60, 60.0, "page_terms", "Terms of service covenant"),
    ("/accessibility", 60, 60.0, "page_accessibility", "Accessibility statement UI view"),
    ("/companion", 60, 60.0, "page_companion", "Mobile companion bridge"),
    ("/manifest.json", 120, 60.0, "page_manifest", "PWA manifest"),
    ("/favicon.ico", 120, 60.0, "page_favicon", "Favicon icon"),
    ("/robots.txt", 120, 60.0, "page_robots", "Search engine crawler directives"),
    ("/sitemap.xml", 120, 60.0, "page_sitemap", "Sitemap index"),
    ("/llms.txt", 120, 60.0, "page_llms", "AI system knowledge file"),
    ("/static", 180, 60.0, "static_assets", "Static CSS, JS, and font assets"),
    ("/assets", 180, 60.0, "media_assets", "Media and vector assets"),
    ("/images", 180, 60.0, "image_assets", "Static images"),

    # 7. Fallback Catch-All Rules
    ("/v1/", 60, 60.0, "api_standard", "Standard API route access"),
    ("/", 180, 60.0, "pages_and_assets", "Static documents and sanctuary pages"),
]


class SecurityFirewall:
    def __init__(self):
        # Sliding-window rate limiting: bucket_key -> list of request timestamps
        self.endpoint_requests: Dict[str, List[float]] = defaultdict(list)
        # Account/identifier sliding-window failure tracking (for progressive delay / lockout prevention)
        self.account_failed_attempts: Dict[str, List[float]] = defaultdict(list)

        # Backward compatibility aliases
        self.auth_rate_limit: int = 5
        self.auth_window_seconds: float = 900.0

        # Payload Size Limits (bytes)
        self.max_body_bytes_standard: int = 1 * 1024 * 1024   # 1 MB
        self.max_body_bytes_upload: int = 15 * 1024 * 1024    # 15 MB

        # Metrics
        self.total_requests_inspected: int = 0
        self.total_threats_blocked: int = 0
        self.total_rate_limited: int = 0
        self.total_payloads_rejected: int = 0
        self.last_cleanup: float = time.time()

        # Whitelist / trusted IPs (only if explicitly configured via environment variable)
        env_whitelist = os.environ.get("FIREWALL_WHITELISTED_IPS", "").strip()
        self.whitelisted_ips: Set[str] = set(ip.strip() for ip in env_whitelist.split(",") if ip.strip())

    def reset_state(self) -> None:
        """Clears all in-memory rate limiting buckets and metrics (used for tests and zero-downtime reloads)."""
        self.endpoint_requests.clear()
        self.account_failed_attempts.clear()
        self.total_threats_blocked = 0
        self.total_rate_limited = 0
        self.total_payloads_rejected = 0

    def record_failed_auth(self, identifier: str, now: Optional[float] = None) -> None:
        """Records a failed authentication attempt against an account identifier (email/username)."""
        if not identifier:
            return
        t = now if now is not None else time.time()
        norm_id = identifier.lower().strip()
        self.account_failed_attempts[norm_id].append(t)

    def reset_failed_auth(self, identifier: str) -> None:
        """Resets failed attempts after successful authentication."""
        if not identifier:
            return
        norm_id = identifier.lower().strip()
        if norm_id in self.account_failed_attempts:
            del self.account_failed_attempts[norm_id]

    def check_account_throttle(self, identifier: str, now: Optional[float] = None) -> Tuple[bool, int]:
        """Checks if account identifier has exceeded failed attempt threshold (5 attempts / 15 mins).
        Returns (is_throttled, retry_after_seconds).
        Implements progressive exponential backoff: 5s, 10s, 20s, up to 900s.
        """
        if not identifier:
            return False, 0
        t = now if now is not None else time.time()
        norm_id = identifier.lower().strip()
        cutoff = t - 900.0
        attempts = [ts for ts in self.account_failed_attempts.get(norm_id, []) if ts > cutoff]
        self.account_failed_attempts[norm_id] = attempts
        if len(attempts) >= 5:
            excess = len(attempts) - 5
            backoff = min(900, int(5 * (2 ** min(excess, 7))))
            last_attempt = max(attempts)
            elapsed = t - last_attempt
            if elapsed < backoff:
                return True, int(backoff - elapsed) + 1
            if len(attempts) >= 10:
                retry_after = int(900.0 - (t - attempts[0])) + 1
                return True, max(1, retry_after)
        return False, 0

    @property
    def auth_requests(self):
        """Backward compatibility helper for tests."""
        res = defaultdict(list)
        for k, v in self.endpoint_requests.items():
            if ":login" in k or ":signup" in k or ":auth_" in k or ":forgot_password" in k or ":reset_password" in k or ":change_password" in k:
                ip = k.split(":")[0]
                res[ip].extend(v)
        return res

    @property
    def api_requests(self):
        res = defaultdict(list)
        for k, v in self.endpoint_requests.items():
            if ":api_" in k or ":gym" in k or ":yoga" in k or ":luna" in k or ":nutrition" in k:
                ip = k.split(":")[0]
                res[ip].extend(v)
        return res

    @property
    def static_requests(self):
        res = defaultdict(list)
        for k, v in self.endpoint_requests.items():
            if ":page" in k or ":static" in k or ":public" in k or ":media" in k:
                ip = k.split(":")[0]
                res[ip].extend(v)
        return res

    def _cleanup_old_records(self, now: float) -> None:
        """Prune timestamps older than 900 seconds every 30 seconds to maintain bounded memory."""
        if now - self.last_cleanup < 30:
            return
        self.last_cleanup = now
        max_cutoff = now - 900.0

        for key in list(self.endpoint_requests.keys()):
            self.endpoint_requests[key] = [t for t in self.endpoint_requests[key] if t > max_cutoff]
            if not self.endpoint_requests[key]:
                del self.endpoint_requests[key]

        for key in list(self.account_failed_attempts.keys()):
            self.account_failed_attempts[key] = [t for t in self.account_failed_attempts[key] if t > max_cutoff]
            if not self.account_failed_attempts[key]:
                del self.account_failed_attempts[key]

    def check_rate_limit(self, client_ip: str, path: str, now: float) -> Tuple[bool, int, Dict[str, Any]]:
        """Checks if request violates the per-endpoint rate limit.
        Returns (is_allowed, retry_after_seconds, metadata_dict).
        """
        if client_ip in self.whitelisted_ips:
            return True, 0, {"limit": 9999, "remaining": 9999, "reset": 0, "rule": "whitelist", "description": "Whitelisted"}

        self._cleanup_old_records(now)

        norm_path = path.rstrip("/") if path != "/" else "/"

        # Match the most specific endpoint rule
        matched_rule = None
        is_prefix = False

        for prefix, limit, window, rule_id, desc in ENDPOINT_RATE_LIMIT_RULES:
            prefix_norm = prefix.rstrip("/") if prefix != "/" else "/"
            if norm_path == prefix_norm:
                matched_rule = (limit, window, rule_id, desc)
                is_prefix = False
                break
            elif prefix.endswith("/") and norm_path.startswith(prefix):
                matched_rule = (limit, window, rule_id, desc)
                is_prefix = True
                break
            elif norm_path.startswith(prefix_norm + "/"):
                matched_rule = (limit, window, rule_id, desc)
                is_prefix = True
                break

        if not matched_rule:
            if norm_path.startswith("/v1/"):
                matched_rule = (60, 60.0, "api_standard", f"Standard API route ({norm_path})")
            elif norm_path.startswith("/health"):
                matched_rule = (120, 60.0, "health_check", "Service health ping")
            else:
                matched_rule = (180, 60.0, "pages_and_assets", f"Public document/asset ({norm_path})")
            is_prefix = True

        limit, window, rule_id, desc = matched_rule

        # Dedicated bucket per endpoint:
        # Specific named endpoints use rule_id; generic prefix rules isolate by normalized path
        if is_prefix:
            bucket_key = f"{client_ip}:{rule_id}:{norm_path}"
        else:
            bucket_key = f"{client_ip}:{rule_id}"

        cutoff = now - window
        timestamps = [t for t in self.endpoint_requests[bucket_key] if t > cutoff]

        if len(timestamps) >= limit:
            retry_after = int(window - (now - timestamps[0])) + 1
            return False, max(1, retry_after), {
                "limit": limit,
                "remaining": 0,
                "reset": max(1, retry_after),
                "rule": rule_id,
                "description": desc,
            }

        timestamps.append(now)
        self.endpoint_requests[bucket_key] = timestamps
        remaining = max(0, limit - len(timestamps))
        return True, 0, {
            "limit": limit,
            "remaining": remaining,
            "reset": int(window),
            "rule": rule_id,
            "description": desc,
        }

    def inspect_threats(self, path: str, query_string: str, user_agent: str) -> Optional[Tuple[str, str]]:
        """Inspects query strings, paths, and user agents for known attack signatures."""
        ua_lower = (user_agent or "").lower()
        for bad_ua in BAD_USER_AGENTS:
            if bad_ua in ua_lower:
                return "bad_user_agent", f"Blocked scanner/tool User-Agent: {bad_ua}"

        raw_target = f"{path}?{query_string}"
        try:
            target = unquote(raw_target)
        except Exception:
            target = raw_target

        for p in SQLI_PATTERNS:
            match = p.search(target)
            if match:
                return "sqli_blocked", f"SQL Injection signature detected: {match.group(0)}"

        for p in XSS_PATTERNS:
            match = p.search(target)
            if match:
                return "xss_blocked", f"Cross-Site Scripting signature detected: {match.group(0)}"

        for p in PATH_TRAVERSAL_PATTERNS:
            match = p.search(target)
            if match:
                return "path_traversal", f"Directory traversal pattern detected: {match.group(0)}"

        for p in CMD_INJECTION_PATTERNS:
            match = p.search(target)
            if match:
                return "cmd_injection", f"Command injection signature detected: {match.group(0)}"

        return None

    def inspect_json_payload(self, data: Any, depth: int = 0) -> Optional[Tuple[str, str]]:
        """Recursively inspect JSON payload strings for injection and malicious signatures."""
        if depth > 10:
            return None

        if isinstance(data, str):
            if "\x00" in data:
                return "null_byte_injection", "Null-byte poisoning attempt detected in body"
            for p in SQLI_PATTERNS:
                match = p.search(data)
                if match:
                    return "sqli_blocked", f"SQL Injection signature in body: {match.group(0)}"
            for p in XSS_PATTERNS:
                match = p.search(data)
                if match:
                    return "xss_blocked", f"XSS signature in body: {match.group(0)}"
            for p in PATH_TRAVERSAL_PATTERNS:
                match = p.search(data)
                if match:
                    return "path_traversal", f"Directory traversal in body: {match.group(0)}"
            for p in CMD_INJECTION_PATTERNS:
                match = p.search(data)
                if match:
                    return "cmd_injection", f"Command injection in body: {match.group(0)}"

        elif isinstance(data, dict):
            for k, v in data.items():
                res = self.inspect_json_payload(k, depth + 1)
                if res:
                    return res
                res = self.inspect_json_payload(v, depth + 1)
                if res:
                    return res

        elif isinstance(data, list):
            for item in data:
                res = self.inspect_json_payload(item, depth + 1)
                if res:
                    return res

        return None

    def get_stats(self) -> Dict[str, Any]:
        return {
            "firewall_active": True,
            "total_requests_inspected": self.total_requests_inspected,
            "total_threats_blocked": self.total_threats_blocked,
            "total_rate_limited": self.total_rate_limited,
            "total_payloads_rejected": self.total_payloads_rejected,
            "endpoint_rules_active": [
                {"prefix": p, "limit": l, "window_seconds": int(w), "rule": r, "description": d}
                for p, l, w, r, d in ENDPOINT_RATE_LIMIT_RULES
            ],
            "waf_rules_active": {
                "sql_injection_shield": True,
                "xss_sanitizer": True,
                "path_traversal_guard": True,
                "scanner_blocker": True,
                "brute_force_shield": True,
                "payload_size_enforcer": True,
                "malformed_json_filter": True,
                "per_endpoint_rate_limiter": True,
            },
        }


# Global Singleton Firewall Instance
firewall = SecurityFirewall()


def resolve_client_ip(request: Request) -> str:
    """Extracts client IP, respecting standard reverse-proxy headers."""
    for header_name in ("cf-connecting-ip", "x-real-ip", "x-forwarded-for"):
        val = request.headers.get(header_name)
        if val:
            return val.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


class SecurityFirewallMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        firewall.total_requests_inspected += 1
        now = time.time()
        client_ip = resolve_client_ip(request)
        path = request.url.path
        query = str(request.url.query)
        user_agent = request.headers.get("user-agent", "")

        # 1. Payload Size Checking (Fast pre-body rejection via Content-Length)
        if request.method in ("POST", "PUT", "PATCH"):
            is_upload_route = any(p in path for p in ("/upload", "/video", "/analyze-video", "/avatar"))
            max_allowed = firewall.max_body_bytes_upload if is_upload_route else firewall.max_body_bytes_standard
            cl_header = request.headers.get("content-length")

            if cl_header:
                try:
                    content_length = int(cl_header)
                    if content_length > max_allowed:
                        firewall.total_payloads_rejected += 1
                        limit_mb = max_allowed // (1024 * 1024)
                        return JSONResponse(
                            status_code=413,
                            content={
                                "error": "Payload Too Large",
                                "detail": f"Request body exceeds maximum allowed limit of {limit_mb}MB.",
                            },
                            headers={
                                "X-Firewall-Status": "BLOCKED_PAYLOAD_TOO_LARGE",
                                "X-Max-Payload-MB": str(limit_mb),
                            },
                        )
                except ValueError:
                    firewall.total_payloads_rejected += 1
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Bad Request", "detail": "Invalid Content-Length header"},
                        headers={"X-Firewall-Status": "BLOCKED_INVALID_HEADER"},
                    )

        # 2. Threat Inspection on URL, Query, and Headers
        threat = firewall.inspect_threats(path, query, user_agent)
        if threat:
            threat_type, threat_detail = threat
            firewall.total_threats_blocked += 1
            log_security_event(
                client_ip=client_ip,
                event_type=threat_type,
                path=path,
                method=request.method,
                status_code=403,
                details=threat_detail,
            )
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Denied by Luminix Security Firewall",
                    "reason": threat_type,
                    "detail": "Your request contains patterns flagged as potentially malicious.",
                },
                headers={
                    "X-Firewall-Status": "BLOCKED",
                    "X-Firewall-Reason": threat_type,
                },
            )

        # 3. Per-Endpoint Rate Limiting Check
        allowed, retry_after, r_meta = firewall.check_rate_limit(client_ip, path, now)
        if not allowed:
            firewall.total_rate_limited += 1
            log_security_event(
                client_ip=client_ip,
                event_type="rate_limit",
                path=path,
                method=request.method,
                status_code=429,
                details=f"Exceeded rate limit for {path} ({r_meta.get('rule')}). Retry after {retry_after}s",
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "detail": f"Too many requests for {path} ({r_meta.get('description', 'endpoint')}). Please wait {retry_after} seconds before trying again.",
                    "endpoint": path,
                    "rule": r_meta.get("rule"),
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-Firewall-Status": "RATE_LIMITED",
                    "X-RateLimit-Limit": str(r_meta.get("limit", 5)),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
            )

        # 4. Body Malformed JSON & In-depth Payload Sanitization (for JSON payloads)
        content_type = request.headers.get("content-type", "").lower()
        if request.method in ("POST", "PUT", "PATCH") and "application/json" in content_type:
            try:
                body_bytes = await request.body()
                is_upload_route = any(p in path for p in ("/upload", "/video", "/analyze-video", "/avatar"))
                max_allowed = firewall.max_body_bytes_upload if is_upload_route else firewall.max_body_bytes_standard

                if len(body_bytes) > max_allowed:
                    firewall.total_payloads_rejected += 1
                    limit_mb = max_allowed // (1024 * 1024)
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "Payload Too Large",
                            "detail": f"Request body exceeds maximum allowed limit of {limit_mb}MB.",
                        },
                        headers={"X-Firewall-Status": "BLOCKED_PAYLOAD_TOO_LARGE"},
                    )

                if body_bytes:
                    try:
                        decoded_text = body_bytes.decode("utf-8")
                    except UnicodeDecodeError:
                        firewall.total_payloads_rejected += 1
                        return JSONResponse(
                            status_code=400,
                            content={"error": "Bad Request", "detail": "Request body must be valid UTF-8."},
                            headers={"X-Firewall-Status": "BLOCKED_INVALID_UTF8"},
                        )

                    try:
                        parsed_json = json.loads(decoded_text)
                    except json.JSONDecodeError as jde:
                        firewall.total_payloads_rejected += 1
                        return JSONResponse(
                            status_code=400,
                            content={
                                "error": "Bad Request",
                                "detail": f"Malformed JSON payload: {jde.msg} at line {jde.lineno} col {jde.colno}",
                            },
                            headers={"X-Firewall-Status": "BLOCKED_MALFORMED_JSON"},
                        )

                    # Deep scan JSON fields for SQLi, XSS, null bytes, command injection
                    payload_threat = firewall.inspect_json_payload(parsed_json)
                    if payload_threat:
                        threat_type, threat_detail = payload_threat
                        firewall.total_threats_blocked += 1
                        log_security_event(
                            client_ip=client_ip,
                            event_type=threat_type,
                            path=path,
                            method=request.method,
                            status_code=403,
                            details=threat_detail,
                        )
                        return JSONResponse(
                            status_code=403,
                            content={
                                "error": "Access Denied by Luminix Security Firewall",
                                "reason": threat_type,
                                "detail": "Malicious signature detected within request body payload.",
                            },
                            headers={
                                "X-Firewall-Status": "BLOCKED",
                                "X-Firewall-Reason": threat_type,
                            },
                        )
            except Exception:
                pass

        # 5. Process Request
        response: Response = await call_next(request)

        # 6. Inject Rate Limit Headers & OWASP Security Headers
        response.headers["X-RateLimit-Limit"] = str(r_meta.get("limit", 60))
        response.headers["X-RateLimit-Remaining"] = str(r_meta.get("remaining", 60))
        response.headers["X-RateLimit-Reset"] = str(r_meta.get("reset", 60))

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
        response.headers["X-Firewall-Protection"] = "Luminix-Active-Shield"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://www.gstatic.com https://apis.google.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https: blob:; "
            "media-src 'self' data: blob:; "
            "worker-src 'self' blob:; "
            "connect-src 'self' https://cdn.jsdelivr.net https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com; "
            "frame-ancestors 'self';"
        )

        return response
