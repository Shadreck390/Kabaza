// screens/rider/PackageDeliveryScreen.js - COMPLETE FIXED VERSION
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function PackageDeliveryScreen({ route, navigation }) {
  const [packageDetails, setPackageDetails] = useState({
    senderName: '',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    pickupAddress: '',
    pickupCoordinates: null,
    deliveryAddress: '',
    deliveryCoordinates: null,
    packageType: 'parcel',
    packageWeight: '1-2 kg',
    packageDescription: '',
    requiresSignature: false,
    isFragile: false,
    insurance: false,
  });

  const [step, setStep] = useState(1);

  const packageTypes = [
    { id: 'document', label: 'Document', icon: 'description' },
    { id: 'parcel', label: 'Parcel', icon: 'inventory' },
    { id: 'food', label: 'Food', icon: 'restaurant' },
    { id: 'grocery', label: 'Groceries', icon: 'shopping-cart' },
    { id: 'medicine', label: 'Medicine', icon: 'local-pharmacy' },
    { id: 'other', label: 'Other', icon: 'help' },
  ];

  const weightOptions = [
    '< 1 kg',
    '1-2 kg',
    '2-5 kg',
    '5-10 kg',
    '> 10 kg',
  ];

  // Handle location selection from SearchLocationScreen
  useFocusEffect(
    useCallback(() => {
      const selectedLocation = route.params?.selectedLocation;
      const locationType = route.params?.locationType;
      
      if (selectedLocation) {
        const locationName = selectedLocation.name || selectedLocation.address;
        const locationCoords = selectedLocation.coordinates || null;
        
        if (locationType === 'pickup') {
          setPackageDetails(prev => ({
            ...prev,
            pickupAddress: locationName,
            pickupCoordinates: locationCoords
          }));
        } else if (locationType === 'delivery') {
          setPackageDetails(prev => ({
            ...prev,
            deliveryAddress: locationName,
            deliveryCoordinates: locationCoords
          }));
        }
        // Clear the parameters to prevent re-triggering
        navigation.setParams({ selectedLocation: undefined, locationType: undefined });
      }
    }, [route.params?.selectedLocation, route.params?.locationType])
  );

  // Validate step 1 (pickup details)
  const validateStep1 = () => {
    const errors = [];
    if (!packageDetails.senderName.trim()) {
      errors.push('Please enter your name');
    }
    if (!packageDetails.senderPhone.trim()) {
      errors.push('Please enter your phone number');
    }
    if (!packageDetails.pickupAddress.trim()) {
      errors.push('Please select pickup address');
    }
    
    if (errors.length > 0) {
      Alert.alert('Missing Information', errors.join('\n'));
      return false;
    }
    return true;
  };

  // Validate step 2 (delivery details)
  const validateStep2 = () => {
    const errors = [];
    if (!packageDetails.recipientName.trim()) {
      errors.push('Please enter recipient name');
    }
    if (!packageDetails.recipientPhone.trim()) {
      errors.push('Please enter recipient phone number');
    }
    if (!packageDetails.deliveryAddress.trim()) {
      errors.push('Please select delivery address');
    }
    
    if (errors.length > 0) {
      Alert.alert('Missing Information', errors.join('\n'));
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSendPackage = () => {
    // Final validation before sending
    if (!packageDetails.pickupAddress || !packageDetails.deliveryAddress) {
      Alert.alert('Error', 'Please enter pickup and delivery addresses');
      return;
    }
    
    if (!packageDetails.senderName || !packageDetails.senderPhone) {
      Alert.alert('Error', 'Please enter sender details');
      return;
    }
    
    if (!packageDetails.recipientName || !packageDetails.recipientPhone) {
      Alert.alert('Error', 'Please enter recipient details');
      return;
    }

    // Navigate to ride selection for package delivery
    navigation.navigate('RideSelection', {
      rideType: 'delivery',
      packageDetails: packageDetails,
      isPackageDelivery: true,
    });
  };

  // Open search location screen
  const openLocationSearch = (type) => {
    navigation.navigate('SearchLocation', {
      source: 'package_delivery',
      locationType: type,
    });
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pickup Details</Text>
      
      <View style={styles.inputContainer}>
        <MaterialIcon name="person" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={packageDetails.senderName}
          onChangeText={(text) => setPackageDetails({...packageDetails, senderName: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcon name="phone" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Your phone number(e.g 088/099)"
          keyboardType="phone-pad"
          value={packageDetails.senderPhone}
          onChangeText={(text) => setPackageDetails({...packageDetails, senderPhone: text})}
        />
      </View>

      <TouchableOpacity 
        style={styles.inputContainer}
        onPress={() => openLocationSearch('pickup')}
      >
        <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, styles.locationInput]}
          placeholder="Select pickup address"
          value={packageDetails.pickupAddress}
          editable={false}
          pointerEvents="none"
        />
        <MaterialIcon name="search" size={20} color="#00a82d" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.nextButton}
        onPress={handleNextStep}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <MaterialIcon name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Delivery Details</Text>
      
      <View style={styles.inputContainer}>
        <MaterialIcon name="person" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Recipient name"
          value={packageDetails.recipientName}
          onChangeText={(text) => setPackageDetails({...packageDetails, recipientName: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcon name="phone" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Recipient phone number(e.g 088/099)"
          keyboardType="phone-pad"
          value={packageDetails.recipientPhone}
          onChangeText={(text) => setPackageDetails({...packageDetails, recipientPhone: text})}
        />
      </View>

      <TouchableOpacity 
        style={styles.inputContainer}
        onPress={() => openLocationSearch('delivery')}
      >
        <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, styles.locationInput]}
          placeholder="Select delivery address"
          value={packageDetails.deliveryAddress}
          editable={false}
          pointerEvents="none"
        />
        <MaterialIcon name="search" size={20} color="#00a82d" />
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackStep}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNextStep}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Package Information</Text>
      
      <Text style={styles.sectionLabel}>Package Type</Text>
      <View style={styles.packageTypeGrid}>
        {packageTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.packageTypeCard,
              packageDetails.packageType === type.id && styles.packageTypeCardSelected
            ]}
            onPress={() => setPackageDetails({...packageDetails, packageType: type.id})}
          >
            <MaterialIcon name={type.icon} size={24} color={packageDetails.packageType === type.id ? '#00a82d' : '#666'} />
            <Text style={[
              styles.packageTypeLabel,
              packageDetails.packageType === type.id && styles.packageTypeLabelSelected
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Approximate Weight</Text>
      <View style={styles.weightContainer}>
        {weightOptions.map((weight) => (
          <TouchableOpacity
            key={weight}
            style={[
              styles.weightChip,
              packageDetails.packageWeight === weight && styles.weightChipSelected
            ]}
            onPress={() => setPackageDetails({...packageDetails, packageWeight: weight})}
          >
            <Text style={[
              styles.weightChipText,
              packageDetails.packageWeight === weight && styles.weightChipTextSelected
            ]}>
              {weight}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcon name="description" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Package description (optional)"
          multiline
          numberOfLines={3}
          value={packageDetails.packageDescription}
          onChangeText={(text) => setPackageDetails({...packageDetails, packageDescription: text})}
        />
      </View>

      <View style={styles.optionsContainer}>
        <View style={styles.optionRow}>
          <View style={styles.optionTextContainer}>
            <MaterialIcon name="signature" size={20} color="#666" />
            <Text style={styles.optionLabel}>Require signature on delivery</Text>
          </View>
          <Switch
            value={packageDetails.requiresSignature}
            onValueChange={(value) => setPackageDetails({...packageDetails, requiresSignature: value})}
            trackColor={{ false: '#e0e0e0', true: '#00a82d' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionTextContainer}>
            <MaterialIcon name="warning" size={20} color="#666" />
            <Text style={styles.optionLabel}>Fragile item</Text>
          </View>
          <Switch
            value={packageDetails.isFragile}
            onValueChange={(value) => setPackageDetails({...packageDetails, isFragile: value})}
            trackColor={{ false: '#e0e0e0', true: '#00a82d' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionTextContainer}>
            <MaterialIcon name="security" size={20} color="#666" />
            <Text style={styles.optionLabel}>Add insurance (MK 500)</Text>
          </View>
          <Switch
            value={packageDetails.insurance}
            onValueChange={(value) => setPackageDetails({...packageDetails, insurance: value})}
            trackColor={{ false: '#e0e0e0', true: '#00a82d' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackStep}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNextStep}
        >
          <Text style={styles.nextButtonText}>Review</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => {
    // Get package type label
    const packageTypeLabel = packageTypes.find(t => t.id === packageDetails.packageType)?.label || packageDetails.packageType;
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Review & Send</Text>
        
        <View style={styles.reviewCard}>
          <Text style={styles.reviewSectionTitle}>Pickup</Text>
          <Text style={styles.reviewText}>{packageDetails.pickupAddress || 'Not specified'}</Text>
          <Text style={styles.reviewSubtext}>{packageDetails.senderName} • {packageDetails.senderPhone}</Text>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewSectionTitle}>Delivery</Text>
          <Text style={styles.reviewText}>{packageDetails.deliveryAddress || 'Not specified'}</Text>
          <Text style={styles.reviewSubtext}>{packageDetails.recipientName} • {packageDetails.recipientPhone}</Text>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewSectionTitle}>Package</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Type:</Text>
            <Text style={styles.reviewValue}>{packageTypeLabel}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Weight:</Text>
            <Text style={styles.reviewValue}>{packageDetails.packageWeight}</Text>
          </View>
          {packageDetails.packageDescription ? (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Description:</Text>
              <Text style={styles.reviewValue} numberOfLines={2}>{packageDetails.packageDescription}</Text>
            </View>
          ) : null}
          {packageDetails.requiresSignature && (
            <View style={styles.reviewFeatureRow}>
              <MaterialIcon name="check-circle" size={16} color="#00a82d" />
              <Text style={styles.reviewFeature}>Signature required</Text>
            </View>
          )}
          {packageDetails.isFragile && (
            <View style={styles.reviewFeatureRow}>
              <MaterialIcon name="check-circle" size={16} color="#00a82d" />
              <Text style={styles.reviewFeature}>Fragile</Text>
            </View>
          )}
          {packageDetails.insurance && (
            <View style={styles.reviewFeatureRow}>
              <MaterialIcon name="check-circle" size={16} color="#00a82d" />
              <Text style={styles.reviewFeature}>Insurance included (+MK 500)</Text>
            </View>
          )}
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Estimated Delivery Fee</Text>
          <Text style={styles.priceAmount}>MK 10,500 - MK 15,500</Text>
          <Text style={styles.priceNote}>*Final price based on distance and package weight</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackStep}
          >
            <MaterialIcon name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendPackage}
          >
            <Text style={styles.sendButtonText}>Send Package</Text>
            <MaterialIcon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kabaza Send</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 1 && styles.progressStepTextActive]}>1</Text>
        </View>
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 2 && styles.progressStepTextActive]}>2</Text>
        </View>
        <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 3 && styles.progressStepTextActive]}>3</Text>
        </View>
        <View style={[styles.progressLine, step >= 4 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 4 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 4 && styles.progressStepTextActive]}>4</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#00a82d',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  progressLineActive: {
    backgroundColor: '#00a82d',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  locationInput: {
    color: '#333',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  packageTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  packageTypeCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  packageTypeCardSelected: {
    borderColor: '#00a82d',
    backgroundColor: '#e8f5e9',
  },
  packageTypeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  packageTypeLabelSelected: {
    color: '#00a82d',
    fontWeight: '600',
  },
  weightContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  weightChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  weightChipSelected: {
    backgroundColor: '#00a82d',
    borderColor: '#00a82d',
  },
  weightChipText: {
    fontSize: 14,
    color: '#666',
  },
  weightChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  optionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a82d',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a82d',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 16,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  reviewSubtext: {
    fontSize: 14,
    color: '#666',
  },
  reviewRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    width: 70,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  reviewFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  reviewFeature: {
    fontSize: 14,
    color: '#00a82d',
    marginLeft: 8,
  },
  priceCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00a82d',
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 12,
    color: '#666',
  },
});