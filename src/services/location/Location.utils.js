// src/services/location/Location.utils.js
import { Platform, Linking, Alert } from 'react-native';

/**
 * Location Utilities - Helper functions for location-related calculations and operations
 * Companion file to LocationService.js
 */

// ====================
// CONSTANTS
// ====================

export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS_M = 6371000;
export const METERS_PER_KM = 1000;
export const KM_PER_MILE = 1.60934;
export const METERS_PER_MILE = 1609.34;
export const MIN_LOCATION_ACCURACY = 50; // meters
export const MAX_CACHED_LOCATIONS = 100;
export const GEOCODING_CACHE_DURATION = 3600000; // 1 hour in ms

// ====================
// DISTANCE CALCULATIONS
// ====================

/**
 * Calculate distance between two coordinates using Haversine formula (in meters)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
};

/**
 * Calculate distance in kilometers
 */
export const calculateDistanceInKm = (lat1, lon1, lat2, lon2) => {
  return calculateDistance(lat1, lon1, lat2, lon2) / METERS_PER_KM;
};

/**
 * Calculate distance in miles
 */
export const calculateDistanceInMiles = (lat1, lon1, lat2, lon2) => {
  return calculateDistance(lat1, lon1, lat2, lon2) / METERS_PER_MILE;
};

/**
 * Get formatted distance string (auto-selects unit)
 */
export const getFormattedDistance = (lat1, lon1, lat2, lon2) => {
  const distanceInMeters = calculateDistance(lat1, lon1, lat2, lon2);
  
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  } else {
    const distanceInKm = (distanceInMeters / 1000).toFixed(1);
    return `${distanceInKm} km`;
  }
};

/**
 * Calculate ETA (Estimated Time of Arrival) in minutes
 */
export const calculateETA = (distanceInMeters, averageSpeedKmh = 30) => {
  const distanceInKm = distanceInMeters / 1000;
  const timeInHours = distanceInKm / averageSpeedKmh;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  return Math.max(1, timeInMinutes); // At least 1 minute
};

// ====================
// COORDINATE OPERATIONS
// ====================

/**
 * Calculate bearing between two points
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ1 = (lon1 * Math.PI) / 180;
  const λ2 = (lon2 * Math.PI) / 180;
  
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  
  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360;
  
  return bearing;
};

/**
 * Calculate midpoint between two coordinates
 */
export const calculateMidpoint = (lat1, lon1, lat2, lon2) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ1 = (lon1 * Math.PI) / 180;
  const λ2 = (lon2 * Math.PI) / 180;
  
  const Bx = Math.cos(φ2) * Math.cos(λ2 - λ1);
  const By = Math.cos(φ2) * Math.sin(λ2 - λ1);
  
  const φ3 = Math.atan2(
    Math.sin(φ1) + Math.sin(φ2),
    Math.sqrt((Math.cos(φ1) + Bx) * (Math.cos(φ1) + Bx) + By * By)
  );
  
  const λ3 = λ1 + Math.atan2(By, Math.cos(φ1) + Bx);
  
  return {
    latitude: (φ3 * 180) / Math.PI,
    longitude: (λ3 * 180) / Math.PI
  };
};

/**
 * Calculate a point at a given distance and bearing from a start point
 */
export const calculateDestinationPoint = (lat, lon, distance, bearing) => {
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const δ = distance / EARTH_RADIUS_M;
  const θ = (bearing * Math.PI) / 180;
  
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  
  return {
    latitude: (φ2 * 180) / Math.PI,
    longitude: (λ2 * 180) / Math.PI
  };
};

// ====================
// LOCATION VALIDATION
// ====================

/**
 * Check if coordinates are valid
 */
export const isValidCoordinate = (latitude, longitude) => {
  return (
    latitude !== null &&
    longitude !== null &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Check if location has acceptable accuracy
 */
export const isLocationAccurate = (location, maxAccuracy = MIN_LOCATION_ACCURACY) => {
  if (!location?.coords?.accuracy) return false;
  return location.coords.accuracy <= maxAccuracy;
};

/**
 * Filter out inaccurate locations
 */
export const filterAccurateLocations = (locations, maxAccuracy = MIN_LOCATION_ACCURACY) => {
  return locations.filter(location => 
    location?.coords?.accuracy && location.coords.accuracy <= maxAccuracy
  );
};

// ====================
// ADDRESS & FORMATTING
// ====================

/**
 * Format coordinates to string
 */
export const formatCoordinates = (latitude, longitude, precision = 6) => {
  if (!isValidCoordinate(latitude, longitude)) return 'Invalid coordinates';
  
  const latStr = latitude >= 0 ? 
    `${latitude.toFixed(precision)}°N` : 
    `${Math.abs(latitude).toFixed(precision)}°S`;
  
  const lonStr = longitude >= 0 ? 
    `${longitude.toFixed(precision)}°E` : 
    `${Math.abs(longitude).toFixed(precision)}°W`;
  
  return `${latStr}, ${lonStr}`;
};

/**
 * Extract address components from Google Places result
 */
export const parseGooglePlacesResult = (result) => {
  if (!result) return null;
  
  const address = {
    formattedAddress: result.formatted_address || '',
    streetNumber: '',
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    latitude: result.geometry?.location?.lat,
    longitude: result.geometry?.location?.lng
  };
  
  if (result.address_components) {
    result.address_components.forEach(component => {
      if (component.types.includes('street_number')) {
        address.streetNumber = component.long_name;
      }
      if (component.types.includes('route')) {
        address.street = component.long_name;
      }
      if (component.types.includes('locality')) {
        address.city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        address.state = component.long_name;
      }
      if (component.types.includes('country')) {
        address.country = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        address.postalCode = component.long_name;
      }
    });
  }
  
  return address;
};

/**
 * Create a readable address string
 */
export const createReadableAddress = (address) => {
  if (!address) return '';
  
  const parts = [];
  if (address.streetNumber && address.street) {
    parts.push(`${address.streetNumber} ${address.street}`);
  } else if (address.street) {
    parts.push(address.street);
  }
  
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postalCode) parts.push(address.postalCode);
  
  return parts.join(', ');
};

// ====================
// MAP & NAVIGATION
// ====================

/**
 * Open location in Google Maps
 */
export const openInGoogleMaps = (latitude, longitude, label = 'Destination') => {
  const url = Platform.OS === 'ios'
    ? `comgooglemaps://?q=${latitude},${longitude}&label=${encodeURIComponent(label)}`
    : `google.navigation:q=${latitude},${longitude}`;
  
  Linking.openURL(url).catch(() => {
    // Fallback to browser Google Maps
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(fallbackUrl);
  });
};

/**
 * Open location in Apple Maps (iOS only)
 */
export const openInAppleMaps = (latitude, longitude, label = 'Destination') => {
  if (Platform.OS !== 'ios') return;
  
  const url = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(label)}`;
  Linking.openURL(url);
};

/**
 * Get directions URL for any maps app
 */
export const getDirectionsUrl = (startLat, startLon, endLat, endLon, provider = 'google') => {
  if (provider === 'google') {
    return `https://www.google.com/maps/dir/${startLat},${startLon}/${endLat},${endLon}`;
  } else if (provider === 'apple') {
    return `http://maps.apple.com/?saddr=${startLat},${startLon}&daddr=${endLat},${endLon}`;
  }
  return null;
};

// ====================
// ROUTE CALCULATIONS
// ====================

/**
 * Calculate total distance of a route (array of coordinates)
 */
export const calculateRouteDistance = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lat1, lon1] = coordinates[i];
    const [lat2, lon2] = coordinates[i + 1];
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }
  
  return totalDistance;
};

/**
 * Calculate route duration based on distance and average speed
 */
export const calculateRouteDuration = (distanceInMeters, trafficFactor = 1.0) => {
  const AVERAGE_SPEED_KMH = 30; // Urban average speed
  const distanceInKm = distanceInMeters / 1000;
  const baseHours = distanceInKm / AVERAGE_SPEED_KMH;
  const adjustedHours = baseHours * trafficFactor;
  return Math.ceil(adjustedHours * 60); // Return in minutes
};

// ====================
// PROXITY & GEO-FENCING
// ====================

/**
 * Check if a point is within a radius of another point
 */
export const isWithinRadius = (centerLat, centerLon, pointLat, pointLon, radiusMeters) => {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusMeters;
};

/**
 * Calculate bounding box around a point
 */
export const calculateBoundingBox = (latitude, longitude, radiusKm) => {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lonDelta = latDelta / Math.cos(latitude * Math.PI / 180);
  
  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLon: longitude - lonDelta,
    maxLon: longitude + lonDelta
  };
};

// ====================
// SPEED CALCULATIONS
// ====================

/**
 * Convert m/s to km/h
 */
export const metersPerSecondToKmh = (mps) => {
  return mps * 3.6;
};

/**
 * Convert km/h to m/s
 */
export const kmhToMetersPerSecond = (kmh) => {
  return kmh / 3.6;
};

/**
 * Calculate average speed from distance and time
 */
export const calculateAverageSpeed = (distanceMeters, timeSeconds) => {
  if (timeSeconds === 0) return 0;
  return (distanceMeters / timeSeconds) * 3.6; // Return in km/h
};

// ====================
// CACHE HELPERS
// ====================

/**
 * Simple in-memory cache for geocoding results
 */
export class GeocodingCache {
  constructor(maxSize = 100, ttl = GEOCODING_CACHE_CACHE_DURATION) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// ====================
// EXPORT DEFAULT
// ====================

export default {
  // Distance calculations
  calculateDistance,
  calculateDistanceInKm,
  calculateDistanceInMiles,
  getFormattedDistance,
  calculateETA,
  
  // Coordinate operations
  calculateBearing,
  calculateMidpoint,
  calculateDestinationPoint,
  
  // Location validation
  isValidCoordinate,
  isLocationAccurate,
  filterAccurateLocations,
  
  // Address & formatting
  formatCoordinates,
  parseGooglePlacesResult,
  createReadableAddress,
  
  // Map & navigation
  openInGoogleMaps,
  openInAppleMaps,
  getDirectionsUrl,
  
  // Route calculations
  calculateRouteDistance,
  calculateRouteDuration,
  
  // Proximity & geo-fencing
  isWithinRadius,
  calculateBoundingBox,
  
  // Speed calculations
  metersPerSecondToKmh,
  kmhToMetersPerSecond,
  calculateAverageSpeed,
  
  // Cache
  GeocodingCache,
  
  // Constants
  EARTH_RADIUS_KM,
  EARTH_RADIUS_M,
  METERS_PER_KM,
  KM_PER_MILE,
  METERS_PER_MILE,
  MIN_LOCATION_ACCURACY
};