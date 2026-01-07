/**
 * Application Configuration Module
 * Centralized configuration management for Kabaza app
 * Uses react-native-config for environment variables
 * Enhanced for real-time Bolt-like functionality
 */

import Config from 'react-native-config';
import { Platform } from 'react-native';
import config from './config';

/**
 * Main application configuration
 * All environment-specific values should come from .env files
 */
const AppConfig = {
  // ====================
  // ENVIRONMENT
  // ====================
  ENV: {
    NAME: Config.ENVIRONMENT || 'development',
    DEBUG: Config.DEBUG === 'true',
    LOG_LEVEL: Config.LOG_LEVEL || 'debug',
    IS_DEV: Config.ENVIRONMENT === 'development',
    IS_STAGING: Config.ENVIRONMENT === 'staging',
    IS_PROD: Config.ENVIRONMENT === 'production',
  },

  // ====================
  // GOOGLE MAPS
  // ====================
  MAPS: {
    API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
    ANDROID_API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
    IOS_API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
    
    // Real-time map configuration
    REAL_TIME: {
      UPDATE_INTERVAL: 5000,                    // 5 seconds for live updates
      DRIVER_UPDATE_INTERVAL: 3000,             // 3 seconds for driver position
      MIN_ZOOM_LEVEL: 14,
      MAX_ZOOM_LEVEL: 18,
      DEFAULT_ZOOM: 15,
      ANIMATION_DURATION: 500,                  // Animation duration in ms
    },
    
    // Map styling for real-time tracking
    STYLE: {
      ROUTE_COLOR: '#4A90E2',
      ROUTE_WIDTH: 4,
      LIVE_ROUTE_COLOR: '#34C759',
      PICKUP_MARKER_COLOR: '#34C759',
      DESTINATION_MARKER_COLOR: '#FF3B30',
      DRIVER_MARKER_COLOR: '#007AFF',
      CURRENT_LOCATION_COLOR: '#5856D6',
      ETA_LINE_COLOR: '#8E8E93',
    },
    
    // Default coordinates (Lilongwe, Malawi)
    DEFAULT_REGION: {
      latitude: -13.9626,
      longitude: 33.7741,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
    
    // Geofencing for real-time tracking
    GEOFENCE: {
      PICKUP_RADIUS: 50,                        // 50 meters
      DESTINATION_RADIUS: 50,                   // 50 meters
      ARRIVAL_THRESHOLD: 100,                   // 100 meters
    },
  },

  // ====================
  // API & SOCKET CONFIGURATION (REAL-TIME)
  // ====================
  API: {
    // Base URLs with environment switching
    BASE_URL: Config.API_BASE_URL || 
      (__DEV__ ? 'http://localhost:3000/api' : 'https://api.kabaza.mw/api'),
    
    // Real-time Socket URL
    SOCKET_URL: Config.SOCKET_URL || 
      (__DEV__ ? 'http://localhost:3001' : 'https://socket.kabaza.mw'),
    
    // Timeouts
    TIMEOUT: parseInt(Config.API_TIMEOUT || '30000', 10),
    SOCKET_TIMEOUT: parseInt(Config.SOCKET_TIMEOUT || '20000', 10),

    SOCKET_OPTIONS: {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true,
      path: config.API_SOCKET_PATH || '/socket.io',
    },
    
    // Headers
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Version': Config.APP_VERSION || '1.0.0',
      'X-Platform': Platform.OS,
      'X-Platform-Version': Platform.Version,
    },
    
    // Real-time socket options
    SOCKET_OPTIONS: {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true,
      query: {
        platform: Platform.OS,
        version: Config.APP_VERSION || '1.0.0',
      },
    },
    
    // Real-time intervals
    REAL_TIME_INTERVALS: {
      LOCATION_UPDATE: 5000,                    // 5 seconds
      DRIVER_LOCATION_UPDATE: 3000,             // 3 seconds
      RIDE_STATUS_POLL: 10000,                  // 10 seconds
      PRESENCE_UPDATE: 30000,                   // 30 seconds
      PING_INTERVAL: 25000,                     // 25 seconds
      RECONNECT_DELAY: 2000,                    // 2 seconds
      OFFLINE_SYNC_INTERVAL: 30000,             // 30 seconds
    },
    
    // Endpoints with real-time support
    ENDPOINTS: {
      AUTH: {
        BASE: '/auth',
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REQUEST_OTP: '/auth/request-otp',
        VERIFY_OTP: '/auth/verify-otp',
        REFRESH_TOKEN: '/auth/refresh',
        PROFILE: '/auth/profile',
        REGISTER_DRIVER: '/auth/register-driver',
        VERIFY_DOCUMENTS: '/auth/verify-documents',
      },
      RIDES: {
        BASE: '/rides',
        REQUEST: '/rides/request',
        ESTIMATE: '/rides/estimate',
        ACTIVE: '/rides/active',
        HISTORY: '/rides/history',
        CANCEL: '/rides/cancel',
        RATE: '/rides/rate',
        LOCATION_UPDATE: '/rides/location-update',
      },
      DRIVERS: {
        BASE: '/drivers',
        NEARBY: '/drivers/nearby',
        AVAILABILITY: '/drivers/availability',
        EARNINGS: '/drivers/earnings',
        LOCATIONS: '/drivers/locations',
        STATS: '/drivers/stats',
      },
      PAYMENTS: {
        BASE: '/payments',
        METHODS: '/payments/methods',
        PROCESS: '/payments/process',
        WALLET: '/payments/wallet',
        HISTORY: '/payments/history',
      },
      LOCATION: {
        BASE: '/location',
        REVERSE_GEOCODE: '/location/reverse-geocode',
        SUGGESTIONS: '/location/suggestions',
        DISTANCE_MATRIX: '/location/distance-matrix',
      },
    },
  },

  // ====================
  // SOCKET EVENTS (REAL-TIME COMMUNICATION)
  // ====================
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

  // ====================
  // REAL-TIME CONSTANTS
  // ====================
  REAL_TIME: {
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
      UPDATE_INTERVAL: 5000,                    // 5 seconds foreground
      BACKGROUND_INTERVAL: 15000,               // 15 seconds background
      BATCH_SIZE: 10,                           // Batch size for offline sync
      MAX_QUEUE_SIZE: 50,                       // Max queued locations
      MIN_ACCURACY: 100,                        // Minimum accuracy in meters
      SMOOTHING_FACTOR: 0.3,                    // Location smoothing
      BACKGROUND_DISTANCE_FILTER: 50,           // 50 meters in background
      FOREGROUND_DISTANCE_FILTER: 10,           // 10 meters in foreground
    },
    
    // Ride Updates
    RIDE: {
      STATUS_UPDATE_INTERVAL: 3000,             // 3 seconds
      ETA_UPDATE_INTERVAL: 10000,               // 10 seconds
      DRIVER_UPDATE_INTERVAL: 2000,             // 2 seconds
      MAX_RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 2000,
      SEARCH_TIMEOUT: 120000,                   // 2 minutes
      ACCEPTANCE_TIMEOUT: 30000,                // 30 seconds
    },
    
    // Chat
    CHAT: {
      TYPING_TIMEOUT: 3000,                     // 3 seconds typing indicator
      MESSAGE_RETRY_ATTEMPTS: 2,
      MAX_MESSAGE_LENGTH: 500,
      READ_RECEIPT_DELAY: 1000,
      MAX_UNREAD_COUNT: 99,
    },
    
    // Offline Support
    OFFLINE: {
      MAX_OFFLINE_TIME: 300000,                 // 5 minutes max offline
      SYNC_INTERVAL: 30000,                     // 30 seconds sync attempt
      MAX_PENDING_ACTIONS: 20,
      LOCATION_CACHE_SIZE: 100,
    },
  },

  // ====================
  // RIDE CONFIGURATION
  // ====================
  RIDES: {
    STATUS: {
      SEARCHING: 'searching',
      MATCHED: 'matched',
      ACCEPTED: 'accepted',
      PICKUP: 'pickup',
      ARRIVED: 'arrived',
      ONGOING: 'ongoing',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    },
    
    VEHICLE_TYPES: {
      MOTORCYCLE: 'motorcycle',
      BODA_BODA: 'boda_boda',
      STANDARD: 'standard',
      PREMIUM: 'premium',
    },
    
    // Pricing (Malawi Kwacha - MWK)
    PRICING: {
      BASE_FARE: 500,                           // MWK
      PER_KM: 300,                              // MWK per kilometer
      PER_MINUTE: 20,                           // MWK per minute
      MINIMUM_FARE: 800,                        // MWK
      CANCELLATION_FEE: 200,                    // MWK
      WAITING_FEE_PER_MIN: 50,                  // MWK per minute after 3 min
      
      // Vehicle type multipliers
      VEHICLE_MULTIPLIERS: {
        motorcycle: 1.0,
        boda_boda: 1.0,
        standard: 1.2,
        premium: 1.5,
      },
    },
    
    // Real-time matching
    MATCHING: {
      MAX_DISTANCE: 5000,                       // 5km max distance
      PREFERRED_DISTANCE: 2000,                 // 2km preferred
      MAX_DRIVERS_NOTIFIED: 10,                 // Notify max 10 drivers
      MATCH_TIMEOUT: 30000,                     // 30 seconds per match attempt
      DRIVER_RATING_THRESHOLD: 4.0,             // Minimum driver rating
    },
  },

  // ====================
  // FEATURE FLAGS (Real-time)
  // ====================
  FEATURES: {
    // Core Features
    REAL_TIME_TRACKING: Config.ENABLE_REAL_TIME_TRACKING !== 'false',
    SOCKET_CONNECTION: Config.ENABLE_SOCKET !== 'false',
    OFFLINE_MODE: true,
    BACKGROUND_LOCATION: Config.ENABLE_BACKGROUND_LOCATION === 'true',
    
    // User Features
    PUSH_NOTIFICATIONS: Config.ENABLE_PUSH_NOTIFICATIONS === 'true',
    IN_APP_CHAT: Config.ENABLE_IN_APP_CHAT !== 'false',
    SOS_EMERGENCY: Config.ENABLE_SOS === 'true',
    MULTIPLE_PAYMENT_METHODS: Config.ENABLE_MULTIPLE_PAYMENTS === 'true',
    
    // Driver Features
    DRIVER_AVAILABILITY_TOGGLE: true,
    EARNINGS_DASHBOARD: true,
    RIDE_HISTORY: true,
    
    // System Features
    ANALYTICS: Config.ENABLE_ANALYTICS === 'true',
    CRASH_REPORTING: Config.ENABLE_CRASH_REPORTING === 'true',
    PERFORMANCE_MONITORING: Config.ENABLE_PERFORMANCE_MONITORING !== 'false',
    DEBUG_MODE: Config.ENABLE_DEBUG_MODE === 'true',
  },

  // ====================
  // APP INFO
  // ====================
  APP: {
    NAME: Config.APP_NAME || 'Kabaza',
    DISPLAY_NAME: Config.APP_DISPLAY_NAME || 'Kabaza Ride',
    VERSION: Config.APP_VERSION || '1.0.0',
    BUILD_NUMBER: Config.BUILD_NUMBER || '1',
    PACKAGE_NAME: Config.APP_PACKAGE_NAME || 'com.kabaza.app',
    BUNDLE_ID: Config.APP_BUNDLE_ID || 'com.kabaza.app',
    SCHEME: Config.APP_SCHEME || 'kabaza',
    STORE_URLS: {
      IOS: Config.APP_STORE_URL || 'https://apps.apple.com/app/kabaza',
      ANDROID: Config.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.kabaza.app',
    },
  },

  // ====================
  // PLATFORM SPECIFIC
  // ====================
  PLATFORM: {
    IS_IOS: Platform.OS === 'ios',
    IS_ANDROID: Platform.OS === 'android',
    OS: Platform.OS,
    VERSION: Platform.Version,
    IS_EMULATOR: Platform.isTesting || __DEV__,
  },

  // ====================
  // NOTIFICATION CONFIG
  // ====================
  NOTIFICATIONS: {
    CHANNELS: {
      RIDE_UPDATES: 'ride_updates',
      CHAT_MESSAGES: 'chat_messages',
      PAYMENTS: 'payments',
      SYSTEM: 'system',
      EMERGENCY: 'emergency',
    },
    
    SOUNDS: {
      RIDE_REQUEST: 'ride_request.mp3',
      NEW_MESSAGE: 'new_message.mp3',
      PAYMENT_RECEIVED: 'payment_received.mp3',
      SOS_ALERT: 'sos_alert.mp3',
    },
    
    // Real-time notification intervals
    INTERVALS: {
      MIN_INTERVAL: 30000,                      // 30 seconds between same type
      PERSISTENCE_DURATION: 10000,              // 10 seconds on screen
      MAX_STORED: 100,                          // Max stored notifications
    },
  },

  // ====================
  // STORAGE CONFIG
  // ====================
  STORAGE: {
    PREFIX: '@Kabaza:',
    ENCRYPTION_KEY: Config.STORAGE_ENCRYPTION_KEY || 'kabaza-secure-storage-key',
    
    // TTL for cached data (in milliseconds)
    TTL: {
      REAL_TIME: 5000,                          // 5 seconds
      SHORT: 5 * 60000,                         // 5 minutes
      MEDIUM: 30 * 60000,                       // 30 minutes
      LONG: 24 * 3600000,                       // 24 hours
    },
  },

  // ====================
  // VALIDATION METHODS
  // ====================
  validate() {
    const errors = [];
    const warnings = [];

    // Critical validations
    if (!this.MAPS.API_KEY) {
      errors.push('GOOGLE_MAPS_API_KEY is missing');
    } else if (this.MAPS.API_KEY.includes('Placeholder') || 
               this.MAPS.API_KEY.includes('YOUR_API_KEY')) {
      warnings.push('Google Maps API key is using placeholder value');
    }

    if (!this.API.BASE_URL) {
      warnings.push('API_BASE_URL is not set, using default');
    }

    if (!this.API.SOCKET_URL && this.FEATURES.SOCKET_CONNECTION) {
      warnings.push('SOCKET_URL is not set, real-time features may not work');
    }

    // Real-time feature warnings
    if (this.FEATURES.REAL_TIME_TRACKING && !this.FEATURES.SOCKET_CONNECTION) {
      warnings.push('Real-time tracking enabled but socket connection is disabled');
    }

    if (this.FEATURES.BACKGROUND_LOCATION && Platform.OS === 'ios') {
      warnings.push('Background location requires additional iOS entitlements');
    }

    // Log warnings and errors
    if (warnings.length > 0) {
      console.warn('🔸 Configuration Warnings:', warnings);
    }

    if (errors.length > 0) {
      console.error('❌ Configuration Errors:', errors);
      if (this.ENV.DEBUG) {
        // In development, throw error to catch issues early
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  // ====================
  // HELPER METHODS
  // ====================
  isDevelopment() {
    return this.ENV.NAME === 'development';
  },

  isProduction() {
    return this.ENV.NAME === 'production';
  },

  isStaging() {
    return this.ENV.NAME === 'staging';
  },

  getApiUrl(endpoint = '') {
    const base = this.API.BASE_URL.replace(/\/$/, '');
    const path = endpoint.replace(/^\//, '');
    return `${base}/${path}`;
  },

  getSocketUrl() {
    return this.API.SOCKET_URL;
  },

  getFullEndpoint(service, endpoint) {
    const serviceEndpoints = this.API.ENDPOINTS[service];
    if (!serviceEndpoints) {
      throw new Error(`Service ${service} not found in endpoints`);
    }
    
    const endpointPath = serviceEndpoints[endpoint] || serviceEndpoints.BASE;
    return this.getApiUrl(endpointPath);
  },

  getRideStatusColor(status) {
    const statusColors = {
      searching: '#FF9500',    // Orange
      matched: '#007AFF',      // Blue
      accepted: '#34C759',     // Green
      pickup: '#5856D6',       // Purple
      arrived: '#AF52DE',      // Pink
      ongoing: '#4A90E2',      // Light Blue
      completed: '#8E8E93',    // Gray
      cancelled: '#FF3B30',    // Red
    };
    return statusColors[status] || '#8E8E93';
  },

  shouldUseRealTime() {
    return this.FEATURES.REAL_TIME_TRACKING && this.FEATURES.SOCKET_CONNECTION;
  },

  getLocationUpdateInterval(isBackground = false) {
    return isBackground 
      ? this.REAL_TIME.LOCATION.BACKGROUND_INTERVAL
      : this.REAL_TIME.LOCATION.UPDATE_INTERVAL;
  },

  getDistanceFilter(isBackground = false) {
    return isBackground
      ? this.REAL_TIME.LOCATION.BACKGROUND_DISTANCE_FILTER
      : this.REAL_TIME.LOCATION.FOREGROUND_DISTANCE_FILTER;
  },

  logConfig() {
    if (this.ENV.DEBUG) {
      console.log('⚙️  App Configuration Loaded:', {
        environment: this.ENV.NAME,
        apiBase: this.API.BASE_URL,
        socketUrl: this.API.SOCKET_URL,
        mapsKeyConfigured: !!this.MAPS.API_KEY && !this.MAPS.API_KEY.includes('Placeholder'),
        platform: this.PLATFORM.OS,
        realTimeEnabled: this.shouldUseRealTime(),
        features: Object.keys(this.FEATURES).filter(key => this.FEATURES[key]),
        rideStatuses: Object.keys(this.RIDES.STATUS),
      });
    }
  },

  // ====================
  // ENVIRONMENT CHECKS
  // ====================
  getEnvironmentConfig() {
    const env = this.ENV.NAME.toLowerCase();
    
    const configs = {
      development: {
        logLevel: 'debug',
        enableAnalytics: false,
        enableCrashReporting: false,
        apiTimeout: 30000,
      },
      staging: {
        logLevel: 'info',
        enableAnalytics: true,
        enableCrashReporting: true,
        apiTimeout: 20000,
      },
      production: {
        logLevel: 'warn',
        enableAnalytics: true,
        enableCrashReporting: true,
        apiTimeout: 15000,
      },
    };
    
    return configs[env] || configs.development;
  },
};

// Auto-validate on import
//const validationResult = AppConfig.validate();

// Log configuration on app start
//if (AppConfig.ENV.DEBUG) {
  //AppConfig.logConfig();
//}

// Export configuration helpers
// Export dummy validationResult (real validation happens in App.js)
export const validationResult = {
  isValid: true,
  errors: [],
  warnings: []
};

export const ConfigHelpers = {
  getSocketOptions: (additionalOptions = {}) => ({
    ...AppConfig.API.SOCKET_OPTIONS,
    ...additionalOptions,
  }),
  
  getLocationConfig: (isBackground = false) => ({
    updateInterval: AppConfig.getLocationUpdateInterval(isBackground),
    distanceFilter: AppConfig.getDistanceFilter(isBackground),
    enableHighAccuracy: !isBackground,
    timeout: isBackground ? 10000 : 5000,
    maximumAge: isBackground ? 30000 : 10000,
  }),
  
  getRideTimeout: (status) => {
    const timeouts = {
      searching: AppConfig.RIDES.MATCHING.MATCH_TIMEOUT,
      accepted: AppConfig.REAL_TIME.RIDE.ACCEPTANCE_TIMEOUT,
      pickup: 600000,
    };
    return timeouts[status] || 30000;
  },
  
  formatPrice: (amount, currency = 'MWK') => {
    return `${currency} ${amount.toLocaleString('en-MW')}`;
  },
};

export default AppConfig;