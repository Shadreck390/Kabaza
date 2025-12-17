// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';

// Import your slices - FIXED with aliases:
import authReducer from '@store/slices/authSlice';
import appReducer from '@store/slices/appSlice';
import driverReducer from '@store/slices/driverSlice';
import rideReducer from '@store/slices/rideSlice';
import locationReducer from '@store/slices/locationSlice';
import notificationReducer from '@store/slices/notificationSlice';
import chatReducer from '@store/slices/chatSlice';
import paymentReducer from '@store/slices/paymentSlice';

// Import sagas - FIXED with aliases:
import authSaga from '@store/sagas/authSaga';
import driverSaga from '@store/sagas/driverSaga';
import rideSaga from '@store/sagas/rideSaga';
import locationSaga from '@store/sagas/locationSaga';
import socketSaga from '@store/sagas/socketSaga';

// Comment out for now if not created yet
// import notificationSaga from '@store/sagas/notificationSaga';
// import chatSaga from '@store/sagas/chatSaga';
// import paymentSaga from '@store/sagas/paymentSaga';

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
// SAGA SETUP
// ====================

// Create saga middleware
const sagaMiddleware = createSagaMiddleware({
  onError: (error, errorInfo) => {
    console.error('Saga Error:', error, errorInfo);
    // You can add error reporting here (e.g., Sentry, Firebase Crashlytics)
  },
});

// Root saga
function* rootSaga() {
  yield all([
    authSaga(),
    driverSaga(),
    rideSaga(),
    locationSaga(),
    socketSaga(),
    // Uncomment when you create these sagas:
    notificationSaga(),
    chatSaga(),
    paymentSaga(),
  ]);
}

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
          // Add any other non-serializable actions here
        ],
        ignoredPaths: [
          'auth.session',
          'app.session',
          'driver.session',
          'ride.realTime',
          'location.tracking',
          'chat.connection',
          'payment.currentTransaction',
          'register', // For redux-persist
        ],
      },
      immutableCheck: {
        warnAfter: 128, // Increase warning threshold
      },
      thunk: false, // Disable thunk since we're using saga
    });
    
    // Add saga middleware
    middlewares.push(sagaMiddleware);
    
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
    // Add any custom enhancers here
    return [...defaultEnhancers];
  },
});

// ====================
// PERSISTOR CONFIGURATION
// ====================

export const persistor = persistStore(store, null, (error, state) => {
  if (error) {
    console.error('Error during rehydration:', error);
    // Handle rehydration error
  } else {
    console.log('Rehydration completed successfully');
    
    // Dispatch action to indicate rehydration is complete
    store.dispatch({ type: 'APP_REHYDRATION_COMPLETE' });
    
    // Initialize real-time services after rehydration
    const { auth } = state;
    if (auth && auth.isAuthenticated && auth.user) {
      // Initialize socket connection
      store.dispatch({ 
        type: 'SOCKET_CONNECT_REQUEST',
        payload: {
          url: 'http://your-socket-server-url', // Replace with your socket URL
          userId: auth.user.id,
          userType: auth.user.role || 'user'
        }
      });
    }
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
      // Purge all persisted data
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
// TYPE DEFINITIONS (for TypeScript users)
// ====================

// If using TypeScript, uncomment and adjust:
/*
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Helper types for typed hooks
export interface TypedUseSelectorHook<TState> {
  <TSelected>(selector: (state: TState) => TSelected): TSelected;
}
*/

// ====================
// START SAGA MIDDLEWARE
// ====================

// Run saga middleware
sagaMiddleware.run(rootSaga);

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