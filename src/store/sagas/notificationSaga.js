// src/store/sagas/notificationSaga.js
console.log('🔔 notificationSaga.js file is loading...');
import { call, put, takeLatest, takeEvery, all, fork, select, delay, race, take } from 'redux-saga/effects';
import { Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import PushNotification from 'react-native-push-notification';
//import notifee from '@notifee/react-native';

// Import your notification slice actions
import {
  requestNotificationPermission,
  getNotificationToken,
  saveNotificationToken,
  receiveNotification,
  updateNotificationStatus,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  initializeNotifications,
  setNotificationSettings,
  enableRealTimeNotifications,
  disableRealTimeNotifications,
  notificationPermissionGranted,
  notificationPermissionDenied,
  notificationTokenReceived,
  notificationTokenError,
  newNotificationReceived,
  notificationStatusUpdated,
  unreadCountUpdated,
  notificationsSynced,
  notificationSettingsUpdated,
  realTimeStatusChanged
} from '@store/slices/notificationSlice';

// Import socket service for real-time notifications
import socketService from '@services/socket/socketService';
import permissions from '@src/utils/permissions';
import { channel } from 'redux-saga';

// Safe library imports
let safePushNotification;
let safeNotifee;

try {
  safePushNotification = require('react-native-push-notification');
  console.log('✅ PushNotification library loaded');
} catch (error) {
  console.warn('⚠️ PushNotification library not available:', error.message);
  safePushNotification = null;
}

try {
  safeNotifee = require('@notifee/react-native');
  console.log('✅ Notifee library loaded');
} catch (error) {
  console.warn('⚠️ Notifee library not available:', error.message);
  safeNotifee = null;
}

// Update references in your code
const PushNotification = safePushNotification;
const notifee = safeNotifee;

// Mock services - replace with actual implementations
const NotificationService = {
  requestPermission: async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS permission request
        const authStatus = await notifee.requestPermission({
          sound: true,
          alert: true,
          badge: true,
          criticalAlert: true,
          provisional: false,
        });
        
        return {
          granted: authStatus.authorizationStatus >= 2,
          status: authStatus.authorizationStatus,
        };
      } else {
        // Android permission request
        const granted = await notifee.requestPermission();
        return {
          granted,
          status: granted ? 2 : 0,
        };
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return { granted: false, status: 0, error: error.message };
    }
  },

  getToken: async () => {
    try {
      if (!notifee) {
        console.warn('⚠️ Notifee not available, returning mock token');
        return 'mock-token-' + Date.now();
      }

      // For Firebase Cloud Messaging (FCM)
      if (Platform.OS === 'android') {
        // Get FCM token
        const token = await notifee.getDeviceToken();
        return token;
      } else if (Platform.OS === 'ios') {
        // Get APNs token
        const token = await notifee.getAPNSToken();
        return token;
      }
      return null;
    } catch (error) {
      console.error('Get token error:', error);
      throw error;
    }
  },

  saveTokenToServer: async (userId, token, deviceInfo) => {
    // Replace with actual API call to your backend
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Token saved to server:', { userId, token });
        resolve({ success: true, token });
      }, 500);
    });
  },

  fetchNotifications: async (userId, lastSync = null) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const notifications = [
          {
            id: '1',
            type: 'ride_request',
            title: 'New Ride Request',
            body: 'You have a new ride request from John Doe',
            data: { rideId: '123', passengerId: '456' },
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'high',
          },
          {
            id: '2',
            type: 'ride_accepted',
            title: 'Ride Accepted',
            body: 'Your ride has been accepted by driver Michael',
            data: { rideId: '123', driverId: '789' },
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: true,
            priority: 'normal',
          },
        ];
        resolve(notifications);
      }, 1000);
    });
  },

  markAsReadOnServer: async (notificationIds) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Notifications marked as read:', notificationIds);
        resolve({ success: true });
      }, 300);
    });
  },

  deleteOnServer: async (notificationId) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Notification deleted:', notificationId);
        resolve({ success: true });
      }, 300);
    });
  },

  clearAllOnServer: async (userId) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('All notifications cleared for user:', userId);
        resolve({ success: true });
      }, 300);
    });
  },

  updateSettingsOnServer: async (userId, settings) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Settings updated:', { userId, settings });
        resolve({ success: true, settings });
      }, 300);
    });
  },
};

// Worker Sagas - Update requestNotificationPermissionWorker
function* requestNotificationPermissionWorker() {
  try {
    console.log('🔔 Starting notification permission request...');
    
    // ✅ CHECK: Skip if Firebase is not initialized
    const firebaseReady = yield call(checkFirebaseReady);
    if (!firebaseReady) {
      console.log('⚠️ Skipping notification permission - Firebase not ready');
      yield put(requestNotificationPermission.fulfilled({
        granted: false,
        status: 0,
        reason: 'Firebase not initialized'
      }));
      return;
    }
    
    yield put(requestNotificationPermission.pending());
    
    const permissionResult = yield call(NotificationService.requestPermission);
    
    if (permissionResult.granted) {
      yield put(notificationPermissionGranted(permissionResult));
      
      // Get token after permission granted
      yield put(getNotificationToken());
      
      // Configure local notifications
      yield call(configureLocalNotifications);
      
    } else {
      yield put(notificationPermissionDenied(permissionResult));
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in settings to receive ride updates.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('❌ Permission request saga error:', error.message);
    yield put(requestNotificationPermission.rejected(error.message));
  }
}

// Add this helper function
function* checkFirebaseReady() {
  try {
    // Check if Firebase is available
    const firebase = require('@react-native-firebase/app');
    return !!firebase.apps?.length;
  } catch (error) {
    console.log('Firebase check failed:', error.message);
    return false;
  }
}

function* getNotificationTokenWorker() {
  try {
    yield put(getNotificationToken.pending());
    
    const token = yield call(NotificationService.getToken);
    const user = yield select(state => state.auth?.user);
    
    if (token && user?.id) {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        model: Platform.constants?.Model || 'Unknown',
        appVersion: '1.0.0',
      };
      
      // Save token to server
      yield call(NotificationService.saveTokenToServer, user.id, token, deviceInfo);
      
      // Save token locally
      yield call(saveTokenLocally, token);
      
      yield put(notificationTokenReceived({ token, deviceInfo }));
    } else {
      throw new Error('No user or token available');
    }
  } catch (error) {
    yield put(notificationTokenError(error.message));
    console.error('Get token saga error:', error);
  }
}

function* saveNotificationTokenWorker(action) {
  try {
    const { userId, token, deviceInfo } = action.payload;
    
    yield call(NotificationService.saveTokenToServer, userId, token, deviceInfo);
    yield call(saveTokenLocally, token);
    
    yield put(saveNotificationToken.fulfilled({ token }));
  } catch (error) {
    yield put(saveNotificationToken.rejected(error.message));
    console.error('Save token saga error:', error);
  }
}

function* initializeNotificationsWorker() {
  try {
    yield put(initializeNotifications.pending());
    
    // Check existing permission
    const settings = yield call([notifee, 'getNotificationSettings']);
    
    if (settings.authorizationStatus >= 2) {
      yield put(notificationPermissionGranted({ granted: true, status: settings.authorizationStatus }));
      
      // Get existing token
      const savedToken = yield call(getSavedToken);
      if (savedToken) {
        yield put(notificationTokenReceived({ token: savedToken }));
      }
      
      // Configure local notifications
      yield call(configureLocalNotifications);
      
      // Load saved notifications from local storage
      const savedNotifications = yield call(getSavedNotifications);
      if (savedNotifications && savedNotifications.length > 0) {
        yield put(notificationsSynced(savedNotifications));
      }
      
      // Fetch from server
      const user = yield select(state => state.auth?.user);
      if (user?.id) {
        yield put(getUnreadNotifications(user.id));
      }
      
      // Initialize real-time notifications if enabled
      const notificationSettings = yield call(getNotificationSettings);
      if (notificationSettings?.realTimeEnabled) {
        yield put(enableRealTimeNotifications());
      }
    }
    
    yield put(initializeNotifications.fulfilled());
  } catch (error) {
    yield put(initializeNotifications.rejected(error.message));
    console.error('Initialize notifications saga error:', error);
  }
}

function* getUnreadNotificationsWorker(action) {
  try {
    const userId = action.payload;
    yield put(getUnreadNotifications.pending());
    
    const notifications = yield call(NotificationService.fetchNotifications, userId);
    
    // Save to local storage
    yield call(saveNotificationsLocally, notifications);
    
    // Calculate unread count
    const unreadCount = notifications.filter(n => !n.read).length;
    
    yield put(notificationsSynced(notifications));
    yield put(unreadCountUpdated(unreadCount));
    yield put(getUnreadNotifications.fulfilled(notifications));
  } catch (error) {
    yield put(getUnreadNotifications.rejected(error.message));
    console.error('Get notifications saga error:', error);
  }
}

function* markAsReadWorker(action) {
  try {
    const { notificationIds, read } = action.payload;
    yield put(markAsRead.pending());
    
    // Update on server
    yield call(NotificationService.markAsReadOnServer, notificationIds);
    
    // Update locally
    yield call(updateNotificationsLocally, notificationIds, { read });
    
    // Update Redux state
    yield put(notificationStatusUpdated({ notificationIds, read }));
    
    // Recalculate unread count
    const notifications = yield select(state => state.notification?.notifications || []);
    const unreadCount = notifications.filter(n => !n.read).length;
    yield put(unreadCountUpdated(unreadCount));
    
    yield put(markAsRead.fulfilled({ notificationIds, read }));
  } catch (error) {
    yield put(markAsRead.rejected(error.message));
    console.error('Mark as read saga error:', error);
  }
}

function* markAllAsReadWorker() {
  try {
    yield put(markAllAsRead.pending());
    
    const notifications = yield select(state => state.notification?.notifications || []);
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    
    if (unreadIds.length > 0) {
      yield call(NotificationService.markAsReadOnServer, unreadIds);
      yield call(updateNotificationsLocally, unreadIds, { read: true });
      
      yield put(notificationStatusUpdated({ notificationIds: unreadIds, read: true }));
      yield put(unreadCountUpdated(0));
    }
    
    yield put(markAllAsRead.fulfilled());
  } catch (error) {
    yield put(markAllAsRead.rejected(error.message));
    console.error('Mark all as read saga error:', error);
  }
}

function* deleteNotificationWorker(action) {
  try {
    const notificationId = action.payload;
    yield put(deleteNotification.pending());
    
    yield call(NotificationService.deleteOnServer, notificationId);
    yield call(deleteNotificationLocally, notificationId);
    
    // Update unread count
    const notifications = yield select(state => state.notification?.notifications || []);
    const unreadCount = notifications.filter(n => !n.read).length;
    yield put(unreadCountUpdated(unreadCount));
    
    yield put(deleteNotification.fulfilled(notificationId));
  } catch (error) {
    yield put(deleteNotification.rejected(error.message));
    console.error('Delete notification saga error:', error);
  }
}

function* clearAllNotificationsWorker() {
  try {
    yield put(clearAllNotifications.pending());
    
    const user = yield select(state => state.auth?.user);
    if (user?.id) {
      yield call(NotificationService.clearAllOnServer, user.id);
    }
    
    yield call(clearNotificationsLocally);
    yield put(notificationsSynced([]));
    yield put(unreadCountUpdated(0));
    
    yield put(clearAllNotifications.fulfilled());
  } catch (error) {
    yield put(clearAllNotifications.rejected(error.message));
    console.error('Clear all notifications saga error:', error);
  }
}

function* setNotificationSettingsWorker(action) {
  try {
    const settings = action.payload;
    yield put(setNotificationSettings.pending());
    
    const user = yield select(state => state.auth?.user);
    if (user?.id) {
      yield call(NotificationService.updateSettingsOnServer, user.id, settings);
    }
    
    yield call(saveNotificationSettingsLocally, settings);
    yield put(notificationSettingsUpdated(settings));
    
    // Handle real-time notifications based on settings
    if (settings.realTimeEnabled) {
      yield put(enableRealTimeNotifications());
    } else {
      yield put(disableRealTimeNotifications());
    }
    
    yield put(setNotificationSettings.fulfilled(settings));
  } catch (error) {
    yield put(setNotificationSettings.rejected(error.message));
    console.error('Set settings saga error:', error);
  }
}

function* enableRealTimeNotificationsWorker() {
  try {
    yield put(enableRealTimeNotifications.pending());
    
    // Connect to socket for real-time notifications
    if (!socketService.isConnected?.()) {
      yield call([socketService, 'initialize']);
    }
    
    // Setup notification listeners
    yield call(setupRealTimeNotificationListeners);
    
    yield put(realTimeStatusChanged(true));
    yield put(enableRealTimeNotifications.fulfilled());
    
    console.log('Real-time notifications enabled');
  } catch (error) {
    yield put(enableRealTimeNotifications.rejected(error.message));
    console.error('Enable real-time notifications saga error:', error);
  }
}

function* disableRealTimeNotificationsWorker() {
  try {
    yield put(disableRealTimeNotifications.pending());
    
    // Remove notification listeners
    yield call(removeRealTimeNotificationListeners);
    
    yield put(realTimeStatusChanged(false));
    yield put(disableRealTimeNotifications.fulfilled());
    
    console.log('Real-time notifications disabled');
  } catch (error) {
    yield put(disableRealTimeNotifications.rejected(error.message));
    console.error('Disable real-time notifications saga error:', error);
  }
}

// Real-time notification handlers
function* setupRealTimeNotificationListeners() {
  // Listen for real-time notifications from socket
  socketService.on('new_notification', handleNewNotification);
  socketService.on('notification_update', handleNotificationUpdate);
  socketService.on('unread_count_update', handleUnreadCountUpdate);
}

function* removeRealTimeNotificationListeners() {
  socketService.off('new_notification', handleNewNotification);
  socketService.off('notification_update', handleNotificationUpdate);
  socketService.off('unread_count_update', handleUnreadCountUpdate);
}

function* handleNewNotification(notificationData) {
  try {
    console.log('New real-time notification:', notificationData);
    
    // Format notification
    const notification = {
      id: notificationData.id || `notification_${Date.now()}`,
      type: notificationData.type || 'general',
      title: notificationData.title || 'New Notification',
      body: notificationData.message || notificationData.body || '',
      data: notificationData.data || {},
      timestamp: notificationData.timestamp || new Date().toISOString(),
      read: false,
      priority: notificationData.priority || 'normal',
    };
    
    // Save locally
    yield call(saveNotificationLocally, notification);
    
    // Update Redux state
    yield put(newNotificationReceived(notification));
    
    // Update unread count
    const notifications = yield select(state => state.notification?.notifications || []);
    const unreadCount = notifications.filter(n => !n.read).length;
    yield put(unreadCountUpdated(unreadCount));
    
    // Show local notification if app is in background
    const appState = yield select(state => state.app?.appState);
    if (appState !== 'active') {
      yield call(showLocalNotification, notification);
    }
  } catch (error) {
    console.error('Handle new notification error:', error);
  }
}

function* handleNotificationUpdate(updateData) {
  try {
    console.log('Notification update:', updateData);
    
    const { notificationId, updates } = updateData;
    
    // Update locally
    yield call(updateNotificationLocally, notificationId, updates);
    
    // Update Redux state
    yield put(notificationStatusUpdated({ notificationIds: [notificationId], ...updates }));
    
    // Update unread count if read status changed
    if (updates.read !== undefined) {
      const notifications = yield select(state => state.notification?.notifications || []);
      const unreadCount = notifications.filter(n => !n.read).length;
      yield put(unreadCountUpdated(unreadCount));
    }
  } catch (error) {
    console.error('Handle notification update error:', error);
  }
}

function* handleUnreadCountUpdate(countData) {
  try {
    console.log('Unread count update:', countData);
    yield put(unreadCountUpdated(countData.count));
  } catch (error) {
    console.error('Handle unread count update error:', error);
  }
}

// Local storage helpers
function* saveTokenLocally(token) {
  try {
    yield call([AsyncStorage, 'setItem'], '@notification_token', token);
  } catch (error) {
    console.error('Save token locally error:', error);
  }
}

function* getSavedToken() {
  try {
    return yield call([AsyncStorage, 'getItem'], '@notification_token');
  } catch (error) {
    console.error('Get saved token error:', error);
    return null;
  }
}

function* saveNotificationsLocally(notifications) {
  try {
    yield call([AsyncStorage, 'setItem'], '@notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Save notifications locally error:', error);
  }
}

function* getSavedNotifications() {
  try {
    const data = yield call([AsyncStorage, 'getItem'], '@notifications');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Get saved notifications error:', error);
    return [];
  }
}

function* saveNotificationLocally(notification) {
  try {
    const currentNotifications = yield call(getSavedNotifications);
    const updatedNotifications = [notification, ...currentNotifications];
    
    // Keep only last 100 notifications
    const trimmedNotifications = updatedNotifications.slice(0, 100);
    
    yield call([AsyncStorage, 'setItem'], '@notifications', JSON.stringify(trimmedNotifications));
  } catch (error) {
    console.error('Save notification locally error:', error);
  }
}

function* updateNotificationsLocally(notificationIds, updates) {
  try {
    const notifications = yield call(getSavedNotifications);
    const updatedNotifications = notifications.map(notification => {
      if (notificationIds.includes(notification.id)) {
        return { ...notification, ...updates };
      }
      return notification;
    });
    
    yield call([AsyncStorage, 'setItem'], '@notifications', JSON.stringify(updatedNotifications));
  } catch (error) {
    console.error('Update notifications locally error:', error);
  }
}

function* updateNotificationLocally(notificationId, updates) {
  yield call(updateNotificationsLocally, [notificationId], updates);
}

function* deleteNotificationLocally(notificationId) {
  try {
    const notifications = yield call(getSavedNotifications);
    const filteredNotifications = notifications.filter(n => n.id !== notificationId);
    yield call([AsyncStorage, 'setItem'], '@notifications', JSON.stringify(filteredNotifications));
  } catch (error) {
    console.error('Delete notification locally error:', error);
  }
}

function* clearNotificationsLocally() {
  try {
    yield call([AsyncStorage, 'removeItem'], '@notifications');
  } catch (error) {
    console.error('Clear notifications locally error:', error);
  }
}

function* saveNotificationSettingsLocally(settings) {
  try {
    yield call([AsyncStorage, 'setItem'], '@notification_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Save notification settings error:', error);
  }
}

function* getNotificationSettings() {
  try {
    const data = yield call([AsyncStorage, 'getItem'], '@notification_settings');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Get notification settings error:', error);
    return null;
  }
}

// Local notification helpers
function* configureLocalNotifications() {
  try {
    console.log('🔧 Configuring local notifications...');
    
    // ✅ ADD NULL CHECK for PushNotification
    if (!PushNotification || typeof PushNotification.configure !== 'function') {
      console.warn('⚠️ PushNotification library not available, skipping configuration');
      return;
    }
    
    // Configure react-native-push-notification
    PushNotification.configure({
      onRegister: function(token) {
        console.log('Push notification token:', token);
      },
      onNotification: function(notification) {
        console.log('Notification received:', notification);
        // Handle notification when app is in foreground
        if (notification.userInteraction) {
          // Notification was tapped
          handleNotificationTap(notification);
        }
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
    
    // Create notification channels for Android
    if (Platform.OS === 'android' && PushNotification.createChannel) {
      PushNotification.createChannel(
        {
          channelId: 'kabaza-general',
          channelName: 'General Notifications',
          channelDescription: 'General notifications for Kabaza app',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
      
      PushNotification.createChannel(
        {
          channelId: 'kabaza-rides',
          channelName: 'Ride Notifications',
          channelDescription: 'Notifications for ride updates',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    } else if (Platform.OS === 'android') {
      console.warn('⚠️ PushNotification.createChannel not available');
    }
    
    console.log('✅ Local notifications configured');
    
  } catch (error) {
    console.error('❌ Configure local notifications error:', error.message);
    // Don't throw - just log and continue without notifications
  }
}

function* showLocalNotification(notification) {
  try {
    const channelId = notification.type.includes('ride') ? 'kabaza-rides' : 'kabaza-general';
    
    PushNotification.localNotification({
      channelId,
      title: notification.title,
      message: notification.body,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      data: notification.data,
      userInfo: { notificationId: notification.id },
    });
  } catch (error) {
    console.error('Show local notification error:', error);
  }
}

function* handleNotificationTap(notification) {
  try {
    const notificationId = notification.userInfo?.notificationId;
    
    if (notificationId) {
      // Mark as read
      yield put(markAsRead({ notificationIds: [notificationId], read: true }));
      
      // Navigate based on notification type
      const notificationData = yield select(state => 
        state.notification?.notifications?.find(n => n.id === notificationId)
      );
      
      if (notificationData) {
        yield call(handleNotificationNavigation, notificationData);
      }
    }
  } catch (error) {
    console.error('Handle notification tap error:', error);
  }
}

function* handleNotificationNavigation(notification) {
  // This function would handle navigation based on notification type
  // You'll need to implement this based on your navigation structure
  console.log('Navigate for notification:', notification);
  
  // Example navigation logic:
  switch (notification.type) {
    case 'ride_request':
      // Navigate to ride request screen
      break;
    case 'ride_accepted':
      // Navigate to ride details
      break;
    case 'payment_received':
      // Navigate to payment details
      break;
    default:
      // Navigate to notifications screen
      break;
  }
}

// Watcher Sagas
function* watchRequestNotificationPermission() {
  yield takeLatest(requestNotificationPermission.pending, requestNotificationPermissionWorker);
}

function* watchGetNotificationToken() {
  yield takeLatest(getNotificationToken.pending, getNotificationTokenWorker);
}

function* watchSaveNotificationToken() {
  yield takeLatest(saveNotificationToken.pending, saveNotificationTokenWorker);
}

function* watchInitializeNotifications() {
  yield takeLatest(initializeNotifications.pending, initializeNotificationsWorker);
}

function* watchGetUnreadNotifications() {
  yield takeLatest(getUnreadNotifications.pending, getUnreadNotificationsWorker);
}

function* watchMarkAsRead() {
  yield takeLatest(markAsRead.pending, markAsReadWorker);
}

function* watchMarkAllAsRead() {
  yield takeLatest(markAllAsRead.pending, markAllAsReadWorker);
}

function* watchDeleteNotification() {
  yield takeLatest(deleteNotification.pending, deleteNotificationWorker);
}

function* watchClearAllNotifications() {
  yield takeLatest(clearAllNotifications.pending, clearAllNotificationsWorker);
}

function* watchSetNotificationSettings() {
  yield takeLatest(setNotificationSettings.pending, setNotificationSettingsWorker);
}

function* watchEnableRealTimeNotifications() {
  yield takeLatest(enableRealTimeNotifications.pending, enableRealTimeNotificationsWorker);
}

function* watchDisableRealTimeNotifications() {
  yield takeLatest(disableRealTimeNotifications.pending, disableRealTimeNotificationsWorker);
}

// ======================
// APP STATE WATCHER - ADD THIS FUNCTION
// ======================

function* watchAppStateChanges() {
  console.log('👀 Setting up app state watcher...');
  
  try {
    // Create a channel to listen for app state changes
    const appStateChannel = yield call(channel);
    
    // Listen to app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Put the app state change into the channel
      appStateChannel.put({ type: 'APP_STATE_CHANGED', payload: nextAppState });
    });
    
    console.log('✅ App state watcher initialized');
    
    // Listen for app state changes
    while (true) {
      try {
        const { payload: nextAppState } = yield take(appStateChannel);
        
        // Get current state from Redux
        const currentState = yield select(state => state.app?.appState);
        console.log(`📱 App State: ${currentState} → ${nextAppState}`);
        
        // Handle state changes
        if (nextAppState === 'active') {
          // App came to foreground
          console.log('🔄 App is active, checking for notifications...');
          
          // Refresh notifications when app becomes active
          const user = yield select(state => state.auth?.user);
          if (user?.id) {
            yield put(getUnreadNotifications(user.id));
          }
        } else if (nextAppState === 'background') {
          // App went to background
          console.log('💤 App is in background');
          
          // You can pause real-time updates or adjust frequency here
        }
        
      } catch (error) {
        console.error('❌ Error in app state watcher:', error);
      }
    }
  } catch (error) {
    console.error('❌ Failed to setup app state watcher:', error);
  }
}

// ======================
// ALTERNATIVE: Simple version if you don't need complex logic
// ======================

/*
function* watchAppStateChanges() {
  console.log('✅ App state watching enabled (simple mode)');
  
  // Just log state changes without complex logic
  AppState.addEventListener('change', (nextAppState) => {
    console.log(`📱 App state changed to: ${nextAppState}`);
  });
  
  // Keep the saga alive
  while (true) {
    yield delay(60000); // Check every minute
  }
}
*/

// ======================
// ALTERNATIVE 2: If you want to disable it temporarily
// ======================

/*
// In the root saga, comment out the fork:
yield all([
  // ... other forks
  
  // Temporarily disable:
  // fork(watchAppStateChanges),
]);
*/

// Root notification saga - WITH SAFE WRAPPER
export default function* notificationSaga() {
  try {
    console.log('🔔 Starting notification saga...');
    
    // Check if required libraries are available
    if (!PushNotification || !notifee) {
      console.warn('⚠️ Notification libraries not available, skipping notification saga');
      return;
    }
    
    yield all([
      fork(watchRequestNotificationPermission),
      fork(watchGetNotificationToken),
      fork(watchSaveNotificationToken),
      fork(watchInitializeNotifications),
      fork(watchGetUnreadNotifications),
      fork(watchMarkAsRead),
      fork(watchMarkAllAsRead),
      fork(watchDeleteNotification),
      fork(watchClearAllNotifications),
      fork(watchSetNotificationSettings),
      fork(watchEnableRealTimeNotifications),
      fork(watchDisableRealTimeNotifications),
      
      // Start listening for app state changes
      fork(watchAppStateChanges),
    ]);
    
    console.log('✅ Notification saga started successfully');
  } catch (error) {
    console.error('❌ Notification saga initialization failed:', error.message);
    // Don't throw - let other sagas continue
  }
}