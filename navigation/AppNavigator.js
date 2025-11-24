import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';

const Stack = createStackNavigator();

// Fallback component for missing screens
const FallbackScreen = ({ route }) => (
  <View style={styles.fallbackContainer}>
    <Text style={styles.fallbackText}>Screen: {route?.name}</Text>
    <Text style={styles.fallbackSubtext}>Screen file issue</Text>
  </View>
);

// ✅ CORRECT: Import screens WITHOUT JS_ prefix
let PhoneOrGoogleScreen, OtpVerificationScreen, ProfileCompletionScreen, RoleSelectionScreen;
let RiderHomeScreen, DriverHomeScreen, EarningsScreen, ProfileScreen;

try {
  PhoneOrGoogleScreen = require('../screens/auth/PhoneOrGoogleScreen').default;
  console.log('✅ PhoneOrGoogleScreen imported successfully');
} catch (e) {
  console.error('❌ PhoneOrGoogleScreen import failed:', e.message);
  PhoneOrGoogleScreen = FallbackScreen;
}

try {
  OtpVerificationScreen = require('../screens/auth/OtpVerificationScreen').default;
  console.log('✅ OtpVerificationScreen imported successfully');
} catch (e) {
  console.error('❌ OtpVerificationScreen import failed:', e.message);
  OtpVerificationScreen = FallbackScreen;
}

try {
  ProfileCompletionScreen = require('../screens/auth/ProfileCompletionScreen').default;
  console.log('✅ ProfileCompletionScreen imported successfully');
} catch (e) {
  console.error('❌ ProfileCompletionScreen import failed:', e.message);
  ProfileCompletionScreen = FallbackScreen;
}

try {
  RoleSelectionScreen = require('../screens/auth/RoleSelectionScreen').default;
  console.log('✅ RoleSelectionScreen imported successfully');
} catch (e) {
  console.error('❌ RoleSelectionScreen import failed:', e.message);
  RoleSelectionScreen = FallbackScreen;
}

try {
  RiderHomeScreen = require('../screens/rider/RiderHomeScreen').default;
  console.log('✅ RiderHomeScreen imported successfully');
} catch (e) {
  console.error('❌ RiderHomeScreen import failed:', e.message);
  RiderHomeScreen = FallbackScreen;
}

try {
  DriverHomeScreen = require('../screens/driver/DriverHomeScreen').default;
  console.log('✅ DriverHomeScreen imported successfully');
} catch (e) {
  console.error('❌ DriverHomeScreen import failed:', e.message);
  DriverHomeScreen = FallbackScreen;
}

try {
  EarningsScreen = require('../screens/driver/EarningsScreen').default;
  console.log('✅ EarningsScreen imported successfully');
} catch (e) {
  console.error('❌ EarningsScreen import failed:', e.message);
  EarningsScreen = FallbackScreen;
}

try {
  ProfileScreen = require('../screens/profile/ProfileScreen').default;
  console.log('✅ ProfileScreen imported successfully');
} catch (e) {
  console.error('❌ ProfileScreen import failed:', e.message);
  ProfileScreen = FallbackScreen;
}

// ----- Rider Stack -----
const RiderStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RiderHome" component={RiderHomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// ----- Driver Stack -----
const DriverStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
    <Stack.Screen name="Earnings" component={EarningsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// ----- App Navigator -----
export default function AppNavigator() {
  // Safe Redux state access
  const authState = useSelector(state => {
    if (!state || !state.auth) {
      console.warn('⚠️ Redux auth state not available');
      return { user: null, role: null };
    }
    return state.auth;
  });

  const { user, role } = authState;

  console.log('🔐 Navigation State - User:', !!user, 'Role:', role);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 🔐 AUTH FLOW
          <>
            <Stack.Screen name="PhoneOrGoogle" component={PhoneOrGoogleScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
            <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          </>
        ) : role === 'driver' ? (
          // 🚗 DRIVER FLOW
          <Stack.Screen name="DriverStack" component={DriverStack} />
        ) : (
          // 🛵 RIDER FLOW
          <Stack.Screen name="RiderStack" component={RiderStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
  },
});