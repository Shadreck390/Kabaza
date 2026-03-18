// Backup of original SearchLocationScreen
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import { useNavigation, useRoute } from '@react-navigation/native';
import { googlePlacesService, SAVED_PLACES, POPULAR_MALAWI_LOCATIONS } from '@src/services/googlePlacesService';

// Keep this as fallback - Malawi/Lilongwe locations from your original code
const ROUTE_DESTINATIONS = [
  {
    id: '1',
    address: 'Area 3 Shopping Complex',
    area: 'Area 3, Lilongwe, Malawi',
    distance: '0.8 km',
    icon: 'shopping-cart',
    color: '#3B82F6',
    isLocal: true
  },
  {
    id: '2',
    address: 'Lilongwe City Mall',
    area: 'M1 Road, Lilongwe, Malawi',
    distance: '1.5 km',
    icon: 'storefront',
    color: '#8B5CF6',
    isLocal: true
  },
  {
    id: '3',
    address: 'Kamuzu Central Hospital',
    area: 'Mzimba Street, Lilongwe, Malawi',
    distance: '2.1 km',
    icon: 'local-hospital',
    color: '#EF4444',
    isLocal: true
  },
  {
    id: '4',
    address: 'Bingu International Conference Centre',
    area: 'Presidential Way, Lilongwe',
    distance: '3.2 km',
    icon: 'apartment',
    color: '#F59E0B',
    isLocal: true
  },
  {
    id: '5',
    address: 'Crossroads Hotel',
    area: 'Mchinji Road, Area 3',
    distance: '0.5 km',
    icon: 'hotel',
    color: '#EC4899',
    isLocal: true
  },
  {
    id: '6',
    address: 'Game Stores Lilongwe',
    area: 'Shoprite Complex, Old Town',
    distance: '1.8 km',
    icon: 'shopping-bag',
    color: '#10B981',
    isLocal: true
  },
  {
    id: '7',
    address: 'Lilongwe Wildlife Centre',
    area: 'Kenya Avenue, Lilongwe',
    distance: '2.5 km',
    icon: 'nature-people',
    color: '#22C55E',
    isLocal: true
  },
  {
    id: '8',
    address: 'University of Malawi',
    area: 'Chancellor College, Zomba Road',
    distance: '0.7 km',
    icon: 'school',
    color: '#06B6D4',
    isLocal: true
  },
  {
    id: '9',
    address: 'Lilongwe Police Station',
    area: 'Area 3 police, Lilongwe',
    distance: '1.2 km',
    icon: 'local-police',
    color: '#6B7280',
    isLocal: true
  },
  {
    id: '10',
    address: 'Bingu National Stadium',
    area: 'Bingu National Stadium, Lilongwe',
    distance: '4.5 km',
    icon: 'stadium',
    color: '#DC2626',
    isLocal: true
  },
  {
    id: '11',
    address: 'Cross Roads Shopping Mall',
    area: 'Cross Roads, Lilongwe',
    distance: '2.3 km',
    icon: 'store',
    color: '#7C3AED',
    isLocal: true
  },
  {
    id: '12',
    address: 'Sunbird Capital Hotel',
    area: 'Mokera Rd, Lilongwe',
    distance: '1.8 km',
    icon: 'business',
    color: '#D97706',
    isLocal: true
  },
];

export default function SearchLocationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onLocationSelect, pickupLocation, pickupCoords, type = 'destination' } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showRoute, setShowRoute] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
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
    
    // Set initial results to combined saved + popular + route destinations
    loadInitialLocations();
  }, []);

  const loadInitialLocations = () => {
    // Combine saved places, popular Malawi locations, and route destinations
    const initialLocations = [
      ...SAVED_PLACES.map(place => ({
        ...place,
        icon: place.icon || 'star',
        color: '#3B82F6',
        isSaved: true
      })),
      ...POPULAR_MALAWI_LOCATIONS.map(place => ({
        ...place,
        icon: place.icon || 'city',
        color: '#8B5CF6',
        isPopular: true
      })),
      ...ROUTE_DESTINATIONS
    ];
    setSearchResults(initialLocations);
  };

  // Handle search with debounce
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.length < 2) {
      loadInitialLocations();
      setShowRoute(true);
      return;
    }

    setShowRoute(false);
    setLoading(true);

    // Set new timeout for search
    const timeout = setTimeout(async () => {
      try {
        // Try to get Google Places results
        const googleResults = await googlePlacesService.searchAllLocations(searchQuery);
        
        if (googleResults && googleResults.length > 0) {
          // Format Google results to match your UI
          const formattedGoogleResults = googleResults.map((place, index) => ({
            id: place.placeId || `google_${index}`,
            address: place.name || place.address,
            area: place.address || place.fullAddress || '',
            distance: place.distance || '-- km',
            icon: place.icon || 'map-pin',
            color: '#0066CC',
            placeId: place.placeId,
            latitude: place.latitude,
            longitude: place.longitude,
            isGoogle: true
          }));

          // Also include local matches
          const localMatches = ROUTE_DESTINATIONS.filter(
            item => 
              item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.area.toLowerCase().includes(searchQuery.toLowerCase())
          );

          setSearchResults([...formattedGoogleResults, ...localMatches]);
          setApiAvailable(true);
        } else {
          // Fallback to local filtering if Google returns nothing
          const filtered = ROUTE_DESTINATIONS.filter(
            item => 
              item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.area.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Search error:', error);
        setApiAvailable(false);
        
        // Fallback to local filtering
        const filtered = ROUTE_DESTINATIONS.filter(
          item => 
            item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.area.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      } finally {
        setLoading(false);
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const handleSelectLocation = async (location) => {
    setLoading(true);
    try {
      // If it's a Google Place without coordinates, get details
      if (location.placeId && !location.latitude) {
        const details = await googlePlacesService.getPlaceDetails(location.placeId);
        
        if (onLocationSelect) {
          onLocationSelect({
            name: details.name || details.address,
            address: details.address,
            area: details.address,
            coordinates: {
              latitude: details.latitude,
              longitude: details.longitude
            },
            placeId: details.placeId
          });
        } else if (pickupCoords) {
          // Navigate to ride selection
          navigation.navigate('RideSelection', {
            destination: details.name || details.address,
            destinationArea: details.address,
            destinationCoords: {
              latitude: details.latitude,
              longitude: details.longitude
            },
            pickup: pickupLocation,
            pickupCoords: pickupCoords,
          });
        }
      } else {
        // Local location with coordinates
        if (onLocationSelect) {
          onLocationSelect({
            name: location.address,
            area: location.area,
            coordinates: {
              latitude: location.latitude || -13.9626, // Fallback to Lilongwe center
              longitude: location.longitude || 33.7741
            },
          });
        } else if (pickupCoords) {
          navigation.navigate('RideSelection', {
            destination: location.address,
            destinationArea: location.area,
            destinationCoords: {
              latitude: location.latitude || -13.9626,
              longitude: location.longitude || 33.7741
            },
            pickup: pickupLocation,
            pickupCoords: pickupCoords,
          });
        }
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to select location. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Select location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconColor = (item) => {
    if (item.isGoogle) return '#0066CC';
    if (item.isSaved) return '#3B82F6';
    if (item.isPopular) return '#8B5CF6';
    return item.color || '#3B82F6';
  };

  const getIconName = (item) => {
    if (item.icon) return item.icon;
    if (item.isGoogle) return 'map-pin';
    if (item.isSaved) return 'star';
    if (item.isPopular) return 'city';
    return 'location-on';
  };

  const renderDestinationItem = ({ item, index }) => {
    const iconColor = getIconColor(item);
    const iconName = getIconName(item);
    
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
          disabled={loading}
        >
          <View style={[styles.destinationIcon, { backgroundColor: `${iconColor}15` }]}>
            <MaterialIcon name={iconName} size={22} color={iconColor} />
          </View>
          
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationAddress} numberOfLines={1}>
              {item.address || item.name}
            </Text>
            <Text style={styles.destinationArea} numberOfLines={1}>
              {item.area || item.address || ''}
            </Text>
            {item.isGoogle && (
              <Text style={styles.googleLabel}>Google Maps</Text>
            )}
          </View>
          
          <View style={styles.distanceContainer}>
            {item.distance && (
              <Text style={styles.distanceText}>{item.distance}</Text>
            )}
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
          <Text style={styles.headerTitle}>
            {type === 'pickup' ? 'Choose pickup' : 'Choose destination'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.mapButton}>
          <MaterialIcon name="map" size={24} color="#0066CC" />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Pickup location display */}
      {pickupLocation && (
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
            <Text style={styles.pickupLabel}>FROM</Text>
            <Text style={styles.pickupAddress}>{pickupLocation}</Text>
          </View>
        </Animated.View>
      )}

      {/* Search Bar */}
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
            placeholder={type === 'pickup' ? "Where to pick up?" : "Where to?"}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* API Warning */}
      {!apiAvailable && searchQuery.length > 1 && (
        <Animated.View style={[styles.warningContainer, { opacity: fadeAnim }]}>
          <MaterialIcon name="alert-circle" size={20} color="#FF6B6B" />
          <Text style={styles.warningText}>
            Online search unavailable. Showing local locations only.
          </Text>
        </Animated.View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Route Title - Only show when no search query and not loading */}
      {showRoute && !loading && (
        <Animated.View 
          style={[
            styles.routeTitleContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.routeTitle}>Popular destinations</Text>
        </Animated.View>
      )}

      {/* Destinations List */}
      {!loading && (
        <FlatList
          data={searchResults}
          renderItem={renderDestinationItem}
          keyExtractor={(item, index) => item.id || item.placeId || index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcon name="search-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery.length < 2 
                  ? 'Type at least 2 characters to search'
                  : 'No locations found'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// Add these new styles to your existing StyleSheet
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
  googleLabel: {
    fontSize: 11,
    color: '#0066CC',
    marginTop: 2,
    fontWeight: '500',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});