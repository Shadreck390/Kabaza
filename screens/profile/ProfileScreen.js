// screens/profile/ProfileScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Image,
  Animated, ActivityIndicator, StatusBar, RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserProfile, switchUserRole, updateUserSettings } from 'src/store/slices/authSlice';
import { updateDriverStatus } from 'src/store/slices/driverSlice';
import socketService from 'services/socket/SocketService';
import realTimeService from 'services/RealTimeService/RealTimeService';
import LocationService from 'services/socket/locationService';
import PushNotificationService from 'services/notification/PushNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'react-native-image-picker';

export default function ProfileScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const driver = useSelector(state => state.driver.currentDriver);
  const rider = useSelector(state => state.rider.currentRider);
  
  const [userData, setUserData] = useState({
    name: 'User',
    phone: 'Not provided',
    email: 'Not provided',
    profilePicture: null,
    joinedDate: 'January 2024',
    totalRides: 0,
    totalEarnings: 0,
    rating: 0,
    role: 'rider',
    authMethod: 'phone'
  });
  
  const [userRole, setUserRole] = useState(auth?.userRole || 'rider');
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weeklyEarnings: 0,
    rideStreak: 0,
    onlineHours: 0,
  });
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const switchAnim = useRef(new Animated.Value(userRole === 'driver' ? 1 : 0)).current;
  
  const socketListeners = useRef([]);
  const statsInterval = useRef(null);
  const profileUpdateInterval = useRef(null);

  // Initialize real-time services
  useEffect(() => {
    initializeProfile();
    setupRealTimeListeners();
    
    return () => {
      cleanup();
    };
  }, []);

  // Update user data when auth state changes
  useEffect(() => {
    if (auth.user) {
      loadUserData();
    }
  }, [auth.user, auth.userRole]);

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Animate role switch
  useEffect(() => {
    Animated.timing(switchAnim, {
      toValue: userRole === 'driver' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [userRole]);

  const initializeProfile = async () => {
    try {
      setLoading(true);
      
      // Connect to socket
      await socketService.connect();
      setSocketConnected(true);
      
      // Load user data
      await loadUserData();
      
      // Load settings
      const settings = await AsyncStorage.getItem('user_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotifications(parsed.notifications || true);
        setLocationTracking(parsed.locationTracking || true);
      }
      
      // Start real-time updates
      startRealTimeUpdates();
      
      setLoading(false);
      
    } catch (error) {
      console.error('Profile initialization error:', error);
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    const currentUser = auth.user || {};
    const currentRole = auth.userRole || 'rider';
    
    // Get stats based on role
    let statsData = {};
    if (currentRole === 'driver' && driver) {
      statsData = {
        totalRides: driver.completedRides || 0,
        totalEarnings: driver.totalEarnings || 0,
        rating: driver.rating || 0,
        todayEarnings: driver.todayEarnings || 0,
        weeklyEarnings: driver.weeklyEarnings || 0,
        rideStreak: driver.rideStreak || 0,
        onlineHours: driver.onlineHours || 0,
      };
    } else if (currentRole === 'rider' && rider) {
      statsData = {
        totalRides: rider.totalRides || 0,
        totalEarnings: 0,
        rating: rider.rating || 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        rideStreak: rider.rideStreak || 0,
        onlineHours: 0,
      };
    }
    
    const data = {
      name: currentUser.name || 'User',
      phone: currentUser.phone || 'Not provided',
      email: currentUser.email || 'Not provided',
      profilePicture: currentUser.profilePicture || null,
      joinedDate: formatDate(currentUser.createdAt) || 'January 2024',
      role: currentRole,
      authMethod: currentUser.authMethod || 'phone',
      ...statsData,
    };
    
    setUserData(data);
    setUserRole(currentRole);
    setStats(statsData);
  };

  const setupRealTimeListeners = () => {
    // Listen for profile updates
    const profileUpdateListener = socketService.on('profile:updated', (updatedProfile) => {
      dispatch(updateUserProfile(updatedProfile));
      setUserData(prev => ({ ...prev, ...updatedProfile }));
      
      // Show notification
      Alert.alert('Profile Updated', 'Your profile has been updated from another device.');
    });

    // Listen for stats updates
    const statsUpdateListener = socketService.on('stats:updated', (newStats) => {
      setStats(prev => ({ ...prev, ...newStats }));
      
      // Update user data with new stats
      setUserData(prev => ({
        ...prev,
        totalRides: newStats.totalRides || prev.totalRides,
        totalEarnings: newStats.totalEarnings || prev.totalEarnings,
        rating: newStats.rating || prev.rating,
      }));
    });

    // Listen for role switch approvals
    const roleSwitchListener = socketService.on('role:switch:approved', (data) => {
      if (data.userId === auth.user?.id) {
        setIsSwitchingRole(false);
        completeRoleSwitch(data.newRole);
      }
    });

    // Listen for earnings updates
    const earningsListener = socketService.on('earnings:update', (earnings) => {
      if (earnings.userId === auth.user?.id) {
        setStats(prev => ({
          ...prev,
          todayEarnings: earnings.today || prev.todayEarnings,
          weeklyEarnings: earnings.week || prev.weeklyEarnings,
          totalEarnings: earnings.total || prev.totalEarnings,
        }));
      }
    });

    // Listen for connection status
    const connectionListener = socketService.onConnectionChange((connected) => {
      setSocketConnected(connected);
      if (!connected) {
        Alert.alert(
          'Connection Lost',
          'Profile updates will sync when connection is restored.',
          [{ text: 'OK' }]
        );
      }
    });

    // Store listeners for cleanup
    socketListeners.current = [
      profileUpdateListener,
      statsUpdateListener,
      roleSwitchListener,
      earningsListener,
      connectionListener,
    ];
  };

  const startRealTimeUpdates = () => {
    // Update stats every minute
    statsInterval.current = setInterval(async () => {
      if (socketConnected) {
        await updateLiveStats();
      }
    }, 60000);

    // Check for profile updates every 30 seconds
    profileUpdateInterval.current = setInterval(async () => {
      if (socketConnected) {
        await checkForProfileUpdates();
      }
    }, 30000);
  };

  const updateLiveStats = async () => {
    try {
      const liveStats = await realTimeService.getLiveStats(auth.user?.id, userRole);
      if (liveStats) {
        setStats(prev => ({ ...prev, ...liveStats }));
      }
    } catch (error) {
      console.error('Live stats update error:', error);
    }
  };

  const checkForProfileUpdates = async () => {
    try {
      const updates = await realTimeService.getProfileUpdates(auth.user?.id);
      if (updates && updates.length > 0) {
        setProfileUpdates(updates);
        
        // Show latest update
        if (updates[0]) {
          Alert.alert('Profile Update', updates[0].message);
        }
      }
    } catch (error) {
      console.error('Profile updates check error:', error);
    }
  };

  const cleanup = () => {
    // Clear intervals
    if (statsInterval.current) clearInterval(statsInterval.current);
    if (profileUpdateInterval.current) clearInterval(profileUpdateInterval.current);
    
    // Remove socket listeners
    socketListeners.current.forEach(listener => {
      if (listener) socketService.off(listener);
    });
    
    // Disconnect socket
    socketService.disconnect();
  };

  const handleRoleSwitch = async () => {
    if (isSwitchingRole) return;
    
    const newRole = userRole === 'rider' ? 'driver' : 'rider';
    
    Alert.alert(
      'Switch Role',
      `Are you sure you want to switch to ${newRole} mode?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: async () => {
            setIsSwitchingRole(true);
            
            try {
              // If switching to driver, check requirements
              if (newRole === 'driver') {
                const canSwitch = await checkDriverRequirements();
                if (!canSwitch) {
                  setIsSwitchingRole(false);
                  return;
                }
              }
              
              // Emit role switch request via socket
              socketService.emit('role:switch:request', {
                userId: auth.user?.id,
                currentRole: userRole,
                requestedRole: newRole,
                timestamp: new Date().toISOString(),
              });
              
              // Show processing message
              Alert.alert(
                'Processing',
                'Your role switch request is being processed. This may take a moment.',
                [{ text: 'OK' }]
              );
              
              // Set timeout for response
              setTimeout(() => {
                if (isSwitchingRole) {
                  setIsSwitchingRole(false);
                  Alert.alert(
                    'Request Timeout',
                    'Role switch request timed out. Please try again.',
                    [{ text: 'OK' }]
                  );
                }
              }, 10000);
              
            } catch (error) {
              console.error('Role switch error:', error);
              setIsSwitchingRole(false);
              Alert.alert('Error', 'Failed to switch role. Please try again.');
            }
          }
        }
      ]
    );
  };

  const checkDriverRequirements = async () => {
    // Check if user has completed driver requirements
    const requirements = await realTimeService.checkDriverRequirements(auth.user?.id);
    
    if (!requirements.completed) {
      Alert.alert(
        'Requirements Not Met',
        `To become a driver, you need to:\n${requirements.missing.join('\n')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Now', onPress: () => navigation.navigate('DriverOnboarding') }
        ]
      );
      return false;
    }
    
    return true;
  };

  const completeRoleSwitch = (newRole) => {
    // Update local state
    setUserRole(newRole);
    
    // Update Redux store
    dispatch(switchUserRole(newRole));
    
    // Save to AsyncStorage
    AsyncStorage.setItem('user_role', newRole);
    
    // Update settings based on role
    if (newRole === 'driver') {
      // Enable location tracking for drivers
      setLocationTracking(true);
      LocationService.startTracking();
    }
    
    // Show success message
    Alert.alert(
      'Role Switched Successfully!',
      `You are now in ${newRole} mode.`,
      [
        { 
          text: 'Continue', 
          onPress: () => {
            // Navigate to the appropriate home screen
            const routeName = newRole === 'rider' ? 'RiderHome' : 'DriverHome';
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ 
                  name: routeName,
                  params: {
                    userRole: newRole
                  }
                }],
              })
            );
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { 
      userRole,
      onProfileUpdate: (updatedProfile) => {
        // Update via socket
        socketService.emit('profile:update', updatedProfile);
        
        // Update local state
        setUserData(prev => ({ ...prev, ...updatedProfile }));
      }
    });
  };

  const handleProfileImageUpdate = async () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose image source',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Take Photo', 
          onPress: () => launchCamera()
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => launchImagePicker()
        },
      ]
    );
  };

  const launchCamera = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
    };

    try {
      const response = await ImagePicker.launchCamera(options);
      if (response.assets?.[0]) {
        await uploadProfileImage(response.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const launchImagePicker = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
    };

    try {
      const response = await ImagePicker.launchImageLibrary(options);
      if (response.assets?.[0]) {
        await uploadProfileImage(response.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  const uploadProfileImage = async (image) => {
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('profileImage', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: `profile_${Date.now()}.jpg`,
      });

      // Upload to server
      const response = await fetch(`${API_URL}/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setUserData(prev => ({ ...prev, profilePicture: result.imageUrl }));
        
        // Emit socket event
        socketService.emit('profile:image:updated', {
          userId: auth.user?.id,
          imageUrl: result.imageUrl,
          timestamp: new Date().toISOString(),
        });
        
        // Update Redux store
        dispatch(updateUserProfile({ profilePicture: result.imageUrl }));
        
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNotificationToggle = async (value) => {
    setNotifications(value);
    
    // Update settings via socket
    socketService.emit('settings:update', {
      userId: auth.user?.id,
      notifications: value,
      timestamp: new Date().toISOString(),
    });
    
    // Save locally
    await AsyncStorage.setItem('user_settings', JSON.stringify({
      notifications: value,
      locationTracking,
    }));
    
    // Update Push Notifications
    if (value) {
      await PushNotificationService.enableNotifications();
    } else {
      await PushNotificationService.disableNotifications();
    }
  };

  const handleLocationTrackingToggle = async (value) => {
    setLocationTracking(value);
    
    // Update settings via socket
    socketService.emit('settings:update', {
      userId: auth.user?.id,
      locationTracking: value,
      timestamp: new Date().toISOString(),
    });
    
    // Save locally
    await AsyncStorage.setItem('user_settings', JSON.stringify({
      notifications,
      locationTracking: value,
    }));
    
    // Update Location Service
    if (value) {
      await LocationService.startTracking();
    } else {
      await LocationService.stopTracking();
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // If driver, go offline
              if (userRole === 'driver') {
                await realTimeService.updateDriverStatus('offline');
                dispatch(updateDriverStatus('offline'));
              }
              
              // Disconnect socket
              socketService.disconnect();
              
              // Stop location tracking
              await LocationService.stopTracking();
              
              // Clear real-time services
              realTimeService.cleanup();
              
              // Dispatch logout action
              // This would be handled by your auth logout action
              
              // Navigate to login
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'PhoneOrGoogle' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await updateLiveStats();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'January 2024';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getAuthMethodIcon = () => {
    switch (userData.authMethod) {
      case 'google':
        return { icon: 'google', color: '#DB4437', name: 'Google' };
      case 'facebook':
        return { icon: 'facebook', color: '#4267B2', name: 'Facebook' };
      default:
        return { icon: 'phone', color: '#4CAF50', name: 'Phone' };
    }
  };

  const getConnectionStatusColor = () => {
    return socketConnected ? '#4CAF50' : '#FF6B6B';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#00B894" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B894" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
          <Text style={styles.loadingSubtext}>Setting up real-time features</Text>
        </View>
      </View>
    );
  }

  const authMethodInfo = getAuthMethodIcon();

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <StatusBar backgroundColor="#00B894" barStyle="light-content" />
      
      {/* Connection Status Bar */}
      <View style={[
        styles.connectionBar,
        { backgroundColor: getConnectionStatusColor() }
      ]}>
        <Icon 
          name={socketConnected ? 'wifi' : 'wifi-slash'} 
          size={12} 
          color="#fff" 
        />
        <Text style={styles.connectionText}>
          {socketConnected ? 'Real-Time Connected' : 'Offline Mode'}
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight}>
          <Animated.View 
            style={[
              styles.roleSwitchIndicator,
              {
                transform: [{
                  translateX: switchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 30]
                  })
                }]
              }
            ]}
          >
            <Icon 
              name={userRole === 'driver' ? 'car' : 'user'} 
              size={12} 
              color="#fff" 
            />
          </Animated.View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {userRole === 'rider' ? 'Rider' : 'Driver'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#00B894']}
            tintColor="#00B894"
          />
        }
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              onPress={handleProfileImageUpdate}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : userData.profilePicture ? (
                <Image 
                  source={{ uri: userData.profilePicture }} 
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="user" size={30} color="#6c3" />
                </View>
              )}
            </TouchableOpacity>
            {!uploadingImage && (
              <TouchableOpacity 
                style={styles.editAvatarButton} 
                onPress={handleProfileImageUpdate}
              >
                <Icon name="camera" size={12} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={styles.authMethodBadge}>
              <Icon name={authMethodInfo.icon} size={12} color={authMethodInfo.color} />
              <Text style={styles.authMethodText}>Signed in with {authMethodInfo.name}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Icon name="phone" size={12} color="#666" />
              <Text style={styles.contactText}>{userData.phone}</Text>
            </View>
            {userData.email !== 'Not provided' && (
              <View style={styles.contactInfo}>
                <Icon name="envelope" size={12} color="#666" />
                <Text style={styles.contactText}>{userData.email}</Text>
              </View>
            )}
            <Text style={styles.joinDate}>Member since {userData.joinedDate}</Text>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Icon name="edit" size={14} color="#6c3" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Real-Time Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData.totalRides}</Text>
            <Text style={styles.statLabel}>
              {userRole === 'rider' ? 'Total Rides' : 'Completed Rides'}
            </Text>
            {userRole === 'driver' && stats.todayEarnings > 0 && (
              <Text style={styles.statSubtext}>+{stats.todayEarnings} today</Text>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.statNumber}>{userData.rating}</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
            {userRole === 'driver' && stats.rideStreak > 0 && (
              <Text style={styles.statSubtext}>{stats.rideStreak} day streak</Text>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {userRole === 'driver' ? `MWK ${userData.totalEarnings.toLocaleString()}` : userRole === 'rider' ? 'Rider' : 'Driver'}
            </Text>
            <Text style={styles.statLabel}>
              {userRole === 'driver' ? 'Total Earnings' : 'Current Role'}
            </Text>
            {userRole === 'driver' && stats.weeklyEarnings > 0 && (
              <Text style={styles.statSubtext}>MWK {stats.weeklyEarnings.toLocaleString()} this week</Text>
            )}
          </View>
        </View>

        {/* Real-Time Status */}
        {userRole === 'driver' && driver?.status && (
          <View style={[
            styles.statusBanner,
            { 
              backgroundColor: 
                driver.status === 'available' ? '#E8F5E8' :
                driver.status === 'busy' ? '#FFF3CD' :
                driver.status === 'on_trip' ? '#FFEBEE' : '#F5F5F5'
            }
          ]}>
            <Icon 
              name={
                driver.status === 'available' ? 'check-circle' :
                driver.status === 'busy' ? 'clock-o' :
                driver.status === 'on_trip' ? 'car' : 'power-off'
              } 
              size={16} 
              color={
                driver.status === 'available' ? '#4CAF50' :
                driver.status === 'busy' ? '#FFA726' :
                driver.status === 'on_trip' ? '#FF6B6B' : '#666'
              } 
            />
            <Text style={[
              styles.statusText,
              { 
                color: 
                  driver.status === 'available' ? '#2E7D32' :
                  driver.status === 'busy' ? '#FF8F00' :
                  driver.status === 'on_trip' ? '#D32F2F' : '#666'
              }
            ]}>
              Status: {driver.status.replace('_', ' ').toUpperCase()}
            </Text>
            {driver.status === 'available' && stats.onlineHours > 0 && (
              <Text style={styles.onlineHoursText}>
                • {stats.onlineHours} hours online
              </Text>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, isSwitchingRole && styles.menuItemDisabled]} 
            onPress={handleRoleSwitch}
            disabled={isSwitchingRole}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff0e8' }]}>
                {isSwitchingRole ? (
                  <ActivityIndicator size="small" color="#FF6B00" />
                ) : (
                  <Icon name="exchange" size={18} color="#FF6B00" />
                )}
              </View>
              <View>
                <Text style={styles.menuText}>
                  {isSwitchingRole ? 'Switching...' : `Switch to ${userRole === 'rider' ? 'Driver' : 'Rider'}`}
                </Text>
                <Text style={styles.menuSubtext}>
                  {userRole === 'rider' ? 'Start earning as a driver' : 'Book rides as a passenger'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          {/* Role-specific menu items */}
          {userRole === 'driver' ? (
            <>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate('DriverEarnings')}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                    <Icon name="money" size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.menuText}>Earnings & Analytics</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate('VehicleManagement')}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                    <Icon name="car" size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.menuText}>Vehicle Information</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate('DriverSchedule')}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                    <Icon name="clock-o" size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.menuText}>Driving Schedule</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                    <Icon name="heart" size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.menuText}>Favorite Drivers</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                    <Icon name="map-marker" size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.menuText}>Saved Locations</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                    <Icon name="credit-card" size={18} color="#4CAF50" />
                  </View>
                  <Text style={styles.menuText}>Payment Methods</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#999" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="shield" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Safety Center</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Real-Time Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real-Time Preferences</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="bell" size={18} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.menuText}>Notifications</Text>
                <Text style={styles.menuSubtext}>
                  {socketConnected ? 'Real-time updates enabled' : 'Will sync when online'}
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#f0f0f0', true: '#c8e6c9' }}
              thumbColor={notifications ? '#6c3' : '#f5f5f5'}
              ios_backgroundColor="#f0f0f0"
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="map-marker" size={18} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.menuText}>Location Tracking</Text>
                <Text style={styles.menuSubtext}>
                  {locationTracking ? 'Live location sharing' : 'Location sharing off'}
                </Text>
              </View>
            </View>
            <Switch
              value={locationTracking}
              onValueChange={handleLocationTrackingToggle}
              trackColor={{ false: '#f0f0f0', true: '#c8e6c9' }}
              thumbColor={locationTracking ? '#6c3' : '#f5f5f5'}
              ios_backgroundColor="#f0f0f0"
            />
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="language" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Language</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>English</Text>
              <Icon name="chevron-right" size={16} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="money" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Currency</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>MWK - Malawian Kwacha</Text>
              <Icon name="chevron-right" size={16} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Real-Time Updates Feed */}
        {profileUpdates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Updates</Text>
            {profileUpdates.slice(0, 3).map((update, index) => (
              <View key={index} style={styles.updateItem}>
                <Icon name="sync" size={14} color="#00B894" />
                <Text style={styles.updateText}>{update.message}</Text>
                <Text style={styles.updateTime}>{update.time}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Support & Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Information</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="question-circle" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="file-text" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Terms of Service</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="lock" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Privacy Policy</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="info-circle" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>About Kabaza</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff0f0' }]}>
                <Icon name="trash" size={18} color="#ff6b6b" />
              </View>
              <Text style={[styles.menuText, { color: '#666' }]}>Delete Account</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="sign-out" size={18} color="#ff6b6b" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Kabaza v1.0.0 • Real-Time Enabled</Text>
          <Text style={styles.syncStatus}>
            {socketConnected ? '🟢 Synced' : '⚫ Offline'}
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 20,
    marginBottom: 5,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  header: {
    backgroundColor: '#6c3',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  roleSwitchIndicator: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 30,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 15,
  },
  avatarLoading: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6c3',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  authMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  authMethodText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  joinDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6c3',
    borderRadius: 8,
    backgroundColor: '#f9fff9',
  },
  editButtonText: {
    fontSize: 12,
    color: '#6c3',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    flexDirection: 'row',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c3',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  onlineHoursText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    gap: 10,
  },
  updateText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  updateTime: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  syncStatus: {
    fontSize: 11,
    color: '#666',
  },
});