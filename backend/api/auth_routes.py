"""Authentication and Security API routes for Luminix.

Includes:
- Email / Password Registration & Sign-in
- Google OAuth 2.0 Flow with database sync
- GitHub OAuth 2.0 Flow with database sync
- User profile retrieval and persistence
- Security Firewall metrics and audit inspection
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from auth.firewall import firewall
from auth.jwt_utils import create_access_token, decode_access_token
from auth.oauth import (
    create_oauth_state,
    exchange_github_code,
    exchange_google_code,
    github_configured,
    github_login_url,
    google_configured,
    google_login_url,
    mock_oauth_user,
    oauth_success_redirect,
    verify_oauth_state,
)
from auth.passwords import hash_password, verify_password
from database.db import (
    create_password_reset_token,
    create_user,
    delete_user_account,
    get_recent_security_logs,
    get_security_stats,
    get_user_by_email,
    get_user_by_id,
    log_security_event,
    touch_user_login,
    update_user_password,
    update_user_profile,
    upsert_oauth_user,
    user_to_dict,
    verify_and_consume_reset_token,
)

router = APIRouter(prefix="/v1/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


import html
import re

def _sanitize_text(val: Optional[str], max_len: int = 255) -> Optional[str]:
    if val is None:
        return None
    val = val.strip()
    # Strip HTML tags
    val = re.sub(r"<[^>]*>", "", val)
    # Remove null bytes & non-printable control characters
    val = "".join(ch for ch in val if ch >= " " or ch in "\n\t")
    return val[:max_len]


# ── Pydantic Request/Response Models ──────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=100)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = Field(None, min_length=1, max_length=128)
    old_password: Optional[str] = Field(None, min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="before")
    @classmethod
    def reconcile_passwords(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if not values.get("current_password") and values.get("old_password"):
                values["current_password"] = values["old_password"]
            elif values.get("current_password") and not values.get("old_password"):
                values["old_password"] = values["current_password"]
        return values


class DeleteAccountRequest(BaseModel):
    password: Optional[str] = Field(None, max_length=128)
    confirmation: str = Field(..., max_length=50)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=2000)
    profile_data: Optional[Dict[str, Any]] = None

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 100)

    @field_validator("bio")
    @classmethod
    def sanitize_bio(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 500)

    @field_validator("avatar_url")
    @classmethod
    def sanitize_avatar(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://") or v.startswith("data:image/")):
            raise ValueError("Avatar URL must begin with http://, https://, or data:image/")
        return v


class OAuthSyncRequest(BaseModel):
    provider: str = Field(max_length=50)
    provider_id: str = Field(max_length=128)
    email: EmailStr
    name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=2000)
    profile_data: Optional[Dict[str, Any]] = None
    id_token: Optional[str] = Field(None, max_length=4096)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        return _sanitize_text(v, 100)

    @field_validator("provider")
    @classmethod
    def sanitize_provider(cls, v: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_\-]", "", v.strip().lower())


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


def _issue_token(user, response: Optional[Response] = None) -> AuthResponse:
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "token_version": getattr(user, "token_version", 1) or 1,
    })
    if response:
        is_secure = os.getenv("ENVIRONMENT", "production").lower() != "development" and os.getenv("TESTING") != "1"
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=72 * 3600,
            path="/",
        )
    return AuthResponse(access_token=token, user=user_to_dict(user))


# ── Current User Dependency ───────────────────────────────────────────────────

def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    elif request and request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid session identifier")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User account not found")

    if "token_version" in payload:
        current_version = getattr(user, "token_version", 1) or 1
        if payload["token_version"] != current_version:
            raise HTTPException(status_code=401, detail="Session has been revoked or expired. Please sign in again.")

    return user_to_dict(user)


def get_optional_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[Dict[str, Any]]:
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    elif request and request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None
    user = get_user_by_id(user_id)
    if not user:
        return None
    if "token_version" in payload:
        current_version = getattr(user, "token_version", 1) or 1
        if payload["token_version"] != current_version:
            return None
    return user_to_dict(user)


# ── Standard Auth Endpoints ───────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, request: Request, response: Response) -> AuthResponse:
    email = req.email.lower().strip()
    client_ip = request.client.host if request.client else "127.0.0.1"
    if get_user_by_email(email):
        log_security_event(
            client_ip=client_ip,
            event_type="auth_register_conflict",
            path="/v1/auth/register",
            method="POST",
            status_code=status.HTTP_409_CONFLICT,
            details=f"Registration attempt for existing account: {email}",
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration could not be completed with the provided details. Please try signing in or use another email.",
        )
    user = create_user(
        email=email,
        name=req.name or email.split("@")[0],
        password_hash=hash_password(req.password),
        provider="email",
    )
    log_security_event(
        client_ip=client_ip,
        event_type="auth_register",
        path="/v1/auth/register",
        method="POST",
        status_code=200,
        details=f"New user registered: {email}",
    )
    return _issue_token(user, response)


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, request: Request, response: Response) -> AuthResponse:
    email = req.email.lower().strip()
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Identifier/Account throttling check (prevents brute-force / credential stuffing)
    is_throttled, retry_after = firewall.check_account_throttle(email)
    if is_throttled:
        log_security_event(
            client_ip=client_ip,
            event_type="account_throttled",
            path="/v1/auth/login",
            method="POST",
            status_code=429,
            details=f"Account throttle triggered for {email}. Retry after {retry_after}s",
        )
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts for this account. Please wait {retry_after} seconds before trying again.",
            headers={"Retry-After": str(retry_after)},
        )

    user = get_user_by_email(email)

    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        firewall.record_failed_auth(email)
        log_security_event(
            client_ip=client_ip,
            event_type="auth_failure",
            path="/v1/auth/login",
            method="POST",
            status_code=401,
            details=f"Failed login attempt for {email}",
        )
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    firewall.reset_failed_auth(email)
    touch_user_login(user.id)
    log_security_event(
        client_ip=client_ip,
        event_type="auth_success",
        path="/v1/auth/login",
        method="POST",
        status_code=200,
        details=f"User signed in: {email}",
    )
    return _issue_token(user, response)


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request) -> Dict[str, Any]:
    email = req.email.lower().strip()
    client_ip = request.client.host if request.client else "127.0.0.1"
    create_password_reset_token(email)
    log_security_event(
        client_ip=client_ip,
        event_type="auth_password_reset_request",
        path="/v1/auth/forgot-password",
        method="POST",
        status_code=200,
        details=f"Password recovery requested for {email}",
    )
    return {
        "status": "ok",
        "message": "If that email is registered, you'll receive a reset link shortly.",
    }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request) -> Dict[str, Any]:
    client_ip = request.client.host if request.client else "127.0.0.1"
    new_pw_hash = hash_password(req.new_password)
    success = verify_and_consume_reset_token(req.token, new_pw_hash)
    if not success:
        log_security_event(
            client_ip=client_ip,
            event_type="auth_password_reset_failed",
            path="/v1/auth/reset-password",
            method="POST",
            status_code=400,
            details="Password reset attempt with invalid or expired token",
        )
        raise HTTPException(
            status_code=400,
            detail="Invalid, expired, or previously used password reset token. Please request a new link.",
        )

    log_security_event(
        client_ip=client_ip,
        event_type="auth_password_reset_success",
        path="/v1/auth/reset-password",
        method="POST",
        status_code=200,
        details="Password reset successfully completed",
    )
    return {
        "status": "ok",
        "message": "Password has been successfully updated. Please sign in with your new password.",
    }


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_id = current_user["id"]
    user = get_user_by_id(user_id)
    if not user or not user.password_hash or not verify_password(req.current_password, user.password_hash):
        log_security_event(
            client_ip=client_ip,
            event_type="auth_password_change_failed",
            path="/v1/auth/change-password",
            method="POST",
            status_code=401,
            details=f"Password change rejected for user ID {user_id}: incorrect current password",
        )
        raise HTTPException(status_code=401, detail="Incorrect current password.")

    new_pw_hash = hash_password(req.new_password)
    update_user_password(user_id, new_pw_hash)
    log_security_event(
        client_ip=client_ip,
        event_type="auth_password_change_success",
        path="/v1/auth/change-password",
        method="POST",
        status_code=200,
        details=f"Password updated and sessions revoked for user ID {user_id}",
    )
    return {
        "status": "ok",
        "message": "Password updated successfully. Active sessions have been invalidated.",
    }


@router.delete("/delete-account")
def delete_account(
    req: DeleteAccountRequest,
    request: Request,
    response: Response,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    client_ip = request.client.host if request.client else "127.0.0.1"
    if req.confirmation.strip().upper() not in ("DELETE", "DELETE MY ACCOUNT"):
        raise HTTPException(status_code=400, detail="Confirmation keyword 'DELETE' or 'DELETE MY ACCOUNT' is required.")

    user_id = current_user["id"]
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    if user.provider == "email":
        if not req.password or not user.password_hash or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Password verification failed for account deletion.")

    delete_user_account(user_id)
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    log_security_event(
        client_ip=client_ip,
        event_type="account_deleted",
        path="/v1/auth/delete-account",
        method="DELETE",
        status_code=200,
        details=f"Account and personal telemetry purged for user ID {user_id}",
    )
    return {
        "status": "erased",
        "message": "Account and associated personal data successfully deleted.",
    }


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Retrieve full authenticated user information stored in the database."""
    return {"user": user}


@router.put("/profile")
def update_profile(
    req: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update user biometric, preference, or account details in the database."""
    user_id = current_user["id"]
    fields_to_update = {k: v for k, v in req.model_dump().items() if v is not None}
    updated = update_user_profile(user_id, **fields_to_update)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "user": user_to_dict(updated)}


@router.post("/logout")
def logout(response: Response) -> Dict[str, str]:
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    return {"status": "ok", "message": "Successfully signed out"}


# ── Google OAuth Endpoints ────────────────────────────────────────────────────

@router.get("/google/login")
def google_login() -> RedirectResponse:
    """Initiates Google OAuth 2.0 authorization."""
    if not google_configured():
        raise HTTPException(
            status_code=400,
            detail="Google OAuth credentials not configured in environment. Please configure GOOGLE_CLIENT_ID or use Firebase Google Sign-In."
        )

    state = create_oauth_state("google")
    return RedirectResponse(google_login_url(state))


@router.get("/google/callback")
async def google_callback(
    code: str = "",
    state: str = "",
    error: str = "",
    request: Request = None,
) -> RedirectResponse:
    """Handles Google OAuth callback, verifies state, exchanges token, saves user in DB, and issues JWT."""
    if error:
        raise HTTPException(status_code=400, detail=f"Google OAuth authorization denied: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from Google")

    # State validation
    if google_configured() and not verify_oauth_state(state, "google"):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state parameter (CSRF protection)")

    user_info, err = await exchange_google_code(code)
    if not user_info:
        raise HTTPException(status_code=502, detail=err or "Google authentication failed")

    # Persist / Sync user in SQLite Database
    user = upsert_oauth_user(
        email=user_info["email"],
        name=user_info.get("name"),
        provider=user_info["provider"],
        provider_id=user_info["provider_id"],
        avatar_url=user_info.get("avatar_url"),
        profile_data=user_info.get("profile_data"),
    )

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    log_security_event(
        client_ip=client_ip,
        event_type="oauth_google_success",
        path="/v1/auth/google/callback",
        method="GET",
        status_code=200,
        details=f"Google sign-in completed for {user.email}",
    )

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "token_version": getattr(user, "token_version", 1) or 1,
    })
    resp = RedirectResponse(oauth_success_redirect(token))
    is_secure = os.getenv("ENVIRONMENT", "production").lower() != "development" and os.getenv("TESTING") != "1"
    resp.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=72 * 3600,
        path="/",
    )
    return resp


# ── GitHub OAuth Endpoints ────────────────────────────────────────────────────

@router.get("/github/login")
def github_login() -> RedirectResponse:
    """Initiates GitHub OAuth 2.0 authorization."""
    if not github_configured():
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth credentials not configured in environment. Please configure GITHUB_CLIENT_ID or use Firebase GitHub Sign-In."
        )

    state = create_oauth_state("github")
    return RedirectResponse(github_login_url(state))


@router.get("/github/callback")
async def github_callback(
    code: str = "",
    state: str = "",
    error: str = "",
    request: Request = None,
) -> RedirectResponse:
    """Handles GitHub OAuth callback, verifies state, exchanges token, saves user in DB, and issues JWT."""
    if error:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth authorization denied: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code from GitHub")

    # State validation
    if github_configured() and not verify_oauth_state(state, "github"):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state parameter (CSRF protection)")

    user_info, err = await exchange_github_code(code)
    if not user_info:
        raise HTTPException(status_code=502, detail=err or "GitHub authentication failed")

    # Persist / Sync user in SQLite Database
    user = upsert_oauth_user(
        email=user_info["email"],
        name=user_info.get("name"),
        provider=user_info["provider"],
        provider_id=user_info["provider_id"],
        avatar_url=user_info.get("avatar_url"),
        profile_data=user_info.get("profile_data"),
    )

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    log_security_event(
        client_ip=client_ip,
        event_type="oauth_github_success",
        path="/v1/auth/github/callback",
        method="GET",
        status_code=200,
        details=f"GitHub sign-in completed for {user.email}",
    )

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "token_version": getattr(user, "token_version", 1) or 1,
    })
    resp = RedirectResponse(oauth_success_redirect(token))
    is_secure = os.getenv("ENVIRONMENT", "production").lower() != "development" and os.getenv("TESTING") != "1"
    resp.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=72 * 3600,
        path="/",
    )
    return resp


# ── Real OAuth Account Synchronization & Persistence ─────────────────────────

@router.post("/oauth-sync")
def oauth_sync(req: OAuthSyncRequest, request: Request, response: Response) -> AuthResponse:
    """Synchronizes real OAuth user (from Google or GitHub) into SQLite and Cloud Firestore."""
    user = upsert_oauth_user(
        email=req.email.lower(),
        name=req.name or req.email.split("@")[0],
        provider=req.provider,
        provider_id=req.provider_id,
        avatar_url=req.avatar_url,
        profile_data=req.profile_data or {},
    )

    # Persist in Cloud Firestore if Firebase Admin is connected
    from database.firebase_admin_service import save_user_profile_to_firestore, is_firebase_ready
    if is_firebase_ready():
        try:
            save_user_profile_to_firestore(
                str(user.id),
                {
                    "uid": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "provider": user.provider,
                    "provider_id": user.provider_id,
                    "avatar_url": user.avatar_url,
                    "profile_data": user.profile_data,
                    "oauth_synced": True,
                }
            )
        except Exception:
            pass

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    log_security_event(
        client_ip=client_ip,
        event_type=f"oauth_{req.provider}_sync_success",
        path="/v1/auth/oauth-sync",
        method="POST",
        status_code=200,
        details=f"Real {req.provider.title()} user synchronized: {user.email}",
    )

    return _issue_token(user, response)


# ── Security Firewall Monitoring Endpoints ────────────────────────────────────

@router.get("/firewall/status")
def firewall_status() -> Dict[str, Any]:
    """Returns real-time security firewall metrics and active protection layers."""
    stats = firewall.get_stats()
    db_stats = get_security_stats()
    stats.update(db_stats)
    stats["google_oauth_configured"] = google_configured()
    stats["github_oauth_configured"] = github_configured()
    return stats


@router.get("/firewall/logs")
def firewall_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns recent security firewall logs and blocked threat events."""
    return get_recent_security_logs(limit=min(100, max(1, limit)))
