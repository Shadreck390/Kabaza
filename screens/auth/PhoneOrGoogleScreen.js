import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import InternationalPhoneNumberInput from 'react-native-international-phone-number';

export default function PhoneOrGoogleScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socialAuthMethod, setSocialAuthMethod] = useState(null);
  const [socialUserInfo, setSocialUserInfo] = useState(null);

  // ✅ FIXED: Clean phone number input
  const handlePhoneNumberChange = (input) => {
    // Remove any non-digit characters (spaces, dashes, etc.)
    const cleanedInput = input.replace(/\D/g, '');
    setPhoneNumber(cleanedInput);
  };

  const handleSelectedCountryChange = (country) => {
    setSelectedCountry(country);
  };

  const handleContinue = () => {
    if (phoneNumber && phoneNumber.length >= 10) {
      // ✅ FIXED: Check if callingCode exists and is valid
      let fullPhoneNumber;

      if (selectedCountry?.callingCode) {
        // Remove any non-digit characters from phone number
        const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
        fullPhoneNumber = `+${selectedCountry.callingCode}${cleanedPhoneNumber}`;
      } else {
        // Default to Malawi country code if none selected
        const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
        fullPhoneNumber = `+265${cleanedPhoneNumber}`;
      }

      console.log('✅ Sending phone number:', fullPhoneNumber); // Debug log

      navigation.navigate('OtpVerification', { 
        phoneNumber: fullPhoneNumber,
        authMethod: 'phone',
      });
    } else {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number to continue.');
    }
  };

  // Mock Google Sign In
  const handleGoogleSignIn = () => {
    setLoading(true);
    
    setTimeout(() => {
      const mockUserInfo = {
        name: 'John Doe',
        givenName: 'John',
        familyName: 'Doe',
        email: 'john.doe@gmail.com',
        id: '123456789'
      };
      
      setSocialUserInfo(mockUserInfo);
      setSocialAuthMethod('google');
      setLoading(false);
      
      Alert.alert(
        'Google Sign In Successful',
        `Welcome ${mockUserInfo.name}! Please verify your phone number to continue.`,
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  // Mock Facebook Sign In
  const handleFacebookSignIn = () => {
    setLoading(true);
    
    setTimeout(() => {
      const mockUserInfo = {
        name: 'Jane Smith',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@facebook.com',
        id: '987654321'
      };
      
      setSocialUserInfo(mockUserInfo);
      setSocialAuthMethod('facebook');
      setLoading(false);
      
      Alert.alert(
        'Facebook Sign In Successful',
        `Welcome ${mockUserInfo.name}! Please verify your phone number to continue.`,
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  // ✅ FIXED: Updated with same cleaning logic
  const handleSocialContinue = () => {
    if (phoneNumber && phoneNumber.length >= 10) {
      // ✅ FIXED: Check if callingCode exists and is valid
      let fullPhoneNumber;

      if (selectedCountry?.callingCode) {
        // Remove any non-digit characters from phone number
        const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
        fullPhoneNumber = `+${selectedCountry.callingCode}${cleanedPhoneNumber}`;
      } else {
        // Default to Malawi country code if none selected
        const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
        fullPhoneNumber = `+265${cleanedPhoneNumber}`;
      }
      
      console.log('✅ Sending phone number (social):', fullPhoneNumber); // Debug log
      
      navigation.navigate('OtpVerification', { 
        phoneNumber: fullPhoneNumber,
        authMethod: socialAuthMethod,
        socialUserInfo: socialUserInfo,
      });
      // Reset social auth state
      setSocialAuthMethod(null);
      setSocialUserInfo(null);
    } else {
      Alert.alert('Phone Required', 'Please enter a valid phone number to continue.');
    }
  };

  // Go back to main login options
  const handleBackToOptions = () => {
    setSocialAuthMethod(null);
    setSocialUserInfo(null);
    setPhoneNumber('');
    setSelectedCountry(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Kabaza Logo */}
        <Text style={styles.logo}>Kabaza</Text>
        
        {/* Promotional Text */}
        <Text style={styles.promoText}>
          New to Kabaza ? Enjoy up to 50% off on your first ride-hailing trips!
        </Text>

        {/* Show different states based on social auth */}
        {socialAuthMethod ? (
          <>
            {/* Success message after social login */}
            <View style={styles.successContainer}>
              <Icon 
                name={socialAuthMethod === 'google' ? 'google' : 'facebook'} 
                size={24} 
                color={socialAuthMethod === 'google' ? '#DB4437' : '#4267B2'} 
              />
              <Text style={styles.successText}>
                {socialAuthMethod === 'google' ? 'Google' : 'Facebook'} Sign In Successful!
              </Text>
              {socialUserInfo && (
                <Text style={styles.userInfoText}>
                  Welcome, {socialUserInfo.name}!
                </Text>
              )}
              <Text style={styles.verificationText}>
                Please verify your phone number to continue
              </Text>
            </View>

            {/* Phone number input for verification */}
            <Text style={styles.phoneLabel}>Enter your phone number</Text>
            
            {/* International Phone Number Input - FIXED: Malawi as default */}
            <InternationalPhoneNumberInput
              value={phoneNumber}
              onChangePhoneNumber={handlePhoneNumberChange}
              onChangeSelectedCountry={handleSelectedCountryChange}
              defaultCountry="MW" // Changed from "US" to "MW" for Malawi
              phoneInputStyles={styles.phoneInput}
              modalSearchInputStyles={styles.searchInput}
            />

            {/* Verify Phone Button */}
            <TouchableOpacity 
              style={[styles.continueButton, styles.socialContinueButton]} 
              onPress={handleSocialContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.continueText}>Verify Phone Number</Text>
              )}
            </TouchableOpacity>

            {/* Back to options */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToOptions}
            >
              <Icon name="arrow-left" size={16} color="#666" />
              <Text style={styles.backText}> Back to login options</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Regular registration flow */}
            <Text style={styles.phoneLabel}>Enter your number</Text>
            
            {/* International Phone Number Input - FIXED: Malawi as default */}
            <InternationalPhoneNumberInput
              value={phoneNumber}
              onChangePhoneNumber={handlePhoneNumberChange}
              onChangeSelectedCountry={handleSelectedCountryChange}
              defaultCountry="MW" // Changed from "US" to "MW" for Malawi
              phoneInputStyles={styles.phoneInput}
              modalSearchInputStyles={styles.searchInput}
            />

            {/* Continue with Phone Button */}
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <TouchableOpacity 
              style={[styles.socialButton, styles.googleButton]} 
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#DB4437" />
              ) : (
                <>
                  <Icon name="google" size={20} color="#DB4437" style={styles.icon} />
                  <Text style={[styles.socialText, styles.googleText]}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButton, styles.facebookButton]} 
              onPress={handleFacebookSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#4267B2" />
              ) : (
                <>
                  <Icon name="facebook" size={20} color="#4267B2" style={styles.icon} />
                  <Text style={[styles.socialText, styles.facebookText]}>Sign in with Facebook</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Terms and Conditions */}
        <Text style={styles.termsText}>
          By signing up, you agree to our{' '}
          <Text style={styles.link}>Terms & Conditions</Text>, acknowledge our{' '}
          <Text style={styles.link}>Privacy Policy</Text>, and confirm that you're over 18. 
          We may send promotions related to our services – you can unsubscribe anytime in 
          Communication Settings under your profile.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
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
    marginBottom: 20,
    color: '#6c3',
  },
  promoText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
    fontWeight: '500',
    lineHeight: 24,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  userInfoText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
    marginBottom: 5,
  },
  verificationText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  phoneLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
    fontWeight: '500',
  },
  phoneInput: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    margin: 15,
  },
  continueButton: {
    backgroundColor: '#6c3',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  socialContinueButton: {
    backgroundColor: '#4267B2',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 15,
  },
  backText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  socialText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  googleText: {
    color: '#333',
  },
  facebookText: {
    color: '#333',
  },
  icon: {
    marginRight: 8,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    lineHeight: 18,
  },
  link: {
    color: '#6c3',
    fontWeight: '600',
  },
});