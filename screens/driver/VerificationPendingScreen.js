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
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIXED IMPORTS:
import { getUserData, saveUserData } from '@utils/userStorage';
import socketService from '@services/socket/socketService';

export default function VerificationPendingScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, reviewing, approved, rejected
  const [statusDetails, setStatusDetails] = useState({
    submittedAt: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
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

  // Initialize real-time verification tracking
  useEffect(() => {
    initializeVerificationTracking();
    
    // Load saved status
    loadVerificationStatus();
    
    // Setup app state listener
    AppState.addEventListener('change', handleAppStateChange);
    
    // Start countdown
    startCountdown();
    
    return () => {
      cleanup();
    };
  }, []);

  // Animate progress when status changes
  useEffect(() => {
    animateProgress();
  }, [statusDetails.stepProgress]);

  const initializeVerificationTracking = async () => {
    try {
      setLoading(true);
      
      // Initialize socket connection
      if (!socketService.isConnected?.()) {
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
    
    // Update user data
    updateUserVerificationStatus(false, 'rejected');
    
    Alert.alert(
      'Verification Rejected',
      data.message || 'Your verification was rejected. Please check the details below.',
      [
        { text: 'View Details', onPress: () => showRejectionDetails(data) },
        { text: 'Contact Support', onPress: () => openSupportChat(data) }
      ]
    );
  };

  const handleVerificationReviewing = (data) => {
    console.log('Verification now under review');
    
    // Show notification
    Alert.alert(
      'Verification Under Review',
      'An admin is now reviewing your documents. This may take 1-2 hours.',
      [{ text: 'OK' }]
    );
    
    // Update progress
    setStatusDetails(prev => ({
      ...prev,
      currentStep: 'admin_review',
      stepProgress: 75
    }));
  };

  const handleRequiresAction = (data) => {
    console.log('Verification requires action:', data);
    
    Alert.alert(
      'Action Required',
      'Additional information is needed to complete your verification.',
      [
        { text: 'View Requirements', onPress: () => showRequiredActions(data) },
        { text: 'Upload Now', onPress: () => navigateToUpload(data) }
      ]
    );
  };

  const handleAdminMessage = (messageData) => {
    console.log('Admin message received:', messageData);
    
    Alert.alert(
      'Message from Admin',
      messageData.message,
      [
        { text: 'Dismiss' },
        { 
          text: 'Reply', 
          onPress: () => openAdminChat(messageData.adminId) 
        }
      ]
    );
    
    // Save message
    saveAdminMessage(messageData);
  };

  const handleDocumentValidationUpdate = (validationData) => {
    console.log('Document validation update:', validationData);
    
    // Update document status
    setDocumentsStatus(prev => ({
      ...prev,
      [validationData.documentType]: validationData
    }));
    
    // Show notification for invalid documents
    if (validationData.status === 'invalid') {
      Alert.alert(
        'Document Issue',
        `${validationData.documentType}: ${validationData.message}`,
        [
          { text: 'Dismiss' },
          { 
            text: 'Re-upload', 
            onPress: () => navigateToDocumentUpload(validationData.documentType) 
          }
        ]
      );
    }
  };

  const handleSupportAvailability = (availabilityData) => {
    console.log('Support availability:', availabilityData);
    setSupportOnline(availabilityData.online);
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
    console.log('Verification progress update:', progressData);
    
    setStatusDetails(prev => ({
      ...prev,
      currentStep: progressData.currentStep,
      stepProgress: progressData.progress,
      estimatedCompletion: progressData.estimatedCompletion || prev.estimatedCompletion
    }));
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, refresh status
      refreshVerificationStatus();
    }
    appState.current = nextAppState;
  };

  const joinVerificationRoom = async () => {
    try {
      const userData = await getUserData();
      const userId = userData?.id;
      
      if (userId && socketService.isConnected?.()) {
        socketService.emit('join_verification_room', {
          verificationId,
          userId,
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
      const userData = await getUserData();
      const userId = userData?.id;
      
      if (userId && socketService.isConnected?.()) {
        socketService.emit('request_verification_status', {
          verificationId,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error requesting verification status:', error);
    }
  };

  const loadVerificationStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem(`verification_${verificationId}`);
      if (savedStatus) {
        const statusData = JSON.parse(savedStatus);
        setVerificationStatus(statusData.status);
        setStatusDetails(prev => ({
          ...prev,
          ...statusData.details,
          lastUpdated: statusData.lastUpdated
        }));
      }
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const loadDocumentsStatus = async () => {
    try {
      const docsStatus = await AsyncStorage.getItem(`verification_docs_${verificationId}`);
      if (docsStatus) {
        setDocumentsStatus(JSON.parse(docsStatus));
      }
    } catch (error) {
      console.error('Error loading documents status:', error);
    }
  };

  const saveVerificationStatus = async (statusData) => {
    try {
      const statusToSave = {
        status: statusData.status,
        details: {
          ...statusDetails,
          adminMessage: statusData.message,
          requiredActions: statusData.requiredActions || [],
          lastUpdated: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(`verification_${verificationId}`, JSON.stringify(statusToSave));
      
      // Also update documents status
      await AsyncStorage.setItem(`verification_docs_${verificationId}`, JSON.stringify(documentsStatus));
      
    } catch (error) {
      console.error('Error saving verification status:', error);
    }
  };

  const saveAdminMessage = async (messageData) => {
    try {
      const savedMessages = await AsyncStorage.getItem(`verification_messages_${verificationId}`) || '[]';
      const messages = JSON.parse(savedMessages);
      messages.push({
        ...messageData,
        receivedAt: new Date().toISOString()
      });
      
      await AsyncStorage.setItem(`verification_messages_${verificationId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving admin message:', error);
    }
  };

  const updateUserVerificationStatus = async (isVerified, status) => {
    try {
      const userData = await getUserData();
      const updatedData = {
        ...userData,
        driverProfile: {
          ...userData?.driverProfile,
          isVerified,
          verificationStatus: status,
          verifiedAt: status === 'approved' ? new Date().toISOString() : null
        }
      };
      
      await saveUserData(updatedData);
    } catch (error) {
      console.error('Error updating user verification status:', error);
    }
  };

  const startRealTimeUpdates = () => {
    // Start pulse animation for live updates
    startPulseAnimation();
    
    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: statusDetails.stepProgress / 100,
      duration: 1000,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const startPulseAnimation = () => {
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
  };

  const animateStatusChange = () => {
    // Fade in/out animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
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

  const animateProgress = () => {
    Animated.timing(progressAnim, {
      toValue: statusDetails.stepProgress / 100,
      duration: 500,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const startCountdown = () => {
    const endTime = new Date(statusDetails.estimatedCompletion).getTime();
    
    countdownInterval.current = setInterval(() => {
      const now = new Date().getTime();
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval.current);
        setCountdown('00:00:00');
        return;
      }
      
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
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
    }, 5000); // Try to reconnect after 5 seconds
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    await requestVerificationStatus();
    setTimeout(() => setLoading(false), 1000);
  };

  const openSupportChat = () => {
    if (socketConnected) {
      navigation.navigate('VerificationSupportChat', {
        verificationId,
        supportOnline
      });
    } else {
      Alert.alert('Offline', 'Please connect to internet for live support');
    }
  };

  const openAdminChat = (adminId) => {
    navigation.navigate('AdminChat', {
      adminId,
      verificationId
    });
  };

  const showRejectionDetails = (rejectionData) => {
    Alert.alert(
      'Rejection Details',
      `Reason: ${rejectionData.message}\n\nIssues:\n${rejectionData.issues?.join('\n• ') || 'None specified'}`,
      [
        { text: 'OK' },
        { text: 'Contact Support', onPress: openSupportChat },
        { text: 'Re-submit', onPress: () => navigation.navigate('DriverVerification') }
      ]
    );
  };

  const showRequiredActions = (actionData) => {
    Alert.alert(
      'Required Actions',
      `Please provide:\n\n${actionData.requiredActions?.join('\n• ') || 'Additional documentation'}`,
      [
        { text: 'OK' },
        { text: 'Upload Now', onPress: () => navigateToUpload(actionData) }
      ]
    );
  };

  const navigateToUpload = (data) => {
    navigation.navigate('UploadAdditionalDocs', {
      verificationId,
      requiredActions: data.requiredActions
    });
  };

  const navigateToDocumentUpload = (documentType) => {
    navigation.navigate('DocumentUpload', {
      documentType,
      verificationId
    });
  };

  const toggleLiveUpdates = () => {
    const newState = !liveUpdates;
    setLiveUpdates(newState);
    
    if (newState) {
      startRealTimeUpdates();
    } else {
      pulseAnim.stopAnimation();
    }
    
    AsyncStorage.setItem('verification_live_updates', JSON.stringify(newState));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusIcon = () => {
    switch(verificationStatus) {
      case 'approved': return { name: 'check-circle', color: '#4CAF50' };
      case 'rejected': return { name: 'times-circle', color: '#F44336' };
      case 'reviewing': return { name: 'search', color: '#2196F3' };
      case 'requires_action': return { name: 'exclamation-circle', color: '#FF9800' };
      default: return { name: 'clock-o', color: '#FFA500' };
    }
  };

  const getStatusText = () => {
    switch(verificationStatus) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'reviewing': return 'Under Review';
      case 'requires_action': return 'Action Required';
      default: return 'Pending Review';
    }
  };

  const getStepDescription = (step) => {
    const steps = {
      'document_review': 'Document verification in progress',
      'background_check': 'Background check being processed',
      'admin_review': 'Admin reviewing your application',
      'final_approval': 'Final approval pending',
      'completed': 'Verification complete'
    };
    return steps[step] || 'Verification in progress';
  };

  const cleanup = () => {
    // Clear intervals
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    // Stop animations
    pulseAnim.stopAnimation();
    fadeAnim.stopAnimation();
    progressAnim.stopAnimation();
    
    // Remove socket listeners
    socketService.off('verification_status_changed', handleVerificationStatusChange);
    socketService.off('admin_message', handleAdminMessage);
    socketService.off('document_validation_update', handleDocumentValidationUpdate);
    socketService.off('support_availability', handleSupportAvailability);
    socketService.off('connection_change', handleConnectionChange);
    socketService.off('verification_progress_update', handleVerificationProgressUpdate);
    
    // Leave verification room
    if (socketService.isConnected?.()) {
      socketService.emit('leave_verification_room', { verificationId });
    }
    
    // Remove app state listener
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  return (
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
          <Icon name={statusIcon.name} size={80} color={statusIcon.color} />
          <Text style={[styles.title, { color: statusIcon.color }]}>{statusText}</Text>
        </Animated.View>

        <Text style={styles.message}>
          Your driver verification is being processed. You'll receive real-time updates here.
        </Text>

        {/* Verification ID */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Verification ID</Text>
          <Text style={styles.idValue}>{verificationId}</Text>
          <Text style={styles.idSubtext}>Submitted: {formatDate(submittedAt)}</Text>
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
            {getStepDescription(statusDetails.currentStep)}
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
            <Text style={styles.detailValue}>{formatDate(statusDetails.lastUpdated)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Step</Text>
            <Text style={styles.detailValue}>
              {statusDetails.currentStep.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          
          {statusDetails.adminMessage && (
            <View style={styles.messageCard}>
              <Icon name="comment" size={16} color="#2196F3" />
              <Text style={styles.messageText}>{statusDetails.adminMessage}</Text>
            </View>
          )}
        </View>

        {/* Document Status */}
        {Object.keys(documentsStatus).length > 0 && (
          <View style={styles.documentsCard}>
            <Text style={styles.documentsTitle}>Document Status</Text>
            {Object.entries(documentsStatus).map(([docType, status]) => (
              <View key={docType} style={styles.documentRow}>
                <Icon 
                  name={status.status === 'valid' ? 'check-circle' : 'exclamation-circle'} 
                  size={16} 
                  color={status.status === 'valid' ? '#4CAF50' : '#FF9800'} 
                />
                <Text style={styles.documentType}>
                  {docType.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={[
                  styles.documentStatus,
                  { color: status.status === 'valid' ? '#4CAF50' : '#FF9800' }
                ]}>
                  {status.status.toUpperCase()}
                </Text>
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
                onPress={handleCheckStatus}
              >
                <Icon name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Refresh Status</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={openSupportChat}
                disabled={!socketConnected}
              >
                <Icon 
                  name="headphones" 
                  size={18} 
                  color={socketConnected ? '#00B894' : '#ccc'} 
                />
                <Text style={[
                  styles.secondaryButtonText,
                  { color: socketConnected ? '#00B894' : '#ccc' }
                ]}>
                  {supportOnline ? 'Live Support' : 'Contact Support'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.tertiaryButton}
                onPress={() => navigation.navigate('DriverVerification')}
              >
                <Icon name="edit" size={16} color="#666" />
                <Text style={styles.tertiaryButtonText}>Edit Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Real-time Info */}
        <View style={styles.infoCard}>
          <Icon name="info-circle" size={16} color="#666" />
          <Text style={styles.infoText}>
            {socketConnected 
              ? 'You will receive real-time updates here. Keep this screen open for instant notifications.'
              : 'Connect to internet for live updates. Status will refresh when online.'
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  documentStatus: {
    fontSize: 12,
    fontWeight: '600',
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
  backButton: {
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
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