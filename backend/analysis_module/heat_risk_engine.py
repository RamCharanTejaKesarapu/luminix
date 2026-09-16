"""
LUMINIX — Heart Risk & Heat Risk Engine Re-Export
Maintains backwards compatibility for any modules importing HeatRiskEngine.
"""

try:
    from analysis_module.heart_risk_engine import (
        HeartRiskEngine,
        HeatRiskEngine,
        RiskThresholdsConfig,
        compute_measurement_age_string,
    )
except ImportError:
    from backend.analysis_module.heart_risk_engine import (
        HeartRiskEngine,
        HeatRiskEngine,
        RiskThresholdsConfig,
        compute_measurement_age_string,
    )

__all__ = [
    "HeartRiskEngine",
    "HeatRiskEngine",
    "RiskThresholdsConfig",
    "compute_measurement_age_string",
]
