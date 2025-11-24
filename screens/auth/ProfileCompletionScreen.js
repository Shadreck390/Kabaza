import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, 
  Image, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchImageLibrary } from 'react-native-image-picker';

export default function ProfileCompletionScreen({ navigation, route }) {
  const [firstName, setFirstName] = useState(route.params?.firstName || '');
  const [surname, setSurname] = useState(route.params?.surname || '');
  const [gender, setGender] = useState(route.params?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(route.params?.dateOfBirth || '');
  const [profilePicture, setProfilePicture] = useState(null);

  // Handle image selection
  const handleSelectImage = () => {
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
      }
    });
  };

  // Format date input (DD/MM/YYYY)
  const formatDateOfBirth = (text) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/[^\d]/g, '');
    
    // Format as DD/MM/YYYY
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

  const handleContinue = () => {
    // Validate required fields
    if (!firstName.trim() || !surname.trim() || !gender) {
      Alert.alert('Missing Information', 'Please fill in all required fields (First Name, Surname, and Gender)');
      return;
    }

    // Validate date format if provided
    if (dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
      Alert.alert('Invalid Date', 'Please enter date in DD/MM/YYYY format');
      return;
    }

    // Get existing params from previous screens
    const { phoneNumber, authMethod, socialUserInfo, verified } = route.params || {};

    // Prepare complete user data
    const userData = {
      phone: phoneNumber,
      authMethod: authMethod || 'phone',
      socialUserInfo: socialUserInfo,
      profilePicture: profilePicture,
      userProfile: {
        firstName: firstName.trim(),
        surname: surname.trim(),
        gender,
        dateOfBirth,
        fullName: `${firstName.trim()} ${surname.trim()}`,
      }
    };

    // Navigate to role selection with ALL user data
    navigation.navigate('RoleSelection', userData);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <Text style={styles.headerSubtitle}>Tell us a bit about yourself</Text>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <TouchableOpacity style={styles.profilePictureContainer} onPress={handleSelectImage}>
          {profilePicture ? (
            <Image 
              source={{ uri: profilePicture.uri }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Icon name="camera" size={32} color="#6c3" />
              <Text style={styles.profilePictureText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.cameraIconOverlay}>
            <Icon name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.profilePictureHint}>Tap to add profile picture</Text>
      </View>

      {/* Personal Information Form */}
      <View style={styles.formSection}>
        {/* First Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            autoCapitalize="words"
          />
        </View>

        {/* Spacing */}
        <View style={styles.spacing} />

        {/* Surname */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Surname *</Text>
          <TextInput
            style={styles.input}
            value={surname}
            onChangeText={setSurname}
            placeholder="Enter your surname"
            autoCapitalize="words"
          />
        </View>

        {/* Spacing */}
        <View style={styles.spacing} />

        {/* Gender Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderContainer}>
            {['male', 'female', 'other'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.genderButton,
                  gender === item && styles.genderButtonSelected
                ]}
                onPress={() => setGender(item)}
              >
                <Text style={[
                  styles.genderText,
                  gender === item && styles.genderTextSelected
                ]}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Spacing */}
        <View style={styles.spacing} />

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={handleDateChange}
            placeholder="DD/MM/YYYY"
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.dateHint}>Format: DD/MM/YYYY</Text>
        </View>
      </View>

      {/* Spacing before button */}
      <View style={styles.largeSpacing} />

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          (!firstName || !surname || !gender) && styles.continueButtonDisabled
        ]}
        onPress={handleContinue}
        disabled={!firstName || !surname || !gender}
      >
        <Text style={styles.continueButtonText}>Continue to Role Selection</Text>
      </TouchableOpacity>

      {/* Spacing before terms */}
      <View style={styles.mediumSpacing} />

      <Text style={styles.termsText}>
        By continuing, you agree to our Terms & Conditions and Privacy Policy
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#6c3',
    padding: 30,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginVertical: 30,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#6c3',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6c3',
    borderStyle: 'dashed',
  },
  profilePictureText: {
    marginTop: 8,
    color: '#6c3',
    fontSize: 14,
    fontWeight: '500',
  },
  profilePictureHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#6c3',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 0, // Using spacing components instead
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  dateHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  genderButtonSelected: {
    backgroundColor: '#6c3',
    borderColor: '#6c3',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  genderTextSelected: {
    color: '#fff',
  },
  // Spacing components
  spacing: {
    height: 20,
  },
  mediumSpacing: {
    height: 15,
  },
  largeSpacing: {
    height: 25,
  },
  continueButton: {
    backgroundColor: '#6c3',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginHorizontal: 20,
  },
});