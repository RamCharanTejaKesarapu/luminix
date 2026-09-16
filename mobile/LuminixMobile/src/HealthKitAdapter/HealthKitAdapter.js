/**
 * Luminix Mobile Health Bridge — Apple HealthKit Adapter (iOS)
 * Interfaces with Apple HealthKit via react-native-health.
 * Architectural Reference: Section 3 (Apple HealthKit Architecture)
 */

import { NativeModules, Platform } from 'react-native';

class HealthKitAdapter {
  constructor() {
    this.isAvailable = Platform.OS === 'ios';
    this.AppleHealthKit = null;
    if (this.isAvailable) {
      try {
        const HealthKitPkg = require('react-native-health');
        this.AppleHealthKit = HealthKitPkg.default || HealthKitPkg;
      } catch (e) {
        console.warn('[HealthKitAdapter] react-native-health not installed or not linked in current host.');
      }
    }
  }

  getPermissions() {
    if (!this.AppleHealthKit) return {};
    const { Constants } = this.AppleHealthKit;
    const Perms = Constants ? Constants.Permissions : {};
    return {
      permissions: {
        read: [
          Perms.HeartRate || 'HeartRate',
          Perms.RestingHeartRate || 'RestingHeartRate',
          Perms.HeartRateVariability || 'HeartRateVariability',
          Perms.StepCount || 'StepCount',
          Perms.DistanceWalkingRunning || 'DistanceWalkingRunning',
          Perms.ActiveEnergyBurned || 'ActiveEnergyBurned',
          Perms.OxygenSaturation || 'OxygenSaturation',
          Perms.BodyTemperature || 'BodyTemperature',
          Perms.RespiratoryRate || 'RespiratoryRate',
          Perms.SleepAnalysis || 'SleepAnalysis',
          Perms.BloodPressureSystolic || 'BloodPressureSystolic',
          Perms.BloodPressureDiastolic || 'BloodPressureDiastolic',
        ],
        write: [],
      },
    };
  }

  async requestPermissions() {
    if (!this.AppleHealthKit) return false;
    return new Promise((resolve, reject) => {
      const options = this.getPermissions();
      this.AppleHealthKit.initHealthKit(options, (err, results) => {
        if (err) {
          console.error('[HealthKitAdapter] initHealthKit error:', err);
          return reject(err);
        }
        resolve(true);
      });
    });
  }

  async hasPermissions() {
    if (!this.AppleHealthKit) return false;
    return new Promise((resolve) => {
      this.AppleHealthKit.getAuthStatus(this.getPermissions(), (err, result) => {
        if (err || !result) return resolve(false);
        resolve(true);
      });
    });
  }

  async getHeartRateSamples(startDate, limit = 50) {
    if (!this.AppleHealthKit) return [];
    return new Promise((resolve) => {
      const options = {
        startDate: startDate ? new Date(startDate).toISOString() : new Date(Date.now() - 3600000).toISOString(),
        limit,
        ascending: false,
      };
      this.AppleHealthKit.getHeartRateSamples(options, (err, results) => {
        if (err || !results) return resolve([]);
        resolve(results);
      });
    });
  }

  async getLatestBloodPressure() {
    if (!this.AppleHealthKit) return null;
    return new Promise((resolve) => {
      const options = {
        startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
        limit: 1,
        ascending: false,
      };
      this.AppleHealthKit.getBloodPressureSamples(options, (err, results) => {
        if (err || !results || results.length === 0) return resolve(null);
        resolve(results[0]);
      });
    });
  }

  async getStepCount(startDate) {
    if (!this.AppleHealthKit) return 0;
    return new Promise((resolve) => {
      const options = {
        startDate: startDate ? new Date(startDate).toISOString() : new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      };
      this.AppleHealthKit.getStepCount(options, (err, results) => {
        if (err || !results) return resolve(0);
        resolve(results.value || 0);
      });
    });
  }

  async getOxygenSaturationSamples() {
    if (!this.AppleHealthKit) return [];
    return new Promise((resolve) => {
      const options = {
        startDate: new Date(Date.now() - 24 * 3600000).toISOString(),
        limit: 10,
        ascending: false,
      };
      this.AppleHealthKit.getOxygenSaturationSamples(options, (err, results) => {
        if (err || !results) return resolve([]);
        resolve(results);
      });
    });
  }

  async getBodyTemperatureSamples() {
    if (!this.AppleHealthKit) return [];
    return new Promise((resolve) => {
      const options = {
        startDate: new Date(Date.now() - 24 * 3600000).toISOString(),
        limit: 5,
        ascending: false,
      };
      this.AppleHealthKit.getBodyTemperatureSamples(options, (err, results) => {
        if (err || !results) return resolve([]);
        resolve(results);
      });
    });
  }
}

export default new HealthKitAdapter();
