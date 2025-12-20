// screens/common/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  RefreshControl,
  Switch,
  Alert,
  FlatList,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const NOTIFICATION_TYPES = {
  RIDE: 'ride',
  PAYMENT: 'payment',
  PROMOTION: 'promotion',
  SECURITY: 'security',
  SYSTEM: 'system',
  SUPPORT: 'support',
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, ride, payment, promotion
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    rideUpdates: true,
    promotions: true,
    reminders: true,
    sound: true,
    vibration: true,
    pushNotifications: true,
  });

  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Try to load from AsyncStorage first
      const savedNotifications = await AsyncStorage.getItem('user_notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        // Apply filter
        const filtered = applyFilter(parsed, filter);
        setNotifications(filtered);
      } else {
        // Load mock data
        const mockNotifications = getMockNotifications();
        const filtered = applyFilter(mockNotifications, filter);
        setNotifications(filtered);
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockNotifications = () => [
    {
      id: '1',
      type: NOTIFICATION_TYPES.RIDE,
      title: 'Ride Request Accepted',
      message: 'John Banda has accepted your ride request. ETA: 5 minutes',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      read: false,
      data: { rideId: 'ride-001' },
      icon: 'directions-car',
      color: '#3B82F6',
    },
    {
      id: '2',
      type: NOTIFICATION_TYPES.PAYMENT,
      title: 'Payment Successful',
      message: 'MK 850 has been deducted from your wallet for ride #RIDE-001',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      read: true,
      data: { transactionId: 'tx-001', amount: 850 },
      icon: 'check-circle',
      color: '#22C55E',
    },
    {
      id: '3',
      type: NOTIFICATION_TYPES.PROMOTION,
      title: 'Weekend Special!',
      message: 'Get 20% off on all Kabaza rides this weekend. Use code: WEEKEND20',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      read: true,
      data: { promoCode: 'WEEKEND20' },
      icon: 'local-offer',
      color: '#F59E0B',
    },
    {
      id: '4',
      type: NOTIFICATION_TYPES.SECURITY,
      title: 'Security Alert',
      message: 'New login detected from iPhone 14. If this wasn\'t you, please secure your account.',
      timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
      read: false,
      data: { device: 'iPhone 14' },
      icon: 'security',
      color: '#EF4444',
    },
    {
      id: '5',
      type: NOTIFICATION_TYPES.RIDE,
      title: 'Ride Completed',
      message: 'Your ride with Sarah Mwale has been completed. Please rate your experience.',
      timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      read: true,
      data: { rideId: 'ride-002', driverId: 'driver-002' },
      icon: 'done-all',
      color: '#3B82F6',
    },
    {
      id: '6',
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'App Update Available',
      message: 'Update to version 2.0.1 for new features and bug fixes.',
      timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      read: true,
      data: { version: '2.0.1' },
      icon: 'system-update',
      color: '#8B5CF6',
    },
    {
      id: '7',
      type: NOTIFICATION_TYPES.SUPPORT,
      title: 'Support Request Update',
      message: 'Your support ticket #TICKET-001 has been resolved.',
      timestamp: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
      read: true,
      data: { ticketId: 'TICKET-001' },
      icon: 'support-agent',
      color: '#3B82F6',
    },
    {
      id: '8',
      type: NOTIFICATION_TYPES.PROMOTION,
      title: 'Referral Bonus!',
      message: 'You earned MK 500 for referring a friend. Your balance is now MK 1,500.',
      timestamp: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
      read: true,
      data: { amount: 500, balance: 1500 },
      icon: 'people',
      color: '#F59E0B',
    },
  ];

  const applyFilter = (notificationsList, currentFilter) => {
    let filtered = [...notificationsList];
    
    switch (currentFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'ride':
        filtered = filtered.filter(n => n.type === NOTIFICATION_TYPES.RIDE);
        break;
      case 'payment':
        filtered = filtered.filter(n => n.type === NOTIFICATION_TYPES.PAYMENT);
        break;
      case 'promotion':
        filtered = filtered.filter(n => n.type === NOTIFICATION_TYPES.PROMOTION);
        break;
      case 'security':
        filtered = filtered.filter(n => n.type === NOTIFICATION_TYPES.SECURITY);
        break;
      default:
        // 'all' - no filtering
        break;
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        setNotificationSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (settings) => {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    const updatedNotifications = notifications.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('user_notifications', JSON.stringify(updatedNotifications));

    // Navigate based on notification type
    switch (notification.type) {
      case NOTIFICATION_TYPES.RIDE:
        if (notification.data?.rideId) {
          navigation.navigate('RideDetails', { rideId: notification.data.rideId });
        }
        break;
      case NOTIFICATION_TYPES.PAYMENT:
        navigation.navigate('TransactionHistory');
        break;
      case NOTIFICATION_TYPES.PROMOTION:
        if (notification.data?.promoCode) {
          navigation.navigate('Promotions', { promoCode: notification.data.promoCode });
        }
        break;
      case NOTIFICATION_TYPES.SECURITY:
        navigation.navigate('SecuritySettings');
        break;
      case NOTIFICATION_TYPES.SYSTEM:
        // Handle app update
        Alert.alert(
          'App Update',
          'Would you like to update now?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Update', onPress: () => console.log('Update initiated') },
          ]
        );
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    await AsyncStorage.setItem('user_notifications', JSON.stringify(updatedNotifications));
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setNotifications([]);
            await AsyncStorage.removeItem('user_notifications');
          },
        },
      ]
    );
  };

  const handleToggleSetting = (setting) => {
    const updatedSettings = {
      ...notificationSettings,
      [setting]: !notificationSettings[setting],
    };
    saveNotificationSettings(updatedSettings);
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notificationDate = new Date(timestamp);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notificationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNotificationItem = ({ item }) => {
    const isUnread = !item.read;
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.notificationIcon, { backgroundColor: `${item.color}15` }]}>
          <MaterialIcon name={item.icon} size={24} color={item.color} />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          {item.data?.promoCode && (
            <View style={styles.promoCodeContainer}>
              <Text style={styles.promoCodeText}>Code: {item.data.promoCode}</Text>
            </View>
          )}
        </View>
        
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderSettingsSection = () => (
    <View style={styles.settingsSection}>
      <Text style={styles.sectionTitle}>Notification Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialIcon name="directions-car" size={24} color="#3B82F6" />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingText}>Ride Updates</Text>
            <Text style={styles.settingDescription}>Ride status and driver updates</Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.rideUpdates}
          onValueChange={() => handleToggleSetting('rideUpdates')}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialIcon name="local-offer" size={24} color="#F59E0B" />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingText}>Promotions</Text>
            <Text style={styles.settingDescription}>Special offers and discounts</Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.promotions}
          onValueChange={() => handleToggleSetting('promotions')}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialIcon name="alarm" size={24} color="#8B5CF6" />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingText}>Reminders</Text>
            <Text style={styles.settingDescription}>Payment and schedule reminders</Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.reminders}
          onValueChange={() => handleToggleSetting('reminders')}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialIcon name="volume-up" size={24} color="#22C55E" />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingText}>Sound</Text>
            <Text style={styles.settingDescription}>Play sound for notifications</Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.sound}
          onValueChange={() => handleToggleSetting('sound')}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialIcon name="vibration" size={24} color="#3B82F6" />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingText}>Vibration</Text>
            <Text style={styles.settingDescription}>Vibrate for notifications</Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.vibration}
          onValueChange={() => handleToggleSetting('vibration')}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialIcon name="notifications" size={24} color="#EF4444" />
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingText}>Push Notifications</Text>
            <Text style={styles.settingDescription}>Receive push notifications</Text>
          </View>
        </View>
        <Switch
          value={notificationSettings.pushNotifications}
          onValueChange={() => handleToggleSetting('pushNotifications')}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcon name="notifications-none" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyText}>
        {filter === 'unread' 
          ? 'You have no unread notifications' 
          : 'Your notifications will appear here'}
      </Text>
      {filter !== 'all' && (
        <TouchableOpacity 
          style={styles.resetFilterButton}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.resetFilterText}>Show All Notifications</Text>
        </TouchableOpacity>
      )}
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
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.headerAction}
                onPress={handleMarkAllAsRead}
              >
                <MaterialIcon name="drafts" size={20} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerAction}
                onPress={handleClearAll}
              >
                <MaterialIcon name="delete" size={20} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread' },
          { id: 'ride', label: 'Rides' },
          { id: 'payment', label: 'Payments' },
          { id: 'promotion', label: 'Promotions' },
          { id: 'security', label: 'Security' },
        ].map((filterType) => {
          const isActive = filter === filterType.id;
          const unreadCount = filterType.id === 'unread' 
            ? notifications.filter(n => !n.read).length 
            : 0;
          
          return (
            <TouchableOpacity
              key={filterType.id}
              style={[
                styles.filterButton,
                isActive && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterType.id)}
            >
              <Text style={[
                styles.filterText,
                isActive && styles.filterTextActive,
              ]}>
                {filterType.label}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#22C55E']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications List */}
        <View style={styles.notificationsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filter === 'all' ? 'All Notifications' : 
               filter === 'unread' ? 'Unread Notifications' :
               `${filter.charAt(0).toUpperCase() + filter.slice(1)} Notifications`}
            </Text>
            <Text style={styles.notificationCount}>
              {notifications.length} {notifications.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          
          {notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>

        {/* Notification Settings */}
        {renderSettingsSection()}
        
        {/* Help Section */}
        <TouchableOpacity 
          style={styles.helpCard}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <MaterialIcon name="help" size={24} color="#3B82F6" />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Need help with notifications?</Text>
            <Text style={styles.helpText}>
              Visit our help center for notification troubleshooting
            </Text>
          </View>
          <MaterialIcon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#22C55E',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    marginLeft: 6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  notificationCount: {
    fontSize: 14,
    color: '#666',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#F0F9F0',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  promoCodeContainer: {
    backgroundColor: '#FEFCE8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  promoCodeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  separator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  resetFilterButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  helpContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
  },
});