// screens/rider/RidesScreen.js - ENHANCED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Easing,
  Platform,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getRideHistory, getUserData } from '@src/utils/userStorage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animated Components
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Status Colors
const STATUS_COLORS = {
  completed: '#10B981',
  cancelled: '#EF4444',
  ongoing: '#3B82F6',
  upcoming: '#F59E0B',
  scheduled: '#8B5CF6',
};

// Vehicle Icons
const VEHICLE_ICONS = {
  bike: 'motorcycle',
  car: 'car',
  'bike_premium': 'motorcycle',
  'car_premium': 'car',
  'bike_economy': 'motorcycle',
  'car_economy': 'car',
};

// Vehicle Colors
const VEHICLE_COLORS = {
  bike: '#F59E0B',
  car: '#3B82F6',
  'bike_premium': '#DC2626',
  'car_premium': '#10B981',
  'bike_economy': '#6B7280',
  'car_economy': '#8B5CF6',
};

const RidesScreen = ({ navigation, route }) => {
  // States
  const [activeTab, setActiveTab] = useState('Past');
  const [rideHistory, setRideHistory] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    totalRides: 0,
    totalSpent: 0,
    avgRating: 0,
    mostVisited: null,
  });
  const [selectedRide, setSelectedRide] = useState(null);
  const [showRideDetails, setShowRideDetails] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const tabScale = useRef(new Animated.Value(0.9)).current;
  const tabOpacity = useRef(new Animated.Value(0)).current;
  const rideCardScale = useRef(new Animated.Value(0.95)).current;
  const rideCardOpacity = useRef(new Animated.Value(0)).current;
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const detailsScale = useRef(new Animated.Value(0.8)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;

  // Filter options
  const filters = [
    { id: 'all', label: 'All Rides', icon: 'all-inclusive' },
    { id: 'completed', label: 'Completed', icon: 'check-circle', color: '#10B981' },
    { id: 'cancelled', label: 'Cancelled', icon: 'cancel', color: '#EF4444' },
    { id: 'bike', label: 'Bike Rides', icon: 'motorcycle', color: '#F59E0B' },
    { id: 'car', label: 'Car Rides', icon: 'car', color: '#3B82F6' },
    { id: 'last_month', label: 'Last Month', icon: 'calendar-month' },
    { id: 'last_3_months', label: 'Last 3 Months', icon: 'calendar-range' },
  ];

  // Enhanced sample data
  const ENHANCED_SAMPLE_DATA = [
    {
      id: '1',
      date: '3 Dec 2025 · 21:55',
      timestamp: new Date('2025-12-03T21:55:00').getTime(),
      destination: '6th Avenue, Lilongwe, Malawi',
      pickup: 'Area 3 Shopping Complex',
      driver: 'John Banda',
      driverRating: 4.8,
      vehicleType: 'bike_premium',
      vehicleModel: 'Honda CG 125',
      plate: 'LL 1234 A',
      price: 850,
      distance: '2.5 km',
      duration: '8 min',
      status: 'completed',
      paymentMethod: 'cash',
      rating: 5,
      carbonSaved: 1.2,
      receiptId: 'RCPT-2025-0123',
      route: [
        { latitude: -13.9583, longitude: 33.7689 },
        { latitude: -13.9626, longitude: 33.7741 },
      ],
    },
    {
      id: '2',
      date: '10 Oct 2025 · 21:58',
      timestamp: new Date('2025-10-10T21:58:00').getTime(),
      destination: 'Kamuzu Central Hospital, Lilongwe, Malawi',
      pickup: 'Current Location',
      driver: 'Sarah Mwale',
      driverRating: 4.9,
      vehicleType: 'car',
      vehicleModel: 'Toyota Corolla',
      plate: 'LL 5678 B',
      price: 1100,
      distance: '3.2 km',
      duration: '12 min',
      status: 'completed',
      paymentMethod: 'mobile_money',
      rating: 4,
      carbonSaved: 1.8,
      receiptId: 'RCPT-2025-0124',
      route: [
        { latitude: -13.9825, longitude: 33.7861 },
        { latitude: -13.9626, longitude: 33.7741 },
      ],
    },
    {
      id: '3',
      date: '9 Oct 2025 · 20:30',
      timestamp: new Date('2025-10-09T20:30:00').getTime(),
      destination: 'Area 3 Shopping Complex, Lilongwe',
      pickup: 'Crossroads Hotel',
      driver: 'Mike Phiri',
      driverRating: 4.7,
      vehicleType: 'bike',
      vehicleModel: 'Yamaha DT 125',
      plate: 'LL 9012 C',
      price: 0,
      distance: '1.8 km',
      duration: '6 min',
      status: 'cancelled',
      paymentMethod: 'cash',
      cancellationFee: 200,
      cancellationReason: 'Driver was delayed',
      receiptId: 'RCPT-2025-0125',
    },
    {
      id: '4',
      date: '5 Oct 2025 · 18:15',
      timestamp: new Date('2025-10-05T18:15:00').getTime(),
      destination: 'Bingu National Stadium, Lilongwe',
      pickup: 'Bunda Taxi Rank',
      driver: 'Temwanani Moyo',
      driverRating: 4.9,
      vehicleType: 'car_premium',
      vehicleModel: 'Toyota Premio',
      plate: 'LL 3456 D',
      price: 950,
      distance: '5.1 km',
      duration: '18 min',
      status: 'completed',
      paymentMethod: 'wallet',
      rating: 5,
      carbonSaved: 2.3,
      receiptId: 'RCPT-2025-0126',
    },
    {
      id: '5',
      date: '1 Oct 2025 · 14:20',
      timestamp: new Date('2025-10-01T14:20:00').getTime(),
      destination: 'Mzuzu University, Mzuzu',
      pickup: 'Current Location',
      driver: 'Chimwemwe Kanyenda',
      driverRating: 4.6,
      vehicleType: 'car_economy',
      vehicleModel: 'Nissan Sunny',
      plate: 'MZ 7890 E',
      price: 1500,
      distance: '4.8 km',
      duration: '15 min',
      status: 'completed',
      paymentMethod: 'card',
      rating: 4,
      carbonSaved: 2.1,
      receiptId: 'RCPT-2025-0127',
    },
    {
      id: '6',
      date: '28 Sep 2025 · 11:45',
      timestamp: new Date('2025-09-28T11:45:00').getTime(),
      destination: 'Shoprite Blantyre',
      pickup: 'Mount Soche Hotel',
      driver: 'Grace Banda',
      driverRating: 5.0,
      vehicleType: 'bike',
      vehicleModel: 'Bajaj Boxer',
      plate: 'BL 1234 F',
      price: 800,
      distance: '2.1 km',
      duration: '7 min',
      status: 'completed',
      paymentMethod: 'cash',
      rating: 5,
      carbonSaved: 0.9,
      receiptId: 'RCPT-2025-0128',
    },
    {
      id: '7',
      date: '25 Sep 2025 · 09:30',
      timestamp: new Date('2025-09-25T09:30:00').getTime(),
      destination: 'Chancellor College, Zomba',
      pickup: 'Zomba Plateau',
      driver: 'Mercy Kaliati',
      driverRating: 4.8,
      vehicleType: 'car',
      vehicleModel: 'Toyota Vitz',
      plate: 'ZB 5678 G',
      price: 900,
      distance: '3.5 km',
      duration: '10 min',
      status: 'completed',
      paymentMethod: 'wallet',
      rating: 4,
      carbonSaved: 1.5,
      receiptId: 'RCPT-2025-0129',
    },
    {
      id: '8',
      date: '20 Sep 2025 · 16:10',
      timestamp: new Date('2025-09-20T16:10:00').getTime(),
      destination: 'Lilongwe City Mall',
      pickup: 'Current Location',
      driver: 'James Kamanga',
      driverRating: 4.7,
      vehicleType: 'bike_economy',
      vehicleModel: 'Honda CG 125',
      plate: 'LL 2345 H',
      price: 750,
      distance: '1.5 km',
      duration: '5 min',
      status: 'completed',
      paymentMethod: 'mobile_money',
      rating: 5,
      carbonSaved: 0.7,
      receiptId: 'RCPT-2025-0130',
    },
  ];

  // Animation on mount
  useEffect(() => {
    animateIn();
    loadUserData();
    loadRideHistory();
  }, []);

  useEffect(() => {
    filterRides();
    calculateStats();
  }, [activeTab, selectedFilter, searchQuery, rideHistory]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(tabScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
        delay: 200,
      }),
      Animated.timing(tabOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 200,
      }),
      Animated.spring(rideCardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 300,
      }),
      Animated.timing(rideCardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 300,
      }),
      Animated.spring(statsScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(statsOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateSearchIn = () => {
    setShowSearch(true);
    searchScale.setValue(0);
    searchOpacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(searchScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(searchOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateSearchOut = () => {
    Animated.parallel([
      Animated.spring(searchScale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(searchOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSearch(false);
      setSearchQuery('');
    });
  };

  const animateModalIn = () => {
    setShowFilterModal(true);
    modalScale.setValue(0.8);
    modalOpacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateModalOut = () => {
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFilterModal(false);
    });
  };

  const animateDetailsIn = (ride) => {
    setSelectedRide(ride);
    detailsScale.setValue(0.8);
    detailsOpacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(detailsScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(detailsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowRideDetails(true);
    });
  };

  const animateDetailsOut = () => {
    Animated.parallel([
      Animated.spring(detailsScale, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(detailsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowRideDetails(false);
      setSelectedRide(null);
    });
  };

  const loadUserData = async () => {
    try {
      const userData = await getUserData();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadRideHistory = async () => {
    try {
      setLoading(true);
      // Try to load from storage
      const history = await getRideHistory();
      if (history && history.length > 0) {
        setRideHistory(history);
      } else {
        // Use enhanced sample data
        setRideHistory(ENHANCED_SAMPLE_DATA);
      }
    } catch (error) {
      console.error('Failed to load ride history:', error);
      // Fallback to sample data
      setRideHistory(ENHANCED_SAMPLE_DATA);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRideHistory();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filterRides = () => {
    let filtered = [...rideHistory];
    
    // Filter by tab
    if (activeTab === 'Upcoming') {
      filtered = filtered.filter(ride => ride.status === 'scheduled' || ride.status === 'upcoming');
    } else {
      filtered = filtered.filter(ride => ride.status !== 'scheduled' && ride.status !== 'upcoming');
    }
    
    // Filter by selected filter
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'completed':
          filtered = filtered.filter(ride => ride.status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(ride => ride.status === 'cancelled');
          break;
        case 'bike':
          filtered = filtered.filter(ride => ride.vehicleType?.includes('bike'));
          break;
        case 'car':
          filtered = filtered.filter(ride => ride.vehicleType?.includes('car'));
          break;
        case 'last_month':
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          filtered = filtered.filter(ride => ride.timestamp >= oneMonthAgo.getTime());
          break;
        case 'last_3_months':
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          filtered = filtered.filter(ride => ride.timestamp >= threeMonthsAgo.getTime());
          break;
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ride => 
        ride.destination.toLowerCase().includes(query) ||
        ride.pickup.toLowerCase().includes(query) ||
        ride.driver.toLowerCase().includes(query) ||
        ride.vehicleModel.toLowerCase().includes(query)
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    setFilteredRides(filtered);
  };

  const calculateStats = () => {
    const completedRides = rideHistory.filter(ride => ride.status === 'completed');
    const totalSpent = completedRides.reduce((sum, ride) => sum + ride.price, 0);
    
    // Find most visited destination
    const destinationCounts = {};
    completedRides.forEach(ride => {
      destinationCounts[ride.destination] = (destinationCounts[ride.destination] || 0) + 1;
    });
    
    let mostVisited = null;
    let maxCount = 0;
    Object.entries(destinationCounts).forEach(([destination, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostVisited = destination;
      }
    });
    
    // Calculate average rating
    const ratings = completedRides.map(ride => ride.rating).filter(r => r !== undefined);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    
    setStats({
      totalRides: rideHistory.length,
      totalSpent,
      avgRating,
      mostVisited: mostVisited ? `${mostVisited.split(',')[0]}` : 'N/A',
    });
  };

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString('en-MW')}`;
  };

  const getVehicleIcon = (vehicleType) => {
    return VEHICLE_ICONS[vehicleType] || 'directions-car';
  };

  const getVehicleColor = (vehicleType) => {
    return VEHICLE_COLORS[vehicleType] || '#666';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'cancelled': return 'cancel';
      case 'ongoing': return 'timer';
      case 'upcoming': return 'schedule';
      case 'scheduled': return 'calendar-today';
      default: return 'help';
    }
  };

  const handleRepeatRide = (ride) => {
    navigation.navigate('RideSelection', {
      destination: ride.destination,
      pickupLocation: ride.pickup,
      rideType: ride.vehicleType,
    });
  };

  const handleViewReceipt = (ride) => {
    navigation.navigate('ReceiptScreen', { ride });
  };

  const handleContactDriver = (ride) => {
    navigation.navigate('ChatScreen', {
      driverId: ride.driver.replace(/\s/g, ''),
      driverName: ride.driver,
    });
  };

  const handleRateRide = (ride) => {
    if (ride.rating) {
      // Already rated, show rating
      animateDetailsIn(ride);
    } else {
      navigation.navigate('RideRating', { rideId: ride.id, driver: { name: ride.driver } });
    }
  };

  const renderStatsCard = () => (
    <AnimatedView 
      style={[
        styles.statsCard,
        {
          opacity: statsOpacity,
          transform: [{ scale: statsScale }],
        },
      ]}
    >
      <LinearGradient
        colors={['#22C55E', '#10B981']}
        style={styles.statsGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.statsTitle}>Your Ride Journey</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalRides}</Text>
            <Text style={styles.statLabel}>Total Rides</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.statValueSmall]}>
              {stats.mostVisited}
            </Text>
            <Text style={styles.statLabel}>Most Visited</Text>
          </View>
        </View>
      </LinearGradient>
    </AnimatedView>
  );

  const renderRideItem = ({ item, index }) => {
    const delay = index * 50;
    
    return (
      <AnimatedView
        style={[
          styles.rideCard,
          {
            opacity: rideCardOpacity,
            transform: [
              { scale: rideCardScale },
              { translateY: slideUpAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, -5],
              })},
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.rideCardTouchable}
          onPress={() => animateDetailsIn(item)}
          activeOpacity={0.7}
        >
          {/* Ride Header */}
          <View style={styles.rideHeader}>
            <View style={styles.rideType}>
              <MaterialCommunityIcon 
                name={getVehicleIcon(item.vehicleType)} 
                size={16} 
                color={getVehicleColor(item.vehicleType)} 
              />
              <Text style={[
                styles.rideTypeText,
                { color: getVehicleColor(item.vehicleType) }
              ]}>
                {item.vehicleType.includes('premium') ? 'Premium' : 
                 item.vehicleType.includes('economy') ? 'Economy' :
                 item.vehicleType.includes('bike') ? 'Bike' : 'Car'}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] + '20' }
            ]}>
              <MaterialIcon 
                name={getStatusIcon(item.status)} 
                size={12} 
                color={STATUS_COLORS[item.status]} 
              />
              <Text style={[
                styles.statusText,
                { color: STATUS_COLORS[item.status] }
              ]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          
          {/* Ride Details */}
          <View style={styles.rideDetails}>
            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>FROM</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.pickup}
                </Text>
              </View>
            </View>
            
            <View style={styles.locationLine} />
            
            <View style={styles.locationRow}>
              <MaterialIcon name="place" size={12} color="#EA4335" />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>TO</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.destination}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Ride Info */}
          <View style={styles.rideInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialIcon name="person" size={12} color="#666" />
                <Text style={styles.infoText}>{item.driver}</Text>
              </View>
              
              {item.distance && (
                <View style={styles.infoItem}>
                  <MaterialIcon name="straighten" size={12} color="#666" />
                  <Text style={styles.infoText}>{item.distance}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.infoRow}>
              {item.duration && (
                <View style={styles.infoItem}>
                  <MaterialIcon name="timer" size={12} color="#666" />
                  <Text style={styles.infoText}>{item.duration}</Text>
                </View>
              )}
              
              {item.rating && (
                <View style={styles.ratingBadge}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcon 
                      key={star}
                      name={star <= item.rating ? "star" : "star-border"} 
                      size={10} 
                      color="#F59E0B" 
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
          
          {/* Ride Footer */}
          <View style={styles.rideFooter}>
            <Text style={styles.rideDate}>{item.date}</Text>
            <Text style={[
              styles.ridePrice,
              item.status === 'cancelled' && styles.cancelledPrice
            ]}>
              {item.status === 'cancelled' ? `Cancelled - ${formatCurrency(item.cancellationFee || 0)} fee` : formatCurrency(item.price)}
            </Text>
          </View>
        </TouchableOpacity>
      </AnimatedView>
    );
  };

  const renderMonthSection = (month, year, rides) => {
    if (rides.length === 0) return null;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <AnimatedView 
        key={`${month}-${year}`} 
        style={styles.monthSection}
      >
        <Text style={styles.monthTitle}>
          {monthNames[month]} {year}
        </Text>
        <FlatList
          data={rides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          initialNumToRender={5}
        />
      </AnimatedView>
    );
  };

  // Group rides by month
  const groupRidesByMonth = () => {
    const grouped = {};
    
    filteredRides.forEach(ride => {
      const date = new Date(ride.timestamp);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(ride);
    });
    
    return grouped;
  };

  const groupedRides = groupRidesByMonth();

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="none"
      onRequestClose={animateModalOut}
    >
      <AnimatedView style={[styles.modalOverlay, { opacity: modalOpacity }]}>
        <AnimatedView style={[styles.modalContent, { transform: [{ scale: modalScale }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Rides</Text>
            <TouchableOpacity onPress={animateModalOut}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterOption,
                  selectedFilter === filter.id && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setSelectedFilter(filter.id);
                  setTimeout(animateModalOut, 300);
                }}
              >
                <View style={styles.filterOptionContent}>
                  <MaterialIcon 
                    name={filter.icon} 
                    size={20} 
                    color={selectedFilter === filter.id ? '#fff' : (filter.color || '#666')} 
                  />
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === filter.id && styles.filterOptionTextActive,
                  ]}>
                    {filter.label}
                  </Text>
                </View>
                {selectedFilter === filter.id && (
                  <MaterialIcon name="check" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.clearFilterButton}
            onPress={() => {
              setSelectedFilter('all');
              setTimeout(animateModalOut, 300);
            }}
          >
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );

  const renderRideDetailsModal = () => (
    <Modal
      visible={showRideDetails}
      transparent
      animationType="none"
      onRequestClose={animateDetailsOut}
    >
      <AnimatedView style={[styles.detailsOverlay, { opacity: detailsOpacity }]}>
        <AnimatedView style={[styles.detailsContent, { transform: [{ scale: detailsScale }] }]}>
          {selectedRide && (
            <>
              <View style={styles.detailsHeader}>
                <View>
                  <Text style={styles.detailsTitle}>Ride Details</Text>
                  <Text style={styles.detailsSubtitle}>{selectedRide.date}</Text>
                </View>
                <TouchableOpacity onPress={animateDetailsOut}>
                  <MaterialIcon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.detailsBody}>
                {/* Status */}
                <View style={styles.detailsSection}>
                  <View style={[
                    styles.detailsStatus,
                    { backgroundColor: STATUS_COLORS[selectedRide.status] + '20' }
                  ]}>
                    <MaterialIcon 
                      name={getStatusIcon(selectedRide.status)} 
                      size={16} 
                      color={STATUS_COLORS[selectedRide.status]} 
                    />
                    <Text style={[
                      styles.detailsStatusText,
                      { color: STATUS_COLORS[selectedRide.status] }
                    ]}>
                      {selectedRide.status.charAt(0).toUpperCase() + selectedRide.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                {/* Route */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Route</Text>
                  <View style={styles.routeDetails}>
                    <View style={styles.routePoint}>
                      <View style={[styles.routeDot, { backgroundColor: '#3B82F6' }]} />
                      <View style={styles.routeTextContainer}>
                        <Text style={styles.routeLabel}>PICKUP</Text>
                        <Text style={styles.routeText}>{selectedRide.pickup}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.routeLine} />
                    
                    <View style={styles.routePoint}>
                      <View style={[styles.routeDot, { backgroundColor: '#EA4335' }]} />
                      <View style={styles.routeTextContainer}>
                        <Text style={styles.routeLabel}>DESTINATION</Text>
                        <Text style={styles.routeText}>{selectedRide.destination}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* Driver & Vehicle */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Driver & Vehicle</Text>
                  <View style={styles.driverCard}>
                    <LinearGradient
                      colors={['#F3F4F6', '#E5E7EB']}
                      style={styles.driverAvatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <MaterialIcon name="person" size={24} color="#666" />
                    </LinearGradient>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{selectedRide.driver}</Text>
                      <View style={styles.driverMeta}>
                        <View style={styles.driverRating}>
                          <MaterialIcon name="star" size={12} color="#F59E0B" />
                          <Text style={styles.driverRatingText}>{selectedRide.driverRating}</Text>
                        </View>
                        <Text style={styles.driverSeparator}>•</Text>
                        <MaterialCommunityIcon 
                          name={getVehicleIcon(selectedRide.vehicleType)} 
                          size={12} 
                          color={getVehicleColor(selectedRide.vehicleType)} 
                        />
                        <Text style={styles.vehicleText}>{selectedRide.vehicleModel}</Text>
                        <Text style={styles.driverSeparator}>•</Text>
                        <Text style={styles.plateText}>{selectedRide.plate}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* Ride Stats */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Ride Information</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Distance</Text>
                      <Text style={styles.statValue}>{selectedRide.distance || 'N/A'}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Duration</Text>
                      <Text style={styles.statValue}>{selectedRide.duration || 'N/A'}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Payment</Text>
                      <Text style={styles.statValue}>
                        {selectedRide.paymentMethod === 'cash' ? 'Cash' :
                         selectedRide.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                         selectedRide.paymentMethod === 'wallet' ? 'Wallet' : 'Card'}
                      </Text>
                    </View>
                    {selectedRide.carbonSaved && (
                      <View style={styles.statCard}>
                        <Text style={styles.statLabel}>CO₂ Saved</Text>
                        <Text style={styles.statValue}>{selectedRide.carbonSaved} kg</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Receipt */}
                {selectedRide.receiptId && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Receipt</Text>
                    <View style={styles.receiptCard}>
                      <View style={styles.receiptHeader}>
                        <MaterialIcon name="receipt" size={20} color="#10B981" />
                        <Text style={styles.receiptId}>{selectedRide.receiptId}</Text>
                      </View>
                      <View style={styles.receiptAmount}>
                        <Text style={styles.receiptLabel}>Total Amount</Text>
                        <Text style={styles.receiptTotal}>
                          {formatCurrency(selectedRide.price)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
              
              {/* Actions */}
              <View style={styles.detailsActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleRepeatRide(selectedRide)}
                >
                  <MaterialIcon name="repeat" size={18} color="#3B82F6" />
                  <Text style={styles.actionText}>Repeat Ride</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleViewReceipt(selectedRide)}
                >
                  <MaterialIcon name="receipt" size={18} color="#10B981" />
                  <Text style={styles.actionText}>View Receipt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleContactDriver(selectedRide)}
                >
                  <MaterialIcon name="chat" size={18} color="#666" />
                  <Text style={styles.actionText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <AnimatedView style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Rides</Text>
          <Text style={styles.headerSubtitle}>Your journey with Kabaza</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={animateSearchIn}
          >
            <MaterialIcon name="search" size={24} color="#000" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={animateModalIn}
          >
            <MaterialIcon name="filter-list" size={24} color="#000" />
            {selectedFilter !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </AnimatedView>

      {/* SEARCH BAR */}
      {showSearch && (
        <AnimatedView 
          style={[
            styles.searchContainer,
            {
              opacity: searchOpacity,
              transform: [{ scale: searchScale }],
            },
          ]}
        >
          <View style={styles.searchInput}>
            <MaterialIcon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchTextInput}
              placeholder="Search rides by location, driver..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity onPress={animateSearchOut}>
              <MaterialIcon name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </AnimatedView>
      )}

      {/* STATS CARD */}
      {activeTab === 'Past' && renderStatsCard()}

      {/* TABS */}
      <AnimatedView 
        style={[
          styles.tabsContainer,
          {
            opacity: tabOpacity,
            transform: [{ scale: tabScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Past' && styles.activeTab]}
          onPress={() => setActiveTab('Past')}
        >
          <Text style={[styles.tabText, activeTab === 'Past' && styles.activeTabText]}>
            Past Rides
          </Text>
          {activeTab === 'Past' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('Upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'Upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
          {activeTab === 'Upcoming' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </AnimatedView>

      {/* RIDE LIST */}
      <AnimatedView style={[styles.content, { opacity: fadeAnim }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.loadingText}>Loading your rides...</Text>
          </View>
        ) : filteredRides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcon name="history" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No rides found' : 'No rides yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try a different search term'
                : activeTab === 'Past' 
                  ? 'Your ride history will appear here'
                  : 'You have no upcoming rides'}
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
        ) : (
          <FlatList
            data={Object.keys(groupedRides)
              .sort((a, b) => b.localeCompare(a))
              .map(key => {
                const [year, month] = key.split('-').map(Number);
                return { key, year, month, rides: groupedRides[key] };
              })}
            renderItem={({ item }) => renderMonthSection(item.month, item.year, item.rides)}
            keyExtractor={(item) => item.key}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#22C55E']}
                tintColor="#22C55E"
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 100 }} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </AnimatedView>

      {/* FILTER MODAL */}
      {renderFilterModal()}

      {/* RIDE DETAILS MODAL */}
      {renderRideDetailsModal()}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('RiderHome')}
      >
        <LinearGradient
          colors={['#22C55E', '#10B981']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcon name="add" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginLeft: 12,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // SEARCH CONTAINER
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    marginLeft: 10,
    marginRight: 10,
    padding: 0,
    includeFontPadding: false,
  },
  
  // STATS CARD
  statsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statsGradient: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 16,
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
  
  // TABS
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Styles for active tab
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#000000',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 1.5,
  },
  
  // CONTENT
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  
  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  
  // EMPTY STATE
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  // MONTH SECTION
  monthSection: {
    marginBottom: 32,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  
  // RIDE CARD
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rideCardTouchable: {
    padding: 20,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  rideDetails: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  locationLine: {
    width: 1,
    height: 12,
    backgroundColor: '#D1D5DB',
    marginLeft: 3,
    marginVertical: 4,
  },
  rideInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideDate: {
    fontSize: 13,
    color: '#666',
  },
  ridePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  cancelledPrice: {
    color: '#EF4444',
  },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  modalBody: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#22C55E',
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  clearFilterButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  clearFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  
  // RIDE DETAILS MODAL
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailsContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  detailsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  detailsBody: {
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  routeDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  routeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginLeft: 5,
    marginVertical: 4,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 2,
  },
  driverSeparator: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  vehicleText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  plateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  receiptCard: {
    backgroundColor: '#F0F9F0',
    borderRadius: 16,
    padding: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  receiptAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 14,
    color: '#666',
  },
  receiptTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  detailsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  
  // FLOATING ACTION BUTTON
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RidesScreen;