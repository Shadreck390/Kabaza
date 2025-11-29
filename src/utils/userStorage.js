import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_DATA_KEY = '@kabaza_user_data';
const USER_ROLE_KEY = '@kabaza_user_role';

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
    await AsyncStorage.multiRemove([USER_DATA_KEY, USER_ROLE_KEY]);
    console.log('User data cleared');
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};