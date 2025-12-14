// services/api/index.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Base URL - Update with your actual API URL
const API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000/api',
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api', // For web/other platforms
});

// Or use your production API
// const API_BASE_URL = 'https://api.kabaza.app/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { token, refreshToken: newRefreshToken } = response.data;
          
          // Store new tokens
          await AsyncStorage.setItem('auth_token', token);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refresh_token', newRefreshToken);
          }
          
          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${token}`;
          
          // Retry original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user');
        
        // You might want to dispatch a logout action here
        // store.dispatch({ type: 'auth/logout' });
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
const API = {
  // ====================
  // AUTH ENDPOINTS
  // ====================
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    verifyPhone: (phone, code) => api.post('/auth/verify-phone', { phone, code }),
    resendCode: (phone) => api.post('/auth/resend-code', { phone }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    updateProfile: (userData) => api.put('/auth/profile', userData),
  },
  
  // ====================
  // RIDE ENDPOINTS
  // ====================
  rides: {
    // For riders
    bookRide: (rideData) => api.post('/rides/book', rideData),
    cancelRide: (rideId, reason) => api.put(`/rides/${rideId}/cancel`, { reason }),
    getRideDetails: (rideId) => api.get(`/rides/${rideId}`),
    getRideHistory: (params) => api.get('/rides/history', { params }),
    rateRide: (rideId, rating, review) => api.post(`/rides/${rideId}/rate`, { rating, review }),
    getFareEstimate: (rideData) => api.post('/rides/estimate', rideData),
    
    // For drivers
    getNearbyRides: (params) => api.get('/rides/nearby', { params }),
    acceptRide: (rideId) => api.post(`/rides/${rideId}/accept`),
    startRide: (rideId) => api.post(`/rides/${rideId}/start`),
    completeRide: (rideId, paymentData) => api.post(`/rides/${rideId}/complete`, paymentData),
    updateRideLocation: (rideId, location) => api.put(`/rides/${rideId}/location`, location),
  },
  
  // ====================
  // DRIVER ENDPOINTS
  // ====================
  drivers: {
    register: (driverData) => api.post('/drivers/register', driverData),
    getProfile: () => api.get('/drivers/profile'),
    updateProfile: (driverData) => api.put('/drivers/profile', driverData),
    updateStatus: (status) => api.put('/drivers/status', { status }),
    updateLocation: (location) => api.put('/drivers/location', location),
    getEarnings: (params) => api.get('/drivers/earnings', { params }),
    getStats: () => api.get('/drivers/stats'),
    uploadDocuments: (documents) => api.post('/drivers/documents', documents),
    getDocuments: () => api.get('/drivers/documents'),
  },
  
  // ====================
  // PAYMENT ENDPOINTS
  // ====================
  payments: {
    getWallet: () => api.get('/payments/wallet'),
    addFunds: (amount, method) => api.post('/payments/add-funds', { amount, method }),
    getPaymentMethods: () => api.get('/payments/methods'),
    addPaymentMethod: (methodData) => api.post('/payments/methods', methodData),
    removePaymentMethod: (methodId) => api.delete(`/payments/methods/${methodId}`),
    getTransactions: (params) => api.get('/payments/transactions', { params }),
    processPayment: (paymentData) => api.post('/payments/process', paymentData),
    requestPayout: (amount, method) => api.post('/payments/payout', { amount, method }),
  },
  
  // ====================
  // LOCATION ENDPOINTS
  // ====================
  locations: {
    searchPlaces: (query, params) => api.get('/locations/search', { params: { query, ...params } }),
    reverseGeocode: (lat, lng) => api.get('/locations/reverse-geocode', { params: { lat, lng } }),
    geocode: (address) => api.get('/locations/geocode', { params: { address } }),
    getRoute: (origin, destination, mode) => api.get('/locations/route', { 
      params: { 
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode 
      } 
    }),
  },
  
  // ====================
  // CHAT ENDPOINTS
  // ====================
  chat: {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId, params) => api.get(`/chat/conversations/${conversationId}/messages`, { params }),
    sendMessage: (conversationId, message) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
    markAsRead: (conversationId, messageId) => api.put(`/chat/conversations/${conversationId}/messages/${messageId}/read`),
  },
  
  // ====================
  // NOTIFICATION ENDPOINTS
  // ====================
  notifications: {
    getAll: (params) => api.get('/notifications', { params }),
    markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (notificationId) => api.delete(`/notifications/${notificationId}`),
    getSettings: () => api.get('/notifications/settings'),
    updateSettings: (settings) => api.put('/notifications/settings', settings),
  },
  
  // ====================
  // USER ENDPOINTS
  // ====================
  users: {
    getProfile: (userId) => api.get(`/users/${userId}/profile`),
    updatePreferences: (preferences) => api.put('/users/preferences', preferences),
    getEmergencyContacts: () => api.get('/users/emergency-contacts'),
    addEmergencyContact: (contact) => api.post('/users/emergency-contacts', contact),
    removeEmergencyContact: (contactId) => api.delete(`/users/emergency-contacts/${contactId}`),
  },
  
  // ====================
  // APP ENDPOINTS
  // ====================
  app: {
    getConfig: () => api.get('/app/config'),
    getPromotions: () => api.get('/app/promotions'),
    applyPromoCode: (code) => api.post('/app/promotions/apply', { code }),
    getFaqs: () => api.get('/app/faqs'),
    contactSupport: (message) => api.post('/app/support', message),
  },
};

// Utility functions
const apiUtils = {
  // Upload file
  uploadFile: async (file, endpoint, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    
    if (onProgress) {
      config.onUploadProgress = onProgress;
    }
    
    return api.post(endpoint, formData, config);
  },
  
  // Cancel request
  createCancelToken: () => {
    return axios.CancelToken.source();
  },
  
  // Check if error is a cancellation
  isCancel: (error) => {
    return axios.isCancel(error);
  },
  
  // Set base URL (useful for switching between dev/prod)
  setBaseURL: (url) => {
    api.defaults.baseURL = url;
  },
  
  // Set auth token manually
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },
  
  // Clear auth token
  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },
};

// Export both the API object and the axios instance
export { apiUtils, API_BASE_URL };
export default API;