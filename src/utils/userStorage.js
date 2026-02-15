// src/utils/userStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// ====================
// STORAGE KEYS (Based on your app structure)
// ====================

const STORAGE_KEYS = {
  // User Authentication
  USER_DATA: '@kabaza_user_data',
  AUTH_TOKEN: '@kabaza_auth_token',
  USER_ROLE: '@kabaza_user_role',
  USER_PROFILE: '@kabaza_user_profile',
  
  // App State
  ONBOARDING_COMPLETE: '@kabaza_onboarding_complete',
  APP_LAUNCH_COUNT: '@kabaza_app_launch_count',
  FIRST_LAUNCH: '@kabaza_first_launch',
  
  // Location
  LAST_LOCATION: '@kabaza_last_location',
  LOCATION_PERMISSION: '@kabaza_location_permission',
  
  // Settings & Preferences
  USER_SETTINGS: '@kabaza_user_settings',
  USER_PREFERENCES: '@kabaza_user_preferences',
  FAVORITE_LOCATIONS: '@kabaza_favorite_locations',
  RECENT_SEARCHES: '@kabaza_recent_searches',
  
  // Ride Data
  RIDE_HISTORY: '@kabaza_ride_history',
  CURRENT_RIDE: '@kabaza_current_ride',
  ACTIVE_RIDE: '@kabaza_active_ride',
  
  // Driver Data (for your driver screens)
  DRIVER_PROFILE: '@kabaza_driver_profile',
  DRIVER_VEHICLE: '@kabaza_driver_vehicle',
  DRIVER_DOCUMENTS: '@kabaza_driver_documents',
  DRIVER_EARNINGS: '@kabaza_driver_earnings',
  DRIVER_STATS: '@kabaza_driver_stats',
  
  // Payment Data
  PAYMENT_METHODS: '@kabaza_payment_methods',
  WALLET_BALANCE: '@kabaza_wallet_balance',
  TRANSACTION_HISTORY: '@kabaza_transaction_history',
  
  // Real-time Data
  SOCKET_SESSION: '@kabaza_socket_session',
  PENDING_ACTIONS: '@kabaza_pending_actions',
};

// ====================
// CORE USER FUNCTIONS (For OTP, Profile, Role Selection)
// ====================

/**
 * Save user data after OTP verification
 */
export const saveUserData = async (userData) => {
  try {
    console.log('💾 [saveUserData] Saving user data:', {
      phone: userData.phoneNumber || userData.phone,
      authMethod: userData.authMethod || 'phone',
      userType: userData.userType || 'rider',
    });

    // Prepare data for storage
    const dataToStore = {
      // Basic info
      id: userData.id || `user_${Date.now()}`,
      phone: userData.phoneNumber || userData.phone,
      email: userData.email || userData.socialUserInfo?.email,
      authMethod: userData.authMethod || 'phone',
      
      // Profile info
      firstName: userData.firstName || userData.profile?.firstName || '',
      lastName: userData.lastName || userData.profile?.lastName || userData.profile?.surname || '',
      fullName: userData.fullName || userData.profile?.fullName || '',
      gender: userData.gender || userData.profile?.gender || '',
      dateOfBirth: userData.dateOfBirth || userData.profile?.dateOfBirth || '',
      profilePicture: userData.profilePicture || userData.profile?.profilePicture,
      
      // Status flags
      isVerified: true,
      userType: userData.userType || 'rider',
      role: userData.role || userData.userType || 'rider',
      profileCompleted: userData.profileCompleted || false,
      isActive: true,
      
      // Timestamps
      createdAt: userData.createdAt || new Date().toISOString(),
      verifiedAt: userData.verifiedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Social info if available
      ...(userData.socialUserInfo && {
        socialProvider: userData.socialUserInfo.provider,
        socialId: userData.socialUserInfo.id,
      }),
    };

    // Save to AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(dataToStore));
    
    // Also save simplified profile for quick access
    await saveUserProfile({
      name: dataToStore.fullName || `${dataToStore.firstName} ${dataToStore.lastName}`.trim(),
      phone: dataToStore.phone,
      email: dataToStore.email,
      profilePicture: dataToStore.profilePicture,
      role: dataToStore.role,
    });

    console.log('✅ [saveUserData] User data saved successfully');
    return true;
  } catch (error) {
    console.error('❌ [saveUserData] Error:', error);
    throw new Error(`Failed to save user data: ${error.message}`);
  }
};

/**
 * Get user data
 */
export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!data) {
      console.log('📭 [getUserData] No user data found');
      return null;
    }

    const userData = JSON.parse(data);
    console.log('📋 [getUserData] Retrieved user:', {
      id: userData.id,
      phone: userData.phone,
      role: userData.role,
      profileCompleted: userData.profileCompleted,
    });

    return userData;
  } catch (error) {
    console.error('❌ [getUserData] Error:', error);
    return null;
  }
};

/**
 * Save auth token (for OTP verification)
 */
export const saveAuthToken = async (token) => {
  try {
    console.log('🔑 [saveAuthToken] Saving token');
    
    const tokenData = {
      token: token || `kabaza_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      issuedAt: new Date().toISOString(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(tokenData));
    console.log('✅ [saveAuthToken] Token saved');
    return true;
  } catch (error) {
    console.error('❌ [saveAuthToken] Error:', error);
    throw error;
  }
};

/**
 * Get auth token
 */
export const getAuthToken = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!data) {
      console.log('🔑 [getAuthToken] No token found');
      return null;
    }

    const tokenData = JSON.parse(data);
    
    // Check expiration
    if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
      console.log('⚠️ [getAuthToken] Token expired');
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      return null;
    }

    return tokenData.token;
  } catch (error) {
    console.error('❌ [getAuthToken] Error:', error);
    return null;
  }
};

/**
 * Save user role (for RoleSelectionScreen)
 */
export const saveUserRole = async (role) => {
  try {
    console.log('👤 [saveUserRole] Saving role:', role);
    
    // Save role separately
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    
    // Update user data with role
    const userData = await getUserData();
    if (userData) {
      userData.role = role;
      userData.userType = role;
      userData.roleUpdatedAt = new Date().toISOString();
      await saveUserData(userData);
    }
    
    console.log('✅ [saveUserRole] Role saved');
    return true;
  } catch (error) {
    console.error('❌ [saveUserRole] Error:', error);
    return false;
  }
};

/**
 * Get user role
 */
export const getUserRole = async () => {
  try {
    // First try to get from dedicated key
    let role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    
    if (!role) {
      // Fallback to user data
      const userData = await getUserData();
      role = userData?.role || userData?.userType;
    }
    
    console.log('👤 [getUserRole] Role:', role);
    return role;
  } catch (error) {
    console.error('❌ [getUserRole] Error:', error);
    return null;
  }
};

/**
 * Update user profile (for ProfileCompletionScreen)
 */
export const updateUserProfile = async (profileData) => {
  try {
    console.log('📝 [updateUserProfile] Updating profile:', {
      name: profileData.name || `${profileData.firstName} ${profileData.surname}`,
      gender: profileData.gender,
    });

    // Get existing user data
    let userData = await getUserData() || {};
    
    // If no user data exists (edge case), create basic structure
    if (!userData.id) {
      userData = {
        id: `user_${Date.now()}`,
        phone: profileData.phone || '',
        createdAt: new Date().toISOString(),
        isVerified: true,
        userType: 'rider',
        role: 'rider',
      };
    }

    // Merge profile data
    const updatedData = {
      ...userData,
      firstName: profileData.firstName || userData.firstName,
      lastName: profileData.surname || profileData.lastName || userData.lastName,
      fullName: profileData.name || `${profileData.firstName || ''} ${profileData.surname || ''}`.trim() || userData.fullName,
      gender: profileData.gender || userData.gender,
      dateOfBirth: profileData.dateOfBirth || userData.dateOfBirth,
      profilePicture: profileData.profilePictureUri || profileData.profilePicture || userData.profilePicture,
      profileCompleted: true,
      profileCompletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save updated data
    await saveUserData(updatedData);
    
    // Save simplified profile
    await saveUserProfile({
      name: updatedData.fullName,
      phone: updatedData.phone,
      email: updatedData.email,
      profilePicture: updatedData.profilePicture,
      gender: updatedData.gender,
      dateOfBirth: updatedData.dateOfBirth,
      role: updatedData.role,
    });

    console.log('✅ [updateUserProfile] Profile updated successfully');
    return true;
  } catch (error) {
    console.error('❌ [updateUserProfile] Error:', error);
    throw error;
  }
};

/**
 * Save user profile (simplified version)
 */
export const saveUserProfile = async (profile) => {
  try {
    const profileData = {
      ...profile,
      lastUpdated: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profileData));
    console.log('✅ [saveUserProfile] Profile saved:', profile.name);
    return true;
  } catch (error) {
    console.error('❌ [saveUserProfile] Error:', error);
    return false;
  }
};

/**
 * Get user profile (simplified)
 */
export const getUserProfile = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!data) {
      // Try to build from user data
      const userData = await getUserData();
      if (userData) {
        const profile = {
          name: userData.fullName || `${userData.firstName} ${userData.lastName}`.trim(),
          phone: userData.phone,
          email: userData.email,
          profilePicture: userData.profilePicture,
          gender: userData.gender,
          dateOfBirth: userData.dateOfBirth,
          role: userData.role,
          lastUpdated: userData.updatedAt,
        };
        await saveUserProfile(profile);
        return profile;
      }
      return null;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ [getUserProfile] Error:', error);
    return null;
  }
};

// ====================
// APP STATE FUNCTIONS
// ====================

export const setOnboardingComplete = async (value = true) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, JSON.stringify(value));
    console.log('✅ [setOnboardingComplete] Onboarding marked as complete');
    return true;
  } catch (error) {
    console.error('❌ [setOnboardingComplete] Error:', error);
    return false;
  }
};

export const getOnboardingComplete = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    const isComplete = value ? JSON.parse(value) : false;
    console.log('📋 [getOnboardingComplete] Onboarding complete:', isComplete);
    return isComplete;
  } catch (error) {
    console.error('❌ [getOnboardingComplete] Error:', error);
    return false;
  }
};

export const incrementAppLaunchCount = async () => {
  try {
    const current = await getAppLaunchCount();
    const updated = current + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.APP_LAUNCH_COUNT, updated.toString());
    
    // Mark first launch
    if (updated === 1) {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'true');
    }
    
    console.log('📱 [incrementAppLaunchCount] Launch count:', updated);
    return updated;
  } catch (error) {
    console.error('❌ [incrementAppLaunchCount] Error:', error);
    return 0;
  }
};

export const getAppLaunchCount = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.APP_LAUNCH_COUNT);
    const count = value ? parseInt(value, 10) : 0;
    console.log('📱 [getAppLaunchCount] Current count:', count);
    return count;
  } catch (error) {
    console.error('❌ [getAppLaunchCount] Error:', error);
    return 0;
  }
};

export const isFirstLaunch = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
    return value === 'true';
  } catch (error) {
    console.error('❌ [isFirstLaunch] Error:', error);
    return true;
  }
};

// ====================
// LOCATION FUNCTIONS (For RiderHomeScreen)
// ====================

export const saveLastLocation = async (location) => {
  try {
    const locationData = {
      ...location,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(locationData));
    console.log('📍 [saveLastLocation] Location saved:', location);
    return true;
  } catch (error) {
    console.error('❌ [saveLastLocation] Error:', error);
    return false;
  }
};

export const getLastLocation = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
    if (!data) {
      console.log('📍 [getLastLocation] No location found');
      return null;
    }
    
    const location = JSON.parse(data);
    
    // Check if location is fresh (less than 5 minutes old)
    const isFresh = Date.now() - location.timestamp < 5 * 60 * 1000;
    if (!isFresh) {
      console.log('📍 [getLastLocation] Location is stale');
      return null;
    }
    
    console.log('📍 [getLastLocation] Location retrieved');
    return location;
  } catch (error) {
    console.error('❌ [getLastLocation] Error:', error);
    return null;
  }
};

export const setLocationPermission = async (granted) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, JSON.stringify(granted));
    console.log('📍 [setLocationPermission] Permission:', granted);
    return true;
  } catch (error) {
    console.error('❌ [setLocationPermission] Error:', error);
    return false;
  }
};

export const getLocationPermission = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_PERMISSION);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('❌ [getLocationPermission] Error:', error);
    return false;
  }
};

// ====================
// RIDE FUNCTIONS (For Rider screens)
// ====================

export const saveCurrentRide = async (ride) => {
  try {
    const rideData = {
      ...ride,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_RIDE, JSON.stringify(rideData));
    console.log('🚗 [saveCurrentRide] Ride saved:', ride.id);
    return true;
  } catch (error) {
    console.error('❌ [saveCurrentRide] Error:', error);
    return false;
  }
};

export const getCurrentRide = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_RIDE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ [getCurrentRide] Error:', error);
    return null;
  }
};

export const clearCurrentRide = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_RIDE);
    console.log('🚗 [clearCurrentRide] Ride cleared');
    return true;
  } catch (error) {
    console.error('❌ [clearCurrentRide] Error:', error);
    return false;
  }
};

export const saveActiveRide = async (ride) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_RIDE, JSON.stringify(ride));
    console.log('🚗 [saveActiveRide] Active ride saved');
    return true;
  } catch (error) {
    console.error('❌ [saveActiveRide] Error:', error);
    return false;
  }
};

export const getActiveRide = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_RIDE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ [getActiveRide] Error:', error);
    return null;
  }
};

// ====================
// DRIVER FUNCTIONS (For Driver screens)
// ====================

export const saveDriverProfile = async (profile) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_PROFILE, JSON.stringify(profile));
    console.log('🚖 [saveDriverProfile] Driver profile saved');
    return true;
  } catch (error) {
    console.error('❌ [saveDriverProfile] Error:', error);
    return false;
  }
};

export const getDriverProfile = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ [getDriverProfile] Error:', error);
    return null;
  }
};

export const saveDriverVehicle = async (vehicle) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_VEHICLE, JSON.stringify(vehicle));
    console.log('🚖 [saveDriverVehicle] Vehicle saved:', vehicle?.plateNumber);
    return true;
  } catch (error) {
    console.error('❌ [saveDriverVehicle] Error:', error);
    return false;
  }
};

export const getDriverVehicle = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_VEHICLE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ [getDriverVehicle] Error:', error);
    return null;
  }
};

// ====================
// UTILITY FUNCTIONS
// ====================

export const clearUserData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const kabazaKeys = keys.filter(key => key.startsWith('@kabaza'));
    
    if (kabazaKeys.length > 0) {
      await AsyncStorage.multiRemove(kabazaKeys);
      console.log('🧹 [clearUserData] All user data cleared');
    }
    
    return true;
  } catch (error) {
    console.error('❌ [clearUserData] Error:', error);
    return false;
  }
};

export const clearAllStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('🧹 [clearAllStorage] All storage cleared');
    return true;
  } catch (error) {
    console.error('❌ [clearAllStorage] Error:', error);
    return false;
  }
};

export const isUserLoggedIn = async () => {
  try {
    const userData = await getUserData();
    const authToken = await getAuthToken();
    
    const isLoggedIn = !!(userData && authToken);
    console.log('🔐 [isUserLoggedIn] Status:', isLoggedIn);
    return isLoggedIn;
  } catch (error) {
    console.error('❌ [isUserLoggedIn] Error:', error);
    return false;
  }
};

export const printAllStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('📦 [printAllStorage] All storage keys:', keys.length);
    
    const items = await AsyncStorage.multiGet(keys);
    items.forEach(([key, value]) => {
      try {
        const parsedValue = value ? JSON.parse(value) : null;
        console.log(`  ${key}:`, parsedValue);
      } catch (e) {
        console.log(`  ${key}:`, value);
      }
    });
    
    return items;
  } catch (error) {
    console.error('❌ [printAllStorage] Error:', error);
    return [];
  }
};

// ====================
// DEFAULT EXPORT
// ====================

export default {
  // User Functions
  saveUserData,
  getUserData,
  saveAuthToken,
  getAuthToken,
  saveUserRole,
  getUserRole,
  updateUserProfile,
  saveUserProfile,
  getUserProfile,
  
  // App State
  setOnboardingComplete,
  getOnboardingComplete,
  incrementAppLaunchCount,
  getAppLaunchCount,
  isFirstLaunch,
  
  // Location
  saveLastLocation,
  getLastLocation,
  setLocationPermission,
  getLocationPermission,
  
  // Ride
  saveCurrentRide,
  getCurrentRide,
  clearCurrentRide,
  saveActiveRide,
  getActiveRide,
  
  // Driver
  saveDriverProfile,
  getDriverProfile,
  saveDriverVehicle,
  getDriverVehicle,
  
  // Utility
  clearUserData,
  clearAllStorage,
  isUserLoggedIn,
  printAllStorage,
  
  // Constants
  STORAGE_KEYS,
};