/**
 * Luminix Mobile Health Bridge — Authentication Module
 * Manages API server tokens, host configuration, and secure credential storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_ENDPOINT_KEY = '@luminix_api_base_url';
const AUTH_TOKEN_KEY = '@luminix_auth_token';
const USER_ID_KEY = '@luminix_user_id';

class AuthManager {
  constructor() {
    this.apiBaseUrl = 'https://api.luminix.fit';
    this.authToken = null;
    this.userId = 'default';
  }

  async initialize() {
    try {
      const storedUrl = await AsyncStorage.getItem(API_ENDPOINT_KEY);
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_ID_KEY);

      if (storedUrl) this.apiBaseUrl = storedUrl;
      if (storedToken) this.authToken = storedToken;
      if (storedUser) this.userId = storedUser;
    } catch (e) {
      console.warn('[AuthManager] Failed to load cached auth credentials', e);
    }
  }

  async setApiBaseUrl(url) {
    this.apiBaseUrl = url.replace(/\/+$/, '');
    await AsyncStorage.setItem(API_ENDPOINT_KEY, this.apiBaseUrl);
  }

  async setSession(token, userId) {
    this.authToken = token;
    this.userId = userId || 'default';
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_ID_KEY, this.userId);
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Luminix-Client': 'MobileBridge-ReactNative/1.0',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  getWebSocketUrl() {
    const wsProto = this.apiBaseUrl.startsWith('https') ? 'wss://' : 'ws://';
    const host = this.apiBaseUrl.replace(/^https?:\/\//, '');
    return `${wsProto}${host}/api/v1/health/live/ws`;
  }
}

export default new AuthManager();
