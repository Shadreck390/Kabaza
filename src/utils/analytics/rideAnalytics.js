// src/utils/permissions.js
import { Platform, PermissionsAndroid } from 'react-native';
import { PERMISSIONS, request, check, RESULTS } from 'react-native-permissions';

export const checkPermissions = async () => {
  const permissions = {
    location: false,
    camera: false,
    notifications: false,
  };

  try {
    if (Platform.OS === 'android') {
      // Check location permission for Android
      const locationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      permissions.location = locationGranted;

      // Check camera permission
      const cameraGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      permissions.camera = cameraGranted;

    } else if (Platform.OS === 'ios') {
      // Check iOS permissions
      const locationStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      permissions.location = locationStatus === RESULTS.GRANTED;

      const cameraStatus = await check(PERMISSIONS.IOS.CAMERA);
      permissions.camera = cameraStatus === RESULTS.GRANTED;
    }

    // Notifications permission check would require additional setup
    permissions.notifications = true; // Placeholder

    return permissions;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return permissions;
  }
};

export const requestPermissions = async () => {
  const results = {
    location: false,
    camera: false,
    notifications: false,
  };

  try {
    if (Platform.OS === 'android') {
      // Request location permission
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Kabaza needs access to your location to find rides and navigate.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      results.location = locationGranted === PermissionsAndroid.RESULTS.GRANTED;

      // Request camera permission
      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Kabaza needs access to your camera for profile pictures and verification.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      results.camera = cameraGranted === PermissionsAndroid.RESULTS.GRANTED;

    } else if (Platform.OS === 'ios') {
      // Request iOS permissions
      const locationStatus = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      results.location = locationStatus === RESULTS.GRANTED;

      const cameraStatus = await request(PERMISSIONS.IOS.CAMERA);
      results.camera = cameraStatus === RESULTS.GRANTED;
    }

    // Request notification permission (placeholder)
    results.notifications = true;

    return results;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return results;
  }
};

export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Kabaza needs access to your location to provide ride services.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else if (Platform.OS === 'ios') {
      const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return status === RESULTS.GRANTED;
    }
    return false;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const requestBackgroundLocationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 29) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location',
          message: 'Kabaza needs background location to track rides when the app is in background.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting background location:', error);
      return false;
    }
  }
  return true; // iOS handles this differently
};

export const hasRequiredPermissions = async () => {
  const permissions = await checkPermissions();
  return permissions.location && permissions.camera;
};

export const showPermissionInstructions = (permissionType) => {
  let message = '';
  let settingsAction = '';

  switch (permissionType) {
    case 'location':
      message = 'Location permission is required to find rides and navigate.';
      settingsAction = 'location';
      break;
    case 'camera':
      message = 'Camera permission is required for profile pictures and verification.';
      settingsAction = 'camera';
      break;
    case 'notifications':
      message = 'Notification permission is required to receive ride updates.';
      settingsAction = 'notifications';
      break;
    default:
      message = 'Some permissions are required for the app to function properly.';
      settingsAction = '';
  }

  return {
    message,
    settingsAction,
    instruction: Platform.OS === 'ios' 
      ? 'Please enable in Settings > Kabaza'
      : 'Please enable in App Settings',
  };
};