/**
 * Luminix Mobile Health Bridge — Health Data Validator
 * Physiological sanity validator enforcing clinical ranges to eliminate
 * artifact anomalies and corrupted Bluetooth packets.
 */

const PHYSIOLOGICAL_LIMITS = {
  heart_rate: { min: 28, max: 250 }, // BPM
  resting_heart_rate: { min: 30, max: 140 }, // BPM
  hrv: { min: 3, max: 350 }, // ms
  spo2: { min: 65, max: 100 }, // %
  body_temperature: { min: 32.0, max: 43.5 }, // °C
  respiratory_rate: { min: 4, max: 60 }, // breaths/min
  steps: { min: 0, max: 200000 },
  systolic: { min: 55, max: 275 }, // mmHg
  diastolic: { min: 30, max: 175 }, // mmHg
};

class HealthDataValidator {
  /**
   * Validates a single normalized Luminix health record.
   * Returns true if clinically plausible, false if corrupted artifact.
   */
  validateRecord(record) {
    if (!record || !record.metric) return false;

    if (record.metric === 'blood_pressure') {
      const sys = record.systolic;
      const dia = record.diastolic;
      if (typeof sys !== 'number' || typeof dia !== 'number') return false;
      if (sys < PHYSIOLOGICAL_LIMITS.systolic.min || sys > PHYSIOLOGICAL_LIMITS.systolic.max) return false;
      if (dia < PHYSIOLOGICAL_LIMITS.diastolic.min || dia > PHYSIOLOGICAL_LIMITS.diastolic.max) return false;
      if (dia >= sys) return false; // Diastolic must be lower than Systolic
      return true;
    }

    const limits = PHYSIOLOGICAL_LIMITS[record.metric];
    if (!limits) {
      // Unknown metric, allow if finite number
      return typeof record.value === 'number' && Number.isFinite(record.value);
    }

    const val = record.value;
    if (typeof val !== 'number' || !Number.isFinite(val)) return false;
    return val >= limits.min && val <= limits.max;
  }

  /**
   * Filters an array of normalized records, keeping only valid items.
   */
  filterValidRecords(records) {
    if (!Array.isArray(records)) return [];
    return records.filter((r) => this.validateRecord(r));
  }
}

export default new HealthDataValidator();
