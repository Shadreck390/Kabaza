// screens/auth/RoleSelectionScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from 'react-native-geolocation-service';
import { useDispatch } from 'react-redux';

// Import storage functions
import { saveUserData, saveUserRole, getUserData } from '@utils/userStorage';
import { loginSuccess } from '@store/slices/authSlice';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RoleSelectionScreen({ navigation, route }) {
  // ✅ FIXED: Get ALL params and extract properly
  const params = route.params || {};
  
  // ✅ FIXED: Get phone from multiple possible sources
  const userPhone = params.phone || params.phoneNumber;
  const authMethod = params.authMethod;
  const socialUserInfo = params.socialUserInfo;
  const userProfile = params.userProfile;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const imageScale = useRef(new Animated.Value(1)).current;

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  // Role options with images
  const roleOptions = [
    {
      id: 'passenger',
      title: 'Continue as Passenger',
      description: 'Book Rides and get around Town',
      icon: 'directions-car',
      gradient: ['#00a82d', '#00c853'],
      image: require('../../assets/images/passenger-role.png'),
      requirements: '📍 Location access required',
    },
    {
      id: 'driver',
      title: 'Continue as Driver',
      description: 'Earn money by giving Rides',
      icon: 'local-taxi',
      gradient: ['#2196f3', '#21cbf3'],
      image: require('../../assets/images/driver-role.png'),
      requirements: '📍 Location access required (Verification temporarily skipped)',
    },
  ];

  // ✅✅✅ CRITICAL FIX: Add the missing function BEFORE it's called
  // Request location permission - THIS FUNCTION WAS MISSING
  const requestLocationPermission = async () => {
    console.log('📍 [DEBUG] Requesting location permission...');
    
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        console.log('📍 [DEBUG] iOS location permission status:', status);
        return status === 'granted' || status === 'authorizedWhenInUse' || status === 'authorizedAlways';
      } else {
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
        console.log('📍 [DEBUG] Android location permission result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('📍 [DEBUG] Location permission error:', error);
      return false;
    }
  };

  // ✅✅✅ FIXED: Get current location function
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 [DEBUG] Location obtained successfully:', position.coords);
          resolve(position.coords);
        },
        (error) => {
          console.error('📍 [DEBUG] Location error:', error);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 10000,
          distanceFilter: 10 
        }
      );
    });
  };

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();

    // ✅ ADDED: Debug what we received
    console.log('🔍 [DEBUG] RoleSelectionScreen received params:', params);
    console.log('🔍 [DEBUG] Extracted values:', {
      userPhone,
      authMethod,
      hasSocialInfo: !!socialUserInfo,
      userProfile: userProfile,
      hasUserProfile: !!userProfile,
      userProfileFirstName: userProfile?.firstName,
      userProfileSurname: userProfile?.surname,
    });

    // ✅ ADDED: Check if we have required data
    if (!userPhone && !socialUserInfo) {
      console.warn('⚠️ [DEBUG] No phone or social info in params');
    }
    if (!userProfile?.firstName || !userProfile?.surname) {
      console.warn('⚠️ [DEBUG] Incomplete profile in params');
    }
  }, []);

  // ✅✅✅ FIXED: Enhanced role selection with better validation
  const handleRoleSelection = async (role) => {
    // Animation for role selection
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    setLoading(true);
    setSelectedRole(role);
    setError(null);

    try {
      // ✅ FIXED: Better validation with detailed logging
      console.log('🔍 [DEBUG] Validation for role selection:', {
        role,
        userPhone,
        socialUserInfo,
        userProfile,
        hasPhone: !!userPhone,
        hasSocialInfo: !!socialUserInfo,
        hasUserProfile: !!userProfile,
        firstName: userProfile?.firstName,
        surname: userProfile?.surname,
      });

      // Get data from storage as fallback
      const storedUserData = await getUserData();
      console.log('📱 [DEBUG] Stored user data:', storedUserData);

      // Use params first, fallback to storage
      const finalPhone = userPhone || storedUserData?.phone || storedUserData?.phoneNumber;
      const finalUserProfile = userProfile || storedUserData?.profile || storedUserData?.userProfile;

      if (!finalPhone && !socialUserInfo) {
        console.error('❌ [DEBUG] Missing both phone and social info');
        console.error('   Phone from params:', userPhone);
        console.error('   Phone from storage:', storedUserData?.phone || storedUserData?.phoneNumber);
        throw new Error('User information missing. Please restart registration.');
      }
      
      if (!finalUserProfile?.firstName || !finalUserProfile?.surname) {
        console.error('❌ [DEBUG] Missing profile info');
        console.error('   Profile from params:', userProfile);
        console.error('   Profile from storage:', storedUserData?.profile || storedUserData?.userProfile);
        throw new Error('Profile information incomplete.');
      }

      console.log('✅ [DEBUG] Validation passed:', {
        finalPhone,
        finalUserProfileName: `${finalUserProfile.firstName} ${finalUserProfile.surname}`,
      });

      // ✅✅✅ FIXED: Temporarily skip location permission for testing
      // Comment out this block to disable location permission check
      console.log('📍 [DEBUG] Checking location permission...');
      const hasLocationPermission = await requestLocationPermission();
      
      if (!hasLocationPermission) {
        console.warn('⚠️ [DEBUG] Location permission not granted, but continuing for testing');
        // For testing, continue anyway with a default location
        // Uncomment to enable strict location requirement:
        // throw new Error('Location permission is required to use Kabaza services.');
      }

      // Get current location (optional)
      let userLocation = null;
      try {
        if (hasLocationPermission) {
          userLocation = await getCurrentLocation();
          console.log('📍 [DEBUG] Real location obtained:', userLocation);
        } else {
          // Use default location for Lilongwe
          userLocation = {
            latitude: -13.9626,
            longitude: 33.7741,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
            accuracy: 100,
          };
          console.log('📍 [DEBUG] Using default location:', userLocation);
        }
      } catch (locationError) {
        console.warn('📍 [DEBUG] Location fetch failed, using default location:', locationError);
        userLocation = {
          latitude: -13.9626,
          longitude: 33.7741,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
          accuracy: 100,
        };
      }

      // ✅ FIXED: Save user data to storage with enhanced structure
      const userData = {
        // Basic info
        phone: finalPhone,
        phoneNumber: finalPhone, // Save both for compatibility
        authMethod: authMethod || 'phone',
        socialUserInfo,
        userProfile: finalUserProfile,
        userRole: role,
        
        // Location
        location: userLocation,
        
        // Status flags
        isLoggedIn: true,
        registrationComplete: true,
        
        // Profile completion
        profileCompleted: true,
        completedAt: new Date().toISOString(),
        
        // App settings
        settings: {
          notifications: true,
          darkMode: false,
          language: 'en',
          preferredRole: role,
        },
        
        // Timestamps
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // Save to persistent storage
      console.log('💾 [DEBUG] Saving user data to storage...');
      await saveUserData(userData);
      await saveUserRole(role);

      console.log(`✅ [DEBUG] ${role.charAt(0).toUpperCase() + role.slice(1)} role saved successfully`);

      // Update Redux store
      console.log('🔄 [DEBUG] Updating Redux store...');
      dispatch(loginSuccess({
        user: userData,
        token: null,
        role: role,
        location: userLocation,
      }));

      // ✅✅✅ FIXED: Navigation with proper screens
      console.log('🚀 [DEBUG] Navigating to next screen...');
      setTimeout(() => {
        if (role === 'passenger') {
          console.log('🧭 [DEBUG] Navigating to RiderStack...');
          navigation.replace('RiderStack', { 
            userData,
            screen: 'RiderHome' // Explicitly set the screen
          });
        } else if (role === 'driver') {
          console.log('🧭 [DEBUG] Navigating to DriverHomeScreen (skipping verification)...');
          navigation.replace('DriverStack', { 
            userData,
            screen: 'DriverHome' // Navigate directly to driver home, skip verification
          });
        } else {
          // Default fallback
          console.log('🧭 [DEBUG] Default navigation to RiderStack...');
          navigation.replace('RiderStack', { 
            userData,
            screen: 'RiderHome' // Explicitly set the screen
          });
        }
      }, 300);

    } catch (err) {
      console.error('❌ [DEBUG] Role selection error:', err);
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Retry animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderRoleCard = (role, index) => {
    const delay = index * 100;
    const isSelected = selectedRole === role.id;
    const isLoading = loading && selectedRole === role.id;

    return (
      <AnimatedView
        key={role.id}
        style={[
          styles.roleCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.roleButton,
            isSelected && styles.roleButtonSelected,
            (loading && !isSelected) && styles.roleButtonDisabled,
          ]}
          onPress={() => handleRoleSelection(role.id)}
          disabled={loading}
          activeOpacity={0.8}
        >
          {/* Role Image/Icon */}
          <AnimatedView style={styles.roleImageContainer}>
            {role.image ? (
              <Image
                source={role.image}
                style={styles.roleImage}
                resizeMode="contain"
              />
            ) : (
              <LinearGradient
                colors={role.gradient}
                style={styles.roleIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name={role.icon} size={32} color="#fff" />
              </LinearGradient>
            )}
          </AnimatedView>

          {/* Role Content */}
          <View style={styles.roleContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#00a82d" />
            ) : (
              <>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
                <View style={styles.requirementsContainer}>
                  <MaterialIcon name="location-on" size={14} color="#666" />
                  <Text style={styles.requirementsText}>{role.requirements}</Text>
                </View>
              </>
            )}
          </View>

          {/* Selection Indicator */}
          {isSelected && !isLoading && (
            <AnimatedView style={styles.selectionIndicator}>
              <MaterialIcon name="check-circle" size={24} color="#00a82d" />
            </AnimatedView>
          )}
        </TouchableOpacity>
      </AnimatedView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedView
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            disabled={loading}
          >
            <MaterialIcon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          <Animated.Text
            style={[
              styles.title,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            Choose Your Role
          </Animated.Text>

          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            How would you like to use Kabaza?
          </Animated.Text>
        </View>

        {/* User Info Summary */}
        <AnimatedView
          style={[
            styles.userInfoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.userInfoRow}>
            <MaterialIcon name="verified-user" size={18} color="#00a82d" />
            <Text style={styles.userInfoText}>Profile Completed ✓</Text>
          </View>
          
          {userProfile?.fullName && (
            <View style={styles.userInfoRow}>
              <MaterialIcon name="person" size={18} color="#666" />
              <Text style={styles.userInfoText}>{userProfile.fullName}</Text>
            </View>
          )}
          
          {/* ✅ FIXED: Use userPhone instead of phone */}
          {userPhone && (
            <View style={styles.userInfoRow}>
              <MaterialIcon name="phone" size={18} color="#666" />
              <Text style={styles.userInfoText}>{userPhone}</Text>
            </View>
          )}
        </AnimatedView>

        {/* Error Message */}
        {error && (
          <AnimatedView
            style={[
              styles.errorContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.errorContent}>
              <MaterialIcon name="error" size={20} color="#fff" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleRetry}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>
        )}

        {/* Role Selection Cards */}
        <AnimatedView
          style={[
            styles.rolesContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {roleOptions.map((role, index) => renderRoleCard(role, index))}
        </AnimatedView>

        {/* Loading Message */}
        {loading && (
          <AnimatedView
            style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <ActivityIndicator size="large" color="#00a82d" />
            <Text style={styles.loadingText}>
              Setting up {selectedRole} account...
            </Text>
          </AnimatedView>
        )}

        {/* Footer Note */}
        <AnimatedView
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.footerText}>
            You can switch roles anytime in settings
          </Text>
          <Text style={styles.footerNote}>
            Each role has different features and requirements
          </Text>
        </AnimatedView>
      </AnimatedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '400',
  },
  userInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#ff6b6b',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    marginRight: 16,
    fontWeight: '500',
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  rolesContainer: {
    marginBottom: 32,
  },
  roleCard: {
    marginBottom: 16,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 120,
  },
  roleButtonSelected: {
    borderColor: '#00a82d',
    backgroundColor: '#f0fff4',
    shadowColor: '#00a82d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleImageContainer: {
    marginRight: 20,
  },
  roleImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  requirementsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});