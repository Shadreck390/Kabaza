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

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      if (!state.history) state.history = [];

      if (!state.stats) state.stats = { totalReceived: 0, totalRead: 0, totalClicked: 0, totalDismissed: 0, lastNotificationTime: null };

      

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

        if (removed && !removed.read) {

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

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      if (!state.history) state.history = [];

      if (!state.stats) state.stats = { totalRead: 0 };

      

      const notificationId = action.payload;

      const notification = state.notifications.find(n => n && n.id === notificationId);

      

      if (notification && !notification.read) {

        notification.read = true;

        state.unreadCount = Math.max(0, (state.unreadCount || 0) - 1);

        state.stats.totalRead = (state.stats.totalRead || 0) + 1;

      }

      

      // Also update in history

      const historyItem = state.history.find(n => n && n.id === notificationId);

      if (historyItem && !historyItem.read) {

        historyItem.read = true;

      }

    },

    

    markAllAsRead: (state) => {

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      if (!state.history) state.history = [];

      if (!state.stats) state.stats = { totalRead: 0 };

      

      if (Array.isArray(state.notifications)) {

        state.notifications.forEach(notification => {

          if (notification && !notification.read) {

            notification.read = true;

            state.stats.totalRead = (state.stats.totalRead || 0) + 1;

          }

        });

      }

      

      state.unreadCount = 0;

      

      if (Array.isArray(state.history)) {

        state.history.forEach(item => {

          if (item && !item.read) {

            item.read = true;

          }

        });

      }

    },



    markNotificationAsClicked: (state, action) => {

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      if (!state.stats) state.stats = { totalClicked: 0 };

      

      const notificationId = action.payload;

      const notification = state.notifications.find(n => n && n.id === notificationId);

      

      if (notification && !notification.clicked) {

        notification.clicked = true;

        state.stats.totalClicked = (state.stats.totalClicked || 0) + 1;

      }

    },

    

    dismissNotification: (state, action) => {

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      if (!state.stats) state.stats = { totalDismissed: 0 };

      

      const notificationId = action.payload;

      const notificationIndex = state.notifications.findIndex(n => n && n.id === notificationId);

      

      if (notificationIndex !== -1) {

        const notification = state.notifications[notificationIndex];

        if (notification) {

          notification.dismissed = true;

          state.stats.totalDismissed = (state.stats.totalDismissed || 0) + 1;

          

          // Remove from active notifications if dismissed

          state.notifications.splice(notificationIndex, 1);

          if (!notification.read) {

            state.unreadCount = Math.max(0, (state.unreadCount || 0) - 1);

          }

        }

      }

    },

    

    removeNotification: (state, action) => {

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      

      const notificationId = action.payload;

      const notificationIndex = state.notifications.findIndex(n => n && n.id === notificationId);

      

      if (notificationIndex !== -1) {

        const notification = state.notifications[notificationIndex];

        state.notifications.splice(notificationIndex, 1);

        if (notification && !notification.read) {

          state.unreadCount = Math.max(0, (state.unreadCount || 0) - 1);

        }

      }

    },

    

    clearNotifications: (state) => {

      // Ensure arrays exist

      if (!state.notifications) state.notifications = [];

      if (!state.stats) state.stats = { totalDismissed: 0 };

      

      const unreadCount = Array.isArray(state.notifications) 

        ? state.notifications.filter(n => n && !n.read).length 

        : 0;

      

      state.stats.totalDismissed = (state.stats.totalDismissed || 0) + unreadCount;

      state.notifications = [];

      state.unreadCount = 0;

    },

    

    // ====================

    // TOKEN MANAGEMENT

    // ====================

    

    setNotificationToken: (state, action) => {

      const { type, token } = action.payload;

      if (!state.tokens) state.tokens = {};

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

      if (!state.channels) state.channels = {};

      state.channels[id] = channel;

    },

    

    removeNotificationChannel: (state, action) => {

      if (state.channels) {

        delete state.channels[action.payload];

      }

    },

    

    // ====================

    // SCHEDULED NOTIFICATIONS

    // ====================

    

    addScheduledNotification: (state, action) => {

      if (!state.scheduled) state.scheduled = [];

      state.scheduled.push({

        ...action.payload,

        scheduledAt: Date.now(),

      });

    },

    

    removeScheduledNotification: (state, action) => {

      if (!state.scheduled) state.scheduled = [];

      state.scheduled = state.scheduled.filter(

        notification => notification && notification.id !== action.payload

      );

    },

    

    clearScheduledNotifications: (state) => {

      state.scheduled = [];

    },

    

    // ====================

    // ACTION MANAGEMENT

    // ====================

    

    addNotificationAction: (state, action) => {

      if (!state.actions) state.actions = [];

      state.actions.push(action.payload);

    },

    

    removeNotificationAction: (state, action) => {

      if (!state.actions) state.actions = [];

      state.actions = state.actions.filter(

        actionItem => actionItem && actionItem.id !== action.payload

      );

    },

    

    // ====================

    // PREFERENCES

    // ====================

    

    updateNotificationPreferences: (state, action) => {

      if (!state.preferences) state.preferences = initialState.preferences;

      state.preferences = {

        ...state.preferences,

        ...action.payload,

      };

    },

    

    toggleQuietHours: (state) => {

      if (!state.preferences) state.preferences = initialState.preferences;

      if (!state.preferences.quietHours) {

        state.preferences.quietHours = { enabled: false, start: '22:00', end: '07:00' };

      }

      state.preferences.quietHours.enabled = !state.preferences.quietHours.enabled;

    },

    

    // ====================

    // ERROR HANDLING

    // ====================

    

    setError: (state, action) => {

      const { key, error } = action.payload;

      if (!state.errors) state.errors = {};

      if (state.errors[key] !== undefined) {

        state.errors[key] = error;

      }

    },

    

    clearError: (state, action) => {

      const key = action.payload;

      if (state.errors && state.errors[key]) {

        state.errors[key] = null;

      }

    },

    

    // ====================

    // STATISTICS

    // ====================

    

    updateNotificationStats: (state, action) => {

      if (!state.stats) {

        state.stats = { totalReceived: 0, totalRead: 0, totalClicked: 0, totalDismissed: 0, lastNotificationTime: null };

      }

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

        permission: state?.permission || initialState.permission,

        settings: state?.settings || initialState.settings,

        categories: state?.categories || initialState.categories,

        preferences: state?.preferences || initialState.preferences,

        tokens: state?.tokens || initialState.tokens,

      };

    },

  },

});



// ====================

// DEBUG WRAPPER - ADDED AFTER SLICE DEFINITION

// ====================



const originalReducer = notificationSlice.reducer;

const wrappedReducer = (state, action) => {

  try {

    // Ensure state has required arrays before passing to original reducer

    const safeState = {

      ...state,

      notifications: Array.isArray(state?.notifications) ? state.notifications : [],

      history: Array.isArray(state?.history) ? state.history : [],

      scheduled: Array.isArray(state?.scheduled) ? state.scheduled : [],

      actions: Array.isArray(state?.actions) ? state.actions : [],

      unreadCount: state?.unreadCount || 0,

      stats: state?.stats || { totalReceived: 0, totalRead: 0, totalClicked: 0, totalDismissed: 0, lastNotificationTime: null },

    };

    

    return originalReducer(safeState, action);

  } catch (error) {

    console.error('🔴 NOTIFICATION REDUCER ERROR:', {

      actionType: action?.type,

      error: error.message,

      stack: error.stack

    });

    // Return safe state to prevent crash

    return {

      ...state,

      notifications: Array.isArray(state?.notifications) ? state.notifications : [],

      history: Array.isArray(state?.history) ? state.history : [],

      unreadCount: state?.unreadCount || 0,

    };

  }

};



// Replace the reducer with our wrapped version

notificationSlice.reducer = wrappedReducer;



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



export const selectNotification = (state) => state?.notification || initialState;

export const selectNotificationPermission = (state) => state?.notification?.permission || initialState.permission;

export const selectNotificationSettings = (state) => state?.notification?.settings || initialState.settings;

export const selectNotificationCategories = (state) => state?.notification?.categories || initialState.categories;

export const selectNotifications = (state) => state?.notification?.notifications || [];

export const selectUnreadCount = (state) => state?.notification?.unreadCount || 0;

export const selectNotificationHistory = (state) => state?.notification?.history || [];

export const selectScheduledNotifications = (state) => state?.notification?.scheduled || [];

export const selectNotificationTokens = (state) => state?.notification?.tokens || initialState.tokens;

export const selectNotificationChannels = (state) => state?.notification?.channels || {};

export const selectNotificationActions = (state) => state?.notification?.actions || [];

export const selectNotificationPreferences = (state) => state?.notification?.preferences || initialState.preferences;

export const selectLoading = (state) => state?.notification?.loading || initialState.loading;

export const selectErrors = (state) => state?.notification?.errors || initialState.errors;

export const selectStats = (state) => state?.notification?.stats || initialState.stats;



// Derived Selectors

export const selectHasNotificationPermission = (state) => 

  state?.notification?.permission?.granted || false;



export const selectUnreadNotifications = (state) => {

  const notifications = state?.notification?.notifications || [];

  return notifications.filter(n => n && !n.read);

};



export const selectReadNotifications = (state) => {

  const notifications = state?.notification?.notifications || [];

  return notifications.filter(n => n && n.read);

};



export const selectNotificationsByCategory = (category) => (state) => {

  const notifications = state?.notification?.notifications || [];

  const categories = state?.notification?.categories || {};

  return notifications.filter(n => 

    n && n.category === category && categories[category]

  );

};



export const selectRecentNotifications = (limit = 10) => (state) => {

  const notifications = state?.notification?.notifications || [];

  return notifications.slice(0, limit);

};



export const selectNotificationById = (id) => (state) => {

  const notifications = state?.notification?.notifications || [];

  const history = state?.notification?.history || [];

  return notifications.find(n => n && n.id === id) ||

         history.find(n => n && n.id === id);

};



export const selectAreQuietHoursActive = (state) => {

  const preferences = state?.notification?.preferences || initialState.preferences;

  const { enabled, start, end } = preferences.quietHours || { enabled: false, start: '22:00', end: '07:00' };

  

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