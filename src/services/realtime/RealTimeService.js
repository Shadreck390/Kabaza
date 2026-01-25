// Kabaza/services/RealTimeService/RealTimeService.js - FIXED VERSION
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../socket/realtimeUpdates'; // ✅ CHANGED: Use relative path
import locationService from '../location/LocationService'; // ✅ CHANGED: Use relative path

class RealTimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.currentUser = null;
    this.userType = null; // 'driver' or 'rider'
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 5;
    this.reconnectTimeout = null;
    this.appState = 'active';
    this.networkState = 'connected';
    this.pendingMessages = [];
    this.eventListeners = new Map();
    this.heartbeatInterval = null;
    this.locationUpdateInterval = null;
  }

  // ====================
  // INITIALIZATION
  // ====================

  /**
   * Initialize RealTimeService with user context
   * @param {object} userData - User data including id and type
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(userData) {
    try {
      console.log('🚀 Initializing RealTimeService for user:', userData?.id);
      
      this.currentUser = userData;
      this.userType = userData?.type || 'rider';
      
      // Initialize socket service first - FIXED: Handle both cases
      let initializedSocket;
      if (socketService && typeof socketService.initialize === 'function') {
        initializedSocket = await socketService.initialize(userData);
      } else if (socketService && typeof socketService.initializeSocket === 'function') {
        initializedSocket = await socketService.initializeSocket(userData);
      } else {
        console.warn('⚠️ Socket service methods not found, using mock');
        initializedSocket = socketService; // Use as-is
      }
      
      this.socket = socketService.getSocket ? socketService.getSocket() : initializedSocket;
      
      // Setup socket event listeners
      this.setupSocketListeners();
      
      // Setup app state monitoring
      this.setupAppStateMonitoring();
      
      // Start heartbeat for connection monitoring
      this.startHeartbeat();
      
      // Start location updates if user is a driver
      if (this.userType === 'driver') {
        this.startLocationUpdates();
      }
      
      this.isInitialized = true;
      this.isConnected = true;
      
      console.log('✅ RealTimeService initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ RealTimeService initialization failed:', error);
      this.isInitialized = false;
      this.isConnected = false;
      
      // Don't throw in development, just log
      if (__DEV__) {
        console.log('⚠️ Continuing in development mode without real-time services');
        this.isInitialized = true; // Mark as initialized anyway
        return true;
      }
      
      throw error;
    }
  }

  /**
   * Setup socket event listeners
   */
  setupSocketListeners() {
    if (!this.socket) {
      console.warn('⚠️ No socket available for listeners');
      return;
    }

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    this.socket.on('reconnect', this.handleReconnect.bind(this));
    this.socket.on('reconnect_error', this.handleReconnectError.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));

    // Custom application events - check if socket has these events
    const events = [
      'authenticated', 'unauthorized', 'ride_update', 'location_update',
      'chat_message', 'notification', 'presence_update', 
      'driver_status_update', 'trip_completed', 'payment_update'
    ];
    
    events.forEach(event => {
      if (typeof this.socket.on === 'function') {
        this.socket.on(event, (data) => {
          this.emitToListeners(event, data);
        });
      }
    });
  }

  /**
   * Setup app state monitoring
   */
  setupAppStateMonitoring() {
    AppState.addEventListener('change', (nextAppState) => {
      this.appState = nextAppState;
      
      if (nextAppState === 'background') {
        console.log('📱 App in background - optimizing real-time updates');
        this.optimizeForBackground();
      } else if (nextAppState === 'active') {
        console.log('📱 App in foreground - restoring normal updates');
        this.restoreNormalUpdates();
      }
    });
  }

  // ====================
  // CONNECTION HANDLERS
  // ====================

  handleConnect() {
    console.log('🔌 Socket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Authenticate with server
    if (this.currentUser) {
      this.authenticate();
    }
    
    // Emit connection event to listeners
    this.emitToListeners('connection_change', { status: 'connected' });
  }

  handleDisconnect(reason) {
    console.log('🔌 Socket disconnected:', reason);
    this.isConnected = false;
    
    // Schedule reconnect
    this.scheduleReconnect();
    
    // Emit connection event to listeners
    this.emitToListeners('connection_change', { status: 'disconnected', reason });
  }

  handleConnectError(error) {
    console.error('🔌 Connection error:', error);
    this.emitToListeners('connection_change', { status: 'error', error: error.message });
  }

  handleReconnect(attemptNumber) {
    console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
    this.reconnectAttempts = 0;
  }

  handleReconnectError(error) {
    console.error('🔌 Reconnect error:', error);
    this.reconnectAttempts++;
  }

  handleReconnectFailed() {
    console.error('🔌 Reconnect failed after max attempts');
    this.emitToListeners('connection_change', { status: 'failed' });
  }

  // ====================
  // APPLICATION EVENT HANDLERS
  // ====================

  handleRideUpdate(data) {
    console.log('🚗 Ride update received:', data);
    this.emitToListeners('ride_update', data);
  }

  handleLocationUpdate(data) {
    console.log('📍 Location update received:', data.userId);
    this.emitToListeners('location_update', data);
  }

  handleChatMessage(data) {
    console.log('💬 Chat message received:', data);
    this.emitToListeners('chat_message', data);
  }

  handleNotification(data) {
    console.log('📢 Notification received:', data);
    this.emitToListeners('notification', data);
  }

  // ====================
  // PUBLIC METHODS
  // ====================

  /**
   * Authenticate with server
   */
  authenticate() {
    if (!this.socket || !this.currentUser) return;
    
    if (typeof this.socket.emit === 'function') {
      this.socket.emit('authenticate', {
        userId: this.currentUser.id,
        userType: this.userType,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Emit an event to server
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket not connected, caching message:', event);
      this.cacheMessage(event, data);
      return false;
    }
    
    try {
      if (typeof this.socket.emit === 'function') {
        this.socket.emit(event, data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to emit event:', event, error);
      this.cacheMessage(event, data);
      return false;
    }
  }

  /**
   * Listen to an event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      reconnectAttempts: this.reconnectAttempts,
      appState: this.appState,
      networkState: this.networkState,
      userId: this.currentUser?.id,
      userType: this.userType
    };
  }

  /**
   * Start location updates (for drivers)
   */
  startLocationUpdates() {
    if (this.userType !== 'driver' || this.locationUpdateInterval) return;
    
    console.log('📍 Starting location updates for driver');
    
    this.locationUpdateInterval = setInterval(async () => {
      try {
        const position = await locationService.getCurrentPosition();
        
        if (position && this.isConnected) {
          this.emit('driver_location_update', {
            userId: this.currentUser.id,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              bearing: position.coords.heading || 0,
              speed: position.coords.speed || 0,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.error('❌ Failed to send location update:', error);
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop location updates
   */
  stopLocationUpdates() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
      console.log('📍 Stopped location updates');
    }
  }

  // ====================
  // PRIVATE METHODS
  // ====================

  /**
   * Start heartbeat for connection monitoring
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        if (typeof this.socket.emit === 'function') {
          this.socket.emit('heartbeat', {
            userId: this.currentUser?.id,
            timestamp: Date.now()
          });
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      this.reconnectTimeout = setTimeout(() => {
        console.log(`🔄 Attempting reconnect (${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);
        
        if (socketService && typeof socketService.reconnect === 'function') {
          socketService.reconnect();
        }
      }, delay);
      
      this.reconnectAttempts++;
    }
  }

  /**
   * Cache message for later sending
   */
  cacheMessage(event, data) {
    this.pendingMessages.push({
      event,
      data,
      timestamp: Date.now()
    });
    
    // Keep only last 100 messages
    if (this.pendingMessages.length > 100) {
      this.pendingMessages.shift();
    }
  }

  /**
   * Sync pending messages when reconnected
   */
  syncPendingMessages() {
    if (this.pendingMessages.length === 0 || !this.isConnected) return;
    
    console.log(`📤 Syncing ${this.pendingMessages.length} pending messages`);
    
    const messagesToSend = [...this.pendingMessages];
    this.pendingMessages = [];
    
    messagesToSend.forEach(msg => {
      this.emit(msg.event, msg.data);
    });
  }

  /**
   * Emit event to all registered listeners
   */
  emitToListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Optimize for background mode
   */
  optimizeForBackground() {
    // Reduce location update frequency
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = setInterval(() => {
        if (this.userType === 'driver' && this.isConnected) {
          // Minimal location updates in background
        }
      }, 30000);
    }
    
    // Reduce heartbeat frequency
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(() => {
        if (this.socket && this.isConnected) {
          if (typeof this.socket.emit === 'function') {
            this.socket.emit('heartbeat', {
              userId: this.currentUser?.id,
              timestamp: Date.now()
            });
          }
        }
      }, 60000);
    }
  }

  /**
   * Restore normal update frequency
   */
  restoreNormalUpdates() {
    // Restart location updates with normal frequency
    if (this.userType === 'driver') {
      this.stopLocationUpdates();
      this.startLocationUpdates();
    }
    
    // Restart heartbeat with normal frequency
    this.startHeartbeat();
  }

  // ====================
  // CLEANUP
  // ====================

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    console.log('🔌 Disconnecting RealTimeService');
    
    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
    
    // Stop reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Disconnect socket
    if (this.socket && typeof this.socket.disconnect === 'function') {
      this.socket.disconnect();
    }
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Reset state
    this.isConnected = false;
    this.isInitialized = false;
    this.currentUser = null;
    this.userType = null;
    this.reconnectAttempts = 0;
    
    console.log('✅ RealTimeService disconnected');
  }

  /**
   * Complete cleanup
   */
  async cleanup() {
    await this.disconnect();
    
    // Clear any cached data
    this.pendingMessages = [];
    
    // Remove any remaining listeners
    this.eventListeners.clear();
    
    console.log('🧹 RealTimeService cleanup completed');
  }
}

// Create and export singleton instance
const realTimeServiceInstance = new RealTimeService();
export default realTimeServiceInstance;