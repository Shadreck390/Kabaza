// screens/common/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');


export default function SplashScreen() {
  const navigation = useNavigation();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    startAnimations();
    
    // Check authentication and navigate
    const timer = setTimeout(() => {
      checkAuthentication();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const startAnimations = () => {
    // Parallel animations
    Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      
      // Slide up
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      
      // Scale up
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      
      // Rotate (continuous)
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();
  };

  const checkAuthentication = async () => {
    try {
      // Check if user is logged in
      const authToken = await AsyncStorage.getItem('auth_token');
      const userType = await AsyncStorage.getItem('user_type');
      const hasSeenOnboarding = await AsyncStorage.getItem('has_seen_onboarding');
      
      if (!hasSeenOnboarding) {
        // First time user - show onboarding
        navigation.replace('OnboardingScreen');
      } else if (authToken) {
        // User is logged in - go to appropriate home screen
        if (userType === 'driver') {
          navigation.replace('DriverHome');
        } else {
          navigation.replace('RiderHome');
        }
      } else {
        // Not logged in - go to login
        navigation.replace('LoginScreen');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Default to login screen on error
      navigation.replace('LoginScreen');
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#22C55E" 
        translucent 
      />

      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo Animation */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            }
          ]}
        >
          <View style={styles.logoCircle}>
            <Animated.View 
              style={[
                styles.logoInnerCircle,
                { transform: [{ rotate }] }
              ]}
            >
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>K</Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View 
          style={[
            styles.appNameContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.appName}>Kabaza</Text>
          <Text style={styles.appTagline}>Ride. Earn. Connect.</Text>
        </Animated.View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <Animated.View 
              style={[
                styles.loadingDot,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }] 
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.loadingDot,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }] 
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.loadingDot,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }] 
                }
              ]} 
            />
          </View>
          <Animated.Text 
            style={[
              styles.loadingText,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            Loading...
          </Animated.Text>
        </View>

        {/* Version Info */}
        <Animated.View 
          style={[
            styles.versionContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.versionText}>v2.0.1</Text>
          <Text style={styles.copyrightText}>© 2024 Kabaza Malawi</Text>
        </Animated.View>
      </View>

      {/* Bottom Wave */}
      <View style={styles.waveContainer}>
        <View style={styles.wave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#22C55E',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: '#22C55E',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: '#16A34A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  appNameContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  versionContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
  },
});