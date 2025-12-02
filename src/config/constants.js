/**
 * Application Constants
 * Static values that don't change between environments
 */

// ====================
// APP INFORMATION
// ====================
export const APP_INFO = {
  NAME: 'Kabaza',
  DISPLAY_NAME: 'Kabaza Ride',
  DESCRIPTION: 'Motorcycle taxi hailing service',
  SUPPORT_EMAIL: 'support@kabaza.com',
  WEBSITE: 'https://kabaza.com',
};

// ====================
// STORAGE KEYS
// ====================
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: '@Kabaza:authToken',
  REFRESH_TOKEN: '@Kabaza:refreshToken',
  USER_ID: '@Kabaza:userId',
  
  // User Data
  USER_PROFILE: '@Kabaza:userProfile',
  USER_SETTINGS: '@Kabaza:userSettings',
  RIDE_HISTORY: '@Kabaza:rideHistory',
  
  // App State
  ONBOARDING_COMPLETE: '@Kabaza:onboardingComplete',
  LOCATION_PERMISSION: '@Kabaza:locationPermission',
  NOTIFICATION_PERMISSION: '@Kabaza:notificationPermission',
  
  // Cache
  CACHE_TIMESTAMP: '@Kabaza:cacheTimestamp',
  LAST_LOCATION: '@Kabaza:lastLocation',
};

// ====================
// API CONSTANTS
// ====================
export const API_CONSTANTS = {
  STATUS: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
  
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
  
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// ====================
// MAP & LOCATION
// ====================
export const MAP_CONSTANTS = {
  // Default coordinates (Nairobi, Kenya)
  DEFAULT_LOCATION: {
    latitude: -1.9706,
    longitude: 30.1044,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  
  // Zoom levels
  ZOOM: {
    DEFAULT: 14,
    STREET: 16,
    CITY: 12,
    MAX: 18,
    MIN: 10,
  },
  
  // Map types
  MAP_TYPES: {
    STANDARD: 'standard',
    SATELLITE: 'satellite',
    HYBRID: 'hybrid',
    TERRAIN: 'terrain',
  },
  
  // Location accuracy
  ACCURACY: {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
    LOWEST: 3,
  },
};

// ====================
// RIDE CONSTANTS
// ====================
export const RIDE_CONSTANTS = {
  STATUS: {
    SEARCHING: 'searching',
    MATCHED: 'matched',
    PICKUP: 'pickup',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  
  VEHICLE_TYPES: {
    MOTORCYCLE: 'motorcycle',
    BODA_BODA: 'boda_boda',
  },
  
  PRICING: {
    BASE_FARE: 100, // KSH
    PER_KM: 50,     // KSH per kilometer
    PER_MINUTE: 5,  // KSH per minute
    MINIMUM_FARE: 150, // KSH
  },
};

// ====================
// UI CONSTANTS
// ====================
export const UI_CONSTANTS = {
  // Spacing
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  
  // Border Radius
  BORDER_RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    ROUND: 999,
  },
  
  // Shadows
  SHADOW: {
    SM: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    MD: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    LG: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
  
  // Animation
  ANIMATION: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500,
    },
    EASING: {
      LINEAR: 'linear',
      EASE: 'ease',
      EASE_IN: 'ease-in',
      EASE_OUT: 'ease-out',
      EASE_IN_OUT: 'ease-in-out',
    },
  },
};

// ====================
// TIME CONSTANTS
// ====================
export const TIME_CONSTANTS = {
  // In milliseconds
  ONE_SECOND: 1000,
  ONE_MINUTE: 60000,
  ONE_HOUR: 3600000,
  ONE_DAY: 86400000,
  
  // Cache durations
  CACHE_DURATION: {
    SHORT: 5 * 60000,      // 5 minutes
    MEDIUM: 30 * 60000,    // 30 minutes
    LONG: 24 * 3600000,    // 24 hours
  },
  
  // Refresh intervals
  REFRESH_INTERVAL: {
    LIVE_LOCATION: 10000,   // 10 seconds
    RIDE_STATUS: 5000,      // 5 seconds
    MESSAGES: 30000,        // 30 seconds
  },
};

// ====================
// ERROR MESSAGES
// ====================
export const ERROR_MESSAGES = {
  NETWORK: {
    NO_INTERNET: 'No internet connection. Please check your network.',
    TIMEOUT: 'Request timeout. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
  },
  
  LOCATION: {
    PERMISSION_DENIED: 'Location permission is required to find rides near you.',
    UNAVAILABLE: 'Location services are not available.',
    TIMEOUT: 'Unable to get your location. Please try again.',
  },
  
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid phone number or PIN.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
    ACCOUNT_LOCKED: 'Account is locked. Contact support.',
  },
  
  RIDE: {
    NO_DRIVERS: 'No drivers available in your area. Please try again.',
    CANCELLATION_FEE: 'Cancellation fee applied.',
    PAYMENT_FAILED: 'Payment failed. Please try another method.',
  },
};

// ====================
// DEFAULT VALUES
// ====================
export const DEFAULTS = {
  // User defaults
  USER: {
    LANGUAGE: 'en',
    CURRENCY: 'KSH',
    DISTANCE_UNIT: 'km',
    THEME: 'light',
  },
  
  // App defaults
  APP: {
    MAX_RETRY_ATTEMPTS: 3,
    REQUEST_TIMEOUT: 30000,
    DEBOUNCE_DELAY: 300,
  },
};

// ====================
// EXPORT ALL CONSTANTS
// ====================
export default {
  APP_INFO,
  STORAGE_KEYS,
  API_CONSTANTS,
  MAP_CONSTANTS,
  RIDE_CONSTANTS,
  UI_CONSTANTS,
  TIME_CONSTANTS,
  ERROR_MESSAGES,
  DEFAULTS,
};