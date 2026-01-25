// src/store/index.js (Firebase Disabled - FIXED VERSION)
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
// import createSagaMiddleware from 'redux-saga'; // ❌ TEMPORARILY DISABLED

// Import your slices - FIXED: Use relative paths to avoid alias issues during initialization
import authReducer from './slices/authSlice';
import appReducer from './slices/appSlice';
import driverReducer from './slices/driverSlice';
import rideReducer from './slices/rideSlice';
import locationReducer from './slices/locationSlice';
import notificationReducer from './slices/notificationSlice';
import chatReducer from './slices/chatSlice';
import paymentReducer from './slices/paymentSlice';

// ❌ TEMPORARILY DISABLED - Comment out saga import
// import rootSaga from './sagas/index';

// ====================
// PERSIST CONFIGURATION
// ====================

// Define initial auth state for migration
const initialAuthState = {
  user: null,
  token: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
  isVerified: false,
  isProfileComplete: false,
  driverInfo: null,
  riderInfo: null,
  wallet: null,
  meta: {},
  loading: false,
  error: null,
};

// Individual persist configurations for better control
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: [
    'user',
    'token',
    'refreshToken',
    'role',
    'isAuthenticated',
    'isVerified',
    'isProfileComplete',
    'driverInfo',
    'riderInfo',
    'wallet',
    'meta',
  ],
  stateReconciler: autoMergeLevel2,
  timeout: 5000,
  migrate: (state) => {
    // Migration logic for auth state
    if (state && state._persist) {
      return Promise.resolve(state);
    }
    return Promise.resolve({
      ...initialAuthState,
      _persist: { version: 1, rehydrated: false }
    });
  },
};

const appPersistConfig = {
  key: 'app',
  storage: AsyncStorage,
  whitelist: [
    'appSettings',
    'preferences',
    'notificationSettings',
    'featureFlags',
    'session',
    'metrics',
  ],
  blacklist: [
    'loadingStates',
    'errors',
    'notifications',
    'unreadNotificationCount',
    'lastUpdates',
    'networkStatus',
    'socketStatus',
  ],
  stateReconciler: autoMergeLevel2,
  timeout: 3000,
};

const driverPersistConfig = {
  key: 'driver',
  storage: AsyncStorage,
  whitelist: [
    'driverProfile',
    'vehicle',
    'documents',
    'preferences',
    'filters',
    'stats',
    'earnings',
    'rideHistory',
    'verificationStatus',
  ],
  blacklist: [
    'nearbyRides',
    'rideRequests',
    'currentRide',
    'selectedRide',
    'loading',
    'errors',
    'session',
    'realTime',
    'socketConnected',
    'currentLocation',
  ],
  stateReconciler: autoMergeLevel2,
  timeout: 3000,
};

const paymentPersistConfig = {
  key: 'payment',
  storage: AsyncStorage,
  whitelist: [
    'wallet',
    'paymentMethods',
    'defaultPaymentMethod',
    'settings',
    'cards',
    'bankAccounts',
    'promotions',
    'limits',
    'security',
    'stats',
    'tax',
  ],
  blacklist: [
    'currentPayment',
    'paymentStatus',
    'paymentResult',
    'pendingPayments',
    'transactions',
    'transactionHistory',
    'loading',
    'errors',
    'receipts',
    'subscriptions',
    'invoices',
    'disputes',
    'refunds',
  ],
  stateReconciler: autoMergeLevel2,
  timeout: 3000,
};

// ====================
// ROOT REDUCER
// ====================

// Combine reducers with individual persist configs
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  app: persistReducer(appPersistConfig, appReducer),
  driver: persistReducer(driverPersistConfig, driverReducer),
  ride: rideReducer, // Non-persisted - real-time data
  location: locationReducer, // Non-persisted - real-time data
  notification: notificationReducer, // Non-persisted - real-time data
  chat: chatReducer, // Non-persisted - real-time data
  payment: persistReducer(paymentPersistConfig, paymentReducer),
});

// ====================
// SAGA SETUP - TEMPORARILY DISABLED
// ====================

// ❌ COMMENT OUT SAGA SETUP FOR NOW
// const sagaMiddleware = createSagaMiddleware({
//   onError: (error, errorInfo) => {
//     const errorMessage = error?.message || 'Unknown saga error';
//     const errorStack = error?.stack || 'No stack trace';
//     const sagaStack = errorInfo?.sagaStack || '';
    
//     console.error('🔥 SAGA ERROR:', errorMessage);
    
//     if ((sagaStack && sagaStack.includes('notificationSaga')) || 
//         (errorStack && errorStack.includes('notificationSaga'))) {
//       console.warn('⚠️ Notification saga error - continuing without notifications');
//       return;
//     }
    
//     console.log('Error details:', {
//       message: errorMessage,
//       stack: errorStack,
//       sagaStack: sagaStack,
//       sagaLocation: errorInfo?.sagaLocation || 'Unknown location'
//     });
//   },
// });

// ====================
// STORE CONFIGURATION
// ====================

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => {
    const middlewares = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
        ],
        ignoredPaths: [
          'auth.session',
          'app.session',
          'driver.session',
          'ride.realTime',
          'location.tracking',
          'chat.connection',
          'payment.currentTransaction',
          'register',
        ],
      },
      immutableCheck: {
        warnAfter: 128,
      },
      // No thunk: false since we're not using saga
    });
    
    // ❌ DON'T ADD SAGA MIDDLEWARE FOR NOW
    // middlewares.push(sagaMiddleware);
    
    // Add custom middleware for real-time logging (development only)
    if (__DEV__) {
      // Check if redux-flipper is available
      try {
        const createDebugger = require('redux-flipper').default;
        middlewares.push(createDebugger());
      } catch (e) {
        console.log('redux-flipper not installed, skipping');
      }
      
      // Custom logging middleware (simpler version)
      const logger = store => next => action => {
        if (action.type && !action.type.startsWith('persist/')) {
          const result = next(action);
          return result;
        } else {
          return next(action);
        }
      };
      middlewares.push(logger);
    }
    
    return middlewares;
  },
  devTools: __DEV__,
  enhancers: (defaultEnhancers) => {
    return [...defaultEnhancers];
  },
});

// ====================
// PERSISTOR CONFIGURATION
// ====================

export const persistor = persistStore(store, null, (error, state) => {
  if (error) {
    console.error('Error during rehydration:', error);
  } else {
    console.log('✅ Rehydration completed successfully');
    
    // Dispatch action to indicate rehydration is complete
    store.dispatch({ type: 'APP_REHYDRATION_COMPLETE' });
  }
});

// ====================
// STORE UTILITIES
// ====================

// Helper to reset specific parts of the store
export const resetStoreSection = (section) => {
  switch (section) {
    case 'auth':
      store.dispatch({ type: 'auth/resetAuthState' });
      break;
    case 'driver':
      store.dispatch({ type: 'driver/resetDriverState' });
      break;
    case 'ride':
      store.dispatch({ type: 'ride/resetRideState' });
      break;
    case 'payment':
      store.dispatch({ type: 'payment/resetPaymentState' });
      break;
    case 'all':
      persistor.purge();
      store.dispatch({ type: 'STORE_RESET' });
      break;
    default:
      console.warn(`Unknown store section: ${section}`);
  }
};

// Helper to get store state snapshot
export const getStoreSnapshot = () => {
  return store.getState();
};

// Helper to subscribe to store changes
export const subscribeToStore = (selector, callback) => {
  let currentState;
  
  const handleChange = () => {
    const nextState = selector(store.getState());
    
    if (nextState !== currentState) {
      currentState = nextState;
      callback(currentState);
    }
  };
  
  const unsubscribe = store.subscribe(handleChange);
  handleChange(); // Initial call
  
  return unsubscribe;
};

// ====================
// SAGA STARTUP - TEMPORARILY DISABLED
// ====================

// ❌ DON'T RUN SAGAS FOR NOW
// try {
//   sagaMiddleware.run(rootSaga);
//   console.log('✅ Sagas started successfully');
// } catch (error) {
//   console.error('❌ Failed to start sagas:', error);
//   // Create a dummy saga if the real one fails
//   const dummySaga = function* () {
//     console.log('⚠️ Running with dummy saga (Firebase disabled)');
//     yield;
//   };
//   sagaMiddleware.run(dummySaga);
// }

// ====================
// STORE READY CHECK
// ====================

// Optional: Add a promise that resolves when store is ready
let storeReadyResolve;
export const storeReady = new Promise((resolve) => {
  storeReadyResolve = resolve;
});

// Listen for rehydration completion
const unsubscribe = persistor.subscribe(() => {
  const { bootstrapped } = persistor.getState();
  if (bootstrapped && storeReadyResolve) {
    storeReadyResolve();
    storeReadyResolve = null;
    unsubscribe(); // Clean up subscription
  }
});

// ====================
// EXPORT DEFAULT
// ====================

export default store;