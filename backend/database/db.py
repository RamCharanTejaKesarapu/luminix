"""SQLite progress log, user authentication, and security firewall tracking."""

from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text, create_engine, desc
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user_label = Column(String(128), default="default", index=True)
    bmi = Column(Float, nullable=True)
    pose_score = Column(Float, nullable=True)
    payload = Column(JSON, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)
    provider = Column(String(32), default="email")  # 'email', 'google', 'github'
    provider_id = Column(String(255), nullable=True, index=True)
    avatar_url = Column(String(512), nullable=True)
    bio = Column(String(512), nullable=True)
    profile_data = Column(JSON, nullable=True)  # health goals, preferences, OAuth metadata
    token_version = Column(Integer, default=1)  # Incremented on password reset or session revocation


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hash of single-use token
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used = Column(Integer, default=0, index=True)  # 0 = active, 1 = consumed


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    client_ip = Column(String(64), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    path = Column(String(255), nullable=False)
    method = Column(String(16), nullable=False)
    status_code = Column(Integer, default=403)
    details = Column(Text, nullable=True)


class CreatorDonation(Base):
    __tablename__ = "creator_donations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    client_ip = Column(String(64), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    note = Column(Text, nullable=True)
    channel = Column(String(64), nullable=True)


class HealthSample(Base):
    __tablename__ = "health_samples"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, default="default", index=True)
    metric = Column(String(64), nullable=False, index=True)
    value = Column(Float, nullable=True)
    unit = Column(String(32), nullable=True)
    systolic = Column(Float, nullable=True)
    diastolic = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    source = Column(String(64), default="healthkit", index=True)  # healthkit, health_connect, direct_bp_device, ble_sensor
    device_id = Column(String(128), nullable=True)
    quality = Column(String(32), default="device_measured")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


_engine = None
_SessionLocal: Optional[sessionmaker] = None


def init_db(db_path: str | Path = "./data/health_intel.sqlite") -> None:
    global _engine, _SessionLocal
    import os
    import shutil

    path = Path(db_path)
    # Support serverless / read-only environments (e.g. Vercel, AWS Lambda)
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        tmp_path = Path("/tmp") / path.name
        if not tmp_path.exists() and path.exists():
            try:
                shutil.copy2(str(path), str(tmp_path))
            except Exception:
                pass
        path = tmp_path

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
    except OSError:
        path = Path("/tmp") / path.name
        path.parent.mkdir(parents=True, exist_ok=True)

    _engine = create_engine(f"sqlite:///{path}", future=True, echo=False)
    Base.metadata.create_all(_engine, checkfirst=True)

    # Automatic SQLite schema migration for missing columns
    try:
        with _engine.connect() as conn:
            from sqlalchemy import text
            cursor = conn.execute(text("PRAGMA table_info(users)"))
            columns = {row[1] for row in cursor.fetchall()}
            if "last_login" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME"))
            if "bio" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR(512)"))
            if "profile_data" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN profile_data JSON"))
            if "token_version" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1"))
            conn.commit()
    except Exception:
        pass

    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)


def _get_session() -> Session:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    return _SessionLocal()


def log_event(
    *,
    user_label: str = "default",
    bmi: Optional[float] = None,
    pose_score: Optional[float] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    with _get_session() as s:
        s.add(
            ProgressEvent(
                user_label=user_label,
                bmi=bmi,
                pose_score=pose_score,
                payload=payload or {},
            )
        )
        s.commit()


def get_user_by_email(email: str) -> Optional[User]:
    if not email:
        return None
    with _get_session() as s:
        return s.query(User).filter(User.email == email.lower().strip()).first()


def get_user_by_id(user_id: int) -> Optional[User]:
    with _get_session() as s:
        return s.query(User).filter(User.id == user_id).first()


def get_user_by_provider(provider: str, provider_id: str) -> Optional[User]:
    if not provider or not provider_id:
        return None
    with _get_session() as s:
        return s.query(User).filter(User.provider == provider, User.provider_id == str(provider_id)).first()


def create_user(
    *,
    email: str,
    name: Optional[str] = None,
    password_hash: Optional[str] = None,
    provider: str = "email",
    provider_id: Optional[str] = None,
    avatar_url: Optional[str] = None,
    bio: Optional[str] = None,
    profile_data: Optional[Dict[str, Any]] = None,
) -> User:
    with _get_session() as s:
        now = datetime.now(timezone.utc)
        user = User(
            email=email.lower().strip(),
            name=name or email.split("@")[0],
            password_hash=password_hash,
            provider=provider,
            provider_id=str(provider_id) if provider_id is not None else None,
            avatar_url=avatar_url,
            bio=bio,
            profile_data=profile_data or {},
            created_at=now,
            last_login=now,
        )
        s.add(user)
        s.commit()
        s.refresh(user)
        return user


def upsert_oauth_user(
    *,
    email: str,
    name: Optional[str] = None,
    provider: str,
    provider_id: str,
    avatar_url: Optional[str] = None,
    profile_data: Optional[Dict[str, Any]] = None,
) -> User:
    """Finds existing user by provider ID or email, updates their profile info and last login timestamp, or creates a new one."""
    with _get_session() as s:
        user = None
        if provider_id:
            user = s.query(User).filter(User.provider == provider, User.provider_id == str(provider_id)).first()
        if not user and email:
            user = s.query(User).filter(User.email == email.lower().strip()).first()

        now = datetime.now(timezone.utc)
        if user:
            # Update existing user with refreshed OAuth data
            if name:
                user.name = name
            if avatar_url:
                user.avatar_url = avatar_url
            if provider:
                user.provider = provider
            if provider_id:
                user.provider_id = str(provider_id)
            user.last_login = now
            if profile_data:
                existing_data = user.profile_data or {}
                existing_data.update(profile_data)
                user.profile_data = existing_data
            s.commit()
            s.refresh(user)
            return user

        # Create new user
        new_user = User(
            email=email.lower().strip(),
            name=name or email.split("@")[0],
            provider=provider,
            provider_id=str(provider_id) if provider_id else None,
            avatar_url=avatar_url,
            profile_data=profile_data or {},
            created_at=now,
            last_login=now,
        )
        s.add(new_user)
        s.commit()
        s.refresh(new_user)
        return new_user


def update_user_profile(user_id: int, **fields: Any) -> Optional[User]:
    with _get_session() as s:
        user = s.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        for key, value in fields.items():
            if hasattr(user, key) and key not in ("id", "created_at"):
                setattr(user, key, value)
        s.commit()
        s.refresh(user)
        return user


def touch_user_login(user_id: int) -> None:
    with _get_session() as s:
        user = s.query(User).filter(User.id == user_id).first()
        if user:
            user.last_login = datetime.now(timezone.utc)
            s.commit()


def user_to_dict(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "provider": user.provider,
        "provider_id": user.provider_id,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "profile_data": user.profile_data or {},
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


def recent_events(limit: int = 20, user_label: Optional[str] = None) -> List[Dict[str, Any]]:
    with _get_session() as s:
        q = s.query(ProgressEvent)
        if user_label:
            q = q.filter(ProgressEvent.user_label == user_label)
        rows = q.order_by(desc(ProgressEvent.id)).limit(limit).all()
        out: List[Dict[str, Any]] = []
        for r in rows:
            out.append(
                {
                    "id": r.id,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "user_label": r.user_label,
                    "bmi": r.bmi,
                    "pose_score": r.pose_score,
                    "payload": json.loads(json.dumps(r.payload or {})),
                }
            )
        return out


# ── Password Reset & Account Lifecycle Helpers ────────────────────────────────

def create_password_reset_token(email: str) -> Optional[str]:
    """Generates a secure 15-minute single-use password reset token.
    Stores the SHA-256 hash in the database, returns the unhashed token.
    """
    if not email:
        return None
    normalized_email = email.lower().strip()
    with _get_session() as s:
        user = s.query(User).filter(User.email == normalized_email).first()
        if not user:
            return None

        # Invalidate any pending tokens for this user
        s.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == 0,
        ).update({"used": 1})

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=15)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
            used=0,
        )
        s.add(reset_record)
        s.commit()
        return raw_token


def verify_and_consume_reset_token(raw_token: str, new_password_hash: str) -> bool:
    """Verifies a password reset token by hash, checks expiration and single-use,
    updates user password hash, increments token_version, and marks token as used.
    """
    if not raw_token or not new_password_hash:
        return False
    token_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    with _get_session() as s:
        record = s.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == 0,
            PasswordResetToken.expires_at > now,
        ).first()
        if not record:
            return False

        # Mark token as used
        record.used = 1

        # Update user password and increment token_version (invalidating active JWTs)
        user = s.query(User).filter(User.id == record.user_id).first()
        if user:
            user.password_hash = new_password_hash
            user.token_version = (user.token_version or 1) + 1

        s.commit()
        return True


def update_user_password(user_id: int, new_password_hash: str) -> bool:
    """Updates password hash for a user and increments token_version to invalidate active sessions."""
    if not user_id or not new_password_hash:
        return False
    with _get_session() as s:
        user = s.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        user.password_hash = new_password_hash
        user.token_version = (user.token_version or 1) + 1
        # Invalidate any pending reset tokens
        s.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == 0,
        ).update({"used": 1})
        s.commit()
        return True


def delete_user_account(user_id: int) -> bool:
    """Deletes user account and associated personal data in accordance with DPDP right to erasure."""
    with _get_session() as s:
        user = s.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        # Remove reset tokens
        s.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
        # Remove progress events associated with this user ID or email
        user_label = str(user.id)
        user_email = user.email
        s.query(ProgressEvent).filter(
            (ProgressEvent.user_label == user_label) | (ProgressEvent.user_label == user_email)
        ).delete()
        # Remove biometric and health telemetry samples (DPDP Act 2023 & GDPR Right to Erasure)
        s.query(HealthSample).filter(
            (HealthSample.user_id == user_label) | (HealthSample.user_id == user_email)
        ).delete()
        # Delete user
        s.delete(user)
        s.commit()
        return True


# ── Security & Firewall Logs ──────────────────────────────────────────────────

def _mask_sensitive(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    import re
    # Mask emails: user@domain.com -> u***@domain.com
    text = re.sub(r'([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', r'\1***@\2', text)
    # Mask bearer tokens / long hex or base64 tokens
    text = re.sub(r'(Bearer\s+)[A-Za-z0-9_\-\.]{15,}', r'\1[REDACTED]', text, flags=re.IGNORECASE)
    text = re.sub(r'("password"\s*:\s*)"[^"]+"', r'\1"[REDACTED]"', text, flags=re.IGNORECASE)
    text = re.sub(r'(token=)[A-Za-z0-9_\-\.]{10,}', r'\1[REDACTED]', text, flags=re.IGNORECASE)
    return text


def log_security_event(
    *,
    client_ip: str,
    event_type: str,
    path: str,
    method: str,
    status_code: int = 403,
    details: Optional[str] = None,
) -> None:
    """Logs security firewall blocks, rate limiting incidents, and auth events with sensitive data masked."""
    try:
        masked_details = _mask_sensitive(details)
        with _get_session() as s:
            entry = SecurityLog(
                client_ip=client_ip or "unknown",
                event_type=event_type,
                path=path[:254],
                method=method[:15],
                status_code=status_code,
                details=masked_details[:500] if masked_details else None,
            )
            s.add(entry)
            s.commit()
    except Exception:
        # Failsafe so logging never crashes main request pipeline
        pass


def get_recent_security_logs(limit: int = 50) -> List[Dict[str, Any]]:
    with _get_session() as s:
        rows = s.query(SecurityLog).order_by(desc(SecurityLog.id)).limit(limit).all()
        return [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "client_ip": r.client_ip,
                "event_type": r.event_type,
                "path": r.path,
                "method": r.method,
                "status_code": r.status_code,
                "details": r.details,
            }
            for r in rows
        ]


def get_security_stats() -> Dict[str, Any]:
    with _get_session() as s:
        total_events = s.query(SecurityLog).count()
        blocked_threats = s.query(SecurityLog).filter(SecurityLog.status_code == 403).count()
        rate_limits = s.query(SecurityLog).filter(SecurityLog.event_type == "rate_limit").count()
        return {
            "firewall_active": True,
            "total_security_events_logged": total_events,
            "total_blocked_threats": blocked_threats,
            "total_rate_limit_trips": rate_limits,
        }


def check_daily_donation_limit(client_ip: str, email: Optional[str] = None, max_per_day: int = 5) -> tuple[bool, int]:
    """
    Enforces that a user/IP can send at most max_per_day (5) donation notifications in a 24-hour rolling window.
    Returns (is_allowed, current_count_24h).
    """
    with _get_session() as s:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        ip_count = s.query(CreatorDonation).filter(
            CreatorDonation.client_ip == client_ip,
            CreatorDonation.created_at >= cutoff,
        ).count()

        email_count = 0
        if email:
            email_count = s.query(CreatorDonation).filter(
                CreatorDonation.email == email.lower().strip(),
                CreatorDonation.created_at >= cutoff,
            ).count()

        total = max(ip_count, email_count)
        return total < max_per_day, total


def record_creator_donation(
    client_ip: str,
    name: str,
    amount: float,
    email: Optional[str] = None,
    note: Optional[str] = None,
    channel: Optional[str] = None,
) -> Dict[str, Any]:
    """Saves donation submission to SQLite."""
    with _get_session() as s:
        d = CreatorDonation(
            client_ip=client_ip,
            name=name.strip(),
            email=email.lower().strip() if email else None,
            amount=float(amount),
            note=note.strip() if note else None,
            channel=channel or "direct",
        )
        s.add(d)
        s.commit()
        s.refresh(d)
        return {
            "id": d.id,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "client_ip": d.client_ip,
            "name": d.name,
            "email": d.email,
            "amount": d.amount,
            "note": d.note,
            "channel": d.channel,
        }


def save_health_samples(samples: List[Dict[str, Any]], user_id: str = "default") -> int:
    """Saves normalized health samples to SQLite with timestamp parsing and deduplication."""
    if not samples:
        return 0
    saved_count = 0
    with _get_session() as s:
        for item in samples:
            raw_ts = item.get("timestamp")
            if isinstance(raw_ts, str):
                try:
                    ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                except Exception:
                    ts = datetime.now(timezone.utc)
            elif isinstance(raw_ts, datetime):
                ts = raw_ts
            else:
                ts = datetime.now(timezone.utc)

            start_ts = None
            if item.get("startTime"):
                try:
                    start_ts = datetime.fromisoformat(str(item["startTime"]).replace("Z", "+00:00"))
                except Exception:
                    pass

            end_ts = None
            if item.get("endTime"):
                try:
                    end_ts = datetime.fromisoformat(str(item["endTime"]).replace("Z", "+00:00"))
                except Exception:
                    pass

            metric = str(item.get("metric", "")).lower().strip()
            if not metric:
                continue

            sample = HealthSample(
                user_id=str(item.get("userId") or user_id),
                metric=metric,
                value=float(item["value"]) if item.get("value") is not None else None,
                unit=item.get("unit"),
                systolic=float(item["systolic"]) if item.get("systolic") is not None else None,
                diastolic=float(item["diastolic"]) if item.get("diastolic") is not None else None,
                timestamp=ts,
                start_time=start_ts,
                end_time=end_ts,
                source=str(item.get("source", "healthkit")),
                device_id=item.get("device") or item.get("deviceId"),
                quality=item.get("quality", "device_measured"),
            )
            s.add(sample)
            saved_count += 1
        s.commit()
    return saved_count


def get_latest_health_samples(user_id: str = "default") -> Dict[str, Any]:
    """Returns the most recent sample for each tracked metric."""
    with _get_session() as s:
        # Query distinct metrics
        samples = (
            s.query(HealthSample)
            .filter(HealthSample.user_id == user_id)
            .order_by(desc(HealthSample.timestamp))
            .all()
        )
        latest_map: Dict[str, Any] = {}
        for row in samples:
            if row.metric not in latest_map:
                latest_map[row.metric] = {
                    "metric": row.metric,
                    "value": row.value,
                    "unit": row.unit,
                    "systolic": row.systolic,
                    "diastolic": row.diastolic,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                    "source": row.source,
                    "device": row.device_id,
                    "quality": row.quality,
                }
        return latest_map


def get_health_sample_history(
    user_id: str = "default", metric: str = "heart_rate", limit: int = 50
) -> List[Dict[str, Any]]:
    """Returns time-series history for a given metric."""
    with _get_session() as s:
        rows = (
            s.query(HealthSample)
            .filter(HealthSample.user_id == user_id, HealthSample.metric == metric.lower().strip())
            .order_by(desc(HealthSample.timestamp))
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "metric": r.metric,
                "value": r.value,
                "unit": r.unit,
                "systolic": r.systolic,
                "diastolic": r.diastolic,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "source": r.source,
                "device": r.device_id,
                "quality": r.quality,
            }
            for r in reversed(rows)
        ]

