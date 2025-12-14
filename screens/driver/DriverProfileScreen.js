// screens/driver/DriverProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Switch, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from 'src/store/slices/authSlice';
import { updateDriverStatus, updateDriverProfile } from 'src/store/slices/driverSlice';
import realTimeService from 'services/RealTimeService/RealTimeService';
import LocationService from 'services/location/locationService';
import socketService from 'services/Socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DriverProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const driver = useSelector(state => state.driver.currentDriver);
  const auth = useSelector(state => state.auth);
  
  const [profileData, setProfileData] = useState({
    name: 'John Driver',
    phone: '+265 888 123 456',
    email: 'john.driver@email.com',
    driverId: 'DRV-2023-00123',
    rating: 4.8,
    totalTrips: 127,
    totalEarnings: 'MWK 245,300',
    vehicle: {
      make: 'TVS',
      model: 'Apache RTR 160',
      year: '2022',
      plate: 'LL 1234',
      color: 'Red'
    },
    status: 'offline', // offline, available, busy, on_trip
    notifications: true,
    locationSharing: true
  });

  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);

  // Load real driver data on mount
  useEffect(() => {
    loadDriverData();
    setupRealTimeListeners();
    
    return () => {
      cleanupRealTimeListeners();
    };
  }, []);

  // Update driver status based on real-time service
  useEffect(() => {
    if (driver?.status) {
      setProfileData(prev => ({
        ...prev,
        status: driver.status,
        ...(driver.totalTrips && { totalTrips: driver.totalTrips }),
        ...(driver.totalEarnings && { totalEarnings: formatEarnings(driver.totalEarnings) }),
        ...(driver.rating && { rating: driver.rating }),
      }));
    }
  }, [driver]);

  // Listen to socket connection status
  useEffect(() => {
    const updateConnectionStatus = (isConnected) => {
      setSocketConnected(isConnected);
      if (!isConnected && profileData.status !== 'offline') {
        Alert.alert(
          'Connection Lost',
          'Your connection to the server was lost. Please check your internet.',
          [{ text: 'OK' }]
        );
      }
    };

    socketService.onConnectionChange(updateConnectionStatus);
    return () => socketService.offConnectionChange(updateConnectionStatus);
  }, [profileData.status]);

  const loadDriverData = async () => {
    try {
      setIsLoading(true);
      
      // Load from Redux store
      if (driver) {
        setProfileData(prev => ({
          ...prev,
          ...driver,
          totalEarnings: formatEarnings(driver.totalEarnings || 0),
        }));
      }

      // Load from AsyncStorage as backup
      const storedProfile = await AsyncStorage.getItem('driver_profile');
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        setProfileData(prev => ({ ...prev, ...parsedProfile }));
      }

      // Check current socket connection
      const isConnected = await socketService.isConnected();
      setSocketConnected(isConnected);

      // Check if location tracking is active
      const isLocationTracking = await LocationService.isTracking();
      setLocationTracking(isLocationTracking);
      
    } catch (error) {
      console.error('Failed to load driver data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealTimeListeners = () => {
    // Listen for profile updates from server
    socketService.on('driver:profile:updated', (updatedProfile) => {
      dispatch(updateDriverProfile(updatedProfile));
      setProfileData(prev => ({ ...prev, ...updatedProfile }));
    });

    // Listen for earnings updates
    socketService.on('driver:earnings:updated', (earningsData) => {
      setProfileData(prev => ({
        ...prev,
        totalEarnings: formatEarnings(earningsData.total),
        totalTrips: earningsData.totalTrips || prev.totalTrips,
      }));
    });

    // Listen for status changes from other devices
    socketService.on('driver:status:updated', (statusData) => {
      if (statusData.driverId === driver?.id) {
        setProfileData(prev => ({ ...prev, status: statusData.status }));
        dispatch(updateDriverStatus(statusData.status));
      }
    });
  };

  const cleanupRealTimeListeners = () => {
    socketService.off('driver:profile:updated');
    socketService.off('driver:earnings:updated');
    socketService.off('driver:status:updated');
  };

  const handleStatusChange = async (value) => {
    try {
      const newStatus = value ? 'available' : 'offline';
      
      if (value) {
        // Going online - confirm and start tracking
        Alert.alert(
          'Go Online',
          'You will start receiving ride requests and your location will be shared.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go Online',
              onPress: async () => {
                await goOnline();
              }
            }
          ]
        );
      } else {
        // Going offline - confirm and stop tracking
        Alert.alert(
          'Go Offline',
          'You will stop receiving ride requests.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go Offline',
              style: 'destructive',
              onPress: async () => {
                await goOffline();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Status change error:', error);
      Alert.alert('Error', 'Failed to change status. Please try again.');
    }
  };

  const goOnline = async () => {
    try {
      // Start location tracking
      await LocationService.startTracking();
      setLocationTracking(true);
      
      // Update status via socket
      const success = await realTimeService.updateDriverStatus('available');
      
      if (success) {
        dispatch(updateDriverStatus('available'));
        setProfileData(prev => ({ ...prev, status: 'available' }));
        
        // Start sending location updates
        LocationService.onLocationUpdate(async (location) => {
          await realTimeService.updateDriverLocation(location);
        });
      }
    } catch (error) {
      console.error('Failed to go online:', error);
      Alert.alert('Error', 'Failed to go online. Please check your location settings.');
    }
  };

  const goOffline = async () => {
    try {
      // Stop location tracking
      await LocationService.stopTracking();
      setLocationTracking(false);
      
      // Update status via socket
      await realTimeService.updateDriverStatus('offline');
      
      dispatch(updateDriverStatus('offline'));
      setProfileData(prev => ({ ...prev, status: 'offline' }));
    } catch (error) {
      console.error('Failed to go offline:', error);
    }
  };

  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: false,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to select image');
        return;
      }
      if (response.assets && response.assets[0]) {
        setProfileImage(response.assets[0]);
        // Upload to server
        await uploadProfileImage(response.assets[0]);
      }
    });
  };

  const uploadProfileImage = async (image) => {
    try {
      const formData = new FormData();
      formData.append('profileImage', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: `profile_${Date.now()}.jpg`,
      });

      const response = await fetch(`${API_URL}/driver/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Update via socket
        socketService.emit('driver:profile:image:updated', result.imageUrl);
        Alert.alert('Success', 'Profile image updated');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
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
          onPress: async () => {
            // Go offline before logout
            await goOffline();
            
            // Disconnect socket
            socketService.disconnect();
            
            // Clear real-time services
            realTimeService.cleanup();
            
            // Dispatch logout
            dispatch(logout());
            navigation.replace('PhoneOrGoogle');
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDriverData();
    
    // Fetch fresh data from server
    try {
      await realTimeService.syncDriverData();
    } catch (error) {
      console.error('Sync error:', error);
    }
    
    setRefreshing(false);
  }, []);

  const formatEarnings = (amount) => {
    if (typeof amount === 'number') {
      return `MWK ${amount.toLocaleString()}`;
    }
    return amount || 'MWK 0';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#00B894';
      case 'busy': return '#FF9800';
      case 'on_trip': return '#F44336';
      case 'offline': return '#666';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'on_trip': return 'On Trip';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  const menuItems = [
    {
      title: 'Vehicle Information',
      icon: 'car',
      onPress: () => navigation.navigate('VehicleInfo', { vehicle: profileData.vehicle }),
      showArrow: true
    },
    {
      title: 'Documents',
      icon: 'file-text',
      onPress: () => navigation.navigate('Documents'),
      showArrow: true
    },
    {
      title: 'Bank Details',
      icon: 'bank',
      onPress: () => navigation.navigate('BankDetails'),
      showArrow: true
    },
    {
      title: 'Earnings Dashboard',
      icon: 'bar-chart',
      onPress: () => navigation.navigate('EarningsDashboard'),
      showArrow: true
    },
    {
      title: 'Real-Time Stats',
      icon: 'dashboard',
      onPress: () => navigation.navigate('RealTimeStats'),
      showArrow: true
    },
    {
      title: 'Help & Support',
      icon: 'question-circle',
      onPress: () => navigation.navigate('HelpSupport'),
      showArrow: true
    },
    {
      title: 'About Kabaza',
      icon: 'info-circle',
      onPress: () => navigation.navigate('About'),
      showArrow: true
    },
    {
      title: 'Privacy Policy',
      icon: 'shield',
      onPress: () => navigation.navigate('PrivacyPolicy'),
      showArrow: true
    },
    {
      title: 'Logout',
      icon: 'sign-out',
      onPress: handleLogout,
      showArrow: false,
      color: '#FF6B6B'
    },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Connection Status Bar */}
      <View style={[
        styles.connectionBar,
        { backgroundColor: socketConnected ? '#00B894' : '#F44336' }
      ]}>
        <Icon 
          name={socketConnected ? 'check-circle' : 'exclamation-circle'} 
          size={14} 
          color="#fff" 
        />
        <Text style={styles.connectionText}>
          {socketConnected ? 'Connected to server' : 'Disconnected - No ride requests'}
        </Text>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.profileImageContainer}
          onPress={handleSelectImage}
        >
          {profileImage ? (
            <Image 
              source={{ uri: profileImage.uri }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Icon name="user" size={40} color="#fff" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
          
          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(profileData.status) }
          ]}>
            <Text style={styles.statusBadgeText}>
              {getStatusText(profileData.status)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.profileName}>{profileData.name}</Text>
        <Text style={styles.profilePhone}>{profileData.phone}</Text>
        
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{profileData.rating.toFixed(1)}</Text>
          <Text style={styles.driverId}> • {profileData.driverId}</Text>
        </View>
      </View>

      {/* Stats Cards with Real-Time Updates */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profileData.totalTrips}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
          <Icon name="history" size={12} color="#666" style={styles.statIcon} />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profileData.totalEarnings}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
          <Icon name="money" size={12} color="#666" style={styles.statIcon} />
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profileData.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
          <Icon name="star" size={12} color="#666" style={styles.statIcon} />
        </View>
      </View>

      {/* Online Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Icon 
            name="power-off" 
            size={20} 
            color={profileData.status === 'available' ? "#00B894" : "#666"} 
          />
          <Text style={styles.statusTitle}>Driver Status</Text>
          <Switch
            value={profileData.status === 'available'}
            onValueChange={handleStatusChange}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={profileData.status === 'available' ? '#00B894' : '#f4f3f4'}
            disabled={profileData.status === 'busy' || profileData.status === 'on_trip'}
          />
        </View>
        <Text style={styles.statusText}>
          {profileData.status === 'available' 
            ? `✅ Online - Receiving ride requests • Location: ${locationTracking ? 'ON' : 'OFF'}` 
            : profileData.status === 'busy'
            ? '🟡 Busy - You have an active ride request'
            : profileData.status === 'on_trip'
            ? '🔴 On Trip - Currently driving a passenger'
            : '⚫ Offline - Not receiving ride requests'}
        </Text>
        
        {profileData.status === 'busy' || profileData.status === 'on_trip' ? (
          <TouchableOpacity 
            style={styles.viewActiveRideButton}
            onPress={() => navigation.navigate('ActiveRide')}
          >
            <Text style={styles.viewActiveRideText}>View Active Ride →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Settings with Real-Time Sync */}
      <View style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="bell" size={20} color="#666" style={styles.settingIcon} />
            <View>
              <Text style={styles.settingText}>Notifications</Text>
              <Text style={styles.settingSubtext}>Ride requests & updates</Text>
            </View>
          </View>
          <Switch
            value={profileData.notifications}
            onValueChange={(value) => {
              setProfileData({...profileData, notifications: value});
              socketService.emit('driver:settings:updated', { notifications: value });
            }}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="map-marker" size={20} color="#666" style={styles.settingIcon} />
            <View>
              <Text style={styles.settingText}>Location Sharing</Text>
              <Text style={styles.settingSubtext}>
                {locationTracking ? 'Currently tracking' : 'Location tracking off'}
              </Text>
            </View>
          </View>
          <Switch
            value={profileData.locationSharing}
            onValueChange={async (value) => {
              setProfileData({...profileData, locationSharing: value});
              if (value) {
                await LocationService.startTracking();
                setLocationTracking(true);
              } else {
                await LocationService.stopTracking();
                setLocationTracking(false);
              }
              socketService.emit('driver:settings:updated', { locationSharing: value });
            }}
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <Icon 
                name={item.icon} 
                size={20} 
                color={item.color || '#666'} 
                style={styles.menuIcon} 
              />
              <Text style={[styles.menuText, item.color && { color: item.color }]}>
                {item.title}
              </Text>
            </View>
            {item.showArrow && <Icon name="chevron-right" size={16} color="#ccc" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Connection Info */}
      <View style={styles.connectionInfo}>
        <Icon 
          name="signal" 
          size={14} 
          color={socketConnected ? '#00B894' : '#999'} 
        />
        <Text style={styles.connectionInfoText}>
          {socketConnected 
            ? `Connected • Last update: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
            : 'Connecting...'}
        </Text>
      </View>

      {/* Version Info */}
      <Text style={styles.versionText}>Kabaza Driver v1.0.0 • Real-Time Enabled</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  profileHeader: { 
    alignItems: 'center', 
    paddingVertical: 30, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: { 
    position: 'relative', 
    marginBottom: 20,
  },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  profileImagePlaceholder: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#00B894',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00B894',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    zIndex: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  profilePhone: { fontSize: 16, color: '#666', marginBottom: 10 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 5 },
  driverId: { fontSize: 14, color: '#999' },
  statsContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statCard: { 
    flex: 1, 
    alignItems: 'center',
    position: 'relative',
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#00B894', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666', marginBottom: 3 },
  statIcon: { position: 'absolute', bottom: 5 },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1, marginLeft: 10 },
  statusText: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 10 },
  viewActiveRideButton: {
    backgroundColor: '#00B89410',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00B89430',
    alignItems: 'center',
  },
  viewActiveRideText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: 15, width: 24 },
  settingText: { fontSize: 16, color: '#333' },
  settingSubtext: { fontSize: 12, color: '#999', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIcon: { marginRight: 15, width: 24 },
  menuText: { fontSize: 16, color: '#333' },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  connectionInfoText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  versionText: { 
    textAlign: 'center', 
    fontSize: 12, 
    color: '#999', 
    marginBottom: 30,
    marginTop: 10,
  },
});