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
import { getUserData, saveUserData } from '@src/utils/userStorage';
import socketService from '@services/socket/socketService';

export default function VerificationPendingScreen({ navigation, route }) {
  // 🚀 SIMPLE BYPASS - KEEP THIS AT THE TOP
  useEffect(() => {
    console.log('🚀 Bypassing verification screen...');
    setTimeout(() => {
      navigation.replace('DriverStack');
    }, 100);
  }, [navigation]);

  // ========== STATE DECLARATIONS ==========
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('approved');
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

  // ========== ALL YOUR FUNCTIONS HERE ==========
  
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

  // ... ALL OTHER FUNCTIONS CONTINUE HERE ...

  // ========== JSX RENDER ==========
  const statusIcon = { name: 'check-circle', color: '#4CAF50' };
  const statusText = 'Approved';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => {}} // Empty function since we're bypassing
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
        <TouchableOpacity onPress={() => {}}>
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
            Document verification in progress
          </Text>
        </View>

        {/* Countdown Timer */}
        <View style={styles.timerCard}>
          <Icon name="clock-o" size={24} color="#FFA500" />
          <View style={styles.timerContent}>
            <Text style={styles.timerLabel}>Estimated completion in</Text>
            <Text style={styles.timerValue}>00:00:00</Text>
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
            <Text style={styles.detailValue}>{new Date().toLocaleDateString()}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Step</Text>
            <Text style={styles.detailValue}>
              DOCUMENT REVIEW
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <ActivityIndicator size="large" color="#00B894" style={styles.spinner} />
        </View>

        {/* Real-time Info */}
        <View style={styles.infoCard}>
          <Icon name="info-circle" size={16} color="#666" />
          <Text style={styles.infoText}>
            Connect to internet for live updates. Status will refresh when online.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  // ... keep all your style definitions ...
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