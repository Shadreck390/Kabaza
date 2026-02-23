// screens/rider/SearchLocationScreen.js - FIXED to match bt.jpg style with Malawi locations
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import { useNavigation, useRoute } from '@react-navigation/native';

// ROUTE DESTINATIONS - Malawi/Lilongwe locations from your original code
const ROUTE_DESTINATIONS = [
  {
    id: '1',
    address: 'Area 3 Shopping Complex',
    area: 'Area 3, Lilongwe, Malawi',
    distance: '0.8 km',
    icon: 'shopping-cart',
    color: '#3B82F6',
  },
  {
    id: '2',
    address: 'Lilongwe City Mall',
    area: 'M1 Road, Lilongwe, Malawi',
    distance: '1.5 km',
    icon: 'storefront',
    color: '#8B5CF6',
  },
  {
    id: '3',
    address: 'Kamuzu Central Hospital',
    area: 'Mzimba Street, Lilongwe, Malawi',
    distance: '2.1 km',
    icon: 'local-hospital',
    color: '#EF4444',
  },
  {
    id: '4',
    address: 'Bingu International Conference Centre',
    area: 'Presidential Way, Lilongwe',
    distance: '3.2 km',
    icon: 'apartment',
    color: '#F59E0B',
  },
  {
    id: '5',
    address: 'Crossroads Hotel',
    area: 'Mchinji Road, Area 3',
    distance: '0.5 km',
    icon: 'hotel',
    color: '#EC4899',
  },
  {
    id: '6',
    address: 'Game Stores Lilongwe',
    area: 'Shoprite Complex, Old Town',
    distance: '1.8 km',
    icon: 'shopping-bag',
    color: '#10B981',
  },
  {
    id: '7',
    address: 'Lilongwe Wildlife Centre',
    area: 'Kenya Avenue, Lilongwe',
    distance: '2.5 km',
    icon: 'nature-people',
    color: '#22C55E',
  },
  {
    id: '8',
    address: 'University of Malawi',
    area: 'Chancellor College, Zomba Road',
    distance: '0.7 km',
    icon: 'school',
    color: '#06B6D4',
  },
  {
    id: '9',
    address: 'Lilongwe Police Station',
    area: 'Area 3 police, Lilongwe',
    distance: '1.2 km',
    icon: 'local-police',
    color: '#6B7280',
  },
  {
    id: '10',
    address: 'Bingu National Stadium',
    area: 'Bingu National Stadium, Lilongwe',
    distance: '4.5 km',
    icon: 'stadium',
    color: '#DC2626',
  },
  {
    id: '11',
    address: 'Cross Roads Shopping Mall',
    area: 'Cross Roads, Lilongwe',
    distance: '2.3 km',
    icon: 'store',
    color: '#7C3AED',
  },
  {
    id: '12',
    address: 'Sunbird Capital Hotel',
    area: 'Mokera Rd, Lilongwe',
    distance: '1.8 km',
    icon: 'business',
    color: '#D97706',
  },
];

export default function SearchLocationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onLocationSelect, initialType = 'destination' } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showRoute, setShowRoute] = useState(true);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
    
    // Set initial results to route destinations
    setSearchResults(ROUTE_DESTINATIONS);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      // Filter destinations based on search
      const filtered = ROUTE_DESTINATIONS.filter(
        item => 
          item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.area.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      setShowRoute(false);
    } else {
      // Show all route destinations when search is empty
      setSearchResults(ROUTE_DESTINATIONS);
      setShowRoute(true);
    }
  }, [searchQuery]);

  const handleSelectLocation = (location) => {
    // Navigate to ride confirmation with selected destination
    navigation.navigate('RideSelection', {
      destination: location.address,
      destinationAddress: location.area,
      destinationCoords: { latitude: -13.9626, longitude: 33.7741 }, // Lilongwe coordinates
      pickupLocation: 'Bwaila Hospital', // This should be changed to a Malawi location too
      pickupCoords: { latitude: -13.9626, longitude: 33.7741 },
      
    });
  };

  const renderDestinationItem = ({ item, index }) => {
    return (
      <Animated.View
        style={[
          styles.destinationCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.destinationTouchable}
          onPress={() => handleSelectLocation(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.destinationIcon, { backgroundColor: `${item.color}15` }]}>
            <MaterialIcon name={item.icon} size={22} color={item.color} />
          </View>
          
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationAddress} numberOfLines={1}>
              {item.address}
            </Text>
            <Text style={styles.destinationArea} numberOfLines={1}>
              {item.area}
            </Text>
          </View>
          
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceText}>{item.distance}</Text>
            <MaterialIcon name="chevron-right" size={20} color="#CCC" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with back button and title */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Your route</Text>
        </View>
        
        <TouchableOpacity style={styles.mapButton}>
          <MaterialIcon name="map" size={24} color="#0066CC" />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Pickup location - Updated to Malawi location */}
      <Animated.View 
        style={[
          styles.pickupContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.pickupDot} />
        <View style={styles.pickupInfo}>
          <Text style={styles.pickupLabel}>DROPOFF LOCATION</Text>
          <Text style={styles.pickupAddress}>Area 3, Lilongwe</Text>
        </View>
      </Animated.View>

      {/* Search Bar - "Where to?" */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Route Title - Only show when no search query */}
      {showRoute && (
        <Animated.View 
          style={[
            styles.routeTitleContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.routeTitle}>Your route</Text>
        </Animated.View>
      )}

      {/* Destinations List */}
      <FlatList
        data={searchResults}
        renderItem={renderDestinationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 4,
    fontWeight: '600',
  },
  pickupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066CC',
    marginRight: 12,
  },
  pickupInfo: {
    flex: 1,
  },
  pickupLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pickupAddress: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  routeTitleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  destinationCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  destinationTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  destinationArea: {
    fontSize: 14,
    color: '#666',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginRight: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
});