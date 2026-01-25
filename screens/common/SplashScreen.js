// screens/common/SplashScreen.js - FIXED VERSION
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation();
  
  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const reverseRotateAnim = useRef(new Animated.Value(0)).current; // ✅ ADDED: Separate for reverse rotation
  const waveAnim = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(1)).current;
  const dotScale2 = useRef(new Animated.Value(1)).current;
  const dotScale3 = useRef(new Animated.Value(1)).current;

  const startAnimations = () => {
    // Sequence animations for better flow
    Animated.sequence([
      // Initial fade and slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Start continuous animations
      Animated.delay(300),
    ]).start(() => {
      // Start rotating animation after initial animations
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // ✅ FIXED: Start reverse rotation separately
      Animated.loop(
        Animated.timing(reverseRotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Start wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Start loading dots animation
      startDotsAnimation();
    });
  };

  const startDotsAnimation = () => {
    // Create pulsating dots animation
    const createPulse = (dot) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1.3,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );
    };

    // Stagger the dot animations
    setTimeout(() => createPulse(dotScale1).start(), 0);
    setTimeout(() => createPulse(dotScale2).start(), 200);
    setTimeout(() => createPulse(dotScale3).start(), 400);
  };

  const checkAuthentication = async () => {
    try {
      // Check multiple storage items in parallel for better performance
      const [authToken, userType, hasSeenOnboarding] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('user_type'),
        AsyncStorage.getItem('has_seen_onboarding'),
      ]);
      
      // Add a small delay for better UX (shows animations completely)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!hasSeenOnboarding) {
        navigation.replace('OnboardingScreen');
      } else if (authToken) {
        if (userType === 'driver') {
          navigation.replace('DriverStack');
        } else {
          navigation.replace('RiderStack');
        }
      } else {
        navigation.replace('PhoneOrGoogle');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Fallback with smooth transition
      setTimeout(() => {
        if (navigation?.replace) {
          navigation.replace('PhoneOrGoogle');
        }
      }, 1000);
    }
  };

  useEffect(() => {
    startAnimations();
    
    const attemptNavigation = async () => {
      try {
        if (navigation && typeof navigation.replace === 'function') {
          await checkAuthentication();
        } else {
          console.warn('Navigation not ready, retrying...');
          setTimeout(attemptNavigation, 500);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        setTimeout(() => {
          if (navigation?.replace) {
            navigation.replace('PhoneOrGoogle');
          }
        }, 1500);
      }
    };
    
    // Increased delay for better animation display
    const timer = setTimeout(() => {
      attemptNavigation();
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigation]);

  // ✅ FIXED: Create separate interpolations
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseRotate = reverseRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
  });

  // SVG Wave Component
  const WaveBackground = () => (
    <Animated.View 
      style={[
        styles.waveContainer,
        { transform: [{ translateX: waveTranslateX }] }
      ]}
    >
      <Svg
        height="100%"
        width={width * 2}
        viewBox={`0 0 ${width * 2} 120`}
        style={styles.waveSvg}
      >
        <Defs>
          <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#16A34A" stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0,60 Q${width/4},20 ${width/2},60 T${width},60 T${width*1.5},60 T${width*2},60 V120 H0 Z`}
          fill="url(#waveGradient)"
        />
      </Svg>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#22C55E" 
        translucent 
      />

      {/* Animated Gradient Background */}
      <Animated.View 
        style={[
          styles.background,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.gradientOverlay} />
      </Animated.View>

      {/* Animated Wave */}
      <WaveBackground />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo with enhanced animation */}
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
          <View style={styles.logoOuterRing}>
            {/* ✅ FIXED: Use reverseRotate directly (not nested interpolation) */}
            <Animated.View 
              style={[
                styles.logoMiddleRing,
                { transform: [{ rotate: reverseRotate }] }
              ]}
            >
              <View style={styles.logoInnerRing}>
                <View style={styles.logoCore}>
                  <Text style={styles.logoText}>K</Text>
                </View>
              </View>
            </Animated.View>
          </View>
          
          {/* Floating particles */}
          <Animated.View style={[styles.particle, styles.particle1]} />
          <Animated.View style={[styles.particle, styles.particle2]} />
          <Animated.View style={[styles.particle, styles.particle3]} />
        </Animated.View>

        {/* App Name with enhanced typography */}
        <Animated.View 
          style={[
            styles.appNameContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          <Text style={styles.appName}>Kabaza</Text>
          <Text style={styles.appTagline}>Ride • Earn • Connect</Text>
        </Animated.View>

        {/* Enhanced Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <Animated.View 
              style={[
                styles.loadingDot,
                { 
                  opacity: fadeAnim,
                  transform: [{ scale: dotScale1 }]
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.loadingDot,
                { 
                  opacity: fadeAnim,
                  transform: [{ scale: dotScale2 }]
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.loadingDot,
                { 
                  opacity: fadeAnim,
                  transform: [{ scale: dotScale3 }]
                }
              ]} 
            />
          </View>
          <Animated.Text 
            style={[
              styles.loadingText,
              { opacity: fadeAnim }
            ]}
          >
            Preparing your experience...
          </Animated.Text>
        </View>

        {/* Version Info with subtle animation */}
        <Animated.View 
          style={[
            styles.versionContainer,
            { opacity: fadeAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0, 1]
            })}
          ]}
        >
          <Text style={styles.versionText}>v2.0.1 • Premium Edition</Text>
          <Text style={styles.copyrightText}>© 2024 Kabaza Malawi • All rights reserved</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#22C55E',
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#22C55E',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  logoContainer: {
    marginBottom: 50,
    position: 'relative',
  },
  logoOuterRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  logoMiddleRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22C55E',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  particle1: {
    top: 20,
    right: 30,
  },
  particle2: {
    bottom: 40,
    left: 20,
  },
  particle3: {
    bottom: 20,
    right: 40,
  },
  appNameContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 1.5,
  },
  appTagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 3,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  loadingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    fontWeight: '500',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
    fontWeight: '500',
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
  },
});