// screens/driver/DriverVerificationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  Modal,
  Animated,
  Easing
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

// FIXED IMPORTS:
import { getUserData, saveUserData } from '@src/utils/userStorage';
import socketService from '@services/socket/socketService';

export default function DriverVerificationScreen({ navigation, route }) {
  const { userProfile } = route.params || {};
  
  const [verificationData, setVerificationData] = useState({
    licenseNumber: '',
    licenseExpiry: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleYear: '',
    insuranceNumber: '',
    insuranceExpiry: '',
    nationalIdNumber: '',
    idType: 'national_id',
  });

  const [documents, setDocuments] = useState({
    licenseFront: null,
    licenseBack: null,
    vehicleFront: null,
    vehicleBack: null,
    insuranceDoc: null,
    nationalIdFront: null,
    nationalIdBack: null,
    passportPhoto: null,
  });

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [verificationStatus, setVerificationStatus] = useState('not_submitted'); // not_submitted, pending, reviewing, approved, rejected
  const [liveSupportConnected, setLiveSupportConnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // saved, saving, unsaved
  const [documentValidation, setDocumentValidation] = useState({});
  
  const autoSaveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    
    // Load existing verification data
    loadExistingVerification();
    
    // Setup auto-save
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      cleanupSocket();
    };
  }, []);

  const initializeSocket = async () => {
    try {
      // Check if socket service is already initialized
      if (!socketService.isConnected?.()) {
        await socketService.initialize();
      }
      
      // Listen for verification status updates
      socketService.on('verification_status_update', handleVerificationStatusUpdate);
      
      // Listen for document validation results
      socketService.on('document_validation_result', handleDocumentValidation);
      
      // Listen for support messages
      socketService.on('support_message', handleSupportMessage);
      
      // Listen for connection status
      socketService.on('connection_change', (data) => {
        setSocketStatus(data.status);
        if (data.status === 'connected') {
          setLiveSupportConnected(true);
        }
      });
      
      // Emit that driver is on verification screen
      socketService.emit('driver_verification_screen', {
        screen: 'verification',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  const cleanupSocket = () => {
    socketService.off('verification_status_update', handleVerificationStatusUpdate);
    socketService.off('document_validation_result', handleDocumentValidation);
    socketService.off('support_message', handleSupportMessage);
  };

  const handleVerificationStatusUpdate = (data) => {
    console.log('Verification status update:', data);
    setVerificationStatus(data.status);
    
    // Show notification for status change
    if (data.status === 'approved') {
      Alert.alert(
        '🎉 Verification Approved!',
        'Your driver verification has been approved! You can now start accepting rides.',
        [{ text: 'Start Driving', onPress: () => navigation.navigate('DriverDashboard') }]
      );
    } else if (data.status === 'rejected') {
      Alert.alert(
        'Verification Rejected',
        `Your verification was rejected. Reason: ${data.reason || 'Please check your documents'}`,
        [{ text: 'Fix Issues', onPress: () => showRejectionDetails(data) }]
      );
    }
  };

  const handleDocumentValidation = (validationData) => {
    console.log('Document validation result:', validationData);
    setDocumentValidation(prev => ({
      ...prev,
      [validationData.documentType]: validationData
    }));
    
    // Show validation result
    if (validationData.status === 'invalid') {
      Alert.alert(
        'Document Issue',
        `${validationData.documentType}: ${validationData.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSupportMessage = (message) => {
    Alert.alert(
      'Support Message',
      message.text,
      [
        { text: 'Dismiss' },
        { text: 'Reply', onPress: () => openSupportChat(message.supportId) }
      ]
    );
  };

  const loadExistingVerification = async () => {
    try {
      const userData = await getUserData();
      if (userData?.driverProfile?.verificationData) {
        setVerificationData(userData.driverProfile.verificationData);
        setVerificationStatus(userData.driverProfile.verificationStatus || 'not_submitted');
        setDocuments(userData.driverProfile.documents || {});
      }
    } catch (error) {
      console.error('Error loading verification:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setVerificationData(prev => ({
      ...prev,
      [field]: value
    }));
    triggerAutoSave();
    
    // Real-time validation for certain fields
    if (field === 'vehiclePlate') {
      validatePlateNumber(value.toUpperCase());
    }
    if (field === 'licenseNumber') {
      validateLicenseNumber(value);
    }
  };

  const triggerAutoSave = () => {
    setAutoSaveStatus('unsaved');
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for 3 seconds
    autoSaveTimeoutRef.current = setTimeout(async () => {
      await autoSaveData();
    }, 3000);
  };

  const autoSaveData = async () => {
    try {
      setAutoSaveStatus('saving');
      
      const userData = await getUserData();
      const updatedData = {
        ...userData,
        driverProfile: {
          ...userData?.driverProfile,
          verificationData: verificationData,
          documents: documents,
          lastAutoSave: new Date().toISOString()
        }
      };
      
      await saveUserData(updatedData);
      
      // Send to server for backup if online
      if (socketStatus === 'connected') {
        socketService.emit('auto_save_verification', {
          verificationData: verificationData,
          timestamp: new Date().toISOString()
        });
      }
      
      setAutoSaveStatus('saved');
      lastSavedRef.current = new Date().toISOString();
      
      // Animate save indicator
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
      
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
    }
  };

  const validatePlateNumber = async (plateNumber) => {
    const plateRegex = /^[A-Z]{2}\s?\d{1,4}$/;
    const isValid = plateRegex.test(plateNumber.replace(/\s/g, ''));
    
    if (isValid && socketStatus === 'connected') {
      // Check if plate is already registered
      socketService.emit('validate_plate_number', {
        plateNumber: plateNumber,
        timestamp: new Date().toISOString()
      });
    }
  };

  const validateLicenseNumber = async (licenseNumber) => {
    if (licenseNumber.length >= 5 && socketStatus === 'connected') {
      socketService.emit('validate_license_number', {
        licenseNumber: licenseNumber,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Request camera permission for Android
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Kabaza Camera Permission',
            message: 'Kabaza needs access to your camera to take document photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true;
  };

  const takePhoto = async (documentType) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: true,
      cameraType: 'back',
    };

    launchCamera(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
        Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
      } else if (response.assets && response.assets[0]) {
        const image = response.assets[0];
        const document = {
          uri: image.uri,
          fileName: image.fileName || `document_${documentType}.jpg`,
          type: image.type,
          fileSize: image.fileSize,
          uploaded: false,
          uploadProgress: 0,
        };
        
        setDocuments(prev => ({
          ...prev,
          [documentType]: document
        }));
        
        // Start upload
        await uploadDocument(documentType, document);
      }
    });
  };

  const chooseFromGallery = async (documentType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('Image Picker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to select image. Please try again.');
      } else if (response.assets && response.assets[0]) {
        const image = response.assets[0];
        const document = {
          uri: image.uri,
          fileName: image.fileName || `document_${documentType}.jpg`,
          type: image.type,
          fileSize: image.fileSize,
          uploaded: false,
          uploadProgress: 0,
        };
        
        setDocuments(prev => ({
          ...prev,
          [documentType]: document
        }));
        
        // Start upload
        await uploadDocument(documentType, document);
      }
    });
  };

  const uploadDocument = async (documentType, document) => {
    try {
      // Update progress
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: { progress: 10, status: 'uploading' }
      }));
      
      // Create FormData
      const formData = new FormData();
      formData.append('document', {
        uri: document.uri,
        type: document.type,
        name: document.fileName,
      });
      formData.append('documentType', documentType);
      formData.append('userId', (await getUserData())?.id);
      
      // Upload to server
      const response = await axios.post(
        'YOUR_API_URL/api/upload/document',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({
              ...prev,
              [documentType]: { progress, status: 'uploading' }
            }));
          },
        }
      );
      
      // Update document with server response
      const uploadedDocument = {
        ...document,
        uploaded: true,
        serverUrl: response.data.url,
        documentId: response.data.documentId,
      };
      
      setDocuments(prev => ({
        ...prev,
        [documentType]: uploadedDocument
      }));
      
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: { progress: 100, status: 'uploaded' }
      }));
      
      // Trigger validation on server
      if (socketStatus === 'connected') {
        socketService.emit('document_uploaded', {
          documentType: documentType,
          documentId: response.data.documentId,
          metadata: {
            fileName: document.fileName,
            fileSize: document.fileSize,
            type: document.type,
          }
        });
      }
      
      Alert.alert('Success', 'Document uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [documentType]: { progress: 0, status: 'error' }
      }));
      Alert.alert('Upload Failed', 'Failed to upload document. Please try again.');
    }
  };

  const showImageOptions = (documentType) => {
    Alert.alert(
      'Upload Document',
      'Choose an option:',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(documentType),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => chooseFromGallery(documentType),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const validateData = () => {
    // License validation
    if (!verificationData.licenseNumber || verificationData.licenseNumber.length < 5) {
      Alert.alert('Invalid License', 'Please enter a valid license number');
      return false;
    }

    // National ID/Passport validation
    if (!verificationData.nationalIdNumber || verificationData.nationalIdNumber.length < 5) {
      Alert.alert('Invalid ID', 'Please enter a valid National ID or Passport number');
      return false;
    }

    // Vehicle plate validation (Malawi format: AB 1234)
    const plateRegex = /^[A-Z]{2}\s?\d{1,4}$/;
    if (!plateRegex.test(verificationData.vehiclePlate.replace(/\s/g, ''))) {
      Alert.alert('Invalid Plate', 'Please enter a valid vehicle plate (e.g., BL 1234)');
      return false;
    }

    // Check required documents
    if (!documents.licenseFront || !documents.vehicleFront) {
      Alert.alert('Missing Documents', 'Please upload required documents (License Front and Vehicle Front)');
      return false;
    }

    // Check ID documents based on selected type
    if (verificationData.idType === 'national_id') {
      if (!documents.nationalIdFront) {
        Alert.alert('Missing Documents', 'Please upload National ID Front photo');
        return false;
      }
    } else {
      if (!documents.passportPhoto) {
        Alert.alert('Missing Documents', 'Please upload Passport photo');
        return false;
      }
    }

    // Check if documents are uploaded
    const requiredDocs = verificationData.idType === 'national_id' 
      ? ['licenseFront', 'vehicleFront', 'nationalIdFront']
      : ['licenseFront', 'vehicleFront', 'passportPhoto'];
    
    for (const docType of requiredDocs) {
      if (documents[docType] && !documents[docType].uploaded) {
        Alert.alert('Document Not Uploaded', `Please wait for ${docType} to finish uploading`);
        return false;
      }
    }

    return true;
  };

  const submitVerification = async () => {
    if (!validateData()) return;

    setLoading(true);

    try {
      // Get current user data
      const userData = await getUserData();
      
      // Create verification data object
      const verificationDataToSave = {
        ...verificationData,
        documents: Object.keys(documents).reduce((acc, key) => {
          if (documents[key]) {
            acc[key] = {
              uri: documents[key].uri,
              serverUrl: documents[key].serverUrl,
              documentId: documents[key].documentId,
              uploaded: documents[key].uploaded,
            };
          }
          return acc;
        }, {}),
        submittedAt: new Date().toISOString(),
        verificationStatus: 'pending'
      };

      // Update user data with verification info
      const updatedData = {
        ...userData,
        driverProfile: {
          ...userData?.driverProfile,
          ...verificationDataToSave,
          isVerified: false,
          verificationStatus: 'pending'
        }
      };

      // Save to storage
      await saveUserData(updatedData);

      // Submit to server via socket
      if (socketStatus === 'connected') {
        socketService.emit('submit_verification', {
          verificationData: verificationDataToSave,
          timestamp: new Date().toISOString()
        });
      }

      // Show success message
      Alert.alert(
        '✅ Verification Submitted Successfully!',
        'Your documents are under review. This usually takes 24-48 hours. You\'ll receive real-time updates on the status.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to VerificationPending screen with real-time updates
              navigation.navigate('VerificationPending', {
                verificationId: Date.now().toString(),
                submittedAt: new Date().toISOString()
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openSupportChat = () => {
    if (socketStatus === 'connected') {
      navigation.navigate('VerificationSupportChat', {
        verificationData: verificationData,
        documents: documents
      });
    } else {
      Alert.alert('Offline', 'Please connect to internet for live support');
    }
  };

  const showRejectionDetails = (rejectionData) => {
    Alert.alert(
      'Rejection Details',
      `Reason: ${rejectionData.reason}\n\nIssues:\n${rejectionData.issues?.join('\n• ') || 'None specified'}`,
      [
        { text: 'OK' },
        { text: 'Contact Support', onPress: openSupportChat }
      ]
    );
  };

  const DocumentUpload = ({ title, documentType, required = true }) => {
    const document = documents[documentType];
    const progress = uploadProgress[documentType];
    const validation = documentValidation[documentType];
    
    return (
      <View style={styles.documentSection}>
        <View style={styles.documentHeader}>
          <Text style={styles.documentTitle}>
            {title} {required && <Text style={styles.required}>*</Text>}
          </Text>
          {validation && (
            <View style={[
              styles.validationBadge,
              validation.status === 'valid' ? styles.validationValid : styles.validationInvalid
            ]}>
              <Icon 
                name={validation.status === 'valid' ? 'check' : 'exclamation-triangle'} 
                size={12} 
                color="#fff" 
              />
              <Text style={styles.validationText}>
                {validation.status === 'valid' ? 'Valid' : 'Check'}
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.uploadButton,
            document?.uploaded && styles.uploadedButton,
            validation?.status === 'invalid' && styles.invalidButton
          ]}
          onPress={() => showImageOptions(documentType)}
          disabled={progress?.status === 'uploading'}
        >
          {progress?.status === 'uploading' ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#00B894" />
              <Text style={styles.uploadingText}>
                Uploading... {progress.progress}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${progress.progress}%` }]} 
                />
              </View>
            </View>
          ) : document ? (
            <View style={styles.uploadedContainer}>
              <Image 
                source={{ uri: document.uri }} 
                style={styles.previewImage}
              />
              <View style={styles.uploadedInfo}>
                <View style={styles.uploadedStatus}>
                  <Icon 
                    name={document.uploaded ? "cloud" : "cloud-upload-alt"} 
                    size={20} 
                    color={document.uploaded ? "#4CAF50" : "#FF9800"} 
                  />
                  <Text style={styles.uploadedText}>
                    {document.uploaded ? 'Uploaded to Cloud' : 'Ready to Upload'}
                  </Text>
                </View>
                <Text style={styles.fileName}>
                  {document.fileName || 'document.jpg'}
                </Text>
                {!document.uploaded && (
                  <Text style={styles.uploadPendingText}>
                    Tap to upload to server
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Icon name="cloud-upload" size={32} color="#666" />
              <Text style={styles.uploadText}>Tap to Upload</Text>
              <Text style={styles.uploadSubtext}>Take photo or choose from gallery</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Real-time Status Bar */}
      <View style={[
        styles.statusBar,
        socketStatus === 'connected' ? styles.statusConnected : styles.statusDisconnected
      ]}>
        <View style={styles.statusContent}>
          <Icon 
            name={socketStatus === 'connected' ? "wifi" : "wifi"} 
            size={14} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {socketStatus === 'connected' 
              ? "Connected • Auto-save enabled" 
              : "Offline • Changes saved locally"}
          </Text>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.autoSaveText}>
              {autoSaveStatus === 'saving' ? 'Saving...' : 
               autoSaveStatus === 'saved' ? 'Saved' : 
               autoSaveStatus === 'unsaved' ? 'Unsaved' : 'Error'}
            </Text>
          </Animated.View>
        </View>
        
        {verificationStatus !== 'not_submitted' && (
          <View style={[
            styles.verificationBadge,
            verificationStatus === 'approved' ? styles.badgeApproved :
            verificationStatus === 'rejected' ? styles.badgeRejected :
            verificationStatus === 'pending' ? styles.badgePending :
            styles.badgeReviewing
          ]}>
            <Text style={styles.badgeText}>
              {verificationStatus.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Driver Verification</Text>
        <Text style={styles.subHeader}>
          Complete your profile to start driving with Kabaza
        </Text>

        {/* Live Support Button */}
        {socketStatus === 'connected' && (
          <TouchableOpacity style={styles.supportButton} onPress={openSupportChat}>
            <Icon name="headphones" size={16} color="#fff" />
            <Text style={styles.supportButtonText}>Live Support Available</Text>
            <View style={styles.liveIndicator} />
          </TouchableOpacity>
        )}

        {/* National ID / Passport Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Verification</Text>
          
          {/* ID Type Selection */}
          <View style={styles.idTypeContainer}>
            <Text style={styles.idTypeLabel}>Select ID Type *</Text>
            <View style={styles.idTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.idTypeButton,
                  verificationData.idType === 'national_id' && styles.idTypeButtonActive
                ]}
                onPress={() => handleInputChange('idType', 'national_id')}
              >
                <Text style={[
                  styles.idTypeButtonText,
                  verificationData.idType === 'national_id' && styles.idTypeButtonTextActive
                ]}>
                  National ID
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.idTypeButton,
                  verificationData.idType === 'passport' && styles.idTypeButtonActive
                ]}
                onPress={() => handleInputChange('idType', 'passport')}
              >
                <Text style={[
                  styles.idTypeButtonText,
                  verificationData.idType === 'passport' && styles.idTypeButtonTextActive
                ]}>
                  Passport
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder={
              verificationData.idType === 'national_id' 
                ? "National ID Number *" 
                : "Passport Number *"
            }
            value={verificationData.nationalIdNumber}
            onChangeText={(text) => handleInputChange('nationalIdNumber', text)}
            placeholderTextColor="#999"
          />

          {verificationData.idType === 'national_id' ? (
            <>
              <DocumentUpload 
                title="National ID Front Photo *" 
                documentType="nationalIdFront" 
                required 
              />
              <DocumentUpload 
                title="National ID Back Photo" 
                documentType="nationalIdBack" 
              />
            </>
          ) : (
            <DocumentUpload 
              title="Passport Photo Page *" 
              documentType="passportPhoto" 
              required 
            />
          )}
        </View>

        {/* License Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver's License</Text>
          
          <TextInput
            style={styles.input}
            placeholder="License Number *"
            value={verificationData.licenseNumber}
            onChangeText={(text) => handleInputChange('licenseNumber', text)}
            placeholderTextColor="#999"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Expiry Date (DD/MM/YYYY)"
            value={verificationData.licenseExpiry}
            onChangeText={(text) => handleInputChange('licenseExpiry', text)}
            placeholderTextColor="#999"
          />

          <DocumentUpload 
            title="License Front Photo *" 
            documentType="licenseFront" 
            required 
          />
          <DocumentUpload 
            title="License Back Photo" 
            documentType="licenseBack" 
          />
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Vehicle Plate Number * (e.g., BL 1234)"
            value={verificationData.vehiclePlate}
            onChangeText={(text) => handleInputChange('vehiclePlate', text.toUpperCase())}
            placeholderTextColor="#999"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Vehicle Model (e.g., Bajaj Boxer)"
            value={verificationData.vehicleModel}
            onChangeText={(text) => handleInputChange('vehicleModel', text)}
            placeholderTextColor="#999"
          />
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Color"
              value={verificationData.vehicleColor}
              onChangeText={(text) => handleInputChange('vehicleColor', text)}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Year"
              value={verificationData.vehicleYear}
              onChangeText={(text) => handleInputChange('vehicleYear', text)}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <DocumentUpload 
            title="Vehicle Front Photo *" 
            documentType="vehicleFront" 
            required 
          />
          <DocumentUpload 
            title="Vehicle Back Photo" 
            documentType="vehicleBack" 
          />
        </View>

        {/* Insurance Information (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insurance Information (Optional)</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Insurance Policy Number"
            value={verificationData.insuranceNumber}
            onChangeText={(text) => handleInputChange('insuranceNumber', text)}
            placeholderTextColor="#999"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Insurance Expiry Date"
            value={verificationData.insuranceExpiry}
            onChangeText={(text) => handleInputChange('insuranceExpiry', text)}
            placeholderTextColor="#999"
          />

          <DocumentUpload 
            title="Insurance Document" 
            documentType="insuranceDoc" 
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled,
            verificationStatus === 'pending' && styles.submitButtonPending
          ]}
          onPress={submitVerification}
          disabled={loading || verificationStatus === 'pending'}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" style={{marginRight: 10}} />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </>
          ) : verificationStatus === 'pending' ? (
            <>
              <Icon name="clock" size={20} color="#fff" style={{marginRight: 10}} />
              <Text style={styles.submitButtonText}>Verification Pending</Text>
            </>
          ) : (
            <>
              <Icon name="paper-plane" size={20} color="#fff" style={{marginRight: 10}} />
              <Text style={styles.submitButtonText}>Submit Verification</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          * Required fields. Your information will be verified within 24-48 hours.
          {lastSavedRef.current && ` Last saved: ${new Date(lastSavedRef.current).toLocaleTimeString()}`}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#F44336',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  autoSaveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  badgeApproved: {
    backgroundColor: '#4CAF50',
  },
  badgeRejected: {
    backgroundColor: '#F44336',
  },
  badgePending: {
    backgroundColor: '#FF9800',
  },
  badgeReviewing: {
    backgroundColor: '#2196F3',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFEB3B',
    marginLeft: 4,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 25,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  idTypeContainer: {
    marginBottom: 15,
  },
  idTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  idTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  idTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  idTypeButtonActive: {
    borderColor: '#00B894',
    backgroundColor: '#E8F8F5',
  },
  idTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  idTypeButtonTextActive: {
    color: '#00B894',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  documentSection: {
    marginBottom: 20,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  required: {
    color: 'red',
  },
  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  validationValid: {
    backgroundColor: '#4CAF50',
  },
  validationInvalid: {
    backgroundColor: '#F44336',
  },
  validationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    minHeight: 120,
  },
  uploadedButton: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
    backgroundColor: '#E8F5E8',
  },
  invalidButton: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  uploadingText: {
    marginTop: 10,
    color: '#00B894',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 2,
  },
  uploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  uploadedInfo: {
    flex: 1,
  },
  uploadedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  uploadedText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  fileName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  uploadPendingText: {
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#00B894',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonPending: {
    backgroundColor: '#FF9800',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginBottom: 30,
    marginHorizontal: 20,
    lineHeight: 16,
  },
});