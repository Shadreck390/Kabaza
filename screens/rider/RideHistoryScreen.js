// screens/rider/RideHistoryScreen.js
import React, { useState, useEffect } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUserData } from '@utils/userStorage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Mock ride history data
const MOCK_RIDES = [
  {
    id: '1',
    date: 'Today, 10:45 AM',
    pickup: 'Area 3 Shopping Complex',
    destination: 'Lilongwe City Mall',
    driver: 'John Banda',
    vehicle: 'Toyota Corolla - LL 2345 A',
    fare: 850,
    status: 'completed',
    rating: 5,
    distance: '2.5 km',
    duration: '8 min',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-001',
  },
  {
    id: '2',
    date: 'Yesterday, 3:30 PM',
    pickup: 'Current Location',
    destination: 'Kamuzu Central Hospital',
    driver: 'Sarah Mwale',
    vehicle: 'Honda Fit - LL 5678 B',
    fare: 950,
    status: 'completed',
    rating: 4,
    distance: '3.2 km',
    duration: '12 min',
    paymentMethod: 'mobile_money',
    receiptId: 'RCPT-2024-002',
  },
  {
    id: '3',
    date: 'Dec 15, 2:15 PM',
    pickup: 'Bunda Taxi Rank',
    destination: 'Likuni Hospital',
    driver: 'Mike Phiri',
    vehicle: 'Toyota Premio - LL 9012 C',
    fare: 1200,
    status: 'completed',
    rating: 5,
    distance: '5.1 km',
    duration: '18 min',
    paymentMethod: 'wallet',
    receiptId: 'RCPT-2024-003',
  },
  {
    id: '4',
    date: 'Dec 14, 11:20 AM',
    pickup: 'Current Location',
    destination: 'Mzuzu University',
    driver: 'Chimwemwe Kanyenda',
    vehicle: 'Nissan Sunny - MZ 3456 D',
    fare: 1500,
    status: 'cancelled',
    rating: null,
    distance: '4.8 km',
    duration: '15 min',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-004',
    cancellationFee: 200,
  },
  {
    id: '5',
    date: 'Dec 12, 9:05 AM',
    pickup: 'Crossroads Hotel',
    destination: 'Lilongwe Bus Station',
    driver: 'Temwanani Moyo',
    vehicle: 'Toyota Corolla - LL 7890 E',
    fare: 750,
    status: 'completed',
    rating: 4,
    distance: '1.8 km',
    duration: '6 min',
    paymentMethod: 'card',
    receiptId: 'RCPT-2024-005',
  },
  {
    id: '6',
    date: 'Dec 10, 7:45 PM',
    pickup: 'Shoprite Blantyre',
    destination: 'Mount Soche Hotel',
    driver: 'Grace Banda',
    vehicle: 'Hyundai i10 - BL 1234 F',
    fare: 800,
    status: 'completed',
    rating: 5,
    distance: '2.1 km',
    duration: '7 min',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-006',
  },
  {
    id: '7',
    date: 'Dec 8, 4:30 PM',
    pickup: 'Current Location',
    destination: 'Chileka Airport',
    driver: 'James Kamanga',
    vehicle: 'Mazda Demio - BL 5678 G',
    fare: 2500,
    status: 'completed',
    rating: 4,
    distance: '12.5 km',
    duration: '25 min',
    paymentMethod: 'mobile_money',
    receiptId: 'RCPT-2024-007',
  },
  {
    id: '8',
    date: 'Dec 5, 1:15 PM',
    pickup: 'Zomba Plateau',
    destination: 'Chancellor College',
    driver: 'Mercy Kaliati',
    vehicle: 'Toyota Vitz - ZB 9012 H',
    fare: 900,
    status: 'completed',
    rating: 5,
    distance: '3.5 km',
    duration: '10 min',
    paymentMethod: 'wallet',
    receiptId: 'RCPT-2024-008',
  },
];

export default function RideHistoryScreen() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [rides, setRides] = useState(MOCK_RIDES);
  const [filteredRides, setFilteredRides] = useState(MOCK_RIDES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({
    totalRides: 0,
    totalSpent: 0,
    avgRating: 0,
    totalDistance: 0,
  });

  // Filters
  const filters = [
    { id: 'all', label: 'All Rides' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
  ];

  useEffect(() => {
    loadUserData();
    calculateStats();
  }, []);

  useEffect(() => {
    filterRides();
  }, [activeFilter, rides]);

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
    const ratings = completedRides.map(ride => ride.rating).filter(r => r !== null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    setStats({
      totalRides: rides.length,
      totalSpent,
      avgRating,
      totalDistance,
    });
  };

  const filterRides = () => {
    let filtered = [...rides];
    
    switch (activeFilter) {
      case 'completed':
        filtered = filtered.filter(ride => ride.status === 'completed');
        break;
      case 'cancelled':
        filtered = filtered.filter(ride => ride.status === 'cancelled');
        break;
      case 'last7days':
        // Filter for last 7 days (mock implementation)
        filtered = filtered.slice(0, 3);
        break;
      case 'last30days':
        // Filter for last 30 days (mock implementation)
        filtered = filtered.slice(0, 5);
        break;
      default:
        // 'all' - show all rides
        break;
    }
    
    setFilteredRides(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      calculateStats();
    }, 1500);
  };

  const handleRidePress = (ride) => {
    navigation.navigate('RideDetails', { rideId: ride.id, rideData: ride });
  };

  const handleReceiptPress = (ride) => {
    navigation.navigate('ReceiptScreen', { rideId: ride.id, rideData: ride });
  };

  const handleRepeatRide = (ride) => {
    navigation.navigate('RideSelection', {
      destination: ride.destination,
      pickupLocation: { name: ride.pickup },
      rideType: 'kabaza',
    });
  };

  const handleContactDriver = (ride) => {
    // Implement contact driver logic
    console.log('Contact driver:', ride.driver);
  };

  const handleHelp = (ride) => {
    navigation.navigate('HelpSupport', { rideId: ride.id });
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

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString('en-MW')}`;
  };

  const renderRideItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.rideCard}
      onPress={() => handleRidePress(item)}
    >
      <View style={styles.rideHeader}>
        <View style={styles.rideStatus}>
          <MaterialIcon 
            name={getStatusIcon(item.status)} 
            size={16} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.rideDate}>{item.date}</Text>
      </View>
      
      <View style={styles.rideLocations}>
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.locationText} numberOfLines={1}>{item.pickup}</Text>
        </View>
        
        <View style={styles.locationLine} />
        
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.locationText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>
      
      <View style={styles.rideDetails}>
        <View style={styles.detailRow}>
          <MaterialIcon name="person" size={14} color="#666" />
          <Text style={styles.detailText}>{item.driver}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcon name="directions-car" size={14} color="#666" />
          <Text style={styles.detailText}>{item.vehicle}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcon name="attach-money" size={14} color="#666" />
          <Text style={styles.detailText}>{formatCurrency(item.fare)}</Text>
        </View>
      </View>
      
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
          </View>
        </View>
      )}
      
      <View style={styles.rideActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleReceiptPress(item)}
        >
          <MaterialIcon name="receipt" size={16} color="#22C55E" />
          <Text style={styles.actionText}>Receipt</Text>
        </TouchableOpacity>
        
        {item.status === 'completed' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleRepeatRide(item)}
          >
            <MaterialIcon name="repeat" size={16} color="#3B82F6" />
            <Text style={styles.actionText}>Repeat</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleContactDriver(item)}
        >
          <MaterialIcon name="phone" size={16} color="#666" />
          <Text style={styles.actionText}>Contact</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleHelp(item)}
        >
          <MaterialIcon name="help" size={16} color="#666" />
          <Text style={styles.actionText}>Help</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalRides}</Text>
        <Text style={styles.statLabel}>Total Rides</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
        <Text style={styles.statLabel}>Total Spent</Text>
      </View>
      
      <View style={styles.statDivider} />
      
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
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Ride History</Text>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {/* Implement filter modal */}}
        >
          <MaterialIcon name="filter-list" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* STATS CARD */}
      {renderStatsCard()}

      {/* FILTERS */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              activeFilter === filter.id && styles.activeFilterButton
            ]}
            onPress={() => setActiveFilter(filter.id)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter.id && styles.activeFilterText
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* RIDES LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading your rides...</Text>
        </View>
      ) : filteredRides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcon name="history" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No rides found</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'all' 
              ? "You haven't taken any rides yet" 
              : `No ${activeFilter} rides found`}
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('RiderHome')}
          >
            <Text style={styles.emptyButtonText}>Book Your First Ride</Text>
          </TouchableOpacity>
        </View>
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
            />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {filteredRides.length} ride{filteredRides.length !== 1 ? 's' : ''} found
            </Text>
          }
          ListFooterComponent={<View style={{ height: 80 }} />}
        />
      )}
    </View>
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // STATS CARD
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  
  // FILTERS
  filtersContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterButton: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
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
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // LIST
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  
  // RIDE CARD
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  rideDate: {
    fontSize: 12,
    color: '#666',
  },
  
  // LOCATIONS
  rideLocations: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  locationLine: {
    width: 1,
    height: 12,
    backgroundColor: '#D1D5DB',
    marginLeft: 3,
    marginVertical: 2,
  },
  
  // DETAILS
  rideDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  
  // RATING
  ratingContainer: {
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  
  // ACTIONS
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
});