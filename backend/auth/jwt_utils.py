"""JWT token creation and verification.

Security note: migrated from python-jose (CVE-vulnerable ecdsa transitive dep)
to PyJWT 2.15.1+ (zero known CVEs as of Oct 2026). Public API is unchanged.
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from jwt.exceptions import PyJWTError

ALGORITHM = "HS256"
DEFAULT_EXPIRE_HOURS = 72

logger = logging.getLogger("luminix.jwt")
_ephemeral_key: Optional[str] = None


def _secret() -> str:
    global _ephemeral_key
    key = os.getenv("JWT_SECRET_KEY", "").strip()
    if key and key != "luminix-dev-secret-change-in-production":
        return key

    if not _ephemeral_key:
        _ephemeral_key = secrets.token_urlsafe(64)
        logger.warning(
            "SECURITY NOTICE: JWT_SECRET_KEY not set in environment or equals default placeholder. "
            "Using in-memory cryptographically secure ephemeral 256-bit key. "
            "Set JWT_SECRET_KEY in .env for persistent multi-instance sessions."
        )
    return _ephemeral_key


def create_access_token(data: Dict[str, Any], expires_hours: Optional[int] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    hours = expires_hours or int(os.getenv("JWT_EXPIRE_HOURS", str(DEFAULT_EXPIRE_HOURS)))
    expire = now + timedelta(hours=hours)
    to_encode.setdefault("iat", int(now.timestamp()))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except PyJWTError:
        return None
