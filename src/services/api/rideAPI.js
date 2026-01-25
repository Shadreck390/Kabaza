// services/api/rideAPI.js

const API_BASE_URL = 'https://your-backend-url.com/api';

// Socket.io client for real-time updates
import { io } from 'socket.io-client';
let socket = null;

// Initialize socket connection
export const initSocket = (token = null) => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Socket event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }
  return socket;
};

// Get socket instance
export const getSocket = () => socket;

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  try {
    // Get auth token from storage
    const token = await getAuthToken();
    
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      timeout: 15000, // 15 second timeout for ride requests
      ...options,
    };

    // Add body if present
    if (options.body && typeof options.body !== 'string') {
      config.body = JSON.stringify(options.body);
    }

    console.log(`API Request: ${config.method} ${url}`);
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error.message, endpoint);
    
    // Check if it's a network error
    if (error.message.includes('Network request failed')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Get auth token from storage (you need to implement this)
const getAuthToken = async () => {
  // Implement your token retrieval logic
  // Example: return await AsyncStorage.getItem('auth_token');
  return null;
};

// ========== REAL-TIME RIDE FUNCTIONS ==========

// Request a ride (real-time)
export const requestRide = async (rideData) => {
  try {
    const result = await apiRequest('/rides/request', {
      method: 'POST',
      body: rideData,
    });

    // Emit socket event for real-time matching
    if (socket?.connected) {
      socket.emit('ride-requested', {
        rideId: result.ride.id,
        ...rideData,
      });
    }

    return {
      success: true,
      ride: result.ride,
      estimatedMatchTime: result.estimatedMatchTime || '2-5',
      message: 'Ride request sent. Searching for drivers...',
    };
  } catch (error) {
    console.error('Error requesting ride:', error);
    throw new Error(error.message || 'Failed to request ride. Please try again.');
  }
};

// Cancel a ride request (real-time)
export const cancelRideRequest = async (rideId, reason = '') => {
  try {
    const result = await apiRequest(`/rides/${rideId}/cancel-request`, {
      method: 'POST',
      body: { reason },
    });

    // Emit cancellation event
    if (socket?.connected) {
      socket.emit('ride-cancelled', { rideId, reason });
    }

    return {
      success: true,
      cancellationFee: result.cancellationFee || 0,
      message: result.message || 'Ride request cancelled successfully',
    };
  } catch (error) {
    console.error('Error cancelling ride request:', error);
    throw new Error(error.message || 'Failed to cancel ride request.');
  }
};

// Get real-time ride status
export const getRideStatus = async (rideId) => {
  try {
    const result = await apiRequest(`/rides/${rideId}/status`);
    
    return {
      status: result.status, // pending, accepted, enroute, arrived, in_progress, completed, cancelled
      driver: result.driver,
      estimatedArrival: result.estimatedArrival,
      currentLocation: result.currentLocation,
      polyline: result.polyline,
      updatedAt: result.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching ride status:', error);
    throw new Error('Failed to fetch ride status.');
  }
};

// Fetch nearby available drivers in real-time
export const fetchNearbyDrivers = async (location, radius = 5, vehicleTypes = ['bike', 'car']) => {
  try {
    const result = await apiRequest(
      `/drivers/nearby?lat=${location.latitude}&lng=${location.longitude}&radius=${radius}&vehicleTypes=${vehicleTypes.join(',')}`
    );
    
    return result.drivers.map(driver => ({
      id: driver.id,
      name: driver.name,
      rating: driver.rating || 4.5,
      phone: driver.phone,
      location: driver.location,
      vehicleType: driver.vehicleType,
      vehicleModel: driver.vehicleModel,
      vehiclePlate: driver.vehiclePlate,
      status: driver.status, // online, offline, busy, available
      online: driver.status === 'available' || driver.status === 'online',
      estimatedArrival: driver.estimatedArrival,
      distance: driver.distance,
      fareMultiplier: driver.fareMultiplier || 1.0,
    }));
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    
    // Fallback to mock data for development
    return getMockDrivers(location, vehicleTypes);
  }
};

// Calculate real-time fare estimate with surge pricing
export const getRealTimeFareEstimate = async (pickup, destination, vehicleType = 'bike') => {
  try {
    const result = await apiRequest('/rides/fare-estimate', {
      method: 'POST',
      body: {
        pickup,
        destination,
        vehicleType,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      baseFare: result.baseFare,
      distanceFare: result.distanceFare,
      timeFare: result.timeFare,
      surgeMultiplier: result.surgeMultiplier || 1.0,
      totalFare: result.totalFare,
      currency: result.currency || 'MWK',
      estimatedTime: result.estimatedTime,
      estimatedDistance: result.estimatedDistance,
      breakdown: result.breakdown,
      surgeActive: result.surgeMultiplier > 1.0,
      surgeReason: result.surgeReason,
    };
  } catch (error) {
    console.error('Error getting real-time fare estimate:', error);
    
    // Mock estimate for development
    return {
      baseFare: 300,
      distanceFare: 200,
      timeFare: 100,
      surgeMultiplier: 1.0,
      totalFare: 600,
      currency: 'MWK',
      estimatedTime: '8-12 min',
      estimatedDistance: '2.5 km',
      surgeActive: false,
    };
  }
};

// Track driver location in real-time
export const trackDriverLocation = (rideId, callback) => {
  if (!socket?.connected) {
    console.warn('Socket not connected for driver tracking');
    return () => {};
  }

  // Listen for driver location updates
  const eventName = `driver-location-${rideId}`;
  socket.on(eventName, (locationData) => {
    callback({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      bearing: locationData.bearing,
      speed: locationData.speed,
      timestamp: locationData.timestamp,
    });
  });

  // Request initial location
  socket.emit('request-driver-location', { rideId });

  // Return cleanup function
  return () => {
    socket.off(eventName);
    socket.emit('stop-tracking', { rideId });
  };
};

// Listen for ride status updates
export const subscribeToRideUpdates = (rideId, callback) => {
  if (!socket?.connected) {
    console.warn('Socket not connected for ride updates');
    return () => {};
  }

  const eventName = `ride-update-${rideId}`;
  socket.on(eventName, (update) => {
    callback({
      status: update.status,
      driverId: update.driverId,
      estimatedArrival: update.estimatedArrival,
      driverLocation: update.driverLocation,
      message: update.message,
      timestamp: update.timestamp,
    });
  });

  // Subscribe to this ride
  socket.emit('subscribe-ride', { rideId });

  return () => {
    socket.off(eventName);
    socket.emit('unsubscribe-ride', { rideId });
  };
};

// Send SOS alert
export const sendSOSAlert = async (rideId, location, reason = 'emergency') => {
  try {
    const result = await apiRequest('/rides/sos', {
      method: 'POST',
      body: {
        rideId,
        location,
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    // Emit SOS event via socket for immediate attention
    if (socket?.connected) {
      socket.emit('sos-alert', {
        rideId,
        location,
        reason,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      alertId: result.alertId,
      responded: result.responded,
      responseTime: result.responseTime,
      message: result.message || 'SOS alert sent successfully',
    };
  } catch (error) {
    console.error('Error sending SOS alert:', error);
    throw new Error('Failed to send SOS alert. Please try again or contact emergency services.');
  }
};

// Rate and review a completed ride
export const rateRide = async (rideId, rating, review = '', tip = 0) => {
  try {
    const result = await apiRequest(`/rides/${rideId}/rate`, {
      method: 'POST',
      body: { rating, review, tip },
    });

    return {
      success: true,
      message: result.message || 'Thank you for your feedback!',
      newDriverRating: result.newDriverRating,
    };
  } catch (error) {
    console.error('Error rating ride:', error);
    throw new Error('Failed to submit rating. Please try again.');
  }
};

// Get active ride for user
export const getActiveRide = async (userId) => {
  try {
    const result = await apiRequest(`/rides/active/${userId}`);
    
    if (!result.ride) return null;

    return {
      id: result.ride.id,
      status: result.ride.status,
      driver: result.ride.driver,
      pickup: result.ride.pickup,
      destination: result.ride.destination,
      estimatedFare: result.ride.estimatedFare,
      estimatedTime: result.ride.estimatedTime,
      startedAt: result.ride.startedAt,
      currentLocation: result.ride.currentLocation,
      polyline: result.ride.polyline,
    };
  } catch (error) {
    console.error('Error fetching active ride:', error);
    return null;
  }
};

// Fetch nearby ride requests (for drivers)
export const fetchNearbyRides = async (driverLocation, radius = 5, vehicleTypes = ['bike', 'car']) => {
  try {
    const result = await apiRequest(
      `/rides/nearby?lat=${driverLocation.latitude}&lng=${driverLocation.longitude}&radius=${radius}&vehicleTypes=${vehicleTypes.join(',')}`
    );
    
    return result.rides.map(ride => ({
      id: ride.id,
      riderName: ride.riderName,
      riderPhone: ride.riderPhone,
      pickup: ride.pickup,
      destination: ride.destination,
      estimatedFare: ride.estimatedFare,
      estimatedTime: ride.estimatedTime,
      distance: ride.distance,
      riderRating: ride.riderRating || 5.0,
      createdAt: ride.createdAt,
      urgency: ride.urgency || 'normal', // normal, urgent, scheduled
      specialRequests: ride.specialRequests || '',
    }));
  } catch (error) {
    console.error('Error fetching nearby rides:', error);
    
    // Mock data for development
    return getMockRideRequests(driverLocation);
  }
};

// Mock ride requests for development
const getMockRideRequests = (driverLocation) => {
  const baseLat = driverLocation?.latitude || -13.9626;
  const baseLng = driverLocation?.longitude || 33.7741;
  
  return [
    {
      id: 'ride_1',
      riderName: 'Alice Banda',
      riderPhone: '+265991111111',
      pickup: {
        name: 'Shoprite Complex',
        latitude: baseLat + 0.003,
        longitude: baseLng + 0.002,
        address: 'City Center, Lilongwe'
      },
      destination: {
        name: 'Area 18',
        latitude: baseLat + 0.008,
        longitude: baseLng + 0.005,
        address: 'Area 18, Lilongwe'
      },
      estimatedFare: 850,
      estimatedTime: '12 min',
      distance: 3.2,
      riderRating: 4.9,
      createdAt: new Date().toISOString(),
      urgency: 'normal',
    },
    {
      id: 'ride_2',
      riderName: 'Bob Phiri',
      riderPhone: '+265992222222',
      pickup: {
        name: 'Likuni Hospital',
        latitude: baseLat - 0.002,
        longitude: baseLng + 0.003,
        address: 'Likuni Road, Lilongwe'
      },
      destination: {
        name: 'Bingu Stadium',
        latitude: baseLat + 0.010,
        longitude: baseLng - 0.001,
        address: 'Bingu National Stadium'
      },
      estimatedFare: 1200,
      estimatedTime: '15 min',
      distance: 4.5,
      riderRating: 4.7,
      createdAt: new Date().toISOString(),
      urgency: 'urgent',
      specialRequests: 'Medical appointment, need quick ride'
    },
  ];
};

// ========== RIDE HISTORY AND SHARING ==========
// Get ride history with pagination
export const getRideHistory = async (userId, page = 1, limit = 20) => {
  try {
    const result = await apiRequest(`/rides/history/${userId}?page=${page}&limit=${limit}`);
    
    return {
      rides: result.rides.map(ride => ({
        id: ride.id,
        driverName: ride.driverName,
        driverRating: ride.driverRating,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        status: ride.status,
        date: ride.date,
        rating: ride.rating,
        review: ride.review,
        vehicleType: ride.vehicleType,
        distance: ride.distance,
        duration: ride.duration,
      })),
      total: result.total,
      page: result.page,
      pages: result.pages,
    };
  } catch (error) {
    console.error('Error fetching ride history:', error);
    return getMockRideHistory();
  }
};

// Share ride details
export const shareRideDetails = async (rideId, contacts = []) => {
  try {
    const result = await apiRequest(`/rides/${rideId}/share`, {
      method: 'POST',
      body: { contacts },
    });

    return {
      success: true,
      sharedWith: result.sharedWith,
      shareLink: result.shareLink,
      message: result.message || 'Ride details shared successfully',
    };
  } catch (error) {
    console.error('Error sharing ride details:', error);
    throw new Error('Failed to share ride details.');
  }
};

// ========== SOCKET EVENT HANDLERS ==========

// Listen for nearby driver updates
export const listenForDriverUpdates = (callback) => {
  if (!socket?.connected) {
    console.warn('Socket not connected for driver updates');
    return () => {};
  }

  socket.on('driver-update', (driverUpdate) => {
    callback(driverUpdate);
  });

  return () => {
    socket.off('driver-update');
  };
};

// Listen for price surge updates
export const listenForPriceSurges = (callback) => {
  if (!socket?.connected) {
    console.warn('Socket not connected for price surges');
    return () => {};
  }

  socket.on('price-surge', (surgeData) => {
    callback(surgeData);
  });

  return () => {
    socket.off('price-surge');
  };
};

// ========== MOCK DATA FOR DEVELOPMENT ==========

const getMockDrivers = (location, vehicleTypes = ['bike', 'car']) => {
  const baseLat = location?.latitude || -13.9626;
  const baseLng = location?.longitude || 33.7741;
  
  const mockDrivers = [
    {
      id: 'driver_1',
      name: 'John Banda',
      rating: 4.8,
      phone: '+265991234567',
      location: {
        latitude: baseLat + 0.002,
        longitude: baseLng + 0.002,
      },
      vehicleType: 'bike',
      vehicleModel: 'TVS Star City',
      vehiclePlate: 'BL 1234',
      status: 'available',
      online: true,
      estimatedArrival: '3 min',
      distance: 0.8,
      fareMultiplier: 1.0,
    },
    {
      id: 'driver_2',
      name: 'Mike Phiri',
      rating: 4.9,
      phone: '+265992345678',
      location: {
        latitude: baseLat - 0.003,
        longitude: baseLng - 0.001,
      },
      vehicleType: 'car',
      vehicleModel: 'Toyota Corolla',
      vehiclePlate: 'BL 5678',
      status: 'available',
      online: true,
      estimatedArrival: '5 min',
      distance: 1.2,
      fareMultiplier: 1.2,
    },
    {
      id: 'driver_3',
      name: 'Sarah Juma',
      rating: 4.7,
      phone: '+265993456789',
      location: {
        latitude: baseLat + 0.001,
        longitude: baseLng - 0.002,
      },
      vehicleType: 'bike',
      vehicleModel: 'Honda CG125',
      vehiclePlate: 'BL 9012',
      status: 'available',
      online: true,
      estimatedArrival: '2 min',
      distance: 0.5,
      fareMultiplier: 1.0,
    },
  ];

  // Filter by vehicle types if specified
  return vehicleTypes.length > 0 
    ? mockDrivers.filter(driver => vehicleTypes.includes(driver.vehicleType))
    : mockDrivers;
};

const getMockRideHistory = () => {
  return {
    rides: [
      {
        id: 1,
        driverName: 'John Banda',
        driverRating: 4.8,
        pickup: 'Shoprite Complex, Lilongwe',
        destination: 'City Center, Lilongwe',
        fare: 500,
        status: 'completed',
        date: '2024-01-15T10:30:00Z',
        rating: 5,
        review: 'Great service! Very professional.',
        vehicleType: 'bike',
        distance: '2.3 km',
        duration: '8 min',
      },
      {
        id: 2,
        driverName: 'Mike Phiri',
        driverRating: 4.9,
        pickup: 'Home, Area 3',
        destination: 'Kamuzu International Airport',
        fare: 1200,
        status: 'completed',
        date: '2024-01-14T15:45:00Z',
        rating: 4,
        review: 'Safe and timely driver.',
        vehicleType: 'car',
        distance: '8.5 km',
        duration: '15 min',
      },
    ],
    total: 2,
    page: 1,
    pages: 1,
  };
};

// ========== EXPORT ALL FUNCTIONS ==========

export default {
  // Socket management
  initSocket,
  getSocket,
  
  // Ride operations
  requestRide,
  cancelRideRequest,
  getRideStatus,
  getActiveRide,
  rateRide,
  sendSOSAlert,
  shareRideDetails,
  
  // Driver operations
  fetchNearbyDrivers,
  
  // Pricing
  getRealTimeFareEstimate,
  
  // Real-time tracking
  trackDriverLocation,
  subscribeToRideUpdates,
  
  // History
  getRideHistory,
  
  // Event listeners
  listenForDriverUpdates,
  listenForPriceSurges,
};