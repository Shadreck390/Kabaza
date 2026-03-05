// src/store/sagas/notificationSaga.js - COMPLETE FIXED VERSION (CLEANED)
console.log('🔔 notificationSaga.js file is loading...');

import { call, put, takeLatest, all, fork, select, delay } from 'redux-saga/effects';
import { Platform } from 'react-native'; // Removed Alert, AppState since not used
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIXED: Use relative imports instead of aliases - only import what's actually used
import {
  requestNotificationPermission,
  getNotificationToken,
  saveNotificationToken,
  initializeNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  setNotificationSettings,
  enableRealTimeNotifications,
  disableRealTimeNotifications,
  notificationPermissionGranted,
  notificationPermissionDenied,
  notificationTokenReceived,
  notificationTokenError,
  notificationStatusUpdated,
  unreadCountUpdated,
  notificationsSynced,
  notificationSettingsUpdated,
  // Removed unused: newNotificationReceived, realTimeStatusChanged
} from '../slices/notificationSlice';

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

const PushNotification = safePushNotification;
const notifee = safeNotifee;

// Mock services
const NotificationService = {
  requestPermission: async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await notifee?.requestPermission({
          sound: true,
          alert: true,
          badge: true,
        });
        return {
          granted: authStatus?.authorizationStatus >= 2,
          status: authStatus?.authorizationStatus,
        };
      } else {
        const granted = await notifee?.requestPermission();
        return {
          granted: !!granted,
          status: granted ? 2 : 0,
        };
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return { granted: false, status: 0 };
    }
  },

  getToken: async () => {
    try {
      if (!notifee) {
        return 'mock-token-' + Date.now();
      }
      if (Platform.OS === 'android') {
        return await notifee.getDeviceToken();
      } else {
        return await notifee.getAPNSToken();
      }
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  },

  saveTokenToServer: async (userId, token, deviceInfo) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Token saved to server:', { userId, token });
        resolve({ success: true, token });
      }, 500);
    });
  },

  fetchNotifications: async (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            type: 'ride_request',
            title: 'New Ride Request',
            body: 'You have a new ride request',
            data: { rideId: '123' },
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'high',
          }
        ]);
      }, 1000);
    });
  },

  markAsReadOnServer: async (notificationIds) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 300);
    });
  },

  deleteOnServer: async (notificationId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 300);
    });
  },

  clearAllOnServer: async (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 300);
    });
  },

  updateSettingsOnServer: async (userId, settings) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, settings });
      }, 300);
    });
  },
};

// =====================
// FIXED: Safe AsyncStorage functions
// =====================

function* getSavedNotifications() {
  try {
    const data = yield call([AsyncStorage, 'getItem'], '@notifications');
    
    // FIXED: Handle all possible invalid values
    if (!data || data === 'null' || data === 'undefined' || data === '') {
      return [];
    }
    
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
    
  } catch (error) {
    console.error('Get saved notifications error:', error);
    return [];
  }
}

function* saveNotificationsLocally(notifications) {
  try {
    // FIXED: Ensure notifications is an array before saving
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    yield call([AsyncStorage, 'setItem'], '@notifications', JSON.stringify(safeNotifications));
  } catch (error) {
    console.error('Save notifications locally error:', error);
  }
}

function* saveNotificationLocally(notification) {
  try {
    const currentNotifications = yield call(getSavedNotifications);
    const updatedNotifications = [notification, ...currentNotifications];
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

// =====================
// Worker Sagas with proper error handling
// =====================

function* requestNotificationPermissionWorker() {
  try {
    yield put(requestNotificationPermission.pending());
    
    const permissionResult = yield call(NotificationService.requestPermission);
    
    if (permissionResult.granted) {
      yield put(notificationPermissionGranted(permissionResult));
      yield put(getNotificationToken());
    } else {
      yield put(notificationPermissionDenied(permissionResult));
    }
    yield put(requestNotificationPermission.fulfilled(permissionResult));
  } catch (error) {
    console.error('Permission request saga error:', error.message);
    yield put(requestNotificationPermission.rejected(error.message));
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
      };
      
      yield call(NotificationService.saveTokenToServer, user.id, token, deviceInfo);
      yield put(notificationTokenReceived({ token, deviceInfo }));
    }
    yield put(getNotificationToken.fulfilled({ token }));
  } catch (error) {
    yield put(notificationTokenError(error.message));
    yield put(getNotificationToken.rejected(error.message));
  }
}

function* initializeNotificationsWorker() {
  try {
    yield put(initializeNotifications.pending());
    
    // FIXED: Safe calls with null checks
    if (notifee && typeof notifee.getNotificationSettings === 'function') {
      const settings = yield call([notifee, 'getNotificationSettings']);
      
      if (settings?.authorizationStatus >= 2) {
        yield put(notificationPermissionGranted({ granted: true, status: settings.authorizationStatus }));
      }
    }
    
    // FIXED: Safe AsyncStorage call
    const savedNotifications = yield call(getSavedNotifications);
    if (savedNotifications.length > 0) {
      yield put(notificationsSynced(savedNotifications));
    }
    
    const user = yield select(state => state.auth?.user);
    if (user?.id) {
      yield put(getUnreadNotifications(user.id));
    }
    
    yield put(initializeNotifications.fulfilled());
  } catch (error) {
    console.error('Initialize notifications saga error:', error);
    yield put(initializeNotifications.rejected(error.message));
  }
}

function* getUnreadNotificationsWorker(action) {
  try {
    const userId = action.payload;
    yield put(getUnreadNotifications.pending());
    
    // FIXED: Handle null response
    let notifications = yield call(NotificationService.fetchNotifications, userId);
    
    // FIXED: Ensure notifications is an array
    if (!notifications || !Array.isArray(notifications)) {
      notifications = [];
    }
    
    yield call(saveNotificationsLocally, notifications);
    
    const unreadCount = notifications.filter(n => n && !n.read).length;
    
    yield put(notificationsSynced(notifications));
    yield put(unreadCountUpdated(unreadCount));
    yield put(getUnreadNotifications.fulfilled(notifications));
  } catch (error) {
    console.error('Get notifications saga error:', error);
    yield put(getUnreadNotifications.rejected(error.message));
  }
}

function* markAsReadWorker(action) {
  try {
    const { notificationIds, read } = action.payload;
    yield put(markAsRead.pending());
    
    yield call(NotificationService.markAsReadOnServer, notificationIds);
    yield call(updateNotificationsLocally, notificationIds, { read });
    yield put(notificationStatusUpdated({ notificationIds, read }));
    
    const notifications = yield select(state => state.notification?.notifications || []);
    const unreadCount = notifications.filter(n => !n.read).length;
    yield put(unreadCountUpdated(unreadCount));
    
    yield put(markAsRead.fulfilled({ notificationIds, read }));
  } catch (error) {
    yield put(markAsRead.rejected(error.message));
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
  }
}

function* deleteNotificationWorker(action) {
  try {
    const notificationId = action.payload;
    yield put(deleteNotification.pending());
    
    yield call(NotificationService.deleteOnServer, notificationId);
    yield call(deleteNotificationLocally, notificationId);
    
    const notifications = yield select(state => state.notification?.notifications || []);
    const unreadCount = notifications.filter(n => !n.read).length;
    yield put(unreadCountUpdated(unreadCount));
    yield put(deleteNotification.fulfilled(notificationId));
  } catch (error) {
    yield put(deleteNotification.rejected(error.message));
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
    
    yield put(notificationSettingsUpdated(settings));
    yield put(setNotificationSettings.fulfilled(settings));
  } catch (error) {
    yield put(setNotificationSettings.rejected(error.message));
  }
}

// =====================
// FIXED: Safe watcher functions with error handling
// =====================

function* safeTakeLatest(pattern, saga, ...args) {
  try {
    yield takeLatest(pattern, saga, ...args);
  } catch (error) {
    console.error(`Error setting up watcher for ${pattern}:`, error.message);
  }
}

// =====================
// Root saga with individual error handling for each watcher
// =====================

export default function* notificationSaga() {
  console.log('🔔 Starting notification saga (fixed version)...');
  
  try {
    // Fork each watcher individually with try-catch
    const watchers = [
      { pattern: requestNotificationPermission?.pending, saga: requestNotificationPermissionWorker },
      { pattern: getNotificationToken?.pending, saga: getNotificationTokenWorker },
      { pattern: saveNotificationToken?.pending, saga: function*() {} },
      { pattern: initializeNotifications?.pending, saga: initializeNotificationsWorker },
      { pattern: getUnreadNotifications?.pending, saga: getUnreadNotificationsWorker },
      { pattern: markAsRead?.pending, saga: markAsReadWorker },
      { pattern: markAllAsRead?.pending, saga: markAllAsReadWorker },
      { pattern: deleteNotification?.pending, saga: deleteNotificationWorker },
      { pattern: clearAllNotifications?.pending, saga: clearAllNotificationsWorker },
      { pattern: setNotificationSettings?.pending, saga: setNotificationSettingsWorker },
      { pattern: enableRealTimeNotifications?.pending, saga: function*() {} },
      { pattern: disableRealTimeNotifications?.pending, saga: function*() {} },
    ];

    for (const watcher of watchers) {
      if (watcher.pattern) { // Only fork if pattern exists
        try {
          yield fork(function* () {
            yield safeTakeLatest(watcher.pattern, watcher.saga);
          });
        } catch (error) {
          console.error(`Failed to fork watcher for ${watcher.pattern}:`, error.message);
        }
      }
    }
    
    console.log('✅ Notification saga started successfully');
  } catch (error) {
    console.error('❌ Notification saga initialization failed:', error.message);
    // Don't throw - let other sagas continue
  }
}