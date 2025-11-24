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

    // Connection events
    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
    this.socket.on('reconnect', this.handleReconnect);
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt);
    this.socket.on('reconnect_error', this.handleReconnectError);
    this.socket.on('reconnect_failed', this.handleReconnectFailed);

    // Application-specific events
    this.socket.on('rideUpdate', this.handleRideUpdate);
    this.socket.on('driverLocation', this.handleDriverLocation);
    this.socket.on('bookingStatus', this.handleBookingStatus);
    this.socket.on('chatMessage', this.handleChatMessage);
    this.socket.on('notification', this.handleNotification);
  };

  /**
   * Connection event handlers
   */
  handleConnect = () => {
    console.log('✅ Socket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    this.notifyConnectionListeners(true);
    
    // Emit connection event to all registered callbacks
    this.emitToCallbacks('connection', { status: 'connected' });
  };

  handleDisconnect = (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    this.isConnected = false;
    
    this.notifyConnectionListeners(false);
    
    if (reason === 'io server disconnect') {
      // Server disconnected, need to manually reconnect
      this.socket.connect();
    }
  };

  handleConnectError = (error) => {
    console.error('❌ Socket connection error:', error);
    this.notifyConnectionListeners(false);
  };

  handleReconnect = (attemptNumber) => {
    console.log(`🔁 Socket reconnected after ${attemptNumber} attempts`);
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.notifyConnectionListeners(true);
  };

  handleReconnectAttempt = (attemptNumber) => {
    this.reconnectAttempts = attemptNumber;
    console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
  };

  handleReconnectError = (error) => {
    console.error('❌ Socket reconnection error:', error);
  };

  handleReconnectFailed = () => {
    console.error('❌ Socket reconnection failed after all attempts');
    this.notifyConnectionListeners(false);
    
    Alert.alert(
      'Connection Lost',
      'Unable to connect to server. Some real-time features may not work.',
      [{ text: 'OK' }]
    );
  };

  /**
   * Application event handlers
   */
  handleRideUpdate = (data) => {
    console.log('🚗 Ride update received:', data);
    this.emitToCallbacks('rideUpdate', data);
  };

  handleDriverLocation = (data) => {
    console.log('📍 Driver location update:', data);
    this.emitToCallbacks('driverLocation', data);
  };

  handleBookingStatus = (data) => {
    console.log('📋 Booking status update:', data);
    this.emitToCallbacks('bookingStatus', data);
  };

  handleChatMessage = (data) => {
    console.log('💬 Chat message received:', data);
    this.emitToCallbacks('chatMessage', data);
  };

  handleNotification = (data) => {
    console.log('🔔 Notification received:', data);
    this.emitToCallbacks('notification', data);
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
  subscribeToNearbyRides = (location, callback) => {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket not connected for nearby rides subscription');
      this.initializeSocket();
    }

    this.registerCallback('newRide', callback);
    
    this.socket.emit('joinNearbyRides', {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius || 5, // km
      timestamp: Date.now(),
    });

    console.log('📍 Subscribed to nearby rides:', location);
  };

  unsubscribeFromNearbyRides = () => {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveNearbyRides');
      this.unregisterCallback('newRide');
      console.log('📍 Unsubscribed from nearby rides');
    }
  };

  /**
   * Driver tracking for riders
   */
  subscribeToDriverLocation = (driverId, bookingId, callback) => {
    this.registerCallback(`driverLocation-${driverId}`, callback);
    
    this.socket.emit('subscribeToDriver', {
      driverId,
      bookingId,
      timestamp: Date.now(),
    });

    console.log(`🚗 Subscribed to driver location: ${driverId}`);
  };

  unsubscribeFromDriverLocation = (driverId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribeFromDriver', { driverId });
    }
    this.unregisterCallback(`driverLocation-${driverId}`);
    console.log(`🚗 Unsubscribed from driver location: ${driverId}`);
  };

  /**
   * Ride booking real-time updates
   */
  subscribeToRideBooking = (bookingId, callback) => {
    this.registerCallback(`booking-${bookingId}`, callback);
    
    this.socket.emit('joinBookingRoom', {
      bookingId,
      timestamp: Date.now(),
    });

    console.log(`📋 Subscribed to booking updates: ${bookingId}`);
  };

  unsubscribeFromRideBooking = (bookingId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveBookingRoom', { bookingId });
    }
    this.unregisterCallback(`booking-${bookingId}`);
    console.log(`📋 Unsubscribed from booking updates: ${bookingId}`);
  };

  /**
   * Chat functionality
   */
  joinChatRoom = (bookingId, userInfo) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinChatRoom', {
        bookingId,
        userId: userInfo.id,
        userName: userInfo.name,
        userType: userInfo.role,
      });
      console.log(`💬 Joined chat room: ${bookingId}`);
    }
  };

  leaveChatRoom = (bookingId) => {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveChatRoom', { bookingId });
      console.log(`💬 Left chat room: ${bookingId}`);
    }
  };

  sendChatMessage = (bookingId, message, userInfo) => {
    if (this.socket && this.isConnected) {
      const chatMessage = {
        bookingId,
        message,
        senderId: userInfo.id,
        senderName: userInfo.name,
        senderType: userInfo.role,
        timestamp: Date.now(),
      };

      this.socket.emit('chatMessage', chatMessage);
      console.log('💬 Chat message sent:', chatMessage);
    }
  };

  /**
   * Driver availability updates
   */
  updateDriverAvailability = (driverId, isAvailable, location = null) => {
    if (this.socket && this.isConnected) {
      const availabilityData = {
        driverId,
        isAvailable,
        timestamp: Date.now(),
      };

      if (location) {
        availabilityData.location = location;
      }

      this.socket.emit('driverAvailability', availabilityData);
      console.log(`🚗 Driver availability updated: ${driverId} - ${isAvailable}`);
    }
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
    };
  };

  /**
   * Cleanup
   */
  cleanup = () => {
    this.disconnectSocket();
    this.eventCallbacks.clear();
    this.connectionListeners.clear();
    this.socket = null;
    console.log('🧹 Socket service cleaned up');
  };
}

// Create singleton instance
const realTimeService = new RealTimeService();

// Export singleton and individual functions for backward compatibility
export default realTimeService;

// Legacy export functions for backward compatibility
export const connectSocket = () => realTimeService.connectSocket();
export const disconnectSocket = () => realTimeService.disconnectSocket();
export const subscribeToNearbyRides = (location, callback) => 
  realTimeService.subscribeToNearbyRides(location, callback);
