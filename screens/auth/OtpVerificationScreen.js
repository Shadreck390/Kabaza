 // screens/auth/OtpVerificationScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Loading from '@components/Loading';
import { saveUserData, saveAuthToken } from '@utils/userStorage';
import { formatPhoneNumber } from '@utils/phoneUtils';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function OtpVerificationScreen({ navigation, route }) {
  const { phoneNumber, socialUserInfo, authMethod } = route.params || {};

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Format phone number (same as your RiderHomeScreen patterns)
  const formatDisplayPhone = (phone) => {
    if (!phone) return '+265 XXX XXX XXX';
    let cleanPhone = phone.replace('+undefined', '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+265' + cleanPhone;
    }
    // Format: +265 XXX XXX XXX
    return cleanPhone.replace(/(\+\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const verificationInfo = {
    title: 'Verify Your Number',
    description: 'Enter the 6-digit code sent to',
    displayText: formatDisplayPhone(phoneNumber),
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

    // Timer setup
    if (timer <= 0) return setCanResend(true);
    const countdown = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(countdown);
  }, [timer]);

  // Enhanced OTP input handling with animations
  const handleOtpChange = (value, index) => {
    const otpArray = [...otp];

    // Paste handling with animation
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      pasted.forEach((v, i) => (otpArray[i] = v));
      setOtp(otpArray);

      // Animate the paste
      Animated.sequence([
        Animated.timing(inputScale, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(inputScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const lastIndex = Math.min(pasted.length, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    // Single digit input with animation
    otpArray[index] = value;
    setOtp(otpArray);

    // Input animation
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

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Enhanced verification with animations
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      // Shake animation for invalid input
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);

    // Button press animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
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

    // Simulate verification (like your RiderHomeScreen)
    setTimeout(async () => {
      setLoading(false);

      // Save user data to storage
      try {
        const userData = {
          phoneNumber: formatDisplayPhone(phoneNumber),
          verified: true,
          verifiedAt: new Date().toISOString(),
          authMethod,
          ...(socialUserInfo && { socialUserInfo }),
          // Add rider-specific defaults
          userType: 'rider',
          profileCompleted: false,
          createdAt: new Date().toISOString(),
        };

        await saveUserData(userData);
        await saveAuthToken(`rider_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        console.log('Rider user data saved successfully');

        // Navigate to profile completion with animation
        navigation.navigate('ProfileCompletion', {
          phoneNumber: formatDisplayPhone(phoneNumber),
          socialUserInfo,
          authMethod,
          verified: true,
        });

      } catch (error) {
        console.error('Error saving rider data:', error);
        Alert.alert('Error', 'Failed to save user data. Please try again.');
      }
    }, 2000);
  };

  // Enhanced resend with animations
  const handleResendOtp = () => {
    if (!canResend) return;

    // Button animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.9,
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

    setOtp(new Array(6).fill(''));
    setTimer(60);
    setCanResend(false);
    inputRefs.current[0]?.focus();

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Code Sent', `A new code has been sent to ${verificationInfo.displayText}`);
    }, 1000);
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button with animation */}
        <AnimatedView
          style={[
            styles.backButtonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </AnimatedView>

        {/* Header Section with animations */}
        <AnimatedView
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#00a82d', '#00c853']}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="verified-user" size={48} color="#fff" />
          </LinearGradient>

          <Animated.Text
            style={[
              styles.title,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {verificationInfo.title}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.description,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {verificationInfo.description}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.phoneNumber,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {verificationInfo.displayText}
          </Animated.Text>
        </AnimatedView>

        {/* OTP Input Section */}
        <AnimatedView
          style={[
            styles.otpSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.otpLabel}>Enter 6-digit code</Text>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.otpInputWrapper,
                  {
                    transform: [{ scale: inputScale }],
                  },
                ]}
              >
                <TextInput
                  ref={ref => inputRefs.current[index] = ref}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={value => handleOtpChange(value, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1}
                  selectTextOnFocus
                />
                {index < 5 && (
                  <View style={styles.otpDivider} />
                )}
              </Animated.View>
            ))}
          </View>
        </AnimatedView>

        {/* Verify Button with animation */}
        <AnimatedView
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!isOtpComplete || loading) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={!isOtpComplete || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isOtpComplete && !loading ? ['#00a82d', '#00c853'] : ['#ccc', '#ddd']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.verifyButtonText}>
                {loading ? (
                  <>
                    <MaterialIcon name="hourglass-empty" size={20} color="#fff" />
                    {' Verifying...'}
                  </>
                ) : 'Verify & Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedView>

        {/* Resend Section */}
        <AnimatedView
          style={[
            styles.resendContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.resendRow}>
            <MaterialIcon name="timer" size={16} color="#666" />
            <Text style={styles.resendText}>
              {canResend ? 'Ready to resend?' : `Resend code in ${timer}s`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleResendOtp}
            disabled={!canResend || loading}
            style={styles.resendButton}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.resendButtonText,
              (!canResend || loading) && styles.resendButtonTextDisabled,
            ]}>
              <MaterialIcon name="refresh" size={16} color={canResend && !loading ? '#00a82d' : '#999'} />
              {' Resend Code'}
            </Text>
          </TouchableOpacity>
        </AnimatedView>

        {/* Help Info with animation */}
        <AnimatedView
          style={[
            styles.helpContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <MaterialIcon name="info" size={20} color="#00a82d" />
          <Text style={styles.helpText}>
            Check your SMS messages. The code may take a moment to arrive.
          </Text>
        </AnimatedView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <Loading message="Verifying your code..." type="spinner" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButtonContainer: {
    marginBottom: 20,
  },
  backButton: {
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#00a82d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '400',
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
  otpSection: {
    marginBottom: 40,
  },
  otpLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  otpInputWrapper: {
    position: 'relative',
    flex: 1,
    marginHorizontal: 4,
  },
  otpInput: {
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  otpInputFilled: {
    borderColor: '#00a82d',
    backgroundColor: '#fff',
    shadowColor: '#00a82d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otpDivider: {
    position: 'absolute',
    right: -8,
    top: '50%',
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    transform: [{ translateY: -15 }],
  },
  buttonContainer: {
    marginBottom: 30,
  },
  verifyButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendButtonTextDisabled: {
    color: '#999',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f7e9',
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});