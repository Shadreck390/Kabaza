// services/api/vehicleAPI.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://your-api-url.com/api'; // Replace with your actual API URL

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const vehicleAPI = {
  // Register a vehicle
  registerVehicle: async (vehicleData) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/vehicles`, vehicleData, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle by ID
  getVehicle: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/${vehicleId}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update vehicle
  updateVehicle: async (vehicleId, updates) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.put(`${API_BASE_URL}/vehicles/${vehicleId}`, updates, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete vehicle
  deleteVehicle: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.delete(`${API_BASE_URL}/vehicles/${vehicleId}`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get all vehicles for user
  getUserVehicles: async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Set default vehicle
  setDefaultVehicle: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/vehicles/${vehicleId}/set-default`, {}, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload vehicle documents
  uploadDocuments: async (vehicleId, documents) => {
    try {
      const headers = await getAuthHeader();
      const formData = new FormData();
      
      Object.keys(documents).forEach(key => {
        formData.append(key, documents[key]);
      });
      
      const response = await axios.post(
        `${API_BASE_URL}/vehicles/${vehicleId}/documents`,
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle documents
  getVehicleDocuments: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/${vehicleId}/documents`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify vehicle
  verifyVehicle: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(`${API_BASE_URL}/vehicles/${vehicleId}/verify`, {}, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle types
  getVehicleTypes: async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/types`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle makes
  getVehicleMakes: async (type) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/makes`, {
        headers,
        params: { type },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle models
  getVehicleModels: async (make) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/models`, {
        headers,
        params: { make },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Check vehicle availability
  checkAvailability: async (vehicleId, dateRange) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(
        `${API_BASE_URL}/vehicles/${vehicleId}/availability`,
        dateRange,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle maintenance records
  getMaintenanceRecords: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/${vehicleId}/maintenance`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Add maintenance record
  addMaintenanceRecord: async (vehicleId, record) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.post(
        `${API_BASE_URL}/vehicles/${vehicleId}/maintenance`,
        record,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get vehicle insurance
  getVehicleInsurance: async (vehicleId) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_BASE_URL}/vehicles/${vehicleId}/insurance`, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update vehicle insurance
  updateVehicleInsurance: async (vehicleId, insuranceData) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.put(
        `${API_BASE_URL}/vehicles/${vehicleId}/insurance`,
        insuranceData,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default vehicleAPI;