// screens/driver/DriverSettingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, Alert, Linking, Platform, AppState, Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../src/store/slices/authSlice';
import socketService from '../../src/services/socketService';
import axios from 'axios';
import PushNotification from 'react-native-push-notification';

// Configure push notifications
PushNotification.configure({
  onNotification: function(notification) {
    console.log('NOTIFICATION:', notification);
  },
  requestPermissions: Platform.OS === 'ios',
});

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
    
    // Real-time Settings
    realTimeSync: true,
    backgroundUpdates: true,
    syncFrequency: 'instant', // instant, 5s, 30s
  });

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [rideRequestsCount, setRideRequestsCount] = useState(0);
  const [pendingRides, setPendingRides] = useState([]);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [syncProgress, setSyncProgress] = useState(0);
  
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  
  const prevOnlineStatusRef = useRef(settings.onlineStatus);
  const settingsSyncTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const syncIntervalRef = useRef(null);

  // Load saved settings and initialize socket
  useEffect(() => {
    loadSettings();
    initializeSocket();
    setupAppStateListener();
    
    return () => {
      cleanup();
    };
  }, []);

  // Effect for real-time sync
  useEffect(() => {
    if (settings.realTimeSync && isConnected) {
      setupSyncInterval();
    } else {
      clearSyncInterval();
    }
    
    return () => clearSyncInterval();
  }, [settings.realTimeSync, settings.syncFrequency, isConnected]);

  const cleanup = () => {
    if (settingsSyncTimeoutRef.current) {
      clearTimeout(settingsSyncTimeoutRef.current);
    }
    clearSyncInterval();
    socketService.disconnect();
  };

  const setupAppStateListener = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to the foreground
      if (settings.backgroundUpdates) {
        syncSettingsWithServer(settings, true);
      }
    } else if (nextAppState === 'background') {
      // App is going to background
      if (settings.backgroundUpdates && isConnected) {
        socketService.updateAvailability(false);
      }
    }
    
    appStateRef.current = nextAppState;
  };

  const clearSyncInterval = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  const setupSyncInterval = () => {
    clearSyncInterval();
    
    let interval;
    switch(settings.syncFrequency) {
      case 'instant':
        // No interval, sync on every change
        break;
      case '5s':
        interval = 5000;
        break;
      case '30s':
        interval = 30000;
        break;
      default:
        interval = 5000;
    }
    
    if (interval) {
      syncIntervalRef.current = setInterval(() => {
        if (hasUnsavedChanges) {
          autoSaveSettings();
        }
      }, interval);
    }
  };

  const initializeSocket = async () => {
    try {
      await socketService.initializeSocket();
      
      // Socket status listeners
      socketService.socket?.on('connect', () => {
        setIsConnected(true);
        setSocketStatus('connected');
        console.log('Socket connected');
        
        // Sync current settings on connect
        if (settings.realTimeSync) {
          socketService.updateSettings(settings);
          socketService.updateAvailability(settings.onlineStatus);
        }
      });
      
      socketService.socket?.on('disconnect', () => {
        setIsConnected(false);
        setSocketStatus('disconnected');
        console.log('Socket disconnected');
      });
      
      socketService.socket?.on('connect_error', (error) => {
        setIsConnected(false);
        setSocketStatus('error');
        console.log('Socket connection error:', error);
      });
      
      // Settings sync listener
      socketService.onSettingsUpdate = (updatedSettings) => {
        console.log('Received settings update from other device:', updatedSettings);
        
        Alert.alert(
          'Settings Synced',
          'Your settings were updated from another device',
          [{ text: 'OK' }]
        );
        
        // Update local state
        setSettings(prev => ({
          ...prev,
          ...updatedSettings
        }));
        
        // Update AsyncStorage
        AsyncStorage.setItem('driver_settings', JSON.stringify({
          ...settings,
          ...updatedSettings
        }));
        
        setLastSynced(new Date().toISOString());
        setHasUnsavedChanges(false);
      };
      
      // Ride request listener
      socketService.socket?.on('new_ride_request', (rideData) => {
        handleNewRideRequest(rideData);
      });
      
      // Earnings update listener
      socketService.socket?.on('earnings_update', (earningsData) => {
        if (settings.earningsNotifications) {
          showEarningsNotification(earningsData);
        }
      });
      
      // Promo notification listener
      socketService.socket?.on('promo_notification', (promoData) => {
        if (settings.promoNotifications) {
          showPromoNotification(promoData);
        }
      });
      
    } catch (error) {
      console.error('Socket initialization failed:', error);
      setIsConnected(false);
      setSocketStatus('error');
    }
  };

  const handleNewRideRequest = (rideData) => {
    if (!settings.onlineStatus || !settings.rideRequestNotifications) return;
    
    // Increment ride request count
    const newCount = rideRequestsCount + 1;
    setRideRequestsCount(newCount);
    
    // Add to pending rides
    setPendingRides(prev => [...prev, { ...rideData, id: Date.now() }]);
    
    // Show local notification
    PushNotification.localNotification({
      title: 'New Ride Request! 🚗',
      message: `Ride from ${rideData.pickupLocation} to ${rideData.dropoffLocation}`,
      playSound: settings.soundNotifications,
      vibrate: settings.vibrationNotifications ? 300 : 0,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
    });
    
    // Vibrate if enabled
    if (settings.vibrationNotifications) {
      Vibration.vibrate([300, 200, 300]);
    }
    
    // Play sound if enabled (you'll need react-native-sound)
    if (settings.soundNotifications) {
      // playNotificationSound();
    }
    
    // Auto-accept if enabled
    if (settings.autoAcceptRides && rideMeetsCriteria(rideData)) {
      autoAcceptRide(rideData);
    }
  };

  const rideMeetsCriteria = (rideData) => {
    const meetsDistance = rideData.distance <= settings.maxDistance;
    const meetsFare = rideData.fare >= settings.minFare;
    const meetsTripType = rideData.isLongTrip ? settings.acceptLongTrips : settings.acceptShortTrips;
    
    return meetsDistance && meetsFare && meetsTripType;
  };

  const autoAcceptRide = async (rideData) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post('YOUR_API_URL/api/rides/accept', {
        rideId: rideData.id,
        driverId: user?.id,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from pending
      setPendingRides(prev => prev.filter(ride => ride.id !== rideData.id));
      setRideRequestsCount(prev => Math.max(0, prev - 1));
      
      // Notify user
      PushNotification.localNotification({
        title: 'Ride Auto-Accepted! ✅',
        message: `You accepted ride to ${rideData.dropoffLocation}`,
      });
    } catch (error) {
      console.error('Auto-accept failed:', error);
    }
  };

  const showEarningsNotification = (earningsData) => {
    PushNotification.localNotification({
      title: 'Earnings Update 💰',
      message: `You earned MWK ${earningsData.amount} today`,
      playSound: settings.soundNotifications,
      vibrate: settings.vibrationNotifications ? 200 : 0,
    });
  };

  const showPromoNotification = (promoData) => {
    PushNotification.localNotification({
      title: 'New Promotion! 🎉',
      message: promoData.message,
      playSound: settings.soundNotifications,
      vibrate: settings.vibrationNotifications ? 200 : 0,
    });
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('driver_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        prevOnlineStatusRef.current = parsedSettings.onlineStatus;
        
        // Sync with server
        if (parsedSettings.realTimeSync) {
          syncSettingsWithServer(parsedSettings);
        }
      }
      
      // Load last sync time
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      setLastSynced(lastSync);
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const syncSettingsWithServer = async (settingsToSync, isBackground = false) => {
    if (!settingsToSync.realTimeSync && !isBackground) return;
    
    try {
      setSyncProgress(30);
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id') || Platform.OS;
      
      const response = await axios.post('YOUR_API_URL/api/driver/settings/sync', {
        settings: settingsToSync,
        deviceId: deviceId,
        timestamp: new Date().toISOString(),
        syncType: isBackground ? 'background' : 'manual'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      
      setSyncProgress(100);
      
      const data = response.data;
      setLastSynced(data.timestamp || new Date().toISOString());
      await AsyncStorage.setItem('last_sync_time', data.timestamp);
      
      // Update local storage with server timestamp
      await AsyncStorage.setItem('driver_settings', JSON.stringify({
        ...settingsToSync,
        lastServerSync: data.timestamp
      }));
      
      if (!isBackground) {
        console.log('Settings synced with server');
      }
      
      setTimeout(() => setSyncProgress(0), 1000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncProgress(0);
      
      if (!isBackground) {
        Alert.alert('Sync Error', 'Could not sync with server. Changes saved locally.');
      }
    }
  };

  const autoSaveSettings = async () => {
    if (!hasUnsavedChanges || saving) return;
    
    try {
      await AsyncStorage.setItem('driver_settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      // Sync to server
      if (settings.realTimeSync && isConnected) {
        socketService.updateSettings(settings);
        
        // Update availability if changed
        if (prevOnlineStatusRef.current !== settings.onlineStatus) {
          socketService.updateAvailability(settings.onlineStatus);
          prevOnlineStatusRef.current = settings.onlineStatus;
        }
      }
      
      console.log('Auto-saved settings');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save locally
      await AsyncStorage.setItem('driver_settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      // Sync to server in real-time
      if (settings.realTimeSync) {
        if (isConnected) {
          socketService.updateSettings(settings);
        }
        await syncSettingsWithServer(settings);
      }
      
      // Update availability status
      if (prevOnlineStatusRef.current !== settings.onlineStatus) {
        if (isConnected) {
          socketService.updateAvailability(settings.onlineStatus);
        }
        prevOnlineStatusRef.current = settings.onlineStatus;
      }
      
      // Show success
      Alert.alert('Success', 'Settings saved and synced');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasUnsavedChanges(true);
    
    // Immediate sync for critical settings
    if (['onlineStatus', 'autoAcceptRides', 'realTimeSync'].includes(key)) {
      // Clear previous timeout
      if (settingsSyncTimeoutRef.current) {
        clearTimeout(settingsSyncTimeoutRef.current);
      }
      
      // Set new timeout for immediate sync
      settingsSyncTimeoutRef.current = setTimeout(() => {
        if (settings.realTimeSync && isConnected) {
          socketService.updateSettings(newSettings);
          
          // Special handling for online status
          if (key === 'onlineStatus') {
            socketService.updateAvailability(value);
            prevOnlineStatusRef.current = value;
          }
        }
      }, 300); // 300ms debounce
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default? This will disconnect real-time features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              onlineStatus: false, // Start offline after reset
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
              realTimeSync: true,
              backgroundUpdates: true,
              syncFrequency: 'instant',
            };
            setSettings(defaultSettings);
            setHasUnsavedChanges(true);
            
            // Disconnect socket temporarily
            socketService.disconnect();
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? This will disconnect all real-time features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            // Disconnect socket
            socketService.disconnect();
            
            // Clear real-time data
            setPendingRides([]);
            setRideRequestsCount(0);
            
            // Logout from Redux
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
      'This will clear app cache and temporary data. Real-time connections will be reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: async () => {
            try {
              // Clear async storage except auth
              const keys = await AsyncStorage.getAllKeys();
              const keysToKeep = ['auth_token', 'user_data', 'device_id'];
              const keysToRemove = keys.filter(key => !keysToKeep.includes(key));
              
              await AsyncStorage.multiRemove(keysToRemove);
              
              // Reset socket
              socketService.disconnect();
              setTimeout(() => {
                initializeSocket();
              }, 1000);
              
              Alert.alert('Cache Cleared', 'App cache has been cleared');
            } catch (error) {
              console.error('Clear cache error:', error);
            }
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
        { text: 'Live Chat', onPress: () => openLiveChat() },
      ]
    );
  };

  const openLiveChat = () => {
    if (isConnected) {
      // Join support room via socket
      socketService.socket?.emit('join_support_room', {
        userId: user?.id,
        userName: user?.name,
        issueType: 'settings_help'
      });
      
      navigation.navigate('SupportChat');
    } else {
      Alert.alert('Offline', 'Please connect to internet for live chat');
    }
  };

  const handleRateApp = () => {
    const storeUrl = Platform.OS === 'ios' 
      ? 'https://apps.apple.com/app/id123456789'
      : 'market://details?id=com.kabaza.app';
    
    Linking.openURL(storeUrl).catch(() => {
      Alert.alert('Error', 'Could not open app store');
    });
  };

  const handleReconnectSocket = () => {
    Alert.alert(
      'Reconnect',
      'Do you want to reconnect to real-time services?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reconnect', 
          onPress: () => {
            socketService.disconnect();
            setTimeout(() => {
              initializeSocket();
            }, 500);
          }
        }
      ]
    );
  };

  const handleViewRideRequests = () => {
    navigation.navigate('RideRequests', { pendingRides });
    setRideRequestsCount(0);
  };

  const renderConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      <View style={styles.statusRow}>
        <View style={[
          styles.connectionDot, 
          { backgroundColor: getStatusColor(socketStatus) }
        ]} />
        <Text style={styles.connectionText}>
          {socketStatus.toUpperCase()}
        </Text>
      </View>
      {lastSynced && (
        <Text style={styles.lastSyncedText}>
          Synced: {new Date(lastSynced).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
      )}
      {syncProgress > 0 && syncProgress < 100 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
        </View>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'disconnected': return '#F44336';
      case 'error': return '#FF5722';
      default: return '#9E9E9E';
    }
  };

  const renderRideRequestBadge = () => {
    if (rideRequestsCount === 0) return null;
    
    return (
      <TouchableOpacity 
        style={styles.rideRequestBadge}
        onPress={handleViewRideRequests}
      >
        <Text style={styles.badgeText}>{rideRequestsCount}</Text>
        <Icon name="car" size={14} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderSettingItem = ({ icon, title, description, value, onValueChange, type = 'switch', extraContent, disabled = false }) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={22} color={disabled ? "#ccc" : "#00B894"} style={styles.settingIcon} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, disabled && styles.textDisabled]}>{title}</Text>
          {description && <Text style={[styles.settingDescription, disabled && styles.textDisabled]}>{description}</Text>}
        </View>
      </View>
      
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={disabled ? null : onValueChange}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#00B894' : '#f4f3f4'}
          disabled={disabled}
        />
      ) : type === 'slider' ? (
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderValue, disabled && styles.textDisabled]}>{value} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={5}
            value={value}
            onValueChange={disabled ? null : onValueChange}
            minimumTrackTintColor={disabled ? "#ccc" : "#00B894"}
            maximumTrackTintColor="#ddd"
            thumbTintColor={disabled ? "#ccc" : "#00B894"}
            disabled={disabled}
          />
        </View>
      ) : null}

      {extraContent}
    </View>
  );

  const renderSection = (title, icon, children, isConnectedRequired = false) => (
    <View style={[styles.section, isConnectedRequired && !isConnected && styles.sectionDisabled]}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={18} color={isConnectedRequired && !isConnected ? "#ccc" : "#666"} />
        <Text style={[styles.sectionTitle, isConnectedRequired && !isConnected && styles.textDisabled]}>
          {title} {isConnectedRequired && !isConnected && '(Offline)'}
        </Text>
      </View>
      <View style={styles.sectionContent}>
        {isConnectedRequired && !isConnected ? (
          <TouchableOpacity style={styles.reconnectButton} onPress={handleReconnectSocket}>
            <Icon name="refresh" size={14} color="#fff" />
            <Text style={styles.reconnectText}>Reconnect to enable</Text>
          </TouchableOpacity>
        ) : (
          children
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (hasUnsavedChanges) {
              Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Save before leaving?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: "Don't Save", onPress: () => navigation.goBack() },
                  { text: 'Save', onPress: saveSettings }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerMiddle}>
          <Text style={styles.headerTitle}>Driver Settings</Text>
          {renderConnectionStatus()}
        </View>
        
        <View style={styles.headerRight}>
          {renderRideRequestBadge()}
          {hasUnsavedChanges && (
            <TouchableOpacity onPress={saveSettings} disabled={saving}>
              <Text style={styles.saveButton}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Real-Time Status Bar */}
      <View style={[
        styles.realtimeStatusBar,
        isConnected ? styles.realtimeConnected : styles.realtimeDisconnected
      ]}>
        <Icon 
          name={isConnected ? "wifi" : "wifi"} 
          size={14} 
          color={isConnected ? "#fff" : "#fff"} 
        />
        <Text style={styles.realtimeStatusText}>
          {isConnected 
            ? "Connected • Receiving live updates" 
            : "Offline • Changes saved locally"}
        </Text>
        {!isConnected && (
          <TouchableOpacity onPress={handleReconnectSocket}>
            <Text style={styles.reconnectLink}>Reconnect</Text>
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
            onValueChange: (value) => handleSettingChange('onlineStatus', value),
            disabled: !isConnected && settings.realTimeSync
          })}

          {renderSettingItem({
            icon: 'bolt',
            title: 'Auto-Accept Rides',
            description: 'Automatically accept incoming ride requests',
            value: settings.autoAcceptRides,
            onValueChange: (value) => handleSettingChange('autoAcceptRides', value),
            disabled: !isConnected
          })}

          <View style={styles.divider} />

          <View style={styles.tripTypeContainer}>
            <Text style={styles.tripTypeLabel}>Trip Preferences</Text>
            <View style={styles.tripTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  settings.acceptShortTrips && styles.tripTypeButtonActive,
                  !isConnected && styles.buttonDisabled
                ]}
                onPress={() => !isConnected ? null : handleSettingChange('acceptShortTrips', !settings.acceptShortTrips)}
                disabled={!isConnected}
              >
                <Icon 
                  name="road" 
                  size={16} 
                  color={settings.acceptShortTrips ? '#fff' : (!isConnected ? '#ccc' : '#666')} 
                />
                <Text style={[
                  styles.tripTypeText,
                  settings.acceptShortTrips && styles.tripTypeTextActive,
                  !isConnected && styles.textDisabled
                ]}>
                  Short Trips
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  settings.acceptLongTrips && styles.tripTypeButtonActive,
                  !isConnected && styles.buttonDisabled
                ]}
                onPress={() => !isConnected ? null : handleSettingChange('acceptLongTrips', !settings.acceptLongTrips)}
                disabled={!isConnected}
              >
                <Icon 
                  name="map" 
                  size={16} 
                  color={settings.acceptLongTrips ? '#fff' : (!isConnected ? '#ccc' : '#666')} 
                />
                <Text style={[
                  styles.tripTypeText,
                  settings.acceptLongTrips && styles.tripTypeTextActive,
                  !isConnected && styles.textDisabled
                ]}>
                  Long Trips
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ), true)}

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

          <TouchableOpacity 
            style={styles.preferredAreasButton}
            onPress={() => navigation.navigate('PreferredAreas')}
          >
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

      {/* Real-Time Settings */}
      {renderSection('Real-Time Settings', 'bolt', (
        <>
          {renderSettingItem({
            icon: 'refresh',
            title: 'Real-Time Sync',
            description: 'Sync settings across all your devices',
            value: settings.realTimeSync,
            onValueChange: (value) => handleSettingChange('realTimeSync', value)
          })}

          {renderSettingItem({
            icon: 'mobile',
            title: 'Background Updates',
            description: 'Receive updates when app is in background',
            value: settings.backgroundUpdates,
            onValueChange: (value) => handleSettingChange('backgroundUpdates', value),
            disabled: !settings.realTimeSync
          })}

          <View style={styles.syncFrequencyContainer}>
            <Text style={styles.syncFrequencyLabel}>Sync Frequency</Text>
            <View style={styles.syncFrequencyButtons}>
              {['instant', '5s', '30s'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.syncFrequencyButton,
                    settings.syncFrequency === freq && styles.syncFrequencyButtonActive,
                    !settings.realTimeSync && styles.buttonDisabled
                  ]}
                  onPress={() => !settings.realTimeSync ? null : handleSettingChange('syncFrequency', freq)}
                  disabled={!settings.realTimeSync}
                >
                  <Text style={[
                    styles.syncFrequencyText,
                    settings.syncFrequency === freq && styles.syncFrequencyTextActive,
                    !settings.realTimeSync && styles.textDisabled
                  ]}>
                    {freq === 'instant' ? 'Instant' : freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
        <View style={styles.realtimeInfo}>
          <Icon name="server" size={12} color="#666" />
          <Text style={styles.realtimeInfoText}>
            Socket: {socketStatus} • Last sync: {lastSynced ? new Date(lastSynced).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
          </Text>
        </View>
        
        <Text style={styles.versionText}>Kabaza Driver v1.0.0</Text>
        <Text style={styles.buildText}>Build 2024.01.15 • Real-Time Enabled</Text>
        
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

      {/* Floating Action Buttons */}
      {hasUnsavedChanges && (
        <TouchableOpacity 
          style={styles.floatingSaveButton} 
          onPress={saveSettings}
          disabled={saving}
        >
          <Icon name="save" size={20} color="#fff" />
          <Text style={styles.floatingSaveText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      )}

      {rideRequestsCount > 0 && (
        <TouchableOpacity 
          style={styles.floatingRideButton}
          onPress={handleViewRideRequests}
        >
          <Icon name="car" size={22} color="#fff" />
          <View style={styles.floatingRideBadge}>
            <Text style={styles.floatingRideBadgeText}>{rideRequestsCount}</Text>
          </View>
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
  headerMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  saveButton: { color: '#00B894', fontSize: 16, fontWeight: '600' },
  
  // Connection Status
  connectionStatus: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  lastSyncedText: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
  },
  progressBar: {
    width: 80,
    height: 3,
    backgroundColor: '#eee',
    marginTop: 4,
    borderRadius: 1.5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 1.5,
  },
  
  // Real-time Status Bar
  realtimeStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    gap: 8,
  },
  realtimeConnected: {
    backgroundColor: '#4CAF50',
  },
  realtimeDisconnected: {
    backgroundColor: '#F44336',
  },
  realtimeStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  reconnectLink: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    marginLeft: 10,
  },
  
  // Ride Request Badge
  rideRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Sections
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
  sectionDisabled: {
    opacity: 0.6,
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
  
  // Reconnect Button
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginVertical: 10,
  },
  reconnectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Setting Items
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: 15, width: 24 },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 15, color: '#333', marginBottom: 2 },
  settingDescription: { fontSize: 12, color: '#666', lineHeight: 16 },
  textDisabled: {
    color: '#ccc',
  },
  
  // Sliders
  sliderContainer: { width: 150 },
  slider: { width: '100%', height: 40 },
  sliderValue: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 5 },
  minFareContainer: { width: 180, marginTop: 10 },
  minFareValue: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 5 },
  
  // Dividers
  divider: { height: 1, backgroundColor: '#f5f5f5', marginVertical: 10 },
  
  // Trip Type Buttons
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
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
  tripTypeText: { fontSize: 14, color: '#666' },
  tripTypeTextActive: { color: '#fff', fontWeight: '600' },
  
  // Preferred Areas
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
  
  // Sync Frequency
  syncFrequencyContainer: { marginVertical: 10 },
  syncFrequencyLabel: { fontSize: 14, color: '#666', marginBottom: 10 },
  syncFrequencyButtons: { flexDirection: 'row', gap: 10 },
  syncFrequencyButton: { 
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  syncFrequencyButtonActive: { backgroundColor: '#00B894', borderColor: '#00B894' },
  syncFrequencyText: { fontSize: 14, color: '#666', fontWeight: '500' },
  syncFrequencyTextActive: { color: '#fff', fontWeight: '600' },
  
  // Notification Options
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
  
  // Actions Container
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
  
  // Info Container
  infoContainer: { 
    alignItems: 'center', 
    marginTop: 20,
    marginBottom: 20,
  },
  realtimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  realtimeInfoText: {
    fontSize: 11,
    color: '#666',
  },
  versionText: { fontSize: 14, color: '#666', marginBottom: 5 },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  termsButton: { paddingVertical: 8 },
  termsText: { fontSize: 14, color: '#00B894', textDecorationLine: 'underline' },
  
  // Logout Button
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
  
  // Floating Buttons
  floatingSaveButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#00B894',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    gap: 10,
  },
  floatingSaveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  floatingRideButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#FF6B6B',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingRideBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  floatingRideBadgeText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
});