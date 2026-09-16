"""
LUMINIX — Multi-Signal Heart & Cardiovascular Risk Engine
Architectural Reference: Section 8 & 9 (Heart-Risk Detection & Warning System)

Hierarchical Architecture:
Risk Engine
├── physiological signals (HR, HRV, BP, SpO₂, RR, Temp)
├── personal baseline (resting HR baseline, baseline BP, baseline HRV)
├── environmental conditions (ambient temp, humidity, Rothfusz heat index)
├── signal quality (confidence, sensor contact, motion artifact)
├── measurement recency (recency decay, age weighting; e.g. BP recency discount)
└── clinically configurable thresholds / prototype configuration

Disclaimer: Prototype decision-support monitoring only, not a clinical medical diagnosis.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def compute_measurement_age_string(timestamp_iso: Optional[str]) -> str:
    """Computes human-friendly measurement age string."""
    if not timestamp_iso:
        return "No recent measurement"
    try:
        ts = datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        diff = (datetime.now(timezone.utc) - ts).total_seconds()
        if diff < 0:
            return "Just now"
        if diff < 60:
            return f"{int(diff)} sec ago"
        if diff < 3600:
            return f"{int(diff // 60)} min ago"
        if diff < 86400:
            return f"{int(diff // 3600)} hr ago"
        return f"{int(diff // 86400)} days ago"
    except Exception:
        return "No recent measurement"


@dataclass
class RiskThresholdsConfig:
    """
    PROTOTYPE THRESHOLDS CONFIGURATION FOR DEVELOPMENT & DECISION SUPPORT.
    Notice: These values are configurable prototype heuristics, not universally
    validated clinical criteria. They should be customized per user cohort or clinical trial.
    """
    is_clinically_validated: bool = False
    configuration_mode: str = "DEVELOPMENT_PROTOTYPE_CONFIG"
    validation_disclaimer: str = (
        "Notice: Luminix Heart Risk Engine provides investigational / decision-support monitoring only, "
        "not a clinical medical diagnosis. Prototype thresholds are not universally validated clinical criteria. "
        "Consult certified healthcare personnel for clinical evaluations."
    )
    # Resting HR Elevation vs Baseline
    hr_elevation_moderate_bpm: float = 15.0
    hr_elevation_severe_bpm: float = 25.0
    resting_tachycardia_bpm: float = 100.0
    resting_severe_tachycardia_bpm: float = 130.0
    resting_bradycardia_bpm: float = 42.0
    # Active Exertion Limits
    active_hr_high_intensity_bpm: float = 160.0
    active_hr_peak_limit_bpm: float = 180.0
    # HRV Autonomic Tone
    hrv_suppression_ms: float = 28.0
    hrv_exhaustion_ms: float = 18.0
    # Blood Pressure (Latest Available Measurement)
    bp_stage1_systolic: float = 130.0
    bp_stage1_diastolic: float = 80.0
    bp_stage2_systolic: float = 140.0
    bp_stage2_diastolic: float = 90.0
    bp_crisis_systolic: float = 180.0
    bp_crisis_diastolic: float = 120.0
    bp_hypotension_systolic: float = 90.0
    bp_hypotension_diastolic: float = 60.0
    # SpO2 Myocardial Oxygenation
    spo2_suboptimal_pct: float = 94.0
    spo2_hypoxia_pct: float = 90.0
    # Respiratory & Thermal
    respiratory_tachypnea_brpm: float = 24.0
    pyrexia_temp_c: float = 38.0
    # Recency Decay
    bp_recency_decay_hours: float = 4.0
    bp_stale_discount_factor: float = 0.5


DEFAULT_PROTOTYPE_CONFIG = RiskThresholdsConfig()


class HeartRiskEngine:
    """
    Multi-Signal Heart Risk Engine evaluating cardiovascular safety,
    cardiac workload, autonomic nervous tone, and hemodynamic stability.
    """

    @staticmethod
    def evaluate(
        heart_rate: Optional[float] = None,
        hrv: Optional[float] = None,
        baseline_hr: float = 68.0,
        temperature_c: Optional[float] = None,
        activity_level: str = "MODERATE",
        spo2: Optional[float] = None,
        respiratory_rate: Optional[float] = None,
        systolic: Optional[float] = None,
        diastolic: Optional[float] = None,
        bp_timestamp: Optional[str] = None,
        bp_source: Optional[str] = None,
        ambient_temp_c: float = 28.0,
        humidity_percent: float = 55.0,
        # Additional Hierarchical Parameters
        signal_confidence: float = 0.95,
        sensor_contact: bool = True,
        motion_artifact: bool = False,
        config: Optional[RiskThresholdsConfig] = None,
    ) -> Dict[str, Any]:
        """
        Runs comprehensive hierarchical multi-signal cardiac risk calculation.
        Scores cardiac strain from 0 (optimal athletic equilibrium) to 100 (critical overload).
        """
        cfg = config or DEFAULT_PROTOTYPE_CONFIG
        cardiac_score = 0.0
        triggers: List[str] = []
        act_upper = activity_level.upper()

        # ── 1. Heart Rate & Baseline Delta (0 - 35 points) ───────────────────
        if heart_rate is not None and heart_rate > 0:
            hr_val = float(heart_rate)
            hr_delta = hr_val - baseline_hr

            if act_upper in ("REST", "RESTING", "LOW"):
                if hr_val >= cfg.resting_severe_tachycardia_bpm:
                    cardiac_score += 35
                    triggers.append(f"Severe resting tachycardia ({int(hr_val)} BPM, +{int(hr_delta)} over baseline)")
                elif hr_val >= cfg.resting_tachycardia_bpm:
                    cardiac_score += 25
                    triggers.append(f"Resting tachycardia ({int(hr_val)} BPM, +{int(hr_delta)} over baseline)")
                elif hr_delta >= cfg.hr_elevation_moderate_bpm:
                    cardiac_score += 15
                    triggers.append(f"Elevated resting heart rate (+{int(hr_delta)} BPM over baseline)")
                elif hr_val < cfg.resting_bradycardia_bpm:
                    cardiac_score += 20
                    triggers.append(f"Marked sinus bradycardia ({int(hr_val)} BPM)")
            else:
                if hr_val >= cfg.active_hr_peak_limit_bpm:
                    cardiac_score += 30
                    triggers.append(f"Peak cardiac exertion limit reached ({int(hr_val)} BPM)")
                elif hr_val >= cfg.active_hr_high_intensity_bpm:
                    cardiac_score += 20
                    triggers.append(f"High-intensity cardiac zone ({int(hr_val)} BPM)")
                elif hr_delta > 60:
                    cardiac_score += 15
                    triggers.append(f"Rapid heart rate acceleration (+{int(hr_delta)} BPM delta)")

        # ── 2. Heart Rate Variability (HRV Autonomic Tone) (0 - 20 points) ──
        if hrv is not None and hrv > 0:
            hrv_val = float(hrv)
            if hrv_val < cfg.hrv_exhaustion_ms:
                cardiac_score += 20
                triggers.append(f"Severe autonomic nervous exhaustion (HRV {int(hrv_val)} ms)")
            elif hrv_val < cfg.hrv_suppression_ms:
                cardiac_score += 12
                triggers.append(f"Suppressed parasympathetic tone (HRV {int(hrv_val)} ms)")

        # ── 3. Latest Available Blood Pressure (Recency-Decayed) (0 - 35 points) ──
        has_recent_bp = False
        bp_age_str = "No recent measurement"
        bp_display = "No recent measurement"
        bp_age_seconds: Optional[float] = None
        bp_is_stale = False

        if systolic is not None and diastolic is not None and systolic > 0 and diastolic > 0:
            has_recent_bp = True
            bp_display = f"{int(systolic)}/{int(diastolic)} mmHg"
            bp_age_str = compute_measurement_age_string(bp_timestamp)

            if bp_timestamp:
                try:
                    dt = datetime.fromisoformat(bp_timestamp.replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    bp_age_seconds = max(0.0, (datetime.now(timezone.utc) - dt).total_seconds())
                    if bp_age_seconds > (cfg.bp_recency_decay_hours * 3600):
                        bp_is_stale = True
                except Exception:
                    pass

            # Calculate raw BP points
            bp_pts = 0.0
            bp_trigger = ""
            if systolic >= cfg.bp_crisis_systolic or diastolic >= cfg.bp_crisis_diastolic:
                bp_pts = 35.0
                bp_trigger = f"Hypertensive Crisis ({int(systolic)}/{int(diastolic)} mmHg)"
            elif systolic >= cfg.bp_stage2_systolic or diastolic >= cfg.bp_stage2_diastolic:
                bp_pts = 24.0
                bp_trigger = f"Stage 2 Hypertension ({int(systolic)}/{int(diastolic)} mmHg)"
            elif systolic >= cfg.bp_stage1_systolic or diastolic >= cfg.bp_stage1_diastolic:
                bp_pts = 12.0
                bp_trigger = f"Stage 1 Hypertension ({int(systolic)}/{int(diastolic)} mmHg)"
            elif systolic < cfg.bp_hypotension_systolic or diastolic < cfg.bp_hypotension_diastolic:
                bp_pts = 22.0
                bp_trigger = f"Hypotensive hypoperfusion risk ({int(systolic)}/{int(diastolic)} mmHg)"

            # Measurement Recency Decay: stale BP (> 4h) is discounted for acute risk
            if bp_is_stale and bp_pts > 0:
                bp_pts *= cfg.bp_stale_discount_factor
                triggers.append(f"{bp_trigger} [Cached reading, {bp_age_str}]")
            elif bp_trigger:
                triggers.append(bp_trigger)

            cardiac_score += bp_pts

        # ── 4. Blood Oxygen (SpO2 Myocardial Oxygenation) (0 - 20 points) ─────
        if spo2 is not None and spo2 > 0:
            if spo2 < cfg.spo2_hypoxia_pct:
                cardiac_score += 20
                triggers.append(f"Arterial hypoxia (SpO₂ {spo2:.0f}%) — Myocardial oxygen stress")
            elif spo2 < cfg.spo2_suboptimal_pct:
                cardiac_score += 12
                triggers.append(f"Sub-optimal oxygen saturation (SpO₂ {spo2:.0f}%)")

        # ── 5. Respiratory Rate & Thermal Strain (0 - 15 points) ─────────────
        if respiratory_rate is not None and respiratory_rate > 0:
            if respiratory_rate >= cfg.respiratory_tachypnea_brpm:
                cardiac_score += 10
                triggers.append(f"Tachypnea ({int(respiratory_rate)} breaths/min)")

        if temperature_c is not None and temperature_c >= cfg.pyrexia_temp_c:
            cardiac_score += 10
            triggers.append(f"Thermal cardiac load / pyrexia ({temperature_c:.1f}°C)")

        # ── 6. Signal Quality Weighting ──────────────────────────────────────
        if not sensor_contact:
            cardiac_score *= 0.5
            triggers.append("Sensor Contact Weak — Verifying skin contact")
        elif signal_confidence < 0.60:
            cardiac_score *= 0.7
            triggers.append(f"Low Signal Confidence ({int(signal_confidence * 100)}%) — Possible motion noise")

        if motion_artifact:
            triggers.append("Motion Artifact Detected — Filtering accelerometer transients")

        # ── 7. Aggregate Heart Risk Classification ───────────────────────────
        missing_signals = []
        if heart_rate is None: missing_signals.append("heart_rate")
        if hrv is None: missing_signals.append("hrv")
        if systolic is None or diastolic is None: missing_signals.append("blood_pressure")
        if spo2 is None: missing_signals.append("spo2")
        if respiratory_rate is None: missing_signals.append("respiratory_rate")
        if temperature_c is None: missing_signals.append("body_temperature")

        has_any_signal = any(x is not None for x in [heart_rate, hrv, systolic, diastolic, spo2, respiratory_rate, temperature_c])

        total_heart_score = min(100, int(round(cardiac_score)))

        # ── 7. Aggregate Heart Risk Classification ───────────────────────────
        recommendations: List[str] = []

        if not has_any_signal:
            heart_risk_level = "AWAITING_DATA"
            total_heart_score = 0
            is_alert_active = False
            alert_title = "● AWAITING SENSOR TELEMETRY"
            alert_msg = "No biometric signals available. Connect a real health device to stream vitals."
            recommendations.append("Connect an authentic health device (Apple Health, Health Connect, or BLE) to calculate cardiovascular metrics.")
        elif total_heart_score >= 65:
            heart_risk_level = "CRITICAL"
            is_alert_active = True
            alert_title = f"⚠ HEART RISK: {heart_risk_level}"
            alert_msg = "Elevated cardiovascular strain detected across multi-signal vitals. Reduce intensity and initiate recovery."
            recommendations.append("Halt strenuous physical exercise and heavy cardio loading immediately.")
            recommendations.append("Sit or recline in a supported upright posture (head elevated 30–45°).")
            recommendations.append("Practice slow 4-7-8 diaphragmatic breathing to stimulate parasympathetic recovery.")
            recommendations.append("Hydrate with cool water and balanced electrolyte minerals.")
            recommendations.append("Seek medical attention or cardiology consultation if chest tightness, radiating arm pain, or shortness of breath occurs.")
        elif total_heart_score >= 42:
            heart_risk_level = "HIGH"
            is_alert_active = True
            alert_title = f"⚠ HEART RISK: {heart_risk_level}"
            alert_msg = "Elevated cardiovascular strain detected across multi-signal vitals. Reduce intensity and initiate recovery."
            recommendations.append("Halt strenuous physical exercise and heavy cardio loading immediately.")
            recommendations.append("Sit or recline in a supported upright posture (head elevated 30–45°).")
            recommendations.append("Practice slow 4-7-8 diaphragmatic breathing to stimulate parasympathetic recovery.")
            recommendations.append("Hydrate with cool water and balanced electrolyte minerals.")
            recommendations.append("Seek medical attention or cardiology consultation if chest tightness, radiating arm pain, or shortness of breath occurs.")
        elif total_heart_score >= 22:
            heart_risk_level = "MODERATE"
            is_alert_active = False
            alert_title = f"● HEART STATUS: {heart_risk_level}"
            alert_msg = "Moderate cardiac strain detected. Aerobic pacing advised."
            recommendations.append("Moderate cardiac strain detected. Lower workout intensity to aerobic recovery zone.")
            recommendations.append("Take scheduled active recovery intervals and monitor heart rate deceleration.")
            recommendations.append("Ensure consistent hydration.")
        else:
            heart_risk_level = "LOW"
            is_alert_active = False
            alert_title = "● CARDIAC STATUS: OPTIMAL"
            alert_msg = "Cardiovascular metrics and autonomic balance are within stable baseline thresholds."
            recommendations.append("Cardiovascular vitals and hemodynamic balance are in optimal athletic equilibrium.")
            recommendations.append("Continue standard conditioning with target aerobic heart rate zones.")

        # Environmental heat index calculation for secondary thermal context
        T = (ambient_temp_c * 9.0 / 5.0) + 32.0
        R = max(0.0, min(100.0, humidity_percent))
        heat_index_c = ambient_temp_c
        heat_index_f = round(T, 1)
        if T >= 80.0:
            heat_index_f = round(
                -42.379
                + (2.04901523 * T)
                + (10.14333127 * R)
                - (0.22475541 * T * R)
                - (0.00683783 * (T**2))
                - (0.05481717 * (R**2))
                + (0.00122874 * (T**2) * R)
                + (0.00085282 * T * (R**2))
                - (0.00000199 * (T**2) * (R**2)),
                1,
            )
            heat_index_c = round((heat_index_f - 32.0) * 5.0 / 9.0, 1)

        hi_cat = "Caution" if heat_index_f >= 80 else "Normal"
        if heat_index_f >= 103:
            hi_cat = "Danger"
        elif heat_index_f >= 90:
            hi_cat = "Extreme Caution"

        return {
            # Primary Heart Risk Fields
            "heart_risk_level": heart_risk_level,
            "cardiac_strain_score": total_heart_score,
            "risk_level": heart_risk_level,
            "risk_score": total_heart_score,
            "cardio_risk_level": heart_risk_level,
            "total_heat_score": total_heart_score,  # backwards compatibility alias
            "total_cardio_score": total_heart_score,
            "is_alert_active": is_alert_active,
            "alert_triggered": is_alert_active,
            "alert_title": alert_title,
            "alert_msg": alert_msg,
            "triggers": triggers,
            "recommendations": recommendations,
            "missing_signals": missing_signals,
            "has_any_signal": has_any_signal,
            # Cardiovascular Snapshot
            "cardiovascular_snapshot": {
                "heart_rate": f"{int(heart_rate)} BPM" if heart_rate else "--",
                "hrv": f"{int(hrv)} ms" if hrv else "--",
                "blood_pressure": bp_display,
                "bp_age": bp_age_str,
                "has_recent_bp": has_recent_bp,
                "bp_source": bp_source or "Device",
                "spo2": f"{int(spo2)}%" if spo2 else "--",
                "respiratory_rate": f"{int(respiratory_rate)}/min" if respiratory_rate else "--",
                "temperature": f"{temperature_c:.1f}°C" if temperature_c else "--",
            },
            # Latest Available Blood Pressure Measurement Object
            "blood_pressure_status": {
                "systolic": systolic,
                "diastolic": diastolic,
                "bp_display": bp_display,
                "bp_age": bp_age_str,
                "bp_age_seconds": bp_age_seconds,
                "is_stale": bp_is_stale,
                "has_recent_bp": has_recent_bp,
                "source": bp_source or "Unspecified",
                "measurement_label": "latest_available_bp_measurement",
            },
            # Configurable Hierarchical Risk Model Summary
            "risk_model_architecture": {
                "structure": "Hierarchical Multi-Signal Risk Engine",
                "components": [
                    "physiological_signals",
                    "personal_baseline",
                    "environmental_conditions",
                    "signal_quality",
                    "measurement_recency",
                    "clinically_configurable_thresholds",
                ],
                "signal_quality": {
                    "confidence": signal_confidence,
                    "sensor_contact": sensor_contact,
                    "motion_artifact": motion_artifact,
                },
                "measurement_recency": {
                    "bp_age_seconds": bp_age_seconds,
                    "bp_is_stale": bp_is_stale,
                    "decay_window_hours": cfg.bp_recency_decay_hours,
                },
                "thresholds_status": cfg.configuration_mode,
                "is_clinically_validated": cfg.is_clinically_validated,
                "validation_disclaimer": cfg.validation_disclaimer,
            },
            # Environmental context
            "environmental": {
                "ambient_temp_c": ambient_temp_c,
                "humidity_percent": humidity_percent,
                "heat_index_c": heat_index_c,
                "heat_index_f": heat_index_f,
                "category": hi_cat,
            },
            "heat_index_f": heat_index_f,
            "heat_index_c": heat_index_c,
            "heat_index_category": hi_cat,
            "disclaimer": cfg.validation_disclaimer,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }


# Alias for backwards compatibility
HeatRiskEngine = HeartRiskEngine
