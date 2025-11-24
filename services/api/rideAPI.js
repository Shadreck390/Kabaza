// services/api/rideAPI.js

const API_BASE_URL = 'https://your-backend-url.com/api';

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add authentication token if available
        // 'Authorization': `Bearer ${await getAuthToken()}`,
      },
      timeout: 10000, // 10 second timeout
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Fetch nearby available rides
export const fetchNearbyRides = async (location, radius = 5) => {
  try {
    const rides = await apiRequest(
      `/rides/nearby?lat=${location.latitude}&lng=${location.longitude}&radius=${radius}`
    );
    
    // Transform API response to expected format
    return rides.map(ride => ({
      id: ride.id || ride._id,
      driverId: ride.driverId,
      driverName: ride.driver?.name || 'Driver',
      driverRating: ride.driver?.rating || 4.5,
      driverPhone: ride.driver?.phone,
      pickupLocation: {
        latitude: ride.pickupLocation?.latitude || ride.pickupLat,
        longitude: ride.pickupLocation?.longitude || ride.pickupLng,
      },
      pickupName: ride.pickupName || 'Pickup Location',
      destination: ride.destination || 'Destination',
      destinationLocation: ride.destinationLocation ? {
        latitude: ride.destinationLocation.latitude,
        longitude: ride.destinationLocation.longitude,
      } : null,
      amount: ride.amount || ride.fare || '0',
      currency: ride.currency || 'MWK',
      estimatedTime: ride.estimatedTime || '5 min',
      distance: ride.distance || '1.2 km',
      vehicleType: ride.vehicleType || 'Motorcycle',
      vehicleColor: ride.vehicle?.color || 'Unknown',
      vehiclePlate: ride.vehicle?.plateNumber || 'Unknown',
      status: ride.status || 'available',
      createdAt: ride.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching nearby rides:', error);
    
    // Fallback to mock data for development
    return getMockRides(location);
  }
};

// Book a specific ride
export const bookRide = async (rideId, riderInfo) => {
  try {
    const bookingData = {
      rideId,
      riderId: riderInfo.id, // From your auth system
      riderName: riderInfo.name,
      riderPhone: riderInfo.phone,
      pickupLocation: riderInfo.currentLocation,
      notes: riderInfo.notes || '',
    };

    const result = await apiRequest('/rides/book', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });

    return {
      success: true,
      bookingId: result.bookingId,
      driverInfo: result.driver,
      estimatedArrival: result.estimatedArrival,
      fare: result.fare,
    };
  } catch (error) {
    console.error('Error booking ride:', error);
    throw new Error('Failed to book ride. Please try again.');
  }
};

// Cancel a booked ride
export const cancelRide = async (bookingId, reason = '') => {
  try {
    const result = await apiRequest(`/rides/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    return {
      success: true,
      cancellationFee: result.cancellationFee || 0,
      refundAmount: result.refundAmount || 0,
    };
  } catch (error) {
    console.error('Error canceling ride:', error);
    throw new Error('Failed to cancel ride. Please try again.');
  }
};

// Get ride details by ID
export const getRideDetails = async (rideId) => {
  try {
    const ride = await apiRequest(`/rides/${rideId}`);
    return transformRideData(ride);
  } catch (error) {
    console.error('Error fetching ride details:', error);
    throw new Error('Failed to fetch ride details.');
  }
};

// Get rider's ride history
export const getRideHistory = async (riderId, page = 1, limit = 20) => {
  try {
    const history = await apiRequest(
      `/rides/history/${riderId}?page=${page}&limit=${limit}`
    );
    
    return history.map(ride => ({
      id: ride.id,
      driverName: ride.driverName,
      pickupLocation: ride.pickupLocation,
      destination: ride.destination,
      amount: ride.amount,
      status: ride.status,
      date: ride.createdAt,
      rating: ride.rating,
      review: ride.review,
    }));
  } catch (error) {
    console.error('Error fetching ride history:', error);
    return getMockRideHistory();
  }
};

// Rate a completed ride
export const rateRide = async (bookingId, rating, review = '') => {
  try {
    const result = await apiRequest(`/rides/${bookingId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, review }),
    });

    return { success: true, newRating: result.newRating };
  } catch (error) {
    console.error('Error rating ride:', error);
    throw new Error('Failed to submit rating.');
  }
};

// Get estimated fare for a route
export const getFareEstimate = async (pickupLocation, destination) => {
  try {
    const estimate = await apiRequest('/rides/estimate-fare', {
      method: 'POST',
      body: JSON.stringify({
        pickupLocation,
        destination,
        vehicleType: 'motorcycle', // Default for Kabaza
      }),
    });

    return {
      baseFare: estimate.baseFare,
      distanceFare: estimate.distanceFare,
      timeFare: estimate.timeFare,
      totalFare: estimate.totalFare,
      currency: estimate.currency || 'MWK',
      estimatedTime: estimate.estimatedTime,
      estimatedDistance: estimate.estimatedDistance,
    };
  } catch (error) {
    console.error('Error getting fare estimate:', error);
    
    // Mock estimate for development
    return {
      baseFare: 300,
      distanceFare: 200,
      timeFare: 100,
      totalFare: 600,
      currency: 'MWK',
      estimatedTime: '8 min',
      estimatedDistance: '2.5 km',
    };
  }
};

// Get active booking for rider
export const getActiveBooking = async (riderId) => {
  try {
    const booking = await apiRequest(`/rides/active/${riderId}`);
    return booking ? transformRideData(booking) : null;
  } catch (error) {
    console.error('Error fetching active booking:', error);
    return null;
  }
};

// Helper function to transform ride data
const transformRideData = (ride) => ({
  id: ride.id || ride._id,
  driverId: ride.driverId,
  driverName: ride.driver?.name || 'Driver',
  driverRating: ride.driver?.rating || 4.5,
  driverPhone: ride.driver?.phone,
  pickupLocation: ride.pickupLocation,
  pickupName: ride.pickupName,
  destination: ride.destination,
  destinationLocation: ride.destinationLocation,
  amount: ride.amount,
  currency: ride.currency,
  estimatedTime: ride.estimatedTime,
  distance: ride.distance,
  vehicleType: ride.vehicleType,
  vehicleColor: ride.vehicle?.color,
  vehiclePlate: ride.vehicle?.plateNumber,
  status: ride.status,
  createdAt: ride.createdAt,
});

// Mock data for development
const getMockRides = (location) => {
  const baseLat = location?.latitude || -15.3875;
  const baseLng = location?.longitude || 28.3228;
  
  return [
    {
      id: 1,
      driverId: 'driver_1',
      driverName: 'John Banda',
      driverRating: 4.8,
      driverPhone: '+265991234567',
      pickupLocation: {
        latitude: baseLat + 0.002,
        longitude: baseLng + 0.002,
      },
      pickupName: 'Shoprite Complex',
      destination: 'City Center',
      amount: '500',
      currency: 'MWK',
      estimatedTime: '3 min',
      distance: '0.8 km',
      vehicleType: 'Motorcycle',
      vehicleColor: 'Red',
      vehiclePlate: 'BL 1234',
      status: 'available',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      driverId: 'driver_2',
      driverName: 'Mike Phiri',
      driverRating: 4.9,
      driverPhone: '+265992345678',
      pickupLocation: {
        latitude: baseLat - 0.003,
        longitude: baseLng - 0.001,
      },
      pickupName: 'Game Complex',
      destination: 'Airport Road',
      amount: '800',
      currency: 'MWK',
      estimatedTime: '5 min',
      distance: '1.5 km',
      vehicleType: 'Motorcycle',
      vehicleColor: 'Blue',
      vehiclePlate: 'BL 5678',
      status: 'available',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      driverId: 'driver_3',
      driverName: 'Sarah Juma',
      driverRating: 4.7,
      driverPhone: '+265993456789',
      pickupLocation: {
        latitude: baseLat + 0.001,
        longitude: baseLng - 0.002,
      },
      pickupName: 'Area 3',
      destination: 'KCH',
      amount: '600',
      currency: 'MWK',
      estimatedTime: '2 min',
      distance: '0.5 km',
      vehicleType: 'Motorcycle',
      vehicleColor: 'Green',
      vehiclePlate: 'BL 9012',
      status: 'available',
      createdAt: new Date().toISOString(),
    },
  ];
};

const getMockRideHistory = () => {
  return [
    {
      id: 1,
      driverName: 'John Banda',
      pickupLocation: 'Shoprite Complex',
      destination: 'City Center',
      amount: '500',
      status: 'completed',
      date: '2024-01-15T10:30:00Z',
      rating: 5,
      review: 'Great service!',
    },
    {
      id: 2,
      driverName: 'Mike Phiri',
      pickupLocation: 'Home',
      destination: 'Airport',
      amount: '1200',
      status: 'completed',
      date: '2024-01-14T15:45:00Z',
      rating: 4,
      review: 'Safe driver',
    },
  ];
};

// Export all API functions
export default {
  fetchNearbyRides,
  bookRide,
  cancelRide,
  getRideDetails,
  getRideHistory,
  rateRide,
  getFareEstimate,
  getActiveBooking,
};