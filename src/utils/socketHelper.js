// src/utils/socketHelper.js
import Config from '../config';

class SocketHelper {
  static getSocketUrl() {
    const baseUrl = Config.API.SOCKET_URL;
    
    // Ensure correct protocol
    if (baseUrl.startsWith('http://')) {
      return baseUrl.replace('http://', 'ws://');
    } else if (baseUrl.startsWith('https://')) {
      return baseUrl.replace('https://', 'wss://');
    }
    
    // Default to ws://
    return `ws://${baseUrl}`;
  }

  static getSocketOptions() {
    return {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true,
      path: '/socket.io',
    };
  }

  static checkConnectionStatus(socket) {
    if (!socket) return false;
    
    return socket.connected;
  }

  static async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
}

export default SocketHelper;