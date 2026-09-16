/**
 * Luminix Mobile Health Bridge — Live Monitoring Manager
 * Architectural Reference: Section 5 & 13 (Real-Time Live Streaming)
 * High-frequency sensor reader and streaming pipeline to WebSocket.
 */

import AuthManager from '../Authentication/AuthManager';
import HealthDataReader from '../HealthDataReader/HealthDataReader';
import WebSocketManager from '../WebSocketManager/WebSocketManager';

class LiveMonitoringManager {
  constructor() {
    this.isMonitoring = false;
    this.streamInterval = null;
    this.currentHeartRate = null;
    this.activeSessionId = null;
  }

  /**
   * Starts high-frequency live monitoring session.
   */
  async startLiveSession(sessionType = 'monitoring') {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Connect WebSocket
    WebSocketManager.connect();

    // Notify backend
    try {
      const res = await fetch(`${AuthManager.apiBaseUrl}/api/v1/health/live/start`, {
        method: 'POST',
        headers: AuthManager.getHeaders(),
        body: JSON.stringify({
          userId: AuthManager.userId,
          sessionType,
          source: 'health_bridge',
        }),
      });
      const data = await res.json();
      this.activeSessionId = data.session_id;
    } catch (e) {
      console.warn('[LiveMonitoringManager] live/start API warning:', e);
    }

    // High frequency sample loop (every 2-3 seconds for live cardio/thermal vitals)
    this.streamInterval = setInterval(async () => {
      try {
        const vitals = await HealthDataReader.readAllCurrentVitals(AuthManager.userId);
        if (vitals && vitals.length > 0) {
          const hrRecord = vitals.find((v) => v.metric === 'heart_rate');
          if (hrRecord) this.currentHeartRate = hrRecord.value;

          WebSocketManager.send({
            type: 'live_packet',
            sessionId: this.activeSessionId,
            userId: AuthManager.userId,
            samples: vitals,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[LiveMonitoringManager] sample iteration error:', err);
      }
    }, 2500);
  }

  /**
   * Stops live monitoring session.
   */
  async stopLiveSession() {
    this.isMonitoring = false;
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }

    try {
      await fetch(`${AuthManager.apiBaseUrl}/api/v1/health/live/stop?user_id=${AuthManager.userId}`, {
        method: 'POST',
        headers: AuthManager.getHeaders(),
      });
    } catch (e) {}

    WebSocketManager.send({
      type: 'stop_session',
      sessionId: this.activeSessionId,
      userId: AuthManager.userId,
    });
  }
}

export default new LiveMonitoringManager();
