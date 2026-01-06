// navigation/AppNavigator.js
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

// Storage utils
import { getUserData, getUserRole } from '@src/utils/userStorage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// ===================== IMPORT ALL SCREENS =====================

// Auth Screens
import SplashScreen from '@screens/common/SplashScreen';
import PhoneOrGoogleScreen from '@screens/auth/PhoneOrGoogleScreen';
import OtpVerificationScreen from '@screens/auth/OtpVerificationScreen';
import ProfileCompletionScreen from '@screens/auth/ProfileCompletionScreen';
import RoleSelectionScreen from '@screens/auth/RoleSelectionScreen';

// Rider Screens
import RiderHomeScreen from '@screens/rider/RiderHomeScreen';
import RideSelectionScreen from '@screens/rider/RideSelectionScreen';
import RideConfirmationScreen from '@screens/rider/RideConfirmationScreen';
import RidesScreen from '@screens/rider/RidesScreen';
import RideWaitingScreen from '@screens/rider/RideWaitingScreen';
import RideActiveScreen from '@screens/rider/RideActiveScreen';
import RideDetailsScreen from '@screens/rider/RideDetailsScreen';
import RideRatingScreen from '@screens/rider/RideRatingScreen';
import RideHistoryScreen from '@screens/rider/RideHistoryScreen';
import SearchLocationScreen from '@screens/rider/SearchLocationScreen';
import FavoritesScreen from '@screens/rider/FavoritesScreen';

// Driver Screens
import DriverHomeScreen from '@screens/driver/DriverHomeScreen';
import DriverMapScreen from '@screens/driver/DriverMapScreen';
import EarningsScreen from '@screens/driver/EarningsScreen';
import DriverEarningsDetails from '@screens/driver/DriverEarningsDetails';
import DriverVerificationScreen from '@screens/driver/DriverVerificationScreen';
import VerificationPendingScreen from '@screens/driver/VerificationPendingScreen';
import RideRequestsScreen from '@screens/driver/RideRequestsScreen';
import ActiveRideScreen from '@screens/driver/ActiveRideScreen';
import TripHistoryScreen from '@screens/driver/TripHistoryScreen';
import TripDetailsScreen from '@screens/driver/TripDetailsScreen';
import DriverProfileScreen from '@screens/driver/DriverProfileScreen';
import DriverSettingsScreen from '@screens/driver/DriverSettingsScreen';
import DriverSupportScreen from '@screens/driver/DriverSupportScreen';
import DriverStatsScreen from '@screens/driver/DriverStatsScreen';
import DriverScheduleScreen from '@screens/driver/DriverScheduleScreen';
import AddVehicleScreen from '@screens/driver/AddVehicleScreen';
import VehicleScreen from '@screens/driver/VehicleScreen';
import DriverDocumentsScreen from '@screens/driver/DriverDocumentsScreen';

// Payments Screens
import PaymentScreen from '@screens/payments/PaymentScreen';
import WalletScreen from '@screens/payments/WalletScreen';
import AddPaymentScreen from '@screens/payments/AddPaymentScreen';
import PaymentMethodsScreen from '@screens/payments/PaymentMethodsScreen';
import TransactionHistory from '@screens/payments/TransactionHistory';
import PayoutScreen from '@screens/payments/PayoutScreen';

// Common Screens
import ProfileScreen from '@screens/profile/ProfileScreen';
import MapScreen from '@screens/MapScreen/MapScreen';
import ChatScreen from '@screens/common/ChatScreen';
import NotificationsScreen from '@screens/common/NotificationsScreen';
import SettingsScreen from '@screens/common/SettingsScreen';
import HelpSupportScreen from '@screens/common/HelpSupportScreen';
import SOSScreen from '@screens/common/SOSScreen';
import AboutScreen from '@screens/common/AboutScreen';
import PrivacyScreen from '@screens/common/PrivacyScreen';
import TermsScreen from '@screens/common/TermsScreen';

// ===================== DRAWER NAVIGATOR =====================

const CommonDrawer = ({ userRole }) => (
  <Drawer.Navigator
    screenOptions={{
      drawerActiveTintColor: '#4F46E5',
      drawerInactiveTintColor: '#6B7280',
      drawerStyle: {
        backgroundColor: '#FFFFFF',
        width: 280,
      },
    }}
  >
    <Drawer.Screen 
      name="Profile" 
      component={ProfileScreen}
      initialParams={{ userRole }}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="person" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Wallet" 
      component={WalletScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="account-balance-wallet" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="TripHistory" 
      component={userRole === 'driver' ? TripHistoryScreen : RideHistoryScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="history" size={size} color={color} />
        ),
        drawerLabel: userRole === 'driver' ? 'Trip History' : 'Ride History',
      }}
    />
    <Drawer.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="notifications" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Favorites" 
      component={FavoritesScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="favorite" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="settings" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="HelpSupport" 
      component={HelpSupportScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="help" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen 
      name="About" 
      component={AboutScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <MaterialIcon name="info" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

// ===================== RIDER BOTTOM TABS =====================

const RiderTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'RiderHome') {
            iconName = 'home';
          } else if (route.name === 'Rides') {
            iconName = 'directions-car';
          } else if (route.name === 'Map') {
            iconName = 'map';
          } else if (route.name === 'Menu') {
            iconName = 'menu';
          }

          return <MaterialIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="RiderHome" 
        component={RiderHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Rides" 
        component={RidesScreen}
        options={{ tabBarLabel: 'Rides' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen 
        name="Menu" 
        component={() => <CommonDrawer userRole="rider" />}
        options={{ tabBarLabel: 'Menu' }}
      />
    </Tab.Navigator>
  );
};

// ===================== DRIVER BOTTOM TABS =====================

const DriverTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'DriverHome') {
            iconName = 'home';
          } else if (route.name === 'DriverMap') {
            iconName = 'map';
          } else if (route.name === 'Earnings') {
            iconName = 'attach-money';
          } else if (route.name === 'Menu') {
            iconName = 'menu';
          }

          return <MaterialIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="DriverHome" 
        component={DriverHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="DriverMap" 
        component={DriverMapScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={EarningsScreen}
        options={{ tabBarLabel: 'Earnings' }}
      />
      <Tab.Screen 
        name="Menu" 
        component={() => <CommonDrawer userRole="driver" />}
        options={{ tabBarLabel: 'Menu' }}
      />
    </Tab.Navigator>
  );
};

// ===================== RIDER STACK =====================

const RiderStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#FFFFFF' }
    }}
  >
    <Stack.Screen name="RiderTabs" component={RiderTabs} />
    <Stack.Screen name="RideSelection" component={RideSelectionScreen} />
    <Stack.Screen name="RideConfirmation" component={RideConfirmationScreen} />
    <Stack.Screen name="RideWaiting" component={RideWaitingScreen} />
    <Stack.Screen name="RideActive" component={RideActiveScreen} />
    <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
    <Stack.Screen name="RideRating" component={RideRatingScreen} />
    <Stack.Screen name="SearchLocation" component={SearchLocationScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="Wallet" component={WalletScreen} />
    <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    <Stack.Screen name="AddPayment" component={AddPaymentScreen} />
    <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="SOS" component={SOSScreen} />
  </Stack.Navigator>
);

// ===================== DRIVER STACK =====================

const DriverStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#FFFFFF' }
    }}
  >
    <Stack.Screen name="DriverTabs" component={DriverTabs} />
    <Stack.Screen name="RideRequests" component={RideRequestsScreen} />
    <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
    <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
    <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
    <Stack.Screen name="DriverSettings" component={DriverSettingsScreen} />
    <Stack.Screen name="DriverSupport" component={DriverSupportScreen} />
    <Stack.Screen name="DriverStats" component={DriverStatsScreen} />
    <Stack.Screen name="DriverSchedule" component={DriverScheduleScreen} />
    <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
    <Stack.Screen name="Vehicle" component={VehicleScreen} />
    <Stack.Screen name="DriverDocuments" component={DriverDocumentsScreen} />
    <Stack.Screen name="DriverEarningsDetails" component={DriverEarningsDetails} />
    <Stack.Screen name="Payout" component={PayoutScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="SOS" component={SOSScreen} />
  </Stack.Navigator>
);

// ===================== DRIVER VERIFICATION FLOW =====================

const DriverVerificationFlow = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#FFFFFF' }
    }}
  >
    <Stack.Screen name="DriverVerification" component={DriverVerificationScreen} />
    <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} />
    <Stack.Screen name="DriverDocuments" component={DriverDocumentsScreen} />
    <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
  </Stack.Navigator>
);

// ===================== AUTH STACK =====================

const AuthStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#FFFFFF' }
    }}
  >
    <Stack.Screen name="PhoneOrGoogle" component={PhoneOrGoogleScreen} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
  </Stack.Navigator>
);

// ===================== APP NAVIGATOR =====================

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Splash');

  useEffect(() => {
    const loadSavedUser = async () => {
      try {
        const userData = await getUserData();
        const userRole = await getUserRole();
        
        if (userData && userRole) {
          if (userRole === 'driver') {
            const isDriverVerified = userData?.driverProfile?.isVerified || false;
            setInitialRoute(isDriverVerified ? 'DriverStack' : 'DriverVerificationFlow');
          } else {
            setInitialRoute('RiderStack');
          }
        } else {
          setInitialRoute('AuthStack');
        }
      } catch (error) {
        console.error('Error loading saved user:', error);
        setInitialRoute('AuthStack');
      } finally {
        setIsLoading(false);
      }
    };

    // Simulate splash screen delay
    setTimeout(() => {
      loadSavedUser();
    }, 2000);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="AuthStack" component={AuthStack} />
      <Stack.Screen name="RiderStack" component={RiderStack} />
      <Stack.Screen name="DriverVerificationFlow" component={DriverVerificationFlow} />
      <Stack.Screen name="DriverStack" component={DriverStack} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
});