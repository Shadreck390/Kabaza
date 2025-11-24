import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  isAppReady: false,
  currentScreen: null,
  notifications: [],
  appSettings: {
    theme: 'light',
    language: 'en',
  },
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setAppReady: (state, action) => {
      state.isAppReady = action.payload;
    },
    setCurrentScreen: (state, action) => {
      state.currentScreen = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push(action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    updateAppSettings: (state, action) => {
      state.appSettings = { ...state.appSettings, ...action.payload };
    },
  },
});

export const {
  setLoading,
  setAppReady,
  setCurrentScreen,
  addNotification,
  clearNotifications,
  updateAppSettings,
} = appSlice.actions;

export default appSlice.reducer;