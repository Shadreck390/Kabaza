// Kabaza/services/socket/socketService.js
import realTimeService from './realtimeUpdates';
import { SocketEvents } from './index';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.currentUser = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 5;
    this.eventListeners = new Map();
    this.connectionCallbacks = [];
  }

  /**
   * Initialize socket connection with user data
   */
  async initialize(userData = null) {
    try {
      console.log('🚀 Initializing SocketService...');
      
      if (userData) {
        this.currentUser = userData;
      }
      
      // Initialize the underlying realTimeService
      if (realTimeService && typeof realTimeService.initialize === 'function') {
        await realTimeService.initialize(userData);
        this.socket = realTimeService.getSocket ? realTimeService.getSocket() : realTimeService;
        this.isConnected = true;
        this.isInitialized = true;
      } else {
        throw new Error('RealTimeService not available or improperly configured');
      }
      
      // Setup connection listeners
      this.setupConnectionListeners();
      
      // Notify connection callbacks
      this.notifyConnectionChange('connected');
      
      console.log('✅ SocketService initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ SocketService initialization failed:', error);
      this.isConnected = false;
      this.isInitialized = false;
      this.notifyConnectionChange('error', error.message);
      throw error;
    }
  }

  /**
   * Setup connection event listeners
   */
  setupConnectionListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionChange('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
      this.notifyConnectionChange('disconnected', reason);
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.notifyConnectionChange('error', error.message);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.isConnected = true;
      this.notifyConnectionChange('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 Reconnect error:', error);
      this.reconnectAttempts++;
      this.notifyConnectionChange('reconnect_error', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 Reconnect failed after max attempts');
      this.notifyConnectionChange('reconnect_failed');
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('✅ Authenticated:', data.userId);
      this.notifyEvent('authenticated', data);
    });

    this.socket.on('unauthorized', (data) => {
      console.error('❌ Unauthorized:', data.message);
      this.notifyEvent('unauthorized', data);
    });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log('⏹️ Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isConnected && this.socket) {
        console.log(`🔄 Attempting reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Connect socket manually
   */
  connect() {
    if (this.socket && typeof this.socket.connect === 'function') {
      this.socket.connect();
      return true;
    }
    return false;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket && typeof this.socket.disconnect === 'function') {
      this.socket.disconnect();
      this.isConnected = false;
      this.isInitialized = false;
      this.notifyConnectionChange('disconnected', 'manual');
      return true;
    }
    return false;
  }

  /**
   * Force reconnect
   */
  reconnect() {
    if (this.socket) {
      this.disconnect();
      setTimeout(() => this.connect(), 1000);
      return true;
    }
    return false;
  }

  /**
   * Emit an event
   */
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
      return false;
    }

    try {
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error('❌ Failed to emit event:', event, error);
      return false;
    }
  }

  /**
   * Listen to an event
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);

    // Also register with underlying socket
    if (this.socket) {
      this.socket.on(event, (data) => {
        this.notifyEvent(event, data);
      });
    }

    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    // Remove from underlying socket if no more listeners
    if (this.socket && (!this.eventListeners.has(event) || this.eventListeners.get(event).length === 0)) {
      this.socket.off(event);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.delete(event);
    }

    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
      userId: this.currentUser?.id
    };
  }

  /**
   * Listen for connection changes
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Remove connection change listener
   */
  offConnectionChange(callback) {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify connection change
   */
  notifyConnectionChange(status, data = null) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback({ status, data, timestamp: Date.now() });
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  /**
   * Notify event to listeners
   */
  notifyEvent(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    console.log('🧹 Cleaning up SocketService...');
    
    // Clear all event listeners
    this.eventListeners.clear();
    
    // Clear connection callbacks
    this.connectionCallbacks = [];
    
    // Disconnect socket
    if (this.socket) {
      this.socket.removeAllListeners();
      if (typeof this.socket.disconnect === 'function') {
        this.socket.disconnect();
      }
    }
    
    // Reset state
    this.socket = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.currentUser = null;
    this.reconnectAttempts = 0;
    
    console.log('✅ SocketService cleanup complete');
  }

  // ====================
  // CONVENIENCE METHODS
  // ====================

  /**
   * Request a ride
   */
  requestRide(rideData) {
    return this.emit(SocketEvents.RIDE_REQUEST, {
      ...rideData,
      rideId: `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    });
  }

  /**
   * Accept a ride
   */
  acceptRide(rideId, driverData) {
    return this.emit(SocketEvents.RIDE_ACCEPTED, {
      rideId,
      driverId: driverData.id,
      driverName: driverData.name,
      acceptedAt: Date.now()
    });
  }

  /**
   * Start a ride
   */
  startRide(rideId, driverId) {
    return this.emit(SocketEvents.RIDE_STARTED, {
      rideId,
      driverId,
      startedAt: Date.now()
    });
  }

  /**
   * Complete a ride
   */
  completeRide(rideId, fare, distance) {
    return this.emit(SocketEvents.RIDE_COMPLETED, {
      rideId,
      fare,
      distance,
      completedAt: Date.now()
    });
  }

  /**
   * Cancel a ride
   */
  cancelRide(rideId, reason, cancelledBy) {
    return this.emit(SocketEvents.RIDE_CANCELLED, {
      rideId,
      reason,
      cancelledBy,
      cancelledAt: Date.now()
    });
  }

  /**
   * Update location
   */
  updateLocation(locationData, userType = 'rider', rideId = null) {
    return this.emit(SocketEvents.LOCATION_UPDATE, {
      ...locationData,
      userType,
      rideId,
      timestamp: Date.now()
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(rideId, message, userData) {
    return this.emit(SocketEvents.CHAT_MESSAGE, {
      rideId,
      messageId: `msg_${Date.now()}`,
      message,
      senderId: userData.id,
      senderName: userData.name,
      timestamp: Date.now()
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(rideId, userId, isTyping) {
    return this.emit(SocketEvents.TYPING, {
      rideId,
      userId,
      isTyping,
      timestamp: Date.now()
    });
  }

  /**
   * Subscribe to location updates
   */
  subscribeToLocation(driverId, rideId) {
    return this.emit(SocketEvents.SUBSCRIBE_LOCATION, {
      driverId,
      rideId,
      timestamp: Date.now()
    });
  }

  /**
   * Unsubscribe from location updates
   */
  unsubscribeFromLocation(driverId, rideId) {
    return this.emit(SocketEvents.UNSUBSCRIBE_LOCATION, {
      driverId,
      rideId,
      timestamp: Date.now()
    });
  }

  /**
   * Send SOS alert
   */
  sendSOSAlert(rideId, location, userData) {
    return this.emit(SocketEvents.SOS_ALERT, {
      rideId,
      location,
      userId: userData.id,
      userName: userData.name,
      timestamp: Date.now()
    });
  }
}

// Create and export singleton instance
const socketServiceInstance = new SocketService();
export default socketServiceInstance;