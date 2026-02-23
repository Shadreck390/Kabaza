// screens/rider/PackageDeliveryScreen.js
import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import { useNavigation } from '@react-navigation/native';

export default function PackageDeliveryScreen() {
  const navigation = useNavigation();
  
  const [packageDetails, setPackageDetails] = useState({
    senderName: '',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    pickupAddress: '',
    deliveryAddress: '',
    packageType: 'parcel',
    packageWeight: '1-2 kg',
    packageDescription: '',
    requiresSignature: false,
    isFragile: false,
    insurance: false,
  });

  const [step, setStep] = useState(1); // 1: pickup, 2: delivery, 3: package info, 4: review

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

  const handleSendPackage = () => {
    // Validate required fields
    if (!packageDetails.pickupAddress || !packageDetails.deliveryAddress) {
      Alert.alert('Error', 'Please enter pickup and delivery addresses');
      return;
    }

    // Navigate to package confirmation
    navigation.navigate('RideSelection', {
      rideType: 'delivery',
      packageDetails: packageDetails,
      isPackageDelivery: true,
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
          placeholder="Your phone number"
          keyboardType="phone-pad"
          value={packageDetails.senderPhone}
          onChangeText={(text) => setPackageDetails({...packageDetails, senderPhone: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Pickup address"
          value={packageDetails.pickupAddress}
          onChangeText={(text) => setPackageDetails({...packageDetails, pickupAddress: text})}
        />
        <TouchableOpacity onPress={() => navigation.navigate('SearchLocation', {
          onLocationSelect: (location) => setPackageDetails({
            ...packageDetails, 
            pickupAddress: location.name,
            pickupCoordinates: location.coordinates
          })
        })}>
          <MaterialIcon name="my-location" size={20} color="#00a82d" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.nextButton}
        onPress={() => setStep(2)}
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
          placeholder="Recipient phone number"
          keyboardType="phone-pad"
          value={packageDetails.recipientPhone}
          onChangeText={(text) => setPackageDetails({...packageDetails, recipientPhone: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Delivery address"
          value={packageDetails.deliveryAddress}
          onChangeText={(text) => setPackageDetails({...packageDetails, deliveryAddress: text})}
        />
        <TouchableOpacity onPress={() => navigation.navigate('SearchLocation', {
          onLocationSelect: (location) => setPackageDetails({
            ...packageDetails, 
            deliveryAddress: location.name,
            deliveryCoordinates: location.coordinates
          })
        })}>
          <MaterialIcon name="my-location" size={20} color="#00a82d" />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setStep(3)}
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
          style={styles.input}
          placeholder="Package description (optional)"
          multiline
          numberOfLines={2}
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
          />
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(2)}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setStep(4)}
        >
          <Text style={styles.nextButtonText}>Review</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
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
          <Text style={styles.reviewValue}>{packageDetails.packageType}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Weight:</Text>
          <Text style={styles.reviewValue}>{packageDetails.packageWeight}</Text>
        </View>
        {packageDetails.requiresSignature && (
          <View style={styles.reviewRow}>
            <MaterialIcon name="check-circle" size={16} color="#00a82d" />
            <Text style={styles.reviewFeature}>Signature required</Text>
          </View>
        )}
        {packageDetails.isFragile && (
          <View style={styles.reviewRow}>
            <MaterialIcon name="check-circle" size={16} color="#00a82d" />
            <Text style={styles.reviewFeature}>Fragile</Text>
          </View>
        )}
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Delivery Fee</Text>
        <Text style={styles.priceAmount}>MK 3,500 - MK 5,500</Text>
        <Text style={styles.priceNote}>*Final price based on distance</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(3)}
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
    alignItems: 'center',
    marginTop: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
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