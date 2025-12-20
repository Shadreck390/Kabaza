// src/constants/app/index.js

// ====================
// APP CONFIGURATION
// ====================

export const APP_CONFIG = {
  // App Info
  APP_NAME: 'Kabaza',
  APP_VERSION: '1.0.0',
  APP_BUILD: '1',
  
  // Environment
  ENVIRONMENT: __DEV__ ? 'development' : 'production',
  IS_DEV: __DEV__,
  IS_PROD: !__DEV__,
  
  // Platform
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  
  // API Settings
  API_TIMEOUT: 30000, // 30 seconds
  API_MAX_RETRIES: 3,
  
  // Socket Settings
  SOCKET_RECONNECT_ATTEMPTS: 5,
  SOCKET_RECONNECT_DELAY: 1000,
  
  // Cache Settings
  CACHE_DURATION: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 60 * 60 * 1000, // 1 hour
  },
  
  // Geolocation Settings
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
  LOCATION_DISTANCE_FILTER: 10, // meters
  LOCATION_ACCURACY: {
    HIGH: {
      android: {
        accuracy: AndroidAccuracy.HIGH,
        distanceFilter: 10,
      },
      ios: {
        accuracy: iOSAccuracy.BestForNavigation,
        distanceFilter: 10,
      },
    },
    MEDIUM: {
      android: {
        accuracy: AndroidAccuracy.BALANCED,
        distanceFilter: 50,
      },
      ios: {
        accuracy: iOSAccuracy.Best,
        distanceFilter: 50,
      },
    },
    LOW: {
      android: {
        accuracy: AndroidAccuracy.LOW,
        distanceFilter: 100,
      },
      ios: {
        accuracy: iOSAccuracy.NearestTenMeters,
        distanceFilter: 100,
      },
    },
  },
};

// ====================
// RIDE CONSTANTS
// ====================

export const RIDE_STATUS = {
  PENDING: 'pending',          // Ride requested, waiting for driver
  SEARCHING: 'searching',      // Searching for drivers
  ACCEPTED: 'accepted',        // Driver accepted the ride
  ARRIVING: 'arriving',        // Driver arriving at pickup
  ARRIVED: 'arrived',          // Driver arrived at pickup
  STARTED: 'started',          // Ride started
  COMPLETED: 'completed',      // Ride completed
  CANCELLED: 'cancelled',      // Ride cancelled
  NO_DRIVERS: 'no_drivers',    // No drivers available
  TIMEOUT: 'timeout',          // Ride request timed out
};

export const RIDE_CANCELLATION_REASONS = {
  DRIVER_CANCELLED: 'driver_cancelled',
  RIDER_CANCELLED: 'rider_cancelled',
  NO_SHOW: 'no_show',
  EMERGENCY: 'emergency',
  OTHER: 'other',
};

export const VEHICLE_TYPES = {
  CAR: 'car',
  BIKE: 'bike',
  TUKTUK: 'tuktuk',
  PREMIUM: 'premium',
  XL: 'xl', // Extra large (6+ passengers)
};

export const VEHICLE_CONFIG = {
  [VEHICLE_TYPES.CAR]: {
    name: 'Car',
    icon: 'car',
    capacity: 4,
    baseFare: 1000,
    perKm: 500,
    perMinute: 50,
  },
  [VEHICLE_TYPES.BIKE]: {
    name: 'Bike',
    icon: 'motorcycle',
    capacity: 1,
    baseFare: 500,
    perKm: 300,
    perMinute: 30,
  },
  [VEHICLE_TYPES.TUKTUK]: {
    name: 'TukTuk',
    icon: 'rickshaw',
    capacity: 3,
    baseFare: 700,
    perKm: 400,
    perMinute: 40,
  },
  [VEHICLE_TYPES.PREMIUM]: {
    name: 'Premium',
    icon: 'car-suv',
    capacity: 4,
    baseFare: 1500,
    perKm: 800,
    perMinute: 80,
  },
  [VEHICLE_TYPES.XL]: {
    name: 'XL',
    icon: 'van-passenger',
    capacity: 6,
    baseFare: 2000,
    perKm: 1000,
    perMinute: 100,
  },
};

// ====================
// PAYMENT CONSTANTS
// ====================

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MOBILE_MONEY: 'mobile_money',
  WALLET: 'wallet',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const CURRENCY = {
  CODE: 'RWF',
  SYMBOL: 'RF',
  DECIMAL_PLACES: 0,
};

// ====================
// DRIVER CONSTANTS
// ====================

export const DRIVER_STATUS = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  ON_TRIP: 'on_trip',
  BREAK: 'break',
};

export const DRIVER_VERIFICATION_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

export const DOCUMENT_TYPES = {
  LICENSE: 'license',
  ID_CARD: 'id_card',
  VEHICLE_REGISTRATION: 'vehicle_registration',
  INSURANCE: 'insurance',
  PROFILE_PHOTO: 'profile_photo',
  VEHICLE_PHOTO: 'vehicle_photo',
};

// ====================
// MAP & LOCATION CONSTANTS
// ====================

export const MAP_CONFIG = {
  DEFAULT_LATITUDE: -1.939, // Kigali coordinates
  DEFAULT_LONGITUDE: 30.044,
  DEFAULT_LATITUDE_DELTA: 0.0922,
  DEFAULT_LONGITUDE_DELTA: 0.0421,
  ZOOM_LEVELS: {
    CITY: 12,
    NEIGHBORHOOD: 14,
    STREET: 16,
    BUILDING: 18,
  },
  ANIMATION_DURATION: 500,
};

export const LOCATION_TYPES = {
  PICKUP: 'pickup',
  DROPOFF: 'dropoff',
  CURRENT: 'current',
};

// ====================
// NOTIFICATION CONSTANTS
// ====================

export const NOTIFICATION_TYPES = {
  RIDE_REQUEST: 'ride_request',
  RIDE_ACCEPTED: 'ride_accepted',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_CANCELLED: 'ride_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PROMOTION: 'promotion',
  SYSTEM: 'system',
  CHAT: 'chat',
};

export const NOTIFICATION_CHANNELS = {
  RIDE_UPDATES: 'ride_updates',
  PAYMENT_UPDATES: 'payment_updates',
  PROMOTIONS: 'promotions',
  CHAT: 'chat',
  SYSTEM: 'system',
};

// ====================
// USER ROLES
// ====================

export const USER_ROLES = {
  RIDER: 'rider',
  DRIVER: 'driver',
  ADMIN: 'admin',
  DISPATCHER: 'dispatcher',
};

// ====================
// SOCKET EVENTS
// ====================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  
  // Ride Events
  RIDE_REQUEST: 'ride:request',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  RIDE_STATUS_UPDATE: 'ride:status_update',
  DRIVER_LOCATION_UPDATE: 'driver:location_update',
  RIDER_LOCATION_UPDATE: 'rider:location_update',
  
  // Driver Events
  DRIVER_STATUS_UPDATE: 'driver:status_update',
  DRIVER_AVAILABLE: 'driver:available',
  DRIVER_UNAVAILABLE: 'driver:unavailable',
  
  // Chat Events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_READ: 'chat:read',
  
  // Payment Events
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_FAILED: 'payment:failed',
  
  // System Events
  SYSTEM_ALERT: 'system:alert',
  MAINTENANCE_MODE: 'system:maintenance',
};

// ====================
// ERROR MESSAGES
// ====================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  LOCATION_ERROR: 'Unable to get your location. Please enable location services.',
  NO_DRIVERS: 'No drivers available in your area. Please try again later.',
  RIDE_CANCELLED: 'Your ride has been cancelled.',
  PAYMENT_FAILED: 'Payment failed. Please try another payment method.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
};

// ====================
// SUCCESS MESSAGES
// ====================

export const SUCCESS_MESSAGES = {
  RIDE_BOOKED: 'Ride booked successfully!',
  RIDE_CANCELLED: 'Ride cancelled successfully.',
  PAYMENT_SUCCESS: 'Payment successful!',
  PROFILE_UPDATED: 'Profile updated successfully.',
  DOCUMENT_UPLOADED: 'Document uploaded successfully.',
};

// ====================
// STORAGE KEYS
// ====================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  USER_ROLE: 'user_role',
  LOCATION_PERMISSION: 'location_permission',
  NOTIFICATION_PERMISSION: 'notification_permission',
  APP_SETTINGS: 'app_settings',
  RIDE_HISTORY: 'ride_history',
  FAVORITE_LOCATIONS: 'favorite_locations',
};

// ====================
// APP SETTINGS
// ====================

export const APP_SETTINGS = {
  THEME: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
  LANGUAGE: {
    ENGLISH: 'en',
    KINYARWANDA: 'rw',
    FRENCH: 'fr',
  },
  NOTIFICATIONS: {
    ENABLED: true,
    SOUND: true,
    VIBRATION: true,
  },
};

// ====================
// FORM VALIDATION
// ====================

export const VALIDATION = {
  PHONE: {
    PATTERN: /^[0-9]{10}$/,
    MESSAGE: 'Please enter a valid 10-digit phone number',
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: 'Please enter a valid email address',
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MESSAGE: 'Password must be at least 6 characters',
  },
  NAME: {
    MIN_LENGTH: 2,
    MESSAGE: 'Name must be at least 2 characters',
  },
};

// ====================
// APP COLORS (Theme)
// ====================

export const COLORS = {
  // Primary Colors
  PRIMARY: '#FF6B35', // Orange (Bolt-like)
  PRIMARY_DARK: '#E55A2B',
  PRIMARY_LIGHT: '#FF8B5C',
  
  // Secondary Colors
  SECONDARY: '#00B894', // Green
  SECONDARY_DARK: '#00A085',
  SECONDARY_LIGHT: '#26C6A6',
  
  // Status Colors
  SUCCESS: '#00C853',
  WARNING: '#FFB300',
  ERROR: '#FF5252',
  INFO: '#2196F3',
  
  // Background Colors
  BACKGROUND: '#FFFFFF',
  BACKGROUND_DARK: '#F5F5F5',
  BACKGROUND_LIGHT: '#FAFAFA',
  
  // Text Colors
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  TEXT_DISABLED: '#9E9E9E',
  TEXT_LIGHT: '#FFFFFF',
  
  // Border Colors
  BORDER: '#E0E0E0',
  BORDER_LIGHT: '#EEEEEE',
  BORDER_DARK: '#BDBDBD',
  
  // Vehicle Type Colors
  VEHICLE_CAR: '#2196F3',
  VEHICLE_BIKE: '#4CAF50',
  VEHICLE_TUKTUK: '#FF9800',
  VEHICLE_PREMIUM: '#9C27B0',
  VEHICLE_XL: '#F44336',
};

// ====================
// APP DIMENSIONS
// ====================

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const DIMENSIONS = {
  WINDOW_WIDTH: width,
  WINDOW_HEIGHT: height,
  IS_SMALL_SCREEN: width < 375,
  IS_LARGE_SCREEN: width > 414,
  
  // Spacing
  SPACING: {
    XS: 4,
    S: 8,
    M: 16,
    L: 24,
    XL: 32,
    XXL: 48,
  },
  
  // Border Radius
  BORDER_RADIUS: {
    S: 4,
    M: 8,
    L: 12,
    XL: 16,
    ROUND: 999,
  },
  
  // Icon Sizes
  ICON_SIZE: {
    XS: 16,
    S: 20,
    M: 24,
    L: 32,
    XL: 40,
    XXL: 48,
  },
  
  // Button Sizes
  BUTTON_HEIGHT: {
    S: 36,
    M: 48,
    L: 56,
  },
};

// ====================
// APP PATHS & ROUTES
// ====================

export const ROUTES = {
  // Auth Stack
  AUTH: {
    PHONE_LOGIN: 'PhoneLogin',
    OTP_VERIFY: 'OtpVerify',
    ROLE_SELECT: 'RoleSelect',
    PROFILE_COMPLETE: 'ProfileComplete',
  },
  
  // Rider Stack
  RIDER: {
    HOME: 'RiderHome',
    RIDE_SELECT: 'RideSelect',
    RIDE_CONFIRM: 'RideConfirm',
    RIDE_WAITING: 'RideWaiting',
    RIDE_ACTIVE: 'RideActive',
    RIDE_HISTORY: 'RideHistory',
  },
  
  // Driver Stack
  DRIVER: {
    HOME: 'DriverHome',
    RIDE_REQUESTS: 'RideRequests',
    ACTIVE_RIDE: 'ActiveRide',
    EARNINGS: 'Earnings',
    TRIP_HISTORY: 'TripHistory',
    PROFILE: 'DriverProfile',
    VEHICLE: 'Vehicle',
    VERIFICATION: 'Verification',
  },
  
  // Common
  COMMON: {
    PROFILE: 'Profile',
    SETTINGS: 'Settings',
    PAYMENTS: 'Payments',
    HELP: 'Help',
    ABOUT: 'About',
  },
};

// ====================
// EXPORT ALL
// ====================

export default {
  APP_CONFIG,
  RIDE_STATUS,
  VEHICLE_TYPES,
  VEHICLE_CONFIG,
  PAYMENT_METHODS,
  DRIVER_STATUS,
  MAP_CONFIG,
  NOTIFICATION_TYPES,
  USER_ROLES,
  SOCKET_EVENTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  COLORS,
  DIMENSIONS,
  ROUTES,
  VALIDATION,
  CURRENCY,
};