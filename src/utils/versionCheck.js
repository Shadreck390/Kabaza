// src/utils/versionCheck.js
import { Platform, Linking, Alert } from 'react-native';
import VersionCheck from 'react-native-version-check';

export const checkAppVersion = async () => {
  try {
    // Get current app version
    const currentVersion = VersionCheck.getCurrentVersion();
    
    // Get latest version from app stores
    const latestVersion = await VersionCheck.getLatestVersion();
    
    // Compare versions
    const needsUpdate = VersionCheck.needUpdate({
      currentVersion,
      latestVersion,
    });
    
    return {
      currentVersion,
      latestVersion,
      needsUpdate: needsUpdate.isNeeded,
      updateType: needsUpdate.isNeeded ? needsUpdate.currentVersion : null,
    };
  } catch (error) {
    console.error('Error checking app version:', error);
    return {
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      needsUpdate: false,
      updateType: null,
    };
  }
};

export const showUpdateAlert = (needsUpdate, storeUrl) => {
  if (needsUpdate) {
    Alert.alert(
      'Update Available',
      'A new version of Kabaza is available. Please update to continue.',
      [
        { text: 'Update Now', onPress: () => Linking.openURL(storeUrl) },
        { text: 'Later', style: 'cancel' },
      ],
      { cancelable: false }
    );
  }
};

export const getStoreUrl = () => {
  if (Platform.OS === 'ios') {
    return 'https://apps.apple.com/app/kabaza/id123456789';
  } else {
    return 'https://play.google.com/store/apps/details?id=com.kabaza.app';
  }
};

export const checkMandatoryUpdate = async () => {
  try {
    // This would typically check with your backend API
    // For now, return mock data
    return {
      mandatory: false,
      minimumVersion: '1.0.0',
      message: 'Update required for new features',
    };
  } catch (error) {
    console.error('Error checking mandatory update:', error);
    return {
      mandatory: false,
      minimumVersion: '1.0.0',
      message: '',
    };
  }
};

export default {
  checkAppVersion,
  showUpdateAlert,
  getStoreUrl,
  checkMandatoryUpdate,
};