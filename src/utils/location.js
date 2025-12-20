// src/utils/location.js

/**
 * Location and distance calculation utilities
 */

import Geolocation from 'react-native-geolocation-service';

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Calculate distance between two coordinate objects
 * @param {Object} point1 - {latitude, longitude}
 * @param {Object} point2 - {latitude, longitude}
 * @returns {number} Distance in kilometers
 */
export const calculateDistanceBetweenPoints = (point1, point2) => {
  if (!point1 || !point2 || !point1.latitude || !point1.longitude || !point2.latitude || !point2.longitude) {
    return 0;
  }
  
  return calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude);
};

/**
 * Calculate ETA based on distance and average speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} averageSpeedKmh - Average speed in km/h (default: 30)
 * @returns {number} ETA in minutes
 */
export const calculateETA = (distanceKm, averageSpeedKmh = 30) => {
  if (distanceKm <= 0 || averageSpeedKmh <= 0) return 0;
  
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.max(1, Math.ceil(timeHours * 60)); // At least 1 minute
};

/**
 * Check if location is within radius
 * @param {Object} location - Target location {latitude, longitude}
 * @param {Object} center - Center point {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if within radius
 */
export const isWithinRadius = (location, center, radiusKm) => {
  if (!location || !center) return false;
  
  const distance = calculateDistanceBetweenPoints(location, center);
  return distance <= radiusKm;
};

/**
 * Get bearing between two points
 * @param {Object} start - Start point {latitude, longitude}
 * @param {Object} end - End point {latitude, longitude}
 * @returns {number} Bearing in degrees (0-360)
 */
export const getBearing = (start, end) => {
  const startLat = toRadians(start.latitude);
  const startLng = toRadians(start.longitude);
  const endLat = toRadians(end.latitude);
  const endLng = toRadians(end.longitude);
  
  const dLng = endLng - startLng;
  
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
           Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x);
  bearing = toDegrees(bearing);
  return (bearing + 360) % 360;
};

/**
 * Get intermediate point between two locations
 * @param {Object} point1 - Start point
 * @param {Object} point2 - End point
 * @param {number} fraction - Fraction of distance (0-1)
 * @returns {Object} Intermediate point {latitude, longitude}
 */
export const getIntermediatePoint = (point1, point2, fraction) => {
  const lat1 = toRadians(point1.latitude);
  const lng1 = toRadians(point1.longitude);
  const lat2 = toRadians(point2.latitude);
  const lng2 = toRadians(point2.longitude);
  
  const distance = calculateDistanceBetweenPoints(point1, point2);
  const angularDistance = distance / EARTH_RADIUS_KM;
  
  const a = Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance);
  const b = Math.sin(fraction * angularDistance) / Math.sin(angularDistance);
  
  const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
  const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);
  
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);
  
  return {
    latitude: toDegrees(lat),
    longitude: toDegrees(lng)
  };
};

/**
 * Validate coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean} True if valid coordinates
 */
export const isValidCoordinates = (latitude, longitude) => {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude)
  );
};

/**
 * Get current location using Geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<Object>} Location object {latitude, longitude, accuracy, etc.}
 */
export const getCurrentLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
      ...options
    };
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        resolve({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        reject(error);
      },
      defaultOptions
    );
  });
};

/**
 * Watch location changes
 * @param {Function} callback - Callback function for location updates
 * @param {Object} options - Watch options
 * @returns {number} Watch ID for clearing
 */
export const watchLocation = (callback, options = {}) => {
  const defaultOptions = {
    enableHighAccuracy: true,
    distanceFilter: 10, // meters
    interval: 5000, // milliseconds
    fastestInterval: 2000,
    ...options
  };
  
  return Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      callback({
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp,
        heading: position.coords.heading,
        speed: position.coords.speed
      });
    },
    (error) => {
      console.error('Error watching location:', error);
    },
    defaultOptions
  );
};

/**
 * Stop watching location
 * @param {number} watchId - Watch ID from watchLocation
 */
export const stopWatchingLocation = (watchId) => {
  Geolocation.clearWatch(watchId);
};

/**
 * Calculate total distance of a route with multiple points
 * @param {Array} points - Array of {latitude, longitude} points
 * @returns {number} Total distance in kilometers
 */
export const calculateRouteDistance = (points) => {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    const distance = calculateDistanceBetweenPoints(points[i], points[i + 1]);
    totalDistance += distance;
  }
  
  return totalDistance;
};

/**
 * Find nearest point to a location from an array of points
 * @param {Object} location - Reference location
 * @param {Array} points - Array of points to search
 * @returns {Object} Nearest point and distance
 */
export const findNearestPoint = (location, points) => {
  if (!points || points.length === 0) {
    return { point: null, distance: Infinity };
  }
  
  let nearestPoint = points[0];
  let minDistance = calculateDistanceBetweenPoints(location, nearestPoint);
  
  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistanceBetweenPoints(location, points[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = points[i];
    }
  }
  
  return {
    point: nearestPoint,
    distance: minDistance,
    distanceMeters: Math.round(minDistance * 1000)
  };
};

// Helper functions
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

// Default locations (Malawi)
export const DEFAULT_LOCATIONS = {
  LILONGWE: {
    latitude: -13.9626,
    longitude: 33.7741,
    name: 'Lilongwe City Center'
  },
  BLANTYRE: {
    latitude: -15.7861,
    longitude: 35.0058,
    name: 'Blantyre City Center'
  },
  MZUZU: {
    latitude: -11.4587,
    longitude: 34.0151,
    name: 'Mzuzu City Center'
  },
  ZOMBA: {
    latitude: -15.3761,
    longitude: 35.3356,
    name: 'Zomba City Center'
  }
};

export default {
  calculateDistance,
  calculateDistanceBetweenPoints,
  calculateETA,
  isWithinRadius,
  getBearing,
  getIntermediatePoint,
  isValidCoordinates,
  getCurrentLocation,
  watchLocation,
  stopWatchingLocation,
  calculateRouteDistance,
  findNearestPoint,
  DEFAULT_LOCATIONS,
  toRadians,
  toDegrees
};