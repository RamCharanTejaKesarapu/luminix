/**
 * Luminix Mobile Health Bridge — WebSocket Manager
 * Maintains resilient bi-directional WebSocket session to /api/v1/health/live/ws
 * for live telemetry uplink and cardiac/heart risk alerts reception.
 */

import AuthManager from '../Authentication/AuthManager';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.listeners = new Set();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = AuthManager.getWebSocketUrl();
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyListeners({ type: 'STATUS_CHANGE', status: 'connected' });

        // Identify bridge client
        this.send({
          type: 'register_bridge',
          userId: AuthManager.userId,
          platform: 'mobile_bridge',
          timestamp: new Date().toISOString(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.notifyListeners(packet);
        } catch (e) {
          console.warn('[WebSocketManager] Failed to parse inbound packet', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocketManager] WebSocket error:', err.message);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyListeners({ type: 'STATUS_CHANGE', status: 'disconnected' });
        this.scheduleReconnect();
      };
    } catch (e) {
      console.warn('[WebSocketManager] connection initialization failed:', e);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected) {
        this.connect();
      }
    }, 4000);
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('[WebSocketManager] listener callback threw:', e);
      }
    });
  }
}

export default new WebSocketManager();
