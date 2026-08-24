"""Google and GitHub OAuth helpers with dev/mock fallback."""

from __future__ import annotations

import os
import secrets
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

import httpx

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAIL_URL = "https://api.github.com/user/emails"


def _frontend_base() -> str:
    return os.getenv("FRONTEND_URL", "http://127.0.0.1:8000").rstrip("/")


def _redirect_uri(provider: str) -> str:
    base = os.getenv("OAUTH_REDIRECT_BASE", "http://127.0.0.1:8000").rstrip("/")
    return f"{base}/v1/auth/{provider}/callback"


def google_configured() -> bool:
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def github_configured() -> bool:
    return bool(os.getenv("GITHUB_CLIENT_ID") and os.getenv("GITHUB_CLIENT_SECRET"))


def google_login_url(state: str) -> str:
    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "redirect_uri": _redirect_uri("google"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def github_login_url(state: str) -> str:
    params = {
        "client_id": os.getenv("GITHUB_CLIENT_ID", ""),
        "redirect_uri": _redirect_uri("github"),
        "scope": "user:email",
        "state": state,
    }
    return f"{GITHUB_AUTH_URL}?{urlencode(params)}"


def mock_oauth_user(provider: str) -> Dict[str, Any]:
    suffix = secrets.token_hex(4)
    return {
        "email": f"dev-{provider}-{suffix}@luminix.local",
        "name": f"Dev {provider.title()} User",
        "provider": provider,
        "provider_id": f"mock-{provider}-{suffix}",
        "avatar_url": None,
    }


async def exchange_google_code(code: str) -> Tuple[Optional[Dict[str, Any]], str]:
    if not google_configured():
        return mock_oauth_user("google"), ""

    payload = {
        "code": code,
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uri": _redirect_uri("google"),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data=payload)
        if token_res.status_code >= 400:
            return None, f"Google token exchange failed: {token_res.text}"
        access_token = token_res.json().get("access_token")
        if not access_token:
            return None, "Google did not return an access token"

        user_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code >= 400:
            return None, f"Google userinfo failed: {user_res.text}"
        data = user_res.json()
        return {
            "email": data.get("email") or f"google-{data.get('sub')}@unknown.local",
            "name": data.get("name") or data.get("email", "Google User"),
            "provider": "google",
            "provider_id": str(data.get("sub", "")),
            "avatar_url": data.get("picture"),
        }, ""


async def exchange_github_code(code: str) -> Tuple[Optional[Dict[str, Any]], str]:
    if not github_configured():
        return mock_oauth_user("github"), ""

    payload = {
        "client_id": os.getenv("GITHUB_CLIENT_ID", ""),
        "client_secret": os.getenv("GITHUB_CLIENT_SECRET", ""),
        "code": code,
        "redirect_uri": _redirect_uri("github"),
    }
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20) as client:
        token_res = await client.post(GITHUB_TOKEN_URL, data=payload, headers=headers)
        if token_res.status_code >= 400:
            return None, f"GitHub token exchange failed: {token_res.text}"
        access_token = token_res.json().get("access_token")
        if not access_token:
            return None, "GitHub did not return an access token"

        auth = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        user_res = await client.get(GITHUB_USER_URL, headers=auth)
        if user_res.status_code >= 400:
            return None, f"GitHub user fetch failed: {user_res.text}"
        data = user_res.json()

        email = data.get("email")
        if not email:
            emails_res = await client.get(GITHUB_EMAIL_URL, headers=auth)
            if emails_res.status_code < 400:
                for item in emails_res.json():
                    if item.get("primary") and item.get("verified"):
                        email = item.get("email")
                        break
                if not email and emails_res.json():
                    email = emails_res.json()[0].get("email")

        return {
            "email": email or f"github-{data.get('id')}@users.noreply.github.com",
            "name": data.get("name") or data.get("login", "GitHub User"),
            "provider": "github",
            "provider_id": str(data.get("id", "")),
            "avatar_url": data.get("avatar_url"),
        }, ""


def oauth_success_redirect(token: str) -> str:
    return f"{_frontend_base()}/?token={token}"
