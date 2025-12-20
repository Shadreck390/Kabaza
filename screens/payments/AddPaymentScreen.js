// screens/payments/AddPaymentScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  StatusBar,
  ActivityIndicator,
  Switch,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddPaymentScreen() {
  const navigation = useNavigation();
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [loading, setLoading] = useState(false);
  
  // Mobile Money fields
  const [mobileNumber, setMobileNumber] = useState('');
  const [networkProvider, setNetworkProvider] = useState('tnsm');
  const [isDefault, setIsDefault] = useState(false);
  
  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  const networkProviders = [
    { id: 'tnsm', name: 'TNM Mpamba', icon: 'phone', color: '#0088CE' },
    { id: 'airtel', name: 'Airtel Money', icon: 'phone', color: '#E4002B' },
    { id: 'national', name: 'National Bank', icon: 'bank', color: '#008000' },
  ];

  const validateMobileMoney = () => {
    if (!mobileNumber.trim()) {
      Alert.alert('Error', 'Please enter your mobile number');
      return false;
    }
    
    if (mobileNumber.length !== 9 || !mobileNumber.startsWith('0')) {
      Alert.alert('Error', 'Please enter a valid 9-digit mobile number starting with 0');
      return false;
    }
    
    if (!networkProvider) {
      Alert.alert('Error', 'Please select a network provider');
      return false;
    }
    
    return true;
  };

  const validateCard = () => {
    if (!cardNumber.trim() || cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Error', 'Please enter a valid 16-digit card number');
      return false;
    }
    
    if (!cardHolder.trim()) {
      Alert.alert('Error', 'Please enter card holder name');
      return false;
    }
    
    if (!expiryDate.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)) {
      Alert.alert('Error', 'Please enter valid expiry date (MM/YY)');
      return false;
    }
    
    if (!cvv || cvv.length !== 3) {
      Alert.alert('Error', 'Please enter valid 3-digit CVV');
      return false;
    }
    
    return true;
  };

  const handleAddPaymentMethod = async () => {
    let isValid = false;
    
    if (paymentMethod === 'mobile_money') {
      isValid = validateMobileMoney();
    } else if (paymentMethod === 'card') {
      isValid = validateCard();
    }
    
    if (!isValid) return;
    
    setLoading(true);
    
    try {
      // Get existing payment methods
      const existingMethods = await AsyncStorage.getItem('payment_methods');
      const methods = existingMethods ? JSON.parse(existingMethods) : [];
      
      const newMethod = {
        id: Date.now().toString(),
        type: paymentMethod,
        isDefault: isDefault,
        createdAt: new Date().toISOString(),
      };
      
      if (paymentMethod === 'mobile_money') {
        const provider = networkProviders.find(p => p.id === networkProvider);
        newMethod.details = {
          number: mobileNumber,
          provider: provider.name,
          providerId: networkProvider,
          lastFour: mobileNumber.slice(-4),
        };
        newMethod.icon = provider.icon;
        newMethod.color = provider.color;
        newMethod.title = `${provider.name} ••••${mobileNumber.slice(-4)}`;
      } else if (paymentMethod === 'card') {
        newMethod.details = {
          number: cardNumber,
          holder: cardHolder,
          expiry: expiryDate,
          lastFour: cardNumber.slice(-4),
          brand: cardNumber.startsWith('4') ? 'visa' : 'mastercard',
        };
        newMethod.icon = 'credit-card';
        newMethod.color = '#3B82F6';
        newMethod.title = `Card ••••${cardNumber.slice(-4)}`;
      }
      
      // If setting as default, update all other methods to not default
      if (isDefault) {
        methods.forEach(method => method.isDefault = false);
      }
      
      // Add new method
      methods.push(newMethod);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('payment_methods', JSON.stringify(methods));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Success',
        'Payment method added successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          }
        ]
      );
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'Failed to add payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMobileMoneyForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formLabel}>Select Provider</Text>
      <View style={styles.providerGrid}>
        {networkProviders.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerButton,
              networkProvider === provider.id && styles.providerButtonSelected,
            ]}
            onPress={() => setNetworkProvider(provider.id)}
          >
            <View style={[
              styles.providerIcon,
              { backgroundColor: provider.color + '20' }
            ]}>
              <MaterialCommunityIcon 
                name={provider.icon} 
                size={24} 
                color={provider.color} 
              />
            </View>
            <Text style={[
              styles.providerText,
              networkProvider === provider.id && styles.providerTextSelected,
            ]}>
              {provider.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={[styles.formLabel, { marginTop: 24 }]}>Mobile Number</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.countryCode}>+265</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 9-digit number"
          keyboardType="phone-pad"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          maxLength={9}
        />
      </View>
    </View>
  );

  const renderCardForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formLabel}>Card Number</Text>
      <View style={styles.inputContainer}>
        <MaterialIcon name="credit-card" size={20} color="#6B7280" />
        <TextInput
          style={[styles.input, { marginLeft: 8 }]}
          placeholder="1234 5678 9012 3456"
          keyboardType="numeric"
          value={cardNumber}
          onChangeText={(text) => {
            // Format card number with spaces
            const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            setCardNumber(formatted);
          }}
          maxLength={19}
        />
      </View>
      
      <Text style={[styles.formLabel, { marginTop: 16 }]}>Card Holder Name</Text>
      <View style={styles.inputContainer}>
        <MaterialIcon name="person" size={20} color="#6B7280" />
        <TextInput
          style={[styles.input, { marginLeft: 8 }]}
          placeholder="John Doe"
          value={cardHolder}
          onChangeText={setCardHolder}
          autoCapitalize="words"
        />
      </View>
      
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.formLabel}>Expiry Date</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              value={expiryDate}
              onChangeText={(text) => {
                // Format expiry date
                let formatted = text.replace(/\D/g, '');
                if (formatted.length >= 2) {
                  formatted = formatted.slice(0, 2) + '/' + formatted.slice(2, 4);
                }
                setExpiryDate(formatted);
              }}
              maxLength={5}
            />
          </View>
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.formLabel}>CVV</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="123"
              keyboardType="numeric"
              value={cvv}
              onChangeText={setCvv}
              maxLength={3}
              secureTextEntry
            />
          </View>
        </View>
      </View>
    </View>
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
          <MaterialIcon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Method Selection */}
        <View style={styles.methodSection}>
          <Text style={styles.sectionTitle}>Select Method</Text>
          <View style={styles.methodButtons}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'mobile_money' && styles.methodButtonSelected,
              ]}
              onPress={() => setPaymentMethod('mobile_money')}
            >
              <MaterialCommunityIcon
                name="cellphone"
                size={28}
                color={paymentMethod === 'mobile_money' ? '#4F46E5' : '#6B7280'}
              />
              <Text style={[
                styles.methodButtonText,
                paymentMethod === 'mobile_money' && styles.methodButtonTextSelected,
              ]}>
                Mobile Money
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'card' && styles.methodButtonSelected,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <MaterialIcon
                name="credit-card"
                size={28}
                color={paymentMethod === 'card' ? '#4F46E5' : '#6B7280'}
              />
              <Text style={[
                styles.methodButtonText,
                paymentMethod === 'card' && styles.methodButtonTextSelected,
              ]}>
                Debit/Credit Card
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Dynamic Form */}
        {paymentMethod === 'mobile_money' ? renderMobileMoneyForm() : renderCardForm()}
        
        {/* Default Payment Method */}
        <View style={styles.defaultSection}>
          <View style={styles.defaultInfo}>
            <MaterialIcon name="star" size={20} color="#F59E0B" />
            <Text style={styles.defaultText}>Set as default payment method</Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
            thumbColor={isDefault ? '#4F46E5' : '#FFFFFF'}
          />
        </View>
        
        {/* Security Info */}
        <View style={styles.securitySection}>
          <MaterialIcon name="security" size={20} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your CVV.
          </Text>
        </View>
      </ScrollView>
      
      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddPaymentMethod}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcon name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: StatusBar.currentHeight + 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  methodSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  methodButtonSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
  },
  methodButtonTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerButton: {
    width: '31%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  providerButtonSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  providerTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    flex: 1,
  },
  defaultSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  defaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});