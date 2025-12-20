// screens/common/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [userType, setUserType] = useState('rider'); // rider or driver
  const [settings, setSettings] = useState({
    notifications: {
      rideUpdates: true,
      promotions: true,
      reminders: false,
      sound: true,
      vibration: true,
    },
    privacy: {
      shareLocation: true,
      showProfile: true,
      shareRideHistory: false,
    },
    preferences: {
      language: 'English',
      currency: 'MWK',
      darkMode: false,
      autoAcceptRides: false,
    },
    safety: {
      shareTrip: true,
      emergencyContacts: true,
      speedAlerts: true,
    },
  });

  useEffect(() => {
    loadSettings();
    loadUserType();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUserType = async () => {
    try {
      const type = await AsyncStorage.getItem('user_type');
      if (type) {
        setUserType(type);
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const saveSettings = async (updatedSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleToggleSetting = (category, setting) => {
    const updatedSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [setting]: !settings[category][setting],
      },
    };
    saveSettings(updatedSettings);
  };

  const handleLanguageSelect = () => {
    Alert.alert(
      'Select Language',
      '',
      [
        { text: 'English', onPress: () => updatePreference('language', 'English') },
        { text: 'Chichewa', onPress: () => updatePreference('language', 'Chichewa') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCurrencySelect = () => {
    Alert.alert(
      'Select Currency',
      '',
      [
        { text: 'Malawian Kwacha (MWK)', onPress: () => updatePreference('currency', 'MWK') },
        { text: 'US Dollar (USD)', onPress: () => updatePreference('currency', 'USD') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updatePreference = (key, value) => {
    const updatedSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };
    saveSettings(updatedSettings);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear App Data',
      'This will remove all your local data including favorites and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'App data cleared successfully.');
              navigation.replace('SplashScreen');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            // Clear auth token
            await AsyncStorage.removeItem('auth_token');
            navigation.replace('LoginScreen');
          },
        },
      ]
    );
  };

  const renderSettingItem = ({ icon, title, description, value, onToggle, type = 'toggle' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingIcon}>
          <MaterialIcon name={icon} size={24} color="#3B82F6" />
        </View>
        <View style={styles.settingDetails}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>
      
      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <TouchableOpacity onPress={onToggle}>
          <Text style={styles.settingValue}>{value}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAccountSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('ProfileScreen')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="person" size={24} color="#3B82F6" />
          </View>
          <View style={styles.settingDetails}>
            <Text style={styles.settingTitle}>Profile</Text>
            <Text style={styles.settingDescription}>Update your personal information</Text>
          </View>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('PaymentMethods')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="payment" size={24} color="#3B82F6" />
          </View>
          <View style={styles.settingDetails}>
            <Text style={styles.settingTitle}>Payment Methods</Text>
            <Text style={styles.settingDescription}>Manage your payment options</Text>
          </View>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate(userType === 'driver' ? 'DriverDocuments' : 'Favorites')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon 
              name={userType === 'driver' ? 'folder' : 'favorite'} 
              size={24} 
              color="#3B82F6" 
            />
          </View>
          <View style={styles.settingDetails}>
            <Text style={styles.settingTitle}>
              {userType === 'driver' ? 'Documents' : 'Favorites'}
            </Text>
            <Text style={styles.settingDescription}>
              {userType === 'driver' ? 'Manage your documents' : 'Manage saved locations'}
            </Text>
          </View>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
    </View>
  );

  const renderNotificationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      
      {renderSettingItem({
        icon: 'notifications',
        title: 'Ride Updates',
        description: 'Notifications about your rides',
        value: settings.notifications.rideUpdates,
        onToggle: () => handleToggleSetting('notifications', 'rideUpdates'),
      })}
      
      {renderSettingItem({
        icon: 'local-offer',
        title: 'Promotions',
        description: 'Special offers and discounts',
        value: settings.notifications.promotions,
        onToggle: () => handleToggleSetting('notifications', 'promotions'),
      })}
      
      {renderSettingItem({
        icon: 'alarm',
        title: 'Reminders',
        description: 'Payment and schedule reminders',
        value: settings.notifications.reminders,
        onToggle: () => handleToggleSetting('notifications', 'reminders'),
      })}
      
      {renderSettingItem({
        icon: 'volume-up',
        title: 'Sound',
        value: settings.notifications.sound,
        onToggle: () => handleToggleSetting('notifications', 'sound'),
      })}
      
      {renderSettingItem({
        icon: 'vibration',
        title: 'Vibration',
        value: settings.notifications.vibration,
        onToggle: () => handleToggleSetting('notifications', 'vibration'),
      })}
    </View>
  );

  const renderPrivacySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Privacy & Safety</Text>
      
      {renderSettingItem({
        icon: 'location-on',
        title: 'Share Location',
        description: 'Share your location during rides',
        value: settings.privacy.shareLocation,
        onToggle: () => handleToggleSetting('privacy', 'shareLocation'),
      })}
      
      {renderSettingItem({
        icon: 'visibility',
        title: 'Show Profile',
        description: 'Show your profile to drivers/riders',
        value: settings.privacy.showProfile,
        onToggle: () => handleToggleSetting('privacy', 'showProfile'),
      })}
      
      {renderSettingItem({
        icon: 'history',
        title: 'Share Ride History',
        description: 'Share completed rides for ratings',
        value: settings.privacy.shareRideHistory,
        onToggle: () => handleToggleSetting('privacy', 'shareRideHistory'),
      })}
      
      {renderSettingItem({
        icon: 'share',
        title: 'Share Trip',
        description: 'Share trip details with contacts',
        value: settings.safety.shareTrip,
        onToggle: () => handleToggleSetting('safety', 'shareTrip'),
      })}
      
      {renderSettingItem({
        icon: 'emergency',
        title: 'Emergency Contacts',
        description: 'Enable emergency contact features',
        value: settings.safety.emergencyContacts,
        onToggle: () => handleToggleSetting('safety', 'emergencyContacts'),
      })}
    </View>
  );

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={handleLanguageSelect}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="language" size={24} color="#3B82F6" />
          </View>
          <View style={styles.settingDetails}>
            <Text style={styles.settingTitle}>Language</Text>
            <Text style={styles.settingDescription}>App language</Text>
          </View>
        </View>
        <View style={styles.settingValueContainer}>
          <Text style={styles.settingValue}>{settings.preferences.language}</Text>
          <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={handleCurrencySelect}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="attach-money" size={24} color="#3B82F6" />
          </View>
          <View style={styles.settingDetails}>
            <Text style={styles.settingTitle}>Currency</Text>
            <Text style={styles.settingDescription}>Display currency</Text>
          </View>
        </View>
        <View style={styles.settingValueContainer}>
          <Text style={styles.settingValue}>{settings.preferences.currency}</Text>
          <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
      
      {userType === 'driver' && renderSettingItem({
        icon: 'directions-car',
        title: 'Auto Accept Rides',
        description: 'Automatically accept ride requests',
        value: settings.preferences.autoAcceptRides,
        onToggle: () => handleToggleSetting('preferences', 'autoAcceptRides'),
      })}
      
      {renderSettingItem({
        icon: 'dark-mode',
        title: 'Dark Mode',
        value: settings.preferences.darkMode,
        onToggle: () => handleToggleSetting('preferences', 'darkMode'),
      })}
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('HelpSupport')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="help" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.settingTitle}>Help & Support</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('AboutScreen')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="info" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.settingTitle}>About Kabaza</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('TermsScreen')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="description" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.settingTitle}>Terms of Service</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => navigation.navigate('PrivacyScreen')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="privacy-tip" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.settingTitle}>Privacy Policy</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#D1D5DB" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => Linking.openURL('https://kabaza.mw')}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingIcon}>
            <MaterialIcon name="public" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.settingTitle}>Website</Text>
        </View>
        <MaterialIcon name="open-in-new" size={24} color="#D1D5DB" />
      </TouchableOpacity>
    </View>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderAccountSection()}
        {renderNotificationsSection()}
        {renderPrivacySection()}
        {renderPreferencesSection()}
        {renderAboutSection()}

        {/* Dangerous Actions */}
        <View style={styles.dangerSection}>
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <MaterialIcon name="delete" size={24} color="#EF4444" />
            <Text style={styles.dangerButtonText}>Clear App Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.dangerButton, { marginTop: 12 }]}
            onPress={handleLogout}
          >
            <MaterialIcon name="logout" size={24} color="#EF4444" />
            <Text style={styles.dangerButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Kabaza v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 Kabaza Malawi</Text>
        </View>
      </ScrollView>
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
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  settingDetails: {
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
    padding: 16,
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
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});