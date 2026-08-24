"""SQLite progress log (bonus tracking)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user_label = Column(String(128), default="default")
    bmi = Column(Float, nullable=True)
    pose_score = Column(Float, nullable=True)
    payload = Column(JSON, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)
    provider = Column(String(32), default="email")
    provider_id = Column(String(255), nullable=True)
    avatar_url = Column(String(512), nullable=True)


_engine = None
_SessionLocal: Optional[sessionmaker] = None


def init_db(db_path: str | Path = "./data/health_intel.sqlite") -> None:
    global _engine, _SessionLocal
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    _engine = create_engine(f"sqlite:///{path}", future=True)
    Base.metadata.create_all(_engine, checkfirst=True)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)


def log_event(
    *,
    user_label: str = "default",
    bmi: Optional[float] = None,
    pose_score: Optional[float] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
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
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
        return s.query(User).filter(User.email == email.lower()).first()


def get_user_by_id(user_id: int) -> Optional[User]:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
        return s.query(User).filter(User.id == user_id).first()


def get_user_by_provider(provider: str, provider_id: str) -> Optional[User]:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
        return s.query(User).filter(User.provider == provider, User.provider_id == provider_id).first()


def create_user(
    *,
    email: str,
    name: Optional[str] = None,
    password_hash: Optional[str] = None,
    provider: str = "email",
    provider_id: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> User:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
        user = User(
            email=email.lower(),
            name=name or email.split("@")[0],
            password_hash=password_hash,
            provider=provider,
            provider_id=provider_id,
            avatar_url=avatar_url,
        )
        s.add(user)
        s.commit()
        s.refresh(user)
        return user


def user_to_dict(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "provider": user.provider,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def recent_events(limit: int = 20) -> List[Dict[str, Any]]:
    if _SessionLocal is None:
        init_db()
    assert _SessionLocal is not None
    with _SessionLocal() as s:
        rows = s.query(ProgressEvent).order_by(ProgressEvent.id.desc()).limit(limit).all()
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
