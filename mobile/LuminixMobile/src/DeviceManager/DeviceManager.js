/**
 * Luminix Mobile Health Bridge — Device Manager
 * Manages direct Bluetooth Low Energy (BLE) peripheral pairings such as dedicated
 * Blood Pressure cuffs (Omron Evolv, Beurer BM) and chest strap HR monitors.
 * Architectural Reference: Section 6 & 11 (Dedicated BP Devices)
 */

import HealthDataNormalizer from '../HealthDataNormalizer/HealthDataNormalizer';
import LocalHealthDB from '../LocalHealthDatabase/LocalHealthDB';

class DeviceManager {
  constructor() {
    // Zero pre-seeded devices — only devices that physically pair via BLE are registered.
    this.pairedDevices = [];
  }

  getPairedDevices() {
    return this.pairedDevices;
  }

  /**
   * Parses standard Bluetooth SIG Blood Pressure Characteristic (0x2A35)
   */
  parseBloodPressureGATT(buffer) {
    if (!buffer || buffer.length < 5) return null;

    // Standard BLE Blood Pressure Measurement syntax
    // Byte 0: Flags (Units: 0 = mmHg, 1 = kPa)
    // Bytes 1-2: Systolic (SFLOAT)
    // Bytes 3-4: Diastolic (SFLOAT)
    const systolic = buffer[1] | (buffer[2] << 8);
    const diastolic = buffer[3] | (buffer[4] << 8);

    return { systolic, diastolic };
  }

  /**
   * Ingests cuff-measured Blood Pressure directly from BLE device
   */
  async recordDirectBPMeasurement(systolic, diastolic, deviceId = 'omron_evolv_01') {
    const normBP = HealthDataNormalizer.normalizeDirectBP(systolic, diastolic, deviceId);
    await LocalHealthDB.enqueueRecords([normBP]);

    let dev = this.pairedDevices.find((d) => d.id === deviceId);
    if (!dev) {
      // Auto-register device on first measurement
      dev = {
        id: deviceId,
        name: `BLE BP Device (${deviceId})`,
        type: 'direct_bp_device',
        connectionType: 'BLE GATT (0x1810)',
        status: 'paired',
        lastMeasurement: null,
      };
      this.pairedDevices.push(dev);
    }
    dev.lastMeasurement = {
      systolic,
      diastolic,
      timestamp: normBP.timestamp,
    };

    return normBP;
  }
}

export default new DeviceManager();
