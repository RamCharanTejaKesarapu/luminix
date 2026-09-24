/**
 * Luminix Mobile Health Bridge — Health Data Normalizer
 * Architectural Reference: Section 8 (Normalized Luminix Data Model)
 * Converts raw vendor structures from HealthKit and Health Connect into
 * the unified Luminix Health Data Record schema.
 */

class HealthDataNormalizer {
  /**
   * Normalizes an Apple HealthKit sample
   */
  normalizeHealthKitSample(rawSample, metricType, userId = 'default') {
    if (!rawSample) return null;

    if (metricType === 'blood_pressure') {
      return {
        userId,
        metric: 'blood_pressure',
        value: null,
        unit: 'mmHg',
        systolic: parseFloat(rawSample.bloodPressureSystolicValue || rawSample.systolic || 0),
        diastolic: parseFloat(rawSample.bloodPressureDiastolicValue || rawSample.diastolic || 0),
        timestamp: rawSample.startDate ? new Date(rawSample.startDate).toISOString() : new Date().toISOString(),
        startTime: rawSample.startDate ? new Date(rawSample.startDate).toISOString() : null,
        endTime: rawSample.endDate ? new Date(rawSample.endDate).toISOString() : null,
        source: 'healthkit',
        device: rawSample.device || 'Apple Watch',
        quality: 'cuff_or_device_measured',
      };
    }

    const val = typeof rawSample.value === 'number' ? rawSample.value : parseFloat(rawSample.value || 0);

    let unit = 'count';
    if (metricType === 'heart_rate' || metricType === 'resting_heart_rate') unit = 'bpm';
    else if (metricType === 'hrv') unit = 'ms';
    else if (metricType === 'spo2') unit = '%';
    else if (metricType === 'body_temperature') unit = '°C';
    else if (metricType === 'respiratory_rate') unit = 'breaths/min';
    else if (metricType === 'distance') unit = 'm';
    else if (metricType === 'active_calories') unit = 'kcal';

    return {
      userId,
      metric: metricType,
      value: val,
      unit,
      timestamp: rawSample.startDate ? new Date(rawSample.startDate).toISOString() : new Date().toISOString(),
      startTime: rawSample.startDate ? new Date(rawSample.startDate).toISOString() : null,
      endTime: rawSample.endDate ? new Date(rawSample.endDate).toISOString() : null,
      source: 'healthkit',
      device: rawSample.device || 'Apple Watch',
      quality: 'device_measured',
    };
  }

  /**
   * Normalizes an Android Health Connect record
   */
  normalizeHealthConnectRecord(record, metricType, userId = 'default') {
    if (!record) return null;

    if (metricType === 'blood_pressure') {
      const sys = record.systolic?.inMillimetersOfMercury || record.systolic || 0;
      const dia = record.diastolic?.inMillimetersOfMercury || record.diastolic || 0;
      return {
        userId,
        metric: 'blood_pressure',
        value: null,
        unit: 'mmHg',
        systolic: parseFloat(sys),
        diastolic: parseFloat(dia),
        timestamp: record.time ? new Date(record.time).toISOString() : new Date().toISOString(),
        startTime: record.time ? new Date(record.time).toISOString() : null,
        endTime: record.time ? new Date(record.time).toISOString() : null,
        source: 'health_connect',
        device: record.metadata?.device?.model || 'Wear OS Device',
        quality: 'device_measured',
      };
    }

    let val = 0;
    let unit = 'count';

    if (metricType === 'heart_rate' || metricType === 'resting_heart_rate') {
      val = record.samples && record.samples.length > 0 ? record.samples[0].beatsPerMinute : record.beatsPerMinute || 0;
      unit = 'bpm';
    } else if (metricType === 'hrv') {
      val = record.heartRateVariabilityMillis || (record.samples && record.samples.length > 0 ? record.samples[0].heartRateVariabilityMillis : 0) || 0;
      unit = 'ms';
    } else if (metricType === 'steps') {
      val = record.count || 0;
      unit = 'count';
    } else if (metricType === 'spo2') {
      val = record.percentage || 0;
      unit = '%';
    } else if (metricType === 'body_temperature') {
      val = record.temperature?.inCelsius || record.temperature || 0;
      unit = '°C';
    } else if (metricType === 'respiratory_rate') {
      val = record.rate || 0;
      unit = 'breaths/min';
    } else if (metricType === 'distance') {
      val = record.distance?.inMeters || record.distance || 0;
      unit = 'm';
    } else if (metricType === 'active_calories') {
      val = record.energy?.inKilocalories || record.energy || 0;
      unit = 'kcal';
    }

    return {
      userId,
      metric: metricType,
      value: parseFloat(val),
      unit,
      timestamp: record.startTime || record.time ? new Date(record.startTime || record.time).toISOString() : new Date().toISOString(),
      startTime: record.startTime ? new Date(record.startTime).toISOString() : null,
      endTime: record.endTime ? new Date(record.endTime).toISOString() : null,
      source: 'health_connect',
      device: record.metadata?.device?.model || 'Wear OS Device',
      quality: 'device_measured',
    };
  }

  /**
   * Normalizes direct BLE device measurement (e.g. Omron Blood Pressure)
   */
  normalizeDirectBP(systolic, diastolic, deviceId = 'omron-ble-cuff', userId = 'default') {
    return {
      userId,
      metric: 'blood_pressure',
      value: null,
      unit: 'mmHg',
      systolic: parseFloat(systolic),
      diastolic: parseFloat(diastolic),
      timestamp: new Date().toISOString(),
      source: 'direct_bp_device',
      device: deviceId,
      quality: 'cuff_verified',
    };
  }
}

export default new HealthDataNormalizer();
