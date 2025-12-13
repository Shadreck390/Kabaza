// src/utils/userStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  STORAGE_KEYS, 
  PERSIST_CONFIG, 
  CACHE_DURATIONS 
} from '../store/utils/constants';

// ====================
// STORAGE KEYS
// ====================

// Authentication & User Data
const USER_DATA_KEY = STORAGE_KEYS.USER_PROFILE;
const USER_TOKEN_KEY = STORAGE_KEYS.USER_TOKEN;
const USER_REFRESH_TOKEN_KEY = STORAGE_KEYS.USER_REFRESH_TOKEN;
const USER_ROLE_KEY = '@kabaza_user_role'; // Keeping for backward compatibility

// Ride Data
const RIDE_HISTORY_KEY = STORAGE_KEYS.RIDE_HISTORY;
const CURRENT_RIDE_KEY = '@kabaza_current_ride';
const RIDE_REQUESTS_KEY = '@kabaza_ride_requests';
const NEARBY_RIDES_KEY = '@kabaza_nearby_rides';

// Driver Data
const DRIVER_PROFILE_KEY = '@kabaza_driver_profile';
const DRIVER_VEHICLE_KEY = STORAGE_KEYS.DRIVER_VEHICLE;
const DRIVER_DOCUMENTS_KEY = STORAGE_KEYS.DRIVER_DOCUMENTS;
const DRIVER_EARNINGS_KEY = '@kabaza_driver_earnings';
const DRIVER_STATS_KEY = '@kabaza_driver_stats';

// Location & Settings
const USER_SETTINGS_KEY = STORAGE_KEYS.USER_SETTINGS;
const USER_PREFERENCES_KEY = STORAGE_KEYS.USER_PREFERENCES;
const FAVORITE_LOCATIONS_KEY = STORAGE_KEYS.FAVORITE_LOCATIONS;
const RECENT_SEARCHES_KEY = STORAGE_KEYS.RECENT_SEARCHES;
const LAST_LOCATION_KEY = STORAGE_KEYS.LAST_LOCATION;

// Cache & Timestamps
const CACHE_TIMESTAMP_KEY = STORAGE_KEYS.CACHE_TIMESTAMP;
const LAST_SOCKET_CONNECTION_KEY = STORAGE_KEYS.LAST_SOCKET_CONNECTION;
const LAST_SYNC_TIMESTAMP_KEY = '@kabaza_last_sync_timestamp';

// App State
const ONBOARDING_COMPLETE_KEY = STORAGE_KEYS.ONBOARDING_COMPLETE;
const NOTIFICATION_PERMISSION_KEY = STORAGE_KEYS.NOTIFICATION_PERMISSION;
const LOCATION_PERMISSION_KEY = STORAGE_KEYS.LOCATION_PERMISSION;
const APP_LAUNCH_COUNT_KEY = STORAGE_KEYS.APP_LAUNCH_COUNT;
const SESSION_DATA_KEY = '@kabaza_session_data';

// Real-time Data
const SOCKET_SESSION_KEY = '@kabaza_socket_session';
const PENDING_ACTIONS_KEY = '@kabaza_pending_actions';
const OFFLINE_LOCATIONS_KEY = '@kabaza_offline_locations';
const UNREAD_MESSAGES_KEY = '@kabaza_unread_messages';

// Payment Data
const PAYMENT_METHODS_KEY = STORAGE_KEYS.PAYMENT_METHODS;
const WALLET_BALANCE_KEY = '@kabaza_wallet_balance';
const TRANSACTION_HISTORY_KEY = '@kabaza_transaction_history';

// ====================
// STORAGE UTILITIES
// ====================

/**
 * Get item with timestamp validation
 */
const getItemWithValidation = async (key, maxAge = CACHE_DURATIONS.MEDIUM) => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    
    // Check if data has timestamp and if it's expired
    if (parsed.timestamp && maxAge !== Infinity) {
      const age = Date.now() - parsed.timestamp;
      if (age > maxAge) {
        console.log(`Cache expired for ${key}, age: ${age}ms`);
        await AsyncStorage.removeItem(key);
        return null;
      }
    }

    return parsed.data || parsed;
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

/**
 * Set item with timestamp
 */
const setItemWithTimestamp = async (key, data, ttl = CACHE_DURATIONS.MEDIUM) => {
  try {
    const item = ttl === Infinity ? data : {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    return false;
  }
};

/**
 * Batch get multiple items
 */
const multiGet = async (keys) => {
  try {
    const items = await AsyncStorage.multiGet(keys);
    const result = {};
    
    items.forEach(([key, value]) => {
      try {
        result[key] = value ? JSON.parse(value) : null;
      } catch {
        result[key] = value;
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error in multiGet:', error);
    return {};
  }
};

/**
 * Batch set multiple items
 */
const multiSet = async (keyValuePairs) => {
  try {
    const stringifiedPairs = keyValuePairs.map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value)
    ]);
    
    await AsyncStorage.multiSet(stringifiedPairs);
    return true;
  } catch (error) {
    console.error('Error in multiSet:', error);
    return false;
  }
};

/**
 * Clear items matching pattern
 */
const clearByPattern = async (pattern) => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
      console.log(`Cleared ${matchingKeys.length} items matching ${pattern}`);
    }
    
    return matchingKeys.length;
  } catch (error) {
    console.error(`Error clearing pattern ${pattern}:`, error);
    return 0;
  }
};

// ====================
// USER DATA MANAGEMENT
// ====================

export const saveUserData = async (userData) => {
  try {
    await setItemWithTimestamp(USER_DATA_KEY, userData, CACHE_DURATIONS.LONG);
    console.log('✅ User data saved successfully:', { 
      id: userData.id, 
      role: userData.role 
    });
    return true;
  } catch (error) {
    console.error('❌ Error saving user data:', error);
    return false;
  }
};

export const getUserData = async () => {
  try {
    return await getItemWithValidation(USER_DATA_KEY, CACHE_DURATIONS.LONG);
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return null;
  }
};

export const saveUserTokens = async (tokenData) => {
  try {
    const { token, refreshToken, expiresIn } = tokenData;
    
    await multiSet([
      [USER_TOKEN_KEY, token],
      [USER_REFRESH_TOKEN_KEY, refreshToken],
      ['@kabaza_token_expiry', Date.now() + (expiresIn || 3600000)],
    ]);
    
    console.log('✅ Tokens saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving tokens:', error);
    return false;
  }
};

export const getUserToken = async () => {
  try {
    return await AsyncStorage.getItem(USER_TOKEN_KEY);
  } catch (error) {
    console.error('❌ Error getting user token:', error);
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem(USER_REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('❌ Error getting refresh token:', error);
    return null;
  }
};

export const saveUserRole = async (role) => {
  try {
    await AsyncStorage.setItem(USER_ROLE_KEY, role);
    console.log('✅ User role saved:', role);
    return true;
  } catch (error) {
    console.error('❌ Error saving user role:', error);
    return false;
  }
};

export const getUserRole = async () => {
  try {
    return await AsyncStorage.getItem(USER_ROLE_KEY);
  } catch (error) {
    console.error('❌ Error getting user role:', error);
    return null;
  }
};

// ====================
// RIDE DATA MANAGEMENT
// ====================

export const storeRideHistory = async (rides) => {
  try {
    await setItemWithTimestamp(RIDE_HISTORY_KEY, rides, CACHE_DURATIONS.LONG);
    console.log('✅ Ride history saved:', rides.length, 'rides');
    return true;
  } catch (error) {
    console.error('❌ Error storing ride history:', error);
    return false;
  }
};

export const getRideHistory = async () => {
  try {
    const history = await getItemWithValidation(RIDE_HISTORY_KEY, CACHE_DURATIONS.LONG);
    
    if (!history || history.length === 0) {
      // Return sample rides if no history exists
      const sampleRides = [
        {
          id: `ride_${Date.now()}_1`,
          rideId: `RIDE001`,
          date: new Date().toISOString(),
          pickup: 'Area 3, Lilongwe',
          destination: '6th Avenue, Lilongwe, Malawi',
          fare: 850,
          currency: 'MWK',
          status: 'completed',
          driver: { name: 'John B.', rating: 4.8 },
          vehicle: { type: 'motorcycle', plate: 'KA 1234' },
          distance: 3.2,
          duration: 12,
          rating: 5,
          review: 'Great ride!',
        },
        {
          id: `ride_${Date.now()}_2`,
          rideId: `RIDE002`,
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          pickup: 'City Center, Lilongwe',
          destination: 'Kamuzu Central Hospital, Lilongwe, Malawi',
          fare: 1100,
          currency: 'MWK',
          status: 'completed',
          driver: { name: 'Mike T.', rating: 4.9 },
          vehicle: { type: 'motorcycle', plate: 'LL 5678' },
          distance: 4.5,
          duration: 15,
          rating: 5,
          review: 'Safe and fast',
        },
        {
          id: `ride_${Date.now()}_3`,
          rideId: `RIDE003`,
          date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          pickup: 'Area 18, Lilongwe',
          destination: 'Area 3 Shopping Complex, Lilongwe',
          fare: 0,
          currency: 'MWK',
          status: 'cancelled',
          cancellationReason: 'Driver unavailable',
          distance: 2.1,
          duration: 0,
        },
      ];
      
      await storeRideHistory(sampleRides);
      return sampleRides;
    }
    
    return history;
  } catch (error) {
    console.error('❌ Error getting ride history:', error);
    return [];
  }
};

export const addRideToHistory = async (ride) => {
  try {
    const currentHistory = await getRideHistory();
    const updatedHistory = [
      {
        ...ride,
        id: ride.id || `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      },
      ...currentHistory,
    ];
    
    // Keep only last 100 rides
    const trimmedHistory = updatedHistory.slice(0, 100);
    
    await storeRideHistory(trimmedHistory);
    console.log('✅ Ride added to history:', ride.id);
    return trimmedHistory;
  } catch (error) {
    console.error('❌ Error adding ride to history:', error);
    return [];
  }
};

export const updateRideInHistory = async (rideId, updates) => {
  try {
    const history = await getRideHistory();
    const index = history.findIndex(ride => ride.id === rideId || ride.rideId === rideId);
    
    if (index !== -1) {
      history[index] = { ...history[index], ...updates, updatedAt: Date.now() };
      await storeRideHistory(history);
      console.log('✅ Ride updated in history:', rideId);
      return history;
    }
    
    return history;
  } catch (error) {
    console.error('❌ Error updating ride in history:', error);
    return [];
  }
};

export const clearRideHistory = async () => {
  try {
    await AsyncStorage.removeItem(RIDE_HISTORY_KEY);
    console.log('✅ Ride history cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing ride history:', error);
    return false;
  }
};

// Current Ride Management
export const saveCurrentRide = async (ride) => {
  try {
    await setItemWithTimestamp(CURRENT_RIDE_KEY, ride, CACHE_DURATIONS.SHORT);
    console.log('✅ Current ride saved:', ride?.id);
    return true;
  } catch (error) {
    console.error('❌ Error saving current ride:', error);
    return false;
  }
};

export const getCurrentRide = async () => {
  try {
    return await getItemWithValidation(CURRENT_RIDE_KEY, CACHE_DURATIONS.SHORT);
  } catch (error) {
    console.error('❌ Error getting current ride:', error);
    return null;
  }
};

export const clearCurrentRide = async () => {
  try {
    await AsyncStorage.removeItem(CURRENT_RIDE_KEY);
    console.log('✅ Current ride cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing current ride:', error);
    return false;
  }
};

// ====================
// DRIVER DATA MANAGEMENT
// ====================

export const saveDriverProfile = async (profile) => {
  try {
    await setItemWithTimestamp(DRIVER_PROFILE_KEY, profile, CACHE_DURATIONS.LONG);
    console.log('✅ Driver profile saved:', profile?.id);
    return true;
  } catch (error) {
    console.error('❌ Error saving driver profile:', error);
    return false;
  }
};

export const getDriverProfile = async () => {
  try {
    return await getItemWithValidation(DRIVER_PROFILE_KEY, CACHE_DURATIONS.LONG);
  } catch (error) {
    console.error('❌ Error getting driver profile:', error);
    return null;
  }
};

export const saveVehicleInfo = async (vehicle) => {
  try {
    await setItemWithTimestamp(DRIVER_VEHICLE_KEY, vehicle, CACHE_DURATIONS.LONG);
    console.log('✅ Vehicle info saved:', vehicle?.plateNumber);
    return true;
  } catch (error) {
    console.error('❌ Error saving vehicle info:', error);
    return false;
  }
};

export const getVehicleInfo = async () => {
  try {
    return await getItemWithValidation(DRIVER_VEHICLE_KEY, CACHE_DURATIONS.LONG);
  } catch (error) {
    console.error('❌ Error getting vehicle info:', error);
    return null;
  }
};

export const saveDriverDocuments = async (documents) => {
  try {
    await setItemWithTimestamp(DRIVER_DOCUMENTS_KEY, documents, CACHE_DURATIONS.LONG);
    console.log('✅ Driver documents saved');
    return true;
  } catch (error) {
    console.error('❌ Error saving driver documents:', error);
    return false;
  }
};

export const getDriverDocuments = async () => {
  try {
    return await getItemWithValidation(DRIVER_DOCUMENTS_KEY, CACHE_DURATIONS.LONG);
  } catch (error) {
    console.error('❌ Error getting driver documents:', error);
    return null;
  }
};

export const saveDriverEarnings = async (earnings) => {
  try {
    await setItemWithTimestamp(DRIVER_EARNINGS_KEY, earnings, CACHE_DURATIONS.MEDIUM);
    console.log('✅ Driver earnings saved');
    return true;
  } catch (error) {
    console.error('❌ Error saving driver earnings:', error);
    return false;
  }
};

export const getDriverEarnings = async () => {
  try {
    return await getItemWithValidation(DRIVER_EARNINGS_KEY, CACHE_DURATIONS.MEDIUM);
  } catch (error) {
    console.error('❌ Error getting driver earnings:', error);
    return null;
  }
};

export const updateDriverEarnings = async (amount, type = 'ride') => {
  try {
    const earnings = await getDriverEarnings() || {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      lastUpdated: Date.now(),
    };
    
    earnings.today += amount;
    earnings.week += amount;
    earnings.month += amount;
    earnings.total += amount;
    earnings.lastUpdated = Date.now();
    
    if (type === 'payout') {
      earnings.lastPayout = Date.now();
      earnings.pendingPayouts = (earnings.pendingPayouts || 0) - amount;
    }
    
    await saveDriverEarnings(earnings);
    console.log('✅ Driver earnings updated:', amount);
    return earnings;
  } catch (error) {
    console.error('❌ Error updating driver earnings:', error);
    return null;
  }
};

export const resetDailyEarnings = async () => {
  try {
    const earnings = await getDriverEarnings() || {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
    };
    
    earnings.today = 0;
    earnings.lastUpdated = Date.now();
    
    await saveDriverEarnings(earnings);
    console.log('✅ Daily earnings reset');
    return earnings;
  } catch (error) {
    console.error('❌ Error resetting daily earnings:', error);
    return null;
  }
};

// ====================
// LOCATION & SETTINGS
// ====================

export const saveLastLocation = async (location) => {
  try {
    await setItemWithTimestamp(LAST_LOCATION_KEY, location, CACHE_DURATIONS.SHORT);
    console.log('✅ Last location saved:', { 
      lat: location.latitude, 
      lng: location.longitude 
    });
    return true;
  } catch (error) {
    console.error('❌ Error saving last location:', error);
    return false;
  }
};

export const getLastLocation = async () => {
  try {
    return await getItemWithValidation(LAST_LOCATION_KEY, CACHE_DURATIONS.SHORT);
  } catch (error) {
    console.error('❌ Error getting last location:', error);
    return null;
  }
};

export const saveFavoriteLocations = async (locations) => {
  try {
    await setItemWithTimestamp(FAVORITE_LOCATIONS_KEY, locations, CACHE_DURATIONS.LONG);
    console.log('✅ Favorite locations saved:', locations.length);
    return true;
  } catch (error) {
    console.error('❌ Error saving favorite locations:', error);
    return false;
  }
};

export const getFavoriteLocations = async () => {
  try {
    const locations = await getItemWithValidation(FAVORITE_LOCATIONS_KEY, CACHE_DURATIONS.LONG);
    return locations || [];
  } catch (error) {
    console.error('❌ Error getting favorite locations:', error);
    return [];
  }
};

export const addFavoriteLocation = async (location) => {
  try {
    const locations = await getFavoriteLocations();
    
    // Remove if already exists
    const filtered = locations.filter(loc => loc.id !== location.id);
    const updated = [location, ...filtered].slice(0, 10); // Keep only 10
    
    await saveFavoriteLocations(updated);
    console.log('✅ Favorite location added:', location.name);
    return updated;
  } catch (error) {
    console.error('❌ Error adding favorite location:', error);
    return [];
  }
};

export const saveRecentSearches = async (searches) => {
  try {
    await setItemWithTimestamp(RECENT_SEARCHES_KEY, searches, CACHE_DURATIONS.MEDIUM);
    console.log('✅ Recent searches saved:', searches.length);
    return true;
  } catch (error) {
    console.error('❌ Error saving recent searches:', error);
    return false;
  }
};

export const getRecentSearches = async () => {
  try {
    const searches = await getItemWithValidation(RECENT_SEARCHES_KEY, CACHE_DURATIONS.MEDIUM);
    return searches || [];
  } catch (error) {
    console.error('❌ Error getting recent searches:', error);
    return [];
  }
};

export const addRecentSearch = async (search) => {
  try {
    const searches = await getRecentSearches();
    
    // Remove if already exists
    const filtered = searches.filter(s => s.id !== search.id);
    const updated = [search, ...filtered].slice(0, 20); // Keep only 20
    
    await saveRecentSearches(updated);
    console.log('✅ Recent search added:', search.query);
    return updated;
  } catch (error) {
    console.error('❌ Error adding recent search:', error);
    return [];
  }
};

export const saveUserSettings = async (settings) => {
  try {
    await setItemWithTimestamp(USER_SETTINGS_KEY, settings, CACHE_DURATIONS.LONG);
    console.log('✅ User settings saved');
    return true;
  } catch (error) {
    console.error('❌ Error saving user settings:', error);
    return false;
  }
};

export const getUserSettings = async () => {
  try {
    const settings = await getItemWithValidation(USER_SETTINGS_KEY, CACHE_DURATIONS.LONG);
    return settings || {
      theme: 'light',
      language: 'en',
      currency: 'MWK',
      distanceUnit: 'km',
      mapType: 'standard',
      notifications: true,
      sounds: true,
      vibrations: true,
    };
  } catch (error) {
    console.error('❌ Error getting user settings:', error);
    return null;
  }
};

export const saveUserPreferences = async (preferences) => {
  try {
    await setItemWithTimestamp(USER_PREFERENCES_KEY, preferences, CACHE_DURATIONS.LONG);
    console.log('✅ User preferences saved');
    return true;
  } catch (error) {
    console.error('❌ Error saving user preferences:', error);
    return false;
  }
};

export const getUserPreferences = async () => {
  try {
    const preferences = await getItemWithValidation(USER_PREFERENCES_KEY, CACHE_DURATIONS.LONG);
    return preferences || {
      ridePreferences: {
        vehicleType: 'motorcycle',
        paymentMethod: 'cash',
        autoConfirmPickup: false,
        shareETA: true,
      },
      driverPreferences: {
        autoAcceptRides: false,
        maxRideDistance: 10,
        minFareAmount: 500,
        preferredAreas: [],
      },
    };
  } catch (error) {
    console.error('❌ Error getting user preferences:', error);
    return null;
  }
};

// ====================
// REAL-TIME DATA MANAGEMENT
// ====================

export const saveSocketSession = async (sessionData) => {
  try {
    await setItemWithTimestamp(SOCKET_SESSION_KEY, sessionData, CACHE_DURATIONS.SHORT);
    console.log('✅ Socket session saved');
    return true;
  } catch (error) {
    console.error('❌ Error saving socket session:', error);
    return false;
  }
};

export const getSocketSession = async () => {
  try {
    return await getItemWithValidation(SOCKET_SESSION_KEY, CACHE_DURATIONS.SHORT);
  } catch (error) {
    console.error('❌ Error getting socket session:', error);
    return null;
  }
};

export const savePendingActions = async (actions) => {
  try {
    await setItemWithTimestamp(PENDING_ACTIONS_KEY, actions, CACHE_DURATIONS.SHORT);
    console.log('✅ Pending actions saved:', actions.length);
    return true;
  } catch (error) {
    console.error('❌ Error saving pending actions:', error);
    return false;
  }
};

export const getPendingActions = async () => {
  try {
    const actions = await getItemWithValidation(PENDING_ACTIONS_KEY, CACHE_DURATIONS.SHORT);
    return actions || [];
  } catch (error) {
    console.error('❌ Error getting pending actions:', error);
    return [];
  }
};

export const addPendingAction = async (action) => {
  try {
    const actions = await getPendingActions();
    const updated = [
      {
        ...action,
        id: action.id || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      },
      ...actions,
    ].slice(0, 50); // Keep only last 50 pending actions
    
    await savePendingActions(updated);
    console.log('✅ Pending action added:', action.type);
    return updated;
  } catch (error) {
    console.error('❌ Error adding pending action:', error);
    return [];
  }
};

export const removePendingAction = async (actionId) => {
  try {
    const actions = await getPendingActions();
    const updated = actions.filter(action => action.id !== actionId);
    await savePendingActions(updated);
    console.log('✅ Pending action removed:', actionId);
    return updated;
  } catch (error) {
    console.error('❌ Error removing pending action:', error);
    return [];
  }
};

export const saveOfflineLocations = async (locations) => {
  try {
    await setItemWithTimestamp(OFFLINE_LOCATIONS_KEY, locations, CACHE_DURATIONS.SHORT);
    console.log('✅ Offline locations saved:', locations.length);
    return true;
  } catch (error) {
    console.error('❌ Error saving offline locations:', error);
    return false;
  }
};

export const getOfflineLocations = async () => {
  try {
    const locations = await getItemWithValidation(OFFLINE_LOCATIONS_KEY, CACHE_DURATIONS.SHORT);
    return locations || [];
  } catch (error) {
    console.error('❌ Error getting offline locations:', error);
    return [];
  }
};

export const addOfflineLocation = async (location) => {
  try {
    const locations = await getOfflineLocations();
    const updated = [
      {
        ...location,
        timestamp: Date.now(),
        synced: false,
      },
      ...locations,
    ].slice(0, 100); // Keep only last 100 locations
    
    await saveOfflineLocations(updated);
    console.log('✅ Offline location added');
    return updated;
  } catch (error) {
    console.error('❌ Error adding offline location:', error);
    return [];
  }
};

export const markLocationsAsSynced = async (locationIds) => {
  try {
    const locations = await getOfflineLocations();
    const updated = locations.map(loc => 
      locationIds.includes(loc.id) ? { ...loc, synced: true } : loc
    ).filter(loc => !loc.synced); // Remove synced locations
    
    await saveOfflineLocations(updated);
    console.log('✅ Locations marked as synced:', locationIds.length);
    return updated;
  } catch (error) {
    console.error('❌ Error marking locations as synced:', error);
    return [];
  }
};

// ====================
// APP STATE MANAGEMENT
// ====================

export const setOnboardingComplete = async (value = true) => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, JSON.stringify(value));
    console.log('✅ Onboarding complete:', value);
    return true;
  } catch (error) {
    console.error('❌ Error setting onboarding complete:', error);
    return false;
  }
};

export const getOnboardingComplete = async () => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('❌ Error getting onboarding complete:', error);
    return false;
  }
};

export const setLocationPermission = async (granted) => {
  try {
    await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, JSON.stringify(granted));
    console.log('✅ Location permission saved:', granted);
    return true;
  } catch (error) {
    console.error('❌ Error setting location permission:', error);
    return false;
  }
};

export const getLocationPermission = async () => {
  try {
    const value = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('❌ Error getting location permission:', error);
    return false;
  }
};

export const setNotificationPermission = async (granted) => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(granted));
    console.log('✅ Notification permission saved:', granted);
    return true;
  } catch (error) {
    console.error('❌ Error setting notification permission:', error);
    return false;
  }
};

export const getNotificationPermission = async () => {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('❌ Error getting notification permission:', error);
    return false;
  }
};

export const incrementAppLaunchCount = async () => {
  try {
    const current = await getAppLaunchCount();
    const updated = current + 1;
    await AsyncStorage.setItem(APP_LAUNCH_COUNT_KEY, updated.toString());
    console.log('✅ App launch count:', updated);
    return updated;
  } catch (error) {
    console.error('❌ Error incrementing app launch count:', error);
    return 0;
  }
};

export const getAppLaunchCount = async () => {
  try {
    const value = await AsyncStorage.getItem(APP_LAUNCH_COUNT_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('❌ Error getting app launch count:', error);
    return 0;
  }
};

// ====================
// PAYMENT DATA MANAGEMENT
// ====================

export const savePaymentMethods = async (methods) => {
  try {
    await setItemWithTimestamp(PAYMENT_METHODS_KEY, methods, CACHE_DURATIONS.LONG);
    console.log('✅ Payment methods saved:', methods.length);
    return true;
  } catch (error) {
    console.error('❌ Error saving payment methods:', error);
    return false;
  }
};

export const getPaymentMethods = async () => {
  try {
    const methods = await getItemWithValidation(PAYMENT_METHODS_KEY, CACHE_DURATIONS.LONG);
    return methods || [];
  } catch (error) {
    console.error('❌ Error getting payment methods:', error);
    return [];
  }
};

export const saveWalletBalance = async (balance) => {
  try {
    await setItemWithTimestamp(WALLET_BALANCE_KEY, balance, CACHE_DURATIONS.SHORT);
    console.log('✅ Wallet balance saved:', balance);
    return true;
  } catch (error) {
    console.error('❌ Error saving wallet balance:', error);
    return false;
  }
};

export const getWalletBalance = async () => {
  try {
    const balance = await getItemWithValidation(WALLET_BALANCE_KEY, CACHE_DURATIONS.SHORT);
    return balance || 0;
  } catch (error) {
    console.error('❌ Error getting wallet balance:', error);
    return 0;
  }
};

export const updateWalletBalance = async (amount, type = 'credit') => {
  try {
    const currentBalance = await getWalletBalance();
    const newBalance = type === 'credit' 
      ? currentBalance + amount 
      : currentBalance - amount;
    
    await saveWalletBalance(newBalance);
    console.log('✅ Wallet balance updated:', { type, amount, newBalance });
    return newBalance;
  } catch (error) {
    console.error('❌ Error updating wallet balance:', error);
    return null;
  }
};

export const saveTransactionHistory = async (transactions) => {
  try {
    await setItemWithTimestamp(TRANSACTION_HISTORY_KEY, transactions, CACHE_DURATIONS.LONG);
    console.log('✅ Transaction history saved:', transactions.length);
    return true;
  } catch (error) {
    console.error('❌ Error saving transaction history:', error);
    return false;
  }
};

export const getTransactionHistory = async () => {
  try {
    const transactions = await getItemWithValidation(TRANSACTION_HISTORY_KEY, CACHE_DURATIONS.LONG);
    return transactions || [];
  } catch (error) {
    console.error('❌ Error getting transaction history:', error);
    return [];
  }
};

export const addTransaction = async (transaction) => {
  try {
    const history = await getTransactionHistory();
    const updated = [
      {
        ...transaction,
        id: transaction.id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      },
      ...history,
    ].slice(0, 100); // Keep only last 100 transactions
    
    await saveTransactionHistory(updated);
    
    // Update wallet balance if transaction affects it
    if (transaction.type === 'credit' || transaction.type === 'debit') {
      await updateWalletBalance(transaction.amount, transaction.type);
    }
    
    console.log('✅ Transaction added:', transaction.type, transaction.amount);
    return updated;
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    return [];
  }
};

// ====================
// CLEANUP & MAINTENANCE
// ====================

export const clearUserData = async () => {
  try {
    const keysToRemove = [
      USER_DATA_KEY,
      USER_TOKEN_KEY,
      USER_REFRESH_TOKEN_KEY,
      USER_ROLE_KEY,
      RIDE_HISTORY_KEY,
      CURRENT_RIDE_KEY,
      RIDE_REQUESTS_KEY,
      NEARBY_RIDES_KEY,
      DRIVER_PROFILE_KEY,
      DRIVER_VEHICLE_KEY,
      DRIVER_DOCUMENTS_KEY,
      DRIVER_EARNINGS_KEY,
      DRIVER_STATS_KEY,
      SOCKET_SESSION_KEY,
      PENDING_ACTIONS_KEY,
      OFFLINE_LOCATIONS_KEY,
      UNREAD_MESSAGES_KEY,
      SESSION_DATA_KEY,
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('✅ User data cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
    return false;
  }
};

export const clearAllStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('✅ All storage cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing all storage:', error);
    return false;
  }
};

export const cleanupExpiredData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let cleanedCount = 0;
    
    for (const key of keys) {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          
          // Check if item has timestamp and is expired
          if (parsed.timestamp && parsed.ttl) {
            const age = Date.now() - parsed.timestamp;
            if (age > parsed.ttl) {
              await AsyncStorage.removeItem(key);
              cleanedCount++;
              console.log(`🧹 Cleaned expired item: ${key}`);
            }
          }
        }
      } catch (e) {
        // Skip items that can't be parsed
        continue;
      }
    }
    
    console.log(`✅ Cleanup completed: ${cleanedCount} items removed`);
    return cleanedCount;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return 0;
  }
};

export const getStorageStats = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stats = {
      totalKeys: keys.length,
      byPattern: {},
      totalSize: 0,
    };
    
    // Count by pattern
    for (const key of keys) {
      const pattern = key.split(':')[0] || 'other';
      stats.byPattern[pattern] = (stats.byPattern[pattern] || 0) + 1;
      
      // Estimate size
      const item = await AsyncStorage.getItem(key);
      if (item) {
        stats.totalSize += item.length * 2; // Approximate bytes (2 bytes per char for UTF-16)
      }
    }
    
    stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
    
    console.log('📊 Storage Stats:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    return null;
  }
};

// ====================
// BATCH OPERATIONS
// ====================

export const saveUserSession = async (sessionData) => {
  try {
    await multiSet([
      [USER_DATA_KEY, sessionData.user],
      [USER_TOKEN_KEY, sessionData.token],
      [USER_REFRESH_TOKEN_KEY, sessionData.refreshToken],
      [USER_ROLE_KEY, sessionData.role],
      [SESSION_DATA_KEY, {
        startTime: Date.now(),
        deviceId: sessionData.deviceId,
        sessionId: sessionData.sessionId,
      }],
    ]);
    
    console.log('✅ User session saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving user session:', error);
    return false;
  }
};

export const getUserSession = async () => {
  try {
    const session = await multiGet([
      USER_DATA_KEY,
      USER_TOKEN_KEY,
      USER_REFRESH_TOKEN_KEY,
      USER_ROLE_KEY,
      SESSION_DATA_KEY,
    ]);
    
    return {
      user: session[USER_DATA_KEY],
      token: session[USER_TOKEN_KEY],
      refreshToken: session[USER_REFRESH_TOKEN_KEY],
      role: session[USER_ROLE_KEY],
      sessionData: session[SESSION_DATA_KEY],
    };
  } catch (error) {
    console.error('❌ Error getting user session:', error);
    return null;
  }
};

export const saveDriverSession = async (driverSession) => {
  try {
    await multiSet([
      [DRIVER_PROFILE_KEY, driverSession.profile],
      [DRIVER_VEHICLE_KEY, driverSession.vehicle],
      [DRIVER_DOCUMENTS_KEY, driverSession.documents],
      [DRIVER_EARNINGS_KEY, driverSession.earnings],
      [DRIVER_STATS_KEY, driverSession.stats],
      [USER_PREFERENCES_KEY, driverSession.preferences],
      [LAST_LOCATION_KEY, driverSession.lastLocation],
    ]);
    
    console.log('✅ Driver session saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Error saving driver session:', error);
    return false;
  }
};

export const getDriverSession = async () => {
  try {
    const session = await multiGet([
      DRIVER_PROFILE_KEY,
      DRIVER_VEHICLE_KEY,
      DRIVER_DOCUMENTS_KEY,
      DRIVER_EARNINGS_KEY,
      DRIVER_STATS_KEY,
      USER_PREFERENCES_KEY,
      LAST_LOCATION_KEY,
    ]);
    
    return {
      profile: session[DRIVER_PROFILE_KEY],
      vehicle: session[DRIVER_VEHICLE_KEY],
      documents: session[DRIVER_DOCUMENTS_KEY],
      earnings: session[DRIVER_EARNINGS_KEY],
      stats: session[DRIVER_STATS_KEY],
      preferences: session[USER_PREFERENCES_KEY],
      lastLocation: session[LAST_LOCATION_KEY],
    };
  } catch (error) {
    console.error('❌ Error getting driver session:', error);
    return null;
  }
};

// ====================
// EXPORT ALL FUNCTIONS
// ====================

export default {
  // Utilities
  getItemWithValidation,
  setItemWithTimestamp,
  multiGet,
  multiSet,
  clearByPattern,
  
  // User Data
  saveUserData,
  getUserData,
  saveUserTokens,
  getUserToken,
  getRefreshToken,
  saveUserRole,
  getUserRole,
  
  // Ride Data
  storeRideHistory,
  getRideHistory,
  addRideToHistory,
  updateRideInHistory,
  clearRideHistory,
  saveCurrentRide,
  getCurrentRide,
  clearCurrentRide,
  
  // Driver Data
  saveDriverProfile,
  getDriverProfile,
  saveVehicleInfo,
  getVehicleInfo,
  saveDriverDocuments,
  getDriverDocuments,
  saveDriverEarnings,
  getDriverEarnings,
  updateDriverEarnings,
  resetDailyEarnings,
  
  // Location & Settings
  saveLastLocation,
  getLastLocation,
  saveFavoriteLocations,
  getFavoriteLocations,
  addFavoriteLocation,
  saveRecentSearches,
  getRecentSearches,
  addRecentSearch,
  saveUserSettings,
  getUserSettings,
  saveUserPreferences,
  getUserPreferences,
  
  // Real-time Data
  saveSocketSession,
  getSocketSession,
  savePendingActions,
  getPendingActions,
  addPendingAction,
  removePendingAction,
  saveOfflineLocations,
  getOfflineLocations,
  addOfflineLocation,
  markLocationsAsSynced,
  
  // App State
  setOnboardingComplete,
  getOnboardingComplete,
  setLocationPermission,
  getLocationPermission,
  setNotificationPermission,
  getNotificationPermission,
  incrementAppLaunchCount,
  getAppLaunchCount,
  
  // Payment Data
  savePaymentMethods,
  getPaymentMethods,
  saveWalletBalance,
  getWalletBalance,
  updateWalletBalance,
  saveTransactionHistory,
  getTransactionHistory,
  addTransaction,
  
  // Cleanup
  clearUserData,
  clearAllStorage,
  cleanupExpiredData,
  getStorageStats,
  
  // Batch Operations
  saveUserSession,
  getUserSession,
  saveDriverSession,
  getDriverSession,
};