// Kabaza/services/RealTimeService/RealTimeService.js
import { Platform, AppState, NetInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '@services/socket/realtimeUpdates'; // ✅ ADDED @
import locationService from '@services/location/LocationService'; // ✅ ADDED @
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
      
      // Initialize socket service first
      if (socketService && typeof socketService.initialize === 'function') {
        await socketService.initialize(userData);
        this.socket = socketService.getSocket ? socketService.getSocket() : socketService;
      } else {
        throw new Error('Socket service not available or improperly configured');
      }
      
      // Setup socket event listeners
      this.setupSocketListeners();
      
      // Setup app state monitoring
      this.setupAppStateMonitoring();
      
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
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
      throw error;
    }
  }

  /**
   * Setup socket event listeners
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    this.socket.on('reconnect', this.handleReconnect.bind(this));
    this.socket.on('reconnect_error', this.handleReconnectError.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));

    // Custom application events
    this.socket.on('authenticated', this.handleAuthenticated.bind(this));
    this.socket.on('unauthorized', this.handleUnauthorized.bind(this));
    this.socket.on('ride_update', this.handleRideUpdate.bind(this));
    this.socket.on('location_update', this.handleLocationUpdate.bind(this));
    this.socket.on('chat_message', this.handleChatMessage.bind(this));
    this.socket.on('notification', this.handleNotification.bind(this));
    this.socket.on('presence_update', this.handlePresenceUpdate.bind(this));
    this.socket.on('driver_status_update', this.handleDriverStatusUpdate.bind(this));
    this.socket.on('trip_completed', this.handleTripCompleted.bind(this));
    this.socket.on('payment_update', this.handlePaymentUpdate.bind(this));
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

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    // Using NetInfo from react-native-community/netinfo (imported above)
    NetInfo.addEventListener(state => {
      const wasConnected = this.networkState === 'connected';
      const isConnected = state.isConnected;
      
      this.networkState = isConnected ? 'connected' : 'disconnected';
      
      if (wasConnected && !isConnected) {
        console.log('🌐 Network disconnected');
        this.handleNetworkDisconnect();
      } else if (!wasConnected && isConnected) {
        console.log('🌐 Network reconnected');
        this.handleNetworkReconnect();
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

  handleAuthenticated(data) {
    console.log('✅ Authenticated with server:', data.userId);
    this.emitToListeners('authenticated', data);
  }

  handleUnauthorized(data) {
    console.error('❌ Authentication failed:', data.message);
    this.emitToListeners('unauthorized', data);
  }

  // ====================
  // APPLICATION EVENT HANDLERS
  // ====================

  handleRideUpdate(data) {
    console.log('🚗 Ride update received:', data);
    this.emitToListeners('ride_update', data);
    
    // Specific ride status updates
    if (data.status) {
      switch(data.status) {
        case 'requested':
          this.emitToListeners('ride_requested', data);
          break;
        case 'accepted':
          this.emitToListeners('ride_accepted', data);
          break;
        case 'arriving':
          this.emitToListeners('driver_arriving', data);
          break;
        case 'ongoing':
          this.emitToListeners('ride_started', data);
          break;
        case 'completed':
          this.emitToListeners('ride_completed', data);
          break;
        case 'cancelled':
          this.emitToListeners('ride_cancelled', data);
          break;
      }
    }
  }

  handleLocationUpdate(data) {
    console.log('📍 Location update received:', data.userId);
    this.emitToListeners('location_update', data);
    
    // If this is driver location and user is rider, handle specially
    if (data.userType === 'driver' && this.userType === 'rider') {
      this.emitToListeners('driver_location_update', data);
    }
  }

  handleChatMessage(data) {
    console.log('💬 Chat message received:', data);
    this.emitToListeners('chat_message', data);
  }

  handleNotification(data) {
    console.log('📢 Notification received:', data);
    this.emitToListeners('notification', data);
  }

  handlePresenceUpdate(data) {
    console.log('👥 Presence update:', data);
    this.emitToListeners('presence_update', data);
  }

  handleDriverStatusUpdate(data) {
    console.log('🚕 Driver status update:', data);
    this.emitToListeners('driver_status_update', data);
  }

  handleTripCompleted(data) {
    console.log('✅ Trip completed:', data);
    this.emitToListeners('trip_completed', data);
  }

  handlePaymentUpdate(data) {
    console.log('💰 Payment update:', data);
    this.emitToListeners('payment_update', data);
  }

  // ====================
  // NETWORK HANDLERS
  // ====================

  handleNetworkDisconnect() {
    console.log('📶 Handling network disconnect');
    // Cache outgoing messages
    // Stop heartbeat temporarily
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.emitToListeners('network_change', { status: 'disconnected' });
  }

  handleNetworkReconnect() {
    console.log('📶 Handling network reconnect');
    // Restart heartbeat
    this.startHeartbeat();
    
    // Sync any pending messages
    this.syncPendingMessages();
    
    this.emitToListeners('network_change', { status: 'connected' });
  }

  // ====================
  // PUBLIC METHODS
  // ====================

  /**
   * Authenticate with server
   */
  authenticate() {
    if (!this.socket || !this.currentUser) return;
    
    this.socket.emit('authenticate', {
      userId: this.currentUser.id,
      userType: this.userType,
      timestamp: Date.now()
    });
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
      this.socket.emit(event, data);
      return true;
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
    
    // Also set up socket listener if it's a standard event
    if (this.socket && !this.socket.hasListeners(event)) {
      this.socket.on(event, (data) => {
        this.emitToListeners(event, data);
      });
    }
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
    
    // Remove socket listener if no more listeners
    if (this.socket && (!this.eventListeners.has(event) || this.eventListeners.get(event).length === 0)) {
      this.socket.off(event);
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
        this.socket.emit('heartbeat', {
          userId: this.currentUser?.id,
          timestamp: Date.now()
        });
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
    
    // Send all pending messages
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
        // Send location update
      }, 30000); // Every 30 seconds in background
    }
    
    // Reduce heartbeat frequency
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(() => {
        // Send heartbeat
      }, 60000); // Every 60 seconds in background
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