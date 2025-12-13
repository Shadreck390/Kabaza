// src/store/slices/appSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // App state
  isLoading: false,
  isAppReady: false,
  isInitialized: false,
  currentScreen: null,
  previousScreen: null,
  appState: 'active', // 'active', 'background', 'inactive'
  appVersion: '1.0.0',
  buildNumber: '1',
  
  // Network & Connection
  networkStatus: 'unknown', // 'unknown', 'connected', 'disconnected', 'connecting'
  socketStatus: 'disconnected', // 'disconnected', 'connecting', 'connected', 'reconnecting'
  lastSocketConnection: null,
  connectionType: null, // 'wifi', 'cellular', 'ethernet', 'unknown'
  
  // Real-time Features
  realTimeEnabled: true,
  backgroundUpdates: false,
  locationTracking: true,
  pushNotifications: false,
  
  // Loading States
  loadingStates: {
    auth: { loading: false, message: '' },
    ride: { loading: false, message: '' },
    payment: { loading: false, message: '' },
    location: { loading: false, message: '' },
    driver: { loading: false, message: '' },
  },
  
  // Errors
  errors: [],
  lastError: null,
  
  // Notifications (System notifications)
  notifications: [],
  unreadNotificationCount: 0,
  notificationSettings: {
    enabled: true,
    sounds: true,
    vibrations: true,
    rideUpdates: true,
    chatMessages: true,
    paymentUpdates: true,
    promotions: false,
  },
  
  // App Settings
  appSettings: {
    theme: 'light', // 'light', 'dark', 'system'
    language: 'en',
    currency: 'MWK',
    distanceUnit: 'km', // 'km', 'mi'
    temperatureUnit: 'celsius', // 'celsius', 'fahrenheit'
    mapType: 'standard', // 'standard', 'satellite', 'hybrid'
    autoStartTracking: true,
    saveRideHistory: true,
    analyticsEnabled: true,
    crashReporting: true,
  },
  
  // User Preferences
  preferences: {
    favoriteLocations: [],
    recentSearches: [],
    savedAddresses: [],
    ridePreferences: {
      vehicleType: 'motorcycle',
      paymentMethod: 'cash',
      autoConfirmPickup: false,
      shareETA: true,
    },
    driverPreferences: {
      autoAcceptRides: false,
      maxRideDistance: 10, // km
      minFareAmount: 500, // MWK
      preferredAreas: [],
    },
  },
  
  // Cache & Timestamps
  lastUpdates: {
    location: null,
    drivers: null,
    rideEstimate: null,
    notifications: null,
    messages: null,
  },
  
  // Performance Metrics
  metrics: {
    appStartTime: null,
    lastCrash: null,
    sessionCount: 0,
    totalRideTime: 0,
    totalDistance: 0,
  },
  
  // Session Management
  session: {
    startTime: null,
    duration: 0,
    screensVisited: [],
    actionsPerformed: [],
  },
  
  // Feature Flags
  featureFlags: {
    enableSOS: true,
    enableChat: true,
    enableWallet: true,
    enableRatings: true,
    enableSurgePricing: true,
    enablePromotions: true,
    enableReferrals: true,
  },
  
  // Debug & Development
  debug: {
    enabled: __DEV__,
    logLevel: 'debug', // 'error', 'warn', 'info', 'debug'
    reduxLogging: __DEV__,
    networkLogging: __DEV__,
    locationLogging: __DEV__,
  },
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // App State Management
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    setAppReady: (state, action) => {
      state.isAppReady = action.payload;
    },
    
    setInitialized: (state, action) => {
      state.isInitialized = action.payload;
    },
    
    setCurrentScreen: (state, action) => {
      state.previousScreen = state.currentScreen;
      state.currentScreen = action.payload;
      
      // Track screen visits in session
      if (action.payload) {
        state.session.screensVisited.push({
          screen: action.payload,
          timestamp: Date.now(),
        });
      }
    },
    
    setAppState: (state, action) => {
      state.appState = action.payload;
    },
    
    // Network & Connection
    setNetworkStatus: (state, action) => {
      state.networkStatus = action.payload.status;
      state.connectionType = action.payload.type || state.connectionType;
      
      if (action.payload.status === 'connected') {
        state.lastSocketConnection = Date.now();
      }
    },
    
    setSocketStatus: (state, action) => {
      state.socketStatus = action.payload.status;
      
      if (action.payload.status === 'connected') {
        state.lastSocketConnection = Date.now();
        state.realTimeEnabled = true;
      } else if (action.payload.status === 'disconnected') {
        state.realTimeEnabled = false;
      }
    },
    
    // Loading States Management
    setLoadingState: (state, action) => {
      const { key, loading, message = '' } = action.payload;
      if (state.loadingStates[key]) {
        state.loadingStates[key] = { loading, message };
      }
    },
    
    clearAllLoadingStates: (state) => {
      Object.keys(state.loadingStates).forEach(key => {
        state.loadingStates[key] = { loading: false, message: '' };
      });
    },
    
    // Error Management
    setError: (state, action) => {
      const error = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      
      state.errors.push(error);
      state.lastError = error;
      
      // Keep only last 50 errors
      if (state.errors.length > 50) {
        state.errors = state.errors.slice(-50);
      }
    },
    
    clearError: (state, action) => {
      const { id } = action.payload;
      state.errors = state.errors.filter(error => error.id !== id);
    },
    
    clearAllErrors: (state) => {
      state.errors = [];
      state.lastError = null;
    },
    
    // Notifications Management
    addNotification: (state, action) => {
      const notification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      
      state.notifications.unshift(notification);
      state.unreadNotificationCount++;
      
      // Keep only last 100 notifications
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
    },
    
    markNotificationAsRead: (state, action) => {
      const { id } = action.payload;
      const notification = state.notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
      }
    },
    
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadNotificationCount = 0;
    },
    
    removeNotification: (state, action) => {
      const { id } = action.payload;
      const notification = state.notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
      }
      state.notifications = state.notifications.filter(n => n.id !== id);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadNotificationCount = 0;
    },
    
    updateNotificationSettings: (state, action) => {
      state.notificationSettings = {
        ...state.notificationSettings,
        ...action.payload,
      };
    },
    
    // App Settings Management
    updateAppSettings: (state, action) => {
      state.appSettings = {
        ...state.appSettings,
        ...action.payload,
      };
    },
    
    resetAppSettings: (state) => {
      state.appSettings = initialState.appSettings;
    },
    
    // User Preferences
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    
    addFavoriteLocation: (state, action) => {
      const { location } = action.payload;
      // Remove if already exists
      state.preferences.favoriteLocations = state.preferences.favoriteLocations.filter(
        loc => loc.id !== location.id
      );
      // Add to beginning
      state.preferences.favoriteLocations.unshift(location);
      // Keep only last 10
      if (state.preferences.favoriteLocations.length > 10) {
        state.preferences.favoriteLocations = state.preferences.favoriteLocations.slice(0, 10);
      }
    },
    
    addRecentSearch: (state, action) => {
      const { search } = action.payload;
      // Remove if already exists
      state.preferences.recentSearches = state.preferences.recentSearches.filter(
        s => s.id !== search.id
      );
      // Add to beginning
      state.preferences.recentSearches.unshift(search);
      // Keep only last 20
      if (state.preferences.recentSearches.length > 20) {
        state.preferences.recentSearches = state.preferences.recentSearches.slice(0, 20);
      }
    },
    
    // Cache & Timestamps
    updateLastUpdate: (state, action) => {
      const { key, timestamp = Date.now() } = action.payload;
      state.lastUpdates[key] = timestamp;
    },
    
    clearCache: (state, action) => {
      const { key } = action.payload;
      if (key) {
        state.lastUpdates[key] = null;
      } else {
        // Clear all
        Object.keys(state.lastUpdates).forEach(k => {
          state.lastUpdates[k] = null;
        });
      }
    },
    
    // Real-time Features
    toggleRealTimeFeature: (state, action) => {
      const { feature, enabled } = action.payload;
      if (state.hasOwnProperty(feature)) {
        state[feature] = enabled;
      }
    },
    
    setBackgroundUpdates: (state, action) => {
      state.backgroundUpdates = action.payload;
    },
    
    setLocationTracking: (state, action) => {
      state.locationTracking = action.payload;
    },
    
    // Performance Metrics
    updateMetrics: (state, action) => {
      state.metrics = {
        ...state.metrics,
        ...action.payload,
      };
    },
    
    incrementSessionCount: (state) => {
      state.metrics.sessionCount += 1;
    },
    
    addRideMetrics: (state, action) => {
      const { duration, distance } = action.payload;
      state.metrics.totalRideTime += duration;
      state.metrics.totalDistance += distance;
    },
    
    // Session Management
    startSession: (state) => {
      state.session.startTime = Date.now();
      state.session.duration = 0;
      state.session.screensVisited = [];
      state.session.actionsPerformed = [];
      state.metrics.appStartTime = Date.now();
    },
    
    updateSession: (state) => {
      if (state.session.startTime) {
        state.session.duration = Date.now() - state.session.startTime;
      }
    },
    
    trackAction: (state, action) => {
      state.session.actionsPerformed.push({
        action: action.payload.action,
        data: action.payload.data,
        timestamp: Date.now(),
      });
    },
    
    // Feature Flags
    updateFeatureFlag: (state, action) => {
      const { flag, enabled } = action.payload;
      if (state.featureFlags.hasOwnProperty(flag)) {
        state.featureFlags[flag] = enabled;
      }
    },
    
    // Debug & Development
    setDebugMode: (state, action) => {
      state.debug.enabled = action.payload;
    },
    
    setLogLevel: (state, action) => {
      state.debug.logLevel = action.payload;
    },
    
    toggleReduxLogging: (state) => {
      state.debug.reduxLogging = !state.debug.reduxLogging;
    },
    
    // Reset App State (for logout)
    resetAppState: () => {
      return {
        ...initialState,
        isInitialized: true,
        appSettings: initialState.appSettings,
        preferences: initialState.preferences,
        notificationSettings: initialState.notificationSettings,
        session: {
          ...initialState.session,
          startTime: Date.now(),
        },
      };
    },
    
    // Batch Update
    batchUpdateAppState: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
  
  // Extra reducers for async actions
  extraReducers: (builder) => {
    // You can add extra reducers here for async thunks
  },
});

// Action Creators
export const {
  // App State
  setLoading,
  setAppReady,
  setInitialized,
  setCurrentScreen,
  setAppState,
  
  // Network & Connection
  setNetworkStatus,
  setSocketStatus,
  
  // Loading States
  setLoadingState,
  clearAllLoadingStates,
  
  // Error Management
  setError,
  clearError,
  clearAllErrors,
  
  // Notifications
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearNotifications,
  updateNotificationSettings,
  
  // App Settings
  updateAppSettings,
  resetAppSettings,
  
  // User Preferences
  updatePreferences,
  addFavoriteLocation,
  addRecentSearch,
  
  // Cache & Timestamps
  updateLastUpdate,
  clearCache,
  
  // Real-time Features
  toggleRealTimeFeature,
  setBackgroundUpdates,
  setLocationTracking,
  
  // Performance Metrics
  updateMetrics,
  incrementSessionCount,
  addRideMetrics,
  
  // Session Management
  startSession,
  updateSession,
  trackAction,
  
  // Feature Flags
  updateFeatureFlag,
  
  // Debug
  setDebugMode,
  setLogLevel,
  toggleReduxLogging,
  
  // Reset
  resetAppState,
  batchUpdateAppState,
} = appSlice.actions;

// Selectors
export const selectApp = (state) => state.app;
export const selectIsLoading = (state) => state.app.isLoading;
export const selectIsAppReady = (state) => state.app.isAppReady;
export const selectCurrentScreen = (state) => state.app.currentScreen;
export const selectNetworkStatus = (state) => state.app.networkStatus;
export const selectSocketStatus = (state) => state.app.socketStatus;
export const selectIsOnline = (state) => state.app.networkStatus === 'connected';
export const selectIsSocketConnected = (state) => state.app.socketStatus === 'connected';
export const selectNotifications = (state) => state.app.notifications;
export const selectUnreadNotificationCount = (state) => state.app.unreadNotificationCount;
export const selectAppSettings = (state) => state.app.appSettings;
export const selectPreferences = (state) => state.app.preferences;
export const selectLoadingState = (key) => (state) => state.app.loadingStates[key] || { loading: false, message: '' };
export const selectLastUpdate = (key) => (state) => state.app.lastUpdates[key];
export const selectFeatureFlags = (state) => state.app.featureFlags;
export const selectRealTimeEnabled = (state) => state.app.realTimeEnabled;
export const selectBackgroundUpdates = (state) => state.app.backgroundUpdates;
export const selectLocationTracking = (state) => state.app.locationTracking;

// Derived Selectors
export const selectCanUseRealTime = (state) => 
  state.app.networkStatus === 'connected' && 
  state.app.socketStatus === 'connected' && 
  state.app.realTimeEnabled;

export const selectShouldTrackLocation = (state) =>
  state.app.locationTracking && 
  (state.app.appState === 'active' || state.app.backgroundUpdates);

export const selectAppStateSummary = (state) => ({
  isReady: state.app.isAppReady,
  isOnline: state.app.networkStatus === 'connected',
  isSocketConnected: state.app.socketStatus === 'connected',
  hasNotifications: state.app.unreadNotificationCount > 0,
  currentScreen: state.app.currentScreen,
  theme: state.app.appSettings.theme,
  language: state.app.appSettings.language,
});

export const selectSessionMetrics = (state) => ({
  duration: state.app.session.duration,
  screensVisited: state.app.session.screensVisited.length,
  actionsPerformed: state.app.session.actionsPerformed.length,
  sessionCount: state.app.metrics.sessionCount,
  totalRideTime: state.app.metrics.totalRideTime,
  totalDistance: state.app.metrics.totalDistance,
});

// Async Thunks (example - you can add more)
// export const initializeApp = createAsyncThunk(
//   'app/initialize',
//   async (_, { dispatch }) => {
//     dispatch(setLoading(true));
//     try {
//       // Initialize app logic here
//       await Promise.all([
//         // Load settings, check auth, etc.
//       ]);
//       dispatch(setAppReady(true));
//       dispatch(setInitialized(true));
//     } catch (error) {
//       dispatch(setError({ 
//         message: 'Failed to initialize app', 
//         code: 'INIT_ERROR' 
//       }));
//     } finally {
//       dispatch(setLoading(false));
//     }
//   }
// );

export default appSlice.reducer;