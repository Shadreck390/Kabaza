// screens/driver/EarningsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Animated, Easing, ActivityIndicator, Alert, AppState
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Header from 'components/Header';
import Loading from 'components/Loading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from 'services/socket'; // Your existing socket service
import { useSelector } from 'react-redux';

export default function EarningsScreen({ route, navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [earningsData, setEarningsData] = useState({
    today: { amount: 0, rides: 0, hours: 0, date: new Date().toISOString().split('T')[0] },
    week: { amount: 0, rides: 0, hours: 0, startDate: '', endDate: '' },
    month: { amount: 0, rides: 0, hours: 0, month: new Date().getMonth(), year: new Date().getFullYear() },
    total: { amount: 0, rides: 0, hours: 0 }
  });
  
  const [liveUpdates, setLiveUpdates] = useState({
    enabled: true,
    lastUpdate: null,
    connectionStatus: 'connecting',
    newEarnings: 0,
    pendingRides: [],
    instantNotifications: true
  });
  
  const [detailedEarnings, setDetailedEarnings] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState({
    currentSessionEarnings: 0,
    onlineSince: null,
    currentRide: null,
    earningsPerHour: 0
  });
  
  const [animatedValue] = useState(new Animated.Value(0));
  const [counterAnim] = useState(new Animated.Value(0));
  const appState = useRef(AppState.currentState);
  const lastEarningUpdateRef = useRef(null);
  const earningsUpdateInterval = useRef(null);
  const socketReconnectTimeout = useRef(null);

  const user = useSelector(state => state.auth.user);
  const { phone, authMethod, socialUserInfo, userProfile } = route.params || {};

  // Get user info
  const getUserInfo = () => {
    if (userProfile?.fullName) return userProfile.fullName;
    if (socialUserInfo?.name) return socialUserInfo.name;
    if (user?.name) return user.name;
    if (phone) return `Driver (${phone})`;
    return "Driver";
  };

  // Initialize socket and load data
  useEffect(() => {
    initializeRealTimeEarnings();
    
    AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      cleanup();
    };
  }, []);

  // Handle period change
  useEffect(() => {
    if (selectedPeriod && earningsData[selectedPeriod]) {
      fetchDetailedEarnings(selectedPeriod);
    }
  }, [selectedPeriod]);

  const initializeRealTimeEarnings = async () => {
    try {
      // Load cached earnings
      await loadCachedEarnings();
      
      // Initialize socket connection for real-time earnings
      if (!socketService.isConnected?.()) {
        await socketService.initialize();
      }
      
      // Set up socket listeners
      setupSocketListeners();
      
      // Start real-time updates
      startRealTimeUpdates();
      
      // Fetch fresh data from API
      await fetchEarningsData();
      
      // Start earnings counter animation
      animateCounter();
      
    } catch (error) {
      console.error('Earnings initialization error:', error);
      setLiveUpdates(prev => ({ ...prev, connectionStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for new earnings in real-time
    socketService.on('new_earning', handleNewEarning);
    
    // Listen for ride completion
    socketService.on('ride_completed', handleRideCompleted);
    
    // Listen for bonuses
    socketService.on('bonus_added', handleBonusAdded);
    
    // Listen for tips
    socketService.on('tip_received', handleTipReceived);
    
    // Listen for connection status
    socketService.on('connection_change', handleConnectionChange);
    
    // Listen for earnings summary updates
    socketService.on('earnings_summary_update', handleEarningsSummaryUpdate);
  };

  const handleNewEarning = (earningData) => {
    console.log('New earning received:', earningData);
    
    // Update real-time stats
    setRealTimeStats(prev => ({
      ...prev,
      currentSessionEarnings: prev.currentSessionEarnings + earningData.amount
    }));
    
    // Update today's earnings
    const today = new Date().toISOString().split('T')[0];
    if (earningData.date === today) {
      setEarningsData(prev => ({
        ...prev,
        today: {
          ...prev.today,
          amount: prev.today.amount + earningData.amount,
          rides: prev.today.rides + 1
        },
        total: {
          ...prev.total,
          amount: prev.total.amount + earningData.amount,
          rides: prev.total.rides + 1
        }
      }));
    }
    
    // Add to detailed earnings
    const newEarning = {
      id: Date.now(),
      type: 'ride',
      amount: earningData.amount,
      time: new Date().toLocaleTimeString(),
      rideId: earningData.rideId,
      passengerName: earningData.passengerName,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
    setDetailedEarnings(prev => [newEarning, ...prev.slice(0, 49)]);
    
    // Show notification if enabled
    if (liveUpdates.instantNotifications) {
      showEarningNotification(earningData);
    }
    
    // Animate counter
    animateCounter();
    
    // Update last update time
    setLiveUpdates(prev => ({
      ...prev,
      lastUpdate: new Date().toISOString(),
      newEarnings: prev.newEarnings + 1
    }));
    
    // Cache updated data
    cacheEarningsData();
  };

  const handleRideCompleted = (rideData) => {
    console.log('Ride completed:', rideData);
    
    // Update pending rides
    setLiveUpdates(prev => ({
      ...prev,
      pendingRides: prev.pendingRides.filter(ride => ride.id !== rideData.id)
    }));
    
    // If this ride has earnings, it will come through new_earning event
  };

  const handleBonusAdded = (bonusData) => {
    console.log('Bonus received:', bonusData);
    
    // Add bonus to earnings
    setEarningsData(prev => ({
      ...prev,
      today: {
        ...prev.today,
        amount: prev.today.amount + bonusData.amount
      },
      total: {
        ...prev.total,
        amount: prev.total.amount + bonusData.amount
      }
    }));
    
    // Add to detailed earnings
    const newBonus = {
      id: Date.now(),
      type: 'bonus',
      amount: bonusData.amount,
      time: new Date().toLocaleTimeString(),
      description: bonusData.description,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
    setDetailedEarnings(prev => [newBonus, ...prev.slice(0, 49)]);
    
    // Show notification
    Alert.alert(
      '🎉 Bonus Received!',
      `${bonusData.description}: MWK ${bonusData.amount.toLocaleString()}`,
      [{ text: 'Awesome!' }]
    );
  };

  const handleTipReceived = (tipData) => {
    console.log('Tip received:', tipData);
    
    // Add tip to earnings
    setEarningsData(prev => ({
      ...prev,
      today: {
        ...prev.today,
        amount: prev.today.amount + tipData.amount
      },
      total: {
        ...prev.total,
        amount: prev.total.amount + tipData.amount
      }
    }));
    
    // Add to detailed earnings
    const newTip = {
      id: Date.now(),
      type: 'tip',
      amount: tipData.amount,
      time: new Date().toLocaleTimeString(),
      passengerName: tipData.passengerName,
      rideId: tipData.rideId,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
    setDetailedEarnings(prev => [newTip, ...prev.slice(0, 49)]);
    
    // Show notification
    if (liveUpdates.instantNotifications) {
      Alert.alert(
        '💝 Tip Received!',
        `${tipData.passengerName} tipped you MWK ${tipData.amount.toLocaleString()}`,
        [{ text: 'Thank you!' }]
      );
    }
  };

  const handleConnectionChange = (data) => {
    console.log('Connection status:', data.status);
    setLiveUpdates(prev => ({ ...prev, connectionStatus: data.status }));
    
    if (data.status === 'connected') {
      // Sync data when reconnected
      syncEarningsData();
    } else if (data.status === 'disconnected') {
      // Attempt reconnect after delay
      scheduleReconnect();
    }
  };

  const handleEarningsSummaryUpdate = (summaryData) => {
    console.log('Earnings summary update:', summaryData);
    
    // Update all period data from server
    setEarningsData(prev => ({
      ...prev,
      today: summaryData.today || prev.today,
      week: summaryData.week || prev.week,
      month: summaryData.month || prev.month,
      total: summaryData.total || prev.total
    }));
    
    setLiveUpdates(prev => ({
      ...prev,
      lastUpdate: new Date().toISOString()
    }));
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, refresh data
      refreshEarningsData();
    } else if (nextAppState === 'background') {
      // App going to background, stop real-time updates
      stopRealTimeUpdates();
    }
    
    appState.current = nextAppState;
  };

  const startRealTimeUpdates = () => {
    // Clear existing interval
    if (earningsUpdateInterval.current) {
      clearInterval(earningsUpdateInterval.current);
    }
    
    // Set up periodic updates (every 30 seconds)
    earningsUpdateInterval.current = setInterval(() => {
      if (liveUpdates.enabled && liveUpdates.connectionStatus === 'connected') {
        fetchLiveStats();
      }
    }, 30000);
    
    // Initial fetch
    fetchLiveStats();
  };

  const stopRealTimeUpdates = () => {
    if (earningsUpdateInterval.current) {
      clearInterval(earningsUpdateInterval.current);
      earningsUpdateInterval.current = null;
    }
  };

  const fetchLiveStats = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      
      const parsedData = JSON.parse(userData);
      const driverId = parsedData.id || parsedData._id;
      
      // Request live stats from server
      socketService.emit('request_live_stats', {
        driverId: driverId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching live stats:', error);
    }
  };

  const scheduleReconnect = () => {
    if (socketReconnectTimeout.current) {
      clearTimeout(socketReconnectTimeout.current);
    }
    
    socketReconnectTimeout.current = setTimeout(() => {
      if (liveUpdates.connectionStatus !== 'connected') {
        initializeRealTimeEarnings();
      }
    }, 5000); // Try to reconnect after 5 seconds
  };

  const loadCachedEarnings = async () => {
    try {
      const cachedEarnings = await AsyncStorage.getItem('cached_earnings');
      const cachedDetailed = await AsyncStorage.getItem('cached_detailed_earnings');
      
      if (cachedEarnings) {
        setEarningsData(JSON.parse(cachedEarnings));
      }
      
      if (cachedDetailed) {
        setDetailedEarnings(JSON.parse(cachedDetailed));
      }
      
    } catch (error) {
      console.error('Error loading cached earnings:', error);
    }
  };

  const cacheEarningsData = async () => {
    try {
      await AsyncStorage.setItem('cached_earnings', JSON.stringify(earningsData));
      await AsyncStorage.setItem('cached_detailed_earnings', JSON.stringify(detailedEarnings));
    } catch (error) {
      console.error('Error caching earnings:', error);
    }
  };

  const fetchEarningsData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        setLoading(false);
        return;
      }
      
      const parsedData = JSON.parse(userData);
      const driverId = parsedData.id || parsedData._id;
      const token = await AsyncStorage.getItem('auth_token');
      
      // Fetch earnings from API
      // Replace with your actual API endpoint
      const response = await fetch(`YOUR_API_URL/api/driver/${driverId}/earnings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update earnings data
        setEarningsData({
          today: data.today || { amount: 0, rides: 0, hours: 0 },
          week: data.week || { amount: 0, rides: 0, hours: 0 },
          month: data.month || { amount: 0, rides: 0, hours: 0 },
          total: data.total || { amount: 0, rides: 0, hours: 0 }
        });
        
        // Update detailed earnings
        if (data.recentEarnings) {
          setDetailedEarnings(data.recentEarnings);
        }
        
        // Update real-time stats
        if (data.currentSession) {
          setRealTimeStats(prev => ({
            ...prev,
            currentSessionEarnings: data.currentSession.earnings || 0,
            onlineSince: data.currentSession.onlineSince,
            earningsPerHour: data.currentSession.earningsPerHour || 0
          }));
        }
        
        // Cache the data
        cacheEarningsData();
        
        // Update connection status
        setLiveUpdates(prev => ({
          ...prev,
          connectionStatus: 'connected',
          lastUpdate: new Date().toISOString()
        }));
      }
      
    } catch (error) {
      console.error('Error fetching earnings:', error);
      
      // Use cached data if available
      if (earningsData.total.amount === 0) {
        await loadCachedEarnings();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDetailedEarnings = async (period) => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      
      const parsedData = JSON.parse(userData);
      const driverId = parsedData.id || parsedData._id;
      const token = await AsyncStorage.getItem('auth_token');
      
      // Fetch detailed earnings for period
      const response = await fetch(
        `YOUR_API_URL/api/driver/${driverId}/earnings/detailed?period=${period}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDetailedEarnings(data.earnings || []);
      }
      
    } catch (error) {
      console.error('Error fetching detailed earnings:', error);
    }
  };

  const syncEarningsData = () => {
    // Request sync from server
    socketService.emit('sync_earnings', {
      driverId: user?.id,
      lastSync: lastEarningUpdateRef.current,
      timestamp: new Date().toISOString()
    });
  };

  const refreshEarningsData = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  const animateCounter = () => {
    // Pulse animation for new earnings
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Counter animation
    Animated.timing(counterAnim, {
      toValue: earningsData[selectedPeriod].amount,
      duration: 1000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  };

  const showEarningNotification = (earningData) => {
    Alert.alert(
      '💰 New Earning!',
      `You earned MWK ${earningData.amount.toLocaleString()} from a ride`,
      [
        { text: 'Dismiss' },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('RideDetails', { rideId: earningData.rideId })
        }
      ]
    );
  };

  const toggleLiveUpdates = () => {
    const newState = !liveUpdates.enabled;
    setLiveUpdates(prev => ({ ...prev, enabled: newState }));
    
    if (newState) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }
    
    // Save preference
    AsyncStorage.setItem('earnings_live_updates', JSON.stringify(newState));
  };

  const toggleInstantNotifications = () => {
    const newState = !liveUpdates.instantNotifications;
    setLiveUpdates(prev => ({ ...prev, instantNotifications: newState }));
    
    // Save preference
    AsyncStorage.setItem('earnings_instant_notifications', JSON.stringify(newState));
  };

  const getPeriodData = () => {
    return earningsData[selectedPeriod] || earningsData.today;
  };

  const formatCurrency = (amount) => {
    return `MWK ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const cleanup = () => {
    stopRealTimeUpdates();
    
    if (socketReconnectTimeout.current) {
      clearTimeout(socketReconnectTimeout.current);
    }
    
    AppState.removeEventListener('change', handleAppStateChange);
    
    // Remove socket listeners
    socketService.off('new_earning', handleNewEarning);
    socketService.off('ride_completed', handleRideCompleted);
    socketService.off('bonus_added', handleBonusAdded);
    socketService.off('tip_received', handleTipReceived);
    socketService.off('connection_change', handleConnectionChange);
    socketService.off('earnings_summary_update', handleEarningsSummaryUpdate);
  };

  const periodButtons = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'total', label: 'All Time' },
  ];

  const currentData = getPeriodData();

  if (loading && !refreshing) {
    return <Loading message="Loading your earnings..." />;
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Earnings" 
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleLiveUpdates}>
              <Icon 
                name={liveUpdates.enabled ? "wifi" : "wifi"} 
                size={20} 
                color={liveUpdates.enabled ? "#4CAF50" : "#999"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshEarningsData}
              disabled={refreshing}
            >
              <Icon 
                name="refresh" 
                size={16} 
                color={refreshing ? "#ccc" : "#6c3"} 
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Real-time Status Bar */}
      <View style={[
        styles.statusBar,
        liveUpdates.connectionStatus === 'connected' ? styles.statusConnected : 
        liveUpdates.connectionStatus === 'connecting' ? styles.statusConnecting :
        styles.statusDisconnected
      ]}>
        <View style={styles.statusContent}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {liveUpdates.connectionStatus === 'connected' ? 'Live Updates' :
             liveUpdates.connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </Text>
          {liveUpdates.lastUpdate && (
            <Text style={styles.lastUpdateText}>
              Updated {formatTime(liveUpdates.lastUpdate)}
            </Text>
          )}
        </View>
        
        {liveUpdates.newEarnings > 0 && (
          <Animated.View 
            style={[
              styles.newEarningsBadge,
              { transform: [{ scale: animatedValue }] }
            ]}
          >
            <Text style={styles.newEarningsText}>+{liveUpdates.newEarnings}</Text>
          </Animated.View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6c3']}
            tintColor="#6c3"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* User Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.avatarContainer}>
            <Icon name="user-circle" size={50} color="#6c3" />
            {realTimeStats.onlineSince && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeName}>{getUserInfo()}</Text>
            <Text style={styles.welcomeSubtitle}>
              {realTimeStats.onlineSince ? 
                `Online since ${formatTime(realTimeStats.onlineSince)}` : 
                'Your driving earnings'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('EarningsSettings')}
          >
            <Icon name="cog" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Current Session Stats */}
        {realTimeStats.onlineSince && (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Icon name="clock-o" size={16} color="#6c3" />
              <Text style={styles.sessionTitle}>Current Session</Text>
            </View>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>
                  {formatCurrency(realTimeStats.currentSessionEarnings)}
                </Text>
                <Text style={styles.sessionStatLabel}>Earned</Text>
              </View>
              <View style={styles.sessionDivider} />
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>
                  {formatCurrency(realTimeStats.earningsPerHour)}
                </Text>
                <Text style={styles.sessionStatLabel}>Per Hour</Text>
              </View>
              <View style={styles.sessionDivider} />
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>
                  {realTimeStats.currentRide ? 'On Trip' : 'Available'}
                </Text>
                <Text style={styles.sessionStatLabel}>Status</Text>
              </View>
            </View>
          </View>
        )}

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periodButtons.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Earnings Card */}
        <Animated.View 
          style={[
            styles.mainEarningsCard,
            { transform: [{ scale: animatedValue }] }
          ]}
        >
          <Text style={styles.mainEarningsLabel}>
            {selectedPeriod === 'today' ? "Today's Earnings" :
             selectedPeriod === 'week' ? "This Week's Earnings" :
             selectedPeriod === 'month' ? "This Month's Earnings" : "Total Earnings"}
          </Text>
          
          <Animated.Text style={styles.mainEarningsAmount}>
            {formatCurrency(currentData.amount)}
          </Animated.Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="car" size={20} color="#fff" />
              <Text style={styles.statNumber}>{currentData.rides}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Icon name="clock-o" size={20} color="#fff" />
              <Text style={styles.statNumber}>{currentData.hours}h</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Icon name="money" size={20} color="#fff" />
              <Text style={styles.statNumber}>
                {currentData.rides > 0 ? formatCurrency(currentData.amount / currentData.rides) : 'MWK 0.00'}
              </Text>
              <Text style={styles.statLabel}>Avg/Ride</Text>
            </View>
          </View>
        </Animated.View>

        {/* Real-time Controls */}
        <View style={styles.controlsCard}>
          <Text style={styles.controlsTitle}>Live Updates</Text>
          <View style={styles.controlsRow}>
            <View style={styles.controlItem}>
              <Switch
                value={liveUpdates.enabled}
                onValueChange={toggleLiveUpdates}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={liveUpdates.enabled ? '#6c3' : '#f4f3f4'}
              />
              <Text style={styles.controlLabel}>Live Updates</Text>
            </View>
            
            <View style={styles.controlItem}>
              <Switch
                value={liveUpdates.instantNotifications}
                onValueChange={toggleInstantNotifications}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={liveUpdates.instantNotifications ? '#6c3' : '#f4f3f4'}
              />
              <Text style={styles.controlLabel}>Notifications</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatCard}>
            <Icon name="trophy" size={24} color="#FFD700" />
            <Text style={styles.quickStatValue}>{currentData.rides}</Text>
            <Text style={styles.quickStatLabel}>Completed Rides</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="star" size={24} color="#FF6B6B" />
            <Text style={styles.quickStatValue}>0.0</Text>
            <Text style={styles.quickStatLabel}>Rating</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.quickStatValue}>100%</Text>
            <Text style={styles.quickStatLabel}>Acceptance</Text>
          </View>
        </View>

        {/* Recent Earnings */}
        <View style={styles.recentEarningsCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Earnings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EarningsHistory')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          {detailedEarnings.length > 0 ? (
            detailedEarnings.slice(0, 5).map((earning, index) => (
              <View key={`${earning.id}-${index}`} style={styles.earningItem}>
                <View style={styles.earningIcon}>
                  <Icon 
                    name={
                      earning.type === 'ride' ? 'car' :
                      earning.type === 'tip' ? 'gift' :
                      earning.type === 'bonus' ? 'star' : 'money'
                    } 
                    size={20} 
                    color="#6c3" 
                  />
                </View>
                <View style={styles.earningDetails}>
                  <Text style={styles.earningDescription}>
                    {earning.type === 'ride' ? `Ride from ${earning.passengerName}` :
                     earning.type === 'tip' ? `Tip from ${earning.passengerName}` :
                     earning.description || 'Earning'}
                  </Text>
                  <Text style={styles.earningTime}>{earning.time}</Text>
                </View>
                <Text style={styles.earningAmount}>+{formatCurrency(earning.amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noEarnings}>
              <Icon name="money" size={40} color="#ddd" />
              <Text style={styles.noEarningsText}>No earnings yet</Text>
              <Text style={styles.noEarningsSubtext}>Start driving to see earnings here</Text>
            </View>
          )}
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Ride Fares</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(currentData.amount * 0.8)}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Tips</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(currentData.amount * 0.1)}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Bonuses</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(currentData.amount * 0.1)}</Text>
          </View>
          
          <View style={[styles.breakdownItem, styles.breakdownTotal]}>
            <Text style={styles.breakdownTotalLabel}>Total Earnings</Text>
            <Text style={styles.breakdownTotalValue}>{formatCurrency(currentData.amount)}</Text>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaCard}>
          <Icon name="road" size={40} color="#6c3" />
          <Text style={styles.ctaTitle}>Start Earning Today!</Text>
          <Text style={styles.ctaDescription}>
            Go online and accept ride requests to start earning money with Kabaza.
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => navigation.navigate('DriverHome')}
          >
            <Text style={styles.ctaButtonText}>Go Online Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          {liveUpdates.enabled ? 
            'Earnings update in real-time. You will be notified of new earnings immediately.' :
            'Real-time updates disabled. Pull to refresh for latest earnings.'}
        </Text>
      </ScrollView>
    </View>
  );
}

// Add Switch import
import { Switch } from 'react-native';

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  refreshButton: {
    padding: 5,
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusConnecting: {
    backgroundColor: '#FF9800',
  },
  statusDisconnected: {
    backgroundColor: '#F44336',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  lastUpdateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  newEarningsBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  newEarningsText: {
    color: '#333',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  avatarContainer: {
    marginRight: 15,
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingsButton: {
    padding: 5,
  },
  sessionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStat: {
    flex: 1,
    alignItems: 'center',
  },
  sessionStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c3',
    marginBottom: 2,
  },
  sessionStatLabel: {
    fontSize: 11,
    color: '#666',
  },
  sessionDivider: {
    width: 1,
    height: 25,
    backgroundColor: '#eee',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#6c3',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  mainEarningsCard: {
    backgroundColor: '#6c3',
    padding: 25,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  mainEarningsLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  mainEarningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  controlsCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  controlsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentEarningsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 12,
    color: '#6c3',
    fontWeight: '600',
  },
  earningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  earningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  earningDetails: {
    flex: 1,
  },
  earningDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  earningTime: {
    fontSize: 12,
    color: '#999',
  },
  earningAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c3',
  },
  noEarnings: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noEarningsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  noEarningsSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownTotal: {
    borderBottomWidth: 0,
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#6c3',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c3',
  },
  ctaCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
  },
  ctaDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#6c3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});