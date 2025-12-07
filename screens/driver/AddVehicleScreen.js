// screens/driver/AddVehicleScreen.js
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, Image, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import RNPickerSelect from 'react-native-picker-select';

export default function AddVehicleScreen({ navigation, route }) {
  const existingVehicle = route.params?.vehicle || null;
  const isEditing = !!existingVehicle;

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
  ];

  // Car makes
  const carMakes = [
    { label: 'Toyota', value: 'Toyota' },
    { label: 'Nissan', value: 'Nissan' },
    { label: 'Honda', value: 'Honda' },
    { label: 'Mazda', value: 'Mazda' },
    { label: 'Ford', value: 'Ford' },
    { label: 'Hyundai', value: 'Hyundai' },
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

  const [loading, setLoading] = useState(false);

  const getMakesForType = () => {
    if (formData.vehicleType === 'motorcycle') {
      return motorcycleMakes;
    } else if (formData.vehicleType === 'car' || formData.vehicleType === 'minibus') {
      return carMakes;
    }
    return [{ label: 'Other', value: 'Other' }];
  };

  const handleImageSelect = (imageType) => {
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
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.error) {
        Alert.alert('Error', 'Failed to take photo');
      } else if (response.assets && response.assets[0]) {
        setVehicleImages(prev => ({
          ...prev,
          [imageType]: response.assets[0]
        }));
      }
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
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        Alert.alert('Error', 'Failed to select image');
      } else if (response.assets && response.assets[0]) {
        setVehicleImages(prev => ({
          ...prev,
          [imageType]: response.assets[0]
        }));
      }
    });
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

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      
      const vehicleData = {
        ...formData,
        images: vehicleImages,
        id: existingVehicle?.id || Date.now().toString(),
        status: 'pending', // pending, approved, rejected
        addedDate: new Date().toISOString(),
      };

      Alert.alert(
        isEditing ? 'Vehicle Updated' : 'Vehicle Added',
        `Your ${formData.make} ${formData.model} has been ${isEditing ? 'updated' : 'added successfully'}.\nIt will be reviewed within 24 hours.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Pass data back to previous screen
              if (route.params?.onSave) {
                route.params.onSave(vehicleData);
              }
              navigation.goBack();
            }
          }
        ]
      );
    }, 2000);
  };

  const renderImageButton = (label, imageType, icon) => (
    <TouchableOpacity 
      style={styles.imageButton}
      onPress={() => handleImageSelect(imageType)}
    >
      {vehicleImages[imageType] ? (
        <Image 
          source={{ uri: vehicleImages[imageType].uri }} 
          style={styles.imagePreview}
        />
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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
        </Text>
        <View style={styles.headerRight} />
      </View>

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
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Chassis No.</Text>
            <TextInput
              style={styles.input}
              value={formData.chassisNumber}
              onChangeText={(text) => setFormData({...formData, chassisNumber: text})}
              placeholder="Chassis number"
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
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Road Tax Expiry</Text>
            <TextInput
              style={styles.input}
              value={formData.roadTaxExpiry}
              onChangeText={(text) => setFormData({...formData, roadTaxExpiry: text})}
              placeholder="DD/MM/YYYY"
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

      {/* Required Documents Info */}
      <View style={styles.infoBox}>
        <Icon name="info-circle" size={20} color="#00B894" />
        <Text style={styles.infoText}>
          You will need to provide: Driver's License, Vehicle Registration Certificate, and Insurance Certificate during verification.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <Text style={styles.submitButtonText}>Processing...</Text>
        ) : (
          <>
            <Icon name={isEditing ? 'save' : 'check-circle'} size={20} color="#fff" />
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Update Vehicle' : 'Add Vehicle'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Requirements */}
      <View style={styles.requirements}>
        <Text style={styles.requirementsTitle}>Requirements:</Text>
        <View style={styles.requirementItem}>
          <Icon name="check-circle" size={16} color="#00B894" />
          <Text style={styles.requirementText}>Valid driver's license</Text>
        </View>
        <View style={styles.requirementItem}>
          <Icon name="check-circle" size={16} color="#00B894" />
          <Text style={styles.requirementText}>Vehicle registration certificate</Text>
        </View>
        <View style={styles.requirementItem}>
          <Icon name="check-circle" size={16} color="#00B894" />
          <Text style={styles.requirementText}>Comprehensive insurance</Text>
        </View>
        <View style={styles.requirementItem}>
          <Icon name="check-circle" size={16} color="#00B894" />
          <Text style={styles.requirementText}>Vehicle in good condition</Text>
        </View>
      </View>
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
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E8', 
    marginHorizontal: 20, 
    marginTop: 20,
    padding: 15, 
    borderRadius: 10,
    gap: 10,
  },
  infoText: { fontSize: 13, color: '#2E7D32', flex: 1, lineHeight: 18 },
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
  requirements: { 
    backgroundColor: '#fff', 
    marginHorizontal: 20, 
    marginTop: 20,
    padding: 20, 
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requirementsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  requirementText: { fontSize: 14, color: '#666', flex: 1 },
});