// services/socket/ConnectionManager.js - Manages socket connection lifecycle
import { Platform, AppState, NetInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_EVENTS } from './EventTypes';

class ConnectionManager {
  constructor(socketInstance) {
    this.socket = socketInstance;
    this.isConnected = false;
    this.isOnline = true;
    this.appState = 'active';
    this.reconnectionEnabled = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.pingInterval = null;
    this.pingTimeout = 30000;
    this.lastPongTime = null;
    
    // Connection state listeners
    this.connectionListeners = new Set();
    
    this.initializeListeners();
  }

  // ====================
  // INITIALIZATION
  // ====================

  initializeListeners() {
    // App state changes (background/foreground)
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Network connectivity
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
    
    // Socket connection events
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Connection established
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('✅ Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.startPingPong();
      this.notifyConnectionChange(true);
    });

    // Connection lost
    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this.stopPingPong();
      this.notifyConnectionChange(false);
      
      if (this.shouldReconnect(reason)) {
        this.attemptReconnection();
      }
    });

    // Connection error
    this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('🔌 Socket connection error:', error.message);
      this.handleConnectionError(error);
    });

    // Reconnect events
    this.socket.on(SOCKET_EVENTS.RECONNECT, (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on(SOCKET_EVENTS.RECONNECT_FAILED, () => {
      console.error('❌ Reconnection failed');
      this.reconnectionEnabled = false;
    });

    // Ping/Pong for connection health
    this.socket.on(SOCKET_EVENTS.PONG, () => {
      this.lastPongTime = Date.now();
    });
  }

  // ====================
  // CONNECTION MANAGEMENT
  // ====================

  connect() {
    if (this.socket && !this.isConnected) {
      console.log('🔌 Attempting to connect socket...');
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket && this.isConnected) {
      console.log('🔌 Manually disconnecting socket...');
      this.reconnectionEnabled = false;
      this.socket.disconnect();
      this.isConnected = false;
      this.stopPingPong();
      this.notifyConnectionChange(false);
    }
  }

  reconnect() {
    if (this.socket && !this.isConnected && this.reconnectionEnabled) {
      console.log('🔄 Manual reconnection triggered');
      this.reconnectionEnabled = true;
      this.reconnectAttempts = 0;
      this.socket.connect();
    }
  }

  // ====================
  // RECONNECTION LOGIC
  // ====================

  shouldReconnect(reason) {
    // Don't reconnect if manually disconnected or reconnection disabled
    if (!this.reconnectionEnabled) return false;
    
    // Don't reconnect on these reasons
    const noReconnectReasons = [
      'io client disconnect',
      'io server disconnect',
      'transport close'
    ];
    
    return !noReconnectReasons.includes(reason);
  }

  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.reconnectionEnabled = false;
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    ) + Math.random() * 1000;

    console.log(`⏳ Reconnecting in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.reconnectionEnabled && !this.isConnected) {
        this.socket.connect();
      }
    }, delay);
  }

  // ====================
  // PING/PONG HEALTH CHECK
  // ====================

  startPingPong() {
    this.stopPingPong();
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        // Send ping
        this.socket.emit(SOCKET_EVENTS.PING, Date.now());
        
        // Check if we got pong recently
        if (this.lastPongTime && Date.now() - this.lastPongTime > this.pingTimeout * 2) {
          console.warn('⚠️ No pong received, connection might be stale');
          this.socket.disconnect();
        }
      }
    }, this.pingTimeout);
  }

  stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ====================
  // EVENT HANDLERS
  // ====================

  handleAppStateChange(nextAppState) {
    this.appState = nextAppState;
    
    if (nextAppState === 'background') {
      console.log('📱 App in background - adjusting connection');
      // Reduce ping frequency in background
      this.pingTimeout = 60000;
      this.startPingPong();
    } else if (nextAppState === 'active') {
      console.log('📱 App in foreground - normal connection');
      this.pingTimeout = 30000;
      this.startPingPong();
      
      // Reconnect if disconnected while in background
      if (!this.isConnected && this.reconnectionEnabled) {
        setTimeout(() => this.reconnect(), 1000);
      }
    }
  }

  handleNetworkChange(state) {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected;
    
    if (!wasOnline && this.isOnline) {
      console.log('🌐 Network restored - reconnecting socket');
      this.reconnectionEnabled = true;
      this.reconnect();
    } else if (wasOnline && !this.isOnline) {
      console.log('🌐 Network lost - socket will auto-reconnect');
    }
  }

  handleConnectionError(error) {
    // Log error for debugging
    console.error('Connection error details:', {
      message: error.message,
      code: error.code,
      type: error.type
    });
    
    // Notify listeners
    this.notifyConnectionError(error);
    
    // Attempt reconnection for certain errors
    if (this.shouldReconnectOnError(error)) {
      setTimeout(() => this.attemptReconnection(), 2000);
    }
  }

  shouldReconnectOnError(error) {
    const reconnectErrors = [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENETUNREACH'
    ];
    
    return reconnectErrors.includes(error.code) && this.reconnectionEnabled;
  }

  // ====================
  // LISTENER MANAGEMENT
  // ====================

  addConnectionListener(callback) {
    this.connectionListeners.add(callback);
  }

  removeConnectionListener(callback) {
    this.connectionListeners.delete(callback);
  }

  notifyConnectionChange(isConnected) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  notifyConnectionError(error) {
    this.connectionListeners.forEach(callback => {
      try {
        if (callback.onError) {
          callback.onError(error);
        }
      } catch (err) {
        console.error('Error in connection error listener:', err);
      }
    });
  }

  // ====================
  // STATUS & INFO
  // ====================

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isOnline: this.isOnline,
      appState: this.appState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      reconnectionEnabled: this.reconnectionEnabled,
      lastPongTime: this.lastPongTime,
      pingTimeout: this.pingTimeout
    };
  }

  isHealthy() {
    if (!this.isConnected) return false;
    
    // Check if we've received pong recently
    if (this.lastPongTime) {
      const timeSincePong = Date.now() - this.lastPongTime;
      return timeSincePong < this.pingTimeout * 3;
    }
    
    return true;
  }

  // ====================
  // CLEANUP
  // ====================

  cleanup() {
    console.log('🧹 Cleaning up ConnectionManager');
    
    // Stop ping/pong
    this.stopPingPong();
    
    // Remove listeners
    AppState.removeEventListener('change', this.handleAppStateChange);
    
    // Clear all connection listeners
    this.connectionListeners.clear();
    
    // Disconnect socket
    if (this.socket) {
      this.socket.off(SOCKET_EVENTS.CONNECT);
      this.socket.off(SOCKET_EVENTS.DISCONNECT);
      this.socket.off(SOCKET_EVENTS.CONNECT_ERROR);
      this.socket.off(SOCKET_EVENTS.RECONNECT);
      this.socket.off(SOCKET_EVENTS.RECONNECT_ATTEMPT);
      this.socket.off(SOCKET_EVENTS.RECONNECT_FAILED);
      this.socket.off(SOCKET_EVENTS.PONG);
    }
    
    // Reset state
    this.isConnected = false;
    this.reconnectionEnabled = false;
    this.reconnectAttempts = 0;
  }
}

export default ConnectionManager;