/**
 * ============================================================================
 * screens/driver/AddVehicleScreen.js
 * ============================================================================
 * 
 * ADD/EDIT VEHICLE SCREEN - ENHANCED VERSION
 * 
 * Comprehensive vehicle registration screen with:
 * - Real-time document verification
 * - Image capture and validation
 * - Offline data persistence
 * - Document upload with progress tracking
 * - Admin verification workflow
 * - Vehicle type specific validation
 * - Automatic data extraction from documents
 * 
 * Key Improvements:
 * 1. Enhanced document scanning and OCR
 * 2. Better offline support
 * 3. Real-time verification status updates
 * 4. Document validation and quality checks
 * 5. Smart camera features
 * 6. Batch upload with retry logic
 * 7. Comprehensive error handling
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Platform, ActivityIndicator,
  Modal, Animated, Dimensions, PermissionsAndroid,
  Linking, BackHandler, RefreshControl, AppState
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import DocumentPicker from 'react-native-document-picker';
import ImageResizer from 'react-native-image-resizer';

// FIXED IMPORTS:
import { addVehicle, updateVehicle, verifyVehicle } from '@store/slices/driverSlice';
import RealTimeService from '@services/realtime/RealTimeService';
import socketService from '@services/socket/socketService';
import DocumentService from '@services/document/DocumentService';
import LocationService from '@services/location/LocationService';
import { uploadToCloudinary, scanDocumentOCR } from '@services/document/ocrService';
import { validatePlateNumber, validateVehicleData } from '@utils/vehicleValidation';
import { showToast } from '@components/Toast';
import CameraView from '@components/CameraView';
import DocumentScanner from '@components/DocumentScanner';

const { width } = Dimensions.get('window');

// Vehicle types with icons and descriptions
const VEHICLE_TYPES = [
  { 
    value: 'motorcycle', 
    label: 'Motorcycle (Kabaza)', 
    icon: 'motorcycle',
    description: 'For motorcycle taxis',
    maxPassengers: 1,
    fareMultiplier: 1.0
  },
  { 
    value: 'car', 
    label: 'Car (Taxi)', 
    icon: 'car',
    description: 'Standard passenger car',
    maxPassengers: 4,
    fareMultiplier: 1.5
  },
  { 
    value: 'minibus', 
    label: 'Minibus', 
    icon: 'bus',
    description: 'Minibus for group rides',
    maxPassengers: 12,
    fareMultiplier: 2.0
  },
  { 
    value: 'bicycle', 
    label: 'Bicycle', 
    icon: 'bicycle',
    description: 'Bicycle rides',
    maxPassengers: 1,
    fareMultiplier: 0.7
  },
];

// Motorcycle makes with common models
const MOTORCYCLE_MAKES = [
  { value: 'TVS', label: 'TVS', models: ['Apache RTR 160', 'Apache RR 310', 'Starcity', 'Scooty'] },
  { value: 'Bajaj', label: 'Bajaj', models: ['Pulsar 150', 'Pulsar NS200', 'Discover', 'CT 100'] },
  { value: 'Honda', label: 'Honda', models: ['CBR 150R', 'CB Shine', 'Activa', 'Africa Twin'] },
  { value: 'Yamaha', label: 'Yamaha', models: ['YZF R15', 'FZ', 'Ray ZR', 'MT-15'] },
  { value: 'Suzuki', label: 'Suzuki', models: ['Gixxer SF', 'Access 125', 'Burgman', 'Hayabusa'] },
  { value: 'Hero', label: 'Hero', models: ['Splendor', 'Passion Pro', 'Xtreme', 'Destini'] },
  { value: 'Royal Enfield', label: 'Royal Enfield', models: ['Classic 350', 'Bullet', 'Himalayan', 'Meteor'] },
  { value: 'Other', label: 'Other', models: [] },
];

// Car makes with common models
const CAR_MAKES = [
  { value: 'Toyota', label: 'Toyota', models: ['Corolla', 'Camry', 'Rav4', 'Hilux', 'Vitz'] },
  { value: 'Nissan', label: 'Nissan', models: ['Sunny', 'Tiida', 'March', 'Note', 'X-Trail'] },
  { value: 'Honda', label: 'Honda', models: ['Civic', 'Accord', 'CR-V', 'Fit', 'City'] },
  { value: 'Mazda', label: 'Mazda', models: ['3', '6', 'CX-5', 'CX-3', 'Demio'] },
  { value: 'Ford', label: 'Ford', models: ['Focus', 'Fiesta', 'Ranger', 'EcoSport', 'Explorer'] },
  { value: 'Hyundai', label: 'Hyundai', models: ['Accent', 'Elantra', 'Tucson', 'Santa Fe', 'i10'] },
  { value: 'Kia', label: 'Kia', models: ['Rio', 'Picanto', 'Sportage', 'Seltos', 'Sorento'] },
  { value: 'Other', label: 'Other', models: [] },
];

// Common vehicle colors
const VEHICLE_COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 
  'Yellow', 'Orange', 'Brown', 'Gold', 'Maroon', 'Other'
];

export default function AddVehicleScreen({ navigation, route }) {
  const existingVehicle = route.params?.vehicle || null;
  const isEditing = !!existingVehicle;
  
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const driver = useSelector(state => state.driver.currentDriver);
  const [networkConnected, setNetworkConnected] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Enhanced form state
  const [formData, setFormData] = useState({
    vehicleType: existingVehicle?.type || 'motorcycle',
    make: existingVehicle?.make || '',
    model: existingVehicle?.model || '',
    year: existingVehicle?.year || new Date().getFullYear().toString(),
    color: existingVehicle?.color || '',
    plateNumber: existingVehicle?.plate || '',
    engineNumber: existingVehicle?.engineNumber || '',
    chassisNumber: existingVehicle?.chassisNumber || '',
    insuranceExpiry: existingVehicle?.insuranceExpiry || '',
    roadTaxExpiry: existingVehicle?.roadTaxExpiry || '',
    seatingCapacity: existingVehicle?.seatingCapacity || '',
    fuelType: existingVehicle?.fuelType || 'petrol',
    transmission: existingVehicle?.transmission || 'manual',
  });

  // Enhanced image state with metadata
  const [vehicleImages, setVehicleImages] = useState({
    front: existingVehicle?.images?.front || { uri: null, metadata: {}, uploaded: false },
    back: existingVehicle?.images?.back || { uri: null, metadata: {}, uploaded: false },
    side: existingVehicle?.images?.side || { uri: null, metadata: {}, uploaded: false },
    registration: existingVehicle?.images?.registration || { uri: null, metadata: {}, uploaded: false },
    dashboard: existingVehicle?.images?.dashboard || { uri: null, metadata: {}, uploaded: false },
  });

  // Enhanced document state with validation
  const [uploadedDocuments, setUploadedDocuments] = useState({
    driversLicense: existingVehicle?.documents?.driversLicense || { 
      uri: null, 
      uploaded: false, 
      verified: false,
      expiryDate: '',
      licenseNumber: ''
    },
    registrationCertificate: existingVehicle?.documents?.registrationCertificate || { 
      uri: null, 
      uploaded: false, 
      verified: false,
      registrationNumber: '',
      issueDate: ''
    },
    insuranceCertificate: existingVehicle?.documents?.insuranceCertificate || { 
      uri: null, 
      uploaded: false, 
      verified: false,
      policyNumber: '',
      expiryDate: ''
    },
    roadTaxCertificate: existingVehicle?.documents?.roadTaxCertificate || { 
      uri: null, 
      uploaded: false, 
      verified: false,
      expiryDate: ''
    },
  });

  // UI and loading states
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanningDocument, setScanningDocument] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(
    existingVehicle?.verificationStatus || 'pending'
  );
  const [verificationProgress, setVerificationProgress] = useState(
    existingVehicle?.verificationProgress || 0
  );
  const [socketConnected, setSocketConnected] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [currentImageType, setCurrentImageType] = useState(null);
  const [currentDocumentType, setCurrentDocumentType] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [verificationNotes, setVerificationNotes] = useState(
    existingVehicle?.verificationNotes || ''
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [retryQueue, setRetryQueue] = useState([]);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  
  // Refs
  const scrollViewRef = useRef(null);
  const cameraRef = useRef(null);
  const networkSubscription = useRef(null);
  const appStateSubscription = useRef(null);
  
  // Initialize
  useEffect(() => {
    initializeScreen();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (formData.make && formData.vehicleType) {
      // Auto-select common model based on make
      const models = getModelsForMake();
      if (models.length > 0 && !formData.model) {
        // Suggest first model as default
        // Don't auto-set, just show hint
      }
    }
  }, [formData.make, formData.vehicleType]);

  const initializeScreen = async () => {
    try {
      // Check network
      await checkNetworkStatus();
      
      // Setup listeners
      setupNetworkMonitoring();
      setupAppStateMonitoring();
      setupBackHandler();
      
      // Load existing data
      await loadExistingData();
      
      // Setup real-time listeners
      setupRealTimeListeners();
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
      
    } catch (error) {
      console.error('Initialization error:', error);
      showToast('error', 'Failed to initialize screen');
    }
  };

  const checkNetworkStatus = async () => {
    const netState = await NetInfo.fetch();
    const connected = netState.isConnected && netState.isInternetReachable;
    setNetworkConnected(connected);
    setIsOffline(!connected);
    return connected;
  };

  const setupNetworkMonitoring = () => {
    networkSubscription.current = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setNetworkConnected(connected);
      setIsOffline(!connected);
      
      if (connected && !networkConnected) {
        // Just reconnected - process retry queue
        processRetryQueue();
        showToast('success', 'Back online - syncing data');
      } else if (!connected && networkConnected) {
        // Just went offline
        showToast('warning', 'Working offline - changes saved locally');
      }
    });
  };

  const setupAppStateMonitoring = () => {
    appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);
  };

  const setupBackHandler = () => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showCameraModal || showScannerModal || showVerificationModal) {
        setShowCameraModal(false);
        setShowScannerModal(false);
        setShowVerificationModal(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      checkNetworkStatus();
      refreshData();
    }
    setAppState(nextAppState);
  };

  const loadExistingData = async () => {
    try {
      if (existingVehicle) {
        // Load verification status from real-time service
        const realTimeStatus = await RealTimeService.getVehicleVerificationStatus(existingVehicle.id);
        if (realTimeStatus) {
          setVerificationStatus(realTimeStatus.status);
          setVerificationProgress(realTimeStatus.progress || 0);
          setVerificationNotes(realTimeStatus.notes || '');
        }
        
        // Load queued uploads
        const storedQueue = await AsyncStorage.getItem('uploadQueue');
        if (storedQueue) {
          setRetryQueue(JSON.parse(storedQueue));
        }
      }
      
      // Check socket connection
      const isConnected = await socketService.isConnected();
      setSocketConnected(isConnected);
      
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const setupRealTimeListeners = () => {
    // Verification status updates
    socketService.on('vehicle:verification:status', (statusData) => {
      if (existingVehicle && statusData.vehicleId === existingVehicle.id) {
        updateVerificationStatus(statusData);
      }
    });

    // Document upload progress
    socketService.on('document:upload:progress', (progressData) => {
      handleUploadProgress(progressData);
    });

    // Admin messages
    socketService.on('vehicle:admin:message', (messageData) => {
      handleAdminMessage(messageData);
    });

    // Document scan results
    socketService.on('document:scan:complete', (scanData) => {
      handleDocumentScanComplete(scanData);
    });
  };

  const updateVerificationStatus = (statusData) => {
    setVerificationStatus(statusData.status);
    setVerificationProgress(statusData.progress || 0);
    setVerificationNotes(statusData.notes || '');
    
    switch (statusData.status) {
      case 'approved':
        showVerificationSuccess();
        break;
      case 'rejected':
        showVerificationRejection(statusData);
        break;
      case 'under_review':
        showToast('info', 'Vehicle under review');
        break;
    }
  };

  const showVerificationSuccess = () => {
    Alert.alert(
      '🎉 Vehicle Approved!',
      'Your vehicle has been verified and is now ready for rides.',
      [
        { 
          text: 'Start Driving', 
          onPress: () => navigation.replace('DriverHome')
        },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('VehicleDetails', { 
            vehicle: existingVehicle 
          })
        }
      ]
    );
  };

  const showVerificationRejection = (statusData) => {
    Alert.alert(
      '📝 Verification Update',
      `Your vehicle needs adjustments:\n\n${statusData.notes || 'Please review all details and documents.'}`,
      [
        { text: 'View Issues', onPress: () => setShowVerificationModal(true) },
        { text: 'OK' }
      ]
    );
  };

  const handleUploadProgress = (progressData) => {
    if (progressData.documentType) {
      setUploadProgress(prev => ({
        ...prev,
        [progressData.documentType]: progressData.progress
      }));
    }
  };

  const handleAdminMessage = (messageData) => {
    Alert.alert(
      'Admin Message',
      messageData.message,
      [
        { 
          text: 'View', 
          onPress: () => {
            setVerificationNotes(prev => prev + '\n\nAdmin: ' + messageData.message);
            setShowVerificationModal(true);
          }
        },
        { text: 'Dismiss' }
      ]
    );
  };

  const handleDocumentScanComplete = (scanData) => {
    if (scanData.documentType === currentDocumentType) {
      // Extract data from scan
      const extractedData = scanData.extractedData || {};
      
      switch (currentDocumentType) {
        case 'driversLicense':
          setFormData(prev => ({
            ...prev,
            licenseNumber: extractedData.licenseNumber || prev.licenseNumber
          }));
          setUploadedDocuments(prev => ({
            ...prev,
            driversLicense: {
              ...prev.driversLicense,
              verified: true,
              licenseNumber: extractedData.licenseNumber,
              expiryDate: extractedData.expiryDate
            }
          }));
          break;
          
        case 'registrationCertificate':
          setFormData(prev => ({
            ...prev,
            plateNumber: extractedData.plateNumber || prev.plateNumber,
            engineNumber: extractedData.engineNumber || prev.engineNumber,
            chassisNumber: extractedData.chassisNumber || prev.chassisNumber
          }));
          setUploadedDocuments(prev => ({
            ...prev,
            registrationCertificate: {
              ...prev.registrationCertificate,
              verified: true,
              registrationNumber: extractedData.registrationNumber,
              issueDate: extractedData.issueDate
            }
          }));
          break;
      }
      
      showToast('success', 'Document scanned successfully');
    }
  };

  // ====================
  // VEHICLE DATA HELPERS
  // ====================

  const getMakesForType = () => {
    if (formData.vehicleType === 'motorcycle') {
      return MOTORCYCLE_MAKES.map(make => ({
        label: make.label,
        value: make.value
      }));
    } else if (['car', 'minibus'].includes(formData.vehicleType)) {
      return CAR_MAKES.map(make => ({
        label: make.label,
        value: make.value
      }));
    }
    return [{ label: 'Other', value: 'Other' }];
  };

  const getModelsForMake = () => {
    const makes = formData.vehicleType === 'motorcycle' ? MOTORCYCLE_MAKES : CAR_MAKES;
    const selectedMake = makes.find(make => make.value === formData.make);
    return selectedMake?.models || [];
  };

  // ====================
  // IMAGE HANDLING
  // ====================

  const handleImageSelect = async (imageType) => {
    setCurrentImageType(imageType);
    
    Alert.alert(
      'Add Vehicle Photo',
      'Choose how to capture the image:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Smart Camera', 
          onPress: () => openSmartCamera(imageType)
        },
        { 
          text: 'Take Photo', 
          onPress: () => takePhoto(imageType)
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => pickImage(imageType)
        },
      ]
    );
  };

  const openSmartCamera = (imageType) => {
    setCurrentImageType(imageType);
    setShowCameraModal(true);
  };

  const takePhoto = async (imageType) => {
    try {
      // Check camera permission
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) return;

      const options = {
        mediaType: 'photo',
        quality: 0.9,
        maxWidth: 1920,
        maxHeight: 1080,
        includeBase64: false,
        saveToPhotos: true,
        cameraType: 'back',
      };

      const response = await launchCamera(options);
      handleImageResponse(response, imageType);
      
    } catch (error) {
      console.error('Camera error:', error);
      showToast('error', 'Failed to access camera');
    }
  };

  const pickImage = async (imageType) => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.9,
        maxWidth: 1920,
        maxHeight: 1080,
        includeBase64: false,
        selectionLimit: 1,
      };

      const response = await launchImageLibrary(options);
      handleImageResponse(response, imageType);
      
    } catch (error) {
      console.error('Image picker error:', error);
      showToast('error', 'Failed to pick image');
    }
  };

  const handleImageResponse = async (response, imageType) => {
    if (response.didCancel) return;
    
    if (response.error) {
      showToast('error', 'Failed to select image');
      return;
    }
    
    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      
      // Optimize image
      const optimizedImage = await optimizeImage(asset);
      
      // Add metadata
      const imageWithMetadata = {
        ...optimizedImage,
        metadata: {
          timestamp: new Date().toISOString(),
          type: imageType,
          size: optimizedImage.fileSize,
          dimensions: {
            width: optimizedImage.width,
            height: optimizedImage.height
          }
        },
        uploaded: false
      };
      
      // Update state
      setVehicleImages(prev => ({
        ...prev,
        [imageType]: imageWithMetadata
      }));
      
      // Auto-upload if connected
      if (networkConnected && !isOffline) {
        uploadImageToServer(imageWithMetadata, imageType);
      } else {
        // Queue for later
        queueForUpload(imageWithMetadata, 'image', imageType);
        showToast('info', 'Image saved offline - will upload when connected');
      }
    }
  };

  const optimizeImage = async (image) => {
    try {
      const resizedImage = await ImageResizer.createResizedImage(
        image.uri,
        1200, // max width
        1200, // max height
        'JPEG',
        85, // quality
        0, // rotation
        null, // outputPath
        false // compressImage
      );
      
      return {
        ...image,
        uri: resizedImage.uri,
        width: resizedImage.width,
        height: resizedImage.height,
        fileSize: resizedImage.size
      };
    } catch (error) {
      console.error('Image optimization error:', error);
      return image;
    }
  };

  // ====================
  // DOCUMENT HANDLING
  // ====================

  const handleDocumentUpload = async (documentType) => {
    setCurrentDocumentType(documentType);
    
    Alert.alert(
      'Upload Document',
      'Choose how to capture the document:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Scan Document', 
          onPress: () => openDocumentScanner(documentType)
        },
        { 
          text: 'Take Photo', 
          onPress: () => takeDocumentPhoto(documentType)
        },
        { 
          text: 'Choose File', 
          onPress: () => pickDocument(documentType)
        },
      ]
    );
  };

  const openDocumentScanner = (documentType) => {
    setCurrentDocumentType(documentType);
    setShowScannerModal(true);
  };

  const takeDocumentPhoto = async (documentType) => {
    try {
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) return;

      const options = {
        mediaType: 'photo',
        quality: 0.9,
        maxWidth: 1600,
        maxHeight: 1200,
        includeBase64: false,
        cameraType: 'back',
      };

      const response = await launchCamera(options);
      handleDocumentResponse(response, documentType);
      
    } catch (error) {
      console.error('Document camera error:', error);
      showToast('error', 'Failed to access camera');
    }
  };

  const pickDocument = async (documentType) => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
      });
      
      handleDocumentResponse({
        assets: [{
          uri: result[0].uri,
          type: result[0].type,
          name: result[0].name,
          size: result[0].size
        }]
      }, documentType);
      
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled
      } else {
        console.error('Document picker error:', error);
        showToast('error', 'Failed to pick document');
      }
    }
  };

  const handleDocumentResponse = async (response, documentType) => {
    if (response.didCancel) return;
    
    if (response.error) {
      showToast('error', 'Failed to select document');
      return;
    }
    
    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      
      // Create document object
      const document = {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `${documentType}_${Date.now()}.jpg`,
        size: asset.fileSize,
        uploaded: false,
        verified: false
      };
      
      // Update state
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          ...document
        }
      }));
      
      // Auto-upload if connected
      if (networkConnected && !isOffline) {
        uploadDocumentToServer(document, documentType);
      } else {
        // Queue for later
        queueForUpload(document, 'document', documentType);
        showToast('info', 'Document saved offline - will upload when connected');
      }
      
      // Try to extract data via OCR
      if (networkConnected) {
        extractDocumentData(document, documentType);
      }
    }
  };

  const extractDocumentData = async (document, documentType) => {
    try {
      setScanningDocument(true);
      
      const ocrResult = await scanDocumentOCR(document.uri, documentType);
      
      if (ocrResult.success) {
        // Update form with extracted data
        updateFormWithExtractedData(ocrResult.data, documentType);
        
        // Mark as verified
        setUploadedDocuments(prev => ({
          ...prev,
          [documentType]: {
            ...prev[documentType],
            verified: true,
            ...ocrResult.data
          }
        }));
        
        showToast('success', 'Document scanned successfully');
      }
    } catch (error) {
      console.error('OCR error:', error);
      // Continue without OCR data
    } finally {
      setScanningDocument(false);
    }
  };

  const updateFormWithExtractedData = (data, documentType) => {
    const updates = {};
    
    switch (documentType) {
      case 'driversLicense':
        if (data.licenseNumber) updates.licenseNumber = data.licenseNumber;
        break;
      case 'registrationCertificate':
        if (data.plateNumber) updates.plateNumber = data.plateNumber;
        if (data.engineNumber) updates.engineNumber = data.engineNumber;
        if (data.chassisNumber) updates.chassisNumber = data.chassisNumber;
        if (data.vehicleMake) updates.make = data.vehicleMake;
        if (data.vehicleModel) updates.model = data.vehicleModel;
        if (data.vehicleYear) updates.year = data.vehicleYear;
        break;
      case 'insuranceCertificate':
        if (data.expiryDate) updates.insuranceExpiry = data.expiryDate;
        break;
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
      showToast('info', 'Form updated with extracted data');
    }
  };

  // ====================
  // UPLOAD FUNCTIONS
  // ====================

  const uploadImageToServer = async (image, imageType) => {
    try {
      setUploading(true);
      setUploadProgress(prev => ({ ...prev, [imageType]: 10 }));
      
      // Upload to cloud storage
      const uploadResult = await uploadToCloudinary(image.uri, {
        folder: `vehicles/${existingVehicle?.id || 'new'}`,
        tags: [imageType, 'vehicle']
      });
      
      if (uploadResult.success) {
        // Update image with cloud URL
        setVehicleImages(prev => ({
          ...prev,
          [imageType]: {
            ...prev[imageType],
            cloudUrl: uploadResult.url,
            uploaded: true
          }
        }));
        
        setUploadProgress(prev => ({ ...prev, [imageType]: 100 }));
        
        // Notify admin if editing
        if (existingVehicle && socketConnected) {
          socketService.emit('vehicle:image:updated', {
            vehicleId: existingVehicle.id,
            imageType: imageType,
            url: uploadResult.url,
            timestamp: new Date().toISOString()
          });
        }
        
        showToast('success', 'Image uploaded successfully');
      }
      
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('error', 'Failed to upload image');
      
      // Queue for retry
      queueForUpload(image, 'image', imageType);
      
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[imageType];
          return newProgress;
        });
      }, 2000);
    }
  };

  const uploadDocumentToServer = async (document, documentType) => {
    try {
      setUploading(true);
      
      // Emit progress via socket
      socketService.emit('document:upload:started', { documentType });
      
      // Upload document
      const uploadResult = await DocumentService.uploadVehicleDocument(
        document,
        documentType,
        existingVehicle?.id || 'new',
        auth.token
      );
      
      if (uploadResult.success) {
        // Update document state
        setUploadedDocuments(prev => ({
          ...prev,
          [documentType]: {
            ...prev[documentType],
            uploaded: true,
            documentId: uploadResult.documentId
          }
        }));
        
        showToast('success', 'Document uploaded successfully');
        
        // Notify admin
        if (existingVehicle && socketConnected) {
          socketService.emit('vehicle:document:uploaded', {
            vehicleId: existingVehicle.id,
            documentType: documentType,
            timestamp: new Date().toISOString()
          });
        }
        
        // Check if all documents uploaded for verification
        if (areAllDocumentsUploaded() && !existingVehicle) {
          showToast('info', 'All documents uploaded - ready for verification');
        }
      }
      
    } catch (error) {
      console.error('Document upload error:', error);
      showToast('error', 'Failed to upload document');
      
      // Queue for retry
      queueForUpload(document, 'document', documentType);
      
    } finally {
      setUploading(false);
    }
  };

  const queueForUpload = (item, itemType, itemKey) => {
    const queueItem = {
      id: Date.now(),
      itemType,
      itemKey,
      item,
      retryCount: 0,
      timestamp: Date.now()
    };
    
    setRetryQueue(prev => [...prev, queueItem]);
    
    // Save to AsyncStorage
    AsyncStorage.setItem('uploadQueue', JSON.stringify([...retryQueue, queueItem]));
  };

  const processRetryQueue = async () => {
    if (retryQueue.length === 0) return;
    
    setLoading(true);
    
    try {
      const successfulUploads = [];
      
      for (const queueItem of retryQueue) {
        try {
          if (queueItem.itemType === 'image') {
            await uploadImageToServer(queueItem.item, queueItem.itemKey);
          } else if (queueItem.itemType === 'document') {
            await uploadDocumentToServer(queueItem.item, queueItem.itemKey);
          }
          
          successfulUploads.push(queueItem.id);
          
          // Delay between uploads
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error('Retry upload failed:', error);
          // Keep in queue for next retry
        }
      }
      
      // Remove successful uploads
      const remainingQueue = retryQueue.filter(item => 
        !successfulUploads.includes(item.id)
      );
      
      setRetryQueue(remainingQueue);
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(remainingQueue));
      
      if (successfulUploads.length > 0) {
        showToast('success', `${successfulUploads.length} items uploaded successfully`);
      }
      
    } catch (error) {
      console.error('Retry queue processing error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ====================
  // VALIDATION
  // ====================

  const validateForm = () => {
    // Basic required fields
    const requiredFields = ['vehicleType', 'make', 'model', 'year', 'plateNumber'];
    
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        showToast('error', `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        scrollToError(field);
        return false;
      }
    }

    // Year validation
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(formData.year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      showToast('error', `Please enter a valid year between 1900 and ${currentYear + 1}`);
      return false;
    }

    // Plate number validation
    const plateValid = validatePlateNumber(formData.plateNumber);
    if (!plateValid.valid) {
      showToast('error', `Invalid plate number: ${plateValid.message}`);
      return false;
    }

    // Vehicle data validation
    const vehicleValidation = validateVehicleData(formData);
    if (!vehicleValidation.valid) {
      showToast('error', vehicleValidation.message);
      return false;
    }

    // Check images
    const requiredImages = ['front', 'side'];
    const hasRequiredImages = requiredImages.every(img => 
      vehicleImages[img]?.uri !== null
    );
    
    if (!hasRequiredImages) {
      showToast('error', 'Please add front and side photos of your vehicle');
      return false;
    }

    // Check documents
    const requiredDocs = ['driversLicense', 'registrationCertificate'];
    const hasRequiredDocs = requiredDocs.every(doc => 
      uploadedDocuments[doc]?.uri !== null
    );
    
    if (!hasRequiredDocs) {
      showToast('error', 'Please upload driver\'s license and registration certificate');
      return false;
    }

    return true;
  };

  const scrollToError = (fieldName) => {
    // Implementation for scrolling to error field
    // This would require refs to each input field
  };

  const areAllDocumentsUploaded = () => {
    const requiredDocs = ['driversLicense', 'registrationCertificate'];
    return requiredDocs.every(doc => uploadedDocuments[doc]?.uri !== null);
  };

  // ====================
  // SUBMISSION
  // ====================

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare vehicle data
      const vehicleData = {
        ...formData,
        id: existingVehicle?.id || `vehicle_${Date.now()}`,
        driverId: driver?.id,
        driverName: driver?.name,
        driverPhone: driver?.phone,
        images: vehicleImages,
        documents: uploadedDocuments,
        status: 'pending',
        verificationStatus: 'pending',
        addedDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        socketConnected: socketConnected,
        networkConnected: networkConnected,
        location: await LocationService.getCurrentPosition().catch(() => null),
      };

      // Save to Redux
      if (isEditing) {
        dispatch(updateVehicle(vehicleData));
      } else {
        dispatch(addVehicle(vehicleData));
      }

      // Save locally
      await saveVehicleLocally(vehicleData);

      // Send to server if connected
      if (networkConnected && !isOffline) {
        await saveToServer(vehicleData);
      } else {
        // Queue for later sync
        await queueForSync(vehicleData);
      }

      // Show success
      showSubmitSuccess(vehicleData);

    } catch (error) {
      console.error('Submit error:', error);
      showToast('error', 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  const saveVehicleLocally = async (vehicleData) => {
    try {
      await AsyncStorage.setItem(`vehicle_${vehicleData.id}`, JSON.stringify(vehicleData));
      
      // Add to vehicles list
      const vehiclesList = await AsyncStorage.getItem('vehicles_list') || '[]';
      const vehicles = JSON.parse(vehiclesList);
      
      if (isEditing) {
        const index = vehicles.findIndex(v => v.id === vehicleData.id);
        if (index >= 0) {
          vehicles[index] = vehicleData;
        } else {
          vehicles.push(vehicleData);
        }
      } else {
        vehicles.push(vehicleData);
      }
      
      await AsyncStorage.setItem('vehicles_list', JSON.stringify(vehicles));
      
    } catch (error) {
      console.error('Local save error:', error);
    }
  };

  const saveToServer = async (vehicleData) => {
    try {
      const result = await RealTimeService.saveVehicle(vehicleData);
      
      if (result.success) {
        // Emit socket event
        if (socketConnected) {
          socketService.emit('vehicle:added', {
            ...vehicleData,
            eventType: isEditing ? 'updated' : 'added',
            timestamp: new Date().toISOString()
          });
        }
        
        return true;
      } else {
        throw new Error(result.message || 'Server save failed');
      }
      
    } catch (error) {
      console.error('Server save error:', error);
      throw error;
    }
  };

  const queueForSync = async (vehicleData) => {
    try {
      const syncQueue = await AsyncStorage.getItem('sync_queue') || '[]';
      const queue = JSON.parse(syncQueue);
      
      queue.push({
        type: 'vehicle',
        action: isEditing ? 'update' : 'create',
        data: vehicleData,
        timestamp: Date.now(),
        retryCount: 0
      });
      
      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      showToast('info', 'Vehicle saved offline - will sync when connected');
      
    } catch (error) {
      console.error('Queue sync error:', error);
    }
  };

  const showSubmitSuccess = (vehicleData) => {
    Alert.alert(
      isEditing ? '✅ Vehicle Updated' : '🚗 Vehicle Added',
      `Your ${formData.make} ${formData.model} has been ${isEditing ? 'updated' : 'added'} successfully.\n\n${!networkConnected ? 'Changes saved offline and will sync when connected.' : 'Real-time verification will begin shortly.'}`,
      [
        ...(areAllDocumentsUploaded() ? [{
          text: 'Request Verification',
          onPress: () => requestVerification()
        }] : []),
        {
          text: 'Upload More Documents',
          onPress: () => setShowVerificationModal(true)
        },
        {
          text: 'Done',
          onPress: () => {
            if (route.params?.onSave) {
              route.params.onSave(vehicleData);
            }
            navigation.goBack();
          }
        }
      ]
    );
  };

  const requestVerification = async () => {
    if (!areAllDocumentsUploaded()) {
      Alert.alert(
        'Documents Required',
        'Please upload all required documents before verification.',
        [
          { text: 'Upload Now', onPress: () => setShowVerificationModal(true) },
          { text: 'Later', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      
      const result = await RealTimeService.requestVehicleVerification(
        existingVehicle?.id,
        Object.keys(uploadedDocuments).filter(key => uploadedDocuments[key]?.uri)
      );
      
      if (result.success) {
        setVerificationStatus('under_review');
        
        if (socketConnected) {
          socketService.emit('vehicle:verification:requested', {
            vehicleId: existingVehicle?.id,
            driverId: driver?.id,
            driverName: driver?.name,
            timestamp: new Date().toISOString()
          });
        }
        
        Alert.alert(
          '📋 Verification Requested',
          'Your vehicle verification has been submitted.\n\nYou will receive real-time updates on the status.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Verification request error:', error);
      showToast('error', 'Failed to request verification');
    } finally {
      setLoading(false);
    }
  };

  // ====================
  // PERMISSIONS
  // ====================

  const checkCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Kabaza needs camera access to take vehicle photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          showToast('error', 'Camera permission denied');
          return false;
        }
      } catch (error) {
        console.error('Camera permission error:', error);
        return false;
      }
    }
    return true; // iOS handles this differently
  };

  // ====================
  // UTILITY FUNCTIONS
  // ====================

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
    loadExistingData();
  };

  const cleanup = () => {
    if (networkSubscription.current) {
      networkSubscription.current();
    }
    if (appStateSubscription.current) {
      appStateSubscription.current.remove();
    }
    // Clean up socket listeners
    socketService.off('vehicle:verification:status');
    socketService.off('document:upload:progress');
    socketService.off('vehicle:admin:message');
    socketService.off('document:scan:complete');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#00B894';
      case 'under_review': return '#FFA726';
      case 'rejected': return '#FF6B6B';
      case 'pending': return '#666';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'under_review': return 'clock-o';
      case 'rejected': return 'times-circle';
      case 'pending': return 'circle-o';
      default: return 'circle-o';
    }
  };

  // ====================
  // RENDER FUNCTIONS
  // ====================

  const renderConnectionStatus = () => (
    <View style={[
      styles.connectionBar,
      { backgroundColor: networkConnected ? '#00B894' : '#FFA726' }
    ]}>
      <Icon 
        name={networkConnected ? 'wifi' : 'wifi-slash'} 
        size={14} 
        color="#fff" 
      />
      <Text style={styles.connectionText}>
        {networkConnected 
          ? socketConnected 
            ? 'Real-time verification enabled' 
            : 'Online - Real-time features limited'
          : 'Offline - Save locally'
        }
      </Text>
      {retryQueue.length > 0 && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={processRetryQueue}
        >
          <Text style={styles.retryText}>
            {retryQueue.length} pending
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderImageButton = (label, imageType, icon, required = false) => {
    const image = vehicleImages[imageType];
    const progress = uploadProgress[imageType];
    
    return (
      <View style={styles.imageButtonContainer}>
        {required && (
          <Text style={styles.requiredBadge}>Required</Text>
        )}
        <TouchableOpacity 
          style={[
            styles.imageButton,
            !image?.uri && styles.imageButtonEmpty
          ]}
          onPress={() => handleImageSelect(imageType)}
          disabled={uploading}
        >
          {image?.uri ? (
            <>
              <Image 
                source={{ uri: image.uri }} 
                style={styles.imagePreview}
              />
              {progress && (
                <View style={styles.progressOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.progressText}>{progress}%</Text>
                </View>
              )}
              {image.uploaded && (
                <View style={styles.uploadedBadge}>
                  <Icon name="cloud" size={12} color="#fff" />
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name={icon} size={30} color="#00B894" />
              <Text style={styles.imageButtonText}>{label}</Text>
              <Text style={styles.imageHint}>Tap to add</Text>
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Icon name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        {image?.metadata?.dimensions && (
          <Text style={styles.imageMeta}>
            {image.metadata.dimensions.width}x{image.metadata.dimensions.height}
          </Text>
        )}
      </View>
    );
  };

  const renderDocumentButton = (label, documentType, icon, required = false) => {
    const document = uploadedDocuments[documentType];
    
    return (
      <TouchableOpacity 
        style={[
          styles.documentButton,
          document?.uri && styles.documentButtonUploaded,
          document?.verified && styles.documentButtonVerified
        ]}
        onPress={() => handleDocumentUpload(documentType)}
        disabled={uploading || scanningDocument}
      >
        <View style={styles.documentIconContainer}>
          <Icon 
            name={icon} 
            size={24} 
            color={document?.uri ? '#fff' : '#00B894'} 
          />
          {document?.verified && (
            <View style={styles.verifiedBadge}>
              <Icon name="check" size={10} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.documentInfo}>
          <Text style={[
            styles.documentButtonText,
            document?.uri && styles.documentButtonTextUploaded
          ]}>
            {label}
            {required && <Text style={styles.requiredStar}> *</Text>}
          </Text>
          {document?.licenseNumber && (
            <Text style={styles.documentNumber}>
              {document.licenseNumber}
            </Text>
          )}
          {document?.expiryDate && (
            <Text style={styles.documentExpiry}>
              Expires: {document.expiryDate}
            </Text>
          )}
        </View>
        <View style={styles.documentStatus}>
          {scanningDocument && currentDocumentType === documentType ? (
            <ActivityIndicator size="small" color="#00B894" />
          ) : document?.uri ? (
            <>
              {document.uploaded && (
                <Icon name="cloud" size={16} color="#fff" />
              )}
              <Icon 
                name={document.verified ? "check-circle" : "clock-o"} 
                size={16} 
                color={document.verified ? "#4CAF50" : "#FFA726"} 
                style={{ marginLeft: 5 }}
              />
            </>
          ) : (
            <Icon name="cloud-upload" size={16} color="#00B894" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderVerificationStatus = () => {
    if (!existingVehicle) return null;
    
    return (
      <Animated.View 
        style={[
          styles.verificationBanner,
          { 
            backgroundColor: getStatusColor(verificationStatus) + '20',
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.verificationHeader}>
          <View style={styles.verificationStatus}>
            <Icon 
              name={getStatusIcon(verificationStatus)} 
              size={20} 
              color={getStatusColor(verificationStatus)} 
            />
            <Text style={[
              styles.verificationStatusText,
              { color: getStatusColor(verificationStatus) }
            ]}>
              {getStatusText(verificationStatus)}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowVerificationModal(true)}
            style={styles.verificationDetailsButton}
          >
            <Text style={styles.verificationDetailsText}>Details</Text>
            <Icon name="chevron-right" size={12} color={getStatusColor(verificationStatus)} />
          </TouchableOpacity>
        </View>
        
        {verificationProgress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${verificationProgress}%`,
                    backgroundColor: getStatusColor(verificationStatus)
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{verificationProgress}%</Text>
          </View>
        )}
        
        {verificationNotes && (
          <Text style={styles.verificationNotes} numberOfLines={2}>
            {verificationNotes}
          </Text>
        )}
        
        {verificationStatus === 'rejected' && (
          <TouchableOpacity 
            style={styles.fixIssuesButton}
            onPress={() => setShowVerificationModal(true)}
          >
            <Icon name="wrench" size={14} color="#FF6B6B" />
            <Text style={styles.fixIssuesText}>Fix Issues</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // ====================
  // MAIN RENDER
  // ====================

  return (
    <View style={styles.container}>
      {renderConnectionStatus()}
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refreshData}
            colors={['#00B894']}
            tintColor="#00B894"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (showCameraModal || showScannerModal) {
                setShowCameraModal(false);
                setShowScannerModal(false);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Icon name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
          </Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => navigation.navigate('VehicleHelp')}
          >
            <Icon name="question-circle" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {renderVerificationStatus()}

        <Text style={styles.subtitle}>
          {isEditing 
            ? 'Update your vehicle information'
            : 'Add your vehicle details to start driving'
          }
        </Text>

        {/* Vehicle Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Type *</Text>
          <Text style={styles.sectionDescription}>
            Select the type of vehicle you'll be driving
          </Text>
          
          <View style={styles.vehicleTypeGrid}>
            {VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.vehicleTypeCard,
                  formData.vehicleType === type.value && styles.vehicleTypeCardSelected
                ]}
                onPress={() => setFormData({...formData, vehicleType: type.value})}
              >
                <View style={[
                  styles.vehicleTypeIcon,
                  formData.vehicleType === type.value && styles.vehicleTypeIconSelected
                ]}>
                  <Icon 
                    name={type.icon} 
                    size={28} 
                    color={formData.vehicleType === type.value ? '#fff' : '#00B894'} 
                  />
                </View>
                <Text style={[
                  styles.vehicleTypeLabel,
                  formData.vehicleType === type.value && styles.vehicleTypeLabelSelected
                ]}>
                  {type.label}
                </Text>
                <Text style={styles.vehicleTypeDescription}>
                  {type.description}
                </Text>
                <View style={styles.vehicleTypeMeta}>
                  <Text style={styles.vehicleTypeMetaText}>
                    Up to {type.maxPassengers} passenger{type.maxPassengers !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.vehicleTypeMetaText}>
                    {type.fareMultiplier}x fare
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vehicle Details Form */}
        <Animated.View 
          style={[
            styles.formSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.formSectionTitle}>Vehicle Details</Text>
          
          {/* Make and Model */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Make *</Text>
              <View style={styles.pickerContainer}>
                <RNPickerSelect
                  onValueChange={(value) => setFormData({...formData, make: value})}
                  items={getMakesForType()}
                  value={formData.make}
                  placeholder={{ label: 'Select make...', value: null }}
                  style={pickerSelectStyles}
                  useNativeAndroidPickerStyle={false}
                  disabled={uploading}
                />
                <Icon name="chevron-down" size={16} color="#666" style={styles.pickerIcon} />
              </View>
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Model *</Text>
              <View style={styles.modelContainer}>
                <TextInput
                  style={styles.input}
                  value={formData.model}
                  onChangeText={(text) => setFormData({...formData, model: text})}
                  placeholder="Enter model"
                  editable={!uploading}
                />
                {getModelsForMake().length > 0 && (
                  <TouchableOpacity 
                    style={styles.modelsButton}
                    onPress={() => {
                      Alert.alert(
                        'Common Models',
                        getModelsForMake().join('\n'),
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Icon name="list" size={16} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Year and Color */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Year *</Text>
              <TextInput
                style={styles.input}
                value={formData.year}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text) && text.length <= 4) {
                    setFormData({...formData, year: text});
                  }
                }}
                placeholder="YYYY"
                keyboardType="numeric"
                maxLength={4}
                editable={!uploading}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.pickerContainer}>
                <RNPickerSelect
                  onValueChange={(value) => setFormData({...formData, color: value})}
                  items={VEHICLE_COLORS.map(color => ({ label: color, value: color }))}
                  value={formData.color}
                  placeholder={{ label: 'Select color...', value: null }}
                  style={pickerSelectStyles}
                  useNativeAndroidPickerStyle={false}
                  disabled={uploading}
                />
                <Icon name="chevron-down" size={16} color="#666" style={styles.pickerIcon} />
              </View>
            </View>
          </View>

          {/* Plate Number */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Plate Number *</Text>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert(
                    'Plate Number Format',
                    'Malawi plate numbers typically follow these formats:\n\n• LL 1234 (Standard)\n• LL 1234 A (Extended)\n• CD 1234 (Diplomatic)\n• GVT 1234 (Government)\n\nExamples: LL 1234, KA 5678, CD 1234 A',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Icon name="info-circle" size={14} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={formData.plateNumber}
              onChangeText={(text) => setFormData({...formData, plateNumber: text.toUpperCase()})}
              placeholder="e.g., LL 1234"
              autoCapitalize="characters"
              editable={!uploading}
            />
            {formData.plateNumber && (
              <Text style={[
                styles.validationText,
                validatePlateNumber(formData.plateNumber).valid 
                  ? styles.validationSuccess 
                  : styles.validationError
              ]}>
                {validatePlateNumber(formData.plateNumber).message}
              </Text>
            )}
          </View>

          {/* Engine & Chassis Numbers */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Engine Number</Text>
              <TextInput
                style={styles.input}
                value={formData.engineNumber}
                onChangeText={(text) => setFormData({...formData, engineNumber: text.toUpperCase()})}
                placeholder="Engine number"
                autoCapitalize="characters"
                editable={!uploading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Chassis Number</Text>
              <TextInput
                style={styles.input}
                value={formData.chassisNumber}
                onChangeText={(text) => setFormData({...formData, chassisNumber: text.toUpperCase()})}
                placeholder="Chassis number"
                autoCapitalize="characters"
                editable={!uploading}
              />
            </View>
          </View>

          {/* Additional Details */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Seating Capacity</Text>
              <TextInput
                style={styles.input}
                value={formData.seatingCapacity}
                onChangeText={(text) => setFormData({...formData, seatingCapacity: text})}
                placeholder="e.g., 2"
                keyboardType="numeric"
                editable={!uploading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Fuel Type</Text>
              <View style={styles.pickerContainer}>
                <RNPickerSelect
                  onValueChange={(value) => setFormData({...formData, fuelType: value})}
                  items={[
                    { label: 'Petrol', value: 'petrol' },
                    { label: 'Diesel', value: 'diesel' },
                    { label: 'Electric', value: 'electric' },
                    { label: 'Hybrid', value: 'hybrid' },
                  ]}
                  value={formData.fuelType}
                  style={pickerSelectStyles}
                  useNativeAndroidPickerStyle={false}
                  disabled={uploading}
                />
                <Icon name="chevron-down" size={16} color="#666" style={styles.pickerIcon} />
              </View>
            </View>
          </View>

          {/* Expiry Dates */}
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Insurance Expiry</Text>
              <TextInput
                style={styles.input}
                value={formData.insuranceExpiry}
                onChangeText={(text) => setFormData({...formData, insuranceExpiry: text})}
                placeholder="DD/MM/YYYY"
                editable={!uploading}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Road Tax Expiry</Text>
              <TextInput
                style={styles.input}
                value={formData.roadTaxExpiry}
                onChangeText={(text) => setFormData({...formData, roadTaxExpiry: text})}
                placeholder="DD/MM/YYYY"
                editable={!uploading}
              />
            </View>
          </View>
        </Animated.View>

        {/* Vehicle Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Photos</Text>
          <Text style={styles.sectionDescription}>
            Add clear photos from different angles
          </Text>
          
          <View style={styles.imagesGrid}>
            {renderImageButton('Front View', 'front', 'car', true)}
            {renderImageButton('Back View', 'back', 'car')}
            {renderImageButton('Side View', 'side', 'image', true)}
            {renderImageButton('Dashboard', 'dashboard', 'tachometer')}
            {renderImageButton('Registration', 'registration', 'file-text')}
            {renderImageButton('Interior', 'interior', 'couch')}
          </View>
          
          <Text style={styles.photoTips}>
            💡 Tips: Good lighting, clear focus, show entire vehicle
          </Text>
        </View>

        {/* Required Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <Text style={styles.sectionDescription}>
            Upload clear photos of your documents
          </Text>
          
          <View style={styles.documentsContainer}>
            {renderDocumentButton("Driver's License", 'driversLicense', 'id-card', true)}
            {renderDocumentButton('Registration Certificate', 'registrationCertificate', 'file-text', true)}
            {renderDocumentButton('Insurance Certificate', 'insuranceCertificate', 'shield')}
            {renderDocumentButton('Road Tax Certificate', 'roadTaxCertificate', 'file-invoice-dollar')}
          </View>
          
          <TouchableOpacity 
            style={styles.scanAllButton}
            onPress={() => {
              Alert.alert(
                'Scan All Documents',
                'Use document scanner for better accuracy and automatic data extraction.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Scan Now', onPress: () => setShowScannerModal(true) }
                ]
              );
            }}
          >
            <Icon name="qrcode" size={16} color="#00B894" />
            <Text style={styles.scanAllText}>Scan Documents Automatically</Text>
          </TouchableOpacity>
        </View>

        {/* Verification Info */}
        <View style={styles.infoCard}>
          <Icon name="shield" size={24} color="#00B894" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Verification Process</Text>
            <Text style={styles.infoText}>
              • Documents reviewed within 24-48 hours{'\n'}
              • Real-time status updates{'\n'}
              • Email notifications{'\n'}
              • Support available if needed
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || uploading || scanningDocument) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || uploading || scanningDocument}
        >
          {loading || uploading || scanningDocument ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name={isEditing ? 'save' : 'check-circle'} size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Offline Notice */}
        {isOffline && (
          <View style={styles.offlineNotice}>
            <Icon name="cloud-slash" size={14} color="#666" />
            <Text style={styles.offlineText}>
              Working offline. {retryQueue.length} item(s) queued for upload.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.modalContainer}>
          <CameraView
            ref={cameraRef}
            type={currentImageType}
            onCapture={(image) => {
              handleImageResponse({ assets: [image] }, currentImageType);
              setShowCameraModal(false);
            }}
            onClose={() => setShowCameraModal(false)}
          />
        </View>
      </Modal>

      {/* Document Scanner Modal */}
      <Modal
        visible={showScannerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScannerModal(false)}
      >
        <View style={styles.modalContainer}>
          <DocumentScanner
            type={currentDocumentType}
            onScan={(document) => {
              handleDocumentResponse({ assets: [document] }, currentDocumentType);
              setShowScannerModal(false);
            }}
            onClose={() => setShowScannerModal(false)}
          />
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vehicle Verification</Text>
              <TouchableOpacity onPress={() => setShowVerificationModal(false)}>
                <Icon name="times" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.verificationSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(verificationStatus) }
                  ]}>
                    <Icon name={getStatusIcon(verificationStatus)} size={12} color="#fff" />
                    <Text style={styles.statusBadgeText}>
                      {getStatusText(verificationStatus)}
                    </Text>
                  </View>
                </View>
                
                {verificationProgress > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Progress</Text>
                    <Text style={styles.summaryValue}>{verificationProgress}%</Text>
                  </View>
                )}
              </View>
              
              {verificationNotes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesTitle}>Admin Notes</Text>
                  <Text style={styles.notesText}>{verificationNotes}</Text>
                </View>
              )}
              
              <Text style={styles.modalText}>
                To complete verification, ensure all requirements are met:
              </Text>
              
              <View style={styles.requirementList}>
                {[
                  { id: 1, text: 'All vehicle photos uploaded and clear', complete: Object.values(vehicleImages).filter(img => img?.uri).length >= 2 },
                  { id: 2, text: 'Driver\'s license uploaded and valid', complete: uploadedDocuments.driversLicense?.uri },
                  { id: 3, text: 'Registration certificate uploaded', complete: uploadedDocuments.registrationCertificate?.uri },
                  { id: 4, text: 'Vehicle details accurate and complete', complete: validateVehicleData(formData).valid },
                  { id: 5, text: 'Insurance certificate uploaded', complete: uploadedDocuments.insuranceCertificate?.uri },
                ].map(req => (
                  <View key={req.id} style={styles.requirementItem}>
                    <Icon 
                      name={req.complete ? "check-circle" : "circle-o"} 
                      size={16} 
                      color={req.complete ? "#00B894" : "#ccc"} 
                    />
                    <Text style={[
                      styles.requirementText,
                      req.complete && styles.requirementTextComplete
                    ]}>
                      {req.text}
                    </Text>
                  </View>
                ))}
              </View>
              
              {verificationStatus === 'rejected' && (
                <TouchableOpacity 
                  style={styles.fixButton}
                  onPress={() => {
                    setShowVerificationModal(false);
                    // Scroll to first incomplete requirement
                  }}
                >
                  <Icon name="wrench" size={16} color="#fff" />
                  <Text style={styles.fixButtonText}>Fix Issues Now</Text>
                </TouchableOpacity>
              )}
              
              {verificationStatus === 'pending' && areAllDocumentsUploaded() && (
                <TouchableOpacity 
                  style={styles.verifyNowButton}
                  onPress={requestVerification}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="shield" size={20} color="#fff" />
                      <Text style={styles.verifyNowButtonText}>Request Verification Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ====================
// STYLES
// ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  
  // Connection Status
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  helpButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Verification Banner
  verificationBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  verificationDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationDetailsText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#ddd',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    fontWeight: '600',
  },
  verificationNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    lineHeight: 16,
  },
  fixIssuesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 6,
  },
  fixIssuesText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // General
  subtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  
  // Sections
  section: { 
    paddingHorizontal: 20, 
    marginTop: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4 
  },
  sectionDescription: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 15 
  },
  
  // Vehicle Type Grid
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vehicleTypeCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  vehicleTypeCardSelected: {
    borderColor: '#00B894',
    backgroundColor: '#f0f9f5',
  },
  vehicleTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleTypeIconSelected: {
    backgroundColor: '#00B894',
  },
  vehicleTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  vehicleTypeLabelSelected: {
    color: '#00B894',
  },
  vehicleTypeDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  vehicleTypeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  vehicleTypeMetaText: {
    fontSize: 10,
    color: '#999',
  },
  
  // Form Section
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modelContainer: {
    position: 'relative',
  },
  modelsButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  pickerIcon: {
    position: 'absolute',
    right: 15,
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
  },
  validationSuccess: {
    color: '#00B894',
  },
  validationError: {
    color: '#FF6B6B',
  },
  
  // Image Buttons
  imageButtonContainer: {
    width: (width - 60) / 3,
    marginBottom: 15,
  },
  requiredBadge: {
    position: 'absolute',
    top: -6,
    left: 5,
    backgroundColor: '#FF6B6B',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  imageButton: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imageButtonEmpty: {
    borderWidth: 2,
    borderColor: '#00B894',
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#00B894',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f7f0',
  },
  imageButtonText: {
    fontSize: 12,
    color: '#00B894',
    marginTop: 5,
    fontWeight: '500',
  },
  imageHint: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#00B894',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageMeta: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  photoTips: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Document Buttons
  documentsContainer: {
    marginBottom: 15,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#00B894',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  documentButtonUploaded: {
    backgroundColor: '#00B894',
  },
  documentButtonVerified: {
    borderColor: '#4CAF50',
  },
  documentIconContainer: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  documentButtonText: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
  },
  documentButtonTextUploaded: {
    color: '#fff',
  },
  requiredStar: {
    color: '#FF6B6B',
  },
  documentNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  documentExpiry: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  scanAllText: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  
  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    marginHorizontal: 20,
    marginTop: 25,
    padding: 18,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Offline Notice
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 10,
  },
  offlineText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  verificationSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notesSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  requirementList: {
    marginBottom: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  requirementTextComplete: {
    color: '#333',
    textDecorationLine: 'line-through',
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginBottom: 15,
  },
  fixButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  verifyNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: 'black',
    paddingRight: 30,
  },
});