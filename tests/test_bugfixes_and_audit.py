"""Automated regression test suite validating bug fixes and audit criteria (September 2026)."""

from __future__ import annotations

import math
from datetime import datetime, timezone
import pytest

from database.db import (
    _get_session,
    create_user,
    delete_user_account,
    get_latest_health_samples,
    save_health_samples,
    HealthSample,
    User,
)
from analysis_module.heart_risk_engine import HeartRiskEngine, compute_measurement_age_string
from analysis_module import gemini_integration
from pose_module.video_analyzer import _issues_from_angles, _score_frame


def test_dpdp_account_deletion_erases_health_samples():
    """Verify that deleting a user account erases all associated HealthSample telemetry under DPDP Act."""
    user = create_user(
        email="dpdp_audit_test@luminix.sanctuary",
        name="DPDP Test User",
        password_hash="argon2id_mock_hash",
    )
    user_id_str = str(user.id)
    user_email = user.email

    # Insert test health telemetry samples
    samples = [
        {
            "userId": user_id_str,
            "metric": "heart_rate",
            "value": 72.0,
            "unit": "bpm",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        {
            "userId": user_email,
            "metric": "blood_pressure",
            "systolic": 120.0,
            "diastolic": 80.0,
            "unit": "mmHg",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    ]
    saved_count = save_health_samples(samples)
    assert saved_count == 2

    # Verify samples exist before deletion
    with _get_session() as s:
        pre_count = s.query(HealthSample).filter(
            (HealthSample.user_id == user_id_str) | (HealthSample.user_id == user_email)
        ).count()
        assert pre_count >= 2

    # Delete account (DPDP right to erasure)
    deleted = delete_user_account(user.id)
    assert deleted is True

    # Verify zero orphaned health samples remain
    with _get_session() as s:
        post_count = s.query(HealthSample).filter(
            (HealthSample.user_id == user_id_str) | (HealthSample.user_id == user_email)
        ).count()
        assert post_count == 0

        # Verify user is also removed
        u = s.query(User).filter(User.id == user.id).first()
        assert u is None


def test_video_analyzer_handles_none_and_nan_angles():
    """Ensure video analyzer does not throw TypeError when angles contain None or NaN."""
    buggy_angles = {
        "spine_vertical_deviation_deg": None,
        "shoulder_tilt_deg": None,
        "hip_tilt_deg": float("nan"),
        "knee_right_deg": None,
        "knee_left_deg": float("nan"),
        "elbow_right_deg": None,
        "elbow_left_deg": 45.0,
    }

    # Should safely compute empty issues list without TypeError
    issues = _issues_from_angles(buggy_angles)
    assert isinstance(issues, list)
    assert len(issues) == 0

    # Should safely score frame without crash
    score = _score_frame(buggy_angles, issues)
    assert score == 100.0


def test_video_analyzer_detects_real_issues_when_present():
    """Ensure video analyzer correctly flags real angle deviations."""
    deviated_angles = {
        "spine_vertical_deviation_deg": 25.0,
        "shoulder_tilt_deg": 15.0,
        "hip_tilt_deg": 14.0,
        "knee_right_deg": 90.0,
        "knee_left_deg": 65.0,
        "elbow_right_deg": 100.0,
        "elbow_left_deg": 60.0,
    }
    issues = _issues_from_angles(deviated_angles)
    assert len(issues) == 5
    score = _score_frame(deviated_angles, issues)
    assert score < 60.0


def test_heart_risk_engine_critical_vs_high_distinction():
    """Verify distinction between CRITICAL and HIGH cardiovascular risk alerts and recommendations."""
    crit_eval = HeartRiskEngine.evaluate(
        heart_rate=135.0,
        baseline_hr=68.0,
        activity_level="REST",
        spo2=88.0,
        systolic=185.0,
        diastolic=125.0,
    )
    high_eval = HeartRiskEngine.evaluate(
        heart_rate=105.0,
        baseline_hr=68.0,
        activity_level="REST",
        spo2=93.0,
        systolic=145.0,
        diastolic=92.0,
    )

    assert crit_eval["heart_risk_level"] == "CRITICAL"
    assert high_eval["heart_risk_level"] == "HIGH"
    assert crit_eval["is_alert_active"] is True
    assert high_eval["is_alert_active"] is True

    # Ensure distinct alert titles and content (no copy-paste duplicate)
    assert crit_eval["alert_title"] != high_eval["alert_title"]
    assert crit_eval["alert_msg"] != high_eval["alert_msg"]
    assert crit_eval["recommendations"] != high_eval["recommendations"]

    # Verify delta sign formatting in triggers
    for trigger in crit_eval["triggers"]:
        assert "++" not in trigger
        assert "+-" not in trigger


def test_gemini_model_names_valid():
    """Verify Gemini integration models align with Google AI Studio naming."""
    default_model = gemini_integration._model_name()
    assert default_model.startswith("gemini-")
    assert "gemini-3.6-flash" in gemini_integration.MODEL_FALLBACKS


def test_compute_measurement_age_string():
    """Verify measurement age computation helper."""
    now_iso = datetime.now(timezone.utc).isoformat()
    age = compute_measurement_age_string(now_iso)
    assert "Just now" in age or "sec ago" in age

    assert compute_measurement_age_string(None) == "No recent measurement"
    assert compute_measurement_age_string("invalid_date") == "No recent measurement"


def test_suggest_recipes_continental_cuisines():
    """Verify multi-cuisine filtering and enriched recipe metadata."""
    from cooking_module.recipes import suggest_recipes

    # Test Indian cuisine
    indian_res = suggest_recipes("rice, egg, tomato, onion", cuisine="Indian", spice_level="Spicy")
    assert indian_res["cuisine"] == "Indian"
    assert len(indian_res["recipes"]) > 0
    top_indian = indian_res["recipes"][0]
    assert "steps" in top_indian
    assert len(top_indian["steps"]) >= 3
    assert "prep_time_mins" in top_indian
    assert "cook_time_mins" in top_indian
    assert top_indian["prep_time_mins"] > 0
    assert top_indian["cook_time_mins"] > 0
    assert "calories" in top_indian

    # Test Chinese cuisine
    chinese_res = suggest_recipes("rice, egg, garlic, soy", cuisine="Chinese", spice_level="Medium")
    assert chinese_res["cuisine"] == "Chinese"
    assert len(chinese_res["recipes"]) > 0
    assert any(r["cuisine"] == "Chinese" for r in chinese_res["recipes"])

    # Test Italian cuisine
    italian_res = suggest_recipes("chicken, tomato, garlic, olive oil", cuisine="Italian", spice_level="Mild")
    assert italian_res["cuisine"] == "Italian"
    assert len(italian_res["recipes"]) > 0
    assert any(r["cuisine"] == "Italian" for r in italian_res["recipes"])
