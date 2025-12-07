import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, Image, Platform, PermissionsAndroid 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { getUserData, saveUserData } from '../../src/utils/userStorage'; // ✅ ADDED saveUserData

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

  const handleInputChange = (field, value) => {
    setVerificationData(prev => ({
      ...prev,
      [field]: value
    }));
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
    return true; // iOS handles permissions differently
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

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
        Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
      } else if (response.assets && response.assets[0]) {
        const image = response.assets[0];
        setDocuments(prev => ({
          ...prev,
          [documentType]: {
            uri: image.uri,
            fileName: image.fileName || `document_${documentType}.jpg`,
            type: image.type,
            fileSize: image.fileSize,
          }
        }));
        Alert.alert('Success', 'Photo taken successfully!');
      }
    });
  };

  const chooseFromGallery = (documentType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('Image Picker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to select image. Please try again.');
      } else if (response.assets && response.assets[0]) {
        const image = response.assets[0];
        setDocuments(prev => ({
          ...prev,
          [documentType]: {
            uri: image.uri,
            fileName: image.fileName || `document_${documentType}.jpg`,
            type: image.type,
            fileSize: image.fileSize,
          }
        }));
        Alert.alert('Success', 'Image selected successfully!');
      }
    });
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

    return true;
  };

  // ✅ FIXED: Updated submit function to save verification data
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
            acc[key] = documents[key].uri;
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
          isVerified: false, // Still pending verification
          verificationStatus: 'pending'
        }
      };

      // Save to storage
      await saveUserData(updatedData);

      // Show success message
      Alert.alert(
        'Verification Submitted Successfully!',
        'Your documents are under review. This usually takes 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to VerificationPending screen
              navigation.navigate('VerificationPending');
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

  const DocumentUpload = ({ title, documentType, required = true }) => (
    <View style={styles.documentSection}>
      <Text style={styles.documentTitle}>
        {title} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity 
        style={styles.uploadButton}
        onPress={() => showImageOptions(documentType)}
      >
        {documents[documentType] ? (
          <View style={styles.uploadedContainer}>
            <Image 
              source={{ uri: documents[documentType].uri }} 
              style={styles.previewImage}
            />
            <View style={styles.uploadedInfo}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.uploadedText}>Document Uploaded</Text>
              <Text style={styles.fileName}>
                {documents[documentType].fileName || 'document.jpg'}
              </Text>
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Driver Verification</Text>
      <Text style={styles.subHeader}>
        Complete your profile to start driving with Kabaza
      </Text>

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
          loading && styles.submitButtonDisabled
        ]}
        onPress={submitVerification}
        disabled={loading}
      >
        {loading ? (
          <Text style={styles.submitButtonText}>Submitting...</Text>
        ) : (
          <>
            <Icon name="paper-plane" size={20} color="#fff" style={{marginRight: 10}} />
            <Text style={styles.submitButtonText}>Submit Verification</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        * Required fields. Your information will be verified within 24-48 hours.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
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
  documentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  required: {
    color: 'red',
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
  uploadedText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  fileName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#00B894',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
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
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
    lineHeight: 16,
  },
});