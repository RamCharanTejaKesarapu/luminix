/**
 * Luminix Mobile Health Bridge — Unified Health Data Reader
 * Abstracted unified reader coordinating platform adapters (iOS / Android),
 * normalization, and validation.
 */

import { Platform } from 'react-native';
import HealthKitAdapter from '../HealthKitAdapter/HealthKitAdapter';
import HealthConnectAdapter from '../HealthConnectAdapter/HealthConnectAdapter';
import HealthDataNormalizer from '../HealthDataNormalizer/HealthDataNormalizer';
import HealthDataValidator from '../HealthDataValidator/HealthDataValidator';

class HealthDataReader {
  constructor() {
    this.platform = Platform.OS;
  }

  getAdapter() {
    if (this.platform === 'ios') return HealthKitAdapter;
    if (this.platform === 'android') return HealthConnectAdapter;
    return null;
  }

  /**
   * Reads all active vitals from the native health store.
   */
  async readAllCurrentVitals(userId = 'default') {
    const records = [];

    try {
      if (this.platform === 'ios') {
        // Read iOS HealthKit
        const hrSamples = await HealthKitAdapter.getHeartRateSamples(new Date(Date.now() - 15 * 60000), 5);
        if (hrSamples && hrSamples.length > 0) {
          const normHR = HealthDataNormalizer.normalizeHealthKitSample(hrSamples[0], 'heart_rate', userId);
          if (normHR) records.push(normHR);
        }

        const steps = await HealthKitAdapter.getStepCount();
        const normSteps = HealthDataNormalizer.normalizeHealthKitSample({ value: steps }, 'steps', userId);
        if (normSteps) records.push(normSteps);

        const spo2Samples = await HealthKitAdapter.getOxygenSaturationSamples();
        if (spo2Samples && spo2Samples.length > 0) {
          const normSpo2 = HealthDataNormalizer.normalizeHealthKitSample(spo2Samples[0], 'spo2', userId);
          if (normSpo2) records.push(normSpo2);
        }

        const tempSamples = await HealthKitAdapter.getBodyTemperatureSamples();
        if (tempSamples && tempSamples.length > 0) {
          const normTemp = HealthDataNormalizer.normalizeHealthKitSample(tempSamples[0], 'body_temperature', userId);
          if (normTemp) records.push(normTemp);
        }

        const bpSample = await HealthKitAdapter.getLatestBloodPressure();
        if (bpSample) {
          const normBP = HealthDataNormalizer.normalizeHealthKitSample(bpSample, 'blood_pressure', userId);
          if (normBP) records.push(normBP);
        }
      } else if (this.platform === 'android') {
        // Read Android Health Connect
        const hrRecords = await HealthConnectAdapter.readHeartRate();
        if (hrRecords && hrRecords.length > 0) {
          const normHR = HealthDataNormalizer.normalizeHealthConnectRecord(hrRecords[hrRecords.length - 1], 'heart_rate', userId);
          if (normHR) records.push(normHR);
        }

        const stepsRecords = await HealthConnectAdapter.readSteps();
        if (stepsRecords && stepsRecords.length > 0) {
          const totalSteps = stepsRecords.reduce((acc, curr) => acc + (curr.count || 0), 0);
          const normSteps = HealthDataNormalizer.normalizeHealthConnectRecord({ count: totalSteps }, 'steps', userId);
          if (normSteps) records.push(normSteps);
        }

        const bpRecords = await HealthConnectAdapter.readBloodPressure();
        if (bpRecords && bpRecords.length > 0) {
          const normBP = HealthDataNormalizer.normalizeHealthConnectRecord(bpRecords[bpRecords.length - 1], 'blood_pressure', userId);
          if (normBP) records.push(normBP);
        }
      }
    } catch (err) {
      console.warn('[HealthDataReader] readAllCurrentVitals error:', err);
    }

    return HealthDataValidator.filterValidRecords(records);
  }
}

export default new HealthDataReader();
