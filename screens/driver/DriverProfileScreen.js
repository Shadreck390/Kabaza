/**
 * ============================================================================
 * screens/driver/DriverProfileScreen.js
 * ============================================================================
 * 
 * COMPREHENSIVE DRIVER PROFILE SCREEN
 * 
 * Features:
 * - Complete profile management with real-time updates
 * - Online/offline status management with location services
 * - Earnings and performance dashboard
 * - Document management and verification status
 * - Vehicle information management
 * - Bank/payment details
 * - Settings and preferences
 * - Real-time connection monitoring
 * - Profile image upload and management
 * - Multi-device synchronization
 * - Offline data persistence
 * 
 * Dependencies:
 * - Redux for state management
 * - RealTimeService for WebSocket communication
 * - LocationService for GPS tracking
 * - AsyncStorage for local persistence
 * - React Navigation for routing
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  BackHandler,
  AppState,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { Linking } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BlurView } from '@react-native-community/blur';

// FIXED IMPORTS:
import { logout, updateAuthToken } from '@store/slices/authSlice';
import { 
  updateDriverStatus, 
  updateDriverProfile, 
  updateDriverEarnings,
  clearDriverData 
} from '@store/slices/driverSlice';
import RealTimeService from '@services/realtime/RealTimeService';
import LocationService from '@services/location/LocationService';
import socketService from '@services/socket/socketService';
import { uploadProfileImage, updateDriverSettings } from '@services/api/driverAPI';
import { formatCurrency, formatPhoneNumber } from '@utils/formatters';
import { checkAppVersion } from '@utils/versionCheck';
import { requestMultiplePermissions } from '@utils/permissions';

// Constants
const PROFILE_IMAGE_SIZE = 120;
const STATUS_OPTIONS = [
  { value: 'offline', label: 'Offline', color: '#666', icon: 'power-off' },
  { value: 'available', label: 'Available', color: '#00B894', icon: 'check-circle' },
  { value: 'busy', label: 'Busy', color: '#FF9800', icon: 'pause-circle' },
  { value: 'on_trip', label: 'On Trip', color: '#F44336', icon: 'car' },
  { value: 'break', label: 'On Break', color: '#9C27B0', icon: 'coffee' },
];

export default function DriverProfileScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const driver = useSelector(state => state.driver.currentDriver);
  const auth = useSelector(state => state.auth);
  
  // State Management
  const [profileData, setProfileData] = useState({
    id: '',
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    driverId: '',
    rating: 0,
    totalTrips: 0,
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    acceptanceRate: 0,
    cancellationRate: 0,
    onlineHours: 0,
    vehicle: {
      make: '',
      model: '',
      year: '',
      plate: '',
      color: '',
      type: 'kabaza',
      registration: '',
      insurance: '',
      insuranceExpiry: '',
    },
    status: 'offline',
    lastOnline: null,
    joinedDate: '',
    documents: {
      license: { verified: false, expiry: '' },
      insurance: { verified: false, expiry: '' },
      registration: { verified: false, expiry: '' },
      nrc: { verified: false, number: '' },
    },
    settings: {
      notifications: true,
      locationSharing: true,
      autoAccept: false,
      preferredRadius: 10, // km
      maxDistance: 20, // km
      minFare: 500, // MWK
      peakHourBonus: true,
      soundEnabled: true,
      vibrationEnabled: true,
      nightMode: false,
      language: 'en',
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      branch: '',
      mobileMoney: {
        provider: '', // Airtel, TNM, Mpamba, etc.
        number: '',
        verified: false,
      },
    },
  });

  // UI State
  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempProfile, setTempProfile] = useState(null);

  // Refs
  const refreshIntervalRef = useRef(null);
  const backHandlerRef = useRef(null);
  const networkSubscriptionRef = useRef(null);

  // Load profile data on mount
  useEffect(() => {
    initializeProfileScreen();
    
    // Handle back button
    backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      cleanup();
      backHandlerRef.current?.remove();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    networkSubscriptionRef.current = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      
      if (!connected) {
        showOfflineNotification();
      } else if (connected && !isConnected) {
        // Just reconnected, sync data
        syncWithServer();
      }
    });
    
    return () => networkSubscriptionRef.current?.();
  }, [isConnected]);

  // Initialize profile screen
  const initializeProfileScreen = async () => {
    try {
      setIsLoading(true);
      
      // Check app version
      await checkAppVersion();
      
      // Request necessary permissions
      await requestPermissions();
      
      // Load data from multiple sources
      await loadProfileData();
      
      // Setup real-time listeners
      setupRealTimeListeners();
      
      // Start background sync
      startBackgroundSync();
      
      // Check device battery
      monitorBatteryLevel();
      
      // Update last active timestamp
      updateLastActive();
      
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to load profile. Please restart the app.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request necessary permissions
  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ];
        
        const granted = await requestMultiplePermissions(permissions, {
          location: {
            title: 'Location Permission',
            message: 'Kabaza needs location access to show ride requests and navigate',
          },
          camera: {
            title: 'Camera Permission',
            message: 'Allow Kabaza to access your camera for profile photos',
          },
        });
        
        if (!granted.location) {
          Alert.alert(
            'Location Required',
            'Location access is required for ride requests. Please enable it in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  // Load profile data from multiple sources
  const loadProfileData = async () => {
    console.log('🔍 Loading driver profile data...');
    
    try {
      // Load from multiple AsyncStorage keys (for backward compatibility)
      const storageKeys = [
        'user_profile_data',      // New registration data
        'driver_profile',         // Driver-specific data
        'user_data',             // General user data
        'driver_profile_old',    // Legacy backup
        'driver_settings',       // Settings
        'vehicle_info',          // Vehicle details
      ];
      
      const storageData = {};
      for (const key of storageKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          storageData[key] = JSON.parse(data);
        }
      }
      
      // Priority 1: Latest registration data
      if (storageData.user_profile_data) {
        console.log('✅ Found new registration data');
        applyProfileData(storageData.user_profile_data);
      }
      
      // Priority 2: Driver data from Redux store
      if (driver) {
        console.log('✅ Found driver data from Redux');
        applyProfileData(driver);
      }
      
      // Priority 3: Local settings and vehicle info
      if (storageData.driver_settings) {
        setProfileData(prev => ({
          ...prev,
          settings: { ...prev.settings, ...storageData.driver_settings },
        }));
      }
      
      if (storageData.vehicle_info) {
        setProfileData(prev => ({
          ...prev,
          vehicle: { ...prev.vehicle, ...storageData.vehicle_info },
        }));
      }
      
      // Load profile image
      const savedImage = await AsyncStorage.getItem('profile_image');
      if (savedImage) {
        setProfileImage({ uri: savedImage });
      }
      
      // Generate driver ID if not present
      if (!profileData.driverId) {
        const driverId = generateDriverId();
        setProfileData(prev => ({ ...prev, driverId }));
        await AsyncStorage.setItem('driver_id', driverId);
      }
      
      // Check socket connection
      const isSocketConnected = await socketService.isConnected();
      setSocketConnected(isSocketConnected);
      
      // Check location tracking status
      const isTracking = await LocationService.isTracking();
      setLocationTracking(isTracking);
      
      // Load earnings data
      await loadEarningsData();
      
      // Load document status
      await loadDocumentStatus();
      
    } catch (error) {
      console.error('❌ Failed to load profile data:', error);
      throw error;
    }
  };

  // Apply profile data from source
  const applyProfileData = (sourceData) => {
    setProfileData(prev => ({
      ...prev,
      ...sourceData,
      name: sourceData.name || 
            `${sourceData.firstName || ''} ${sourceData.lastName || ''}`.trim() || 
            prev.name,
      phone: sourceData.phone || prev.phone,
      email: sourceData.email || prev.email,
      rating: sourceData.rating || prev.rating,
      totalTrips: sourceData.totalTrips || sourceData.totalRides || prev.totalTrips,
      totalEarnings: sourceData.totalEarnings || prev.totalEarnings,
    }));
  };

  // Generate unique driver ID
  const generateDriverId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `DRV-${year}-${random}`;
  };

  // Load earnings data
  const loadEarningsData = async () => {
    try {
      // Try to load from API first
      const earningsResponse = await fetchEarningsFromAPI();
      if (earningsResponse) {
        setProfileData(prev => ({
          ...prev,
          totalEarnings: earningsResponse.total,
          dailyEarnings: earningsResponse.today,
          weeklyEarnings: earningsResponse.thisWeek,
          monthlyEarnings: earningsResponse.thisMonth,
        }));
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      // Fallback to local storage
      const localEarnings = await AsyncStorage.getItem('driver_earnings');
      if (localEarnings) {
        const parsed = JSON.parse(localEarnings);
        setProfileData(prev => ({ ...prev, ...parsed }));
      }
    }
  };

  // Load document verification status
  const loadDocumentStatus = async () => {
    try {
      const docs = await AsyncStorage.getItem('driver_documents');
      if (docs) {
        const parsedDocs = JSON.parse(docs);
        setProfileData(prev => ({
          ...prev,
          documents: { ...prev.documents, ...parsedDocs },
        }));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  // Setup real-time listeners
  const setupRealTimeListeners = () => {
    // Profile updates
    socketService.on('driver:profile:updated', handleProfileUpdate);
    
    // Earnings updates
    socketService.on('driver:earnings:updated', handleEarningsUpdate);
    
    // Status changes
    socketService.on('driver:status:updated', handleStatusUpdate);
    
    // Document verification updates
    socketService.on('driver:documents:updated', handleDocumentsUpdate);
    
    // Ride updates that affect profile
    socketService.on('ride:completed', handleRideCompleted);
    socketService.on('ride:cancelled', handleRideCancelled);
    
    // Connection status
    socketService.onConnectionChange(handleConnectionChange);
    
    // Settings sync from other devices
    socketService.on('driver:settings:sync', handleSettingsSync);
  };

  // Cleanup listeners
  const cleanupRealTimeListeners = () => {
    socketService.off('driver:profile:updated');
    socketService.off('driver:earnings:updated');
    socketService.off('driver:status:updated');
    socketService.off('driver:documents:updated');
    socketService.off('ride:completed');
    socketService.off('ride:cancelled');
    socketService.offConnectionChange();
    socketService.off('driver:settings:sync');
  };

  // Handle profile update from server
  const handleProfileUpdate = (updatedProfile) => {
    console.log('📨 Profile update received:', updatedProfile);
    
    // Update Redux store
    dispatch(updateDriverProfile(updatedProfile));
    
    // Update local state
    setProfileData(prev => ({ ...prev, ...updatedProfile }));
    
    // Save to local storage
    saveProfileToStorage(updatedProfile);
    
    // Show notification if name or phone changed
    if (updatedProfile.name && updatedProfile.name !== profileData.name) {
      Alert.alert('Profile Updated', 'Your profile information has been updated.');
    }
  };

  // Handle earnings update
  const handleEarningsUpdate = (earningsData) => {
    const newEarnings = {
      totalEarnings: earningsData.total,
      dailyEarnings: earningsData.today,
      weeklyEarnings: earningsData.thisWeek,
      monthlyEarnings: earningsData.thisMonth,
      totalTrips: earningsData.totalTrips || profileData.totalTrips,
    };
    
    setProfileData(prev => ({ ...prev, ...newEarnings }));
    dispatch(updateDriverEarnings(newEarnings));
    
    // Save locally
    AsyncStorage.setItem('driver_earnings', JSON.stringify(newEarnings));
    
    // Show earnings update notification
    if (earningsData.today > profileData.dailyEarnings) {
      showEarningNotification(earningsData.today - profileData.dailyEarnings);
    }
  };

  // Handle status update
  const handleStatusUpdate = (statusData) => {
    if (statusData.driverId === profileData.id) {
      setProfileData(prev => ({ ...prev, status: statusData.status }));
      dispatch(updateDriverStatus(statusData.status));
      
      // If going offline, stop location tracking
      if (statusData.status === 'offline') {
        LocationService.stopTracking();
        setLocationTracking(false);
      }
    }
  };

  // Handle documents update
  const handleDocumentsUpdate = (documents) => {
    setProfileData(prev => ({
      ...prev,
      documents: { ...prev.documents, ...documents },
    }));
    
    // Save to local storage
    AsyncStorage.setItem('driver_documents', JSON.stringify(documents));
    
    // Show notification for verification
    if (documents.license?.verified && !profileData.documents.license.verified) {
      Alert.alert('License Verified!', 'Your driver\'s license has been verified.');
    }
  };

  // Handle ride completion
  const handleRideCompleted = (rideData) => {
    const earningsIncrease = rideData.fare || 0;
    
    setProfileData(prev => ({
      ...prev,
      totalTrips: prev.totalTrips + 1,
      totalEarnings: prev.totalEarnings + earningsIncrease,
      dailyEarnings: prev.dailyEarnings + earningsIncrease,
    }));
    
    // Update rating if provided
    if (rideData.rating) {
      const newRating = ((prev.rating * prev.totalTrips) + rideData.rating) / (prev.totalTrips + 1);
      setProfileData(prev => ({ ...prev, rating: newRating }));
    }
  };

  // Handle ride cancellation
  const handleRideCancelled = (cancellationData) => {
    if (cancellationData.cancelledBy === 'driver') {
      setProfileData(prev => ({
        ...prev,
        cancellationRate: Math.min(100, prev.cancellationRate + 1),
      }));
    }
  };

  // Handle connection change
  const handleConnectionChange = (isConnected) => {
    setSocketConnected(isConnected);
    
    if (!isConnected && profileData.status !== 'offline') {
      showDisconnectedNotification();
    }
  };

  // Handle settings sync from other devices
  const handleSettingsSync = (settings) => {
    setProfileData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
    
    // Update local storage
    AsyncStorage.setItem('driver_settings', JSON.stringify(settings));
  };

  // Start background sync
  const startBackgroundSync = () => {
    // Sync every 5 minutes
    refreshIntervalRef.current = setInterval(() => {
      if (isConnected && socketConnected) {
        syncWithServer();
      }
    }, 5 * 60 * 1000);
  };

  // Sync with server
  const syncWithServer = async () => {
    try {
      // Sync profile
      const profileResponse = await fetchProfileFromAPI();
      if (profileResponse) {
        handleProfileUpdate(profileResponse);
      }
      
      // Sync earnings
      const earningsResponse = await fetchEarningsFromAPI();
      if (earningsResponse) {
        handleEarningsUpdate(earningsResponse);
      }
      
      // Sync documents
      const docsResponse = await fetchDocumentsFromAPI();
      if (docsResponse) {
        handleDocumentsUpdate(docsResponse);
      }
      
      // Update last sync timestamp
      await AsyncStorage.setItem('last_sync', Date.now().toString());
      
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // Fetch profile from API
  const fetchProfileFromAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/driver/profile`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('API fetch error:', error);
    }
    return null;
  };

  // Fetch earnings from API
  const fetchEarningsFromAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/driver/earnings`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Earnings fetch error:', error);
    }
    return null;
  };

  // Fetch documents from API
  const fetchDocumentsFromAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/driver/documents`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Documents fetch error:', error);
    }
    return null;
  };

  // Save profile to storage
  const saveProfileToStorage = async (data) => {
    try {
      await AsyncStorage.setItem('driver_profile', JSON.stringify(data));
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Show earning notification
  const showEarningNotification = (amount) => {
    Alert.alert(
      '🎉 Earnings Updated',
      `You earned MWK ${formatCurrency(amount)} from your last ride!`,
      [{ text: 'Great!' }]
    );
  };

  // Show disconnected notification
  const showDisconnectedNotification = () => {
    Alert.alert(
      'Connection Lost',
      'Your connection to the server was lost. You will not receive ride requests until reconnected.',
      [
        { text: 'OK' },
        {
          text: 'Try Reconnect',
          onPress: () => socketService.reconnect(),
        },
      ]
    );
  };

  // Show offline notification
  const showOfflineNotification = () => {
    Alert.alert(
      'You are offline',
      'Some features may be limited. Ride requests are paused.',
      [{ text: 'OK' }]
    );
  };

  // Handle app state change
  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (isConnected) {
        syncWithServer();
      }
    }
    setAppState(nextAppState);
  };

  // Handle back press
  const handleBackPress = () => {
    if (showStatusModal || showImagePicker || editMode) {
      setShowStatusModal(false);
      setShowImagePicker(false);
      if (editMode) {
        setEditMode(false);
        setProfileData(tempProfile ? { ...tempProfile } : profileData);
      }
      return true;
    }
    return false;
  };

  // Monitor battery level (simulated for demo)
  const monitorBatteryLevel = () => {
    // In production, use actual battery API
    // For now, simulate battery drain
    const interval = setInterval(() => {
      setBatteryLevel(prev => Math.max(10, prev - 0.1));
    }, 60000);
    
    return () => clearInterval(interval);
  };

  // Update last active timestamp
  const updateLastActive = () => {
    const now = new Date().toISOString();
    AsyncStorage.setItem('last_active', now);
  };

  // Cleanup
  const cleanup = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    cleanupRealTimeListeners();
    networkSubscriptionRef.current?.();
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      // Special handling for going online
      if (newStatus === 'available') {
        const canGoOnline = await checkCanGoOnline();
        if (!canGoOnline) return;
      }
      
      // Update via socket
      if (realTimeService && realTimeService.emit) {
        realTimeService.emit('driver:status:update', {
          driverId: profileData.id || auth.user?.id,
          status: newStatus,
          location: await LocationService.getCurrentLocation(),
          timestamp: new Date().toISOString(),
        });
      }
      
      // Update local state
      setProfileData(prev => ({ ...prev, status: newStatus }));
      dispatch(updateDriverStatus(newStatus));
      
      // Handle location tracking
      if (newStatus === 'available') {
        await LocationService.startTracking();
        setLocationTracking(true);
        Alert.alert('✅ Online', 'You are now online and receiving ride requests.');
      } else if (newStatus === 'offline') {
        await LocationService.stopTracking();
        setLocationTracking(false);
        Alert.alert('⚫ Offline', 'You are now offline.');
      }
      
      // Close modal
      setShowStatusModal(false);
      
    } catch (error) {
      console.error('Status change error:', error);
      Alert.alert('Error', 'Failed to change status. Please try again.');
    }
  };

  // Check if can go online
  const checkCanGoOnline = async () => {
    // Check location permission
    const hasLocationPermission = await checkLocationPermission();
    if (!hasLocationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to go online.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable Location', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }
    
    // Check internet connection
    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    // Check if all required documents are verified
    const requiredDocs = ['license', 'nrc'];
    const missingDocs = requiredDocs.filter(doc => !profileData.documents[doc]?.verified);
    
    if (missingDocs.length > 0) {
      Alert.alert(
        'Documents Required',
        `Please verify your ${missingDocs.join(', ')} before going online.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Documents', onPress: () => navigation.navigate('DriverDocumentsScreen') }
        ]
      );
      return false;
    }
    
    return true;
  };

  // Check location permission
  const checkLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Kabaza needs access to your location',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS handled by Info.plist
  };

  // Handle profile image selection
  const handleSelectImage = () => {
    setShowImagePicker(true);
  };

  // Choose from library
  const chooseFromLibrary = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
      selectionLimit: 1,
    };

    const result = await launchImageLibrary(options);
    handleImageResult(result);
  };

  // Take photo
  const takePhoto = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
      saveToPhotos: true,
    };

    const result = await launchCamera(options);
    handleImageResult(result);
  };

  // Handle image result
  const handleImageResult = async (result) => {
    if (result.didCancel) {
      setShowImagePicker(false);
      return;
    }
    
    if (result.error) {
      Alert.alert('Error', 'Failed to select image');
      setShowImagePicker(false);
      return;
    }
    
    if (result.assets && result.assets[0]) {
      const image = result.assets[0];
      setProfileImage(image);
      setShowImagePicker(false);
      
      // Upload to server
      await uploadImageToServer(image);
    }
  };

  // Upload image to server
  const uploadImageToServer = async (image) => {
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('profileImage', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: `profile_${profileData.id || 'driver'}_${Date.now()}.jpg`,
      });

      const response = await uploadProfileImage(formData, auth.token);
      
      if (response.success) {
        // Update via socket
        socketService.emit('driver:profile:image:updated', {
          imageUrl: response.imageUrl,
          driverId: profileData.id,
        });
        
        // Save locally
        await AsyncStorage.setItem('profile_image', response.imageUrl);
        
        Alert.alert('Success', 'Profile image updated');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: performLogout,
        }
      ]
    );
  };

  // Perform logout
  const performLogout = async () => {
    try {
      // Go offline
      await handleStatusChange('offline');
      
      // Disconnect services
      socketService.disconnect();
      RealTimeService.cleanup();
      LocationService.cleanup();
      
      // Clear local data
      await AsyncStorage.multiRemove([
        'driver_profile',
        'driver_earnings',
        'driver_settings',
        'profile_image',
        'last_sync',
      ]);
      
      // Clear Redux
      dispatch(clearDriverData());
      dispatch(logout());
      
      // Navigate to login
      navigation.replace('PhoneOrGoogle');
      
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout properly. Please restart the app.');
    }
  };

  // Handle setting change
  const handleSettingChange = async (key, value) => {
    const newSettings = { ...profileData.settings, [key]: value };
    
    setProfileData(prev => ({
      ...prev,
      settings: newSettings,
    }));
    
    // Save locally
    await AsyncStorage.setItem('driver_settings', JSON.stringify(newSettings));
    
    // Send to server
    socketService.emit('driver:settings:update', { [key]: value });
    
    // Apply setting changes
    if (key === 'locationSharing') {
      if (value) {
        await LocationService.startTracking();
        setLocationTracking(true);
      } else {
        await LocationService.stopTracking();
        setLocationTracking(false);
      }
    }
  };

  // Handle edit profile
  const handleEditProfile = () => {
    setTempProfile({ ...profileData });
    setEditMode(true);
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      // Validate data
      if (!profileData.name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      
      if (!profileData.phone.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }
      
      // Send to server
      const response = await updateDriverSettings(profileData, auth.token);
      
      if (response.success) {
        // Update via socket
        socketService.emit('driver:profile:update', profileData);
        
        // Save locally
        await saveProfileToStorage(profileData);
        
        // Exit edit mode
        setEditMode(false);
        setTempProfile(null);
        
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    if (tempProfile) {
      setProfileData({ ...tempProfile });
    }
    setEditMode(false);
    setTempProfile(null);
  };

  // Handle share profile
  const handleShareProfile = async () => {
    try {
      const shareMessage = `Check out my Kabaza driver profile:\n\n` +
        `Name: ${profileData.name}\n` +
        `Rating: ${profileData.rating.toFixed(1)} ⭐\n` +
        `Trips: ${profileData.totalTrips}\n` +
        `Earnings: MWK ${formatCurrency(profileData.totalEarnings)}\n\n` +
        `Download Kabaza: https://kabaza.com`;
      
      await Share.share({
        message: shareMessage,
        title: 'My Kabaza Driver Profile',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Refresh control handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileData();
    await syncWithServer();
    setRefreshing(false);
  }, []);

  // Format earnings
  const formatEarnings = (amount) => {
    return formatCurrency(amount);
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.color : '#666';
  };

  // Get status text
  const getStatusText = (status) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.label : 'Offline';
  };

  // Menu items
  const menuItems = [
    {
      title: 'Vehicle Information',
      icon: 'car',
      onPress: () => navigation.navigate('VehicleInfo', { vehicle: profileData.vehicle }),
      showArrow: true,
      color: '#4A90E2',
      description: 'Manage vehicle details',
    },
    {
      title: 'Documents',
      icon: 'file-text',
      onPress: () => navigation.navigate('DriverDocumentsScreen'),
      showArrow: true,
      color: '#F5A623',
      description: 'Upload & verify documents',
      badge: !profileData.documents.license.verified ? 'Required' : null,
    },
    {
      title: 'Bank & Payments',
      icon: 'bank',
      onPress: () => navigation.navigate('BankDetails'),
      showArrow: true,
      color: '#7ED321',
      description: 'Manage payment methods',
    },
    {
      title: 'Earnings Dashboard',
      icon: 'bar-chart',
      onPress: () => navigation.navigate('EarningsScreen'),
      showArrow: true,
      color: '#BD10E0',
      description: 'View earnings analytics',
    },
    {
      title: 'Trip History',
      icon: 'history',
      onPress: () => navigation.navigate('TripHistory'),
      showArrow: true,
      color: '#50E3C2',
      description: 'View past trips',
    },
    {
      title: 'Help & Support',
      icon: 'question-circle',
      onPress: () => navigation.navigate('HelpSupport'),
      showArrow: true,
      color: '#F8E71C',
      description: 'Get help & contact support',
    },
    {
      title: 'Invite Other Drivers',
      icon: 'user-plus',
      onPress: () => navigation.navigate('InviteDrivers'),
      showArrow: true,
      color: '#B8E986',
      description: 'Earn referral bonuses',
    },
    {
      title: 'Advanced Settings',
      icon: 'sliders',
      onPress: () => setShowAdvancedSettings(!showAdvancedSettings),
      showArrow: true,
      color: '#D0021B',
      description: 'Advanced preferences',
    },
  ];

  // Advanced settings items
  const advancedMenuItems = [
    {
      title: 'Notification Settings',
      icon: 'bell',
      onPress: () => navigation.navigate('NotificationSettings'),
      showArrow: true,
      color: '#4A90E2',
    },
    {
      title: 'Privacy Settings',
      icon: 'shield',
      onPress: () => navigation.navigate('PrivacySettings'),
      showArrow: true,
      color: '#7ED321',
    },
    {
      title: 'Data Usage',
      icon: 'database',
      onPress: () => navigation.navigate('DataUsage'),
      showArrow: true,
      color: '#F5A623',
    },
    {
      title: 'About Kabaza',
      icon: 'info-circle',
      onPress: () => navigation.navigate('About'),
      showArrow: true,
      color: '#BD10E0',
    },
    {
      title: 'Rate App',
      icon: 'star',
      onPress: () => Linking.openURL('market://details?id=com.kabaza.driver'),
      showArrow: true,
      color: '#FFD700',
    },
  ];

  // Status modal options
  const statusOptions = STATUS_OPTIONS.map(option => ({
    ...option,
    onPress: () => handleStatusChange(option.value),
  }));

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection Status Bar */}
      <View style={[
        styles.connectionBar,
        { 
          backgroundColor: socketConnected 
            ? (isConnected ? '#00B894' : '#F5A623') 
            : '#F44336' 
        }
      ]}>
        <Icon 
          name={socketConnected ? (isConnected ? 'check-circle' : 'exclamation-triangle') : 'exclamation-circle'} 
          size={14} 
          color="#fff" 
        />
        <Text style={styles.connectionText}>
          {socketConnected 
            ? (isConnected ? 'Connected to server' : 'Poor connection - Limited functionality')
            : 'Disconnected - No ride requests'}
        </Text>
        {batteryLevel < 20 && (
          <Icon name="battery-quarter" size={14} color="#FFD700" style={styles.batteryWarning} />
        )}
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#00B894']}
            tintColor="#00B894"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Profile Image with Status */}
          <View style={styles.profileImageSection}>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={handleSelectImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.profileImagePlaceholder}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : profileImage ? (
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
              <TouchableOpacity
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(profileData.status) }
                ]}
                onPress={() => setShowStatusModal(true)}
              >
                <Text style={styles.statusBadgeText}>
                  {getStatusText(profileData.status)}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
            
            {/* Quick Actions */}
            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.profileAction}
                onPress={handleEditProfile}
              >
                <Icon name="edit" size={16} color="#666" />
                <Text style={styles.profileActionText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileAction}
                onPress={handleShareProfile}
              >
                <Icon name="share-alt" size={16} color="#666" />
                <Text style={styles.profileActionText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileAction}
                onPress={() => navigation.navigate('DriverDocumentsScreen')}
              >
                <Icon name="file-text" size={16} color="#666" />
                <Text style={styles.profileActionText}>Docs</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Profile Info */}
          <View style={styles.profileInfo}>
            {editMode ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.editInput}
                  value={profileData.name}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
                  placeholder="Full Name"
                />
                <TextInput
                  style={styles.editInput}
                  value={profileData.phone}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.editInput}
                  value={profileData.email}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
                  placeholder="Email (Optional)"
                  keyboardType="email-address"
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity 
                    style={[styles.editButton, styles.cancelButton]}
                    onPress={handleCancelEdit}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editButton, styles.saveButton]}
                    onPress={handleSaveProfile}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.profileName}>
                  {profileData.name || 'Complete Your Profile'}
                </Text>
                <Text style={styles.profilePhone}>
                  {formatPhoneNumber(profileData.phone) || 'Add Phone Number'}
                </Text>
                
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{profileData.rating.toFixed(1)}</Text>
                  <Text style={styles.driverId}> • {profileData.driverId}</Text>
                  {profileData.documents.license.verified && (
                    <Icon name="check-circle" size={14} color="#00B894" style={styles.verifiedIcon} />
                  )}
                </View>
                
                <Text style={styles.profileMeta}>
                  Joined {new Date(profileData.joinedDate).toLocaleDateString()} • 
                  {profileData.totalTrips} trips
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('EarningsScreen')}
          >
            <Text style={styles.statNumber}>{formatEarnings(profileData.dailyEarnings)}</Text>
            <Text style={styles.statLabel}>Today</Text>
            <Icon name="calendar" size={12} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('EarningsScreen', { period: 'week' })}
          >
            <Text style={styles.statNumber}>{formatEarnings(profileData.weeklyEarnings)}</Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Icon name="line-chart" size={12} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('EarningsScreen', { period: 'month' })}
          >
            <Text style={styles.statNumber}>{formatEarnings(profileData.monthlyEarnings)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
            <Icon name="bar-chart" size={12} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('TripHistory')}
          >
            <Text style={styles.statNumber}>{profileData.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
            <Icon name="road" size={12} color="#666" style={styles.statIcon} />
          </TouchableOpacity>
        </View>

        {/* Quick Status Toggle */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon 
              name="power-off" 
              size={20} 
              color={getStatusColor(profileData.status)} 
            />
            <Text style={styles.statusTitle}>Driver Status</Text>
            <TouchableOpacity
              style={[
                styles.statusToggle,
                { backgroundColor: getStatusColor(profileData.status) }
              ]}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={styles.statusToggleText}>
                {getStatusText(profileData.status)}
              </Text>
              <Icon name="chevron-down" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.statusDescription}>
            {profileData.status === 'available' 
              ? `✅ Online - Receiving ride requests • Location tracking: ${locationTracking ? 'ON' : 'OFF'}` 
              : profileData.status === 'busy'
              ? '🟡 Busy - You have an active ride request'
              : profileData.status === 'on_trip'
              ? '🔴 On Trip - Currently driving a passenger'
              : profileData.status === 'break'
              ? '🟣 On Break - Taking a short break'
              : '⚫ Offline - Not receiving ride requests'}
          </Text>
          
          {profileData.status === 'available' && (
            <View style={styles.locationInfo}>
              <Icon name="map-marker" size={14} color="#666" />
              <Text style={styles.locationInfoText}>
                {locationTracking ? 'Location sharing active' : 'Enable location sharing'}
              </Text>
            </View>
          )}
          
          {(profileData.status === 'busy' || profileData.status === 'on_trip') && (
            <TouchableOpacity 
              style={styles.activeRideButton}
              onPress={() => navigation.navigate('ActiveRide')}
            >
              <Icon name="car" size={16} color="#fff" />
              <Text style={styles.activeRideButtonText}>View Active Ride</Text>
              <Icon name="chevron-right" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Quick Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="bell" size={20} color="#666" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Notifications</Text>
                <Text style={styles.settingSubtext}>Ride requests & updates</Text>
              </View>
            </View>
            <Switch
              value={profileData.settings.notifications}
              onValueChange={(value) => handleSettingChange('notifications', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={profileData.settings.notifications ? '#00B894' : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="map-marker" size={20} color="#666" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Location Sharing</Text>
                <Text style={styles.settingSubtext}>
                  {locationTracking ? 'Active • Real-time tracking' : 'Paused'}
                </Text>
              </View>
            </View>
            <Switch
              value={profileData.settings.locationSharing}
              onValueChange={(value) => handleSettingChange('locationSharing', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={profileData.settings.locationSharing ? '#00B894' : '#f4f3f4'}
              disabled={profileData.status === 'on_trip'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="automobile" size={20} color="#666" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Auto Accept</Text>
                <Text style={styles.settingSubtext}>Auto-accept nearby rides</Text>
              </View>
            </View>
            <Switch
              value={profileData.settings.autoAccept}
              onValueChange={(value) => handleSettingChange('autoAccept', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={profileData.settings.autoAccept ? '#00B894' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Icon 
                      name={item.icon} 
                      size={20} 
                      color={item.color} 
                    />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuText}>{item.title}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                </View>
                <View style={styles.menuRight}>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.showArrow && (
                    <Icon name="chevron-right" size={16} color="#ccc" />
                  )}
                </View>
              </TouchableOpacity>
              
              {item.title === 'Advanced Settings' && showAdvancedSettings && (
                <View style={styles.advancedMenu}>
                  {advancedMenuItems.map((advancedItem, advIndex) => (
                    <TouchableOpacity
                      key={advIndex}
                      style={styles.advancedMenuItem}
                      onPress={advancedItem.onPress}
                    >
                      <Icon name={advancedItem.icon} size={16} color={advancedItem.color} />
                      <Text style={styles.advancedMenuText}>{advancedItem.title}</Text>
                      <Icon name="chevron-right" size={14} color="#ccc" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </React.Fragment>
          ))}
          
          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FF6B6B15' }]}>
                <Icon name="sign-out" size={20} color="#FF6B6B" />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Connection Info */}
        <View style={styles.connectionInfo}>
          <View style={styles.connectionStatus}>
            <Icon 
              name="signal" 
              size={14} 
              color={socketConnected ? '#00B894' : '#999'} 
            />
            <Text style={styles.connectionStatusText}>
              {socketConnected 
                ? `Connected • ${isConnected ? 'Good connection' : 'Limited connection'}`
                : 'Disconnected'}
            </Text>
          </View>
          
          <View style={styles.batteryInfo}>
            <Icon 
              name={batteryLevel > 80 ? 'battery-full' : 
                    batteryLevel > 50 ? 'battery-three-quarters' :
                    batteryLevel > 20 ? 'battery-half' : 'battery-quarter'} 
              size={14} 
              color={batteryLevel > 20 ? '#666' : '#F5A623'} 
            />
            <Text style={styles.batteryInfoText}>{Math.round(batteryLevel)}%</Text>
          </View>
        </View>

        {/* Version Info */}
        <Text style={styles.versionText}>
          Kabaza Driver v1.0.0 • {socketConnected ? 'Real-Time Enabled' : 'Offline Mode'}
        </Text>
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statusModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statusOptions}>
              {statusOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.statusOption,
                    { borderLeftColor: option.color }
                  ]}
                  onPress={option.onPress}
                >
                  <Icon name={option.icon} size={20} color={option.color} />
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {profileData.status === option.value && (
                    <Icon name="check" size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalFooter}>
              <Text style={styles.modalInfo}>
                Changing status will affect ride availability and location sharing.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePickerModal}>
            <Text style={styles.imagePickerTitle}>Choose Profile Picture</Text>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={chooseFromLibrary}
            >
              <Icon name="photo" size={24} color="#4A90E2" />
              <View style={styles.imagePickerOptionText}>
                <Text style={styles.imagePickerOptionTitle}>Choose from Library</Text>
                <Text style={styles.imagePickerOptionDescription}>
                  Select a photo from your gallery
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imagePickerOption}
              onPress={takePhoto}
            >
              <Icon name="camera" size={24} color="#F5A623" />
              <View style={styles.imagePickerOptionText}>
                <Text style={styles.imagePickerOptionTitle}>Take Photo</Text>
                <Text style={styles.imagePickerOptionDescription}>
                  Take a new photo with camera
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.imagePickerOption, styles.cancelOption]}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.cancelOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  batteryWarning: {
    marginLeft: 8,
  },
  profileHeader: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
  },
  profileImagePlaceholder: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
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
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    zIndex: 3,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  profileAction: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  profileActionText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  profileInfo: {
    alignItems: 'center',
  },
  editForm: {
    width: '100%',
    gap: 12,
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#00B894',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  profilePhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 5,
  },
  driverId: {
    fontSize: 14,
    color: '#999',
    marginLeft: 5,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  profileMeta: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    position: 'relative',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  statIcon: {
    position: 'absolute',
    bottom: 10,
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationInfoText: {
    fontSize: 12,
    color: '#666',
  },
  activeRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  activeRideButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 15,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
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
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  menuDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  advancedMenu: {
    backgroundColor: '#f8f9fa',
    paddingLeft: 75,
    paddingRight: 20,
  },
  advancedMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  advancedMenuText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF6B6B',
  },
  connectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionStatusText: {
    fontSize: 12,
    color: '#666',
  },
  batteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryInfoText: {
    fontSize: 12,
    color: '#666',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 30,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  statusModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusOptions: {
    padding: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 15,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    paddingTop: 10,
  },
  modalInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  imagePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 15,
  },
  imagePickerOptionText: {
    flex: 1,
  },
  imagePickerOptionTitle: {
    fontSize: 16,
    color: '#333',
  },
  imagePickerOptionDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cancelOption: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelOptionText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    textAlign: 'center',
  },
});