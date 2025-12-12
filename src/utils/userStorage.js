// src/utils/userStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = '@kabaza_user_data';
const USER_ROLE_KEY = '@kabaza_user_role';
const RIDE_HISTORY_KEY = '@kabaza_ride_history'; // ADD THIS

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log('User data saved successfully');
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const saveUserRole = async (role) => {
  try {
    await AsyncStorage.setItem(USER_ROLE_KEY, role);
    console.log('User role saved:', role);
  } catch (error) {
    console.error('Error saving user role:', error);
  }
};

export const getUserRole = async () => {
  try {
    return await AsyncStorage.getItem(USER_ROLE_KEY);
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove([USER_DATA_KEY, USER_ROLE_KEY, RIDE_HISTORY_KEY]);
    console.log('User data cleared');
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

// ========== RIDE HISTORY FUNCTIONS ========== //

// Store ride history
export const storeRideHistory = async (rides) => {
  try {
    await AsyncStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(rides));
    console.log('Ride history saved');
    return true;
  } catch (error) {
    console.error('Error storing ride history:', error);
    return false;
  }
};

// Get ride history
export const getRideHistory = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(RIDE_HISTORY_KEY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    // Return sample rides if no history exists
    const sampleRides = [
      {
        id: '1',
        date: '3 Dec 2025 · 21:55',
        destination: '6th Avenue, Lilongwe, Malawi',
        price: 'MK 850',
        status: 'completed',
      },
      {
        id: '2',
        date: '10 Oct 2025 · 21:58',
        destination: 'Kamuzu Central Hospital, Lilongwe, Malawi',
        price: 'MK 1,100',
        status: 'completed',
      },
      {
        id: '3',
        date: '9 Oct 2025 · 20:30',
        destination: 'Area 3 Shopping Complex, Lilongwe',
        price: 'MK 0',
        status: 'cancelled',
      },
    ];
    await storeRideHistory(sampleRides);
    return sampleRides;
  } catch (error) {
    console.error('Error getting ride history:', error);
    return [];
  }
};

// Add a new ride to history
export const addRideToHistory = async (ride) => {
  try {
    const currentHistory = await getRideHistory();
    const updatedHistory = [ride, ...currentHistory];
    await storeRideHistory(updatedHistory);
    console.log('Ride added to history');
    return updatedHistory;
  } catch (error) {
    console.error('Error adding ride to history:', error);
    return [];
  }
};

// Clear ride history
export const clearRideHistory = async () => {
  try {
    await AsyncStorage.removeItem(RIDE_HISTORY_KEY);
    console.log('Ride history cleared');
  } catch (error) {
    console.error('Error clearing ride history:', error);
  }
};