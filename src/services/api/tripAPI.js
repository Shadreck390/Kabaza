// services/api/tripAPI.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://your-api-url.com/api'; // Replace with your actual API URL

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const tripAPI = {
  // Create a new trip
  createTrip: async (tripData) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/trips`, tripData, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get trip by ID
  getTrip: async (tripId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/trips/${tripId}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update trip
  updateTrip: async (tripId, updates) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.put(`${API_BASE_URL}/trips/${tripId}`, updates, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel trip
  cancelTrip: async (tripId, reason) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/trips/${tripId}/cancel`, { reason }, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get active trips
  getActiveTrips: async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/trips/active`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get trip history
  getTripHistory: async (page = 1, limit = 20, filters = {}) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/trips/history`, {
        headers,
        params: { page, limit, ...filters },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get trip statistics
  getTripStats: async (period = 'month') => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/trips/stats`, {
        headers,
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Rate trip
  rateTrip: async (tripId, rating, feedback) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/trips/${tripId}/rate`, 
        { rating, feedback }, 
        { headers }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get trip receipts
  getTripReceipts: async (tripId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/trips/${tripId}/receipt`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Share trip details
  shareTrip: async (tripId, shareData) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/trips/${tripId}/share`, shareData, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Track trip location
  trackTrip: async (tripId, location) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/trips/${tripId}/track`, location, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get trip timeline
  getTripTimeline: async (tripId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/trips/${tripId}/timeline`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default tripAPI;