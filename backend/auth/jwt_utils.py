"""JWT token creation and verification."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt

ALGORITHM = "HS256"
DEFAULT_EXPIRE_HOURS = 72


def _secret() -> str:
    key = os.getenv("JWT_SECRET_KEY", "")
    if not key:
        key = "luminix-dev-secret-change-in-production"
    return key


def create_access_token(data: Dict[str, Any], expires_hours: Optional[int] = None) -> str:
    to_encode = data.copy()
    hours = expires_hours or int(os.getenv("JWT_EXPIRE_HOURS", str(DEFAULT_EXPIRE_HOURS)))
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except JWTError:
        return None
