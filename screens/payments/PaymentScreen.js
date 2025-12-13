// screens/payments/PaymentScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, 
  TextInput, Animated, Vibration, StatusBar, ActivityIndicator,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { useDispatch, useSelector } from 'react-redux';
import { updatePaymentStatus, addTransaction } from '../../src/store/slices/paymentSlice';
import { completeRide } from '../../src/store/slices/rideSlice';
import socketService from '../../services/SocketService';
import realTimeService from '../../services/RealTimeService';
import PaymentService from '../../services/PaymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountDown from 'react-native-countdown-component';

export default function PaymentScreen({ route, navigation }) {
  const { rideAmount, rideDetails, rideId } = route.params || {};
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const driver = useSelector(state => state.driver.currentDriver);
  
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, completed, failed
  const [transactionId, setTransactionId] = useState('');
  const [countdownActive, setCountdownActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [mobileMoneyResponse, setMobileMoneyResponse] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [cashReceived, setCashReceived] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef(null);
  const paymentTimeoutRef = useRef(null);
  const socketListenerRef = useRef(null);

  // Sample ride amount if not provided
  const amount = rideAmount || 1500; // MWK

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      description: 'Pay directly to driver',
      icon: 'money',
      color: '#4CAF50',
      requiresPhone: false,
      processingTime: 'Instant',
      fee: 0
    },
    {
      id: 'airtel',
      name: 'Airtel Money',
      description: 'Pay via Airtel Money',
      icon: 'mobile',
      color: '#E60A2B',
      requiresPhone: true,
      processingTime: '2-3 minutes',
      fee: 0.5
    },
    {
      id: 'tnm',
      name: 'TNM MPamba',
      description: 'Pay via TNM MPamba',
      icon: 'mobile',
      color: '#FF6B00',
      requiresPhone: true,
      processingTime: '2-3 minutes',
      fee: 0.5
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay with Visa/Mastercard',
      icon: 'credit-card',
      color: '#2196F3',
      requiresPhone: false,
      processingTime: 'Instant',
      fee: 1.5
    }
  ];

  // Initialize real-time services
  useEffect(() => {
    initializeRealTimeServices();
    loadPaymentHistory();
    startPulseAnimation();
    
    return () => {
      cleanup();
    };
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (socketConnected) {
      setupSocketListeners();
    }
  }, [socketConnected]);

  const initializeRealTimeServices = async () => {
    try {
      await socketService.connect();
      setSocketConnected(true);
      
      // Check if this ride already has a pending payment
      if (rideId) {
        const paymentStatus = await realTimeService.getPaymentStatus(rideId);
        if (paymentStatus) {
          setPaymentStatus(paymentStatus.status);
          setTransactionId(paymentStatus.transactionId);
          
          if (paymentStatus.status === 'processing') {
            setCountdownActive(true);
            startCountdown();
          }
        }
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
    }
  };

  const setupSocketListeners = () => {
    // Listen for payment status updates
    socketListenerRef.current = socketService.on('payment:status:update', (data) => {
      if (data.rideId === rideId || data.transactionId === transactionId) {
        handlePaymentStatusUpdate(data);
      }
    });

    // Listen for mobile money confirmations
    socketService.on('payment:mobile:money:response', (response) => {
      if (response.transactionId === transactionId) {
        handleMobileMoneyResponse(response);
      }
    });

    // Listen for card payment confirmations
    socketService.on('payment:card:response', (response) => {
      if (response.transactionId === transactionId) {
        handleCardPaymentResponse(response);
      }
    });

    // Listen for driver cash confirmation
    socketService.on('payment:cash:confirmed', (data) => {
      if (data.rideId === rideId) {
        handleCashConfirmation(data);
      }
    });

    // Listen for connection status
    socketService.onConnectionChange((connected) => {
      setSocketConnected(connected);
      if (!connected && processing) {
        Alert.alert(
          'Connection Lost',
          'Payment processing paused. Will resume when connection is restored.',
          [{ text: 'OK' }]
        );
      }
    });
  };

  const cleanup = () => {
    if (socketListenerRef.current) {
      socketService.off('payment:status:update', socketListenerRef.current);
    }
    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
    }
    if (countdownRef.current) {
      countdownRef.current.stopTimer();
    }
    socketService.disconnect();
  };

  const loadPaymentHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('payment_history');
      if (history) {
        setPaymentHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startCountdown = () => {
    setCountdownActive(true);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handlePaymentTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  };

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

    // Generate transaction ID
    const newTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTransactionId(newTransactionId);
    
    // Start payment process
    setProcessing(true);
    setPaymentStatus('processing');
    setShowPaymentModal(true);
    
    // Start countdown for payment timeout
    startCountdown();
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 0.5,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    try {
      // Dispatch payment start action
      dispatch(updatePaymentStatus({ 
        status: 'processing',
        transactionId: newTransactionId 
      }));

      // Emit payment start event
      socketService.emit('payment:started', {
        rideId,
        transactionId: newTransactionId,
        amount,
        method: selectedMethod,
        phoneNumber: selectedPayment.requiresPhone ? `+265${phoneNumber}` : null,
        timestamp: new Date().toISOString(),
      });

      // Process payment based on method
      let paymentResult;
      switch (selectedMethod) {
        case 'cash':
          paymentResult = await handleCashPayment(newTransactionId);
          break;
        case 'airtel':
        case 'tnm':
          paymentResult = await handleMobileMoneyPayment(newTransactionId, selectedMethod);
          break;
        case 'card':
          paymentResult = await handleCardPayment(newTransactionId);
          break;
        default:
          throw new Error('Invalid payment method');
      }

      if (paymentResult.success) {
        await handlePaymentSuccess(paymentResult);
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      handlePaymentFailure(error.message);
    }
  };

  const handleCashPayment = async (transactionId) => {
    // For cash payments, wait for driver confirmation
    setPaymentProgress(50);
    
    // Show cash payment instructions
    Alert.alert(
      'Cash Payment',
      'Please hand the cash to the driver. The driver will confirm receipt.',
      [{ text: 'OK' }]
    );

    // Simulate waiting for driver confirmation
    return new Promise((resolve) => {
      // In real app, this would wait for socket event from driver
      setTimeout(() => {
        resolve({ success: true, transactionId });
      }, 5000);
    });
  };

  const handleMobileMoneyPayment = async (transactionId, provider) => {
    try {
      setPaymentProgress(30);
      
      // Initialize mobile money payment
      const initResult = await PaymentService.initiateMobileMoney({
        provider,
        phoneNumber: `+265${phoneNumber}`,
        amount,
        transactionId,
        rideId,
      });

      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initiate payment');
      }

      // Show USSD prompt simulation
      setMobileMoneyResponse({
        type: 'ussd_prompt',
        message: `Dial *150*60# and follow the prompts to pay MK ${amount}`,
      });

      setPaymentProgress(60);

      // Wait for payment confirmation (in real app, this would be via socket)
      const confirmation = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Payment timeout'));
        }, 180000); // 3 minutes timeout

        socketService.once(`payment:${provider}:confirmed:${transactionId}`, (data) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      setPaymentProgress(90);
      return { success: true, data: confirmation, transactionId };

    } catch (error) {
      throw error;
    }
  };

  const handleCardPayment = async (transactionId) => {
    // Simulate card payment flow
    setPaymentProgress(40);
    
    // Show card payment form (in real app, this would be a modal with card details)
    Alert.alert(
      'Card Payment',
      'Redirecting to secure payment gateway...',
      [{ text: 'Continue' }]
    );

    // Simulate payment gateway processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setPaymentProgress(80);
    
    // Simulate 3D Secure verification
    Alert.alert(
      '3D Secure Verification',
      'Please check your bank app for authentication',
      [{ text: 'OK' }]
    );

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setPaymentProgress(100);
    
    return { success: true, transactionId };
  };

  const handlePaymentStatusUpdate = (data) => {
    const { status, transactionId: receivedTransactionId, message } = data;
    
    if (receivedTransactionId === transactionId) {
      setPaymentStatus(status);
      
      if (status === 'completed') {
        handlePaymentSuccess(data);
      } else if (status === 'failed') {
        handlePaymentFailure(message || 'Payment failed');
      } else if (status === 'processing') {
        setPaymentProgress(data.progress || 50);
      }
    }
  };

  const handleMobileMoneyResponse = (response) => {
    setMobileMoneyResponse(response);
    
    if (response.status === 'success') {
      // Vibrate on success
      Vibration.vibrate([100, 100, 100]);
      setPaymentProgress(100);
    } else if (response.status === 'failed') {
      Alert.alert('Payment Failed', response.message || 'Mobile money payment failed');
    }
  };

  const handleCardPaymentResponse = (response) => {
    if (response.status === 'success') {
      setPaymentProgress(100);
      Vibration.vibrate([100, 100, 100]);
    } else {
      Alert.alert('Card Payment Failed', response.message || 'Payment declined');
    }
  };

  const handleCashConfirmation = (data) => {
    setCashReceived(true);
    setPaymentProgress(100);
    Vibration.vibrate([100, 100, 100]);
    
    Alert.alert(
      'Cash Received',
      'Driver has confirmed receipt of cash payment.',
      [{ text: 'Continue' }]
    );
  };

  const handlePaymentSuccess = async (paymentData) => {
    // Complete progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Update payment status
    setPaymentStatus('completed');
    setProcessing(false);
    setCountdownActive(false);
    
    // Clear timeout
    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
    }

    // Dispatch success actions
    dispatch(updatePaymentStatus({ 
      status: 'completed',
      transactionId: transactionId 
    }));
    
    dispatch(completeRide({
      rideId,
      paymentMethod: selectedMethod,
      amount,
      transactionId,
    }));

    // Add to payment history
    const newPayment = {
      id: transactionId,
      amount,
      method: selectedMethod,
      status: 'completed',
      date: new Date().toISOString(),
      rideId,
    };
    
    const updatedHistory = [newPayment, ...paymentHistory.slice(0, 9)];
    setPaymentHistory(updatedHistory);
    await AsyncStorage.setItem('payment_history', JSON.stringify(updatedHistory));

    // Emit payment success event
    socketService.emit('payment:completed', {
      rideId,
      transactionId,
      amount,
      method: selectedMethod,
      timestamp: new Date().toISOString(),
    });

    // Show success animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Close modal after delay
    setTimeout(() => {
      setShowPaymentModal(false);
      
      Alert.alert(
        'Payment Successful! 🎉',
        `Payment of MK${amount.toLocaleString()} completed via ${paymentMethods.find(m => m.id === selectedMethod)?.name}`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('RideCompleted', {
              amount,
              paymentMethod: selectedMethod,
              phoneNumber: showPhoneInput ? phoneNumber : null,
              transactionId,
              timestamp: new Date().toISOString(),
            })
          }
        ]
      );
    }, 1500);
  };

  const handlePaymentFailure = (errorMessage) => {
    setPaymentStatus('failed');
    setProcessing(false);
    setCountdownActive(false);
    
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
    }).start();

    dispatch(updatePaymentStatus({ 
      status: 'failed',
      error: errorMessage 
    }));

    Alert.alert(
      'Payment Failed', 
      errorMessage || 'Please try again or use another payment method.',
      [
        { text: 'Try Again', style: 'cancel', onPress: () => {
          setProcessing(false);
          setPaymentStatus('pending');
          setShowPaymentModal(false);
        }},
        { text: 'Change Method', onPress: () => {
          setProcessing(false);
          setPaymentStatus('pending');
          setShowPaymentModal(false);
        }}
      ]
    );
  };

  const handlePaymentTimeout = () => {
    handlePaymentFailure('Payment timeout. Please try again.');
  };

  const formatPhoneNumber = (text) => {
    // Remove non-numeric characters and limit to 9 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 9);
    setPhoneNumber(cleaned);
  };

  const getMethodName = (methodId) => {
    return paymentMethods.find(method => method.id === methodId)?.name || 'Cash';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        if (paymentStatus !== 'processing') {
          setShowPaymentModal(false);
        } else {
          Alert.alert(
            'Payment in Progress',
            'Your payment is being processed. Are you sure you want to cancel?',
            [
              { text: 'Continue', style: 'cancel' },
              { 
                text: 'Cancel Payment', 
                style: 'destructive',
                onPress: () => {
                  handlePaymentFailure('Payment cancelled by user');
                }
              }
            ]
          );
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {paymentStatus === 'processing' ? 'Processing Payment' : 
               paymentStatus === 'completed' ? 'Payment Successful' : 'Payment Failed'}
            </Text>
            {countdownActive && (
              <View style={styles.countdownContainer}>
                <Icon name="clock-o" size={14} color="#FF6B6B" />
                <Text style={styles.countdownText}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {paymentProgress}% Complete
            </Text>
          </View>

          {/* Payment Details */}
          <View style={styles.paymentDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>MK {amount.toLocaleString()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Method:</Text>
              <Text style={styles.detailValue}>{getMethodName(selectedMethod)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID:</Text>
              <Text style={styles.detailValueSmall}>{transactionId}</Text>
            </View>
          </View>

          {/* Mobile Money Instructions */}
          {mobileMoneyResponse && selectedMethod !== 'cash' && (
            <View style={styles.instructionsContainer}>
              <Icon name="mobile" size={24} color="#2196F3" />
              <Text style={styles.instructionsText}>
                {mobileMoneyResponse.message || 'Check your phone for payment prompt'}
              </Text>
            </View>
          )}

          {/* Cash Payment Instructions */}
          {selectedMethod === 'cash' && !cashReceived && (
            <View style={styles.instructionsContainer}>
              <Icon name="handshake-o" size={24} color="#4CAF50" />
              <Text style={styles.instructionsText}>
                Please hand MK {amount.toLocaleString()} to the driver
              </Text>
              <Text style={styles.instructionsSubtext}>
                Driver will confirm receipt
              </Text>
            </View>
          )}

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <Animated.View 
              style={[
                styles.statusIndicator,
                { 
                  backgroundColor: 
                    paymentStatus === 'completed' ? '#4CAF50' :
                    paymentStatus === 'failed' ? '#FF6B6B' : '#FFA726',
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <Icon 
                name={
                  paymentStatus === 'completed' ? 'check' :
                  paymentStatus === 'failed' ? 'times' : 'refresh'
                } 
                size={24} 
                color="#fff" 
              />
            </Animated.View>
            <Text style={styles.statusText}>
              {paymentStatus === 'processing' ? 'Processing...' :
               paymentStatus === 'completed' ? 'Payment Complete!' : 'Payment Failed'}
            </Text>
          </View>

          {/* Connection Status */}
          <View style={[
            styles.connectionStatus,
            { backgroundColor: socketConnected ? '#4CAF50' : '#FF6B6B' }
          ]}>
            <Icon 
              name={socketConnected ? 'wifi' : 'wifi-slash'} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.connectionStatusText}>
              {socketConnected ? 'Real-Time Connected' : 'Offline Mode'}
            </Text>
          </View>

          {/* Success Animation */}
          <Animated.View 
            style={[
              styles.successAnimation,
              { opacity: fadeAnim }
            ]}
          >
            <Icon name="check-circle" size={80} color="#4CAF50" />
            <Text style={styles.successText}>Payment Successful!</Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );

  if (processing && !showPaymentModal) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#00B894" barStyle="light-content" />
        <Header 
          title="Processing Payment" 
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Loading message="Initializing payment..." />
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
      <StatusBar backgroundColor="#00B894" barStyle="light-content" />
      
      {/* Header */}
      <Header 
        title="Payment Method" 
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity style={styles.historyButton}>
            <Icon name="history" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Display */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amount}>MK {amount.toLocaleString()}</Text>
          <Text style={styles.amountSubtext}>Ride fare</Text>
        </View>

        {/* Real-Time Payment Status */}
        {paymentStatus !== 'pending' && (
          <View style={[
            styles.paymentStatusBanner,
            { 
              backgroundColor: 
                paymentStatus === 'completed' ? '#E8F5E8' :
                paymentStatus === 'processing' ? '#FFF3CD' : '#FFEBEE'
            }
          ]}>
            <Icon 
              name={
                paymentStatus === 'completed' ? 'check-circle' :
                paymentStatus === 'processing' ? 'clock-o' : 'exclamation-circle'
              } 
              size={16} 
              color={
                paymentStatus === 'completed' ? '#4CAF50' :
                paymentStatus === 'processing' ? '#FFA726' : '#FF6B6B'
              } 
            />
            <Text style={[
              styles.paymentStatusText,
              { 
                color: 
                  paymentStatus === 'completed' ? '#2E7D32' :
                  paymentStatus === 'processing' ? '#FF8F00' : '#D32F2F'
              }
            ]}>
              {paymentStatus === 'processing' ? 'Payment in progress...' :
               paymentStatus === 'completed' ? 'Payment completed!' : 'Payment failed'}
            </Text>
          </View>
        )}

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <Text style={styles.sectionSubtitle}>Choose how you want to pay</Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
                processing && styles.methodCardDisabled
              ]}
              onPress={() => !processing && handleMethodSelect(method.id)}
              disabled={processing}
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
                  <View style={styles.methodMeta}>
                    <Text style={styles.methodMetaText}>⏱️ {method.processingTime}</Text>
                    {method.fee > 0 && (
                      <Text style={styles.methodMetaText}>💰 Fee: {method.fee}%</Text>
                    )}
                  </View>
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
                  editable={!processing}
                />
              </View>
              <Text style={styles.phoneHint}>
                You will receive a USSD prompt to confirm payment
              </Text>
              
              {/* Recent numbers */}
              {paymentHistory.length > 0 && (
                <View style={styles.recentNumbers}>
                  <Text style={styles.recentNumbersTitle}>Recent:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {paymentHistory
                      .filter(p => p.method === selectedMethod)
                      .slice(0, 5)
                      .map((payment, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.recentNumberButton}
                          onPress={() => setPhoneNumber(payment.phoneNumber?.replace('+265', '') || '')}
                        >
                          <Text style={styles.recentNumberText}>
                            {payment.phoneNumber?.replace('+265', '')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Instructions */}
        {selectedMethod === 'cash' && (
          <View style={styles.infoCard}>
            <Icon name="info-circle" size={18} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Cash Payment</Text>
              <Text style={styles.infoText}>
                Please have exact change ready. Pay the driver directly when you reach your destination.
              </Text>
              <Text style={styles.infoSubtext}>
                Driver will confirm receipt via real-time notification
              </Text>
            </View>
          </View>
        )}

        {/* Real-Time Security Badge */}
        <View style={styles.securityCard}>
          <Icon name="shield" size={20} color="#4CAF50" />
          <View style={styles.securityTextContainer}>
            <Text style={styles.securityTitle}>Secure & Real-Time Payment</Text>
            <Text style={styles.securityText}>
              End-to-end encryption • Live status updates • Instant confirmation
            </Text>
            <View style={styles.securityBadge}>
              <Icon name="bolt" size={10} color="#fff" />
              <Text style={styles.securityBadgeText}>REAL-TIME</Text>
            </View>
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
          icon={processing ? 'refresh' : 'lock'}
          iconPosition="left"
        />
        
        <View style={styles.footerInfo}>
          <Text style={styles.securityNote}>
            🔒 Real-time secure payment • ⚡ Instant confirmation
          </Text>
          {!socketConnected && (
            <Text style={styles.offlineWarning}>
              ⚠️ Offline mode - Payments saved locally
            </Text>
          )}
        </View>
      </View>

      {/* Payment Processing Modal */}
      {renderPaymentModal()}
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
  historyButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
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
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  paymentStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
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
  methodCardDisabled: {
    opacity: 0.6,
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
    marginBottom: 6,
  },
  methodMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  methodMetaText: {
    fontSize: 11,
    color: '#888',
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
  recentNumbers: {
    marginTop: 15,
  },
  recentNumbersTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  recentNumberButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  recentNumberText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
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
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 11,
    color: '#2e7d32',
    fontStyle: 'italic',
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8f5e8',
    position: 'relative',
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
    marginBottom: 4,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  securityBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
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
  footerInfo: {
    marginTop: 5,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
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
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  offlineWarning: {
    fontSize: 10,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    padding: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  progressContainer: {
    marginBottom: 25,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6c3',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  paymentDetails: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValueSmall: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  instructionsContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    fontWeight: '500',
  },
  instructionsSubtext: {
    fontSize: 12,
    color: '#1565C0',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 15,
    gap: 6,
  },
  connectionStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  successAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
  },
});