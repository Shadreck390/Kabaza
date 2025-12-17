// screens/driver/TripHistoryScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
  Alert,
  Platform,
  AppState,
  Modal,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

// FIXED IMPORT:
import socketService from '@services/socket/socketService';

export default function TripHistoryScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('week');
  const [tripData, setTripData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [stats, setStats] = useState({
    today: { earnings: 0, trips: 0 },
    week: { earnings: 0, trips: 0 },
    month: { earnings: 0, trips: 0 },
    total: { earnings: 0, trips: 0 }
  });
  
  const [analytics, setAnalytics] = useState({
    averageFare: 0,
    averageRating: 0,
    peakHours: [],
    popularDestinations: [],
    weeklyTrend: [],
    monthlyGrowth: 0
  });
  
  const [filters, setFilters] = useState({
    dateRange: 'week',
    minFare: 0,
    maxFare: 10000,
    rating: 0,
    paymentMethod: 'all',
    status: 'completed'
  });
  
  const [newTripsCount, setNewTripsCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);
  const syncInterval = useRef(null);
  const reconnectTimeout = useRef(null);
  const viewRef = useRef();

  const user = useSelector(state => state.auth.user);

  // Initialize real-time trip history
  useEffect(() => {
    initializeRealTimeHistory();
    
    // Setup app state listener
    AppState.addEventListener('change', handleAppStateChange);
    
    // Load saved filters
    loadSavedFilters();
    
    return () => {
      cleanup();
    };
  }, []);

  // Filter trips when filters change
  useEffect(() => {
    if (tripData.length > 0) {
      calculateStats();
      calculateAnalytics();
    }
  }, [filters, selectedFilter, tripData]);

  const initializeRealTimeHistory = async () => {
    try {
      setLoading(true);
      
      // Load cached trip history
      await loadCachedHistory();
      
      // Initialize socket connection
      if (!socketService.isConnected?.()) {
        await socketService.initialize();
      }
      
      // Setup history-specific socket listeners
      setupHistoryListeners();
      
      // Start real-time updates
      startRealTimeUpdates();
      
      // Fetch initial data from server
      await fetchTripHistory();
      
      // Start animations
      startAnimations();
      
    } catch (error) {
      console.error('Real-time history initialization error:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const setupHistoryListeners = () => {
    // Listen for new completed trips
    socketService.on('new_completed_trip', handleNewCompletedTrip);
    
    // Listen for trip updates (rating changes, fare adjustments)
    socketService.on('trip_updated', handleTripUpdate);
    
    // Listen for analytics updates
    socketService.on('analytics_update', handleAnalyticsUpdate);
    
    // Listen for connection status
    socketService.on('connection_change', handleConnectionChange);
    
    // Listen for sync completion
    socketService.on('history_sync_complete', handleHistorySyncComplete);
  };

  const handleNewCompletedTrip = (tripData) => {
    console.log('New completed trip:', tripData);
    
    // Add to trip history
    const newTrip = formatTripForHistory(tripData);
    setTripData(prev => [newTrip, ...prev]);
    
    // Update new trips count
    setNewTripsCount(prev => prev + 1);
    
    // Animate new trip addition
    animateNewTrip();
    
    // Update stats
    updateStatsWithNewTrip(tripData);
    
    // Cache updated history
    cacheTripHistory();
    
    // Show notification
    if (liveUpdates) {
      showNewTripNotification(newTrip);
    }
  };

  const handleTripUpdate = (updateData) => {
    console.log('Trip updated:', updateData);
    
    // Update specific trip in history
    setTripData(prev => prev.map(trip => {
      if (trip.id === updateData.tripId) {
        return {
          ...trip,
          ...updateData.updates,
          updatedAt: new Date().toISOString()
        };
      }
      return trip;
    }));
    
    // Recalculate stats if fare changed
    if (updateData.updates.fare) {
      calculateStats();
    }
  };

  const handleAnalyticsUpdate = (analyticsData) => {
    console.log('Analytics update:', analyticsData);
    
    setAnalytics(prev => ({
      ...prev,
      ...analyticsData,
      lastUpdated: new Date().toISOString()
    }));
  };

  const handleConnectionChange = (data) => {
    console.log('Connection status:', data.status);
    setConnectionStatus(data.status);
    
    if (data.status === 'connected') {
      // Sync history when reconnected
      syncHistory();
    } else if (data.status === 'disconnected') {
      // Schedule reconnect
      scheduleReconnect();
    }
  };

  const handleHistorySyncComplete = (syncData) => {
    console.log('History sync complete:', syncData);
    
    setLastSync(new Date().toISOString());
    
    if (syncData.newTrips > 0) {
      setNewTripsCount(syncData.newTrips);
      Alert.alert(
        'Sync Complete',
        `Synced ${syncData.newTrips} new trips from server`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, refresh history
      refreshHistory();
    }
    appState.current = nextAppState;
  };

  const loadCachedHistory = async () => {
    try {
      const cachedHistory = await AsyncStorage.getItem('cached_trip_history');
      const cachedStats = await AsyncStorage.getItem('cached_trip_stats');
      const cachedAnalytics = await AsyncStorage.getItem('cached_trip_analytics');
      
      if (cachedHistory) {
        const parsedHistory = JSON.parse(cachedHistory);
        
        // Filter out trips older than 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const recentTrips = parsedHistory.filter(trip => {
          const tripDate = new Date(trip.date || trip.completedAt);
          return tripDate > ninetyDaysAgo;
        });
        
        setTripData(recentTrips);
      }
      
      if (cachedStats) {
        setStats(JSON.parse(cachedStats));
      }
      
      if (cachedAnalytics) {
        setAnalytics(JSON.parse(cachedAnalytics));
      }
      
    } catch (error) {
      console.error('Error loading cached history:', error);
    }
  };

  const cacheTripHistory = async () => {
    try {
      await AsyncStorage.setItem('cached_trip_history', JSON.stringify(tripData));
      await AsyncStorage.setItem('cached_trip_stats', JSON.stringify(stats));
      await AsyncStorage.setItem('cached_trip_analytics', JSON.stringify(analytics));
    } catch (error) {
      console.error('Error caching trip history:', error);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await AsyncStorage.getItem('trip_history_filters');
      if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const saveFilters = async () => {
    try {
      await AsyncStorage.setItem('trip_history_filters', JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };

  const fetchTripHistory = async () => {
    try {
      if (!user?.id) return;
      
      // Request trip history from server
      socketService.emit('request_trip_history', {
        driverId: user.id,
        dateRange: filters.dateRange,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching trip history:', error);
    }
  };

  const syncHistory = async () => {
    try {
      if (!user?.id || connectionStatus !== 'connected') return;
      
      socketService.emit('sync_trip_history', {
        driverId: user.id,
        lastSync: lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last week
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error syncing history:', error);
    }
  };

  const refreshHistory = () => {
    setRefreshing(true);
    fetchTripHistory();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      if (connectionStatus !== 'connected') {
        initializeRealTimeHistory();
      }
    }, 5000);
  };

  const startRealTimeUpdates = () => {
    // Set up periodic sync (every 5 minutes)
    syncInterval.current = setInterval(() => {
      if (connectionStatus === 'connected' && liveUpdates) {
        syncHistory();
      }
    }, 5 * 60 * 1000);
  };

  const startAnimations = () => {
    // Start pulse animation
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
    
    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const animateNewTrip = () => {
    // Flash animation for new trip
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
    
    // Scroll to top if needed
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const formatTripForHistory = (trip) => {
    return {
      id: trip.tripId || `trip_${Date.now()}`,
      date: formatDateForDisplay(trip.completedAt || new Date().toISOString()),
      passengerName: trip.passenger?.name || 'Passenger',
      passengerId: trip.passengerId,
      pickup: trip.pickupAddress || 'Pickup location',
      destination: trip.destinationAddress || 'Destination',
      fare: `MWK ${trip.fare?.toLocaleString() || '0'}`,
      originalFare: trip.fare || 0,
      rating: trip.passengerRating || 5,
      status: trip.status || 'completed',
      paymentMethod: trip.paymentMethod || 'cash',
      distance: `${trip.distance?.toFixed(1) || '0.0'} km`,
      duration: `${trip.duration || 0} min`,
      completedAt: trip.completedAt || new Date().toISOString(),
      notes: trip.notes || '',
      tip: trip.tip || 0
    };
  };

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (diffDays < 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[date.getDay()]}, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const filteredTrips = getFilteredTrips();
    
    const todayTrips = filteredTrips.filter(trip => {
      const tripDate = new Date(trip.completedAt || trip.date);
      return tripDate >= today;
    });
    
    const weekTrips = filteredTrips.filter(trip => {
      const tripDate = new Date(trip.completedAt || trip.date);
      return tripDate >= weekAgo;
    });
    
    const monthTrips = filteredTrips.filter(trip => {
      const tripDate = new Date(trip.completedAt || trip.date);
      return tripDate >= monthAgo;
    });
    
    const calculateEarnings = (trips) => {
      return trips.reduce((sum, trip) => sum + (trip.originalFare || 0) + (trip.tip || 0), 0);
    };
    
    const newStats = {
      today: {
        earnings: calculateEarnings(todayTrips),
        trips: todayTrips.length
      },
      week: {
        earnings: calculateEarnings(weekTrips),
        trips: weekTrips.length
      },
      month: {
        earnings: calculateEarnings(monthTrips),
        trips: monthTrips.length
      },
      total: {
        earnings: calculateEarnings(filteredTrips),
        trips: filteredTrips.length
      }
    };
    
    setStats(newStats);
    return newStats;
  };

  const updateStatsWithNewTrip = (trip) => {
    const fare = trip.fare || 0;
    const tip = trip.tip || 0;
    const total = fare + tip;
    
    setStats(prev => ({
      today: {
        ...prev.today,
        earnings: prev.today.earnings + total,
        trips: prev.today.trips + 1
      },
      week: {
        ...prev.week,
        earnings: prev.week.earnings + total,
        trips: prev.week.trips + 1
      },
      month: {
        ...prev.month,
        earnings: prev.month.earnings + total,
        trips: prev.month.trips + 1
      },
      total: {
        ...prev.total,
        earnings: prev.total.earnings + total,
        trips: prev.total.trips + 1
      }
    }));
  };

  const calculateAnalytics = () => {
    const filteredTrips = getFilteredTrips();
    
    if (filteredTrips.length === 0) {
      setAnalytics({
        averageFare: 0,
        averageRating: 0,
        peakHours: [],
        popularDestinations: [],
        weeklyTrend: [],
        monthlyGrowth: 0
      });
      return;
    }
    
    // Calculate average fare
    const totalFare = filteredTrips.reduce((sum, trip) => sum + (trip.originalFare || 0), 0);
    const averageFare = Math.round(totalFare / filteredTrips.length);
    
    // Calculate average rating
    const totalRating = filteredTrips.reduce((sum, trip) => sum + (trip.rating || 0), 0);
    const averageRating = (totalRating / filteredTrips.length).toFixed(1);
    
    // Find peak hours
    const hourCounts = {};
    filteredTrips.forEach(trip => {
      const hour = new Date(trip.completedAt || trip.date).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }));
    
    // Find popular destinations
    const destinationCounts = {};
    filteredTrips.forEach(trip => {
      const dest = trip.destination;
      destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
    });
    
    const popularDestinations = Object.entries(destinationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([destination, count]) => ({ destination, count }));
    
    // Calculate weekly trend (last 4 weeks)
    const weeklyTrend = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const weekTrips = filteredTrips.filter(trip => {
        const tripDate = new Date(trip.completedAt || trip.date);
        return tripDate >= weekStart && tripDate <= weekEnd;
      });
      
      const weekEarnings = weekTrips.reduce((sum, trip) => sum + (trip.originalFare || 0), 0);
      
      weeklyTrend.push({
        week: `Week ${i + 1}`,
        earnings: weekEarnings,
        trips: weekTrips.length
      });
    }
    
    // Calculate monthly growth
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthTrips = filteredTrips.filter(trip => {
      const tripDate = new Date(trip.completedAt || trip.date);
      return tripDate >= currentMonth;
    });
    
    const lastMonthTrips = filteredTrips.filter(trip => {
      const tripDate = new Date(trip.completedAt || trip.date);
      return tripDate >= lastMonth && tripDate < currentMonth;
    });
    
    const currentMonthEarnings = currentMonthTrips.reduce((sum, trip) => sum + (trip.originalFare || 0), 0);
    const lastMonthEarnings = lastMonthTrips.reduce((sum, trip) => sum + (trip.originalFare || 0), 0);
    
    const monthlyGrowth = lastMonthEarnings > 0 
      ? Math.round(((currentMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : 100;
    
    setAnalytics({
      averageFare,
      averageRating: parseFloat(averageRating),
      peakHours,
      popularDestinations,
      weeklyTrend,
      monthlyGrowth
    });
  };

  const getFilteredTrips = () => {
    let filtered = [...tripData];
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.passengerName.toLowerCase().includes(query) ||
        trip.pickup.toLowerCase().includes(query) ||
        trip.destination.toLowerCase().includes(query) ||
        trip.id.toLowerCase().includes(query)
      );
    }
    
    // Apply fare filters
    if (filters.minFare > 0) {
      filtered = filtered.filter(trip => trip.originalFare >= filters.minFare);
    }
    
    if (filters.maxFare < 10000) {
      filtered = filtered.filter(trip => trip.originalFare <= filters.maxFare);
    }
    
    // Apply rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(trip => trip.rating >= filters.rating);
    }
    
    // Apply payment method filter
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(trip => trip.paymentMethod === filters.paymentMethod);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(trip => trip.status === filters.status);
    }
    
    // Apply date range filter
    const now = new Date();
    let startDate;
    
    switch(filters.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }
    
    filtered = filtered.filter(trip => {
      const tripDate = new Date(trip.completedAt || trip.date);
      return tripDate >= startDate;
    });
    
    return filtered;
  };

  const showNewTripNotification = (trip) => {
    Alert.alert(
      '🚗 New Trip Completed!',
      `${trip.passengerName} - ${trip.fare}`,
      [
        { text: 'Dismiss' },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('TripDetails', { trip }) 
        }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      
      const filteredTrips = getFilteredTrips();
      
      if (filteredTrips.length === 0) {
        Alert.alert('No Data', 'There are no trips to export with current filters');
        setExporting(false);
        return;
      }
      
      await exportToCSV(filteredTrips);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Could not export trip history: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async (trips) => {
    try {
      // Create CSV content
      const headers = ['Trip ID,Date,Passenger,Pickup,Destination,Fare,Tip,Total,Distance,Duration,Rating,Payment Method,Status'];
      const rows = trips.map(trip => 
        `"${trip.id}","${trip.date}","${trip.passengerName}","${trip.pickup}","${trip.destination}",${trip.originalFare},${trip.tip || 0},${(trip.originalFare || 0) + (trip.tip || 0)},"${trip.distance}","${trip.duration}",${trip.rating},"${trip.paymentMethod}","${trip.status}"`
      );
      
      const csvContent = [...headers, ...rows].join('\n');
      const fileName = `Kabaza_TripHistory_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Use expo-file-system correctly
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      console.log('CSV file saved to:', fileUri);
      
      // Use expo-sharing to share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share Trip History',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('CSV Exported', `File saved to app storage: ${fileName}`, [
          { text: 'OK' }
        ]);
      }
      
    } catch (error) {
      console.error('CSV export error:', error);
      throw error;
    }
  };

  const exportToPDF = async () => {
    try {
      // Capture view as image
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 0.8,
      });
      
      // In a real app, you would convert this to PDF
      Alert.alert(
        'PDF Export',
        'PDF export would be implemented with a PDF generation library',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('PDF export error:', error);
      throw error;
    }
  };

  const toggleLiveUpdates = () => {
    const newState = !liveUpdates;
    setLiveUpdates(newState);
    
    if (newState) {
      startRealTimeUpdates();
    } else {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
        syncInterval.current = null;
      }
    }
    
    AsyncStorage.setItem('trip_history_live_updates', JSON.stringify(newState));
  };

  const clearNewTripsCount = () => {
    setNewTripsCount(0);
  };

  const cleanup = () => {
    // Clear intervals and timeouts
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    // Stop animations
    pulseAnim.stopAnimation();
    fadeAnim.stopAnimation();
    
    // Remove socket listeners
    socketService.off('new_completed_trip', handleNewCompletedTrip);
    socketService.off('trip_updated', handleTripUpdate);
    socketService.off('analytics_update', handleAnalyticsUpdate);
    socketService.off('connection_change', handleConnectionChange);
    socketService.off('history_sync_complete', handleHistorySyncComplete);
    
    // Save filters
    saveFilters();
    
    // Remove app state listener
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: { color: '#4CAF50', text: 'Live', icon: 'wifi' },
      connecting: { color: '#FF9800', text: 'Connecting...', icon: 'refresh' },
      disconnected: { color: '#F44336', text: 'Offline', icon: 'wifi' },
      error: { color: '#FF5722', text: 'Error', icon: 'exclamation-triangle' }
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.disconnected;
    
    return (
      <Animated.View 
        style={[
          styles.connectionStatus,
          { 
            backgroundColor: config.color,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Icon name={config.icon} size={12} color="#fff" />
        <Text style={styles.connectionText}>{config.text}</Text>
      </Animated.View>
    );
  };

  const renderTripItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.tripCard,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity 
        style={styles.tripCardContent}
        onPress={() => navigation.navigate('TripDetails', { trip: item })}
      >
        <View style={styles.tripHeader}>
          <View>
            <Text style={styles.tripDate}>{item.date}</Text>
            <Text style={styles.passengerName}>{item.passengerName}</Text>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.tripFare}>{item.fare}</Text>
            {item.tip > 0 && (
              <Text style={styles.tipText}>+{item.tip} tip</Text>
            )}
          </View>
        </View>
        
        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <Icon name="map-marker" size={12} color="#00B894" />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeItem}>
            <Icon name="flag" size={12} color="#FF6B6B" />
            <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.tripFooter}>
          <View style={styles.tripMeta}>
            <View style={styles.metaItem}>
              <Icon name="road" size={12} color="#666" />
              <Text style={styles.metaText}>{item.distance}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock-o" size={12} color="#666" />
              <Text style={styles.metaText}>{item.duration}</Text>
            </View>
          </View>
          
          <View style={styles.rightSection}>
            <View style={styles.ratingContainer}>
              {[...Array(5)].map((_, i) => (
                <Icon 
                  key={i} 
                  name="star" 
                  size={14} 
                  color={i < item.rating ? "#FFD700" : "#ddd"} 
                />
              ))}
              <Text style={styles.ratingText}>({item.rating}.0)</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'completed' ? '#E8F5E8' : '#FFF3E0' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.status === 'completed' ? '#4CAF50' : '#FF9800' }
              ]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const filteredTrips = getFilteredTrips();
  const currentStats = stats[selectedFilter];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading trip history...</Text>
      </View>
    );
  }

  return (
    <Animated.View ref={viewRef} style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshHistory}
            colors={['#00B894']}
            tintColor="#00B894"
          />
        }
      >
        {/* Header with Connection Status */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Trip History</Text>
            {renderConnectionStatus()}
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Icon name="search" size={16} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => navigation.navigate('TripHistoryFilters', { filters, setFilters })}
            >
              <Icon name="filter" size={16} color="#666" />
              {Object.values(filters).some(filter => 
                filter !== 'week' && filter !== 0 && filter !== 'all' && filter !== 10000
              ) && (
                <View style={styles.filterIndicator} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.liveButton}
              onPress={toggleLiveUpdates}
            >
              <Icon 
                name="wifi" 
                size={16} 
                color={liveUpdates ? "#00B894" : "#ccc"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Icon name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trips by passenger, location, or ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoFocus
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="times" size={16} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* New Trips Indicator */}
        {newTripsCount > 0 && (
          <TouchableOpacity 
            style={styles.newTripsBanner}
            onPress={clearNewTripsCount}
          >
            <Icon name="bell" size={14} color="#fff" />
            <Text style={styles.newTripsText}>
              {newTripsCount} new trip{newTripsCount !== 1 ? 's' : ''} completed
            </Text>
            <Icon name="times" size={12} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Earnings Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              Earnings ({selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)})
            </Text>
            {lastSync && (
              <Text style={styles.syncText}>
                Synced: {new Date(lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            )}
          </View>
          
          <Text style={styles.summaryAmount}>
            MWK {currentStats.earnings.toLocaleString()}
          </Text>
          
          <View style={styles.summarySubtitle}>
            <Text style={styles.tripCount}>
              {currentStats.trips} trip{currentStats.trips !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.averageFare}>
              Avg: MWK {analytics.averageFare.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.filterContainer}>
            {['today', 'week', 'month', 'total'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButtonSmall,
                  selectedFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analytics Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.analyticsContainer}
        >
          <View style={styles.analyticsCard}>
            <Icon name="star" size={20} color="#FFD700" />
            <Text style={styles.analyticsValue}>{analytics.averageRating}</Text>
            <Text style={styles.analyticsLabel}>Avg Rating</Text>
          </View>
          
          <View style={styles.analyticsCard}>
            <Icon name="chart-line" size={20} color="#00B894" />
            <Text style={styles.analyticsValue}>{analytics.monthlyGrowth}%</Text>
            <Text style={styles.analyticsLabel}>Growth</Text>
          </View>
          
          <View style={styles.analyticsCard}>
            <Icon name="clock-o" size={20} color="#2196F3" />
            <Text style={styles.analyticsValue}>
              {analytics.peakHours[0]?.hour || '--:--'}
            </Text>
            <Text style={styles.analyticsLabel}>Peak Hour</Text>
          </View>
          
          <View style={styles.analyticsCard}>
            <Icon name="map-marker" size={20} color="#FF6B6B" />
            <Text style={styles.analyticsValue}>
              {analytics.popularDestinations[0]?.count || 0}
            </Text>
            <Text style={styles.analyticsLabel}>Top Destination</Text>
          </View>
        </ScrollView>

        {/* Trip Count and Export */}
        <View style={styles.tripCountContainer}>
          <View>
            <Text style={styles.tripCountText}>
              {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} found
            </Text>
            {searchQuery && (
              <Text style={styles.searchQueryText}>
                Searching: "{searchQuery}"
              </Text>
            )}
          </View>
          
          <View style={styles.exportContainer}>
            {exporting ? (
              <ActivityIndicator size="small" color="#00B894" />
            ) : (
              <TouchableOpacity 
                style={styles.exportButton}
                onPress={handleExportData}
                disabled={filteredTrips.length === 0}
              >
                <Icon name="download" size={16} color="#00B894" />
                <Text style={styles.exportText}>Export CSV</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Trip List */}
        {filteredTrips.length > 0 ? (
          <FlatList
            data={filteredTrips}
            renderItem={renderTripItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.tripList}
            initialNumToRender={10}
            maxToRenderPerBatch={20}
            windowSize={5}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="history" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching trips found' : 'No trip history yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Your completed trips will appear here'}
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sync Button */}
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={syncHistory}
          disabled={connectionStatus !== 'connected'}
        >
          <Icon 
            name="sync" 
            size={16} 
            color={connectionStatus === 'connected' ? "#fff" : "#ccc"} 
          />
          <Text style={[
            styles.syncButtonText,
            { color: connectionStatus === 'connected' ? "#fff" : "#ccc" }
          ]}>
            {connectionStatus === 'connected' ? 'Sync Now' : 'Offline'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          {liveUpdates 
            ? 'History updates in real-time. Pull to refresh manually.'
            : 'Real-time updates disabled. Pull to refresh for latest trips.'}
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 6,
  },
  connectionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  searchButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00B894',
  },
  liveButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  newTripsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    borderRadius: 20,
    gap: 8,
  },
  newTripsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
  },
  syncText: {
    fontSize: 11,
    color: '#999',
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00B894',
    marginBottom: 5,
  },
  summarySubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tripCount: {
    fontSize: 14,
    color: '#666',
  },
  averageFare: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#00B894',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  analyticsContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  analyticsCard: {
    width: 120,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
  },
  tripCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  tripCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  searchQueryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  exportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00B894',
    gap: 5,
  },
  exportText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '500',
  },
  tripList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tripCardContent: {
    padding: 15,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  tripFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
  },
  tipText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '500',
    marginTop: 2,
  },
  routeInfo: {
    marginBottom: 10,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  routeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 20,
    marginVertical: 5,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#00B894',
    borderRadius: 20,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 15,
    fontStyle: 'italic',
  },
});