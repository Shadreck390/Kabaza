// services/socket/realtimeUpdates.js - COMPLETE FIXED VERSION
import io from 'socket.io-client';
import { Alert, Platform } from 'react-native';

const SOCKET_CONFIG = {
  SOCKET_URL: 'http://192.168.8.2:3000', // Your PC backend socket
  RECONNECTION_ATTEMPTS: 3,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  TIMEOUT: 10000,
  AUTO_CONNECT: false,
};
// Create a simple socket service object (not a class)
const socketService = {
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  eventCallbacks: new Map(),
  connectionListeners: new Set(),
  activeSubscriptions: new Set(),

  initializeSocket(userData = null) {
    try {
      if (this.socket && this.isConnected) {
        console.log('🔌 Socket already connected');
        return this.socket;
      }

      console.log('🔄 Initializing socket connection...');

      
      this.socket = io(SOCKET_CONFIG.SOCKET_URL, {
        autoConnect: false,
        reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
        reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
        reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
        timeout: SOCKET_CONFIG.TIMEOUT,
        transports: ['websocket', 'polling'],
        query: userData ? {
          userId: userData.id,
          userType: userData.role,
          platform: Platform.OS,
          appVersion: '1.0.0',
        } : {},
      });

      // Setup event listeners
      this.setupEventListeners();
      
      return this.socket;
    } catch (error) {
      console.error('❌ Socket initialization failed:', error);
      throw error;
    }
  },

  setupEventListeners() {
    if (!this.socket) return;

    // Basic connection events
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
    this.socket.on('connect_error', (error) => this.handleConnectError(error));
    this.socket.on('reconnect', (attemptNumber) => this.handleReconnect(attemptNumber));
    this.socket.on('reconnect_attempt', (attemptNumber) => this.handleReconnectAttempt(attemptNumber));
    this.socket.on('reconnect_error', (error) => this.handleReconnectError(error));
    this.socket.on('reconnect_failed', () => this.handleReconnectFailed());

    // Application events
    this.socket.on('ride-matched', (data) => this.emitToCallbacks('ride-matched', data));
    this.socket.on('ride-accepted', (data) => this.emitToCallbacks('ride-accepted', data));
    this.socket.on('driver-enroute', (data) => this.emitToCallbacks('driver-enroute', data));
    this.socket.on('driver-arrived', (data) => this.emitToCallbacks('driver-arrived', data));
    this.socket.on('ride-started', (data) => this.emitToCallbacks('ride-started', data));
    this.socket.on('ride-completed', (data) => this.emitToCallbacks('ride-completed', data));
    this.socket.on('ride-cancelled', (data) => this.emitToCallbacks('ride-cancelled', data));
    this.socket.on('ride-update', (data) => this.emitToCallbacks('ride-update', data));
    this.socket.on('driver-location', (data) => this.emitToCallbacks('driver-location', data));
    this.socket.on('notification', (data) => this.emitToCallbacks('notification', data));
    this.socket.on('chat-message', (data) => this.emitToCallbacks('chat-message', data));
  },

  handleConnect() {
    console.log('✅ Socket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners(true);
    this.emitToCallbacks('connection', { status: 'connected', socketId: this.socket?.id });
  },

  handleDisconnect(reason) {
    console.log('🔌 Socket disconnected:', reason);
    this.isConnected = false;
    this.notifyConnectionListeners(false);
    this.emitToCallbacks('connection', { status: 'disconnected', reason });
  },

  handleConnectError(error) {
    console.error('❌ Socket connection error:', error);
    this.notifyConnectionListeners(false);
    this.emitToCallbacks('connection-error', { error: error.message });
  },

  handleReconnect(attemptNumber) {
    console.log(`🔁 Socket reconnected after ${attemptNumber} attempts`);
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners(true);
    this.emitToCallbacks('reconnection', { attemptNumber });
  },

  handleReconnectAttempt(attemptNumber) {
    this.reconnectAttempts = attemptNumber;
    console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    this.emitToCallbacks('reconnection-attempt', { attemptNumber });
  },

  handleReconnectError(error) {
    console.error('❌ Socket reconnection error:', error);
    this.emitToCallbacks('reconnection-error', { error: error.message });
  },

  handleReconnectFailed() {
    console.error('❌ Socket reconnection failed after all attempts');
    this.notifyConnectionListeners(false);
    Alert.alert(
      'Connection Lost',
      'Unable to connect to server. Some real-time features may not work.',
      [{ text: 'OK' }]
    );
    this.emitToCallbacks('reconnection-failed', {});
  },

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  },

  getSocket() {
    return this.socket;
  },

  // Add the methods that driverSlice expects:
  updateDriverStatus(driverId, status, rideId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('driver_status_update', {
        driverId,
        status,
        rideId,
        timestamp: Date.now(),
      });
    }
  },

  updateLocation(userId, location, isDriver = false, rideId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_location', {
        userId,
        latitude: location.latitude,
        longitude: location.longitude,
        bearing: location.bearing || 0,
        speed: location.speed || 0,
        accuracy: location.accuracy || 0,
        isDriver,
        rideId,
        timestamp: Date.now(),
      });
    }
  },

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  },

  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event).add(callback);
  },

  off(event, callback = null) {
  if (callback && this.eventCallbacks.has(event)) {
    this.eventCallbacks.get(event).delete(callback);
  } else {
    this.eventCallbacks.delete(event);
  }
},

// ✅ CORRECT: This is the new method
subscribeToSurgePricing(areaId, callback) {
  if (this.socket && this.isConnected) {
    // Listen for surge pricing updates
    this.socket.on(`surge-pricing-${areaId}`, callback);
    
    // Request initial surge data
    this.socket.emit('subscribe-surge-pricing', { areaId });
    
    // Return unsubscribe function
    return () => {
      this.socket.off(`surge-pricing-${areaId}`, callback);
      this.socket.emit('unsubscribe-surge-pricing', { areaId });
    };
  }
  
  // If not connected, return empty cleanup function
  return () => {};
},

// ✅ CORRECT: This should be the ONLY emit method
emit(event, data) {
  if (this.socket && this.isConnected) {
    this.socket.emit(event, data);
  }
},


// Add this AFTER subscribeToSurgePricing method
subscribeToNearbyDrivers(location, radius, vehicleTypes, callback) {
  if (this.socket && this.isConnected) {
    // Listen for nearby drivers updates
    const eventName = `nearby-drivers-${location.latitude.toFixed(4)}-${location.longitude.toFixed(4)}`;
    this.socket.on(eventName, callback);
    
    // Request initial drivers data
    this.socket.emit('subscribe-nearby-drivers', { 
      location, 
      radius, 
      vehicleTypes 
    });
    
    // Return unsubscribe function
    return () => {
      this.socket.off(eventName, callback);
      this.socket.emit('unsubscribe-nearby-drivers', { 
        location, 
        radius, 
        vehicleTypes 
      });
    };
  }
  
  // If not connected, return empty cleanup function
  return () => {};
},
  emitToCallbacks(event, data) {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${event} callback:`, error);
        }
      });
    }
  },

  addConnectionListener(listener) {
    this.connectionListeners.add(listener);
  },

  removeConnectionListener(listener) {
    this.connectionListeners.delete(listener);
  },

  notifyConnectionListeners(connected) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('❌ Error in connection listener:', error);
      }
    });
  },

  // Additional methods that might be called
  connectSocket() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  },

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  },

  // RealTimeService methods that might be expected
  initialize(userData) {
    return this.initializeSocket(userData);
  },

  // Cleanup
  cleanup() {
    this.disconnectSocket();
    this.eventCallbacks.clear();
    this.connectionListeners.clear();
    this.activeSubscriptions.clear();
    this.socket = null;
  },

  // Utility methods
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
      activeSubscriptions: Array.from(this.activeSubscriptions),
    };
  }
};

export default socketService;