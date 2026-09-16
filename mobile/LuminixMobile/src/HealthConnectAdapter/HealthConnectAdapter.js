/**
 * Luminix Mobile Health Bridge — Android Health Connect Adapter
 * Interfaces with Android Health Connect via react-native-health-connect.
 * Architectural Reference: Section 4 (Android Health Connect Architecture)
 */

import { Platform } from 'react-native';

class HealthConnectAdapter {
  constructor() {
    this.isAvailable = Platform.OS === 'android';
    this.HealthConnect = null;
    if (this.isAvailable) {
      try {
        this.HealthConnect = require('react-native-health-connect');
      } catch (e) {
        console.warn('[HealthConnectAdapter] react-native-health-connect not linked in current host.');
      }
    }
  }

  async initialize() {
    if (!this.HealthConnect) return false;
    try {
      const initialized = await this.HealthConnect.initialize();
      return !!initialized;
    } catch (e) {
      console.warn('[HealthConnectAdapter] initialization failed:', e);
      return false;
    }
  }

  async requestPermissions() {
    if (!this.HealthConnect) return false;
    try {
      const permissions = [
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'BodyTemperature' },
        { accessType: 'read', recordType: 'RespiratoryRate' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'BloodPressure' },
      ];
      const granted = await this.HealthConnect.requestPermission(permissions);
      return !!granted;
    } catch (e) {
      console.error('[HealthConnectAdapter] requestPermission error:', e);
      return false;
    }
  }

  async hasPermissions() {
    if (!this.HealthConnect) return false;
    try {
      const perms = await this.HealthConnect.getGrantedPermissions();
      return perms && perms.length > 0;
    } catch (e) {
      return false;
    }
  }

  async readHeartRate(timeRangeFilter) {
    if (!this.HealthConnect) return [];
    try {
      const filter = timeRangeFilter || {
        operator: 'between',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
      };
      const response = await this.HealthConnect.readRecords('HeartRate', { timeRangeFilter: filter });
      return response.records || [];
    } catch (e) {
      console.warn('[HealthConnectAdapter] readRecords HeartRate error:', e);
      return [];
    }
  }

  async readBloodPressure(timeRangeFilter) {
    if (!this.HealthConnect) return [];
    try {
      const filter = timeRangeFilter || {
        operator: 'between',
        startTime: new Date(Date.now() - 7 * 86400000).toISOString(),
        endTime: new Date().toISOString(),
      };
      const response = await this.HealthConnect.readRecords('BloodPressure', { timeRangeFilter: filter });
      return response.records || [];
    } catch (e) {
      console.warn('[HealthConnectAdapter] readRecords BloodPressure error:', e);
      return [];
    }
  }

  async readSteps(startTime, endTime) {
    if (!this.HealthConnect) return [];
    try {
      const filter = {
        operator: 'between',
        startTime: startTime || new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        endTime: endTime || new Date().toISOString(),
      };
      const response = await this.HealthConnect.readRecords('Steps', { timeRangeFilter: filter });
      return response.records || [];
    } catch (e) {
      return [];
    }
  }
}

export default new HealthConnectAdapter();
