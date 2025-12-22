// src/services/ride/ride.utils.js

// ====================
// CONSTANTS
// ====================

import {
  // Ride-related constants
  RIDE_STATUS,
  VEHICLE_TYPES,
  BASE_FARES,
  PER_KM_RATES,
  PER_MINUTE_RATES,
  MINIMUM_FARES,
  CANCELLATION_FEES,
  WAITING_FEE_PER_MINUTE,
  FREE_WAITING_MINUTES,
  SURGE_MULTIPLIERS,
  
  // Time constants
  TIME,
  RIDE_TIMEOUTS,
  
  // Distance constants
  DISTANCE,
  
  // Location constants
  DEFAULT_LOCATION,
  
  // Error constants
  ERROR_CODES,
  ERROR_MESSAGES,
  
  // Status colors
  STATUS_COLORS,
} from '@constants/app';  // Using alias

// Import storage utilities
import { getUser, updateUser, clearStorage } from '@src/utils/userStorage';  // Using alias

// ====================
// RIDE CALCULATION UTILITIES
// ====================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

/**
 * Calculate estimated time of arrival (ETA) based on distance and speed
 * @param {number} distance - Distance in kilometers
 * @param {number} averageSpeed - Average speed in km/h (default: 30)
 * @returns {number} ETA in minutes
 */
export const calculateETA = (distance, averageSpeed = 30) => {
  if (distance <= 0 || averageSpeed <= 0) return 0;
  return Math.round((distance / averageSpeed) * 60); // Convert hours to minutes
};

/**
 * Calculate ride fare based on distance, time, and ride type
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in minutes
 * @param {string} vehicleType - Vehicle type from VEHICLE_TYPES
 * @param {number} surgeMultiplier - Surge pricing multiplier (default: 1)
 * @param {number} waitingMinutes - Waiting time in minutes (default: 0)
 * @returns {object} Fare breakdown object
 */
export const calculateFare = (distance, duration, vehicleType, surgeMultiplier = 1, waitingMinutes = 0) => {
  // Validate vehicle type
  if (!Object.values(VEHICLE_TYPES).includes(vehicleType)) {
    vehicleType = VEHICLE_TYPES.STANDARD;
  }
  
  // Calculate base components
  const baseFare = BASE_FARES[vehicleType.toUpperCase()] || BASE_FARES.STANDARD;
  const distanceFare = distance * (PER_KM_RATES[vehicleType.toUpperCase()] || PER_KM_RATES.STANDARD);
  const timeFare = duration * (PER_MINUTE_RATES[vehicleType.toUpperCase()] || PER_MINUTE_RATES.STANDARD);
  
  // Calculate waiting fare
  const chargeableWaitingMinutes = Math.max(0, waitingMinutes - FREE_WAITING_MINUTES);
  const waitingFare = chargeableWaitingMinutes * WAITING_FEE_PER_MINUTE;
  
  // Calculate subtotal
  const subtotal = baseFare + distanceFare + timeFare + waitingFare;
  
  // Apply surge pricing
  const surgeAdjustedTotal = subtotal * surgeMultiplier;
  
  // Apply minimum fare
  const minimumFare = MINIMUM_FARES[vehicleType.toUpperCase()] || MINIMUM_FARES.STANDARD;
  const totalFare = Math.max(surgeAdjustedTotal, minimumFare);
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    waitingFare,
    waitingMinutes,
    chargeableWaitingMinutes,
    subtotal,
    surgeMultiplier,
    surgeAmount: surgeAdjustedTotal - subtotal,
    minimumFare,
    totalFare: Math.round(totalFare),
    breakdown: {
      base: baseFare,
      distance: Math.round(distanceFare),
      time: Math.round(timeFare),
      waiting: Math.round(waitingFare),
      surge: Math.round(surgeAdjustedTotal - subtotal),
      total: Math.round(totalFare)
    }
  };
};

/**
 * Calculate cancellation fee
 * @param {string} cancelledBy - Who cancelled: 'rider' or 'driver'
 * @param {number} timeSinceRequest - Time since request in minutes
 * @param {object} fareBreakdown - Fare breakdown from calculateFare
 * @returns {object} Cancellation details
 */
export const calculateCancellationFee = (cancelledBy, timeSinceRequest, fareBreakdown = null) => {
  const freeCancellationWindow = RIDE_TIMEOUTS.CANCELLATION_WINDOW / TIME.MINUTE;
  
  // Free cancellation within window
  if (timeSinceRequest <= freeCancellationWindow) {
    return {
      fee: 0,
      isFree: true,
      message: 'Free cancellation',
      reason: 'within_free_window'
    };
  }
  
  // Different fees based on who cancelled
  let fee = 0;
  let reason = 'standard_cancellation';
  
  if (cancelledBy === 'rider') {
    fee = CANCELLATION_FEES.RIDER;
    reason = 'rider_cancelled';
  } else if (cancelledBy === 'driver') {
    fee = 0; // Drivers don't pay cancellation fees
    reason = 'driver_cancelled';
  }
  
  // If we have fare breakdown, apply percentage logic
  if (fareBreakdown && fareBreakdown.totalFare > 0) {
    // For late cancellations, charge a percentage of estimated fare
    if (timeSinceRequest > 5) { // After 5 minutes
      fee = Math.round(fareBreakdown.totalFare * 0.1); // 10% of estimated fare
      reason = 'late_cancellation';
    }
  }
  
  return {
    fee,
    isFree: fee === 0,
    message: fee === 0 ? 'No cancellation fee' : `Cancellation fee: MWK ${fee}`,
    reason
  };
};

// ====================
// RIDE STATUS UTILITIES
// ====================

/**
 * Check if ride is in progress
 * @param {string} status - Ride status from RIDE_STATUS
 * @returns {boolean} True if ride is active
 */
export const isRideActive = (status) => {
  const activeStatuses = [
    RIDE_STATUS.SEARCHING,
    RIDE_STATUS.MATCHED,
    RIDE_STATUS.ACCEPTED,
    RIDE_STATUS.ARRIVING,
    RIDE_STATUS.ARRIVED,
    RIDE_STATUS.ONGOING
  ];
  return activeStatuses.includes(status);
};

/**
 * Check if ride is completed
 * @param {string} status - Ride status from RIDE_STATUS
 * @returns {boolean} True if ride is completed
 */
export const isRideCompleted = (status) => {
  return status === RIDE_STATUS.COMPLETED;
};

/**
 * Check if ride is cancelled
 * @param {string} status - Ride status from RIDE_STATUS
 * @returns {boolean} True if ride is cancelled
 */
export const isRideCancelled = (status) => {
  return status === RIDE_STATUS.CANCELLED;
};

/**
 * Get next ride status based on current status
 * @param {string} currentStatus - Current ride status
 * @returns {string|null} Next status or null if no next status
 */
export const getNextRideStatus = (currentStatus) => {
  const statusFlow = {
    [RIDE_STATUS.SEARCHING]: RIDE_STATUS.MATCHED,
    [RIDE_STATUS.MATCHED]: RIDE_STATUS.ACCEPTED,
    [RIDE_STATUS.ACCEPTED]: RIDE_STATUS.ARRIVING,
    [RIDE_STATUS.ARRIVING]: RIDE_STATUS.ARRIVED,
    [RIDE_STATUS.ARRIVED]: RIDE_STATUS.ONGOING,
    [RIDE_STATUS.ONGOING]: RIDE_STATUS.COMPLETED,
  };
  return statusFlow[currentStatus] || null;
};

/**
 * Get status color for UI display
 * @param {string} status - Ride status
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS[RIDE_STATUS.SEARCHING];
};

/**
 * Get status display text
 * @param {string} status - Ride status
 * @param {boolean} isDriver - Whether user is driver (default: false)
 * @returns {string} Human-readable status
 */
export const getStatusText = (status, isDriver = false) => {
  const statusTexts = {
    [RIDE_STATUS.SEARCHING]: isDriver ? 'Waiting for ride' : 'Searching for driver',
    [RIDE_STATUS.MATCHED]: isDriver ? 'Ride matched' : 'Driver matched',
    [RIDE_STATUS.ACCEPTED]: isDriver ? 'Ride accepted' : 'Driver on the way',
    [RIDE_STATUS.ARRIVING]: isDriver ? 'Arriving soon' : 'Driver arriving',
    [RIDE_STATUS.ARRIVED]: isDriver ? 'Waiting for rider' : 'Driver arrived',
    [RIDE_STATUS.ONGOING]: isDriver ? 'Trip in progress' : 'On the way',
    [RIDE_STATUS.COMPLETED]: 'Completed',
    [RIDE_STATUS.CANCELLED]: 'Cancelled',
    [RIDE_STATUS.NO_DRIVERS]: 'No drivers available',
    [RIDE_STATUS.EXPIRED]: 'Expired',
  };
  return statusTexts[status] || 'Unknown status';
};

// ====================
// RIDE VALIDATION UTILITIES
// ====================

/**
 * Validate ride request parameters
 * @param {object} rideRequest - Ride request object
 * @returns {object} Validation result
 */
export const validateRideRequest = (rideRequest) => {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  const requiredFields = ['pickupLocation', 'destination', 'vehicleType'];
  requiredFields.forEach(field => {
    if (!rideRequest[field]) {
      errors.push({
        field,
        code: ERROR_CODES.REQUIRED_FIELD,
        message: `${field} is required`
      });
    }
  });
  
  // Validate vehicle type
  if (rideRequest.vehicleType && !Object.values(VEHICLE_TYPES).includes(rideRequest.vehicleType)) {
    errors.push({
      field: 'vehicleType',
      code: ERROR_CODES.INVALID_INPUT,
      message: 'Invalid vehicle type'
    });
  }
  
  // Validate payment method if provided
  if (rideRequest.paymentMethod) {
    const validMethods = ['cash', 'wallet', 'card', 'mobile_money'];
    if (!validMethods.includes(rideRequest.paymentMethod)) {
      warnings.push({
        field: 'paymentMethod',
        message: 'Payment method may not be supported'
      });
    }
  }
  
  // Check distance between pickup and destination
  if (rideRequest.pickupLocation && rideRequest.destination) {
    const distance = calculateDistance(
      rideRequest.pickupLocation.latitude,
      rideRequest.pickupLocation.longitude,
      rideRequest.destination.latitude,
      rideRequest.destination.longitude
    );
    
    if (distance < 0.1) { // Less than 100 meters
      warnings.push({
        field: 'destination',
        message: 'Destination is very close to pickup location'
      });
    }
    
    if (distance > 50) { // More than 50km
      warnings.push({
        field: 'destination',
        message: 'Long distance ride - fare may be high'
      });
    }
    
    rideRequest.distance = distance;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    rideRequest
  };
};

/**
 * Check if driver is within acceptable distance for pickup
 * @param {object} driverLocation - Driver's location
 * @param {object} pickupLocation - Pickup location
 * @returns {object} Distance check result
 */
export const checkDriverDistance = (driverLocation, pickupLocation) => {
  if (!driverLocation || !pickupLocation) {
    return {
      isWithinDistance: false,
      distance: null,
      message: ERROR_MESSAGES.LOCATION_UNAVAILABLE
    };
  }
  
  const distance = calculateDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    pickupLocation.latitude,
    pickupLocation.longitude
  );
  
  const isWithinMaxDistance = distance <= DISTANCE.MAX_DRIVER_DISTANCE / 1000; // Convert meters to km
  const isWithinPreferredDistance = distance <= DISTANCE.PREFERRED_DRIVER_DISTANCE / 1000;
  
  return {
    isWithinDistance: isWithinMaxDistance,
    isWithinPreferredDistance,
    distance: Math.round(distance * 1000), // Convert to meters
    maxAllowed: DISTANCE.MAX_DRIVER_DISTANCE,
    preferred: DISTANCE.PREFERRED_DRIVER_DISTANCE,
    message: isWithinMaxDistance 
      ? `Driver is ${Math.round(distance * 1000)}m away` 
      : 'Driver is too far away'
  };
};

// ====================
// RIDE TIME UTILITIES
// ====================

/**
 * Format ride duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (minutes < 1) {
    return 'Less than a minute';
  }
  
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Calculate ride elapsed time
 * @param {Date|string} startTime - Ride start time
 * @param {Date|string} endTime - Ride end time (optional, for ongoing rides)
 * @returns {object} Elapsed time breakdown
 */
export const calculateElapsedTime = (startTime, endTime = null) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  const diffMs = end - start;
  const diffMinutes = Math.floor(diffMs / TIME.MINUTE);
  const diffHours = Math.floor(diffMs / TIME.HOUR);
  
  return {
    milliseconds: diffMs,
    seconds: Math.floor(diffMs / TIME.SECOND),
    minutes: diffMinutes,
    hours: diffHours,
    formatted: diffMinutes < 60 
      ? `${diffMinutes} min` 
      : `${diffHours}h ${diffMinutes % 60}m`,
    isOngoing: !endTime
  };
};

/**
 * Check if ride request has expired
 * @param {Date|string} requestTime - Time when ride was requested
 * @returns {boolean} True if expired
 */
export const isRideExpired = (requestTime) => {
  const request = new Date(requestTime);
  const now = new Date();
  const diffMs = now - request;
  
  return diffMs > RIDE_TIMEOUTS.SEARCH_TIMEOUT;
};

// ====================
// REAL-TIME RIDE UTILITIES
// ====================

/**
 * Generate unique ride ID
 * @returns {string} Unique ride ID
 */
export const generateRideId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `RIDE_${timestamp}_${random}`.toUpperCase();
};

/**
 * Generate ride receipt data
 * @param {object} rideData - Complete ride data
 * @returns {object} Receipt data
 */
export const generateRideReceipt = (rideData) => {
  const {
    id,
    driver,
    rider,
    pickupLocation,
    destination,
    vehicleType,
    fare,
    status,
    startedAt,
    completedAt,
    distance,
    duration
  } = rideData;
  
  const receiptId = `RECEIPT_${id}_${Date.now().toString(36)}`;
  
  return {
    receiptId,
    rideId: id,
    date: completedAt || new Date().toISOString(),
    
    // Parties
    driver: {
      name: driver?.name || 'Unknown Driver',
      phone: driver?.phone || 'N/A',
      vehicle: driver?.vehicle || 'N/A',
      rating: driver?.rating || 0
    },
    
    rider: {
      name: rider?.name || 'Unknown Rider',
      phone: rider?.phone || 'N/A'
    },
    
    // Trip details
    trip: {
      from: pickupLocation?.address || 'Pickup location',
      to: destination?.address || 'Destination',
      distance: distance ? `${(distance).toFixed(2)} km` : 'N/A',
      duration: duration ? formatDuration(duration) : 'N/A',
      vehicleType: vehicleType || 'Standard'
    },
    
    // Fare breakdown
    fare: {
      ...fare,
      formattedTotal: `MWK ${fare?.totalFare || 0}`
    },
    
    // Payment
    payment: {
      method: rideData.paymentMethod || 'cash',
      status: rideData.paymentStatus || 'completed'
    },
    
    // Status
    status: status || RIDE_STATUS.COMPLETED,
    
    // Metadata
    metadata: {
      generatedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      receiptNumber: `#${receiptId.substr(-8)}`
    }
  };
};

/**
 * Calculate driver earnings for a ride
 * @param {number} totalFare - Total ride fare
 * @param {number} commissionRate - Platform commission rate (default: 0.2 for 20%)
 * @returns {object} Earnings breakdown
 */
export const calculateDriverEarnings = (totalFare, commissionRate = 0.2) => {
  const commission = totalFare * commissionRate;
  const earnings = totalFare - commission;
  
  return {
    totalFare,
    commissionRate: commissionRate * 100, // Percentage
    commission: Math.round(commission),
    earnings: Math.round(earnings),
    breakdown: {
      fare: totalFare,
      commission: Math.round(commission),
      netEarnings: Math.round(earnings)
    }
  };
};

// ====================
// RIDE HISTORY UTILITIES
// ====================

/**
 * Filter rides by status
 * @param {Array} rides - Array of rides
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered rides
 */
export const filterRidesByStatus = (rides, status) => {
  if (!Array.isArray(rides)) return [];
  return rides.filter(ride => ride.status === status);
};

/**
 * Sort rides by date (newest first)
 * @param {Array} rides - Array of rides
 * @param {string} order - 'asc' or 'desc' (default: 'desc')
 * @returns {Array} Sorted rides
 */
export const sortRidesByDate = (rides, order = 'desc') => {
  if (!Array.isArray(rides)) return [];
  
  return [...rides].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.startedAt || 0);
    const dateB = new Date(b.createdAt || b.startedAt || 0);
    
    return order === 'desc' 
      ? dateB - dateA  // Newest first
      : dateA - dateB; // Oldest first
  });
};

/**
 * Calculate ride statistics
 * @param {Array} rides - Array of rides
 * @returns {object} Ride statistics
 */
export const calculateRideStats = (rides) => {
  if (!Array.isArray(rides) || rides.length === 0) {
    return {
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      totalDistance: 0,
      totalEarnings: 0,
      averageRating: 0,
      averageDistance: 0
    };
  }
  
  const completedRides = rides.filter(ride => ride.status === RIDE_STATUS.COMPLETED);
  const cancelledRides = rides.filter(ride => ride.status === RIDE_STATUS.CANCELLED);
  
  const totalDistance = completedRides.reduce((sum, ride) => sum + (ride.distance || 0), 0);
  const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.fare?.totalFare || 0), 0);
  const totalRatings = completedRides.reduce((sum, ride) => sum + (ride.riderRating || 0), 0);
  
  return {
    totalRides: rides.length,
    completedRides: completedRides.length,
    cancelledRides: cancelledRides.length,
    completionRate: rides.length > 0 ? (completedRides.length / rides.length) * 100 : 0,
    totalDistance: Math.round(totalDistance * 100) / 100, // 2 decimal places
    totalEarnings,
    averageRating: completedRides.length > 0 ? totalRatings / completedRides.length : 0,
    averageDistance: completedRides.length > 0 ? totalDistance / completedRides.length : 0,
    lastRideDate: rides.length > 0 ? rides[0].createdAt || rides[0].completedAt : null
  };
};

// ====================
// RIDE MOCK DATA GENERATOR (for testing)
// ====================

/**
 * Generate mock ride data for testing
 * @param {object} options - Generation options
 * @returns {object} Mock ride data
 */
export const generateMockRide = (options = {}) => {
  const defaultOptions = {
    id: generateRideId(),
    status: RIDE_STATUS.COMPLETED,
    vehicleType: VEHICLE_TYPES.STANDARD,
    distance: 5 + Math.random() * 10,
    duration: 15 + Math.random() * 30,
    waitingMinutes: Math.random() * 5,
    surgeMultiplier: SURGE_MULTIPLIERS[Math.floor(Math.random() * SURGE_MULTIPLIERS.length)],
    ...options
  };
  
  const fare = calculateFare(
    defaultOptions.distance,
    defaultOptions.duration,
    defaultOptions.vehicleType,
    defaultOptions.surgeMultiplier,
    defaultOptions.waitingMinutes
  );
  
  const earnings = calculateDriverEarnings(fare.totalFare);
  
  const locations = [
    { name: "Lilongwe City Center", lat: -13.9626, lng: 33.7741 },
    { name: "Area 3", lat: -13.9681, lng: 33.7702 },
    { name: "Area 47", lat: -13.9512, lng: 33.7874 },
    { name: "Kawale", lat: -13.9723, lng: 33.7621 },
    { name: "Old Town", lat: -13.9832, lng: 33.7823 }
  ];
  
  const pickupIndex = Math.floor(Math.random() * locations.length);
  const destinationIndex = (pickupIndex + 1 + Math.floor(Math.random() * (locations.length - 1))) % locations.length;
  
  return {
    id: defaultOptions.id,
    status: defaultOptions.status,
    vehicleType: defaultOptions.vehicleType,
    
    pickupLocation: {
      ...locations[pickupIndex],
      address: `${locations[pickupIndex].name}, Lilongwe`,
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    
    destination: {
      ...locations[destinationIndex],
      address: `${locations[destinationIndex].name}, Lilongwe`,
      timestamp: new Date(Date.now() - 3300000).toISOString()
    },
    
    driver: {
      id: `DRIVER_${Math.random().toString(36).substr(2, 8)}`,
      name: `Driver ${Math.floor(Math.random() * 1000)}`,
      phone: `+26588${Math.floor(1000000 + Math.random() * 9000000)}`,
      rating: 3 + Math.random() * 2, // 3-5 stars
      vehicle: {
        make: "Toyota",
        model: "Corolla",
        color: "White",
        plate: `LL ${Math.floor(1000 + Math.random() * 9000)} A`
      }
    },
    
    rider: {
      id: `RIDER_${Math.random().toString(36).substr(2, 8)}`,
      name: `Rider ${Math.floor(Math.random() * 1000)}`,
      phone: `+26599${Math.floor(1000000 + Math.random() * 9000000)}`
    },
    
    fare,
    earnings,
    
    distance: defaultOptions.distance,
    duration: defaultOptions.duration,
    waitingMinutes: defaultOptions.waitingMinutes,
    
    timeline: {
      requested: new Date(Date.now() - 3600000).toISOString(),
      accepted: new Date(Date.now() - 3550000).toISOString(),
      arriving: new Date(Date.now() - 3500000).toISOString(),
      arrived: new Date(Date.now() - 3450000).toISOString(),
      started: new Date(Date.now() - 3400000).toISOString(),
      completed: new Date(Date.now() - 3300000).toISOString()
    },
    
    payment: {
      method: Math.random() > 0.5 ? 'cash' : 'wallet',
      status: 'completed',
      transactionId: `TXN_${Date.now().toString(36)}`
    },
    
    rating: {
      driverRating: 4 + Math.random(), // 4-5 stars
      riderRating: 4 + Math.random(),
      driverComment: "Good rider, on time",
      riderComment: "Safe driver, good service"
    }
  };
};

// ====================
// EXPORT ALL UTILITIES
// ====================

export default {
  // Calculation utilities
  calculateDistance,
  calculateETA,
  calculateFare,
  calculateCancellationFee,
  
  // Status utilities
  isRideActive,
  isRideCompleted,
  isRideCancelled,
  getNextRideStatus,
  getStatusColor,
  getStatusText,
  
  // Validation utilities
  validateRideRequest,
  checkDriverDistance,
  
  // Time utilities
  formatDuration,
  calculateElapsedTime,
  isRideExpired,
  
  // Real-time utilities
  generateRideId,
  generateRideReceipt,
  calculateDriverEarnings,
  
  // History utilities
  filterRidesByStatus,
  sortRidesByDate,
  calculateRideStats,
  
  // Mock data (for testing)
  generateMockRide
};