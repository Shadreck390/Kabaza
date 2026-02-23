/**
 * ============================================================================
 * screens/driver/DriverDocumentsScreen.js
 * ============================================================================
 * 
 * DRIVER DOCUMENTS SCREEN - ENHANCED VERSION
 * 
 * Comprehensive document management screen for drivers with:
 * - Multi-format document upload (images, PDFs, scans)
 * - Real-time verification status tracking
 * - Document expiry monitoring and notifications
 * - Smart document scanning with OCR
 * - Offline upload support with sync
 * - Document categorization and organization
 * - Admin review workflow integration
 * 
 * Key Improvements:
 * 1. Enhanced document scanning with edge detection
 * 2. Real-time status updates via WebSocket
 * 3. Document expiry reminders
 * 4. Batch upload and progress tracking
 * 5. Document version history
 * 6. Quality validation and automatic retry
 * 7. Comprehensive error handling
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Image,
  Platform,
  Linking,
  Modal,
  ActivityIndicator,
  Animated,
  RefreshControl,
  BackHandler,
  AppState,
} from 'react-native';
import { MaterialIconFallback as Icon } from '@src/utils/iconUtils';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'react-native-document-picker';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import ImageResizer from 'react-native-image-resizer';

// Enhanced imports
import socketService from '@services/socket/socketService';
import { uploadToCloudinary } from '@services/document/ocrService';
import { showToast } from '@components/Toast';
import DocumentScanner from '@components/DocumentScanner';
import CameraView from '@components/CameraView';
import { validateDocument } from '@utils/documentValidation';
import { formatFileSize, formatDate } from '@utils/formatters';

const { width, height } = Dimensions.get('window');

// Enhanced document types with more metadata
const DOCUMENT_TYPES = {
  LICENSE: {
    id: 'license',
    title: 'Driver\'s License',
    description: 'Valid driver\'s license',
    icon: 'license',
    required: true,
    maxSize: 5, // MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    scanType: 'license',
    validationRules: {
      minResolution: { width: 800, height: 600 },
      maxFileSize: 5 * 1024 * 1024, // 5MB in bytes
      requiredFields: ['licenseNumber', 'expiryDate', 'fullName'],
    },
    expiryDaysWarning: 30,
  },
  VEHICLE_REGISTRATION: {
    id: 'vehicle_registration',
    title: 'Vehicle Registration',
    description: 'Vehicle registration certificate',
    icon: 'car',
    required: true,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    scanType: 'registration',
    validationRules: {
      minResolution: { width: 1000, height: 800 },
      requiredFields: ['plateNumber', 'registrationNumber', 'vehicleMake'],
    },
  },
  INSURANCE: {
    id: 'insurance',
    title: 'Insurance Certificate',
    description: 'Vehicle insurance certificate',
    icon: 'security',
    required: true,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    scanType: 'insurance',
    validationRules: {
      requiredFields: ['policyNumber', 'expiryDate', 'insuranceCompany'],
    },
    expiryDaysWarning: 15,
  },
  PROFILE_PHOTO: {
    id: 'profile_photo',
    title: 'Profile Photo',
    description: 'Clear face photo for identification',
    icon: 'camera',
    required: true,
    maxSize: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
    validationRules: {
      minResolution: { width: 400, height: 400 },
      aspectRatio: { min: 0.75, max: 1.33 },
      faceRequired: true,
    },
  },
  VEHICLE_PHOTO: {
    id: 'vehicle_photo',
    title: 'Vehicle Photo',
    description: 'Clear vehicle photo showing all sides',
    icon: 'car',
    required: true,
    maxSize: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
    validationRules: {
      minResolution: { width: 1200, height: 800 },
      vehicleVisible: true,
    },
  },
  BACKGROUND_CHECK: {
    id: 'background_check',
    title: 'Background Check',
    description: 'Police clearance certificate',
    icon: 'nrc',
    required: false,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    scanType: 'background_check',
    validationRules: {
      requiredFields: ['clearanceNumber', 'issueDate'],
    },
  },
  TAX_CERTIFICATE: {
    id: 'tax_certificate',
    title: 'Tax Certificate',
    description: 'Tax compliance certificate',
    icon: 'file-document',
    required: false,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  MEDICAL_CERTIFICATE: {
    id: 'medical_certificate',
    title: 'Medical Certificate',
    description: 'Medical fitness certificate',
    icon: 'document',
    required: false,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
};

const DOCUMENT_STATUS = {
  MISSING: 'missing',
  DRAFT: 'draft',
  UPLOADING: 'uploading',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  EXPIRING_SOON: 'expiring_soon',
};

const VERIFICATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  VERIFIED: 'verified',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
};

export default function DriverDocumentsScreen() {
  const navigation = useNavigation();
  const [documents, setDocuments] = useState({});
  const [uploading, setUploading] = useState(false);
  const [scanningDocument, setScanningDocument] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(VERIFICATION_STATUS.NOT_STARTED);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const networkSubscription = useRef(null);
  const appStateSubscription = useRef(null);
  const socketSubscription = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      loadDocuments();
      checkExpiringDocuments();
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  useEffect(() => {
    initializeScreen();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (uploadQueue.length > 0 && isOnline && !uploading) {
      processUploadQueue();
    }
  }, [uploadQueue, isOnline, uploading]);

  const initializeScreen = async () => {
    try {
      // Check network
      await checkNetworkStatus();
      
      // Setup listeners
      setupNetworkMonitoring();
      setupAppStateMonitoring();
      setupSocketListeners();
      setupBackHandler();
      
      // Load data
      await loadDocuments();
      
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
      showToast('error', 'Failed to initialize documents screen');
    }
  };

  const checkNetworkStatus = async () => {
    const netState = await NetInfo.fetch();
    const connected = netState.isConnected && netState.isInternetReachable;
    setIsOnline(connected);
    return connected;
  };

  const setupNetworkMonitoring = () => {
    networkSubscription.current = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsOnline(connected);
      
      if (connected && !isOnline) {
        // Just reconnected
        showToast('success', 'Back online - syncing documents');
        processUploadQueue();
      } else if (!connected && isOnline) {
        // Just went offline
        showToast('warning', 'Working offline - changes saved locally');
      }
    });
  };

  const setupAppStateMonitoring = () => {
    appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);
  };

  const setupSocketListeners = () => {
    // Document verification updates
    socketSubscription.current = socketService.on('document:verification:update', (update) => {
      handleDocumentVerificationUpdate(update);
    });
    
    // Admin messages
    socketSubscription.current = socketService.on('document:admin:message', (message) => {
      handleAdminMessage(message);
    });
    
    // Connection status
    socketSubscription.current = socketService.on('connection:status', (status) => {
      setSocketConnected(status === 'connected');
    });
  };

  const setupBackHandler = () => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showScannerModal || showCameraModal || showExpiryModal) {
        setShowScannerModal(false);
        setShowCameraModal(false);
        setShowExpiryModal(false);
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

  const loadDocuments = async () => {
    try {
      setRefreshing(true);
      
      // Load from AsyncStorage
      const saved = await AsyncStorage.getItem('driver_documents');
      const storedDocuments = saved ? JSON.parse(saved) : {};
      
      // Initialize missing documents
      const initializedDocuments = {};
      Object.values(DOCUMENT_TYPES).forEach(docType => {
        if (storedDocuments[docType.id]) {
          initializedDocuments[docType.id] = storedDocuments[docType.id];
        } else {
          initializedDocuments[docType.id] = {
            ...docType,
            status: DOCUMENT_STATUS.MISSING,
            file: null,
            uploadedAt: null,
            reviewedAt: null,
            approvedAt: null,
            rejectedAt: null,
            rejectionReason: null,
            adminNotes: null,
            expiresAt: null,
            expiryWarningSent: false,
            versions: [],
            metadata: {},
            uploadProgress: 0,
          };
        }
      });
      
      setDocuments(initializedDocuments);
      
      // Load verification status
      const status = await AsyncStorage.getItem('driver_verification_status');
      setVerificationStatus(status || VERIFICATION_STATUS.NOT_STARTED);
      
      // Calculate progress
      updateVerificationProgress(initializedDocuments);
      
      // Load upload queue
      const queue = await AsyncStorage.getItem('upload_queue');
      setUploadQueue(queue ? JSON.parse(queue) : []);
      
      // Check for expiring documents
      checkExpiringDocuments(initializedDocuments);
      
    } catch (error) {
      console.error('Error loading documents:', error);
      showToast('error', 'Failed to load documents');
    } finally {
      setRefreshing(false);
    }
  };

  const saveDocuments = async (updatedDocuments) => {
    try {
      await AsyncStorage.setItem('driver_documents', JSON.stringify(updatedDocuments));
      setDocuments(updatedDocuments);
      updateVerificationProgress(updatedDocuments);
      checkExpiringDocuments(updatedDocuments);
      
      // If online, sync with server
      if (isOnline && socketConnected) {
        syncWithServer(updatedDocuments);
      }
    } catch (error) {
      console.error('Error saving documents:', error);
      throw error;
    }
  };

  const updateVerificationProgress = (docList) => {
    const approvedCount = Object.values(docList).filter(
      doc => doc.status === DOCUMENT_STATUS.APPROVED && doc.required
    ).length;
    const totalRequired = Object.values(DOCUMENT_TYPES).filter(
      doc => doc.required
    ).length;
    const progress = totalRequired > 0 ? Math.round((approvedCount / totalRequired) * 100) : 0;
    setVerificationProgress(progress);
    
    // Update overall verification status
    if (progress === 100) {
      setVerificationStatus(VERIFICATION_STATUS.VERIFIED);
      AsyncStorage.setItem('driver_verification_status', VERIFICATION_STATUS.VERIFIED);
    } else if (progress > 0) {
      setVerificationStatus(VERIFICATION_STATUS.IN_PROGRESS);
      AsyncStorage.setItem('driver_verification_status', VERIFICATION_STATUS.IN_PROGRESS);
    }
  };

  const checkExpiringDocuments = (docList = documents) => {
    const today = new Date();
    const expiringDocs = [];
    
    Object.values(docList).forEach(doc => {
      if (doc.expiresAt && doc.status === DOCUMENT_STATUS.APPROVED) {
        const expiryDate = new Date(doc.expiresAt);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          if (!doc.expiryWarningSent) {
            expiringDocs.push({
              ...doc,
              daysUntilExpiry
            });
          }
        }
      }
    });
    
    if (expiringDocs.length > 0) {
      setExpiringDocuments(expiringDocs);
      setShowExpiryModal(true);
      
      // Mark warnings as sent
      const updatedDocs = { ...docList };
      expiringDocs.forEach(doc => {
        updatedDocs[doc.id].expiryWarningSent = true;
      });
      saveDocuments(updatedDocs);
    }
  };

  const handleDocumentVerificationUpdate = (update) => {
    const { documentId, status, adminNotes, rejectionReason } = update;
    
    setDocuments(prev => {
      const updated = { ...prev };
      if (updated[documentId]) {
        updated[documentId] = {
          ...updated[documentId],
          status,
          adminNotes,
          rejectionReason,
          reviewedAt: new Date().toISOString(),
          ...(status === DOCUMENT_STATUS.APPROVED && { approvedAt: new Date().toISOString() }),
          ...(status === DOCUMENT_STATUS.REJECTED && { rejectedAt: new Date().toISOString() }),
        };
      }
      return updated;
    });
    
    showToast(
      'info',
      `${DOCUMENT_TYPES[documentId]?.title || 'Document'} ${status === DOCUMENT_STATUS.APPROVED ? 'approved' : 'requires attention'}`
    );
  };

  const handleAdminMessage = (message) => {
    Alert.alert(
      'Admin Message',
      message.text,
      [
        { text: 'View', onPress: () => handleViewDocument(message.documentId) },
        { text: 'Dismiss' }
      ]
    );
  };

  const syncWithServer = async (docList) => {
    try {
      // Send document status to server via socket
      Object.values(docList).forEach(doc => {
        if (doc.file && doc.status !== DOCUMENT_STATUS.MISSING) {
          socketService.emit('document:sync', {
            documentId: doc.id,
            status: doc.status,
            uploadedAt: doc.uploadedAt,
            metadata: doc.metadata,
          });
        }
      });
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const handleUploadDocument = async (docType) => {
    setCurrentDocument(docType);
    
    Alert.alert(
      `Upload ${docType.title}`,
      'Choose how to capture the document:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(docType.scanType ? [{
          text: 'Smart Scan',
          onPress: () => openDocumentScanner(docType)
        }] : []),
        {
          text: 'Take Photo',
          onPress: () => openCamera(docType)
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickFromGallery(docType)
        },
        {
          text: 'Choose File',
          onPress: () => pickFile(docType)
        },
      ]
    );
  };

  const openDocumentScanner = (docType) => {
    setCurrentDocument(docType);
    setShowScannerModal(true);
  };

  const openCamera = async (docType) => {
    try {
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.9,
        cameraType: 'back',
      };

      const response = await new Promise((resolve, reject) => {
        ImagePicker.launchCamera(options, resolve);
      });

      if (response.didCancel) return;
      if (response.error) {
        throw new Error(response.error);
      }

      await processDocumentUpload(docType, response.assets[0]);
    } catch (error) {
      console.error('Camera error:', error);
      showToast('error', 'Failed to capture photo');
    }
  };

  const pickFromGallery = async (docType) => {
    try {
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.9,
        selectionLimit: 1,
      };

      const response = await new Promise((resolve, reject) => {
        ImagePicker.launchImageLibrary(options, resolve);
      });

      if (response.didCancel) return;
      if (response.error) {
        throw new Error(response.error);
      }

      await processDocumentUpload(docType, response.assets[0]);
    } catch (error) {
      console.error('Gallery error:', error);
      showToast('error', 'Failed to pick image');
    }
  };

  const pickFile = async (docType) => {
    try {
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.images,
          DocumentPicker.types.pdf,
          DocumentPicker.types.docx,
        ],
        allowMultiSelection: false,
      });

      await processDocumentUpload(docType, result[0]);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled
      } else {
        console.error('File picker error:', error);
        showToast('error', 'Failed to pick file');
      }
    }
  };

  const processDocumentUpload = async (docType, file) => {
    try {
      // Validate file
      const validation = validateDocument(file, docType);
      if (!validation.valid) {
        showToast('error', validation.message);
        return;
      }

      // Optimize image if needed
      const processedFile = await optimizeFile(file, docType);

      // Update document status
      const documentId = docType.id;
      const updatedDocuments = {
        ...documents,
        [documentId]: {
          ...documents[documentId],
          status: DOCUMENT_STATUS.UPLOADING,
          file: {
            uri: processedFile.uri,
            name: processedFile.fileName || `document_${Date.now()}`,
            type: processedFile.type,
            size: processedFile.fileSize,
            localPath: processedFile.uri,
          },
          uploadedAt: null,
          uploadProgress: 0,
          metadata: {
            ...processedFile.metadata,
            validatedAt: new Date().toISOString(),
          },
        },
      };

      await saveDocuments(updatedDocuments);

      // Add to upload queue
      addToUploadQueue(documentId, processedFile);

    } catch (error) {
      console.error('Upload processing error:', error);
      showToast('error', 'Failed to process document');
    }
  };

  const optimizeFile = async (file, docType) => {
    const optimized = { ...file };
    
    // Optimize images
    if (file.type.startsWith('image/') && !file.type.includes('gif')) {
      try {
        const resized = await ImageResizer.createResizedImage(
          file.uri,
          1200, // max width
          1200, // max height
          'JPEG',
          85, // quality
          0, // rotation
          null, // outputPath
          false // keep metadata
        );
        
        optimized.uri = resized.uri;
        optimized.fileSize = resized.size;
        optimized.width = resized.width;
        optimized.height = resized.height;
        optimized.metadata = {
          ...optimized.metadata,
          optimized: true,
          originalSize: file.fileSize,
          optimizedSize: resized.size,
          compressionRatio: ((file.fileSize - resized.size) / file.fileSize * 100).toFixed(1) + '%',
        };
      } catch (error) {
        console.error('Image optimization error:', error);
        // Continue with original file
      }
    }
    
    return optimized;
  };

  const addToUploadQueue = async (documentId, file) => {
    const queueItem = {
      id: Date.now(),
      documentId,
      file,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    const newQueue = [...uploadQueue, queueItem];
    setUploadQueue(newQueue);
    await AsyncStorage.setItem('upload_queue', JSON.stringify(newQueue));

    showToast('info', 'Document added to upload queue');
    
    // Start upload if online
    if (isOnline) {
      processUploadQueue();
    }
  };

  const processUploadQueue = async () => {
    if (uploading || uploadQueue.length === 0 || !isOnline) return;

    setUploading(true);
    
    try {
      const queueItem = uploadQueue[0];
      const docType = DOCUMENT_TYPES[queueItem.documentId];
      
      if (!docType) {
        // Remove invalid item
        removeFromQueue(queueItem.id);
        return;
      }

      // Update upload progress
      updateUploadProgress(queueItem.documentId, 10);

      // Upload to cloud storage
      const uploadResult = await uploadToCloudinary(
        queueItem.file.uri,
        {
          folder: `drivers/documents/${queueItem.documentId}`,
          tags: [queueItem.documentId, 'driver_document'],
          upload_preset: 'driver_docs',
        }
      );

      if (uploadResult.success) {
        // Update document with cloud URL
        const updatedDocuments = {
          ...documents,
          [queueItem.documentId]: {
            ...documents[queueItem.documentId],
            status: DOCUMENT_STATUS.PENDING,
            file: {
              ...documents[queueItem.documentId].file,
              cloudUrl: uploadResult.url,
              cloudId: uploadResult.public_id,
            },
            uploadedAt: new Date().toISOString(),
            uploadProgress: 100,
            metadata: {
              ...documents[queueItem.documentId].metadata,
              cloudUploaded: true,
              cloudUrl: uploadResult.url,
              uploadCompletedAt: new Date().toISOString(),
            },
            versions: [
              ...(documents[queueItem.documentId].versions || []),
              {
                version: (documents[queueItem.documentId].versions?.length || 0) + 1,
                uploadedAt: new Date().toISOString(),
                url: uploadResult.url,
                size: queueItem.file.size,
              }
            ],
          },
        };

        await saveDocuments(updatedDocuments);

        // Notify server via socket
        if (socketConnected) {
          socketService.emit('document:uploaded', {
            documentId: queueItem.documentId,
            type: docType.title,
            url: uploadResult.url,
            metadata: updatedDocuments[queueItem.documentId].metadata,
            driverId: await AsyncStorage.getItem('driver_id'),
          });
        }

        // Remove from queue
        removeFromQueue(queueItem.id);

        showToast('success', `${docType.title} uploaded successfully`);
        
        // Process next item if any
        if (uploadQueue.length > 1) {
          setTimeout(() => processUploadQueue(), 1000);
        }
      } else {
        // Handle upload failure
        handleUploadFailure(queueItem);
      }

    } catch (error) {
      console.error('Queue processing error:', error);
      showToast('error', 'Upload failed - will retry');
      handleUploadFailure(uploadQueue[0]);
    } finally {
      setUploading(false);
    }
  };

  const updateUploadProgress = (documentId, progress) => {
    setDocuments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        uploadProgress: progress,
      },
    }));
  };

  const removeFromQueue = (itemId) => {
    const newQueue = uploadQueue.filter(item => item.id !== itemId);
    setUploadQueue(newQueue);
    AsyncStorage.setItem('upload_queue', JSON.stringify(newQueue));
  };

  const handleUploadFailure = (queueItem) => {
    const newQueue = [...uploadQueue];
    const itemIndex = newQueue.findIndex(item => item.id === queueItem.id);
    
    if (itemIndex >= 0) {
      newQueue[itemIndex] = {
        ...newQueue[itemIndex],
        retryCount: newQueue[itemIndex].retryCount + 1,
        status: 'failed',
      };
      
      if (newQueue[itemIndex].retryCount >= 3) {
        // Remove after 3 retries
        newQueue.splice(itemIndex, 1);
        showToast('error', 'Upload failed after multiple attempts');
      }
      
      setUploadQueue(newQueue);
      AsyncStorage.setItem('upload_queue', JSON.stringify(newQueue));
    }
  };

  const handleViewDocument = async (document) => {
    if (!document.file) {
      Alert.alert('No Document', 'Please upload a document first');
      return;
    }

    Alert.alert(
      'Document Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Preview', onPress: () => previewDocument(document) },
        { text: 'View Details', onPress: () => viewDocumentDetails(document) },
        { text: 'Replace', onPress: () => handleUploadDocument(document) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteDocument(document) },
        ...(document.versions?.length > 1 ? [
          { text: 'Version History', onPress: () => viewVersionHistory(document) }
        ] : []),
      ]
    );
  };

  const previewDocument = (document) => {
    const url = document.file.cloudUrl || document.file.localPath;
    if (url) {
      navigation.navigate('DocumentPreview', { 
        document,
        url,
        title: document.title,
      });
    } else {
      showToast('error', 'Document not available for preview');
    }
  };

  const viewDocumentDetails = (document) => {
    navigation.navigate('DocumentDetails', { 
      document,
      onRefresh: loadDocuments,
    });
  };

  const viewVersionHistory = (document) => {
    navigation.navigate('DocumentVersions', { 
      documentId: document.id,
      versions: document.versions || [],
    });
  };

  const handleDeleteDocument = async (document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete your ${document.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedDocuments = {
                ...documents,
                [document.id]: {
                  ...DOCUMENT_TYPES[document.id],
                  status: DOCUMENT_STATUS.MISSING,
                  file: null,
                  uploadedAt: null,
                  reviewedAt: null,
                  rejectionReason: null,
                  versions: [],
                  metadata: {},
                },
              };
              
              await saveDocuments(updatedDocuments);
              
              // Remove from upload queue if present
              const newQueue = uploadQueue.filter(item => item.documentId !== document.id);
              setUploadQueue(newQueue);
              await AsyncStorage.setItem('upload_queue', JSON.stringify(newQueue));
              
              showToast('success', 'Document deleted successfully');
            } catch (error) {
              console.error('Delete error:', error);
              showToast('error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const refreshData = () => {
    loadDocuments();
  };

  const cleanup = () => {
    if (networkSubscription.current) {
      networkSubscription.current();
    }
    if (appStateSubscription.current) {
      appStateSubscription.current.remove();
    }
    if (socketSubscription.current) {
      socketSubscription.current();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case DOCUMENT_STATUS.APPROVED:
        return '#22C55E';
      case DOCUMENT_STATUS.PENDING:
      case DOCUMENT_STATUS.UNDER_REVIEW:
        return '#F59E0B';
      case DOCUMENT_STATUS.REJECTED:
        return '#EF4444';
      case DOCUMENT_STATUS.EXPIRED:
      case DOCUMENT_STATUS.EXPIRING_SOON:
        return '#8B5CF6';
      case DOCUMENT_STATUS.UPLOADING:
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case DOCUMENT_STATUS.APPROVED:
        return 'Approved';
      case DOCUMENT_STATUS.PENDING:
        return 'Pending Review';
      case DOCUMENT_STATUS.UNDER_REVIEW:
        return 'Under Review';
      case DOCUMENT_STATUS.REJECTED:
        return 'Rejected';
      case DOCUMENT_STATUS.EXPIRED:
        return 'Expired';
      case DOCUMENT_STATUS.EXPIRING_SOON:
        return 'Expiring Soon';
      case DOCUMENT_STATUS.UPLOADING:
        return 'Uploading';
      case DOCUMENT_STATUS.DRAFT:
        return 'Draft';
      default:
        return 'Not Uploaded';
    }
  };

  const renderVerificationStatus = () => (
    <Animated.View 
      style={[
        styles.verificationCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.verificationHeader}>
        <View style={[
          styles.verificationIcon,
          { backgroundColor: getVerificationStatusColor() + '20' }
        ]}>
          <MaterialIcon 
            name={getVerificationStatusIcon()} 
            size={28} 
            color={getVerificationStatusColor()} 
          />
        </View>
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationTitle}>
            {getVerificationStatusTitle()}
          </Text>
          <Text style={styles.verificationSubtitle}>
            {getVerificationStatusSubtitle()}
          </Text>
        </View>
      </View>
      
      {verificationStatus === VERIFICATION_STATUS.IN_PROGRESS && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${verificationProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{verificationProgress}%</Text>
        </View>
      )}
      
      {verificationStatus === VERIFICATION_STATUS.REJECTED && (
        <TouchableOpacity 
          style={styles.fixIssuesButton}
          onPress={() => {
            const rejectedDocs = Object.values(documents).filter(
              doc => doc.status === DOCUMENT_STATUS.REJECTED
            );
            if (rejectedDocs.length > 0) {
              Alert.alert(
                'Issues to Fix',
                rejectedDocs.map(doc => `• ${doc.title}: ${doc.rejectionReason || 'Requires attention'}`).join('\n'),
                [{ text: 'OK' }]
              );
            }
          }}
        >
          <MaterialIcon name="error" size={16} color="#EF4444" />
          <Text style={styles.fixIssuesText}>View Issues</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const getVerificationStatusColor = () => {
    switch (verificationStatus) {
      case VERIFICATION_STATUS.VERIFIED:
        return '#22C55E';
      case VERIFICATION_STATUS.IN_PROGRESS:
        return '#F59E0B';
      case VERIFICATION_STATUS.REJECTED:
        return '#EF4444';
      case VERIFICATION_STATUS.SUSPENDED:
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getVerificationStatusIcon = () => {
    switch (verificationStatus) {
      case VERIFICATION_STATUS.VERIFIED:
        return 'verified';
      case VERIFICATION_STATUS.IN_PROGRESS:
        return 'hourglass-empty';
      case VERIFICATION_STATUS.REJECTED:
        return 'error';
      case VERIFICATION_STATUS.SUSPENDED:
        return 'pause-circle-filled';
      default:
        return 'hourglass-empty';
    }
  };

  const getVerificationStatusTitle = () => {
    switch (verificationStatus) {
      case VERIFICATION_STATUS.VERIFIED:
        return 'Fully Verified';
      case VERIFICATION_STATUS.IN_PROGRESS:
        return 'Verification in Progress';
      case VERIFICATION_STATUS.REJECTED:
        return 'Verification Failed';
      case VERIFICATION_STATUS.SUSPENDED:
        return 'Verification Suspended';
      default:
        return 'Start Verification';
    }
  };

  const getVerificationStatusSubtitle = () => {
    switch (verificationStatus) {
      case VERIFICATION_STATUS.VERIFIED:
        return 'All documents approved ✅';
      case VERIFICATION_STATUS.IN_PROGRESS:
        return `${verificationProgress}% complete • ${uploadQueue.length} pending`;
      case VERIFICATION_STATUS.REJECTED:
        return 'Some documents require attention';
      case VERIFICATION_STATUS.SUSPENDED:
        return 'Account under review';
      default:
        return 'Upload required documents to start';
    }
  };

  const renderDocumentCard = (docType) => {
    const document = documents[docType.id];
    const statusColor = getStatusColor(document?.status);
    const statusText = getStatusText(document?.status);
    const hasFile = document?.file;
    const isUploading = document?.status === DOCUMENT_STATUS.UPLOADING;

    return (
      <Animated.View
        key={docType.id}
        style={[
          styles.documentCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <TouchableOpacity
          onPress={() => handleViewDocument(document)}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <View style={styles.documentHeader}>
            <View style={[styles.documentIcon, { backgroundColor: `${statusColor}15` }]}>
              <Icon 
                name={docType.icon} 
                size={24} 
                color={statusColor} 
              />
              {isUploading && (
                <View style={styles.uploadingIndicator}>
                  <ActivityIndicator size="small" color={statusColor} />
                </View>
              )}
            </View>
            
            <View style={styles.documentInfo}>
              <View style={styles.documentTitleRow}>
                <Text style={styles.documentTitle}>{docType.title}</Text>
                {docType.required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>Required</Text>
                  </View>
                )}
              </View>
              <Text style={styles.documentDescription}>{docType.description}</Text>
              
              {hasFile && (
                <View style={styles.documentMeta}>
                  <Text style={styles.documentMetaText}>
                    {document.file.name || 'Document'}
                  </Text>
                  <Text style={styles.documentMetaText}>
                    {formatFileSize(document.file.size)}
                  </Text>
                  {document.uploadedAt && (
                    <Text style={styles.documentMetaText}>
                      {formatDate(document.uploadedAt)}
                    </Text>
                  )}
                </View>
              )}
              
              {document?.rejectionReason && (
                <Text style={styles.rejectionReason} numberOfLines={2}>
                  {document.rejectionReason}
                </Text>
              )}
              
              {document?.expiresAt && document.status === DOCUMENT_STATUS.APPROVED && (
                <View style={styles.expiryContainer}>
                  <MaterialIcon name="warning" size={12} color="#F59E0B" />
                  <Text style={styles.expiryText}>
                    Expires: {formatDate(document.expiresAt)}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.documentStatus}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
              
              {isUploading && document.uploadProgress > 0 && (
                <Text style={styles.progressPercentage}>
                  {document.uploadProgress}%
                </Text>
              )}
              
              <MaterialIcon 
                name="chevron-right" 
                size={20} 
                color="#9CA3AF" 
                style={styles.chevronIcon}
              />
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.documentActions}>
          {(!hasFile || document.status === DOCUMENT_STATUS.REJECTED || document.status === DOCUMENT_STATUS.EXPIRED) ? (
            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              onPress={() => handleUploadDocument(docType)}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcon name="cloud-upload" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.uploadButtonText}>
                {document.status === DOCUMENT_STATUS.REJECTED ? 'Re-upload' : 
                 document.status === DOCUMENT_STATUS.EXPIRED ? 'Renew' : 
                 'Upload'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewDocument(document)}
            >
              <MaterialIcon name="visibility" size={20} color="#3B82F6" />
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderDocumentSection = (title, subtitle, filterFn) => {
    const filteredDocs = Object.values(DOCUMENT_TYPES).filter(filterFn);
    
    if (filteredDocs.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
          </View>
          <Text style={styles.sectionCount}>
            {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
          </Text>
        </View>
        {filteredDocs.map(renderDocumentCard)}
      </View>
    );
  };

  const renderExpiryModal = () => (
    <Modal
      visible={showExpiryModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowExpiryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialIcon name="warning" size={24} color="#F59E0B" />
            <Text style={styles.modalTitle}>Document Expiry Alert</Text>
            <TouchableOpacity onPress={() => setShowExpiryModal(false)}>
              <MaterialIcon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalText}>
              The following documents will expire soon:
            </Text>
            
            {expiringDocuments.map((doc, index) => (
              <View key={index} style={styles.expiryItem}>
                <Icon 
                  name={doc.icon} 
                  size={20} 
                  color="#F59E0B" 
                />
                <View style={styles.expiryItemInfo}>
                  <Text style={styles.expiryItemTitle}>{doc.title}</Text>
                  <Text style={styles.expiryItemDate}>
                    Expires in {doc.daysUntilExpiry} day{doc.daysUntilExpiry !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.renewButton}
                  onPress={() => {
                    setShowExpiryModal(false);
                    handleUploadDocument(doc);
                  }}
                >
                  <Text style={styles.renewButtonText}>Renew</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            <Text style={styles.modalNote}>
              Renew documents before expiry to avoid service interruption.
            </Text>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.modalDismissButton}
              onPress={() => setShowExpiryModal(false)}
            >
              <Text style={styles.modalDismissText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalActionButton}
              onPress={() => {
                setShowExpiryModal(false);
                // Scroll to expiring documents
              }}
            >
              <Text style={styles.modalActionText}>View All</Text>
            </TouchableOpacity>
          </View>
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
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={refreshData}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <MaterialIcon name="refresh" size={24} color="#000000" />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('DriverSupport', { screen: 'Documents' })}
          >
            <MaterialIcon name="help-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        {/* Connection Status */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <MaterialIcon name="wifi-off" size={16} color="#FFFFFF" />
            <Text style={styles.offlineText}>
              Offline mode • {uploadQueue.length} document(s) queued
            </Text>
          </View>
        )}

        {/* Verification Status */}
        {renderVerificationStatus()}

        {/* Required Documents */}
        {renderDocumentSection(
          'Required Documents',
          'Upload these to start driving',
          doc => doc.required
        )}

        {/* Optional Documents */}
        {renderDocumentSection(
          'Optional Documents',
          'Increase your verification score',
          doc => !doc.required
        )}

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <MaterialIcon name="queue" size={20} color="#3B82F6" />
              <Text style={styles.queueTitle}>Upload Queue</Text>
              <Text style={styles.queueCount}>{uploadQueue.length}</Text>
            </View>
            {uploadQueue.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.queueItem}>
                <MaterialCommunityIcon 
                  name={DOCUMENT_TYPES[item.documentId]?.icon || 'file'} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={styles.queueItemText} numberOfLines={1}>
                  {DOCUMENT_TYPES[item.documentId]?.title || item.documentId}
                </Text>
                <View style={[
                  styles.queueStatus,
                  { backgroundColor: item.status === 'failed' ? '#FEE2E2' : '#DBEAFE' }
                ]}>
                  <Text style={[
                    styles.queueStatusText,
                    { color: item.status === 'failed' ? '#DC2626' : '#1D4ED8' }
                  ]}>
                    {item.status === 'failed' ? 'Failed' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
            {uploadQueue.length > 3 && (
              <Text style={styles.queueMore}>
                +{uploadQueue.length - 3} more in queue
              </Text>
            )}
            {isOnline && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={processUploadQueue}
                disabled={uploading}
              >
                <MaterialIcon 
                  name={uploading ? "hourglass-empty" : "cloud-upload"} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.retryButtonText}>
                  {uploading ? 'Uploading...' : 'Retry Uploads'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Upload Tips */}
        <View style={styles.tipsCard}>
          <MaterialIcon name="lightbulb" size={24} color="#F59E0B" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Upload Tips</Text>
            <Text style={styles.tipsText}>
              • Use good lighting and avoid glare{'\n'}
              • Ensure documents are fully visible{'\n'}
              • Keep file size under 5MB{'\n'}
              • Accepted formats: JPG, PNG, PDF{'\n'}
              • Check expiry dates regularly
            </Text>
          </View>
        </View>

        {/* Support Card */}
        <TouchableOpacity 
          style={styles.supportCard}
          onPress={() => navigation.navigate('DriverSupport', { screen: 'Documents' })}
        >
          <MaterialIcon name="support-agent" size={24} color="#3B82F6" />
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              Contact verification team for document assistance
            </Text>
          </View>
          <MaterialIcon name="chevron-right" size={24} color="#6B7280" />
        </TouchableOpacity>
      </ScrollView>

      {/* Scanner Modal */}
      <Modal
        visible={showScannerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScannerModal(false)}
      >
        <View style={styles.scannerContainer}>
          {currentDocument && (
            <DocumentScanner
              documentType={currentDocument}
              onScanComplete={(scannedDocument) => {
                processDocumentUpload(currentDocument, scannedDocument);
                setShowScannerModal(false);
              }}
              onClose={() => setShowScannerModal(false)}
            />
          )}
        </View>
      </Modal>

      {/* Camera Modal */}
      <Modal
        visible={showCameraModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.scannerContainer}>
          {currentDocument && (
            <CameraView
              documentType={currentDocument}
              onCapture={(image) => {
                processDocumentUpload(currentDocument, image);
                setShowCameraModal(false);
              }}
              onClose={() => setShowCameraModal(false)}
            />
          )}
        </View>
      </Modal>

      {/* Expiry Modal */}
      {renderExpiryModal()}

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.uploadingText}>Uploading documents...</Text>
            <Text style={styles.uploadingSubtext}>
              {uploadQueue.length} remaining
            </Text>
          </View>
        </View>
      )}
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
    marginLeft: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    minWidth: 40,
  },
  fixIssuesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    gap: 6,
  },
  fixIssuesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  uploadingIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  documentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  documentMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 4,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  documentStatus: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  chevronIcon: {
    marginTop: 4,
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  queueCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  queueItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  queueStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  queueStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  queueMore: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  supportContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginHorizontal: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  expiryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  expiryItemInfo: {
    flex: 1,
  },
  expiryItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  expiryItemDate: {
    fontSize: 12,
    color: '#B45309',
  },
  renewButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  renewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalNote: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalDismissButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  modalDismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalActionButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    marginLeft: 8,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
  },
  uploadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});