// screens/driver/VerificationPendingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Alert,
  AppState,
  RefreshControl,
  Platform,
  Linking
} from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, saveUserData } from '@src/utils/userStorage';
import socketService from '@services/socket/socketService';

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View style={styles.errorContainer}>
      <Icon name="exclamation-triangle" size={60} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

function VerificationPendingScreen({ navigation, route }) {
  // 🚀 SIMPLE BYPASS - KEEP THIS AT THE TOP
  useEffect(() => {
    console.log('🚀 Bypassing verification screen...');
    
    // Set user as verified in storage
    const setUserVerified = async () => {
      try {
        const userData = await getUserData();
        if (userData) {
          userData.verification_status = 'approved';
          userData.is_verified = true;
          await saveUserData(userData);
          console.log('✅ User verification status updated to approved');
        }
      } catch (error) {
        console.error('Error updating verification status:', error);
      }
    };
    
    setUserVerified();
    
    // Navigate to driver stack after a short delay
    const timer = setTimeout(() => {
      navigation.replace('DriverStack');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [navigation]);

  // ========== STATE DECLARATIONS ==========
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [statusDetails, setStatusDetails] = useState({
    submittedAt: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date().toISOString(),
    adminMessage: null,
    requiredActions: [],
    currentStep: 'document_review',
    stepProgress: 25,
    contactSupport: false
  });
  
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [countdown, setCountdown] = useState('48:00:00');
  const [documentsStatus, setDocumentsStatus] = useState({});
  const [supportOnline, setSupportOnline] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const countdownInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const reconnectTimeout = useRef(null);

  const verificationId = route.params?.verificationId || `VER${Date.now()}`;
  const submittedAt = route.params?.submittedAt || new Date().toISOString();

  // ========== FUNCTIONS ==========
  
  const initializeVerificationTracking = async () => {
    try {
      setLoading(true);
      
      // Initialize socket connection
      if (!socketService.isConnected) {
        await socketService.initialize();
      }
      
      // Setup verification-specific socket listeners
      setupVerificationListeners();
      
      // Join verification room
      await joinVerificationRoom();
      
      // Request initial verification status
      await requestVerificationStatus();
      
      // Load document status
      await loadDocumentsStatus();
      
      // Start real-time updates
      startRealTimeUpdates();
      
    } catch (error) {
      console.error('Verification tracking initialization error:', error);
      Alert.alert('Connection Error', 'Could not connect to verification service. Updates may be delayed.');
    } finally {
      setLoading(false);
    }
  };

  const setupVerificationListeners = () => {
    // Listen for verification status updates
    socketService.on('verification_status_changed', handleVerificationStatusChange);
    
    // Listen for admin messages
    socketService.on('admin_message', handleAdminMessage);
    
    // Listen for document validation results
    socketService.on('document_validation_update', handleDocumentValidationUpdate);
    
    // Listen for support availability
    socketService.on('support_availability', handleSupportAvailability);
    
    // Listen for connection status
    socketService.on('connection_change', handleConnectionChange);
    
    // Listen for verification progress updates
    socketService.on('verification_progress_update', handleVerificationProgressUpdate);
  };

  const handleVerificationStatusChange = (data) => {
    console.log('Verification status changed:', data);
    
    // Update local status
    setVerificationStatus(data.status);
    setStatusDetails(prev => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      adminMessage: data.message || prev.adminMessage,
      requiredActions: data.requiredActions || []
    }));
    
    // Animate status change
    animateStatusChange();
    
    // Handle specific status changes
    switch(data.status) {
      case 'approved':
        handleVerificationApproved(data);
        break;
      case 'rejected':
        handleVerificationRejected(data);
        break;
      case 'reviewing':
        handleVerificationReviewing(data);
        break;
      case 'requires_action':
        handleRequiresAction(data);
        break;
    }
    
    // Save updated status
    saveVerificationStatus(data);
  };

  const handleVerificationApproved = (data) => {
    console.log('Verification approved!');
    
    // Update user data
    updateUserVerificationStatus(true, 'approved');
    
    // Show success animation and navigate
    setTimeout(() => {
      Alert.alert(
        '🎉 Verification Approved!',
        'Your driver verification has been approved. You can now start accepting rides!',
        [
          {
            text: 'Start Driving',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'DriverStack' }]
              });
            }
          }
        ]
      );
    }, 1000);
  };

  const handleVerificationRejected = (data) => {
    console.log('Verification rejected:', data);
    
    Alert.alert(
      'Verification Rejected',
      data.message || 'Your verification has been rejected. Please check the reason and resubmit.',
      [
        { text: 'View Details', onPress: () => showRejectionDetails(data) },
        { text: 'Contact Support', onPress: () => contactSupport() }
      ]
    );
  };

  const handleVerificationReviewing = (data) => {
    console.log('Verification under review');
    setStatusDetails(prev => ({
      ...prev,
      currentStep: 'background_check',
      stepProgress: 50
    }));
  };

  const handleRequiresAction = (data) => {
    console.log('Action required:', data);
    
    Alert.alert(
      'Action Required',
      data.message || 'Additional information is required to complete your verification.',
      [
        { text: 'Provide Info', onPress: () => handleActionRequired(data) },
        { text: 'Later', style: 'cancel' }
      ]
    );
  };

  const handleAdminMessage = (messageData) => {
    console.log('Admin message received:', messageData);
    
    setStatusDetails(prev => ({
      ...prev,
      adminMessage: messageData.message,
      contactSupport: messageData.contactSupport || false,
      lastUpdated: new Date().toISOString()
    }));
    
    // Show notification if important
    if (messageData.priority === 'high') {
      Alert.alert(
        'Message from Verification Team',
        messageData.message,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDocumentValidationUpdate = (validationData) => {
    console.log('Document validation update:', validationData);
    
    setDocumentsStatus(prev => ({
      ...prev,
      [validationData.documentType]: validationData.status,
      ...(validationData.feedback && { feedback: validationData.feedback })
    }));
  };

  const handleSupportAvailability = (availabilityData) => {
    console.log('Support availability update:', availabilityData);
    setSupportOnline(availabilityData.isOnline);
  };

  const handleConnectionChange = (data) => {
    console.log('Connection status:', data.status);
    setSocketConnected(data.status === 'connected');
    
    if (data.status === 'connected') {
      // Rejoin verification room
      joinVerificationRoom();
    } else if (data.status === 'disconnected') {
      // Schedule reconnect
      scheduleReconnect();
    }
  };

  const handleVerificationProgressUpdate = (progressData) => {
    console.log('Progress update:', progressData);
    
    setStatusDetails(prev => ({
      ...prev,
      currentStep: progressData.step,
      stepProgress: progressData.progress,
      lastUpdated: new Date().toISOString()
    }));
    
    // Animate progress
    Animated.timing(progressAnim, {
      toValue: progressData.progress / 100,
      duration: 1000,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, refresh verification status
      refreshVerificationStatus();
    }
    appState.current = nextAppState;
  };

  const joinVerificationRoom = async () => {
    try {
      if (socketService.isConnected) {
        socketService.emit('join_verification_room', {
          verificationId,
          timestamp: new Date().toISOString()
        });
        
        console.log('Joined verification room:', verificationId);
      }
    } catch (error) {
      console.error('Error joining verification room:', error);
    }
  };

  const requestVerificationStatus = async () => {
    try {
      socketService.emit('request_verification_status', {
        verificationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error requesting verification status:', error);
    }
  };

  const refreshVerificationStatus = () => {
    setRefreshing(true);
    requestVerificationStatus();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      if (!socketConnected) {
        initializeVerificationTracking();
      }
    }, 5000);
  };

  const startRealTimeUpdates = () => {
    // Start pulse animation for connection
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Start countdown timer
    startCountdownTimer();
  };

  const startCountdownTimer = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    
    const endTime = new Date(statusDetails.estimatedCompletion).getTime();
    
    countdownInterval.current = setInterval(() => {
      const now = new Date().getTime();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval.current);
        setCountdown('00:00:00');
      } else {
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        setCountdown(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);
  };

  const loadDocumentsStatus = async () => {
    try {
      const cachedStatus = await AsyncStorage.getItem('verification_documents_status');
      if (cachedStatus) {
        setDocumentsStatus(JSON.parse(cachedStatus));
      }
    } catch (error) {
      console.error('Error loading documents status:', error);
    }
  };

  const saveVerificationStatus = async (statusData) => {
    try {
      await AsyncStorage.setItem('verification_status', JSON.stringify(statusData));
    } catch (error) {
      console.error('Error saving verification status:', error);
    }
  };

  const updateUserVerificationStatus = async (isVerified, status) => {
    try {
      const userData = await getUserData();
      if (userData) {
        userData.is_verified = isVerified;
        userData.verification_status = status;
        userData.verification_completed_at = new Date().toISOString();
        await saveUserData(userData);
      }
    } catch (error) {
      console.error('Error updating user verification status:', error);
    }
  };

  const animateStatusChange = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showRejectionDetails = (data) => {
    Alert.alert(
      'Rejection Details',
      `Reason: ${data.reason || 'Not specified'}\n\n${data.message || 'No additional details'}`,
      [
        { text: 'OK' },
        { text: 'Contact Support', onPress: () => contactSupport() }
      ]
    );
  };

  const contactSupport = () => {
    const phoneNumber = '+265123456789';
    const message = 'Hello, I need help with my driver verification.';
    
    Alert.alert(
      'Contact Support',
      'Choose how you would like to contact our support team:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Support', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
        { text: 'WhatsApp', onPress: () => Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`) },
        { text: 'Email Support', onPress: () => Linking.openURL('mailto:support@kabaza.com') }
      ]
    );
  };

  const handleActionRequired = (data) => {
    // Navigate to the appropriate screen based on action required
    if (data.actionType === 'upload_document') {
      navigation.navigate('DocumentUpload', { 
        documentType: data.documentType,
        verificationId 
      });
    } else if (data.actionType === 'provide_info') {
      navigation.navigate('AdditionalInfo', { 
        fields: data.requiredFields,
        verificationId 
      });
    }
  };

  const toggleLiveUpdates = () => {
    setLiveUpdates(!liveUpdates);
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'DriverStack' }]
    });
  };

  const handleCheckAgain = () => {
    refreshVerificationStatus();
  };

  // Cleanup
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      // Remove socket listeners
      socketService.off('verification_status_changed', handleVerificationStatusChange);
      socketService.off('admin_message', handleAdminMessage);
      socketService.off('document_validation_update', handleDocumentValidationUpdate);
      socketService.off('support_availability', handleSupportAvailability);
      socketService.off('connection_change', handleConnectionChange);
      socketService.off('verification_progress_update', handleVerificationProgressUpdate);
      
      subscription.remove();
    };
  }, []);

  // ========== RENDER ==========
  const getStatusConfig = () => {
    switch(verificationStatus) {
      case 'pending':
        return { name: 'clock-o', color: '#FFA726', text: 'Pending Review' };
      case 'reviewing':
        return { name: 'search', color: '#2196F3', text: 'Under Review' };
      case 'approved':
        return { name: 'check-circle', color: '#4CAF50', text: 'Approved' };
      case 'rejected':
        return { name: 'times-circle', color: '#F44336', text: 'Rejected' };
      case 'requires_action':
        return { name: 'exclamation-circle', color: '#FF9800', text: 'Action Required' };
      default:
        return { name: 'question-circle', color: '#666', text: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshVerificationStatus}
            colors={['#00B894']}
            tintColor="#00B894"
          />
        }
      >
        {/* Connection Status Bar */}
        <View style={[
          styles.statusBar,
          socketConnected ? styles.statusConnected : styles.statusDisconnected
        ]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={[
              styles.statusDot,
              socketConnected ? styles.statusDotConnected : styles.statusDotDisconnected
            ]} />
          </Animated.View>
          <Text style={styles.statusBarText}>
            {socketConnected ? 'Live updates connected' : 'Offline - updates may be delayed'}
          </Text>
          <TouchableOpacity onPress={toggleLiveUpdates}>
            <Text style={styles.toggleText}>
              {liveUpdates ? 'Live: ON' : 'Live: OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Icon name={statusConfig.name} size={80} color={statusConfig.color} />
            <Text style={[styles.title, { color: statusConfig.color }]}>{statusConfig.text}</Text>
          </Animated.View>

          <Text style={styles.message}>
            {verificationStatus === 'pending' 
              ? 'Your driver verification is being processed. You\'ll receive real-time updates here.'
              : verificationStatus === 'reviewing'
              ? 'Your documents are being reviewed by our verification team.'
              : verificationStatus === 'requires_action'
              ? 'Additional information is required to complete your verification.'
              : 'Verification status update'}
          </Text>

          {/* Verification ID */}
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>Verification ID</Text>
            <Text style={styles.idValue}>{verificationId}</Text>
            <Text style={styles.idSubtext}>Submitted: {new Date(submittedAt).toLocaleDateString()}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Verification Progress</Text>
              <Text style={styles.progressPercentage}>{statusDetails.stepProgress}%</Text>
            </View>
            
            <View style={styles.progressBar}>
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
            
            <Text style={styles.stepDescription}>
              {statusDetails.currentStep.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </Text>
          </View>

          {/* Countdown Timer */}
          <View style={styles.timerCard}>
            <Icon name="clock-o" size={24} color="#FFA500" />
            <View style={styles.timerContent}>
              <Text style={styles.timerLabel}>Estimated completion in</Text>
              <Text style={styles.timerValue}>{countdown}</Text>
              <Text style={styles.timerSubtext}>
                Usually takes 24-48 hours
              </Text>
            </View>
          </View>

          {/* Status Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Status Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>
                {new Date(statusDetails.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Step</Text>
              <Text style={styles.detailValue}>
                {statusDetails.currentStep.split('_').map(word => 
                  word.toUpperCase()
                ).join(' ')}
              </Text>
            </View>
          </View>

          {/* Admin Message */}
          {statusDetails.adminMessage && (
            <View style={styles.messageCard}>
              <Icon name="comment" size={16} color="#1565C0" />
              <Text style={styles.messageText}>
                {statusDetails.adminMessage}
                {statusDetails.contactSupport && '\n\nContact support if you have questions.'}
              </Text>
            </View>
          )}

          {/* Required Actions */}
          {statusDetails.requiredActions.length > 0 && (
            <View style={styles.documentsCard}>
              <Text style={styles.documentsTitle}>Required Actions</Text>
              {statusDetails.requiredActions.map((action, index) => (
                <View key={index} style={styles.documentRow}>
                  <Text style={styles.documentType}>{action.description}</Text>
                  <TouchableOpacity 
                    style={styles.actionButtonSmall}
                    onPress={() => handleActionRequired({ actionType: action.type })}
                  >
                    <Text style={styles.actionButtonText}>Take Action</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#00B894" style={styles.spinner} />
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleCheckAgain}
                  disabled={refreshing}
                >
                  <Icon name="refresh" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {refreshing ? 'Checking...' : 'Check Again'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={contactSupport}
                >
                  <Icon name="life-ring" size={18} color="#00B894" />
                  <Text style={[styles.secondaryButtonText, { color: '#00B894' }]}>
                    Contact Support
                  </Text>
                </TouchableOpacity>
                
                {verificationStatus === 'approved' && (
                  <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={handleGoHome}
                  >
                    <Icon name="home" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.tertiaryButton}
                  onPress={() => navigation.goBack()}
                >
                  <Icon name="arrow-left" size={16} color="#666" />
                  <Text style={styles.tertiaryButtonText}>Go Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Real-time Info */}
          <View style={styles.infoCard}>
            <Icon name="info-circle" size={16} color="#666" />
            <Text style={styles.infoText}>
              {socketConnected 
                ? 'You are receiving live updates. You can continue using the app while waiting.'
                : 'Connect to internet for live updates. Status will refresh when online.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ErrorBoundary>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  statusConnected: {
    backgroundColor: '#E8F5E8',
  },
  statusDisconnected: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDotDisconnected: {
    backgroundColor: '#F44336',
  },
  statusBarText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  toggleText: {
    fontSize: 11,
    color: '#00B894',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  idCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  idLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  idValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  idSubtext: {
    fontSize: 12,
    color: '#666',
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00B894',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    gap: 15,
  },
  timerContent: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  timerSubtext: {
    fontSize: 12,
    color: '#999',
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    width: '100%',
    gap: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 18,
  },
  documentsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  documentType: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  actionButtonSmall: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  spinner: {
    marginVertical: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#00B894',
    borderRadius: 10,
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginBottom: 15,
    gap: 10,
  },
  tertiaryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    gap: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});

export default VerificationPendingScreen;