/**
 * Luminix Mobile Health Bridge — Local Health Database
 * Provides offline-first persistence for health samples, managing unsynced queues
 * and sync watermarks.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const UNSYNCED_RECORDS_KEY = '@luminix_unsynced_health_records';
const LAST_SYNC_WATERMARK_KEY = '@luminix_last_sync_timestamp';

class LocalHealthDB {
  /**
   * Enqueues validated records for cloud synchronization.
   */
  async enqueueRecords(records) {
    if (!records || records.length === 0) return;
    try {
      const existingRaw = await AsyncStorage.getItem(UNSYNCED_RECORDS_KEY);
      const queue = existingRaw ? JSON.parse(existingRaw) : [];
      queue.push(...records);

      // Keep max 5000 items in offline cache
      const capped = queue.slice(-5000);
      await AsyncStorage.setItem(UNSYNCED_RECORDS_KEY, JSON.stringify(capped));
    } catch (e) {
      console.warn('[LocalHealthDB] enqueueRecords error:', e);
    }
  }

  /**
   * Retrieves pending unsynced records up to limit.
   */
  async getUnsyncedRecords(limit = 100) {
    try {
      const raw = await AsyncStorage.getItem(UNSYNCED_RECORDS_KEY);
      if (!raw) return [];
      const queue = JSON.parse(raw);
      return queue.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  /**
   * Acknowledges successfully synced records and marks watermark.
   */
  async acknowledgeSynced(count, syncWatermark) {
    try {
      const raw = await AsyncStorage.getItem(UNSYNCED_RECORDS_KEY);
      if (!raw) return;
      const queue = JSON.parse(raw);
      const remaining = queue.slice(count);
      await AsyncStorage.setItem(UNSYNCED_RECORDS_KEY, JSON.stringify(remaining));

      if (syncWatermark) {
        await AsyncStorage.setItem(LAST_SYNC_WATERMARK_KEY, syncWatermark);
      }
    } catch (e) {
      console.warn('[LocalHealthDB] acknowledgeSynced error:', e);
    }
  }

  async getLastSyncWatermark() {
    return await AsyncStorage.getItem(LAST_SYNC_WATERMARK_KEY);
  }
}

export default new LocalHealthDB();
