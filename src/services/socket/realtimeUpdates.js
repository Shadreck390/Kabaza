// services/socket/realtimeUpdates.js
import io from 'socket.io-client';
import { Alert, Platform } from 'react-native';

// Socket configuration
const SOCKET_CONFIG = {
  SOCKET_URL: "https://your-kabaza-backend.com", // Replace with your actual backend
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  TIMEOUT: 20000,
};

class RealTimeService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.eventCallbacks = new Map();
    this.connectionListeners = new Set();
    this.activeSubscriptions = new Set();
  }

  /**
   * Initialize and connect socket
   */
  initializeSocket = (userData = null) => {
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

      this.setupEventListeners();
      this.connectSocket();

      return this.socket;
    } catch (error) {
      console.error('❌ Socket initialization failed:', error);
      throw error;
    }
  };

  /**
   * Set up all socket event listeners
   */
  setupEventListeners = () => {
    if (!this.socket) return;

    // ========== CONNECTION EVENTS ==========
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
    this.socket.on('reconnect', this.handleReconnect);
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt);
    this.socket.on('reconnect_error', this.handleReconnectError);
    this.socket.on('reconnect_failed', this.handleReconnectFailed);

    // ========== RIDE EVENTS ==========
    this.socket.on('ride-matched', this.handleRideMatched);
    this.socket.on('ride-accepted', this.handleRideAccepted);
    this.socket.on('driver-enroute', this.handleDriverEnroute);
    this.socket.on('driver-arrived', this.handleDriverArrived);
    this.socket.on('ride-started', this.handleRideStarted);
    this.socket.on('ride-completed', this.handleRideCompleted);
    this.socket.on('ride-cancelled', this.handleRideCancelled);
    this.socket.on('ride-update', this.handleRideUpdate);

    // ========== DRIVER EVENTS ==========
    this.socket.on('driver-location', this.handleDriverLocation);
    this.socket.on('driver-available', this.handleDriverAvailable);
    this.socket.on('driver-unavailable', this.handleDriverUnavailable);

    // ========== BOOKING EVENTS ==========
    this.socket.on('booking-created', this.handleBookingCreated);
    this.socket.on('booking-updated', this.handleBookingUpdated);
    this.socket.on('booking-status', this.handleBookingStatus);

    // ========== CHAT EVENTS ==========
    this.socket.on('chat-message', this.handleChatMessage);
    this.socket.on('chat-typing', this.handleChatTyping);

    // ========== NOTIFICATION EVENTS ==========
    this.socket.on('notification', this.handleNotification);
    this.socket.on('alert', this.handleAlert);

    // ========== PRICING EVENTS ==========
    this.socket.on('surge-update', this.handleSurgeUpdate);
    this.socket.on('fare-updated', this.handleFareUpdated);

    // ========== EMERGENCY EVENTS ==========
    this.socket.on('sos-triggered', this.handleSOSTriggered);
    this.socket.on('sos-response', this.handleSOSResponse);

    // ========== LOCATION EVENTS ==========
    this.socket.on('location-update', this.handleLocationUpdate);
  };

  /**
   * Connection event handlers
   */
  handleConnect = () => {
    console.log('✅ Socket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    this.notifyConnectionListeners(true);
    this.emitToCallbacks('connection', { status: 'connected', socketId: this.socket.id });
    
    // Re-subscribe to active subscriptions
    this.resubscribeAll();
  };

  handleDisconnect = (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    this.isConnected = false;
    
    this.notifyConnectionListeners(false);
    this.emitToCallbacks('connection', { status: 'disconnected', reason });
    
    if (reason === 'io server disconnect') {
      // Server disconnected, need to manually reconnect
      setTimeout(() => {
        this.socket.connect();
      }, 1000);
    }
  };

  handleConnectError = (error) => {
    console.error('❌ Socket connection error:', error);
    this.notifyConnectionListeners(false);
    this.emitToCallbacks('connection-error', { error: error.message });
  };

  handleReconnect = (attemptNumber) => {
    console.log(`🔁 Socket reconnected after ${attemptNumber} attempts`);
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners(true);
    this.emitToCallbacks('reconnection', { attemptNumber });
  };

  handleReconnectAttempt = (attemptNumber) => {
    this.reconnectAttempts = attemptNumber;
    console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    this.emitToCallbacks('reconnection-attempt', { attemptNumber });
  };

  handleReconnectError = (error) => {
    console.error('❌ Socket reconnection error:', error);
    this.emitToCallbacks('reconnection-error', { error: error.message });
  };

  handleReconnectFailed = () => {
    console.error('❌ Socket reconnection failed after all attempts');
    this.notifyConnectionListeners(false);
    
    Alert.alert(
      'Connection Lost',
      'Unable to connect to server. Some real-time features may not work.',
      [{ text: 'OK' }]
    );
    
    this.emitToCallbacks('reconnection-failed', {});
  };

  /**
   * Ride event handlers
   */
  handleRideMatched = (data) => {
    console.log('🤝 Ride matched:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'matched',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('ride-matched', data);
  };

  handleRideAccepted = (data) => {
    console.log('✅ Ride accepted:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'accepted',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('ride-accepted', data);
  };

  handleDriverEnroute = (data) => {
    console.log('🚗 Driver enroute:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'enroute',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('driver-enroute', data);
  };

  handleDriverArrived = (data) => {
    console.log('📍 Driver arrived:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'arrived',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('driver-arrived', data);
  };

  handleRideStarted = (data) => {
    console.log('🏁 Ride started:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'started',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('ride-started', data);
  };

  handleRideCompleted = (data) => {
    console.log('🎉 Ride completed:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'completed',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('ride-completed', data);
  };

  handleRideCancelled = (data) => {
    console.log('❌ Ride cancelled:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, {
      type: 'cancelled',
      timestamp: Date.now(),
      ...data
    });
    this.emitToCallbacks('ride-cancelled', data);
  };

  handleRideUpdate = (data) => {
    console.log('🚗 Ride update received:', data);
    this.emitToCallbacks(`ride-${data.rideId}`, data);
    this.emitToCallbacks('ride-update', data);
  };

  /**
   * Driver event handlers
   */
  handleDriverLocation = (data) => {
    console.log('📍 Driver location update:', data);
    this.emitToCallbacks(`driver-location-${data.driverId}`, data);
    this.emitToCallbacks(`ride-${data.rideId}-location`, data);
    this.emitToCallbacks('driver-location', data);
  };

  handleDriverAvailable = (data) => {
    console.log('✅ Driver available:', data);
    this.emitToCallbacks('driver-available', data);
  };

  handleDriverUnavailable = (data) => {
    console.log('⛔ Driver unavailable:', data);
    this.emitToCallbacks('driver-unavailable', data);
  };

  /**
   * Booking event handlers
   */
  handleBookingCreated = (data) => {
    console.log('📋 Booking created:', data);
    this.emitToCallbacks('booking-created', data);
  };

  handleBookingUpdated = (data) => {
    console.log('📋 Booking updated:', data);
    this.emitToCallbacks(`booking-${data.bookingId}`, data);
    this.emitToCallbacks('booking-updated', data);
  };

  handleBookingStatus = (data) => {
    console.log('📋 Booking status update:', data);
    this.emitToCallbacks(`booking-${data.bookingId}-status`, data);
    this.emitToCallbacks('booking-status', data);
  };

  /**
   * Chat event handlers
   */
  handleChatMessage = (data) => {
    console.log('💬 Chat message received:', data);
    this.emitToCallbacks(`chat-${data.rideId}`, data);
    this.emitToCallbacks('chat-message', data);
  };

  handleChatTyping = (data) => {
    console.log('✍️ User typing:', data);
    this.emitToCallbacks(`chat-${data.rideId}-typing`, data);
    this.emitToCallbacks('chat-typing', data);
  };

  /**
   * Notification event handlers
   */
  handleNotification = (data) => {
    console.log('🔔 Notification received:', data);
    this.emitToCallbacks('notification', data);
  };

  handleAlert = (data) => {
    console.log('⚠️ Alert received:', data);
    this.emitToCallbacks('alert', data);
  };

  /**
   * Pricing event handlers
   */
  handleSurgeUpdate = (data) => {
    console.log('📈 Surge pricing update:', data);
    this.emitToCallbacks(`surge-${data.areaId}`, data);
    this.emitToCallbacks('surge-update', data);
  };

  handleFareUpdated = (data) => {
    console.log('💰 Fare updated:', data);
    this.emitToCallbacks(`fare-${data.rideId}`, data);
    this.emitToCallbacks('fare-updated', data);
  };

  /**
   * Emergency event handlers
   */
  handleSOSTriggered = (data) => {
    console.log('🆕 SOS triggered:', data);
    this.emitToCallbacks('sos-triggered', data);
  };

  handleSOSResponse = (data) => {
    console.log('🆕 SOS response:', data);
    this.emitToCallbacks(`sos-response-${data.rideId}`, data);
    this.emitToCallbacks('sos-response', data);
  };

  /**
   * Location event handlers
   */
  handleLocationUpdate = (data) => {
    console.log('📍 Location update:', data);
    this.emitToCallbacks(`location-${data.userId}`, data);
    this.emitToCallbacks('location-update', data);
  };

  /**
   * Connection management
   */
  connectSocket = () => {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  };

  disconnectSocket = () => {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.reconnectAttempts = 0;
      console.log('🔌 Socket manually disconnected');
    }
  };

  /**
   * Ride-related real-time features
   */
  requestRide = (rideData) => {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket not connected for ride request');
      return false;
    }

    const requestId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.socket.emit('ride-request', {
      ...rideData,
      requestId,
      timestamp: Date.now(),
    });

    console.log('🚗 Ride request sent:', rideData);
    return requestId;
  };

  cancelRideRequest = (rideId, reason = '') => {
    if (this.socket && this.isConnected) {
      this.socket.emit('cancel-ride-request', {
        rideId,
        reason,
        timestamp: Date.now(),
      });
      
      console.log(`❌ Ride request cancelled: ${rideId}`);
    }
  };

  acceptRide = (rideId, driverId, estimatedArrival) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('accept-ride', {
        rideId,
        driverId,
        estimatedArrival,
        timestamp: Date.now(),
      });
      
      console.log(`✅ Ride accepted: ${rideId} by driver ${driverId}`);
    }
  };

  updateRideStatus = (rideId, status, additionalData = {}) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('update-ride-status', {
        rideId,
        status,
        ...additionalData,
        timestamp: Date.now(),
      });
      
      console.log(`🔄 Ride status updated: ${rideId} -> ${status}`);
    }
  };

  completeRide = (rideId, finalFare, rating = null) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('complete-ride', {
        rideId,
        finalFare,
        rating,
        timestamp: Date.now(),
      });
      
      console.log(`🏁 Ride completed: ${rideId}`);
    }
  };

  /**
   * Driver tracking for riders
   */
  subscribeToDriverLocation = (driverId, rideId = null, callback) => {
    const eventKey = rideId ? `driver-${driverId}-${rideId}` : `driver-${driverId}`;
    this.registerCallback(eventKey, callback);
    this.activeSubscriptions.add(eventKey);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-to-driver', {
        driverId,
        rideId,
        timestamp: Date.now(),
      });
    }
    
    console.log(`🚗 Subscribed to driver location: ${driverId}${rideId ? ` for ride ${rideId}` : ''}`);
    
    return () => this.unsubscribeFromDriverLocation(driverId, rideId);
  };

  unsubscribeFromDriverLocation = (driverId, rideId = null) => {
    const eventKey = rideId ? `driver-${driverId}-${rideId}` : `driver-${driverId}`;
    
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-from-driver', { 
        driverId, 
        rideId,
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback(eventKey);
    this.activeSubscriptions.delete(eventKey);
    console.log(`🚗 Unsubscribed from driver location: ${driverId}${rideId ? ` for ride ${rideId}` : ''}`);
  };

  /**
   * Ride booking real-time updates
   */
  subscribeToRideUpdates = (rideId, callback) => {
    this.registerCallback(`ride-${rideId}`, callback);
    this.activeSubscriptions.add(`ride-${rideId}`);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-ride', {
        rideId,
        timestamp: Date.now(),
      });
    }
    
    console.log(`📋 Subscribed to ride updates: ${rideId}`);
    
    return () => this.unsubscribeFromRideUpdates(rideId);
  };

  unsubscribeFromRideUpdates = (rideId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-ride', { 
        rideId,
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback(`ride-${rideId}`);
    this.activeSubscriptions.delete(`ride-${rideId}`);
    console.log(`📋 Unsubscribed from ride updates: ${rideId}`);
  };

  /**
   * Nearby drivers subscription
   */
  subscribeToNearbyDrivers = (location, radius = 5, vehicleTypes = [], callback) => {
    this.registerCallback('nearby-drivers', callback);
    this.activeSubscriptions.add('nearby-drivers');
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-nearby-drivers', {
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        vehicleTypes,
        timestamp: Date.now(),
      });
    }
    
    console.log(`📍 Subscribed to nearby drivers in ${radius}km radius`);
    
    return () => this.unsubscribeFromNearbyDrivers();
  };

  unsubscribeFromNearbyDrivers = () => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-nearby-drivers', {
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback('nearby-drivers');
    this.activeSubscriptions.delete('nearby-drivers');
    console.log('📍 Unsubscribed from nearby drivers');
  };

  /**
   * Surge pricing updates
   */
  subscribeToSurgePricing = (areaId, callback) => {
    this.registerCallback(`surge-${areaId}`, callback);
    this.activeSubscriptions.add(`surge-${areaId}`);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-surge', {
        areaId,
        timestamp: Date.now(),
      });
    }
    
    console.log(`📈 Subscribed to surge pricing for area: ${areaId}`);
    
    return () => this.unsubscribeFromSurgePricing(areaId);
  };

  unsubscribeFromSurgePricing = (areaId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-surge', { 
        areaId,
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback(`surge-${areaId}`);
    this.activeSubscriptions.delete(`surge-${areaId}`);
    console.log(`📈 Unsubscribed from surge pricing for area: ${areaId}`);
  };

  /**
   * Chat functionality
   */
  joinRideChat = (rideId, userInfo) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-ride-chat', {
        rideId,
        userId: userInfo.id,
        userName: userInfo.name,
        userType: userInfo.role || 'rider',
        timestamp: Date.now(),
      });
      
      console.log(`💬 Joined ride chat: ${rideId}`);
    }
  };

  leaveRideChat = (rideId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-ride-chat', { 
        rideId,
        timestamp: Date.now(),
      });
      
      console.log(`💬 Left ride chat: ${rideId}`);
    }
  };

  sendRideMessage = (rideId, message, userInfo) => {
    if (this.socket && this.isConnected) {
      const chatMessage = {
        rideId,
        message,
        senderId: userInfo.id,
        senderName: userInfo.name,
        senderType: userInfo.role || 'rider',
        timestamp: Date.now(),
      };

      this.socket.emit('ride-chat-message', chatMessage);
      console.log('💬 Chat message sent:', chatMessage);
    }
  };

  sendTypingIndicator = (rideId, userId, isTyping) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing-indicator', {
        rideId,
        userId,
        isTyping,
        timestamp: Date.now(),
      });
    }
  };

  /**
   * Driver availability updates
   */
  updateDriverAvailability = (driverId, isAvailable, location = null, status = '') => {
    if (this.socket && this.isConnected) {
      const availabilityData = {
        driverId,
        isAvailable,
        status: status || (isAvailable ? 'available' : 'busy'),
        timestamp: Date.now(),
      };

      if (location) {
        availabilityData.location = location;
      }

      this.socket.emit('driver-availability', availabilityData);
      console.log(`🚗 Driver availability updated: ${driverId} - ${isAvailable ? 'available' : 'busy'}`);
    }
  };

  /**
   * Location tracking
   */
  updateLocation = (userId, location, isDriver = false, rideId = null) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('update-location', {
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
  };

  subscribeToUserLocation = (userId, callback) => {
    this.registerCallback(`location-${userId}`, callback);
    this.activeSubscriptions.add(`location-${userId}`);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-user-location', {
        targetUserId: userId,
        timestamp: Date.now(),
      });
    }
    
    console.log(`📍 Subscribed to location updates for user: ${userId}`);
    
    return () => this.unsubscribeFromUserLocation(userId);
  };

  unsubscribeFromUserLocation = (userId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-user-location', { 
        targetUserId: userId,
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback(`location-${userId}`);
    this.activeSubscriptions.delete(`location-${userId}`);
    console.log(`📍 Unsubscribed from location updates for user: ${userId}`);
  };

  /**
   * Emergency/SOS functionality
   */
  sendSOSAlert = (rideId, location, message = '', emergencyType = 'general') => {
    if (this.socket && this.isConnected) {
      this.socket.emit('sos-alert', {
        rideId,
        latitude: location.latitude,
        longitude: location.longitude,
        message,
        emergencyType,
        timestamp: Date.now(),
      });
      
      console.log(`🆕 SOS alert sent for ride: ${rideId}`);
    }
  };

  subscribeToSOSResponse = (rideId, callback) => {
    this.registerCallback(`sos-response-${rideId}`, callback);
    this.activeSubscriptions.add(`sos-response-${rideId}`);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-sos-response', {
        rideId,
        timestamp: Date.now(),
      });
    }
    
    console.log(`🆕 Subscribed to SOS responses for ride: ${rideId}`);
    
    return () => this.unsubscribeFromSOSResponse(rideId);
  };

  unsubscribeFromSOSResponse = (rideId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-sos-response', { 
        rideId,
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback(`sos-response-${rideId}`);
    this.activeSubscriptions.delete(`sos-response-${rideId}`);
    console.log(`🆕 Unsubscribed from SOS responses for ride: ${rideId}`);
  };

  /**
   * Payment updates
   */
  subscribeToPaymentUpdates = (rideId, callback) => {
    this.registerCallback(`payment-${rideId}`, callback);
    this.activeSubscriptions.add(`payment-${rideId}`);
    
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe-payment', {
        rideId,
        timestamp: Date.now(),
      });
    }
    
    console.log(`💰 Subscribed to payment updates for ride: ${rideId}`);
    
    return () => this.unsubscribeFromPaymentUpdates(rideId);
  };

  unsubscribeFromPaymentUpdates = (rideId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe-payment', { 
        rideId,
        timestamp: Date.now(),
      });
    }
    
    this.unregisterCallback(`payment-${rideId}`);
    this.activeSubscriptions.delete(`payment-${rideId}`);
    console.log(`💰 Unsubscribed from payment updates for ride: ${rideId}`);
  };

  /**
   * Resubscribe to all active subscriptions after reconnection
   */
  resubscribeAll = () => {
    console.log('🔄 Resubscribing to active subscriptions...');
    
    // Note: In a real app, you'd want to store subscription data
    // and resubscribe based on that. For now, we just notify
    // that reconnection happened and let components resubscribe.
    
    this.emitToCallbacks('reconnected', { 
      timestamp: Date.now(),
      socketId: this.socket?.id 
    });
  };

  /**
   * Callback management
   */
  registerCallback = (event, callback) => {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event).add(callback);
  };

  unregisterCallback = (event, callback = null) => {
    if (callback && this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).delete(callback);
    } else {
      this.eventCallbacks.delete(event);
    }
  };

  emitToCallbacks = (event, data) => {
    if (this.eventCallbacks.has(event)) {
      this.eventCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${event} callback:`, error);
        }
      });
    }
  };

  /**
   * Connection status listeners
   */
  addConnectionListener = (listener) => {
    this.connectionListeners.add(listener);
  };

  removeConnectionListener = (listener) => {
    this.connectionListeners.delete(listener);
  };

  notifyConnectionListeners = (connected) => {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('❌ Error in connection listener:', error);
      }
    });
  };

  /**
   * Utility methods
   */
  getConnectionStatus = () => {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
      activeSubscriptions: Array.from(this.activeSubscriptions),
    };
  };

  /**
   * Cleanup
   */
  cleanup = () => {
    this.disconnectSocket();
    this.eventCallbacks.clear();
    this.connectionListeners.clear();
    this.activeSubscriptions.clear();
    this.socket = null;
    console.log('🧹 Socket service cleaned up');
  };
}

// Create singleton instance
const realTimeService = new RealTimeService();

// Export singleton
export default realTimeService;