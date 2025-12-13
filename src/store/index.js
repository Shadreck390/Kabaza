// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';

// Import your slices
import authReducer from './slices/authSlice';
import appReducer from './slices/appSlice';
import driverReducer from './slices/driverSlice';
import rideReducer from './slices/rideSlice'; // You'll create this
import locationReducer from './slices/locationSlice'; // You'll create this
import notificationReducer from './slices/notificationSlice'; // You'll create this
import chatReducer from './slices/chatSlice'; // You'll create this
import paymentReducer from './slices/paymentSlice'; // You'll create this

// Import sagas
import authSaga from './sagas/authSaga';
import driverSaga from './sagas/driverSaga';
import rideSaga from './sagas/rideSaga';
import locationSaga from './sagas/locationSaga';
import socketSaga from './sagas/socketSaga';

// ====================
// PERSIST CONFIGURATION
// ====================

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
      ...initialAuthState, // You'll need to define this
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
  payment: paymentReducer, // Partially persisted
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
      const createDebugger = require('redux-flipper').default;
      middlewares.push(createDebugger());
      
      // Custom logging middleware
      const logger = store => next => action => {
        if (action.type && !action.type.startsWith('persist/')) {
          console.group(`%c Redux Action: ${action.type}`, 'color: #4CAF50; font-weight: bold');
          console.log('Payload:', action.payload);
          console.log('State Before:', store.getState());
          const result = next(action);
          console.log('State After:', store.getState());
          console.groupEnd();
        } else {
          return next(action);
        }
      };
      middlewares.push(logger);
    }
    
    return middlewares;
  },
  devTools: __DEV__ ? {
    name: 'Kabaza Driver App',
    trace: true,
    traceLimit: 25,
    features: {
      persist: true,
      jump: true,
      skip: true,
      reorder: true,
      dispatch: true,
      test: true,
    },
  } : false,
  enhancers: (defaultEnhancers) => {
    // Add any custom enhancers here
    return [...defaultEnhancers];
  },
});

// ====================
// PERSISTOR CONFIGURATION
// ====================

export const persistor = persistStore(store, {
  manualPersist: false,
  // Callbacks for persistence events
  // onPersist: () => {
  //   console.log('Redux persistence started');
  // },
  // onRehydrate: () => {
  //   console.log('Redux rehydration started');
  // },
}, (error, state) => {
  if (error) {
    console.error('Error during rehydration:', error);
    // Handle rehydration error (e.g., clear storage, show error message)
  } else {
    console.log('Rehydration completed successfully');
    
    // Dispatch action to indicate rehydration is complete
    store.dispatch({ type: 'APP_REHYDRATION_COMPLETE' });
    
    // Initialize real-time services after rehydration
    const { auth } = state;
    if (auth.isAuthenticated && auth.user) {
      // Initialize socket connection
      store.dispatch({ type: 'SOCKET_INITIALIZE', payload: auth.user });
      
      // Initialize location services
      store.dispatch({ type: 'LOCATION_INITIALIZE' });
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
      store.dispatch({ type: 'AUTH_RESET' });
      break;
    case 'driver':
      store.dispatch({ type: 'DRIVER_RESET' });
      break;
    case 'ride':
      store.dispatch({ type: 'RIDE_RESET' });
      break;
    case 'all':
      // Purge all persisted data
      persistor.purge();
      store.dispatch({ type: 'STORE_RESET' });
      break;
  }
};

// Helper to get store state snapshot
export const getStoreSnapshot = () => {
  return store.getState();
};

// Helper to subscribe to store changes
export const subscribeToStore = (selector, callback) => {
  let currentState;
  
  return store.subscribe(() => {
    const nextState = selector(store.getState());
    
    if (nextState !== currentState) {
      currentState = nextState;
      callback(currentState);
    }
  });
};

// ====================
// TYPE EXPORTS
// ====================

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Helper types for typed hooks
export interface TypedUseSelectorHook<TState> {
  <TSelected>(selector: (state: TState) => TSelected): TSelected;
}

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
persistor.subscribe(() => {
  const { bootstrapped } = persistor.getState();
  if (bootstrapped && storeReadyResolve) {
    storeReadyResolve();
    storeReadyResolve = null;
  }
});

// ====================
// EXPORT DEFAULT
// ====================

export default store;