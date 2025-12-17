import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Loading from '@components/Loading';

export default function OtpVerificationScreen({ navigation, route }) {
  // FIXED: Better handling of route params with fallbacks
  const { phoneNumber, socialUserInfo, authMethod } = route.params || {};
  
  // FIXED: Proper phone number formatting
  const formatPhoneNumber = (phone) => {
    if (!phone) return '+265 XXX XXX XXX';
    
    // Remove any existing +undefined prefix
    let cleanPhone = phone.replace('+undefined', '');
    
    // Ensure it starts with +
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+265' + cleanPhone;
    }
    
    return cleanPhone;
  };

  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // FIXED: Better verification info with formatted phone number
  const getVerificationInfo = () => {
    if (authMethod === 'phone') {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      return {
        title: 'Verify Your Number',
        description: 'We\'ve sent a 6-digit code to',
        displayText: formattedPhone,
        resendTarget: formattedPhone
      };
    } else {
      return {
        title: 'Verify Your Account',
        description: `We've sent a 6-digit code to your ${authMethod} account`,
        displayText: socialUserInfo?.email || 'your email',
        resendTarget: socialUserInfo?.email
      };
    }
  };

  const verificationInfo = getVerificationInfo();

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return setCanResend(true);
    const countdown = setInterval(() => setTimer(prev => prev - 1), 1000);
    return () => clearInterval(countdown);
  }, [timer]);

  // Handle OTP input changes
  const handleOtpChange = (value, index) => {
    const otpArray = [...otp];
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      pasted.forEach((v, i) => (otpArray[i] = v));
      setOtp(otpArray);
      const lastIndex = Math.min(pasted.length, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    otpArray[index] = value;
    setOtp(otpArray);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      return Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
    }

    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      // FIXED: Pass formatted phone number to next screen
      navigation.navigate('ProfileCompletion', {
        phoneNumber: formatPhoneNumber(phoneNumber),
        socialUserInfo,
        authMethod,
        verified: true,
      });
    }, 2000);
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setOtp(new Array(6).fill(''));
    setTimer(60);
    setCanResend(false);
    inputRefs.current[0]?.focus();

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Code Sent', `A new code has been sent to ${verificationInfo.resendTarget}`);
    }, 1000);
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>{verificationInfo.title}</Text>
        <Text style={styles.description}>{verificationInfo.description}</Text>
        <Text style={styles.phoneNumber}>{verificationInfo.displayText}</Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputRefs.current[index] = ref}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? 6 : 1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (!isOtpComplete || loading) && styles.verifyButtonDisabled]}
          onPress={handleVerifyOtp}
          disabled={!isOtpComplete || loading}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResendOtp} disabled={!canResend || loading}>
            <Text style={[styles.resendButtonText, (!canResend || loading) && styles.resendButtonTextDisabled]}>
              {canResend ? 'Resend Code' : `Resend in ${timer}s`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Icon name="info-circle" size={16} color="#666" />
          <Text style={styles.helpText}>
            {authMethod === 'phone' 
              ? 'Make sure you have good network connection and check your SMS inbox'
              : 'Check your email inbox and spam folder for the verification code'
            }
          </Text>
        </View>

        {loading && <Loading message="Verifying..." type="spinner" />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, padding: 25, backgroundColor: '#fff' },
  backButton: { alignSelf: 'flex-start', padding: 10, marginBottom: 20, marginTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#333' },
  description: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 5 },
  phoneNumber: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: '#333', marginBottom: 40 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpInput: { width: 50, height: 60, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: '600', color: '#333', backgroundColor: '#fafafa' },
  otpInputFilled: { borderColor: '#6c3', backgroundColor: '#fff' },
  verifyButton: { backgroundColor: '#6c3', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  verifyButtonDisabled: { backgroundColor: '#ccc' },
  verifyButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  resendText: { fontSize: 14, color: '#666', marginRight: 5 },
  resendButtonText: { fontSize: 14, color: '#6c3', fontWeight: '600' },
  resendButtonTextDisabled: { color: '#999' },
  helpContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 },
  helpText: { fontSize: 12, color: '#666', marginLeft: 8, flex: 1, textAlign: 'center' },
});