/**
 * Luminix Mobile Health Bridge — Health Permissions Manager
 * Unified permission orchestrator for iOS Apple HealthKit and Android Google Health Connect.
 */

import { Platform } from 'react-native';

class PermissionManager {
  constructor() {
    this.permissionsGranted = false;
    this.activePlatform = Platform.OS; // 'ios' | 'android'
  }

  async checkPermissions(healthAdapter) {
    if (!healthAdapter) return false;
    try {
      if (this.activePlatform === 'ios') {
        return await healthAdapter.hasPermissions();
      } else if (this.activePlatform === 'android') {
        return await healthAdapter.hasPermissions();
      }
      return true;
    } catch (err) {
      console.warn('[PermissionManager] checkPermissions error:', err);
      return false;
    }
  }

  async requestPermissions(healthAdapter) {
    if (!healthAdapter) {
      throw new Error('Health adapter unavailable for platform: ' + this.activePlatform);
    }
    try {
      const granted = await healthAdapter.requestPermissions();
      this.permissionsGranted = !!granted;
      return this.permissionsGranted;
    } catch (err) {
      console.error('[PermissionManager] requestPermissions failed:', err);
      throw err;
    }
  }

  getRequiredMetricKeys() {
    return [
      'heart_rate',
      'resting_heart_rate',
      'hrv',
      'steps',
      'distance',
      'active_calories',
      'spo2',
      'body_temperature',
      'respiratory_rate',
      'sleep',
      'blood_pressure',
    ];
  }
}

export default new PermissionManager();
