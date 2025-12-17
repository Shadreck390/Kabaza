// screens/driver/AddVehicleScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Platform, ActivityIndicator,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIXED IMPORTS:
import { addVehicle, updateVehicle } from '@store/slices/driverSlice';
import RealTimeService from '@services/realtime/RealTimeService';
import socketService from '@services/socket/socketService';
import DocumentService from '@services/document/DocumentService';

export default function AddVehicleScreen({ navigation, route }) {
  const existingVehicle = route.params?.vehicle || null;
  const isEditing = !!existingVehicle;
  
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const driver = useSelector(state => state.driver.currentDriver);
  
  // Vehicle types common in Malawi
  const vehicleTypes = [
    { label: 'Motorcycle (Kabaza)', value: 'motorcycle' },
    { label: 'Car (Taxi)', value: 'car' },
    { label: 'Minibus', value: 'minibus' },
    { label: 'Bicycle', value: 'bicycle' },
  ];

  // Motorcycle makes common in Malawi
  const motorcycleMakes = [
    { label: 'TVS', value: 'TVS' },
    { label: 'Bajaj', value: 'Bajaj' },
    { label: 'Honda', value: 'Honda' },
    { label: 'Yamaha', value: 'Yamaha' },
    { label: 'Suzuki', value: 'Suzuki' },
    { label: 'Hero', value: 'Hero' },
    { label: 'Royal Enfield', value: 'Royal Enfield' },
  ];

  // Car makes
  const carMakes = [
    { label: 'Toyota', value: 'Toyota' },
    { label: 'Nissan', value: 'Nissan' },
    { label: 'Honda', value: 'Honda' },
    { label: 'Mazda', value: 'Mazda' },
    { label: 'Ford', value: 'Ford' },
    { label: 'Hyundai', value: 'Hyundai' },
    { label: 'Kia', value: 'Kia' },
  ];

  const [formData, setFormData] = useState({
    vehicleType: existingVehicle?.type || 'motorcycle',
    make: existingVehicle?.make || '',
    model: existingVehicle?.model || '',
    year: existingVehicle?.year || '',
    color: existingVehicle?.color || '',
    plateNumber: existingVehicle?.plate || '',
    engineNumber: existingVehicle?.engineNumber || '',
    chassisNumber: existingVehicle?.chassisNumber || '',
    insuranceExpiry: existingVehicle?.insuranceExpiry || '',
    roadTaxExpiry: existingVehicle?.roadTaxExpiry || '',
  });

  const [vehicleImages, setVehicleImages] = useState({
    front: existingVehicle?.images?.front || null,
    back: existingVehicle?.images?.back || null,
    side: existingVehicle?.images?.side || null,
    registration: existingVehicle?.images?.registration || null,
  });

  const [uploadedDocuments, setUploadedDocuments] = useState({
    driversLicense: existingVehicle?.documents?.driversLicense || null,
    registrationCertificate: existingVehicle?.documents?.registrationCertificate || null,
    insuranceCertificate: existingVehicle?.documents?.insuranceCertificate || null,
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(
    existingVehicle?.verificationStatus || 'pending'
  );
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [verificationNotes, setVerificationNotes] = useState(existingVehicle?.verificationNotes || '');

  // Setup real-time listeners for verification status
  useEffect(() => {
    loadExistingData();
    setupRealTimeListeners();
    
    return () => {
      cleanupRealTimeListeners();
    };
  }, []);

  useEffect(() => {
    const updateConnectionStatus = (isConnected) => {
      setSocketConnected(isConnected);
    };

    socketService.onConnectionChange(updateConnectionStatus);
    return () => socketService.offConnectionChange(updateConnectionStatus);
  }, []);

  const loadExistingData = async () => {
    if (existingVehicle) {
      // Check for real-time verification status updates
      const realTimeStatus = await realTimeService.getVehicleVerificationStatus(existingVehicle.id);
      if (realTimeStatus) {
        setVerificationStatus(realTimeStatus.status);
        setVerificationProgress(realTimeStatus.progress || 0);
        setVerificationNotes(realTimeStatus.notes || '');
      }
    }
    
    // Check socket connection
    const isConnected = await socketService.isConnected();
    setSocketConnected(isConnected);
  };

  const setupRealTimeListeners = () => {
    // Listen for verification status updates
    socketService.on('vehicle:verification:status', (statusData) => {
      if (existingVehicle && statusData.vehicleId === existingVehicle.id) {
        setVerificationStatus(statusData.status);
        setVerificationProgress(statusData.progress || 0);
        setVerificationNotes(statusData.notes || '');
        
        if (statusData.status === 'approved') {
          Alert.alert(
            'Vehicle Approved!',
            'Your vehicle has been approved and is now ready for rides.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else if (statusData.status === 'rejected') {
          Alert.alert(
            'Vehicle Review Required',
            `Your vehicle needs adjustments: ${statusData.notes || 'Please check all details and images.'}`,
            [{ text: 'OK' }]
          );
        }
      }
    });

    // Listen for document upload progress
    socketService.on('document:upload:progress', (progressData) => {
      if (progressData.documentType) {
        setUploadProgress(prev => ({
          ...prev,
          [progressData.documentType]: progressData.progress
        }));
      }
    });

    // Listen for admin messages about vehicle
    socketService.on('vehicle:admin:message', (messageData) => {
      Alert.alert(
        'Admin Message',
        messageData.message,
        [{ text: 'OK', onPress: () => {
          setVerificationNotes(prev => prev + '\n\n' + messageData.message);
        }}]
      );
    });
  };

  const cleanupRealTimeListeners = () => {
    socketService.off('vehicle:verification:status');
    socketService.off('document:upload:progress');
    socketService.off('vehicle:admin:message');
  };

  const getMakesForType = () => {
    if (formData.vehicleType === 'motorcycle') {
      return motorcycleMakes;
    } else if (formData.vehicleType === 'car' || formData.vehicleType === 'minibus') {
      return carMakes;
    }
    return [{ label: 'Other', value: 'Other' }];
  };

  const handleImageSelect = async (imageType) => {
    Alert.alert(
      'Select Image',
      'Choose image source',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Camera', 
          onPress: () => takePhoto(imageType) 
        },
        { 
          text: 'Gallery', 
          onPress: () => pickImage(imageType) 
        },
      ]
    );
  };

  const takePhoto = (imageType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
      saveToPhotos: true,
    };

    launchCamera(options, (response) => {
      handleImageResponse(response, imageType);
    });
  };

  const pickImage = (imageType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      handleImageResponse(response, imageType);
    });
  };

  const handleImageResponse = (response, imageType) => {
    if (response.didCancel) {
      console.log('User cancelled');
    } else if (response.error) {
      Alert.alert('Error', 'Failed to select image');
    } else if (response.assets && response.assets[0]) {
      setVehicleImages(prev => ({
        ...prev,
        [imageType]: response.assets[0]
      }));
      
      // Auto-upload image if socket is connected
      if (socketConnected && existingVehicle) {
        uploadImageToServer(response.assets[0], imageType);
      }
    }
  };

  const uploadImageToServer = async (image, imageType) => {
    try {
      setUploading(true);
      setUploadProgress(prev => ({ ...prev, [imageType]: 10 }));
      
      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: `${imageType}_${Date.now()}.jpg`,
      });
      formData.append('vehicleId', existingVehicle.id);
      formData.append('imageType', imageType);

      const response = await fetch(`${API_URL}/vehicle/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(prev => ({ ...prev, [imageType]: 100 }));
        Alert.alert('Success', 'Image uploaded successfully');
        
        // Notify admin via socket
        socketService.emit('vehicle:image:updated', {
          vehicleId: existingVehicle.id,
          imageType: imageType,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
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

  const handleDocumentUpload = async (documentType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
      includeBase64: false,
    };

    Alert.alert(
      'Upload Document',
      'Choose document source',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Camera', 
          onPress: () => launchCamera(options, (response) => handleDocumentResponse(response, documentType)) 
        },
        { 
          text: 'Gallery', 
          onPress: () => launchImageLibrary(options, (response) => handleDocumentResponse(response, documentType)) 
        },
      ]
    );
  };

  const handleDocumentResponse = async (response, documentType) => {
    if (response.didCancel) return;
    if (response.error) {
      Alert.alert('Error', 'Failed to select document');
      return;
    }
    if (response.assets && response.assets[0]) {
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType]: response.assets[0]
      }));
      
      // Upload document to server
      await uploadDocumentToServer(response.assets[0], documentType);
    }
  };

  const uploadDocumentToServer = async (document, documentType) => {
    try {
      setUploading(true);
      
      // Simulate upload progress via socket
      socketService.emit('document:upload:started', { documentType });
      
      for (let progress = 10; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        socketService.emit('document:upload:progress', { 
          documentType, 
          progress 
        });
      }

      const result = await DocumentService.uploadVehicleDocument(
        document,
        documentType,
        existingVehicle?.id || 'new',
        auth.token
      );

      if (result.success) {
        Alert.alert('Success', `${documentType.replace(/([A-Z])/g, ' $1')} uploaded successfully`);
        
        // Notify admin via socket
        socketService.emit('vehicle:document:uploaded', {
          vehicleId: existingVehicle?.id,
          documentType: documentType,
          timestamp: new Date().toISOString()
        });

        // If all documents uploaded, request verification
        if (areAllDocumentsUploaded()) {
          requestVerification();
        }
      }
    } catch (error) {
      console.error('Document upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const areAllDocumentsUploaded = () => {
    return Object.values(uploadedDocuments).every(doc => doc !== null);
  };

  const requestVerification = async () => {
    if (!areAllDocumentsUploaded()) {
      Alert.alert('Documents Required', 'Please upload all required documents before verification.');
      return;
    }

    setShowVerificationModal(true);
    
    try {
      const result = await realTimeService.requestVehicleVerification(
        existingVehicle?.id,
        Object.keys(uploadedDocuments).filter(key => uploadedDocuments[key])
      );
      
      if (result.success) {
        setVerificationStatus('under_review');
        
        // Notify admin via socket
        socketService.emit('vehicle:verification:requested', {
          vehicleId: existingVehicle?.id,
          driverId: driver?.id,
          timestamp: new Date().toISOString()
        });
        
        Alert.alert(
          'Verification Requested',
          'Your vehicle verification has been submitted. You will be notified once reviewed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Verification request error:', error);
      Alert.alert('Error', 'Failed to request verification');
    }
  };

  const validateForm = () => {
    const requiredFields = ['vehicleType', 'make', 'model', 'year', 'plateNumber'];
    
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        Alert.alert('Missing Information', `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(formData.year);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > currentYear + 1) {
      Alert.alert('Invalid Year', 'Please enter a valid year between 1990 and ' + (currentYear + 1));
      return false;
    }

    // Validate plate number format (Malawi format: LL 1234 or LL 1234 A)
    const plateRegex = /^[A-Z]{2}\s?\d{4}(\s?[A-Z])?$/;
    if (!plateRegex.test(formData.plateNumber.toUpperCase())) {
      Alert.alert(
        'Invalid Plate Number',
        'Plate number should be in format: LL 1234 or LL 1234 A\nExample: LL 1234, KA 5678 B'
      );
      return false;
    }

    // Check for at least one vehicle image
    const hasImages = Object.values(vehicleImages).some(img => img !== null);
    if (!hasImages) {
      Alert.alert('Images Required', 'Please add at least one photo of your vehicle');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const vehicleData = {
        ...formData,
        id: existingVehicle?.id || `vehicle_${Date.now()}`,
        driverId: driver?.id,
        images: vehicleImages,
        documents: uploadedDocuments,
        status: 'pending',
        verificationStatus: 'pending',
        addedDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        socketConnected: socketConnected,
      };

      // Save to Redux store
      if (isEditing) {
        dispatch(updateVehicle(vehicleData));
      } else {
        dispatch(addVehicle(vehicleData));
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(`vehicle_${vehicleData.id}`, JSON.stringify(vehicleData));

      // Send to server via real-time service
      const result = await realTimeService.saveVehicle(vehicleData);
      
      if (result.success) {
        // Emit socket event for real-time updates
        socketService.emit('vehicle:added', {
          ...vehicleData,
          driverName: driver?.name,
          driverPhone: driver?.phone,
        });

        Alert.alert(
          isEditing ? 'Vehicle Updated' : 'Vehicle Added',
          `Your ${formData.make} ${formData.model} has been ${isEditing ? 'updated' : 'added successfully'}.\n\nReal-time verification will begin shortly.`,
          [
            { 
              text: 'Upload Documents', 
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
      } else {
        Alert.alert('Error', 'Failed to save vehicle. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save vehicle');
    } finally {
      setLoading(false);
    }
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

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'under_review': return 'Under Review';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const renderImageButton = (label, imageType, icon) => {
    const progress = uploadProgress[imageType];
    
    return (
      <TouchableOpacity 
        style={styles.imageButton}
        onPress={() => handleImageSelect(imageType)}
        disabled={uploading}
      >
        {vehicleImages[imageType] ? (
          <>
            <Image 
              source={{ uri: vehicleImages[imageType].uri }} 
              style={styles.imagePreview}
            />
            {progress && (
              <View style={styles.progressOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name={icon} size={30} color="#00B894" />
            <Text style={styles.imageButtonText}>{label}</Text>
          </View>
        )}
        <View style={styles.imageOverlay}>
          <Icon name="camera" size={16} color="#fff" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDocumentButton = (label, documentType, icon) => (
    <TouchableOpacity 
      style={[
        styles.documentButton,
        uploadedDocuments[documentType] && styles.documentButtonUploaded
      ]}
      onPress={() => handleDocumentUpload(documentType)}
      disabled={uploading}
    >
      <View style={styles.documentIconContainer}>
        <Icon 
          name={icon} 
          size={24} 
          color={uploadedDocuments[documentType] ? '#fff' : '#00B894'} 
        />
      </View>
      <Text style={[
        styles.documentButtonText,
        uploadedDocuments[documentType] && styles.documentButtonTextUploaded
      ]}>
        {uploadedDocuments[documentType] ? '✓ ' : ''}{label}
      </Text>
      {uploadedDocuments[documentType] ? (
        <Icon name="check-circle" size={16} color="#fff" />
      ) : (
        <Icon name="cloud-upload" size={16} color="#00B894" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Connection Status */}
      <View style={[
        styles.connectionBar,
        { backgroundColor: socketConnected ? '#00B894' : '#FFA726' }
      ]}>
        <Icon 
          name={socketConnected ? 'wifi' : 'wifi-slash'} 
          size={14} 
          color="#fff" 
        />
        <Text style={styles.connectionText}>
          {socketConnected ? 'Real-time verification enabled' : 'Offline - Save locally'}
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Verification Status Banner */}
      {existingVehicle && (
        <View style={[
          styles.verificationBanner,
          { backgroundColor: getStatusColor(verificationStatus) + '20' }
        ]}>
          <View style={styles.verificationStatus}>
            <Icon 
              name={verificationStatus === 'approved' ? 'check-circle' : 
                    verificationStatus === 'rejected' ? 'times-circle' : 
                    'clock-o'} 
              size={18} 
              color={getStatusColor(verificationStatus)} 
            />
            <Text style={[
              styles.verificationStatusText,
              { color: getStatusColor(verificationStatus) }
            ]}>
              Status: {getStatusText(verificationStatus)}
            </Text>
          </View> {/* Changed from </div> to </View> */}
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
            <Text style={styles.verificationNotes}>{verificationNotes}</Text>
          )}
        </View>
      )}

      <Text style={styles.subtitle}>
        {isEditing 
          ? 'Update your vehicle information'
          : 'Add your vehicle details to start driving'
        }
      </Text>

      {/* Vehicle Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Type *</Text>
        <View style={styles.vehicleTypeContainer}>
          {vehicleTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.vehicleTypeButton,
                formData.vehicleType === type.value && styles.vehicleTypeButtonSelected
              ]}
              onPress={() => setFormData({...formData, vehicleType: type.value})}
            >
              <Icon 
                name={type.value === 'motorcycle' ? 'motorcycle' : 
                      type.value === 'car' ? 'car' : 
                      type.value === 'minibus' ? 'bus' : 'bicycle'} 
                size={24} 
                color={formData.vehicleType === type.value ? '#fff' : '#00B894'} 
              />
              <Text style={[
                styles.vehicleTypeText,
                formData.vehicleType === type.value && styles.vehicleTypeTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Vehicle Details Form */}
      <View style={styles.formSection}>
        {/* Make */}
        <View style={styles.inputGroup}>
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

        {/* Model */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model *</Text>
          <TextInput
            style={styles.input}
            value={formData.model}
            onChangeText={(text) => setFormData({...formData, model: text})}
            placeholder={`e.g., ${formData.vehicleType === 'motorcycle' ? 'Apache RTR 160' : 'Corolla'}`}
            editable={!uploading}
          />
        </View>

        {/* Year */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Year *</Text>
          <TextInput
            style={styles.input}
            value={formData.year}
            onChangeText={(text) => setFormData({...formData, year: text})}
            placeholder="e.g., 2022"
            keyboardType="numeric"
            maxLength={4}
            editable={!uploading}
          />
        </View>

        {/* Color */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color</Text>
          <TextInput
            style={styles.input}
            value={formData.color}
            onChangeText={(text) => setFormData({...formData, color: text})}
            placeholder="e.g., Red, Black, White"
            editable={!uploading}
          />
        </View>

        {/* Plate Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Plate Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.plateNumber}
            onChangeText={(text) => setFormData({...formData, plateNumber: text.toUpperCase()})}
            placeholder="e.g., LL 1234"
            autoCapitalize="characters"
            editable={!uploading}
          />
          <Text style={styles.hintText}>Format: LL 1234 or LL 1234 A</Text>
        </View>

        {/* Engine & Chassis Numbers */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Engine No.</Text>
            <TextInput
              style={styles.input}
              value={formData.engineNumber}
              onChangeText={(text) => setFormData({...formData, engineNumber: text})}
              placeholder="Engine number"
              editable={!uploading}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Chassis No.</Text>
            <TextInput
              style={styles.input}
              value={formData.chassisNumber}
              onChangeText={(text) => setFormData({...formData, chassisNumber: text})}
              placeholder="Chassis number"
              editable={!uploading}
            />
          </View>
        </View>

        {/* Expiry Dates */}
        <View style={styles.rowInputs}>
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
      </View>

      {/* Vehicle Images */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Photos *</Text>
        <Text style={styles.sectionSubtitle}>Add clear photos from different angles</Text>
        
        <View style={styles.imagesGrid}>
          {renderImageButton('Front View', 'front', 'car')}
          {renderImageButton('Back View', 'back', 'car')}
          {renderImageButton('Side View', 'side', 'image')}
          {renderImageButton('Registration', 'registration', 'file-text')}
        </View>
      </View>

      {/* Required Documents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Documents *</Text>
        <Text style={styles.sectionSubtitle}>Upload clear photos of documents</Text>
        
        <View style={styles.documentsContainer}>
          {renderDocumentButton('Driver\'s License', 'driversLicense', 'id-card')}
          {renderDocumentButton('Registration Certificate', 'registrationCertificate', 'file-text')}
          {renderDocumentButton('Insurance Certificate', 'insuranceCertificate', 'shield')}
        </View>
      </View>

      {/* Real-time Status */}
      <View style={styles.realTimeInfo}>
        <Icon name="bolt" size={16} color="#FFA726" />
        <Text style={styles.realTimeInfoText}>
          {socketConnected 
            ? 'Real-time verification enabled. You will receive instant status updates.'
            : 'Offline mode. Connect to internet for real-time updates.'
          }
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (loading || uploading) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || uploading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name={isEditing ? 'save' : 'check-circle'} size={20} color="#fff" />
            <Text style={styles.submitButtonText}>
              {uploading ? 'Uploading...' : (isEditing ? 'Update Vehicle' : 'Add Vehicle')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="slide"
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
              <Text style={styles.modalText}>
                To complete your vehicle verification, please ensure:
              </Text>
              
              <View style={styles.requirementList}>
                <View style={styles.requirementItem}>
                  <Icon name="check-circle" size={16} color="#00B894" />
                  <Text style={styles.requirementText}>All vehicle photos uploaded</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Icon name="check-circle" size={16} color="#00B894" />
                  <Text style={styles.requirementText}>All required documents uploaded</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Icon name="check-circle" size={16} color="#00B894" />
                  <Text style={styles.requirementText}>Vehicle details accurate</Text>
                </View>
              </View>
              
              <Text style={styles.modalNote}>
                Verification typically takes 24-48 hours. You will receive real-time notifications when your status changes.
              </Text>
              
              <TouchableOpacity 
                style={[
                  styles.verifyButton,
                  (!areAllDocumentsUploaded() || uploading) && styles.verifyButtonDisabled
                ]}
                onPress={requestVerification}
                disabled={!areAllDocumentsUploaded() || uploading}
              >
                <Icon name="shield" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>
                  {uploading ? 'Uploading...' : 'Request Verification'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 30 },
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
  headerRight: { width: 30 },
  verificationBanner: {
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  verificationStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
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
    fontStyle: 'italic',
    lineHeight: 16,
  },
  subtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  vehicleTypeContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10,
    marginBottom: 10,
  },
  vehicleTypeButton: { 
    flex: 1, 
    minWidth: '45%',
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00B894',
    backgroundColor: '#fff',
  },
  vehicleTypeButtonSelected: { backgroundColor: '#00B894' },
  vehicleTypeText: { fontSize: 14, color: '#00B894', fontWeight: '600', marginTop: 8 },
  vehicleTypeTextSelected: { color: '#fff' },
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
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  pickerIcon: { position: 'absolute', right: 15 },
  hintText: { fontSize: 12, color: '#666', marginTop: 5, fontStyle: 'italic' },
  rowInputs: { flexDirection: 'row', marginBottom: 20 },
  imagesGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10,
    marginBottom: 20,
  },
  imageButton: { 
    width: '48%', 
    height: 120, 
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: { width: '100%', height: '100%' },
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
  imagePlaceholder: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f0f7f0',
    borderWidth: 2,
    borderColor: '#00B894',
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  imageButtonText: { fontSize: 12, color: '#00B894', marginTop: 5, fontWeight: '500' },
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
  documentsContainer: {
    marginBottom: 20,
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
  documentIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  documentButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
    marginLeft: 10,
  },
  documentButtonTextUploaded: {
    color: '#fff',
  },
  realTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  realTimeInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
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
  },
  submitButtonDisabled: { backgroundColor: '#ccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
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
  modalNote: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 18,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});