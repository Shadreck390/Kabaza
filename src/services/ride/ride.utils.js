// src/services/ride/ride.utils.js

// ====================
// CONSTANTS
// ====================

export const RIDE_STATUS = {
  SEARCHING: 'searching',
  MATCHED: 'matched',
  ACCEPTED: 'accepted',
  ARRIVING: 'arriving',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const VEHICLE_TYPES = {
  MOTORCYCLE: 'motorcycle',
  CAR: 'car',
  MINIBUS: 'minibus',
  BICYCLE: 'bicycle'
};

// Pricing in MWK (Malawi Kwacha)
export const PRICING = {
  BASE_FARES: {
    motorcycle: 500,
    car: 800,
    minibus: 1000,
    bicycle: 300
  },
  PER_KM_RATES: {
    motorcycle: 300,
    car: 500,
    minibus: 400,
    bicycle: 200
  },
  PER_MINUTE_RATES: {
    motorcycle: 20,
    car: 30,
    minibus: 25,
    bicycle: 10
  },
  MINIMUM_FARES: {
    motorcycle: 700,
    car: 1000,
    minibus: 1200,
    bicycle: 400
  },
  CANCELLATION_FEES: {
    motorcycle: 200,
    car: 300,
    minibus: 250,
    bicycle: 100
  }
};

// ====================
// FARE CALCULATIONS
// ====================

/**
 * Calculate ride fare with detailed breakdown
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in minutes
 * @param {string} vehicleType - One of VEHICLE_TYPES
 * @param {number} surgeMultiplier - Surge pricing multiplier (default: 1.0)
 * @returns {Object} Fare breakdown
 */
export const calculateFare = (distance, duration, vehicleType, surgeMultiplier = 1.0) => {
  const baseFare = PRICING.BASE_FARES[vehicleType] || PRICING.BASE_FARES.car;
  const distanceFare = distance * (PRICING.PER_KM_RATES[vehicleType] || PRICING.PER_KM_RATES.car);
  const timeFare = duration * (PRICING.PER_MINUTE_RATES[vehicleType] || PRICING.PER_MINUTE_RATES.car);
  
  const subtotal = baseFare + distanceFare + timeFare;
  const surgeAmount = surgeMultiplier > 1 ? subtotal * (surgeMultiplier - 1) : 0;
  const totalFare = subtotal + surgeAmount;
  
  // Apply minimum fare
  const minimumFare = PRICING.MINIMUM_FARES[vehicleType] || PRICING.MINIMUM_FARES.car;
  const finalTotal = Math.max(totalFare, minimumFare);
  
  return {
    baseFare: Math.round(baseFare),
    distanceFare: Math.round(distanceFare),
    timeFare: Math.round(timeFare),
    subtotal: Math.round(subtotal),
    surgeMultiplier,
    surgeAmount: Math.round(surgeAmount),
    totalFare: Math.round(finalTotal),
    minimumFare: Math.round(minimumFare),
    meetsMinimum: finalTotal === totalFare,
    breakdown: {
      base: Math.round(baseFare),
      distance: Math.round(distanceFare),
      time: Math.round(timeFare),
      surge: Math.round(surgeAmount),
      total: Math.round(finalTotal)
    }
  };
};

/**
 * Calculate estimated fare based on distance and vehicle type
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} vehicleType - Vehicle type
 * @returns {Object} Estimated fare range
 */
export const estimateFare = (distanceKm, vehicleType) => {
  const baseFare = PRICING.BASE_FARES[vehicleType] || PRICING.BASE_FARES.car;
  const perKm = PRICING.PER_KM_RATES[vehicleType] || PRICING.PER_KM_RATES.car;
  const perMinute = PRICING.PER_MINUTE_RATES[vehicleType] || PRICING.PER_MINUTE_RATES.car;
  
  // Assume average speed of 30 km/h for time estimation
  const estimatedMinutes = (distanceKm / 30) * 60;
  
  const minFare = baseFare + (distanceKm * perKm * 0.8) + (estimatedMinutes * perMinute * 0.8);
  const maxFare = baseFare + (distanceKm * perKm * 1.2) + (estimatedMinutes * perMinute * 1.2);
  
  return {
    lowEstimate: Math.round(minFare),
    highEstimate: Math.round(maxFare),
    average: Math.round((minFare + maxFare) / 2),
    baseFare: Math.round(baseFare),
    perKm: Math.round(perKm),
    currency: 'MWK'
  };
};

// ====================
// TIME & DURATION
// ====================

/**
 * Calculate ETA (Estimated Time of Arrival)
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} averageSpeedKmh - Average speed in km/h (default: 30)
 * @param {number} trafficFactor - Traffic multiplier (default: 1.0)
 * @returns {number} ETA in minutes
 */
export const calculateETA = (distanceKm, averageSpeedKmh = 30, trafficFactor = 1.0) => {
  const baseTimeHours = distanceKm / averageSpeedKmh;
  const adjustedTimeHours = baseTimeHours * trafficFactor;
  return Math.max(1, Math.ceil(adjustedTimeHours * 60)); // At least 1 minute
};

/**
 * Format duration (minutes) to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

/**
 * Format timestamp to relative time
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

// ====================
// DISTANCE & LOCATION
// ====================

/**
 * Format distance with appropriate unit
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  
  const kilometers = meters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)} km`;
  }
  
  return `${Math.round(kilometers)} km`;
};

/**
 * Calculate straight-line distance between two coordinates
 * @param {Object} pointA - {latitude, longitude}
 * @param {Object} pointB - {latitude, longitude}
 * @returns {number} Distance in meters
 */
export const calculateDistance = (pointA, pointB) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (pointA.latitude * Math.PI) / 180;
  const φ2 = (pointB.latitude * Math.PI) / 180;
  const Δφ = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const Δλ = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ====================
// VALIDATION & CHECKS
// ====================

/**
 * Validate ride request data
 * @param {Object} rideData - Ride request data
 * @returns {Object} Validation result
 */
export const validateRideRequest = (rideData) => {
  const errors = [];
  const warnings = [];
  
  // Required fields
  const requiredFields = ['pickupLocation', 'destination', 'vehicleType'];
  requiredFields.forEach(field => {
    if (!rideData[field]) {
      errors.push(`${field} is required`);
    }
  });
  
  // Location validation
  if (rideData.pickupLocation && rideData.destination) {
    const distance = calculateDistance(
      rideData.pickupLocation,
      rideData.destination
    );
    
    if (distance < 100) {
      errors.push('Pickup and destination are too close (minimum 100m)');
    }
    
    if (distance > 50000) {
      warnings.push('Distance exceeds 50km. Consider shorter trips.');
    }
  }
  
  // Vehicle type validation
  if (rideData.vehicleType && !Object.values(VEHICLE_TYPES).includes(rideData.vehicleType)) {
    errors.push(`Invalid vehicle type. Must be one of: ${Object.values(VEHICLE_TYPES).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Check if ride can be cancelled without penalty
 * @param {string} status - Current ride status
 * @param {string} timestamp - Ride creation timestamp
 * @returns {Object} Cancellation info
 */
export const getCancellationInfo = (status, timestamp) => {
  const now = new Date();
  const rideTime = new Date(timestamp);
  const timeDiff = (now - rideTime) / 60000; // Difference in minutes
  
  const freeCancellationTime = 2; // 2 minutes free cancellation
  const allowedStatuses = [RIDE_STATUS.SEARCHING, RIDE_STATUS.MATCHED];
  
  const canCancelFree = 
    allowedStatuses.includes(status) && 
    timeDiff <= freeCancellationTime;
  
  return {
    canCancel: allowedStatuses.includes(status),
    canCancelFree,
    fee: canCancelFree ? 0 : PRICING.CANCELLATION_FEES.car, // Default to car fee
    timeRemaining: canCancelFree ? Math.max(0, freeCancellationTime - timeDiff) : 0
  };
};

// ====================
// FORMATTING & DISPLAY
// ====================

/**
 * Format currency (MWK)
 * @param {number} amount - Amount in MWK
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `MWK ${amount.toLocaleString('en-MW')}`;
};

/**
 * Get status color for UI
 * @param {string} status - Ride status
 * @returns {string} Hex color code
 */
export const getStatusColor = (status) => {
  const colors = {
    [RIDE_STATUS.SEARCHING]: '#FF9500', // Orange
    [RIDE_STATUS.MATCHED]: '#007AFF',   // Blue
    [RIDE_STATUS.ACCEPTED]: '#34C759',  // Green
    [RIDE_STATUS.ARRIVING]: '#5856D6',  // Purple
    [RIDE_STATUS.ONGOING]: '#4A90E2',   // Light Blue
    [RIDE_STATUS.COMPLETED]: '#8E8E93', // Gray
    [RIDE_STATUS.CANCELLED]: '#FF3B30'  // Red
  };
  
  return colors[status] || '#8E8E93';
};

/**
 * Get status display text
 * @param {string} status - Ride status
 * @returns {string} User-friendly status text
 */
export const getStatusText = (status) => {
  const texts = {
    [RIDE_STATUS.SEARCHING]: 'Looking for driver',
    [RIDE_STATUS.MATCHED]: 'Driver matched',
    [RIDE_STATUS.ACCEPTED]: 'Driver on the way',
    [RIDE_STATUS.ARRIVING]: 'Driver arriving',
    [RIDE_STATUS.ONGOING]: 'Trip in progress',
    [RIDE_STATUS.COMPLETED]: 'Trip completed',
    [RIDE_STATUS.CANCELLED]: 'Trip cancelled'
  };
  
  return texts[status] || 'Unknown status';
};

/**
 * Generate ride summary for display
 * @param {Object} ride - Ride object
 * @returns {Object} Formatted summary
 */
export const generateRideSummary = (ride) => {
  const {
    pickupLocation,
    destination,
    vehicleType,
    distance,
    duration,
    fare
  } = ride;
  
  return {
    pickup: pickupLocation?.address || 'Pickup location',
    destination: destination?.address || 'Destination',
    vehicle: vehicleType ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1) : 'Vehicle',
    distance: distance ? formatDistance(distance) : 'Calculating...',
    duration: duration ? formatDuration(duration) : 'Calculating...',
    fare: fare ? formatCurrency(fare.totalFare) : 'Calculating...',
    status: getStatusText(ride.status),
    statusColor: getStatusColor(ride.status)
  };
};

// ====================
// RIDE ID GENERATION
// ====================

/**
 * Generate unique ride ID
 * @returns {string} Unique ride identifier
 */
export const generateRideId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `ride_${timestamp}_${random}`;
};

// ====================
// DEFAULT EXPORT
// ====================

export default {
  // Constants
  RIDE_STATUS,
  VEHICLE_TYPES,
  PRICING,
  
  // Calculations
  calculateFare,
  estimateFare,
  calculateETA,
  calculateDistance,
  
  // Formatting
  formatDuration,
  formatRelativeTime,
  formatDistance,
  formatCurrency,
  
  // Validation
  validateRideRequest,
  getCancellationInfo,
  
  // UI Helpers
  getStatusColor,
  getStatusText,
  generateRideSummary,
  
  // Utilities
  generateRideId
};