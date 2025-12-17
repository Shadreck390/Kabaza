// Kabaza/services/notification/PushNotificationService.js
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../socket/socketService';
import { SocketEvents } from '../socket';

class PushNotificationService {
  constructor() {
    this.notificationListeners = new Map();
    this.isConfigured = false;
    this.deviceToken = null;
    this.notificationChannels = {};
    this.badgeCount = 0;
  }

  // ====================
  // INITIALIZATION
  // ====================

  /**
   * Initialize push notifications
   */
  async initialize() {
    try {
      console.log('🔔 Initializing PushNotificationService...');
      
      // Create notification channels (Android)
      this.createNotificationChannels();
      
      // Configure push notifications
      this.configure();
      
      // Setup socket listeners for real-time notifications
      this.setupSocketListeners();
      
      // Load saved badge count
      await this.loadBadgeCount();
      
      console.log('✅ PushNotificationService initialized');
      return true;
      
    } catch (error) {
      console.error('❌ PushNotificationService initialization failed:', error);
      return false;
    }
  }

  /**
   * Create notification channels (Android 8+)
   */
  createNotificationChannels() {
    if (Platform.OS === 'android') {
      // Main channel for all notifications
      PushNotification.createChannel(
        {
          channelId: 'kabaza-general',
          channelName: 'Kabaza Notifications',
          channelDescription: 'General notifications from Kabaza',
          soundName: 'default',
          importance: 4, // IMPORTANCE_HIGH
          vibrate: true,
        },
        (created) => console.log(`Channel 'kabaza-general' created: ${created}`)
      );

      // Ride-related notifications
      PushNotification.createChannel(
        {
          channelId: 'kabaza-rides',
          channelName: 'Ride Updates',
          channelDescription: 'Notifications about your rides',
          soundName: 'ride_notification',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel 'kabaza-rides' created: ${created}`)
      );

      // Payment notifications
      PushNotification.createChannel(
        {
          channelId: 'kabaza-payments',
          channelName: 'Payment Updates',
          channelDescription: 'Notifications about payments',
          soundName: 'payment_notification',
          importance: 3, // IMPORTANCE_DEFAULT
          vibrate: false,
        },
        (created) => console.log(`Channel 'kabaza-payments' created: ${created}`)
      );

      // Chat notifications
      PushNotification.createChannel(
        {
          channelId: 'kabaza-chat',
          channelName: 'Chat Messages',
          channelDescription: 'Notifications for chat messages',
          soundName: 'message_notification',
          importance: 3,
          vibrate: true,
        },
        (created) => console.log(`Channel 'kabaza-chat' created: ${created}`)
      );

      // Emergency/SOS notifications
      PushNotification.createChannel(
        {
          channelId: 'kabaza-emergency',
          channelName: 'Emergency Alerts',
          channelDescription: 'Emergency and SOS notifications',
          soundName: 'sos_alarm',
          importance: 5, // IMPORTANCE_MAX
          vibrate: true,
          vibration: 1000,
        },
        (created) => console.log(`Channel 'kabaza-emergency' created: ${created}`)
      );

      this.notificationChannels = {
        general: 'kabaza-general',
        rides: 'kabaza-rides',
        payments: 'kabaza-payments',
        chat: 'kabaza-chat',
        emergency: 'kabaza-emergency',
      };
    }
  }

  /**
   * Configure push notifications
   */
  configure() {
    if (this.isConfigured) {
      console.log('Push notifications already configured');
      return;
    }

    PushNotification.configure({
      // Called when token is generated
      onRegister: (token) => {
        console.log('📱 Push notification token:', token);
        this.deviceToken = token;
        this.saveDeviceToken(token);
        this.notifyListeners('token_registered', token);
      },

      // Called when notification is received
      onNotification: (notification) => {
        console.log('📢 Notification received:', notification);
        this.handleNotification(notification);
        
        // Update badge count
        this.incrementBadgeCount();
        
        // Required for iOS
        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
        
        this.notifyListeners('notification_received', notification);
      },

      // Called when action button is pressed
      onAction: (notification) => {
        console.log('🔘 Notification action:', notification.action);
        this.notifyListeners('notification_action', notification);
      },

      // Called when registration fails
      onRegistrationError: (error) => {
        console.error('❌ Push notification registration error:', error);
        this.notifyListeners('registration_error', error);
      },

      // Permissions
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Pop initial notification
      popInitialNotification: true,
      
      // Request permissions on start
      requestPermissions: Platform.OS === 'ios',

      // Android only
      senderID: 'YOUR_FCM_SENDER_ID', // Replace with your FCM sender ID
    });

    this.isConfigured = true;
    console.log('✅ Push notifications configured');
  }

  /**
   * Setup socket listeners for real-time notifications
   */
  setupSocketListeners() {
    // Ride notifications
    socketService.on(SocketEvents.RIDE_REQUEST, (data) => {
      this.showRideRequestNotification(data);
    });

    socketService.on(SocketEvents.RIDE_ACCEPTED, (data) => {
      this.showRideAcceptedNotification(data);
    });

    socketService.on(SocketEvents.RIDE_STARTED, (data) => {
      this.showRideStartedNotification(data);
    });

    socketService.on(SocketEvents.RIDE_COMPLETED, (data) => {
      this.showRideCompletedNotification(data);
    });

    socketService.on(SocketEvents.RIDE_CANCELLED, (data) => {
      this.showRideCancelledNotification(data);
    });

    socketService.on(SocketEvents.CHAT_MESSAGE, (data) => {
      this.showChatNotification(data);
    });

    socketService.on(SocketEvents.SOS_ALERT, (data) => {
      this.showSOSNotification(data);
    });

    socketService.on(SocketEvents.PAYMENT_CONFIRMED, (data) => {
      this.showPaymentNotification(data, 'confirmed');
    });

    socketService.on(SocketEvents.PAYMENT_FAILED, (data) => {
      this.showPaymentNotification(data, 'failed');
    });

    // Custom notification events
    socketService.on('notification:system', (data) => {
      this.showSystemNotification(data);
    });

    socketService.on('notification:promotion', (data) => {
      this.showPromotionNotification(data);
    });

    socketService.on('notification:driver', (data) => {
      this.showDriverNotification(data);
    });

    socketService.on('notification:rider', (data) => {
      this.showRiderNotification(data);
    });
  }

  // ====================
  // NOTIFICATION DISPLAY METHODS
  // ====================

  /**
   * Show ride request notification
   */
  showRideRequestNotification(data) {
    const { rideId, passengerName, pickupAddress, fare } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.rides,
      title: '🚖 New Ride Request',
      message: `From ${passengerName} at ${pickupAddress}`,
      data: {
        type: 'ride_request',
        rideId,
        passengerName,
        pickupAddress,
        fare,
        timestamp: Date.now(),
      },
      soundName: 'ride_request.mp3',
      priority: 'high',
      vibration: 300,
      autoCancel: false,
      ongoing: true,
    });
  }

  /**
   * Show ride accepted notification
   */
  showRideAcceptedNotification(data) {
    const { rideId, driverName, eta } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.rides,
      title: '✅ Driver Assigned',
      message: `${driverName} is on the way. ETA: ${eta} min`,
      data: {
        type: 'ride_accepted',
        rideId,
        driverName,
        eta,
        timestamp: Date.now(),
      },
      soundName: 'ride_accepted.mp3',
      priority: 'high',
    });
  }

  /**
   * Show ride started notification
   */
  showRideStartedNotification(data) {
    const { rideId, driverName } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.rides,
      title: '🚗 Ride Started',
      message: `Your ride with ${driverName} has started`,
      data: {
        type: 'ride_started',
        rideId,
        driverName,
        timestamp: Date.now(),
      },
      soundName: 'ride_started.mp3',
    });
  }

  /**
   * Show ride completed notification
   */
  showRideCompletedNotification(data) {
    const { rideId, fare } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.rides,
      title: '💰 Ride Completed',
      message: `Trip completed. Fare: MWK ${fare}`,
      data: {
        type: 'ride_completed',
        rideId,
        fare,
        timestamp: Date.now(),
      },
      soundName: 'ride_completed.mp3',
    });
  }

  /**
   * Show ride cancelled notification
   */
  showRideCancelledNotification(data) {
    const { rideId, reason, cancelledBy } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.rides,
      title: '❌ Ride Cancelled',
      message: `${cancelledBy} cancelled: ${reason}`,
      data: {
        type: 'ride_cancelled',
        rideId,
        reason,
        cancelledBy,
        timestamp: Date.now(),
      },
      soundName: 'ride_cancelled.mp3',
    });
  }

  /**
   * Show chat notification
   */
  showChatNotification(data) {
    const { rideId, message, senderName } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.chat,
      title: `💬 ${senderName}`,
      message: message,
      data: {
        type: 'chat_message',
        rideId,
        senderName,
        message,
        timestamp: Date.now(),
      },
      soundName: 'message.mp3',
      priority: 'default',
      group: `chat_${rideId}`,
      groupSummary: true,
    });
  }

  /**
   * Show SOS notification
   */
  showSOSNotification(data) {
    const { rideId, userName, location } = data;
    
    this.createLocalNotification({
      channelId: this.notificationChannels.emergency,
      title: '🚨 SOS ALERT!',
      message: `${userName} needs immediate assistance!`,
      data: {
        type: 'sos_alert',
        rideId,
        userName,
        location,
        timestamp: Date.now(),
      },
      soundName: 'sos_alarm.mp3',
      priority: 'max',
      vibration: 1000,
      ongoing: true,
      autoCancel: false,
    });
  }

  /**
   * Show payment notification
   */
  showPaymentNotification(data, status) {
    const { rideId, amount, transactionId } = data;
    
    const statusText = status === 'confirmed' ? 'Payment Confirmed' : 'Payment Failed';
    const emoji = status === 'confirmed' ? '💳' : '❌';
    
    this.createLocalNotification({
      channelId: this.notificationChannels.payments,
      title: `${emoji} ${statusText}`,
      message: `MWK ${amount} ${status === 'confirmed' ? 'received' : 'failed'}`,
      data: {
        type: 'payment',
        rideId,
        amount,
        transactionId,
        status,
        timestamp: Date.now(),
      },
      soundName: status === 'confirmed' ? 'payment_success.mp3' : 'payment_failed.mp3',
    });
  }

  /**
   * Show system notification
   */
  showSystemNotification(data) {
    this.createLocalNotification({
      channelId: this.notificationChannels.general,
      title: data.title || '📢 System Update',
      message: data.message,
      data: {
        type: 'system',
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Show promotion notification
   */
  showPromotionNotification(data) {
    this.createLocalNotification({
      channelId: this.notificationChannels.general,
      title: '🎉 ' + (data.title || 'Special Offer'),
      message: data.message,
      data: {
        type: 'promotion',
        ...data,
        timestamp: Date.now(),
      },
      soundName: 'promotion.mp3',
    });
  }

  /**
   * Show driver-specific notification
   */
  showDriverNotification(data) {
    this.createLocalNotification({
      channelId: this.notificationChannels.general,
      title: '👤 ' + (data.title || 'Driver Update'),
      message: data.message,
      data: {
        type: 'driver',
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Show rider-specific notification
   */
  showRiderNotification(data) {
    this.createLocalNotification({
      channelId: this.notificationChannels.general,
      title: '👤 ' + (data.title || 'Rider Update'),
      message: data.message,
      data: {
        type: 'rider',
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  // ====================
  // CORE NOTIFICATION METHODS
  // ====================

  /**
   * Create local notification
   */
  createLocalNotification(config) {
    const defaultConfig = {
      /* Android Only Properties */
      channelId: this.notificationChannels.general,
      autoCancel: true,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: config.message,
      subText: 'Kabaza',
      color: '#00B894',
      vibrate: true,
      vibration: 300,
      tag: 'kabaza_notification',
      group: config.group || 'kabaza',
      groupSummary: config.groupSummary || false,
      ongoing: config.ongoing || false,
      priority: config.priority || 'high',
      visibility: 'public',
      importance: 'high',
      allowWhileIdle: true,

      /* iOS and Android properties */
      title: config.title,
      message: config.message,
      playSound: true,
      soundName: config.soundName || 'default',
      number: this.badgeCount + 1,
      data: config.data || {},
      userInfo: config.data || {},
    };

    PushNotification.localNotification(defaultConfig);
    
    // Increment badge count
    this.incrementBadgeCount();
    
    console.log('📢 Notification shown:', config.title);
  }

  /**
   * Create scheduled notification
   */
  createScheduledNotification(config, date) {
    PushNotification.localNotificationSchedule({
      ...config,
      date: date,
      allowWhileIdle: true,
    });
  }

  /**
   * Cancel all notifications
   */
  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
    this.resetBadgeCount();
    console.log('🗑️ All notifications cancelled');
  }

  /**
   * Cancel specific notification by ID/tag
   */
  cancelNotification(identifier) {
    PushNotification.cancelLocalNotifications({ id: identifier });
    console.log(`🗑️ Notification cancelled: ${identifier}`);
  }

  /**
   * Clear specific notification by tag
   */
  clearNotification(tag) {
    PushNotification.clearLocalNotification(tag);
    console.log(`🗑️ Notification cleared: ${tag}`);
  }

  // ====================
  // BADGE MANAGEMENT
  // ====================

  /**
   * Load badge count from storage
   */
  async loadBadgeCount() {
    try {
      const savedCount = await AsyncStorage.getItem('notification_badge_count');
      this.badgeCount = savedCount ? parseInt(savedCount) : 0;
      this.setApplicationBadgeCount(this.badgeCount);
    } catch (error) {
      console.error('❌ Failed to load badge count:', error);
      this.badgeCount = 0;
    }
  }

  /**
   * Save badge count to storage
   */
  async saveBadgeCount() {
    try {
      await AsyncStorage.setItem('notification_badge_count', this.badgeCount.toString());
    } catch (error) {
      console.error('❌ Failed to save badge count:', error);
    }
  }

  /**
   * Increment badge count
   */
  incrementBadgeCount() {
    this.badgeCount += 1;
    this.setApplicationBadgeCount(this.badgeCount);
    this.saveBadgeCount();
  }

  /**
   * Decrement badge count
   */
  decrementBadgeCount() {
    this.badgeCount = Math.max(0, this.badgeCount - 1);
    this.setApplicationBadgeCount(this.badgeCount);
    this.saveBadgeCount();
  }

  /**
   * Reset badge count
   */
  resetBadgeCount() {
    this.badgeCount = 0;
    this.setApplicationBadgeCount(0);
    this.saveBadgeCount();
  }

  /**
   * Set application badge count
   */
  setApplicationBadgeCount(count) {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    } else {
      PushNotification.setApplicationIconBadgeNumber(count);
    }
  }

  // ====================
  // DEVICE TOKEN MANAGEMENT
  // ====================

  /**
   * Save device token to storage
   */
  async saveDeviceToken(token) {
    try {
      await AsyncStorage.setItem('push_notification_token', JSON.stringify(token));
      
      // Send token to your backend
      await this.sendTokenToServer(token);
      
    } catch (error) {
      console.error('❌ Failed to save device token:', error);
    }
  }

  /**
   * Send token to server (implement your API call)
   */
  async sendTokenToServer(token) {
    try {
      // Implement your API call here
      // Example:
      // await api.post('/notifications/register', { token });
      
      console.log('📤 Device token sent to server');
      return true;
    } catch (error) {
      console.error('❌ Failed to send token to server:', error);
      return false;
    }
  }

  /**
   * Get saved device token
   */
  async getDeviceToken() {
    try {
      if (this.deviceToken) {
        return this.deviceToken;
      }
      
      const savedToken = await AsyncStorage.getItem('push_notification_token');
      return savedToken ? JSON.parse(savedToken) : null;
      
    } catch (error) {
      console.error('❌ Failed to get device token:', error);
      return null;
    }
  }

  // ====================
  // PERMISSIONS
  // ====================

  /**
   * Check notification permissions
   */
  async checkPermissions() {
    return new Promise((resolve) => {
      PushNotification.checkPermissions(resolve);
    });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    return new Promise((resolve) => {
      PushNotification.requestPermissions(resolve);
    });
  }

  /**
   * Check if permissions are granted
   */
  async hasPermission() {
    const permissions = await this.checkPermissions();
    return permissions.alert === true && permissions.badge === true && permissions.sound === true;
  }

  // ====================
  // NOTIFICATION HANDLER
  // ====================

  /**
   * Handle incoming notification
   */
  handleNotification(notification) {
    const { data, message, title } = notification;
    
    // Log notification
    console.log('📥 Handling notification:', { title, message, data });
    
    // Notify listeners
    this.notifyListeners('notification', notification);
    
    // Handle based on type
    if (data && data.type) {
      this.notifyListeners(`notification:${data.type}`, notification);
    }
  }

  // ====================
  // EVENT LISTENERS
  // ====================

  /**
   * Add notification listener
   */
  addListener(event, callback) {
    if (!this.notificationListeners.has(event)) {
      this.notificationListeners.set(event, []);
    }
    
    this.notificationListeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.notificationListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Remove listener
   */
  removeListener(event, callback) {
    if (this.notificationListeners.has(event)) {
      const listeners = this.notificationListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify all listeners for an event
   */
  notifyListeners(event, data) {
    if (this.notificationListeners.has(event)) {
      this.notificationListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.notificationListeners.clear();
  }

  // ====================
  // UTILITY METHODS
  // ====================

  /**
   * Get scheduled notifications
   */
  getScheduledNotifications() {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications(resolve);
    });
  }

  /**
   * Get delivered notifications (iOS only)
   */
  getDeliveredNotifications() {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        PushNotificationIOS.getDeliveredNotifications(resolve);
      });
    }
    return Promise.resolve([]);
  }

  /**
   * Remove delivered notifications (iOS only)
   */
  removeDeliveredNotifications(identifiers) {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeDeliveredNotifications(identifiers);
    }
  }

  /**
   * Get notification channels (Android only)
   */
  getNotificationChannels() {
    return this.notificationChannels;
  }

  // ====================
  // CLEANUP
  // ====================

  cleanup() {
    this.removeAllListeners();
    this.cancelAllNotifications();
    console.log('🧹 PushNotificationService cleanup complete');
  }
}

// Create and export singleton instance
const pushNotificationServiceInstance = new PushNotificationService();
export default pushNotificationServiceInstance;