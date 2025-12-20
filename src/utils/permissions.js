// src/utils/permissions.js

/**
 * Permission checking and requesting utilities
 */

import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Platform-specific permissions
const PERMISSION_TYPES = {
  LOCATION: Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }),
  CAMERA: Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  }),
  PHOTO_LIBRARY: Platform.select({
    ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
    android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
  }),
  NOTIFICATIONS: Platform.select({
    ios: PERMISSIONS.IOS.NOTIFICATIONS,
    android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
  }),
  CONTACTS: Platform.select({
    ios: PERMISSIONS.IOS.CONTACTS,
    android: PERMISSIONS.ANDROID.READ_CONTACTS,
  }),
};

/**
 * Check a single permission
 * @param {string} permissionType - Type of permission (LOCATION, CAMERA, etc.)
 * @returns {Promise<string>} Permission result
 */
export const checkPermission = async (permissionType) => {
  try {
    const permission = PERMISSION_TYPES[permissionType];
    if (!permission) {
      console.warn(`Permission type "${permissionType}" not defined for platform`);
      return RESULTS.DENIED;
    }
    
    const result = await check(permission);
    console.log(`Permission ${permissionType}: ${result}`);
    return result;
  } catch (error) {
    console.error(`Error checking ${permissionType} permission:`, error);
    return RESULTS.DENIED;
  }
};

/**
 * Request a single permission
 * @param {string} permissionType - Type of permission
 * @returns {Promise<string>} Permission result after request
 */
export const requestPermission = async (permissionType) => {
  try {
    const permission = PERMISSION_TYPES[permissionType];
    if (!permission) {
      console.warn(`Permission type "${permissionType}" not defined for platform`);
      return RESULTS.DENIED;
    }
    
    const result = await request(permission);
    console.log(`Requested ${permissionType}: ${result}`);
    return result;
  } catch (error) {
    console.error(`Error requesting ${permissionType} permission:`, error);
    return RESULTS.DENIED;
  }
};

/**
 * Check and request permission if needed
 * @param {string} permissionType - Type of permission
 * @param {boolean} showAlert - Whether to show alert if denied
 * @returns {Promise<boolean>} Whether permission is granted
 */
export const ensurePermission = async (permissionType, showAlert = true) => {
  try {
    // First check current permission status
    const status = await checkPermission(permissionType);
    
    switch (status) {
      case RESULTS.GRANTED:
        return true;
        
      case RESULTS.DENIED:
        // Request permission
        const requestedStatus = await requestPermission(permissionType);
        return requestedStatus === RESULTS.GRANTED;
        
      case RESULTS.BLOCKED:
        if (showAlert) {
          showPermissionAlert(permissionType);
        }
        return false;
        
      case RESULTS.UNAVAILABLE:
        console.warn(`Permission ${permissionType} is unavailable on this device`);
        return false;
        
      case RESULTS.LIMITED:
        console.log(`Permission ${permissionType} is limited`);
        return true;
        
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error ensuring ${permissionType} permission:`, error);
    return false;
  }
};

/**
 * Show alert to guide user to app settings
 * @param {string} permissionType - Type of permission
 */
export const showPermissionAlert = (permissionType) => {
  const permissionNames = {
    LOCATION: 'Location',
    CAMERA: 'Camera',
    PHOTO_LIBRARY: 'Photo Library',
    NOTIFICATIONS: 'Notifications',
    CONTACTS: 'Contacts',
  };
  
  const name = permissionNames[permissionType] || permissionType;
  
  Alert.alert(
    `${name} Permission Required`,
    `Please enable ${name} permission in your device settings to use this feature.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Open Settings', 
        onPress: () => Linking.openSettings() 
      }
    ]
  );
};

/**
 * Check location permission (most critical for ride-hailing app)
 * @returns {Promise<boolean>} Whether location permission is granted
 */
export const checkLocationPermission = async () => {
  return await ensurePermission('LOCATION', true);
};

/**
 * Check camera permission (for profile photos, document uploads)
 * @returns {Promise<boolean>} Whether camera permission is granted
 */
export const checkCameraPermission = async () => {
  return await ensurePermission('CAMERA', false);
};

/**
 * Check photo library permission (for profile photos)
 * @returns {Promise<boolean>} Whether photo library permission is granted
 */
export const checkPhotoLibraryPermission = async () => {
  return await ensurePermission('PHOTO_LIBRARY', false);
};

/**
 * Check notification permission
 * @returns {Promise<boolean>} Whether notification permission is granted
 */
export const checkNotificationPermission = async () => {
  return await ensurePermission('NOTIFICATIONS', false);
};

/**
 * Check all required permissions for rider
 * @returns {Promise<Object>} Object with permission status for each type
 */
export const checkRiderPermissions = async () => {
  const [location, notifications] = await Promise.all([
    checkLocationPermission(),
    checkNotificationPermission(),
  ]);
  
  return {
    location,
    notifications,
    allGranted: location && notifications,
  };
};

/**
 * Check all required permissions for driver
 * @returns {Promise<Object>} Object with permission status for each type
 */
export const checkDriverPermissions = async () => {
  const [location, camera, photoLibrary, notifications] = await Promise.all([
    checkLocationPermission(),
    checkCameraPermission(),
    checkPhotoLibraryPermission(),
    checkNotificationPermission(),
  ]);
  
  return {
    location,
    camera,
    photoLibrary,
    notifications,
    allGranted: location && camera && photoLibrary && notifications,
  };
};

/**
 * Get permission status for all permissions
 * @returns {Promise<Object>} Status of all permissions
 */
export const getAllPermissionStatus = async () => {
  const permissions = {};
  
  for (const [key, permission] of Object.entries(PERMISSION_TYPES)) {
    if (permission) {
      try {
        permissions[key] = await check(permission);
      } catch (error) {
        permissions[key] = RESULTS.DENIED;
      }
    }
  }
  
  return permissions;
};

/**
 * Check if any permission is blocked (requires settings change)
 * @returns {Promise<boolean>} Whether any permission is blocked
 */
export const hasBlockedPermissions = async () => {
  const status = await getAllPermissionStatus();
  
  return Object.values(status).some(result => result === RESULTS.BLOCKED);
};

/**
 * Get list of blocked permissions
 * @returns {Promise<Array>} List of blocked permission types
 */
export const getBlockedPermissions = async () => {
  const status = await getAllPermissionStatus();
  const blocked = [];
  
  for (const [key, result] of Object.entries(status)) {
    if (result === RESULTS.BLOCKED) {
      blocked.push(key);
    }
  }
  
  return blocked;
};

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS = {
  LOCATION: {
    title: 'Location Access',
    description: 'Required to find nearby drivers, track your ride, and provide accurate ETAs.',
    required: true,
    icon: '📍',
  },
  CAMERA: {
    title: 'Camera Access',
    description: 'Required to take profile photos and upload vehicle/driver documents.',
    required: true,
    icon: '📷',
  },
  PHOTO_LIBRARY: {
    title: 'Photo Library Access',
    description: 'Required to select photos for your profile and documents.',
    required: true,
    icon: '🖼️',
  },
  NOTIFICATIONS: {
    title: 'Notifications',
    description: 'Get ride updates, driver alerts, and important announcements.',
    required: true,
    icon: '🔔',
  },
  CONTACTS: {
    title: 'Contacts Access',
    description: 'Optional: Share ride details with friends or add emergency contacts.',
    required: false,
    icon: '👥',
  },
};

export default {
  checkPermission,
  requestPermission,
  ensurePermission,
  showPermissionAlert,
  checkLocationPermission,
  checkCameraPermission,
  checkPhotoLibraryPermission,
  checkNotificationPermission,
  checkRiderPermissions,
  checkDriverPermissions,
  getAllPermissionStatus,
  hasBlockedPermissions,
  getBlockedPermissions,
  PERMISSION_DESCRIPTIONS,
};