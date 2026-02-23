 // screens/auth/ProfileCompletionScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { 
  saveUserData, 
  getUserData, 
  saveAuthToken, 
  updateUserProfile 
} from '@utils/userStorage';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function ProfileCompletionScreen({ navigation, route }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const imageScale = useRef(new Animated.Value(1)).current;

  const { phoneNumber, authMethod, socialUserInfo, verified } = route.params || {};

  const [firstName, setFirstName] = useState(socialUserInfo?.givenName || '');
  const [surname, setSurname] = useState(socialUserInfo?.familyName || '');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);

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
  }, []);

  // Enhanced image selection with animation
  const handleSelectImage = () => {
    Animated.sequence([
      Animated.spring(imageScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(imageScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        Alert.alert('Error', 'Failed to select image');
      } else if (response.assets && response.assets[0]) {
        setProfilePicture(response.assets[0]);
        // Pulse animation on successful selection
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  // Format date input (DD/MM/YYYY) - same as your format
  const formatDateOfBirth = (text) => {
    const cleaned = text.replace(/[^\d]/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 4) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
  };

  const handleDateChange = (text) => {
    const formatted = formatDateOfBirth(text);
    setDateOfBirth(formatted);
  };

  // Enhanced continue handler with animations and storage
  const handleContinue = async () => {
  // Validate required fields
  if (!firstName.trim() || !surname.trim() || !gender) {
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

    Alert.alert('Missing Information', 'Please fill in all required fields (First Name, Surname, and Gender)');
    return;
  }

  // Validate date format if provided
  if (dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
    Alert.alert('Invalid Date', 'Please enter date in DD/MM/YYYY format');
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

  try {
    // Check if user already exists
    const existingUser = await getUserData();
    
    // Create complete user profile
    const userData = {
      // Basic info
      phoneNumber: phoneNumber,
      verified: verified || true,
      authMethod: authMethod || 'phone',
      userType: 'rider', // Default to rider
      profileCompleted: true,
      completedAt: new Date().toISOString(),
      
      // Profile info
      profile: {
        firstName: firstName.trim(),
        surname: surname.trim(),
        fullName: `${firstName.trim()} ${surname.trim()}`,
        gender: gender,
        dateOfBirth: dateOfBirth || '',
        profilePicture: profilePicture ? {
          uri: profilePicture.uri,
          type: profilePicture.type,
          name: profilePicture.fileName,
        } : null,
      },
      
      // Social info if available
      ...(socialUserInfo && { socialUserInfo }),
      
      // Settings defaults
      settings: {
        notifications: true,
        darkMode: false,
        language: 'en',
      },
      
      // Ride preferences (rider-specific)
      preferences: {
        favoriteLocations: [],
        rideHistory: [],
        paymentMethods: [],
      },
    };

    // Merge with existing data if any
    const mergedData = existingUser ? { ...existingUser, ...userData } : userData;

    // Save to userStorage
    await saveUserData(mergedData);
    
    // Also update profile separately for easy access
    await updateUserProfile({
      name: `${firstName.trim()} ${surname.trim()}`,
      firstName: firstName.trim(),
      surname: surname.trim(),
      gender: gender,
      dateOfBirth: dateOfBirth || '',
      phone: phoneNumber,
      profilePictureUri: profilePicture?.uri,
      lastUpdated: new Date().toISOString(),
    });

    console.log('✅ Rider profile saved successfully:', mergedData);

    // ✅ FIXED: Navigate to role selection with animation
    setTimeout(() => {
      try {
        // Prepare navigation params
        const navigationParams = {
          // Basic user info
          phone: phoneNumber, // Pass the original phoneNumber from route params
          authMethod: authMethod || 'phone',
          
          // Social info if available
          ...(socialUserInfo && { socialUserInfo }),
          
          // Profile data (MUST MATCH RoleSelectionScreen expectation)
          userProfile: {
            firstName: firstName.trim(),
            surname: surname.trim(),
            gender,
            dateOfBirth: dateOfBirth || '',
            fullName: `${firstName.trim()} ${surname.trim()}`,
            profilePicture: profilePicture?.uri || null,
          },
          
          // Verification status
          verified: true,
          
          // Optional flag
          fromProfileCompletion: true,
        };
        
        console.log('🚀 Navigating to RoleSelection with params:', {
          phone: navigationParams.phone,
          hasphone: !!navigationParams.phone,
          hasProfile: !!navigationParams.userProfile,
          profileName: navigationParams.userProfile.fullName,
        });
        
        // Navigate to RoleSelection
        navigation.navigate('RoleSelection', navigationParams);
        
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        
        // Fallback navigation if main navigation fails
        Alert.alert(
          'Profile Completed',
          'Your profile has been saved successfully. Please select your role.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Try simpler navigation as fallback
                navigation.navigate('RoleSelection', {
                  phone: phoneNumber,
                  userProfile: {
                    firstName: firstName.trim(),
                    surname: surname.trim(),
                    fullName: `${firstName.trim()} ${surname.trim()}`,
                  }
                });
              }
            }
          ]
        );
      }
    }, 500);

  } catch (error) {
    console.error('❌ Error saving profile:', error);
    Alert.alert('Error', 'Failed to save profile. Please try again.');
  } finally {
    setLoading(false);
  }
}; // ← THIS CLOSING BRACE WAS MISSING

  const isFormValid = firstName.trim() && surname.trim() && gender;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with gradient like RiderHomeScreen */}
        <LinearGradient
          colors={['#00a82d', '#00c853']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <AnimatedView
            style={[
              styles.headerContent,
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
              <MaterialIcon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <AnimatedText
              style={[
                styles.headerTitle,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              Complete Your Profile
            </AnimatedText>
            <AnimatedText
              style={[
                styles.headerSubtitle,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              Tell us a bit about yourself
            </AnimatedText>
          </AnimatedView>
        </LinearGradient>

        {/* Profile Picture Section */}
        <AnimatedView
          style={[
            styles.profilePictureSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <AnimatedView style={{ transform: [{ scale: imageScale }] }}>
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={handleSelectImage}
              activeOpacity={0.8}
            >
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture.uri }}
                  style={styles.profileImage}
                />
              ) : (
                <LinearGradient
                  colors={['#f0fff4', '#e0f7e9']}
                  style={styles.profilePicturePlaceholder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="person" size={48} color="#00a82d" />
                  <Text style={styles.profilePictureText}>Add Photo</Text>
                </LinearGradient>
              )}
              <LinearGradient
                colors={['#00a82d', '#00c853']}
                style={styles.cameraIconOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="camera-alt" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedView>
          <Text style={styles.profilePictureHint}>
            Tap to add profile picture (Optional)
          </Text>
        </AnimatedView>

        {/* Form Section */}
        <AnimatedView
          style={[
            styles.formSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              First Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View style={styles.spacing} />

          {/* Surname */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Surname <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={surname}
              onChangeText={setSurname}
              placeholder="Enter your surname"
              placeholderTextColor="#999"
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View style={styles.spacing} />

          {/* Gender Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Gender <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.genderButton,
                    gender.toLowerCase() === item.toLowerCase() && styles.genderButtonSelected,
                  ]}
                  onPress={() => setGender(item.toLowerCase())}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {gender.toLowerCase() === item.toLowerCase() ? (
                    <LinearGradient
                      colors={['#00a82d', '#00c853']}
                      style={styles.genderButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.genderTextSelected}>{item}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.genderText}>{item}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.spacing} />

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth (Optional)</Text>
            <TextInput
              style={styles.input}
              value={dateOfBirth}
              onChangeText={handleDateChange}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={10}
              editable={!loading}
            />
            <Text style={styles.dateHint}>Format: DD/MM/YYYY</Text>
          </View>
        </AnimatedView>

        {/* Continue Button */}
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
              styles.continueButton,
              !isFormValid && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isFormValid || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isFormValid && !loading ? ['#00a82d', '#00c853'] : ['#ccc', '#ddd']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.continueButtonText}>
                {loading ? (
                  <>
                    <MaterialIcon name="hourglass-empty" size={20} color="#fff" />
                    {' Saving Profile...'}
                  </>
                ) : (
                  'Continue to Role Selection'
                )}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedView>

        {/* Terms */}
        <AnimatedView
          style={[
            styles.termsContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  profilePicturePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePictureText: {
    marginTop: 12,
    fontSize: 14,
    color: '#00a82d',
    fontWeight: '600',
  },
  profilePictureHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  required: {
    color: '#ff6b6b',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
    fontWeight: '500',
  },
  dateHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  genderButtonSelected: {
    borderColor: '#00a82d',
  },
  genderButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 16,
    textAlign: 'center',
  },
  genderTextSelected: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  spacing: {
    height: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  continueButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsContainer: {
    paddingHorizontal: 24,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#00a82d',
    fontWeight: '600',
  },
});