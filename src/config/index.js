/**
 * Application Configuration Module
 * Centralized configuration management for Kabaza app
 * Uses react-native-config for environment variables
 */

import Config from 'react-native-config';
import { Platform } from 'react-native';

/**
 * Main application configuration
 * All environment-specific values should come from .env files
 */
const AppConfig = {
  // ====================
  // GOOGLE MAPS
  // ====================
  MAPS: {
    API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
    ANDROID_API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
    IOS_API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
    DEFAULT_REGION: {
      latitude: -1.9706,    // Nairobi, Kenya
      longitude: 30.1044,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    },
  },

  // ====================
  // API CONFIGURATION
  // ====================
  API: {
    BASE_URL: Config.API_BASE_URL || 'http://localhost:3000',
    TIMEOUT: parseInt(Config.API_TIMEOUT || '30000', 10),
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ENDPOINTS: {
      AUTH: '/auth',
      USERS: '/users',
      RIDES: '/rides',
      DRIVERS: '/drivers',
      PAYMENTS: '/payments',
    },
  },

  // ====================
  // ENVIRONMENT
  // ====================
  ENV: {
    NAME: Config.ENVIRONMENT || 'development',
    DEBUG: Config.DEBUG === 'true',
    LOG_LEVEL: Config.LOG_LEVEL || 'debug',
  },

  // ====================
  // FEATURE FLAGS
  // ====================
  FEATURES: {
    ANALYTICS: Config.ENABLE_ANALYTICS === 'true',
    CRASH_REPORTING: Config.ENABLE_CRASH_REPORTING === 'true',
    PERFORMANCE_MONITORING: Config.ENABLE_PERFORMANCE_MONITORING !== 'false',
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: false, // Enable when service configured
  },

  // ====================
  // APP INFO
  // ====================
  APP: {
    NAME: Config.APP_NAME || 'Kabaza',
    VERSION: Config.APP_VERSION || '1.0.0',
    BUILD_NUMBER: Config.BUILD_NUMBER || '1',
    PACKAGE_NAME: 'com.kabaza.app',
  },

  // ====================
  // PLATFORM SPECIFIC
  // ====================
  PLATFORM: {
    IS_IOS: Platform.OS === 'ios',
    IS_ANDROID: Platform.OS === 'android',
    OS: Platform.OS,
    VERSION: Platform.Version,
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
    } else if (this.MAPS.API_KEY.includes('Placeholder')) {
      warnings.push('Google Maps API key is using placeholder value');
    }

    if (!this.API.BASE_URL) {
      warnings.push('API_BASE_URL is not set, using default');
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

  logConfig() {
    if (this.ENV.DEBUG) {
      console.log('⚙️  App Configuration Loaded:', {
        environment: this.ENV.NAME,
        apiBase: this.API.BASE_URL,
        mapsKeyConfigured: !!this.MAPS.API_KEY && !this.MAPS.API_KEY.includes('Placeholder'),
        platform: this.PLATFORM.OS,
        features: Object.keys(this.FEATURES).filter(key => this.FEATURES[key]),
      });
    }
  },
};

// Auto-validate on import
const validationResult = AppConfig.validate();

// Log configuration on app start
if (AppConfig.ENV.DEBUG) {
  AppConfig.logConfig();
}

export default AppConfig;
export { validationResult };