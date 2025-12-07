// screens/driver/DriverSettingsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, Alert, Linking, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { logout } from '../../src/store/slices/authSlice';

export default function DriverSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    // Availability Settings
    onlineStatus: true,
    autoAcceptRides: false,
    acceptLongTrips: true,
    acceptShortTrips: true,
    
    // Ride Preferences
    maxDistance: 15, // in km
    minFare: 500, // in MWK
    preferredAreas: ['Lilongwe City Center', 'Area 3', 'Old Town'],
    
    // Notification Settings
    rideRequestNotifications: true,
    earningsNotifications: true,
    promoNotifications: false,
    soundNotifications: true,
    vibrationNotifications: true,
    
    // App Settings
    darkMode: false,
    saveRideHistory: true,
    dataSaverMode: false,
    autoUpdate: true,
    
    // Privacy Settings
    shareLocationWithRiders: true,
    showRating: true,
    anonymousMode: false,
  });

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dispatch = useDispatch();

  // Load saved settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('driver_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem('driver_settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      // Show success message
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              onlineStatus: true,
              autoAcceptRides: false,
              acceptLongTrips: true,
              acceptShortTrips: true,
              maxDistance: 15,
              minFare: 500,
              preferredAreas: ['Lilongwe City Center', 'Area 3', 'Old Town'],
              rideRequestNotifications: true,
              earningsNotifications: true,
              promoNotifications: false,
              soundNotifications: true,
              vibrationNotifications: true,
              darkMode: false,
              saveRideHistory: true,
              dataSaverMode: false,
              autoUpdate: true,
              shareLocationWithRiders: true,
              showRating: true,
              anonymousMode: false,
            };
            setSettings(defaultSettings);
            setHasUnsavedChanges(true);
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.replace('PhoneOrGoogle');
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear app cache and temporary data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => {
            Alert.alert('Cache Cleared', 'App cache has been cleared');
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    const phoneNumber = '+265 888 123 456';
    const email = 'support@kabaza.com';
    
    Alert.alert(
      'Contact Support',
      'Choose contact method',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
        { text: 'Email', onPress: () => Linking.openURL(`mailto:${email}`) },
        { text: 'WhatsApp', onPress: () => Linking.openURL(`https://wa.me/${phoneNumber.replace(/\D/g, '')}`) },
      ]
    );
  };

  const handleRateApp = () => {
    const storeUrl = Platform.OS === 'ios' 
      ? 'https://apps.apple.com/app/id123456789'
      : 'market://details?id=com.kabaza.app';
    
    Linking.openURL(storeUrl).catch(() => {
      Alert.alert('Error', 'Could not open app store');
    });
  };

  const renderSettingItem = ({ icon, title, description, value, onValueChange, type = 'switch', extraContent }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={22} color="#00B894" style={styles.settingIcon} />
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#00B894' : '#f4f3f4'}
        />
      ) : type === 'slider' ? (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>{value} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={5}
            value={value}
            onValueChange={onValueChange}
            minimumTrackTintColor="#00B894"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#00B894"
          />
        </View>
      ) : null}

      {extraContent}
    </View>
  );

  const renderSection = (title, icon, children) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={18} color="#666" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Settings</Text>
        {hasUnsavedChanges && (
          <TouchableOpacity onPress={saveSettings} disabled={saving}>
            <Text style={styles.saveButton}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Availability Settings */}
      {renderSection('Availability', 'clock-o', (
        <>
          {renderSettingItem({
            icon: 'power-off',
            title: 'Go Online',
            description: 'Receive ride requests when online',
            value: settings.onlineStatus,
            onValueChange: (value) => handleSettingChange('onlineStatus', value)
          })}

          {renderSettingItem({
            icon: 'bolt',
            title: 'Auto-Accept Rides',
            description: 'Automatically accept incoming ride requests',
            value: settings.autoAcceptRides,
            onValueChange: (value) => handleSettingChange('autoAcceptRides', value)
          })}

          <View style={styles.divider} />

          <View style={styles.tripTypeContainer}>
            <Text style={styles.tripTypeLabel}>Trip Preferences</Text>
            <View style={styles.tripTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  settings.acceptShortTrips && styles.tripTypeButtonActive
                ]}
                onPress={() => handleSettingChange('acceptShortTrips', !settings.acceptShortTrips)}
              >
                <Icon 
                  name="road" 
                  size={16} 
                  color={settings.acceptShortTrips ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.tripTypeText,
                  settings.acceptShortTrips && styles.tripTypeTextActive
                ]}>
                  Short Trips
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  settings.acceptLongTrips && styles.tripTypeButtonActive
                ]}
                onPress={() => handleSettingChange('acceptLongTrips', !settings.acceptLongTrips)}
              >
                <Icon 
                  name="map" 
                  size={16} 
                  color={settings.acceptLongTrips ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.tripTypeText,
                  settings.acceptLongTrips && styles.tripTypeTextActive
                ]}>
                  Long Trips
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ))}

      {/* Ride Preferences */}
      {renderSection('Ride Preferences', 'sliders', (
        <>
          {renderSettingItem({
            icon: 'arrows-alt',
            title: 'Maximum Distance',
            description: 'Maximum trip distance you accept',
            value: settings.maxDistance,
            onValueChange: (value) => handleSettingChange('maxDistance', value),
            type: 'slider'
          })}

          {renderSettingItem({
            icon: 'money',
            title: 'Minimum Fare',
            description: 'Minimum fare you accept (MWK)',
            value: settings.minFare,
            onValueChange: (value) => handleSettingChange('minFare', value),
            type: 'slider',
            extraContent: (
              <View style={styles.minFareContainer}>
                <Text style={styles.minFareValue}>MWK {settings.minFare}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={200}
                  maximumValue={2000}
                  step={100}
                  value={settings.minFare}
                  onValueChange={(value) => handleSettingChange('minFare', value)}
                  minimumTrackTintColor="#00B894"
                  maximumTrackTintColor="#ddd"
                  thumbTintColor="#00B894"
                />
              </View>
            )
          })}

          <TouchableOpacity style={styles.preferredAreasButton}>
            <Icon name="map-marker" size={18} color="#00B894" />
            <View style={styles.preferredAreasContent}>
              <Text style={styles.preferredAreasTitle}>Preferred Areas</Text>
              <Text style={styles.preferredAreasText}>
                {settings.preferredAreas.join(', ')}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color="#ccc" />
          </TouchableOpacity>
        </>
      ))}

      {/* Notification Settings */}
      {renderSection('Notifications', 'bell', (
        <>
          {renderSettingItem({
            icon: 'car',
            title: 'Ride Requests',
            value: settings.rideRequestNotifications,
            onValueChange: (value) => handleSettingChange('rideRequestNotifications', value)
          })}

          {renderSettingItem({
            icon: 'money',
            title: 'Earnings Updates',
            value: settings.earningsNotifications,
            onValueChange: (value) => handleSettingChange('earningsNotifications', value)
          })}

          {renderSettingItem({
            icon: 'tag',
            title: 'Promotions',
            value: settings.promoNotifications,
            onValueChange: (value) => handleSettingChange('promoNotifications', value)
          })}

          <View style={styles.divider} />

          <View style={styles.notificationOptions}>
            <TouchableOpacity
              style={[
                styles.notificationOption,
                settings.soundNotifications && styles.notificationOptionActive
              ]}
              onPress={() => handleSettingChange('soundNotifications', !settings.soundNotifications)}
            >
              <Icon 
                name="volume-up" 
                size={16} 
                color={settings.soundNotifications ? '#00B894' : '#666'} 
              />
              <Text style={[
                styles.notificationOptionText,
                settings.soundNotifications && styles.notificationOptionTextActive
              ]}>
                Sound
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.notificationOption,
                settings.vibrationNotifications && styles.notificationOptionActive
              ]}
              onPress={() => handleSettingChange('vibrationNotifications', !settings.vibrationNotifications)}
            >
              <Icon 
                name="mobile" 
                size={18} 
                color={settings.vibrationNotifications ? '#00B894' : '#666'} 
              />
              <Text style={[
                styles.notificationOptionText,
                settings.vibrationNotifications && styles.notificationOptionTextActive
              ]}>
                Vibration
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ))}

      {/* Privacy Settings */}
      {renderSection('Privacy', 'shield', (
        <>
          {renderSettingItem({
            icon: 'map-marker',
            title: 'Share Location',
            description: 'Share your location with riders during trips',
            value: settings.shareLocationWithRiders,
            onValueChange: (value) => handleSettingChange('shareLocationWithRiders', value)
          })}

          {renderSettingItem({
            icon: 'star',
            title: 'Show Rating',
            description: 'Display your rating to riders',
            value: settings.showRating,
            onValueChange: (value) => handleSettingChange('showRating', value)
          })}

          {renderSettingItem({
            icon: 'user-secret',
            title: 'Anonymous Mode',
            description: 'Hide your name and photo from riders',
            value: settings.anonymousMode,
            onValueChange: (value) => handleSettingChange('anonymousMode', value)
          })}
        </>
      ))}

      {/* App Settings */}
      {renderSection('App Settings', 'cog', (
        <>
          {renderSettingItem({
            icon: 'moon-o',
            title: 'Dark Mode',
            value: settings.darkMode,
            onValueChange: (value) => handleSettingChange('darkMode', value)
          })}

          {renderSettingItem({
            icon: 'history',
            title: 'Save Ride History',
            value: settings.saveRideHistory,
            onValueChange: (value) => handleSettingChange('saveRideHistory', value)
          })}

          {renderSettingItem({
            icon: 'wifi',
            title: 'Data Saver Mode',
            description: 'Reduce data usage',
            value: settings.dataSaverMode,
            onValueChange: (value) => handleSettingChange('dataSaverMode', value)
          })}

          {renderSettingItem({
            icon: 'download',
            title: 'Auto Update',
            value: settings.autoUpdate,
            onValueChange: (value) => handleSettingChange('autoUpdate', value)
          })}
        </>
      ))}

      {/* Actions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="exclamation-circle" size={18} color="#666" />
          <Text style={styles.sectionTitle}>Actions</Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleResetSettings}>
            <Icon name="refresh" size={18} color="#FFA726" />
            <Text style={[styles.actionText, { color: '#FFA726' }]}>Reset Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Icon name="trash" size={18} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: '#FF6B6B' }]}>Clear Cache</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleContactSupport}>
            <Icon name="headphones" size={18} color="#3498db" />
            <Text style={[styles.actionText, { color: '#3498db' }]}>Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleRateApp}>
            <Icon name="star" size={18} color="#FFD700" />
            <Text style={[styles.actionText, { color: '#FFD700' }]}>Rate App</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Version & Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.versionText}>Kabaza Driver v1.0.0</Text>
        <Text style={styles.buildText}>Build 2024.01.15</Text>
        
        <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsText}>Terms of Service</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="sign-out" size={20} color="#FF6B6B" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Save Button (if unsaved changes) */}
      {hasUnsavedChanges && (
        <TouchableOpacity 
          style={styles.floatingSaveButton} 
          onPress={saveSettings}
          disabled={saving}
        >
          <Text style={styles.floatingSaveText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 100 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  saveButton: { color: '#00B894', fontSize: 16, fontWeight: '600' },
  section: { 
    backgroundColor: '#fff', 
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 10 },
  sectionContent: { paddingHorizontal: 15 },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: 15, width: 24 },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 15, color: '#333', marginBottom: 2 },
  settingDescription: { fontSize: 12, color: '#666', lineHeight: 16 },
  sliderContainer: { width: 150 },
  slider: { width: '100%', height: 40 },
  sliderValue: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 5 },
  minFareContainer: { width: 180, marginTop: 10 },
  minFareValue: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 5 },
  divider: { height: 1, backgroundColor: '#f5f5f5', marginVertical: 10 },
  tripTypeContainer: { marginVertical: 10 },
  tripTypeLabel: { fontSize: 14, color: '#666', marginBottom: 10 },
  tripTypeButtons: { flexDirection: 'row', gap: 10 },
  tripTypeButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    gap: 8,
  },
  tripTypeButtonActive: { backgroundColor: '#00B894', borderColor: '#00B894' },
  tripTypeText: { fontSize: 14, color: '#666' },
  tripTypeTextActive: { color: '#fff', fontWeight: '600' },
  preferredAreasButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  preferredAreasContent: { flex: 1, marginLeft: 10 },
  preferredAreasTitle: { fontSize: 15, color: '#333', marginBottom: 2 },
  preferredAreasText: { fontSize: 12, color: '#666', lineHeight: 16 },
  notificationOptions: { flexDirection: 'row', gap: 15, marginVertical: 10 },
  notificationOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    gap: 8,
  },
  notificationOptionActive: { backgroundColor: '#E8F5E8', borderColor: '#00B894' },
  notificationOptionText: { fontSize: 14, color: '#666' },
  notificationOptionTextActive: { color: '#00B894', fontWeight: '500' },
  actionsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10,
    padding: 15,
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f8f9fa',
    gap: 8,
    minWidth: '45%',
    flex: 1,
  },
  actionText: { fontSize: 14, fontWeight: '500' },
  infoContainer: { 
    alignItems: 'center', 
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: { fontSize: 14, color: '#666', marginBottom: 5 },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  termsButton: { paddingVertical: 8 },
  termsText: { fontSize: 14, color: '#00B894', textDecorationLine: 'underline' },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#fff', 
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    gap: 10,
  },
  logoutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
  floatingSaveButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#00B894',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});