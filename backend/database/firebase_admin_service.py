"""Luminix Firebase Admin Integration Service

Memory & Environment-based Firebase Admin SDK integration.
ZERO private keys stored in files or repository.

Credentials are read strictly in-memory from:
1. Environment variable: FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON or base64 string)
2. Environment variable: GOOGLE_APPLICATION_CREDENTIALS (system path outside repository)
3. Individual environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
4. Google Cloud Application Default Credentials (Workload Identity / ADC)

If no credentials are provided in the environment, Luminix gracefully operates
in zero-key local encrypted vault mode with complete privacy and zero leakage risk.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger("luminix.firebase")

_firebase_initialized: bool = False
_firestore_client = None


def _get_credentials_from_env():
    """Extracts Firebase credentials strictly from memory/environment variables without saving files."""
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        logger.warning("firebase-admin package not available.")
        return None

    # 1. Full JSON string or base64 in FIREBASE_SERVICE_ACCOUNT_JSON
    raw_env_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw_env_json:
        try:
            if not raw_env_json.startswith("{"):
                decoded = base64.b64decode(raw_env_json).decode("utf-8")
                cred_dict = json.loads(decoded)
            else:
                cred_dict = json.loads(raw_env_json)
            return credentials.Certificate(cred_dict)
        except Exception as exc:
            logger.warning(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env var: {exc}")

    # 2. Individual environment variables
    private_key = os.environ.get("FIREBASE_PRIVATE_KEY")
    client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    project_id = os.environ.get("FIREBASE_PROJECT_ID")

    if private_key and client_email and project_id:
        try:
            formatted_key = private_key.replace("\\n", "\n")
            cred_dict = {
                "type": "service_account",
                "project_id": project_id,
                "private_key": formatted_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            return credentials.Certificate(cred_dict)
        except Exception as exc:
            logger.warning(f"Failed to build credentials from individual env vars: {exc}")

    # 3. Standard Google Cloud GOOGLE_APPLICATION_CREDENTIALS path
    g_creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if g_creds_path and os.path.exists(g_creds_path):
        try:
            return credentials.Certificate(g_creds_path)
        except Exception as exc:
            logger.warning(f"Failed to load GOOGLE_APPLICATION_CREDENTIALS: {exc}")

    # 4. Google Cloud ADC (Application Default Credentials)
    try:
        return credentials.ApplicationDefault()
    except Exception:
        pass

    return None


def init_firebase_admin() -> bool:
    """Initializes Firebase Admin SDK in memory if environment credentials exist."""
    global _firebase_initialized, _firestore_client

    if _firebase_initialized and _firestore_client is not None:
        return True

    try:
        import firebase_admin
        from firebase_admin import firestore

        if not firebase_admin._apps:
            cred = _get_credentials_from_env()
            if not cred:
                # Running in local private mode without keys
                return False
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized securely from in-memory environment.")

        _firestore_client = firestore.client()
        _firebase_initialized = True
        return True
    except Exception as exc:
        logger.info(f"Firebase Admin running in offline/local private mode: {exc}")
        _firebase_initialized = False
        _firestore_client = None
        return False


def get_firestore_client():
    """Returns Firestore client instance if initialized, else None."""
    if not _firebase_initialized:
        init_firebase_admin()
    return _firestore_client


def is_firebase_ready() -> bool:
    """Checks if Firebase Admin SDK is initialized in memory and connected."""
    if not _firebase_initialized:
        return init_firebase_admin()
    return _firebase_initialized and _firestore_client is not None


def save_telemetry_to_firestore(data: Dict[str, Any]) -> Optional[str]:
    """Saves a telemetry snapshot record to Firestore collection 'telemetry_logs'."""
    db = get_firestore_client()
    if not db:
        return None

    try:
        from google.cloud import firestore as g_firestore
        payload = dict(data)
        payload["server_timestamp"] = g_firestore.SERVER_TIMESTAMP

        doc_ref = db.collection("telemetry_logs").add(payload)
        doc_id = doc_ref[1].id if isinstance(doc_ref, tuple) else getattr(doc_ref, "id", None)
        logger.info(f"Firestore telemetry log recorded: {doc_id}")
        return doc_id
    except Exception as exc:
        logger.warning(f"Firestore save_telemetry notice: {exc}")
        return None


def get_telemetry_history_from_firestore(limit: int = 30) -> List[Dict[str, Any]]:
    """Retrieves recent telemetry log records from Firestore ordered by date descending."""
    db = get_firestore_client()
    if not db:
        return []

    try:
        from google.cloud import firestore as g_firestore
        docs = (
            db.collection("telemetry_logs")
            .order_by("date", direction=g_firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        results = []
        for doc in docs:
            item = doc.to_dict()
            item["doc_id"] = doc.id
            if "server_timestamp" in item and item["server_timestamp"]:
                item["server_timestamp"] = str(item["server_timestamp"])
            results.append(item)
        return results
    except Exception as exc:
        logger.warning(f"Firestore get_telemetry notice: {exc}")
        return []


def save_user_profile_to_firestore(uid: str, profile_data: Dict[str, Any]) -> bool:
    """Saves or updates a user profile document in Firestore collection 'users'."""
    db = get_firestore_client()
    if not db:
        return False

    try:
        db.collection("users").document(str(uid)).set(profile_data, merge=True)
        return True
    except Exception as exc:
        logger.warning(f"Firestore save_user_profile notice: {exc}")
        return False


def get_user_profile_from_firestore(uid: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user profile document from Firestore collection 'users'."""
    db = get_firestore_client()
    if not db:
        return None

    try:
        doc = db.collection("users").document(str(uid)).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as exc:
        logger.warning(f"Firestore get_user_profile notice: {exc}")
        return None


def save_donation_to_firestore(donation_data: Dict[str, Any]) -> Optional[str]:
    """Saves donation record to Firestore collection 'donations'."""
    db = get_firestore_client()
    if not db:
        return None

    try:
        from google.cloud import firestore as g_firestore
        payload = dict(donation_data)
        payload["server_timestamp"] = g_firestore.SERVER_TIMESTAMP
        doc_ref = db.collection("donations").add(payload)[1]
        logger.info(f"Firestore donation recorded: {doc_ref.id}")
        return doc_ref.id
    except Exception as exc:
        logger.warning(f"Firestore save_donation notice: {exc}")
        return None
