import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Geolocation from 'react-native-geolocation-service';
import { useDispatch } from 'react-redux';

// FIXED - using aliases:
import { saveUserData, saveUserRole, getUserData } from '@src/utils/userStorage';
import { loginSuccess } from '@store/slices/authSlice';

export default function RoleSelectionScreen({ navigation, route }) {
  // Get all user data
  const { phone, authMethod, socialUserInfo, userProfile } = route.params || {};
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'Kabaza needs access to your location to find rides and drivers',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve(position.coords);
        },
        (error) => {
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 10000 
        }
      );
    });
  };

  // ✅ FIXED FUNCTION - Now with proper navigation
  const handleRoleSelection = async (role) => {
    setLoading(true);
    setSelectedRole(role);
    setError(null);

    try {
      // Validation checks
      if (!phone && !socialUserInfo) {
        throw new Error('User information missing. Please restart registration.');
      }
      
      if (!userProfile?.firstName || !userProfile?.surname) {
        throw new Error('Profile information incomplete.');
      }

      // Request location permission
      const hasLocationPermission = await requestLocationPermission();
      if (!hasLocationPermission) {
        throw new Error('Location permission is required to use Kabaza services.');
      }

      // Get current location
      let userLocation = null;
      try {
        userLocation = await getCurrentLocation();
        console.log('📍 Location obtained:', userLocation);
      } catch (locationError) {
        console.warn('Location fetch failed, continuing without location:', locationError);
        Alert.alert(
          'Location Service',
          'Unable to get your current location. You can still use the app, but some features may not work properly.',
          [{ text: 'Continue' }]
        );
      }

      // Save user data to AsyncStorage
      const userData = {
        phone,
        authMethod,
        socialUserInfo,
        userProfile,
        userRole: role,
        userLocation,
        isLoggedIn: true,
        registrationComplete: true,
        timestamp: new Date().toISOString()
      };

      // Save to persistent storage
      await saveUserData(userData);
      await saveUserRole(role);

      console.log('✅ User data and role saved successfully');
      
      // Update Redux store
      dispatch(loginSuccess({
        user: userData,
        token: null,
        role: role,
        location: userLocation
      }));

      // ✅ ✅ ✅ CRITICAL FIX: Add Navigation Here! ✅ ✅ ✅
      if (role === 'rider') {
        console.log('🚗 Navigating to RiderMain (RiderStack)');
        // Use replace so user can't go back to role selection
        navigation.replace('RiderMain', { userData });
      } else if (role === 'driver') {
        console.log('🚗 Navigating to DriverVerification');
        // Always go to verification for new drivers
        navigation.replace('DriverVerification', { userData });
      }

    } catch (err) {
      console.error('❌ Role selection error:', err);
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <View style={styles.container}>
      {/* Kabaza Logo */}
      <Text style={styles.logo}>Kabaza</Text>
      
      {/* Welcome Text */}
      <Text style={styles.title}>Choose Your Role</Text>

      {/* Registration Context */}
      <View style={styles.contextContainer}>
        {authMethod === 'phone' && phone && (
          <View style={styles.contextItem}>
            <View style={styles.checkbox}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>Registered with phone: {phone}</Text>
          </View>
        )}
        
        {userProfile?.fullName && (
          <View style={styles.contextItem}>
            <View style={[styles.checkbox, styles.checked]}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>Profile: {userProfile.fullName}</Text>
          </View>
        )}

        {/* Location permission info */}
        <View style={styles.contextItem}>
          <View style={[styles.checkbox]}>
            <Icon name="map-marker" size={12} color="#fff" />
          </View>
          <Text style={styles.contextText}>Location access required for services</Text>
        </View>
      </View>

      {/* Error Message Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={16} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Role Selection Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[
            styles.roleButton, 
            selectedRole === 'rider' && styles.roleButtonSelected,
            (loading || error) && styles.roleButtonDisabled
          ]} 
          onPress={() => handleRoleSelection('rider')}
          activeOpacity={0.8}
          disabled={loading || error}
        >
          {loading && selectedRole === 'rider' ? (
            <ActivityIndicator size="small" color="#00B894" />
          ) : (
            <>
              <View style={styles.roleIconContainer}>
                <Icon name="user" size={24} color="#00B894" />
              </View>
              <Text style={styles.roleButtonText}>Continue as Passenger</Text>
              <Text style={styles.roleDescription}>Book rides and get around town</Text>
              <Text style={styles.locationNote}>📍 Location required</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.roleButton, 
            selectedRole === 'driver' && styles.roleButtonSelected,
            (loading || error) && styles.roleButtonDisabled
          ]} 
          onPress={() => handleRoleSelection('driver')}
          activeOpacity={0.8}
          disabled={loading || error}
        >
          {loading && selectedRole === 'driver' ? (
            <ActivityIndicator size="small" color="#00B894" />
          ) : (
            <>
              <View style={styles.roleIconContainer}>
                <Icon name="car" size={24} color="#00B894" />
              </View>
              <Text style={styles.roleButtonText}>Continue as Driver</Text>
              <Text style={styles.roleDescription}>Earn money by giving rides</Text>
              <Text style={styles.locationNote}>📍 Location required</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Message */}
      {loading && (
        <Text style={styles.loadingText}>
          {selectedRole === 'rider' ? 'Setting up passenger account...' : 'Setting up driver account...'}
        </Text>
      )}

      {/* Footer Text */}
      <Text style={styles.footerText}>
        You can always switch roles later in settings
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#00B894',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  contextContainer: {
    marginBottom: 30,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
  },
  checked: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  contextText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  buttonsContainer: {
    marginBottom: 30,
  },
  roleButton: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  roleButtonSelected: {
    borderColor: '#00B894',
    backgroundColor: 'rgba(0, 184, 148, 0.05)',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleIconContainer: {
    marginBottom: 8,
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  locationNote: {
    fontSize: 12,
    color: '#00B894',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#00B894',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
  },
});