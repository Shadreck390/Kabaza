// services/socket/index.js
import realTimeService from './realtimeUpdates';

// Singleton instance export
export const socket = realTimeService;

// Connection management
export const initSocket = (userData) => {
  return realTimeService.initializeSocket(userData);
};

export const connectSocket = () => {
  return realTimeService.connectSocket();
};

export const disconnectSocket = () => {
  return realTimeService.disconnectSocket();
};

export const getSocket = () => {
  return realTimeService.socket;
};

// Ride-specific functions
export const requestRide = (rideData) => {
  if (!realTimeService.socket || !realTimeService.isConnected) {
    console.warn('Socket not connected for ride request');
    return false;
  }

  realTimeService.socket.emit('ride-request', {
    ...rideData,
    timestamp: Date.now(),
  });
  
  return true;
};

export const subscribeToRideUpdates = (rideId, callback) => {
  realTimeService.registerCallback(`ride-${rideId}`, callback);
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('subscribe-ride', {
      rideId,
      timestamp: Date.now(),
    });
  }
  
  console.log(`🚗 Subscribed to ride updates: ${rideId}`);
};

export const unsubscribeFromRideUpdates = (rideId) => {
  realTimeService.unregisterCallback(`ride-${rideId}`);
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('unsubscribe-ride', {
      rideId,
      timestamp: Date.now(),
    });
  }
  
  console.log(`🚗 Unsubscribed from ride updates: ${rideId}`);
};

// Driver tracking
export const trackDriver = (driverId, callback) => {
  realTimeService.registerCallback(`driver-${driverId}`, callback);
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('track-driver', {
      driverId,
      timestamp: Date.now(),
    });
  }
  
  console.log(`📍 Tracking driver: ${driverId}`);
};

export const stopTrackingDriver = (driverId) => {
  realTimeService.unregisterCallback(`driver-${driverId}`);
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('stop-tracking-driver', {
      driverId,
      timestamp: Date.now(),
    });
  }
  
  console.log(`📍 Stopped tracking driver: ${driverId}`);
};

// Nearby drivers
export const subscribeToNearbyDrivers = (location, radius = 5, callback) => {
  realTimeService.registerCallback('nearby-drivers', callback);
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('subscribe-nearby-drivers', {
      latitude: location.latitude,
      longitude: location.longitude,
      radius,
      timestamp: Date.now(),
    });
  }
  
  console.log(`📍 Subscribed to nearby drivers in ${radius}km radius`);
};

export const unsubscribeFromNearbyDrivers = () => {
  realTimeService.unregisterCallback('nearby-drivers');
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('unsubscribe-nearby-drivers');
  }
  
  console.log('📍 Unsubscribed from nearby drivers');
};

// Chat functions
export const joinRideChat = (rideId, userData) => {
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('join-ride-chat', {
      rideId,
      userId: userData.id,
      userName: userData.name,
      userType: userData.role || 'rider',
      timestamp: Date.now(),
    });
    
    console.log(`💬 Joined ride chat: ${rideId}`);
  }
};

export const sendRideMessage = (rideId, message, userData) => {
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('ride-chat-message', {
      rideId,
      message,
      senderId: userData.id,
      senderName: userData.name,
      timestamp: Date.now(),
    });
  }
};

// Payment updates
export const subscribeToPaymentUpdates = (rideId, callback) => {
  realTimeService.registerCallback(`payment-${rideId}`, callback);
  
  if (realTimeService.socket && realTimeService.isConnected) {
    realTimeService.socket.emit('subscribe-payment', {
      rideId,
      timestamp: Date.now(),
    });
  }
};

// Utility functions
export const isSocketConnected = () => {
  return realTimeService.isConnected;
};

export const getConnectionStatus = () => {
  return realTimeService.getConnectionStatus();
};

// Cleanup
export const cleanupSocket = () => {
  return realTimeService.cleanup();
};

// Default export
export default {
  initSocket,
  connectSocket,
  disconnectSocket,
  getSocket,
  requestRide,
  subscribeToRideUpdates,
  unsubscribeFromRideUpdates,
  trackDriver,
  stopTrackingDriver,
  subscribeToNearbyDrivers,
  unsubscribeFromNearbyDrivers,
  joinRideChat,
  sendRideMessage,
  subscribeToPaymentUpdates,
  isSocketConnected,
  getConnectionStatus,
  cleanupSocket,
};