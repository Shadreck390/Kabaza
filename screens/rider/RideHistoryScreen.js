// screens/rider/RideHistoryScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import rideService from '@src/services/rideService';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUserData } from '@src/utils/userStorage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const { width, height } = Dimensions.get('window');

// Mock ride history data with more details
const MOCK_RIDES = [
  {
    id: '1',
    date: 'Today, 10:45 AM',
    pickup: 'Area 3 Shopping Complex',
    pickupCoordinates: { latitude: -13.9583, longitude: 33.7689 },
    destination: 'Lilongwe City Mall',
    destinationCoordinates: { latitude: -13.9626, longitude: 33.7741 },
    driver: 'John Banda',
    driverImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    vehicle: 'Toyota Corolla - LL 2345 A',
    vehicleType: 'kabaza',
    fare: 850,
    status: 'completed',
    rating: 5,
    distance: '2.5 km',
    duration: '8 min',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-001',
    route: [
      { latitude: -13.9583, longitude: 33.7689 },
      { latitude: -13.9626, longitude: 33.7741 },
    ],
    carbonSaved: 1.2,
    timeSaved: 15,
    waitTime: '2 min',
  },
  {
    id: '2',
    date: 'Yesterday, 3:30 PM',
    pickup: 'Current Location',
    pickupCoordinates: { latitude: -13.9583, longitude: 33.7689 },
    destination: 'Kamuzu Central Hospital',
    destinationCoordinates: { latitude: -13.9626, longitude: 33.7741 },
    driver: 'Sarah Mwale',
    driverImage: 'https://randomuser.me/api/portraits/women/44.jpg',
    vehicle: 'Honda Fit - LL 5678 B',
    vehicleType: 'comfort',
    fare: 950,
    status: 'completed',
    rating: 4,
    distance: '3.2 km',
    duration: '12 min',
    paymentMethod: 'mobile_money',
    receiptId: 'RCPT-2024-002',
    route: [
      { latitude: -13.9825, longitude: 33.7861 },
      { latitude: -13.9626, longitude: 33.7741 },
    ],
    carbonSaved: 1.8,
    timeSaved: 20,
    waitTime: '3 min',
  },
  {
    id: '3',
    date: 'Dec 15, 2:15 PM',
    pickup: 'Bunda Taxi Rank',
    pickupCoordinates: { latitude: -13.9583, longitude: 33.7689 },
    destination: 'Likuni Hospital',
    destinationCoordinates: { latitude: -13.9626, longitude: 33.7741 },
    driver: 'Mike Phiri',
    driverImage: 'https://randomuser.me/api/portraits/men/67.jpg',
    vehicle: 'Toyota Premio - LL 9012 C',
    vehicleType: 'green',
    fare: 1200,
    status: 'completed',
    rating: 5,
    distance: '5.1 km',
    duration: '18 min',
    paymentMethod: 'wallet',
    receiptId: 'RCPT-2024-003',
    route: [
      { latitude: -13.9750, longitude: 33.7867 },
      { latitude: -13.9626, longitude: 33.7741 },
    ],
    carbonSaved: 2.3,
    timeSaved: 25,
    waitTime: '4 min',
  },
  {
    id: '4',
    date: 'Dec 14, 11:20 AM',
    pickup: 'Current Location',
    pickupCoordinates: { latitude: -13.9583, longitude: 33.7689 },
    destination: 'Mzuzu University',
    destinationCoordinates: { latitude: -13.9626, longitude: 33.7741 },
    driver: 'Chimwemwe Kanyenda',
    driverImage: 'https://randomuser.me/api/portraits/women/68.jpg',
    vehicle: 'Nissan Sunny - MZ 3456 D',
    vehicleType: 'xl',
    fare: 1500,
    status: 'cancelled',
    rating: null,
    distance: '4.8 km',
    duration: '15 min',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-004',
    cancellationFee: 200,
    cancellationReason: 'Driver was delayed',
  },
  {
    id: '5',
    date: 'Dec 12, 9:05 AM',
    pickup: 'Crossroads Hotel',
    pickupCoordinates: { latitude: -13.9583, longitude: 33.7689 },
    destination: 'Lilongwe Bus Station',
    destinationCoordinates: { latitude: -13.9626, longitude: 33.7741 },
    driver: 'Temwanani Moyo',
    driverImage: 'https://randomuser.me/api/portraits/women/23.jpg',
    vehicle: 'Toyota Corolla - LL 7890 E',
    vehicleType: 'kabaza',
    fare: 750,
    status: 'completed',
    rating: 4,
    distance: '1.8 km',
    duration: '6 min',
    paymentMethod: 'card',
    receiptId: 'RCPT-2024-005',
    carbonSaved: 0.8,
    timeSaved: 10,
    waitTime: '1 min',
  },
];

// Filters
const FILTERS = [
  { id: 'all', label: 'All Rides', icon: 'history' },
  { id: 'completed', label: 'Completed', icon: 'check-circle', color: '#22C55E' },
  { id: 'cancelled', label: 'Cancelled', icon: 'cancel', color: '#EF4444' },
  { id: 'last7days', label: 'Last 7 Days', icon: 'calendar-today' },
  { id: 'last30days', label: 'Last 30 Days', icon: 'event-note' },
  { id: 'highest_fare', label: 'Highest Fare', icon: 'trending-up' },
  { id: 'lowest_fare', label: 'Lowest Fare', icon: 'trending-down' },
];

// Sort Options
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'highest_fare', label: 'Highest Fare' },
  { id: 'lowest_fare', label: 'Lowest Fare' },
  { id: 'longest_distance', label: 'Longest Distance' },
  { id: 'shortest_distance', label: 'Shortest Distance' },
];

// Animated Components
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RideHistoryScreen() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [rides, setRides] = useState(MOCK_RIDES);
  const [filteredRides, setFilteredRides] = useState(MOCK_RIDES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalSpent: 0,
    avgRating: 0,
    totalDistance: 0,
    carbonSaved: 0,
    timeSaved: 0,
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(1)).current;
  const filterScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const statsScale = useRef(new Animated.Value(0.9)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Animation sequences
  useFocusEffect(
    React.useCallback(() => {
      animateIn();
      return () => {
        // Reset animations on blur
        fadeAnim.setValue(0);
        slideUpAnim.setValue(30);
      };
    }, [])
  );

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
        delay: 200,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 200,
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

  useEffect(() => {
    loadUserData();
    calculateStats();
  }, []);

  useEffect(() => {
    filterAndSortRides();
  }, [activeFilter, selectedSort, searchQuery, rides]);

  const loadUserData = async () => {
    const data = await getUserData();
    setUserData(data);
  };

  const calculateStats = () => {
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const totalSpent = completedRides.reduce((sum, ride) => sum + ride.fare, 0);
    const totalDistance = completedRides.reduce((sum, ride) => {
      const distance = parseFloat(ride.distance.split(' ')[0]);
      return sum + (isNaN(distance) ? 0 : distance);
    }, 0);
    const totalCarbon = completedRides.reduce((sum, ride) => sum + (ride.carbonSaved || 0), 0);
    const totalTimeSaved = completedRides.reduce((sum, ride) => sum + (ride.timeSaved || 0), 0);
    const ratings = completedRides.map(ride => ride.rating).filter(r => r !== null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    setStats({
      totalRides: rides.length,
      totalSpent,
      avgRating,
      totalDistance,
      carbonSaved: totalCarbon,
      timeSaved: totalTimeSaved,
    });
  };

  const filterAndSortRides = () => {
    let filtered = [...rides];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ride => 
        ride.pickup.toLowerCase().includes(query) ||
        ride.destination.toLowerCase().includes(query) ||
        ride.driver.toLowerCase().includes(query) ||
        ride.vehicle.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    switch (activeFilter) {
      case 'completed':
        filtered = filtered.filter(ride => ride.status === 'completed');
        break;
      case 'cancelled':
        filtered = filtered.filter(ride => ride.status === 'cancelled');
        break;
      case 'last7days':
        // Mock: Show recent rides
        filtered = filtered.slice(0, 3);
        break;
      case 'last30days':
        // Mock: Show more recent rides
        filtered = filtered.slice(0, 5);
        break;
      case 'highest_fare':
        filtered.sort((a, b) => b.fare - a.fare);
        break;
      case 'lowest_fare':
        filtered.sort((a, b) => a.fare - b.fare);
        break;
    }
    
    // Apply sort
    switch (selectedSort) {
      case 'newest':
        // Already sorted by date in mock data
        break;
      case 'oldest':
        filtered.reverse();
        break;
      case 'highest_fare':
        filtered.sort((a, b) => b.fare - a.fare);
        break;
      case 'lowest_fare':
        filtered.sort((a, b) => a.fare - b.fare);
        break;
      case 'longest_distance':
        filtered.sort((a, b) => {
          const distA = parseFloat(a.distance.split(' ')[0]);
          const distB = parseFloat(b.distance.split(' ')[0]);
          return distB - distA;
        });
        break;
      case 'shortest_distance':
        filtered.sort((a, b) => {
          const distA = parseFloat(a.distance.split(' ')[0]);
          const distB = parseFloat(b.distance.split(' ')[0]);
          return distA - distB;
        });
        break;
    }
    
    setFilteredRides(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call with animations
    Animated.sequence([
      Animated.timing(headerOpacity, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(() => {
      setRefreshing(false);
      calculateStats();
    }, 1500);
  };

  const handleRidePress = (ride) => {
    // Animation on press
    Animated.sequence([
      Animated.spring(cardScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();
    
    setTimeout(() => {
      navigation.navigate('RideDetails', { rideId: ride.id, rideData: ride });
    }, 150);
  };

  const handleReceiptPress = (ride) => {
    navigation.navigate('ReceiptScreen', { rideId: ride.id, rideData: ride });
  };

  const handleRepeatRide = async (ride) => {
    try {
      const repeatData = await rideService.repeatRide(ride.id);

      if (repeatData && repeatData.pickupCoordinates && repeatData.destinationCoordinates) {
        navigation.navigate('RideBooking', {
          destination: repeatData.destination,
          destinationCoordinates: repeatData.destinationCoordinates,
          pickupLocation: repeatData.pickupLocation,
          pickupCoordinates: repeatData.pickupCoordinates,
          rideType: repeatData.rideType,
        });
      } else {
        navigation.navigate('RideSelection', {
          destination: ride.destination,
          pickupLocation: ride.pickup,
          rideType: ride.vehicleType,
        });
      }
    } catch (error) {
      navigation.navigate('RideSelection', {
        destination: ride.destination,
        pickupLocation: ride.pickup,
        rideType: ride.vehicleType,
      });
    }
  };

  const handleContactDriver = (ride) => {
    navigation.navigate('ChatScreen', { 
      driverId: ride.driver,
      driverName: ride.driver,
      driverImage: ride.driverImage 
    });
  };

  const handleRateRide = (ride) => {
    navigation.navigate('RateRide', { rideId: ride.id });
  };

  const handleFilterPress = () => {
    Animated.sequence([
      Animated.spring(filterScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(filterScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();
    
    setTimeout(() => {
      setShowFilterModal(true);
      animateModalIn();
    }, 150);
  };

  const handleSortPress = () => {
    setShowSortModal(true);
    animateModalIn();
  };

  const animateModalIn = () => {
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
      setShowSortModal(false);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'cancelled': return '#EF4444';
      case 'ongoing': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'cancelled': return 'cancel';
      case 'ongoing': return 'timer';
      default: return 'help';
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'kabaza': return 'motorcycle';
      case 'comfort': return 'directions-car';
      case 'green': return 'eco';
      case 'xl': return 'airport-shuttle';
      default: return 'directions-car';
    }
  };

  const getVehicleColor = (type) => {
    switch (type) {
      case 'kabaza': return '#00a82d';
      case 'comfort': return '#2196f3';
      case 'green': return '#4caf50';
      case 'xl': return '#ff9800';
      default: return '#666';
    }
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return 'attach-money';
      case 'mobile_money': return 'smartphone';
      case 'wallet': return 'account-balance-wallet';
      case 'card': return 'credit-card';
      default: return 'payment';
    }
  };

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString('en-MW')}`;
  };

  const formatDate = (dateStr) => {
    return dateStr;
  };

  const renderRideItem = ({ item, index }) => {
    const delay = index * 100;
    
    return (
      <AnimatedView
        style={[
          styles.rideCard,
          {
            opacity: cardOpacity,
            transform: [
              { scale: cardScale },
              { translateY: slideUpAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, -10],
              })},
            ],
          },
        ]}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => handleRidePress(item)}
        >
          {/* Ride Header */}
          <View style={styles.rideHeader}>
            <AnimatedView 
              style={[
                styles.rideStatus,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: cardScale }],
                },
              ]}
            >
              <LinearGradient
                colors={[getStatusColor(item.status), getStatusColor(item.status) + 'DD']}
                style={styles.statusBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon 
                  name={getStatusIcon(item.status)} 
                  size={12} 
                  color="#fff" 
                />
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </LinearGradient>
            </AnimatedView>
            
            <View style={styles.rideMeta}>
              <View style={styles.metaItem}>
                <MaterialIcon name="access-time" size={12} color="#666" />
                <Text style={styles.metaText}>{item.waitTime} wait</Text>
              </View>
              <View style={styles.metaDivider} />
              <Text style={styles.rideDate}>{item.date}</Text>
            </View>
          </View>
          
          {/* Route */}
          <View style={styles.routeContainer}>
            <View style={styles.routeLine}>
              <View style={[styles.routeDot, styles.pickupDot]} />
              <View style={styles.routePath} />
              <View style={[styles.routeDot, styles.destinationDot]} />
            </View>
            
            <View style={styles.routeDetails}>
              <View style={styles.routePoint}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{item.pickup}</Text>
              </View>
              
              <View style={styles.distanceBadge}>
                <MaterialIcon name="straighten" size={12} color="#fff" />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
              
              <View style={styles.routePoint}>
                <Text style={styles.routeLabel}>DESTINATION</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{item.destination}</Text>
              </View>
            </View>
          </View>
          
          {/* Driver & Vehicle */}
          <View style={styles.driverSection}>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <MaterialIcon name="person" size={20} color="#fff" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{item.driver}</Text>
                <View style={styles.vehicleInfo}>
                  <MaterialIcon 
                    name={getVehicleIcon(item.vehicleType)} 
                    size={14} 
                    color={getVehicleColor(item.vehicleType)} 
                  />
                  <Text style={styles.vehicleText}>{item.vehicle}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>FARE</Text>
              <Text style={styles.fareAmount}>{formatCurrency(item.fare)}</Text>
            </View>
          </View>
          
          {/* Ride Stats */}
          {item.status === 'completed' && (
            <View style={styles.rideStats}>
              <View style={styles.statBadge}>
                <MaterialIcon name="timer" size={12} color="#666" />
                <Text style={styles.statText}>{item.duration}</Text>
              </View>
              
              {item.carbonSaved && (
                <View style={styles.statBadge}>
                  <MaterialIcon name="eco" size={12} color="#4caf50" />
                  <Text style={styles.statText}>{item.carbonSaved} kg CO₂ saved</Text>
                </View>
              )}
              
              <View style={styles.statBadge}>
                <MaterialIcon name={getPaymentIcon(item.paymentMethod)} size={12} color="#666" />
                <Text style={styles.statText}>
                  {item.paymentMethod === 'cash' ? 'Cash' : 
                   item.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                   item.paymentMethod === 'wallet' ? 'Wallet' : 'Card'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Rating */}
          {item.status === 'completed' && item.rating && (
            <View style={styles.ratingContainer}>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcon 
                    key={star}
                    name={star <= item.rating ? "star" : "star-border"} 
                    size={14} 
                    color="#F59E0B" 
                  />
                ))}
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            </View>
          )}
          
          {/* Actions */}
          <View style={styles.rideActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleReceiptPress(item)}
            >
              <MaterialIcon name="receipt" size={18} color="#22C55E" />
              <Text style={styles.actionText}>Receipt</Text>
            </TouchableOpacity>
            
            {item.status === 'completed' && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleRepeatRide(item)}
              >
                <MaterialIcon name="repeat" size={18} color="#3B82F6" />
                <Text style={styles.actionText}>Repeat</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleContactDriver(item)}
            >
              <MaterialIcon name="chat" size={18} color="#666" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
            
            {item.status === 'completed' && !item.rating && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleRateRide(item)}
              >
                <MaterialIcon name="star" size={18} color="#F59E0B" />
                <Text style={styles.actionText}>Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </AnimatedView>
    );
  };

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
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterOption,
                  activeFilter === filter.id && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setActiveFilter(filter.id);
                  setTimeout(animateModalOut, 300);
                }}
              >
                <View style={styles.filterOptionContent}>
                  <MaterialIcon 
                    name={filter.icon} 
                    size={20} 
                    color={activeFilter === filter.id ? '#fff' : (filter.color || '#666')} 
                  />
                  <Text style={[
                    styles.filterOptionText,
                    activeFilter === filter.id && styles.filterOptionTextActive,
                  ]}>
                    {filter.label}
                  </Text>
                </View>
                {activeFilter === filter.id && (
                  <MaterialIcon name="check" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );

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
            <Text style={styles.statValue}>{stats.totalDistance.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>
        
        {stats.carbonSaved > 0 && (
          <View style={styles.ecoStats}>
            <View style={styles.ecoStat}>
              <MaterialIcon name="eco" size={16} color="#fff" />
              <Text style={styles.ecoText}>{stats.carbonSaved.toFixed(1)} kg CO₂ saved</Text>
            </View>
            <View style={styles.ecoStat}>
              <MaterialIcon name="timer" size={16} color="#fff" />
              <Text style={styles.ecoText}>{stats.timeSaved} mins saved</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </AnimatedView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <AnimatedView style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ride History</Text>
          <Text style={styles.headerSubtitle}>Your journey with Kabaza</Text>
        </View>
        
        <AnimatedTouchable 
          style={[styles.filterIcon, { transform: [{ scale: filterScale }] }]}
          onPress={handleFilterPress}
        >
          <MaterialIcon name="filter-list" size={24} color="#000000" />
        </AnimatedTouchable>
      </AnimatedView>

      {/* SEARCH BAR */}
      <AnimatedView 
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
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
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={handleSortPress}
        >
          <MaterialIcon name="sort" size={20} color="#000" />
        </TouchableOpacity>
      </AnimatedView>

      {/* STATS CARD */}
      {renderStatsCard()}

      {/* RIDES LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading your rides...</Text>
        </View>
      ) : filteredRides.length === 0 ? (
        <AnimatedView 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <MaterialIcon name="history" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No rides found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? "No rides match your search" 
              : activeFilter === 'all' 
                ? "You haven't taken any rides yet" 
                : `No ${activeFilter} rides found`}
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('RiderHome')}
          >
            <LinearGradient
              colors={['#22C55E', '#10B981']}
              style={styles.emptyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.emptyButtonText}>Book Your First Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedView>
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22C55E']}
              tintColor="#22C55E"
              progressViewOffset={40}
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {filteredRides.length} ride{filteredRides.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
            </Text>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      {/* FILTER MODAL */}
      {renderFilterModal()}

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
    backgroundColor: '#F3F4F6',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  
  // SEARCH
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    marginLeft: 10,
    padding: 0,
    includeFontPadding: false,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  
  // STATS CARD
  statsCard: {
    marginHorizontal: 20,
    marginTop: 8,
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
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  ecoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  ecoStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecoText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 6,
    opacity: 0.9,
  },
  
  // FILTER MODAL
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
    maxHeight: height * 0.8,
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
    maxHeight: height * 0.6,
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
  
  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // LIST
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
    marginTop: 4,
  },
  
  // RIDE CARD
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  
  // RIDE HEADER
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rideStatus: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  rideMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  rideDate: {
    fontSize: 11,
    color: '#666',
  },
  
  // ROUTE
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  routeLine: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickupDot: {
    backgroundColor: '#3B82F6',
  },
  destinationDot: {
    backgroundColor: '#22C55E',
  },
  routePath: {
    width: 2,
    height: 40,
    backgroundColor: '#D1D5DB',
    marginVertical: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routePoint: {
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 18,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  
  // DRIVER SECTION
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  
  // RIDE STATS
  rideStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  
  // RATING
  ratingContainer: {
    marginBottom: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  
  // ACTIONS
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
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