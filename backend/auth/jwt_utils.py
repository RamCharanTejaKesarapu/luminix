"""JWT token creation and verification."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt

ALGORITHM = "HS256"
DEFAULT_EXPIRE_HOURS = 72


import logging
import secrets

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
    except JWTError:
        return None
