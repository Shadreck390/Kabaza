// screens/payments/PaymentScreen.js
import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Loading from '../../components/Loading';

export default function PaymentScreen({ route, navigation }) {
  const { rideAmount, rideDetails } = route.params || {};
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  // Sample ride amount if not provided
  const amount = rideAmount || 1500; // MWK

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      description: 'Pay directly to driver',
      icon: 'money',
      color: '#4CAF50',
      requiresPhone: false
    },
    {
      id: 'airtel',
      name: 'Airtel Money',
      description: 'Pay via Airtel Money',
      icon: 'mobile',
      color: '#E60A2B',
      requiresPhone: true
    },
    {
      id: 'tnm',
      name: 'TNM MPamba',
      description: 'Pay via TNM MPamba',
      icon: 'mobile',
      color: '#FF6B00',
      requiresPhone: true
    }
  ];

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    const method = paymentMethods.find(m => m.id === methodId);
    setShowPhoneInput(method?.requiresPhone || false);
    if (!method?.requiresPhone) {
      setPhoneNumber('');
    }
  };

  const handlePayment = async () => {
    const selectedPayment = paymentMethods.find(m => m.id === selectedMethod);
    
    if (selectedPayment.requiresPhone && !phoneNumber) {
      Alert.alert('Phone Required', `Please enter your ${selectedPayment.name} phone number`);
      return;
    }

    if (selectedPayment.requiresPhone && phoneNumber.length !== 9) {
      Alert.alert('Invalid Number', 'Please enter a valid 9-digit phone number');
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      Alert.alert(
        'Payment Successful! 🎉',
        `Payment of MK${amount.toLocaleString()} completed via ${selectedPayment.name}`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('RideCompleted', {
              amount,
              paymentMethod: selectedPayment.name,
              phoneNumber: selectedPayment.requiresPhone ? phoneNumber : null
            })
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Payment Failed', 
        'Please try again or use another payment method. Check your mobile money balance.',
        [
          { text: 'Try Again', style: 'cancel' },
          { text: 'Change Method', onPress: () => setProcessing(false) }
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatPhoneNumber = (text) => {
    // Remove non-numeric characters and limit to 9 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 9);
    setPhoneNumber(cleaned);
  };

  const getMethodName = (methodId) => {
    return paymentMethods.find(method => method.id === methodId)?.name || 'Cash';
  };

  if (processing) {
    return (
      <View style={styles.container}>
        <Header 
          title="Processing Payment" 
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Loading message="Processing your payment..." />
          <Text style={styles.processingText}>
            Please wait while we process your {getMethodName(selectedMethod)} payment
          </Text>
          <Text style={styles.processingSubtext}>
            Do not close this screen
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header 
        title="Payment Method" 
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Display */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amount}>MK {amount.toLocaleString()}</Text>
          <Text style={styles.amountSubtext}>Ride fare</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <Text style={styles.sectionSubtitle}>Choose how you want to pay</Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected
              ]}
              onPress={() => handleMethodSelect(method.id)}
            >
              <View style={styles.methodLeft}>
                <View style={[styles.methodIconContainer, { backgroundColor: `${method.color}15` }]}>
                  <Icon 
                    name={method.icon} 
                    size={20} 
                    color={method.color} 
                  />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>
              
              <View style={[
                styles.radioButton,
                selectedMethod === method.id && styles.radioButtonSelected
              ]}>
                {selectedMethod === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Phone Number Input for Mobile Money */}
        {showPhoneInput && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedMethod === 'airtel' ? 'Airtel Money' : 'TNM MPamba'} Number
            </Text>
            
            <View style={styles.phoneSection}>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+265</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={formatPhoneNumber}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  maxLength={9}
                  autoFocus={true}
                />
              </View>
              <Text style={styles.phoneHint}>
                You will receive a USSD prompt to confirm payment
              </Text>
            </View>
          </View>
        )}

        {/* Cash Payment Instructions */}
        {selectedMethod === 'cash' && (
          <View style={styles.infoCard}>
            <Icon name="info-circle" size={18} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Cash Payment</Text>
              <Text style={styles.infoText}>
                Please have exact change ready. Pay the driver directly when you reach your destination.
              </Text>
            </View>
          </View>
        )}

        {/* Security Badge */}
        <View style={styles.securityCard}>
          <Icon name="shield" size={20} color="#4CAF50" />
          <View style={styles.securityTextContainer}>
            <Text style={styles.securityTitle}>Secure Payment</Text>
            <Text style={styles.securityText}>
              Your payment information is encrypted and secure
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <View style={styles.paymentSummary}>
          <Text style={styles.summaryLabel}>Total to Pay</Text>
          <Text style={styles.summaryAmount}>MK {amount.toLocaleString()}</Text>
        </View>
        
        <Button
          title={
            processing ? 
            "Processing..." : 
            `Pay MK ${amount.toLocaleString()} with ${getMethodName(selectedMethod)}`
          }
          onPress={handlePayment}
          disabled={processing || (showPhoneInput && !phoneNumber)}
          style={[
            styles.payButton,
            (processing || (showPhoneInput && !phoneNumber)) && styles.payButtonDisabled
          ]}
          textStyle={styles.payButtonText}
        />
        
        <Text style={styles.securityNote}>
          🔒 Your payment is secure and encrypted
        </Text>
      </View>
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
    padding: 20,
  },
  processingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  amountCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6c3',
    marginBottom: 4,
  },
  amountSubtext: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  methodCardSelected: {
    borderColor: '#6c3',
    backgroundColor: '#f9fff9',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 16,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#6c3',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6c3',
  },
  phoneSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  phonePrefix: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRightWidth: 2,
    borderRightColor: '#e0e0e0',
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 14,
    fontWeight: '500',
  },
  phoneHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e8',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#2e7d32',
    lineHeight: 18,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f5e8',
  },
  securityTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c3',
  },
  payButton: {
    backgroundColor: '#6c3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  securityNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});