"""Authentication API routes for Luminix."""

from __future__ import annotations

import secrets
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from auth.jwt_utils import create_access_token, decode_access_token
from auth.oauth import (
    exchange_github_code,
    exchange_google_code,
    github_configured,
    github_login_url,
    google_configured,
    google_login_url,
    mock_oauth_user,
    oauth_success_redirect,
)
from auth.passwords import hash_password, verify_password
from database.db import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_provider,
    user_to_dict,
)

router = APIRouter(prefix="/v1/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)

_oauth_states: Dict[str, str] = {}


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


def _issue_token(user) -> AuthResponse:
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return AuthResponse(access_token=token, user=user_to_dict(user))


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user_to_dict(user)


def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[Dict[str, Any]]:
    if not creds or not creds.credentials:
        return None
    payload = decode_access_token(creds.credentials)
    if not payload or "sub" not in payload:
        return None
    user = get_user_by_id(int(payload["sub"]))
    return user_to_dict(user) if user else None


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest) -> AuthResponse:
    email = req.email.lower()
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = create_user(
        email=email,
        name=req.name,
        password_hash=hash_password(req.password),
        provider="email",
    )
    return _issue_token(user)


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest) -> AuthResponse:
    user = get_user_by_email(req.email.lower())
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _issue_token(user)


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return {"user": user}


@router.post("/logout")
def logout() -> Dict[str, str]:
    return {"status": "ok", "message": "Logged out — remove token on client"}


@router.get("/google/login")
def google_login() -> RedirectResponse:
    if not google_configured():
        user_info = mock_oauth_user("google")
        user = _get_or_create_oauth_user(user_info)
        token = create_access_token({"sub": str(user.id), "email": user.email})
        return RedirectResponse(oauth_success_redirect(token))
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = "google"
    return RedirectResponse(google_login_url(state))


@router.get("/google/callback")
async def google_callback(code: str = "", state: str = "", error: str = "") -> RedirectResponse:
    if error:
        raise HTTPException(status_code=400, detail=f"Google OAuth error: {error}")
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    _oauth_states.pop(state, None)
    user_info, err = await exchange_google_code(code)
    if not user_info:
        raise HTTPException(status_code=502, detail=err or "Google authentication failed")
    user = _get_or_create_oauth_user(user_info)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return RedirectResponse(oauth_success_redirect(token))


@router.get("/github/login")
def github_login() -> RedirectResponse:
    if not github_configured():
        user_info = mock_oauth_user("github")
        user = _get_or_create_oauth_user(user_info)
        token = create_access_token({"sub": str(user.id), "email": user.email})
        return RedirectResponse(oauth_success_redirect(token))
    state = secrets.token_urlsafe(16)
    _oauth_states[state] = "github"
    return RedirectResponse(github_login_url(state))


@router.get("/github/callback")
async def github_callback(code: str = "", state: str = "", error: str = "") -> RedirectResponse:
    if error:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {error}")
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    _oauth_states.pop(state, None)
    user_info, err = await exchange_github_code(code)
    if not user_info:
        raise HTTPException(status_code=502, detail=err or "GitHub authentication failed")
    user = _get_or_create_oauth_user(user_info)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return RedirectResponse(oauth_success_redirect(token))


@router.post("/google")
def google_dev_login() -> AuthResponse:
    """Dev/mock Google login when OAuth credentials are not configured."""
    if google_configured():
        raise HTTPException(status_code=400, detail="Use GET /v1/auth/google/login for real OAuth")
    user = _get_or_create_oauth_user(mock_oauth_user("google"))
    return _issue_token(user)


@router.post("/github")
def github_dev_login() -> AuthResponse:
    """Dev/mock GitHub login when OAuth credentials are not configured."""
    if github_configured():
        raise HTTPException(status_code=400, detail="Use GET /v1/auth/github/login for real OAuth")
    user = _get_or_create_oauth_user(mock_oauth_user("github"))
    return _issue_token(user)


def _get_or_create_oauth_user(info: Dict[str, Any]):
    provider = info["provider"]
    provider_id = info["provider_id"]
    existing = get_user_by_provider(provider, provider_id)
    if existing:
        return existing
    email_user = get_user_by_email(info["email"])
    if email_user:
        return email_user
    return create_user(
        email=info["email"],
        name=info.get("name"),
        provider=provider,
        provider_id=provider_id,
        avatar_url=info.get("avatar_url"),
    )
