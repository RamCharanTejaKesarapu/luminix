"""Cryptographic password hashing and verification using Argon2id with bcrypt backward compatibility."""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger("luminix.passwords")

try:
    import argon2
    _hasher: Optional[argon2.PasswordHasher] = argon2.PasswordHasher(
        time_cost=3,
        memory_cost=65536,  # 64 MB
        parallelism=4,
        hash_len=32,
        salt_len=16,
    )
except ImportError:
    _hasher = None

import bcrypt


def hash_password(password: str) -> str:
    """Hashes a password using Argon2id (memory/time hard) with unique cryptographic salt."""
    if _hasher is not None:
        try:
            return _hasher.hash(password)
        except Exception as exc:
            logger.warning(f"Argon2 hashing error, falling back to bcrypt: {exc}")

    # Fallback to bcrypt with cost factor 12
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verifies a password against Argon2id or legacy bcrypt hashes using constant-time comparison."""
    if not password or not hashed:
        return False

    # 1. Check for Argon2 hash ($argon2id$, $argon2i$, $argon2d$)
    if hashed.startswith("$argon2"):
        if _hasher is not None:
            try:
                return _hasher.verify(hashed, password)
            except (argon2.exceptions.VerifyMismatchError, argon2.exceptions.VerificationError):
                return False
            except Exception:
                return False
        return False

    # 2. Check for Bcrypt hash ($2a$, $2b$, $2y$)
    if hashed.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except (ValueError, TypeError):
            return False

    return False


def needs_rehash(hashed: str) -> bool:
    """Checks if a password hash should be upgraded to modern Argon2id parameters."""
    if not hashed:
        return True
    if hashed.startswith(("$2a$", "$2b$", "$2y$")):
        return True
    if _hasher is not None and hashed.startswith("$argon2"):
        return _hasher.check_needs_rehash(hashed)
    return False
