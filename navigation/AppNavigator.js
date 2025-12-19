import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

// ✅ FIXED: Using @ alias for utils
import { getUserData, getUserRole } from '@utils/userStorage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ===================== IMPORT ALL SCREENS WITH @ ALIAS =====================

// ✅ FIXED: Auth Screens with @ alias
import PhoneOrGoogleScreen from '@screens/auth/PhoneOrGoogleScreen';
import OtpVerificationScreen from '@screens/auth/OtpVerificationScreen';
import ProfileCompletionScreen from '@screens/auth/ProfileCompletionScreen';
import RoleSelectionScreen from '@screens/auth/RoleSelectionScreen';

// ✅ FIXED: Rider Screens with @ alias
import RiderHomeScreen from '@screens/rider/RiderHomeScreen';
import RideSelectionScreen from '@screens/rider/RideSelectionScreen';
import RideConfirmationScreen from '@screens/rider/RideConfirmationScreen';
import RidesScreen from '@screens/rider/RidesScreen';

// ✅ FIXED: Driver Screens with @ alias
import DriverHomeScreen from '@screens/driver/DriverHomeScreen';
import EarningsScreen from '@screens/driver/EarningsScreen';
import DriverVerificationScreen from '@screens/driver/DriverVerificationScreen';
import VerificationPendingScreen from '@screens/driver/VerificationPendingScreen';
import RideRequestsScreen from '@screens/driver/RideRequestsScreen';
import ActiveRideScreen from '@screens/driver/ActiveRideScreen';
import TripHistoryScreen from '@screens/driver/TripHistoryScreen';
import TripDetailsScreen from '@screens/driver/TripDetailsScreen';
import DriverProfileScreen from '@screens/driver/DriverProfileScreen';
import DriverSettingsScreen from '@screens/driver/DriverSettingsScreen';
import AddVehicleScreen from '@screens/driver/AddVehicleScreen';
import VehicleScreen from '@screens/driver/VehicleScreen';

// ✅ FIXED: Profile Screen with @ alias
import ProfileScreen from '@screens/profile/ProfileScreen';

// ===================== CREATE BOTTOM TABS FOR RIDER =====================

// ----- Rider Bottom Tabs -----
const RiderTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Rides') {
            iconName = 'directions-car';
          } else if (route.name === 'Account') {
            iconName = 'person';
          }

          return <MaterialIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={RiderHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Rides" 
        component={RidesScreen}
        options={{ tabBarLabel: 'Rides' }}
      />
      <Tab.Screen 
        name="Account" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Account' }}
        initialParams={{ userRole: 'rider' }}
      />
    </Tab.Navigator>
  );
};

// ----- Rider Stack -----
const RiderStack = () => (
  <Stack.Navigator 
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="RiderTabs" component={RiderTabs} />
    <Stack.Screen name="RideSelection" component={RideSelectionScreen} />
    <Stack.Screen name="RideConfirmation" component={RideConfirmationScreen} />
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

  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        const userData = await getUserData();
        const userRole = await getUserRole();
        
        if (userData && userRole) {
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
        {/* Auth Flow */}
        <Stack.Screen name="PhoneOrGoogle" component={PhoneOrGoogleScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        
        {/* Main App */}
        <Stack.Screen name="RiderMain" component={RiderStack} />
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