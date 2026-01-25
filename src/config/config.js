/**
 * Application Constants
 /**
 * Static values that don't change between environments
 */

// ====================
// ENVIRONMENT CONFIGURATION
// ====================
export const ENVIRONMENT = {
  IS_DEV: __DEV__,
  IS_PROD: !__DEV__,
  IS_TEST: process.env.NODE_ENV === 'test',
};

// ====================
// APP INFORMATION
// ====================
export const APP_INFO = {
  NAME: 'Kabaza',
  DISPLAY_NAME: 'Kabaza Ride',
  DESCRIPTION: 'Motorcycle taxi hailing service',
  VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  SUPPORT_EMAIL: 'support@kabaza.com',
  SUPPORT_PHONE: '+265888123456',
  WEBSITE: 'https://kabaza.com',
  PRIVACY_POLICY: 'https://kabaza.com/privacy',
  TERMS_OF_SERVICE: 'https://kabaza.com/terms',
};

// ====================
// API & SOCKET CONFIGURATION (REAL-TIME)
// ====================
export const API_CONFIG = {
  // Base URLs (Auto-switch based on environment)
  BASE_URL: 'https://api.kabaza.mw/api',
  SOCKET_URL: 'https://socket.kabaza.mw',
  
  // API Timeouts
  TIMEOUT: 30000,
  SOCKET_TIMEOUT: 20000,
  
  // Socket Configuration
  SOCKET_OPTIONS: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    forceNew: true,
  },
  
  // Real-time intervals
  REAL_TIME_INTERVALS: {
    LOCATION_UPDATE: 5000,          // 5 seconds
    DRIVER_LOCATION_UPDATE: 3000,   // 3 seconds
    RIDE_STATUS_POLL: 10000,        // 10 seconds
    PRESENCE_UPDATE: 30000,         // 30 seconds
    PING_INTERVAL: 25000,           // 25 seconds
    RECONNECT_DELAY: 2000,          // 2 seconds
  },
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/auth/register',
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REQUEST_OTP: '/auth/request-otp',
      VERIFY_OTP: '/auth/verify-otp',
      RESEND_OTP: '/auth/resend-otp',
      PROFILE: '/auth/profile',
      CHANGE_PASSWORD: '/auth/change-password',
      REQUEST_PASSWORD_RESET: '/auth/request-password-reset',
      RESET_PASSWORD: '/auth/reset-password',
      CHECK_SESSION: '/auth/check-session',
      REFRESH_TOKEN: '/auth/refresh',
      REGISTER_DRIVER: '/auth/register-driver',
      COMPLETE_DRIVER_PROFILE: '/auth/complete-driver-profile',
      VERIFY_DOCUMENTS: '/auth/verify-documents',
      VERIFICATION_STATUS: '/auth/verification-status',
    },
    RIDE: {
      REQUEST: '/rides/request',
      ESTIMATE: '/rides/estimate',
      HISTORY: '/rides/history',
      DETAILS: '/rides',
      CANCEL: '/rides/cancel',
      RATE: '/rides/rate',
      ACTIVE: '/rides/active',
    },
    DRIVER: {
      NEARBY: '/drivers/nearby',
      AVAILABILITY: '/drivers/availability',
      EARNINGS: '/drivers/earnings',
      STATS: '/drivers/stats',
      LOCATIONS: '/drivers/locations',
    },
    PAYMENT: {
      METHODS: '/payments/methods',
      PROCESS: '/payments/process',
      HISTORY: '/payments/history',
      WALLET: '/payments/wallet',
    },
    LOCATION: {
      REVERSE_GEOCODE: '/location/reverse-geocode',
      SUGGESTIONS: '/location/suggestions',
      DISTANCE_MATRIX: '/location/distance-matrix',
    },
  },
  
  // Socket Events (Real-time communication)
  SOCKET_EVENTS: {
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
    NEARBY_DRIVERS: 'nearby_drivers',
    
    // Trip Updates
    TRIP_UPDATE: 'trip_update',
    ETA_UPDATE: 'eta_update',
    ROUTE_UPDATE: 'route_update',
    TRAFFIC_UPDATE: 'traffic_update',
    ARRIVAL_UPDATE: 'arrival_update',
    
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
    EMERGENCY: 'emergency',
    
    // System
    PING: 'ping',
    PONG: 'pong',
    ERROR: 'error',
    HEARTBEAT: 'heartbeat',
  },
};

// ====================
// STORAGE KEYS (Enhanced for Real-time)
// ====================
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: '@Kabaza:authToken',
  REFRESH_TOKEN: '@Kabaza:refreshToken',
  USER_ID: '@Kabaza:userId',
  USER_TYPE: '@Kabaza:userType',
  SESSION_EXPIRY: '@Kabaza:sessionExpiry',
  
  // User Data
  USER_PROFILE: '@Kabaza:userProfile',
  USER_SETTINGS: '@Kabaza:userSettings',
  USER_PREFERENCES: '@Kabaza:userPreferences',
  RIDE_HISTORY: '@Kabaza:rideHistory',
  PAYMENT_METHODS: '@Kabaza:paymentMethods',
  
  // Real-time State
  SOCKET_SESSION_ID: '@Kabaza:socketSessionId',
  LAST_LOCATION_UPDATE: '@Kabaza:lastLocationUpdate',
  CONNECTION_STATUS: '@Kabaza:connectionStatus',
  PENDING_MESSAGES: '@Kabaza:pendingMessages',
  OFFLINE_LOCATIONS: '@Kabaza:offlineLocations',
  
  // App State
  ONBOARDING_COMPLETE: '@Kabaza:onboardingComplete',
  LOCATION_PERMISSION: '@Kabaza:locationPermission',
  NOTIFICATION_PERMISSION: '@Kabaza:notificationPermission',
  APP_LAUNCH_COUNT: '@Kabaza:appLaunchCount',
  LAST_APP_VERSION: '@Kabaza:lastAppVersion',
  
  // Cache
  CACHE_TIMESTAMP: '@Kabaza:cacheTimestamp',
  LAST_LOCATION: '@Kabaza:lastLocation',
  NEARBY_DRIVERS_CACHE: '@Kabaza:nearbyDriversCache',
  FARE_ESTIMATE_CACHE: '@Kabaza:fareEstimateCache',
  
  // Driver Specific
  DRIVER_STATUS: '@Kabaza:driverStatus',
  VEHICLE_INFO: '@Kabaza:vehicleInfo',
  DRIVER_STATS: '@Kabaza:driverStats',
  CURRENT_RIDE: '@Kabaza:currentRide',
  
  // Settings
  NOTIFICATION_SETTINGS: '@Kabaza:notificationSettings',
  PRIVACY_SETTINGS: '@Kabaza:privacySettings',
  MAP_SETTINGS: '@Kabaza:mapSettings',
};

// ====================
// MAP & LOCATION (Enhanced for Real-time Tracking)
// ====================
export const MAP_CONSTANTS = {
  // Default coordinates (Malawi - Lilongwe)
  DEFAULT_LOCATION: {
    latitude: -13.9626,
    longitude: 33.7741,
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
    PICKUP: 15,
    NAVIGATION: 17,
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
  
  // Real-time tracking settings
  TRACKING: {
    UPDATE_INTERVAL: 5000,          // 5 seconds
    BACKGROUND_INTERVAL: 10000,     // 10 seconds in background
    DISTANCE_FILTER: 10,            // 10 meters
    BACKGROUND_DISTANCE_FILTER: 50, // 50 meters in background
    MAX_ACCURACY: 100,              // Max accuracy in meters
    MIN_UPDATE_INTERVAL: 2000,      // Minimum 2 seconds
  },
  
  // Geofencing
  GEOFENCE: {
    PICKUP_RADIUS: 50,              // 50 meters
    DESTINATION_RADIUS: 50,         // 50 meters
    ARRIVAL_THRESHOLD: 100,         // 100 meters
  },
  
  // Map styling
  STYLE: {
    ROUTE_COLOR: '#4A90E2',
    ROUTE_WIDTH: 4,
    PICKUP_MARKER_COLOR: '#34C759',
    DESTINATION_MARKER_COLOR: '#FF3B30',
    DRIVER_MARKER_COLOR: '#007AFF',
    CURRENT_LOCATION_COLOR: '#5856D6',
  },
};

// ====================
// RIDE CONSTANTS (Enhanced for Real-time)
// ====================
export const RIDE_CONSTANTS = {
  STATUS: {
    SEARCHING: 'searching',
    MATCHED: 'matched',
    ACCEPTED: 'accepted',
    PICKUP: 'pickup',
    ARRIVED: 'arrived',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_DRIVERS: 'no_drivers',
    EXPIRED: 'expired',
  },
  
  VEHICLE_TYPES: {
    MOTORCYCLE: 'motorcycle',
    BODA_BODA: 'boda_boda',
    STANDARD: 'standard',
    PREMIUM: 'premium',
    GROUP: 'group',
  },
  
  // Real-time ride timeouts
  TIMEOUTS: {
    SEARCH_TIMEOUT: 120000,         // 2 minutes
    ACCEPTANCE_TIMEOUT: 30000,      // 30 seconds
    PICKUP_TIMEOUT: 600000,         // 10 minutes
    RIDE_TIMEOUT: 10800000,         // 3 hours
    CANCELLATION_WINDOW: 30000,     // 30 seconds free cancellation
  },
  
  // Pricing (Malawi Kwacha - MWK)
  PRICING: {
    BASE_FARE: 500,                 // MWK
    PER_KM: 300,                    // MWK per kilometer
    PER_MINUTE: 20,                 // MWK per minute
    MINIMUM_FARE: 800,              // MWK
    CANCELLATION_FEE: 200,          // MWK
    WAITING_FEE_PER_MIN: 50,        // MWK per minute after 3 min
    SURGE_MULTIPLIERS: [1, 1.2, 1.5, 2, 2.5],
    
    // Vehicle type multipliers
    VEHICLE_MULTIPLIERS: {
      motorcycle: 1.0,
      boda_boda: 1.0,
      standard: 1.2,
      premium: 1.5,
      group: 2.0,
    },
  },
  
  // Ride matching
  MATCHING: {
    MAX_DISTANCE: 5000,             // 5km max distance
    PREFERRED_DISTANCE: 2000,       // 2km preferred
    MAX_DRIVERS_NOTIFIED: 10,       // Notify max 10 drivers
    MATCH_TIMEOUT: 30000,           // 30 seconds per match attempt
  },
  
  // Driver ratings
  RATINGS: {
    MIN_RATING: 4.0,                // Minimum driver rating
    DEFAULT_RATING: 5.0,
    RATING_DECAY: 0.1,              // Rating decay per month
  },
};

// ====================
// REAL-TIME CONSTANTS
// ====================
export const REAL_TIME_CONSTANTS = {
  // Connection
  CONNECTION: {
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 2000,
    HEARTBEAT_INTERVAL: 25000,
    HEARTBEAT_TIMEOUT: 10000,
    CONNECTION_TIMEOUT: 30000,
  },
  
  // Location Updates
  LOCATION: {
    UPDATE_INTERVAL: 5000,          // 5 seconds foreground
    BACKGROUND_INTERVAL: 15000,     // 15 seconds background
    BATCH_SIZE: 10,                 // Batch size for offline sync
    MAX_QUEUE_SIZE: 50,             // Max queued locations
    MIN_ACCURACY: 100,              // Minimum accuracy in meters
    SMOOTHING_FACTOR: 0.3,          // Location smoothing
  },
  
  // Ride Updates
  RIDE: {
    STATUS_UPDATE_INTERVAL: 3000,   // 3 seconds
    ETA_UPDATE_INTERVAL: 10000,     // 10 seconds
    DRIVER_UPDATE_INTERVAL: 2000,   // 2 seconds
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000,
  },
  
  // Chat
  CHAT: {
    TYPING_TIMEOUT: 3000,           // 3 seconds typing indicator
    MESSAGE_RETRY_ATTEMPTS: 2,
    MAX_MESSAGE_LENGTH: 500,
    READ_RECEIPT_DELAY: 1000,
  },
  
  // Notifications
  NOTIFICATIONS: {
    MIN_INTERVAL: 30000,            // 30 seconds between same type
    PERSISTENCE_DURATION: 10000,    // 10 seconds on screen
    MAX_STORED: 100,                // Max stored notifications
  },
  
  // Offline Support
  OFFLINE: {
    MAX_OFFLINE_TIME: 300000,       // 5 minutes max offline
    SYNC_INTERVAL: 30000,           // 30 seconds sync attempt
    MAX_PENDING_ACTIONS: 20,
  },
};

// ====================
// UI CONSTANTS (Enhanced for Real-time)
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
      REAL_TIME: 200,      // Real-time updates
    },
    EASING: {
      LINEAR: 'linear',
      EASE: 'ease',
      EASE_IN: 'ease-in',
      EASE_OUT: 'ease-out',
      EASE_IN_OUT: 'ease-in-out',
      BOUNCE: 'bounce',
      SPRING: 'spring',
    },
    SPRING_CONFIG: {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
    },
  },
  
  // Real-time UI
  REAL_TIME_UI: {
    PULSE_ANIMATION_DURATION: 2000,
    MARKER_UPDATE_DURATION: 500,
    PROGRESS_UPDATE_INTERVAL: 100,
    STATUS_UPDATE_DURATION: 300,
  },
};

// ====================
// TIME CONSTANTS (Enhanced for Real-time)
// ====================
export const TIME_CONSTANTS = {
  // In milliseconds
  ONE_SECOND: 1000,
  ONE_MINUTE: 60000,
  ONE_HOUR: 3600000,
  ONE_DAY: 86400000,
  
  // Real-time intervals
  REAL_TIME_INTERVALS: {
    LOCATION_UPDATE: 5000,          // 5 seconds
    SOCKET_PING: 25000,             // 25 seconds
    PRESENCE_UPDATE: 30000,         // 30 seconds
    CONNECTION_CHECK: 10000,        // 10 seconds
    BACKGROUND_SYNC: 30000,         // 30 seconds
  },
  
  // Cache durations
  CACHE_DURATION: {
    REAL_TIME: 5000,               // 5 seconds (real-time data)
    SHORT: 5 * 60000,              // 5 minutes
    MEDIUM: 30 * 60000,            // 30 minutes
    LONG: 24 * 3600000,            // 24 hours
    PERMANENT: 7 * 24 * 3600000,   // 7 days
  },
  
  // Refresh intervals
  REFRESH_INTERVAL: {
    LIVE_LOCATION: 5000,           // 5 seconds
    RIDE_STATUS: 3000,             // 3 seconds
    DRIVER_LOCATION: 2000,         // 2 seconds
    ETA: 10000,                    // 10 seconds
    MESSAGES: 5000,                // 5 seconds
    NOTIFICATIONS: 15000,          // 15 seconds
  },
  
  // Time formats for display
  FORMATS: {
    TIME: 'HH:mm',
    DATE: 'DD/MM/YYYY',
    DATETIME: 'DD/MM/YYYY HH:mm',
    RELATIVE: 'relative',
    DURATION: 'duration',
  },
};

// ====================
// ERROR MESSAGES (Enhanced for Real-time)
// ====================
export const ERROR_MESSAGES = {
  NETWORK: {
    NO_INTERNET: 'No internet connection. Please check your network.',
    TIMEOUT: 'Request timeout. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    SOCKET_DISCONNECTED: 'Connection lost. Reconnecting...',
    OFFLINE_MODE: 'You are offline. Some features may be limited.',
  },
  
  LOCATION: {
    PERMISSION_DENIED: 'Location permission is required to find rides near you.',
    UNAVAILABLE: 'Location services are not available.',
    TIMEOUT: 'Unable to get your location. Please try again.',
    BACKGROUND_PERMISSION: 'Background location is needed for ride tracking.',
  },
  
  REAL_TIME: {
    CONNECTION_LOST: 'Real-time connection lost. Reconnecting...',
    RECONNECTING: 'Reconnecting to server...',
    SESSION_EXPIRED: 'Real-time session expired. Reconnecting...',
    MAX_RECONNECT: 'Unable to connect. Please check your internet.',
  },
  
  RIDE: {
    NO_DRIVERS: 'No drivers available in your area. Please try again.',
    CANCELLATION_FEE: 'Cancellation fee applied.',
    PAYMENT_FAILED: 'Payment failed. Please try another method.',
    RIDE_EXPIRED: 'Ride request expired. Please try again.',
    DRIVER_CANCELLED: 'Driver cancelled the ride. Finding another driver...',
  },
  
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid phone number or PIN.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
    ACCOUNT_LOCKED: 'Account is locked. Contact support.',
  },
};

// ====================
// NOTIFICATION TYPES (Real-time)
// ====================
export const NOTIFICATION_TYPES = {
  RIDE: {
    REQUESTED: 'ride_requested',
    ACCEPTED: 'ride_accepted',
    ARRIVING: 'driver_arriving',
    ARRIVED: 'driver_arrived',
    STARTED: 'ride_started',
    COMPLETED: 'ride_completed',
    CANCELLED: 'ride_cancelled',
  },
  
  CHAT: {
    NEW_MESSAGE: 'new_message',
    TYPING: 'typing_indicator',
  },
  
  PAYMENT: {
    RECEIVED: 'payment_received',
    FAILED: 'payment_failed',
    CONFIRMED: 'payment_confirmed',
  },
  
  SYSTEM: {
    SOS_ALERT: 'sos_alert',
    PROMOTION: 'promotion',
    UPDATE: 'app_update',
    MAINTENANCE: 'maintenance',
  },
};

// ====================
// DEFAULT VALUES (Enhanced)
// ====================
export const DEFAULTS = {
  // User defaults
  USER: {
    LANGUAGE: 'en',
    CURRENCY: 'MWK',
    DISTANCE_UNIT: 'km',
    THEME: 'light',
    NOTIFICATIONS_ENABLED: true,
    LOCATION_SHARING: true,
    AUTO_CONNECT_SOCKET: true,
  },
  
  // App defaults
  APP: {
    MAX_RETRY_ATTEMPTS: 3,
    REQUEST_TIMEOUT: 30000,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 1000,
    SOCKET_RECONNECT_DELAY: 2000,
    MAX_OFFLINE_STORAGE: 100,
  },
  
  // Real-time defaults
  REAL_TIME: {
    LOCATION_UPDATE_FREQUENCY: 5000,
    DRIVER_UPDATE_FREQUENCY: 3000,
    RIDE_UPDATE_FREQUENCY: 3000,
    CHAT_UPDATE_FREQUENCY: 1000,
    MAX_PENDING_UPDATES: 20,
  },
  
  // Ride defaults
  RIDE: {
    DEFAULT_VEHICLE_TYPE: 'motorcycle',
    DEFAULT_PAYMENT_METHOD: 'cash',
    DEFAULT_TIP_PERCENTAGE: 0,
    MAX_WAIT_TIME: 10, // minutes
  },
};

// ====================
// COLORS (For consistent theming)
// ====================
export const COLORS = {
  // Brand Colors
  PRIMARY: '#4A90E2',
  PRIMARY_DARK: '#357AE8',
  PRIMARY_LIGHT: '#7BB0F0',
  SECONDARY: '#34C759',
  ACCENT: '#FF9500',
  
  // Status Colors
  SUCCESS: '#34C759',
  WARNING: '#FF9500',
  ERROR: '#FF3B30',
  INFO: '#007AFF',
  
  // UI Colors
  BACKGROUND: '#F2F2F7',
  SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#8E8E93',
  TEXT_DISABLED: '#C7C7CC',
  BORDER: '#C7C7CC',
  DIVIDER: '#E5E5EA',
  
  // Real-time Indicators
  ONLINE: '#34C759',
  OFFLINE: '#FF3B30',
  CONNECTING: '#FF9500',
  IDLE: '#8E8E93',
  
  // Map Colors
  ROUTE: '#4A90E2',
  PICKUP: '#34C759',
  DESTINATION: '#FF3B30',
  DRIVER: '#007AFF',
  CURRENT_LOCATION: '#5856D6',
};

// ====================
// EXPORT ALL CONSTANTS
// ====================
export default {
  ENVIRONMENT,
  APP_INFO,
  API_CONFIG,
  STORAGE_KEYS,
  MAP_CONSTANTS,
  RIDE_CONSTANTS,
  REAL_TIME_CONSTANTS,
  UI_CONSTANTS,
  TIME_CONSTANTS,
  ERROR_MESSAGES,
  NOTIFICATION_TYPES,
  DEFAULTS,
  COLORS,
};