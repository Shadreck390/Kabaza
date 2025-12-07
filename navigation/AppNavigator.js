import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserData, getUserRole } from '../src/utils/userStorage';

const Stack = createStackNavigator();

// Import ALL screens directly (no dynamic requires)
// ===================== IMPORT ALL SCREENS =====================

// Auth Screens
import PhoneOrGoogleScreen from '../screens/auth/PhoneOrGoogleScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import ProfileCompletionScreen from '../screens/auth/ProfileCompletionScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

// Rider Screens
import RiderHomeScreen from '../screens/rider/RiderHomeScreen';
import RideConfirmationScreen from '../screens/rider/RideConfirmationScreen';

// Driver Screens
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import DriverVerificationScreen from '../screens/driver/DriverVerificationScreen';
import VerificationPendingScreen from '../screens/driver/VerificationPendingScreen';
import RideRequestsScreen from '../screens/driver/RideRequestsScreen';
import ActiveRideScreen from '../screens/driver/ActiveRideScreen';
import TripHistoryScreen from '../screens/driver/TripHistoryScreen';
import TripDetailsScreen from '../screens/driver/TripDetailsScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import DriverSettingsScreen from '../screens/driver/DriverSettingsScreen';
import AddVehicleScreen from '../screens/driver/AddVehicleScreen';
import VehicleScreen from '../screens/driver/VehicleScreen';

// Common Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
// ===================== CREATE STACKS =====================

// ----- Rider Stack -----
const RiderStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RiderHome" component={RiderHomeScreen} />
    <Stack.Screen name="RideConfirmation" component={RideConfirmationScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// ----- Driver Main Stack -----
const DriverMainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
    <Stack.Screen name="RideRequests" component={RideRequestsScreen} />
    <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
    <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
    <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
    <Stack.Screen name="Earnings" component={EarningsScreen} />
    <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
    <Stack.Screen name="DriverSettings" component={DriverSettingsScreen} />
    <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
    <Stack.Screen name="Vehicle" component={VehicleScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// ----- Driver Verification Flow -----
const DriverVerificationFlow = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverVerification" component={DriverVerificationScreen} />
    <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} />
  </Stack.Navigator>
);

// ===================== APP NAVIGATOR =====================
export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('PhoneOrGoogle');

  // Load saved user data on app start
  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        const userData = await getUserData();
        const userRole = await getUserRole();
        
        console.log('📱 Loaded saved user:', {
          hasData: !!userData,
          role: userRole,
          isDriverVerified: userData?.driverProfile?.isVerified
        });
        
        if (userData && userRole) {
          // Determine initial route
          if (userRole === 'driver') {
            const isDriverVerified = userData?.driverProfile?.isVerified || false;
            setInitialRoute(isDriverVerified ? 'DriverMain' : 'DriverVerification');
          } else {
            setInitialRoute('RiderMain');
          }
        }
      } catch (error) {
        console.error('Error loading saved user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedUser();
  }, []);

  // Safe Redux state access
  const authState = useSelector(state => state?.auth || { user: null, role: null });
  const { user, role } = authState;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading Kabaza...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        {/* 🔐 AUTH FLOW */}
        <Stack.Screen name="PhoneOrGoogle" component={PhoneOrGoogleScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        
        {/* 🛵 RIDER FLOW */}
        <Stack.Screen name="RiderMain" component={RiderStack} />
        
        {/* 🚗 DRIVER FLOW */}
        <Stack.Screen name="DriverVerification" component={DriverVerificationFlow} />
        <Stack.Screen name="DriverMain" component={DriverMainStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});