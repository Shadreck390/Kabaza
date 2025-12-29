// screens/common/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'react-native-image-picker';
import CountryPicker from 'react-native-country-picker-modal';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation();
  
  const [user, setUser] = useState({
    id: 'user-001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+265 88 123 4567',
    profilePhoto: null,
    userType: 'rider', // rider or driver
    rating: 4.8,
    totalRides: 124,
    joinedDate: '2023-01-15',
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({
    cca2: 'MW',
    name: 'Malawi',
    callingCode: '265',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsedData = JSON.parse(userData);
        setUser(parsedData);
        setEditData(parsedData);
      }
      
      const userType = await AsyncStorage.getItem('user_type');
      if (userType) {
        setUser(prev => ({ ...prev, userType }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveUserData = async (userData) => {
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      saveUserData(editData);
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectPhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    ImagePicker.launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        Alert.alert('Error', 'Failed to pick image');
      } else {
        setUploadingPhoto(true);
        
        // Simulate upload
        setTimeout(() => {
          handleChange('profilePhoto', response.assets[0].uri);
          setUploadingPhoto(false);
          Alert.alert('Success', 'Profile photo updated');
        }, 1500);
      }
    });
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry({
      cca2: country.cca2,
      name: country.name,
      callingCode: country.callingCode[0],
    });
    setShowCountryPicker(false);
  };

  const handleSwitchUserType = () => {
    Alert.alert(
      'Switch Account Type',
      `Switch from ${user.userType} to ${user.userType === 'rider' ? 'driver' : 'rider'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            const newType = user.userType === 'rider' ? 'driver' : 'rider';
            const updatedUser = { ...user, userType: newType };
            setUser(updatedUser);
            await AsyncStorage.setItem('user_type', newType);
            
            // Navigate to appropriate home screen
            if (newType === 'driver') {
              navigation.replace('DriverHome');
            } else {
              navigation.replace('RiderHome');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.replace('LoginScreen');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <TouchableOpacity 
        style={styles.profilePhotoContainer}
        onPress={isEditing ? handleSelectPhoto : null}
        disabled={uploadingPhoto}
      >
        {user.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.profilePhotoPlaceholder}>
            <Text style={styles.profileInitials}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        )}
        
        {isEditing && (
          <View style={styles.photoEditOverlay}>
            <MaterialIcon name="camera-alt" size={24} color="#FFFFFF" />
          </View>
        )}
        
        {uploadingPhoto && (
          <View style={styles.uploadingOverlay}>
            <MaterialIcon name="cloud-upload" size={24} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.profileInfo}>
        {isEditing ? (
          <TextInput
            style={styles.editNameInput}
            value={editData.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Your name"
          />
        ) : (
          <Text style={styles.profileName}>{user.name}</Text>
        )}
        
        <View style={styles.profileStats}>
          <View style={styles.statItem}>
            <MaterialIcon name="star" size={16} color="#F59E0B" />
            <Text style={styles.statText}>{user.rating}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcon name="directions-car" size={16} color="#3B82F6" />
            <Text style={styles.statText}>{user.totalRides} rides</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcon name="calendar-today" size={16} color="#22C55E" />
            <Text style={styles.statText}>
              Joined {new Date(user.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.editButton}
        onPress={handleEditToggle}
      >
        <MaterialIcon 
          name={isEditing ? "check" : "edit"} 
          size={20} 
          color={isEditing ? "#22C55E" : "#000000"} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderUserTypeBadge = () => (
    <TouchableOpacity 
      style={[
        styles.userTypeBadge,
        { backgroundColor: user.userType === 'driver' ? '#F0F9F0' : '#F0F7FF' }
      ]}
      onPress={handleSwitchUserType}
    >
      <MaterialCommunityIcon 
        name={user.userType === 'driver' ? 'steering' : 'account'} 
        size={16} 
        color={user.userType === 'driver' ? '#22C55E' : '#3B82F6'} 
      />
      <Text style={[
        styles.userTypeText,
        { color: user.userType === 'driver' ? '#22C55E' : '#3B82F6' }
      ]}>
        {user.userType === 'driver' ? 'Driver' : 'Rider'}
      </Text>
      <MaterialIcon name="swap-horiz" size={16} color="#666" />
    </TouchableOpacity>
  );

  const renderContactInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      
      <View style={styles.infoItem}>
        <MaterialIcon name="email" size={24} color="#666" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editData.email}
              onChangeText={(text) => handleChange('email', text)}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.infoValue}>{user.email}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.infoItem}>
        <MaterialIcon name="phone" size={24} color="#666" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone Number</Text>
          {isEditing ? (
            <View style={styles.phoneInputContainer}>
              <TouchableOpacity 
                style={styles.countryCodeButton}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryCodeText}>+{selectedCountry.callingCode}</Text>
                <MaterialIcon name="arrow-drop-down" size={20} color="#666" />
              </TouchableOpacity>
              <TextInput
                style={styles.phoneInput}
                value={editData.phone?.replace(`+${selectedCountry.callingCode}`, '') || ''}
                onChangeText={(text) => handleChange('phone', `+${selectedCountry.callingCode}${text}`)}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </View>
          ) : (
            <Text style={styles.infoValue}>{user.phone}</Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderAccountSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Settings</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={handleChangePassword}
      >
        <View style={styles.settingIcon}>
          <MaterialIcon name="lock" size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Change Password</Text>
          <Text style={styles.settingDescription}>Update your account password</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('NotificationSettings')}
      >
        <View style={styles.settingIcon}>
          <MaterialIcon name="notifications" size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Notification Settings</Text>
          <Text style={styles.settingDescription}>Manage your notifications</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('PrivacySettings')}
      >
        <View style={styles.settingIcon}>
          <MaterialIcon name="privacy-tip" size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Privacy Settings</Text>
          <Text style={styles.settingDescription}>Control your privacy options</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('LanguageSettings')}
      >
        <View style={styles.settingIcon}>
          <MaterialIcon name="language" size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Language</Text>
          <Text style={styles.settingDescription}>App language</Text>
        </View>
        <View style={styles.settingValueContainer}>
          <Text style={styles.settingValue}>English</Text>
          <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('CurrencySettings')}
      >
        <View style={styles.settingIcon}>
          <MaterialIcon name="attach-money" size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Currency</Text>
          <Text style={styles.settingDescription}>Display currency</Text>
        </View>
        <View style={styles.settingValueContainer}>
          <Text style={styles.settingValue}>MWK</Text>
          <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCountryPicker = () => (
    <Modal
      visible={showCountryPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCountryPicker(false)}
    >
      <View style={styles.countryPickerOverlay}>
        <View style={styles.countryPickerContainer}>
          <View style={styles.countryPickerHeader}>
            <Text style={styles.countryPickerTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <CountryPicker
            withFilter
            withFlag
            withCallingCode
            withAlphaFilter
            withCallingCodeButton
            onSelect={handleCountrySelect}
            visible={showCountryPicker}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => {/* Share profile */}}
        >
          <MaterialIcon name="share" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        {renderProfileHeader()}
        
        {/* User Type Badge */}
        {renderUserTypeBadge()}
        
        {/* Contact Information */}
        {renderContactInfo()}
        
        {/* Account Settings */}
        {renderAccountSettings()}
        
        {/* Preferences */}
        {renderPreferences()}
        
        {/* Dangerous Actions */}
        <View style={styles.dangerSection}>
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
          >
            <MaterialIcon name="delete" size={24} color="#EF4444" />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
        
        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Kabaza v2.0.1</Text>
          <Text style={styles.buildText}>Build 2024.01.15</Text>
        </View>
      </ScrollView>

      {/* Country Picker Modal */}
      {renderCountryPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profilePhotoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  photoEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  editNameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
  },
  profileStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
  },
  editInput: {
    fontSize: 16,
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#000000',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
    marginRight: 4,
  },
  dangerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  countryPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  countryPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  countryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countryPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});