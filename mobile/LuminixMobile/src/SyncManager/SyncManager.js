/**
 * Luminix Mobile Health Bridge — Sync Manager
 * Orchestrates periodic delta syncs, reading newly acquired health data,
 * caching locally, and posting batches to Luminix Backend /api/v1/health/sync.
 */

import AuthManager from '../Authentication/AuthManager';
import HealthDataReader from '../HealthDataReader/HealthDataReader';
import LocalHealthDB from '../LocalHealthDatabase/LocalHealthDB';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncIntervalId = null;
    this.onSyncProgressCallback = null;
  }

  setProgressListener(cb) {
    this.onSyncProgressCallback = cb;
  }

  emitProgress(stage, message, percent) {
    if (this.onSyncProgressCallback) {
      this.onSyncProgressCallback({ stage, message, percent });
    }
  }

  /**
   * Executes a full or incremental synchronization pass.
   */
  async syncNow() {
    if (this.isSyncing) return { status: 'already_running' };
    this.isSyncing = true;

    try {
      this.emitProgress('CONNECT', 'Checking HealthKit / Health Connect connection...', 10);
      const newRecords = await HealthDataReader.readAllCurrentVitals(AuthManager.userId);

      this.emitProgress('CACHE', `Normalizing ${newRecords.length} health metric samples...`, 30);
      await LocalHealthDB.enqueueRecords(newRecords);

      this.emitProgress('READ_QUEUE', 'Preparing sync batch for cloud uplink...', 50);
      const pendingBatch = await LocalHealthDB.getUnsyncedRecords(100);

      if (pendingBatch.length === 0) {
        this.emitProgress('COMPLETE', 'All local health metrics already in sync.', 100);
        this.isSyncing = false;
        return { success: true, count: 0 };
      }

      this.emitProgress('UPLINK', `Transmitting ${pendingBatch.length} samples to Luminix API...`, 75);
      const watermark = await LocalHealthDB.getLastSyncWatermark();

      const payload = {
        userId: AuthManager.userId,
        lastSyncTimestamp: watermark,
        source: pendingBatch[0]?.source || 'healthkit',
        sync_mode: 'incremental',
        samples: pendingBatch,
      };

      const res = await fetch(`${AuthManager.apiBaseUrl}/api/v1/health/sync`, {
        method: 'POST',
        headers: AuthManager.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Sync API responded with HTTP status ${res.status}`);
      }

      const resData = await res.json();
      await LocalHealthDB.acknowledgeSynced(pendingBatch.length, resData.next_sync_cursor);

      this.emitProgress('COMPLETE', `Synced ${resData.saved_count || pendingBatch.length} samples successfully.`, 100);
      this.isSyncing = false;
      return { success: true, count: resData.saved_count || pendingBatch.length, data: resData };
    } catch (err) {
      console.error('[SyncManager] sync error:', err);
      this.emitProgress('ERROR', `Sync failed: ${err.message}`, 0);
      this.isSyncing = false;
      return { success: false, error: err.message };
    }
  }

  /**
   * Starts periodic background sync loop.
   */
  startBackgroundSync(intervalMinutes = 15) {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    this.syncIntervalId = setInterval(() => {
      this.syncNow();
    }, intervalMinutes * 60 * 1000);
  }

  stopBackgroundSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }
}

export default new SyncManager();
