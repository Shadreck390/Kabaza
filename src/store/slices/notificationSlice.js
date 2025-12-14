// src/store/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

// ====================
// INITIAL STATE
// ====================

const initialState = {
  // Notification permission
  permission: {
    granted: false,
    status: 'undetermined', // 'undetermined', 'granted', 'denied', 'blocked'
    canAskAgain: true,
    rationale: null,
  },
  
  // Notification settings
  settings: {
    enabled: true,
    sound: true,
    vibration: true,
    lights: true,
    badge: true,
    alert: true,
    priority: 'high', // 'min', 'low', 'default', 'high', 'max'
    visibility: 'public', // 'public', 'private', 'secret'
    importance: 'high', // 'none', 'min', 'low', 'default', 'high'
  },
  
  // Notification categories
  categories: {
    rideUpdates: true,
    messages: true,
    promotions: true,
    system: true,
    earnings: true,
    safety: true,
    reminders: true,
  },
  
  // Notification channels (Android)
  channels: {},
  
  // Notification queue
  notifications: [],
  unreadCount: 0,
  
  // Notification history
  history: [],
  historyLimit: 100,
  
  // Scheduled notifications
  scheduled: [],
  
  // Notification tokens (for push)
  tokens: {
    fcm: null,
    apns: null,
    expo: null,
  },
  
  // Notification actions
  actions: [],
  
  // Loading states
  loading: {
    permission: false,
    token: false,
    sending: false,
    scheduling: false,
  },
  
  // Error states
  errors: {
    permission: null,
    token: null,
    sending: null,
    scheduling: null,
  },
  
  // Statistics
  stats: {
    totalReceived: 0,
    totalRead: 0,
    totalClicked: 0,
    totalDismissed: 0,
    lastNotificationTime: null,
  },
  
  // Preferences
  preferences: {
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
    grouping: true,
    preview: 'always', // 'always', 'whenUnlocked', 'never'
    showInForeground: true,
    alertStyle: 'banner', // 'banner', 'alert'
  },
};

// ====================
// SLICE DEFINITION
// ====================

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    // ====================
    // PERMISSION MANAGEMENT
    // ====================
    
    setNotificationPermission: (state, action) => {
      state.permission = {
        ...state.permission,
        ...action.payload,
      };
    },
    
    // ====================
    // SETTINGS MANAGEMENT
    // ====================
    
    updateNotificationSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    
    toggleNotificationCategory: (state, action) => {
      const category = action.payload;
      if (state.categories[category] !== undefined) {
        state.categories[category] = !state.categories[category];
      }
    },
    
    // ====================
    // NOTIFICATION MANAGEMENT
    // ====================
    
    addNotification: (state, action) => {
      const notification = {
        ...action.payload,
        id: action.payload.id || Date.now().toString(),
        timestamp: action.payload.timestamp || Date.now(),
        read: false,
        clicked: false,
        dismissed: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
      state.stats.totalReceived += 1;
      state.stats.lastNotificationTime = notification.timestamp;
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        const removed = state.notifications.pop();
        if (!removed.read) {
          state.unreadCount -= 1;
        }
      }
      
      // Add to history
      state.history.unshift(notification);
      if (state.history.length > state.historyLimit) {
        state.history.pop();
      }
    },
    
    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
        state.stats.totalRead += 1;
      }
      
      // Also update in history
      const historyItem = state.history.find(n => n.id === notificationId);
      if (historyItem && !historyItem.read) {
        historyItem.read = true;
      }
    },
    
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
          state.stats.totalRead += 1;
        }
      });
      state.unreadCount = 0;
      
      // Also update history
      state.history.forEach(item => {
        if (!item.read) {
          item.read = true;
        }
      });
    },
    
    markNotificationAsClicked: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      
      if (notification && !notification.clicked) {
        notification.clicked = true;
        state.stats.totalClicked += 1;
      }
    },
    
    dismissNotification: (state, action) => {
      const notificationId = action.payload;
      const notificationIndex = state.notifications.findIndex(n => n.id === notificationId);
      
      if (notificationIndex !== -1) {
        const notification = state.notifications[notificationIndex];
        notification.dismissed = true;
        state.stats.totalDismissed += 1;
        
        // Remove from active notifications if dismissed
        state.notifications.splice(notificationIndex, 1);
        if (!notification.read) {
          state.unreadCount -= 1;
        }
      }
    },
    
    removeNotification: (state, action) => {
      const notificationId = action.payload;
      const notificationIndex = state.notifications.findIndex(n => n.id === notificationId);
      
      if (notificationIndex !== -1) {
        const notification = state.notifications[notificationIndex];
        state.notifications.splice(notificationIndex, 1);
        if (!notification.read) {
          state.unreadCount -= 1;
        }
      }
    },
    
    clearNotifications: (state) => {
      const unreadCount = state.notifications.filter(n => !n.read).length;
      state.stats.totalDismissed += unreadCount;
      state.notifications = [];
      state.unreadCount = 0;
    },
    
    // ====================
    // TOKEN MANAGEMENT
    // ====================
    
    setNotificationToken: (state, action) => {
      const { type, token } = action.payload;
      state.tokens[type] = token;
    },
    
    clearNotificationTokens: (state) => {
      state.tokens = initialState.tokens;
    },
    
    // ====================
    // CHANNEL MANAGEMENT (Android)
    // ====================
    
    addNotificationChannel: (state, action) => {
      const { id, channel } = action.payload;
      state.channels[id] = channel;
    },
    
    removeNotificationChannel: (state, action) => {
      delete state.channels[action.payload];
    },
    
    // ====================
    // SCHEDULED NOTIFICATIONS
    // ====================
    
    addScheduledNotification: (state, action) => {
      state.scheduled.push({
        ...action.payload,
        scheduledAt: Date.now(),
      });
    },
    
    removeScheduledNotification: (state, action) => {
      state.scheduled = state.scheduled.filter(
        notification => notification.id !== action.payload
      );
    },
    
    clearScheduledNotifications: (state) => {
      state.scheduled = [];
    },
    
    // ====================
    // ACTION MANAGEMENT
    // ====================
    
    addNotificationAction: (state, action) => {
      state.actions.push(action.payload);
    },
    
    removeNotificationAction: (state, action) => {
      state.actions = state.actions.filter(
        actionItem => actionItem.id !== action.payload
      );
    },
    
    // ====================
    // PREFERENCES
    // ====================
    
    updateNotificationPreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    
    toggleQuietHours: (state) => {
      state.preferences.quietHours.enabled = !state.preferences.quietHours.enabled;
    },
    
    // ====================
    // ERROR HANDLING
    // ====================
    
    setError: (state, action) => {
      const { key, error } = action.payload;
      if (state.errors[key] !== undefined) {
        state.errors[key] = error;
      }
    },
    
    clearError: (state, action) => {
      const key = action.payload;
      if (state.errors[key]) {
        state.errors[key] = null;
      }
    },
    
    // ====================
    // STATISTICS
    // ====================
    
    updateNotificationStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
    },
    
    // ====================
    // RESET & CLEANUP
    // ====================
    
    resetNotificationState: (state) => {
      return {
        ...initialState,
        permission: state.permission,
        settings: state.settings,
        categories: state.categories,
        preferences: state.preferences,
        tokens: state.tokens,
      };
    },
  },
});

// ====================
// ACTION CREATORS
// ====================

export const {
  setNotificationPermission,
  updateNotificationSettings,
  toggleNotificationCategory,
  addNotification,
  markNotificationAsRead,
  markAllAsRead,
  markNotificationAsClicked,
  dismissNotification,
  removeNotification,
  clearNotifications,
  setNotificationToken,
  clearNotificationTokens,
  addNotificationChannel,
  removeNotificationChannel,
  addScheduledNotification,
  removeScheduledNotification,
  clearScheduledNotifications,
  addNotificationAction,
  removeNotificationAction,
  updateNotificationPreferences,
  toggleQuietHours,
  setError,
  clearError,
  updateNotificationStats,
  resetNotificationState,
} = notificationSlice.actions;

// ====================
// SELECTORS
// ====================

export const selectNotification = (state) => state.notification;
export const selectNotificationPermission = (state) => state.notification.permission;
export const selectNotificationSettings = (state) => state.notification.settings;
export const selectNotificationCategories = (state) => state.notification.categories;
export const selectNotifications = (state) => state.notification.notifications;
export const selectUnreadCount = (state) => state.notification.unreadCount;
export const selectNotificationHistory = (state) => state.notification.history;
export const selectScheduledNotifications = (state) => state.notification.scheduled;
export const selectNotificationTokens = (state) => state.notification.tokens;
export const selectNotificationChannels = (state) => state.notification.channels;
export const selectNotificationActions = (state) => state.notification.actions;
export const selectNotificationPreferences = (state) => state.notification.preferences;
export const selectLoading = (state) => state.notification.loading;
export const selectErrors = (state) => state.notification.errors;
export const selectStats = (state) => state.notification.stats;

// Derived Selectors
export const selectHasNotificationPermission = (state) => 
  state.notification.permission.granted;

export const selectUnreadNotifications = (state) =>
  state.notification.notifications.filter(n => !n.read);

export const selectReadNotifications = (state) =>
  state.notification.notifications.filter(n => n.read);

export const selectNotificationsByCategory = (category) => (state) =>
  state.notification.notifications.filter(n => 
    n.category === category && state.notification.categories[category]
  );

export const selectRecentNotifications = (limit = 10) => (state) =>
  state.notification.notifications.slice(0, limit);

export const selectNotificationById = (id) => (state) =>
  state.notification.notifications.find(n => n.id === id) ||
  state.notification.history.find(n => n.id === id);

export const selectAreQuietHoursActive = (state) => {
  const { enabled, start, end } = state.notification.preferences.quietHours;
  
  if (!enabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  } else {
    return currentTime >= startTime || currentTime < endTime;
  }
};

export default notificationSlice.reducer;