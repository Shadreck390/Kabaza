// src/services/driverService.js
import api from '@services/api/client';

export const getDriverProfile = async () => {
  try {
    const response = await api.get('/driver/profile');
    return response.data;
  } catch (error) {
    console.error('Error getting driver profile:', error);
    throw error;
  }
};

export const updateDriverStatus = async (status) => {
  try {
    const response = await api.put('/driver/status', { status });
    return response.data;
  } catch (error) {
    console.error('Error updating driver status:', error);
    throw error;
  }
};

// Add other driver-related API calls as needed
export const driverService = {
  getDriverProfile,
  updateDriverStatus,
};

export default driverService;