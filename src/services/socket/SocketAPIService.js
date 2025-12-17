// services/socket/index.js
import realTimeService from './realtimeUpdates';

// Event Constants - Standardized for consistency
export const SocketEvents = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
  
  // Authentication & Presence
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  PRESENCE_UPDATE: 'presence_update',
  
  // Location Tracking
  LOCATION_UPDATE: 'location_update',
  LOCATION_BATCH: 'location_batch',
  DRIVER_LOCATION_UPDATE: 'driver_location_update',
  SUBSCRIBE_LOCATION: 'subscribe_location',
  UNSUBSCRIBE_LOCATION: 'unsubscribe_location',
  
  // Ride Lifecycle
  RIDE_REQUEST: 'ride_request',
  RIDE_REQUESTED: 'ride_requested',
  RIDE_ACCEPTED: 'ride_accepted',
  RIDE_REJECTED: 'ride_rejected',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_CANCELLED: 'ride_cancelled',
  RIDE_STATUS_UPDATE: 'ride_status_update',
  
  // Driver Matching
  DRIVER_AVAILABLE: 'driver_available',
  DRIVER_UNAVAILABLE: 'driver_unavailable',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_ARRIVING: 'driver_arriving',
  DRIVER_ARRIVED: 'driver_arrived',
  
  // Trip Updates
  TRIP_UPDATE: 'trip_update',
  ETA_UPDATE: 'eta_update',
  ROUTE_UPDATE: 'route_update',
  TRAFFIC_UPDATE: 'traffic_update',
  
  // Chat
  JOIN_CHAT: 'join_chat',
  CHAT_MESSAGE: 'chat_message',
  TYPING: 'typing',
  READ_RECEIPT: 'read_receipt',
  
  // Payments
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PAYMENT_FAILED: 'payment_failed',
  
  // Notifications
  NOTIFICATION: 'notification',
  SOS_ALERT: 'sos_alert',
  
  // System
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error'
};

// Singleton instance export
export const socket = realTimeService;

// Connection management
export const initSocket = (userData) => {
  if (!userData || !userData.id) {
    console.error('❌ User data required for socket initialization');
    return false;
  }
  
  return realTimeService.initialize(userData.id, userData.type || 'rider');
};

export const connectSocket = () => {
  return realTimeService.connect();
};

export const disconnectSocket = () => {
  return realTimeService.disconnect();
};

export const getSocketInstance = () => {
  return realTimeService.getSocket();
};

export const getConnectionStatus = () => {
  return realTimeService.getConnectionStatus();
};

export const isSocketConnected = () => {
  return realTimeService.isConnected;
};

// Ride Management Functions
export const requestRide = (rideData) => {
  if (!realTimeService.isConnected) {
    console.warn('⚠️ Socket not connected for ride request');
    throw new Error('Socket not connected');
  }

  const rideId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const enhancedRideData = {
    ...rideData,
    rideId,
    timestamp: Date.now(),
    status: 'searching',
    requestedAt: new Date().toISOString()
  };

  realTimeService.emit(SocketEvents.RIDE_REQUEST, enhancedRideData);
  
  console.log(`🚖 Ride requested: ${rideId}`);
  return rideId;
};

export const subscribeToRideUpdates = (rideId, callback) => {
  if (!rideId || !callback) {
    console.error('❌ Ride ID and callback required');
    return null;
  }

  const eventHandler = (data) => {
    if (data.rideId === rideId) {
      callback(data);
    }
  };

  // Subscribe to general ride updates
  realTimeService.on(SocketEvents.RIDE_STATUS_UPDATE, eventHandler);
  
  // Subscribe to specific ride events
  realTimeService.on(`${SocketEvents.RIDE_ACCEPTED}_${rideId}`, eventHandler);
  realTimeService.on(`${SocketEvents.RIDE_STARTED}_${rideId}`, eventHandler);
  realTimeService.on(`${SocketEvents.RIDE_COMPLETED}_${rideId}`, eventHandler);
  realTimeService.on(`${SocketEvents.RIDE_CANCELLED}_${rideId}`, eventHandler);
  
  // Request subscription to server
  if (realTimeService.isConnected) {
    realTimeService.emit(SocketEvents.TRIP_UPDATE, {
      action: 'subscribe',
      rideId,
      timestamp: Date.now()
    });
  }

  console.log(`📡 Subscribed to ride updates: ${rideId}`);
  
  // Return unsubscribe function
  return () => {
    unsubscribeFromRideUpdates(rideId);
  };
};

export const unsubscribeFromRideUpdates = (rideId) => {
  // Unsubscribe from server
  if (realTimeService.isConnected) {
    realTimeService.emit(SocketEvents.TRIP_UPDATE, {
      action: 'unsubscribe',
      rideId,
      timestamp: Date.now()
    });
  }
  
  // Remove all ride-specific listeners
  realTimeService.off(SocketEvents.RIDE_STATUS_UPDATE);
  realTimeService.off(`${SocketEvents.RIDE_ACCEPTED}_${rideId}`);
  realTimeService.off(`${SocketEvents.RIDE_STARTED}_${rideId}`);
  realTimeService.off(`${SocketEvents.RIDE_COMPLETED}_${rideId}`);
  realTimeService.off(`${SocketEvents.RIDE_CANCELLED}_${rideId}`);
  
  console.log(`📡 Unsubscribed from ride updates: ${rideId}`);
};

// Driver Tracking Functions
export const trackDriver = (driverId, rideId, callback) => {
  if (!driverId || !callback) {
    console.error('❌ Driver ID and callback required');
    return null;
  }

  const driverLocationHandler = (data) => {
    if (data.driverId === driverId || data.rideId === rideId) {
      callback(data);
    }
  };

  // Subscribe to driver location updates
  realTimeService.on(SocketEvents.DRIVER_LOCATION_UPDATE, driverLocationHandler);
  
  // Request tracking from server
  if (realTimeService.isConnected) {
    realTimeService.emit(SocketEvents.SUBSCRIBE_LOCATION, {
      driverId,
      rideId,
      timestamp: Date.now()
    });
  }

  console.log(`📍 Tracking driver: ${driverId} for ride: ${rideId}`);
  
  // Return unsubscribe function
  return () => {
    stopTrackingDriver(driverId, rideId);
  };
};

export const stopTrackingDriver = (driverId, rideId) => {
  // Request to stop tracking from server
  if (realTimeService.isConnected) {
    realTimeService.emit(SocketEvents.UNSUBSCRIBE_LOCATION, {
      driverId,
      rideId,
      timestamp: Date.now()
    });
  }
  
  // Remove listener
  realTimeService.off(SocketEvents.DRIVER_LOCATION_UPDATE);
  
  console.log(`📍 Stopped tracking driver: ${driverId}`);
};

// Nearby Drivers Functions
export const subscribeToNearbyDrivers = (location, radius = 2, callback) => {
  if (!location || !callback) {
    console.error('❌ Location and callback required');
    return null;
  }

  const nearbyDriversHandler = (data) => {
    callback(data);
  };

  realTimeService.on(SocketEvents.DRIVER_AVAILABLE, nearbyDriversHandler);
  
  if (realTimeService.isConnected) {
    realTimeService.emit('get_nearby_drivers', {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: radius * 1000, // Convert to meters
      timestamp: Date.now()
    });
  }

  console.log(`📍 Subscribed to nearby drivers (${radius}km radius)`);
  
  return () => {
    unsubscribeFromNearbyDrivers();
  };
};

export const unsubscribeFromNearbyDrivers = () => {
  realTimeService.off(SocketEvents.DRIVER_AVAILABLE);
  
  if (realTimeService.isConnected) {
    realTimeService.emit('unsubscribe_nearby_drivers');
  }
  
  console.log('📍 Unsubscribed from nearby drivers');
};

// Ride Actions
export const acceptRide = (rideId, driverData) => {
  if (!realTimeService.isConnected) {
    console.warn('⚠️ Socket not connected for ride acceptance');
    return false;
  }

  realTimeService.emit(SocketEvents.RIDE_ACCEPTED, {
    rideId,
    driverId: driverData.id,
    driverName: driverData.name,
    driverLocation: driverData.location,
    vehicleInfo: driverData.vehicle,
    acceptedAt: Date.now()
  });

  console.log(`✅ Driver accepted ride: ${rideId}`);
  return true;
};

export const startRide = (rideId, driverId) => {
  realTimeService.emit(SocketEvents.RIDE_STARTED, {
    rideId,
    driverId,
    startedAt: Date.now()
  });
};

export const completeRide = (rideId, fare, distance) => {
  realTimeService.emit(SocketEvents.RIDE_COMPLETED, {
    rideId,
    fare,
    distance,
    completedAt: Date.now()
  });
};

export const cancelRide = (rideId, reason, cancelledBy) => {
  realTimeService.emit(SocketEvents.RIDE_CANCELLED, {
    rideId,
    reason,
    cancelledBy,
    cancelledAt: Date.now()
  });
};

// Chat Functions
export const joinRideChat = (rideId, userData) => {
  if (!realTimeService.isConnected) return false;

  realTimeService.emit(SocketEvents.JOIN_CHAT, {
    rideId,
    userId: userData.id,
    userName: userData.name,
    userType: userData.type || 'rider',
    timestamp: Date.now()
  });

  console.log(`💬 Joined ride chat: ${rideId}`);
  return true;
};

export const sendRideMessage = (rideId, message, userData) => {
  if (!realTimeService.isConnected) return false;

  const messageData = {
    rideId,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: message.trim(),
    senderId: userData.id,
    senderName: userData.name,
    senderType: userData.type || 'rider',
    timestamp: Date.now(),
    status: 'sent'
  };

  realTimeService.emit(SocketEvents.CHAT_MESSAGE, messageData);
  
  // Also emit typing stop
  realTimeService.emit(SocketEvents.TYPING, {
    rideId,
    userId: userData.id,
    isTyping: false
  });

  return messageData.messageId;
};

export const sendTypingIndicator = (rideId, userId, isTyping) => {
  realTimeService.emit(SocketEvents.TYPING, {
    rideId,
    userId,
    isTyping,
    timestamp: Date.now()
  });
};

// Location Functions
export const updateLocation = (locationData, userType = 'rider', rideId = null) => {
  if (!realTimeService.isConnected) {
    console.warn('⚠️ Socket not connected for location update');
    return false;
  }

  const enhancedLocation = {
    ...locationData,
    userType,
    rideId,
    timestamp: Date.now(),
    batteryLevel: locationData.batteryLevel || 100,
    accuracy: locationData.accuracy || 10,
    speed: locationData.speed || 0,
    bearing: locationData.bearing || 0
  };

  realTimeService.emit(SocketEvents.LOCATION_UPDATE, enhancedLocation);
  return true;
};

export const sendLocationBatch = (locations) => {
  if (!realTimeService.isConnected || !locations.length) return false;

  realTimeService.emit(SocketEvents.LOCATION_BATCH, {
    locations,
    batchId: `batch_${Date.now()}`,
    timestamp: Date.now()
  });

  return true;
};

// Payment Functions
export const initiatePayment = (rideId, paymentData) => {
  realTimeService.emit(SocketEvents.PAYMENT_INITIATED, {
    rideId,
    ...paymentData,
    initiatedAt: Date.now()
  });
};

export const subscribeToPaymentUpdates = (rideId, callback) => {
  const paymentHandler = (data) => {
    if (data.rideId === rideId) {
      callback(data);
    }
  };

  realTimeService.on(SocketEvents.PAYMENT_CONFIRMED, paymentHandler);
  realTimeService.on(SocketEvents.PAYMENT_FAILED, paymentHandler);

  return () => {
    realTimeService.off(SocketEvents.PAYMENT_CONFIRMED, paymentHandler);
    realTimeService.off(SocketEvents.PAYMENT_FAILED, paymentHandler);
  };
};

// ETA & Route Functions
export const subscribeToETAUpdates = (rideId, callback) => {
  const etaHandler = (data) => {
    if (data.rideId === rideId) {
      callback(data);
    }
  };

  realTimeService.on(SocketEvents.ETA_UPDATE, etaHandler);
  realTimeService.on(SocketEvents.TRAFFIC_UPDATE, etaHandler);

  return () => {
    realTimeService.off(SocketEvents.ETA_UPDATE, etaHandler);
    realTimeService.off(SocketEvents.TRAFFIC_UPDATE, etaHandler);
  };
};

// SOS Emergency Function
export const sendSOSAlert = (rideId, location, userData) => {
  realTimeService.emit(SocketEvents.SOS_ALERT, {
    rideId,
    location,
    userId: userData.id,
    userName: userData.name,
    timestamp: Date.now(),
    priority: 'high'
  });

  console.log(`🚨 SOS Alert sent for ride: ${rideId}`);
};

// Presence Functions
export const updateUserPresence = (status, userData) => {
  realTimeService.emit(SocketEvents.PRESENCE_UPDATE, {
    userId: userData.id,
    userType: userData.type,
    status,
    timestamp: Date.now(),
    lastSeen: new Date().toISOString()
  });
};

// Event Listener Management
export const addEventListener = (event, handler) => {
  return realTimeService.on(event, handler);
};

export const removeEventListener = (event, handler) => {
  return realTimeService.off(event, handler);
};

export const removeAllListeners = (event) => {
  return realTimeService.removeAllListeners(event);
};

// Reconnection Management
export const forceReconnect = () => {
  return realTimeService.reconnect();
};

// Cleanup
export const cleanupSocket = () => {
  // Remove all listeners
  Object.values(SocketEvents).forEach(event => {
    realTimeService.removeAllListeners(event);
  });
  
  // Disconnect
  realTimeService.disconnect();
  
  console.log('🧹 Socket cleaned up');
};

// Default export
export default {
  SocketEvents,
  socket,
  initSocket,
  connectSocket,
  disconnectSocket,
  getSocketInstance,
  getConnectionStatus,
  isSocketConnected,
  
  // Ride Management
  requestRide,
  acceptRide,
  startRide,
  completeRide,
  cancelRide,
  subscribeToRideUpdates,
  unsubscribeFromRideUpdates,
  
  // Driver Tracking
  trackDriver,
  stopTrackingDriver,
  subscribeToNearbyDrivers,
  unsubscribeFromNearbyDrivers,
  
  // Location
  updateLocation,
  sendLocationBatch,
  
  // Chat
  joinRideChat,
  sendRideMessage,
  sendTypingIndicator,
  
  // Payment
  initiatePayment,
  subscribeToPaymentUpdates,
  
  // ETA & Navigation
  subscribeToETAUpdates,
  
  // Emergency
  sendSOSAlert,
  
  // Presence
  updateUserPresence,
  
  // Event Management
  addEventListener,
  removeEventListener,
  removeAllListeners,
  
  // Connection
  forceReconnect,
  cleanupSocket
};