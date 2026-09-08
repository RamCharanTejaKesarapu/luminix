"""Google and GitHub OAuth 2.0 Integration for Luminix.

Handles authorization URL generation, code exchange, profile information retrieval,
and fallback mock authentication for seamless local development.
"""

from __future__ import annotations

import os
import secrets
import time
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

# In-memory OAuth state cache with timestamp (TTL: 10 minutes)
_oauth_state_cache: Dict[str, Tuple[str, float]] = {}


def _frontend_base() -> str:
    return os.getenv("FRONTEND_URL", "http://127.0.0.1:8000").rstrip("/")


def _redirect_uri(provider: str) -> str:
    base = os.getenv("OAUTH_REDIRECT_BASE", "http://127.0.0.1:8000").rstrip("/")
    return f"{base}/v1/auth/{provider}/callback"


def google_configured() -> bool:
    cid = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    csecret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    return bool(cid and csecret and not cid.startswith("your_"))


def github_configured() -> bool:
    cid = os.getenv("GITHUB_CLIENT_ID", "").strip()
    csecret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    return bool(cid and csecret and not cid.startswith("your_"))


def create_oauth_state(provider: str) -> str:
    state = secrets.token_urlsafe(24)
    now = time.time()
    # Prune expired states older than 10 mins
    cutoff = now - 600
    for k in list(_oauth_state_cache.keys()):
        if _oauth_state_cache[k][1] < cutoff:
            del _oauth_state_cache[k]
    _oauth_state_cache[state] = (provider, now)
    return state


def verify_oauth_state(state: str, expected_provider: str) -> bool:
    if not state or state not in _oauth_state_cache:
        return False
    provider, created = _oauth_state_cache.pop(state)
    return provider == expected_provider and (time.time() - created) < 600


def google_login_url(state: str) -> str:
    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", "").strip(),
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
        "client_id": os.getenv("GITHUB_CLIENT_ID", "").strip(),
        "redirect_uri": _redirect_uri("github"),
        "scope": "read:user user:email",
        "state": state,
        "allow_signup": "true",
    }
    return f"{GITHUB_AUTH_URL}?{urlencode(params)}"


def mock_oauth_user(provider: str) -> Dict[str, Any]:
    suffix = secrets.token_hex(3)
    return {
        "email": f"developer.{provider}.{suffix}@luminix.local",
        "name": f"Luminix {provider.title()} Explorer",
        "provider": provider,
        "provider_id": f"mock-{provider}-{suffix}",
        "avatar_url": f"https://api.dicebear.com/7.x/identicon/svg?seed={provider}_{suffix}",
        "bio": f"Verified {provider.title()} Developer Account (Mock Session)",
        "profile_data": {
            "oauth_provider": provider,
            "is_mock": True,
            "account_status": "active",
        },
    }


async def exchange_google_code(code: str) -> Tuple[Optional[Dict[str, Any]], str]:
    if not google_configured():
        return mock_oauth_user("google"), ""

    payload = {
        "code": code,
        "client_id": os.getenv("GOOGLE_CLIENT_ID", "").strip(),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", "").strip(),
        "redirect_uri": _redirect_uri("google"),
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            token_res = await client.post(GOOGLE_TOKEN_URL, data=payload)
            if token_res.status_code >= 400:
                return None, f"Google token exchange rejected ({token_res.status_code}): {token_res.text}"
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return None, "Google did not return a valid access token"

            user_res = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_res.status_code >= 400:
                return None, f"Google userinfo request failed ({user_res.status_code}): {user_res.text}"
            data = user_res.json()

            email = data.get("email")
            if not email:
                email = f"google-{data.get('sub')}@unknown.local"

            return {
                "email": email.lower(),
                "name": data.get("name") or data.get("given_name") or email.split("@")[0],
                "provider": "google",
                "provider_id": str(data.get("sub", "")),
                "avatar_url": data.get("picture"),
                "bio": "Google Authenticated Member",
                "profile_data": {
                    "google_id": data.get("sub"),
                    "email_verified": data.get("email_verified", False),
                    "given_name": data.get("given_name"),
                    "family_name": data.get("family_name"),
                    "locale": data.get("locale"),
                },
            }, ""
        except Exception as exc:
            return None, f"Google OAuth communication error: {exc}"


async def exchange_github_code(code: str) -> Tuple[Optional[Dict[str, Any]], str]:
    if not github_configured():
        return mock_oauth_user("github"), ""

    payload = {
        "client_id": os.getenv("GITHUB_CLIENT_ID", "").strip(),
        "client_secret": os.getenv("GITHUB_CLIENT_SECRET", "").strip(),
        "code": code,
        "redirect_uri": _redirect_uri("github"),
    }
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            token_res = await client.post(GITHUB_TOKEN_URL, data=payload, headers=headers)
            if token_res.status_code >= 400:
                return None, f"GitHub token exchange rejected ({token_res.status_code}): {token_res.text}"
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                error_msg = token_data.get("error_description") or token_data.get("error") or "No access token"
                return None, f"GitHub OAuth Error: {error_msg}"

            auth = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
            user_res = await client.get(GITHUB_USER_URL, headers=auth)
            if user_res.status_code >= 400:
                return None, f"GitHub user fetch failed ({user_res.status_code}): {user_res.text}"
            data = user_res.json()

            # Retrieve verified email if user profile email is private
            email = data.get("email")
            if not email:
                emails_res = await client.get(GITHUB_EMAIL_URL, headers=auth)
                if emails_res.status_code < 400:
                    email_list = emails_res.json()
                    if isinstance(email_list, list):
                        for item in email_list:
                            if item.get("primary") and item.get("verified"):
                                email = item.get("email")
                                break
                        if not email and email_list:
                            email = email_list[0].get("email")

            if not email:
                email = f"{data.get('login')}@users.noreply.github.com"

            return {
                "email": email.lower(),
                "name": data.get("name") or data.get("login") or email.split("@")[0],
                "provider": "github",
                "provider_id": str(data.get("id", "")),
                "avatar_url": data.get("avatar_url"),
                "bio": data.get("bio") or "GitHub Authenticated Developer",
                "profile_data": {
                    "github_id": data.get("id"),
                    "github_username": data.get("login"),
                    "location": data.get("location"),
                    "company": data.get("company"),
                    "public_repos": data.get("public_repos"),
                    "html_url": data.get("html_url"),
                },
            }, ""
        except Exception as exc:
            return None, f"GitHub OAuth communication error: {exc}"


def oauth_success_redirect(token: str) -> str:
    return f"{_frontend_base()}/?token={token}"
