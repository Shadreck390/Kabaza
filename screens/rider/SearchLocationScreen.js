// screens/rider/SearchLocationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';

const { width, height } = Dimensions.get('window');


// Mock location data for Lilongwe
const LILONGWE_LOCATIONS = [
  {
    id: '1',
    name: 'Area 3 Shopping Complex',
    address: 'Area 3, Lilongwe, Malawi',
    type: 'shopping',
    coordinates: { latitude: -13.9583, longitude: 33.7689 },
  },
  {
    id: '2',
    name: 'Lilongwe City Mall',
    address: 'M1 Road, Lilongwe, Malawi',
    type: 'shopping',
    coordinates: { latitude: -13.9772, longitude: 33.7720 },
  },
  {
    id: '3',
    name: 'Kamuzu Central Hospital',
    address: 'Mzimba Street, Lilongwe, Malawi',
    type: 'hospital',
    coordinates: { latitude: -13.9711, longitude: 33.7836 },
  },
  {
    id: '4',
    name: 'Bingu International Conference Centre',
    address: 'Presidential Way, Lilongwe',
    type: 'landmark',
    coordinates: { latitude: -13.9897, longitude: 33.7886 },
  },
  {
    id: '5',
    name: 'Crossroads Hotel',
    address: 'Mchinji Road, Area 3',
    type: 'hotel',
    coordinates: { latitude: -13.9620, longitude: 33.7741 },
  },
  {
    id: '6',
    name: 'Game Stores Lilongwe',
    address: 'Shoprite Complex, Old Town',
    type: 'shopping',
    coordinates: { latitude: -13.9765, longitude: 33.7748 },
  },
  {
    id: '7',
    name: 'Lilongwe Wildlife Centre',
    address: 'Kenya Avenue, Lilongwe',
    type: 'attraction',
    coordinates: { latitude: -13.9650, longitude: 33.7812 },
  },
  {
    id: '8',
    name: 'University of Malawi',
    address: 'Chancellor College, Zomba Road',
    type: 'education',
    coordinates: { latitude: -13.9628, longitude: 33.7715 },
  },
];

// Recent searches mock
const RECENT_SEARCHES = [
  { id: 'r1', name: 'Home', address: '123 Mchinji Road, Area 3' },
  { id: 'r2', name: 'Work', address: 'Lilongwe City Mall' },
  { id: 'r3', name: 'Gym', address: 'Fitness World, Old Town' },
];

export default function SearchLocationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onLocationSelect, initialType = 'destination' } = route.params || {};
  
  const mapRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const getUserLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setMapRegion(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        
        // Add current location to results
        setSearchResults(prev => [
          {
            id: 'current',
            name: 'Current Location',
            address: 'Using your current location',
            type: 'current',
            coordinates: { latitude, longitude },
          },
          ...prev,
        ]);
      },
      (error) => {
        console.log('Error getting location:', error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const performSearch = (query) => {
    setIsSearching(true);
    
    // Simulate API delay
    setTimeout(() => {
      const filtered = LILONGWE_LOCATIONS.filter(
        location =>
          location.name.toLowerCase().includes(query.toLowerCase()) ||
          location.address.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    
    if (mapRef.current && location.coordinates) {
      mapRef.current.animateToRegion({
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    setShowMap(true);
    Keyboard.dismiss();
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) return;
    
    if (onLocationSelect) {
      onLocationSelect({
        name: selectedLocation.name,
        address: selectedLocation.address,
        coordinates: selectedLocation.coordinates,
      });
      navigation.goBack();
    } else {
      // Navigate to ride selection with this location
      if (initialType === 'destination') {
        navigation.navigate('RideSelection', {
          destination: selectedLocation.name,
          destinationAddress: selectedLocation.address,
          destinationCoordinates: selectedLocation.coordinates,
        });
      } else {
        navigation.navigate('RideSelection', {
          pickupLocation: {
            name: selectedLocation.name,
            address: selectedLocation.address,
            coordinates: selectedLocation.coordinates,
          },
        });
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      const currentLocation = {
        id: 'current',
        name: 'Current Location',
        address: 'Using your GPS location',
        type: 'current',
        coordinates: userLocation,
      };
      handleSelectLocation(currentLocation);
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'current':
        return { name: 'my-location', color: '#22C55E' };
      case 'shopping':
        return { name: 'shopping-cart', color: '#3B82F6' };
      case 'hospital':
        return { name: 'local-hospital', color: '#EF4444' };
      case 'hotel':
        return { name: 'hotel', color: '#F59E0B' };
      case 'landmark':
        return { name: 'landscape', color: '#8B5CF6' };
      case 'attraction':
        return { name: 'attractions', color: '#EC4899' };
      case 'education':
        return { name: 'school', color: '#10B981' };
      default:
        return { name: 'place', color: '#6B7280' };
    }
  };

  const renderLocationItem = ({ item }) => {
    const icon = getIconForType(item.type);
    
    return (
      <TouchableOpacity
        style={styles.locationItem}
        onPress={() => handleSelectLocation(item)}
      >
        <View style={[styles.locationIcon, { backgroundColor: `${icon.color}15` }]}>
          <MaterialIcon name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationAddress} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        <MaterialIcon name="chevron-right" size={20} color="#D1D5DB" />
      </TouchableOpacity>
    );
  };

  const renderRecentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => {
        // For recent items without coordinates, we'd need to geocode
        Alert.alert('Info', 'This would trigger a geocode search in production');
      }}
    >
      <MaterialIcon name="history" size={20} color="#6B7280" />
      <View style={styles.recentInfo}>
        <Text style={styles.recentName}>{item.name}</Text>
        <Text style={styles.recentAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {initialType === 'destination' ? 'Where to?' : 'Pickup Location'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={handleUseCurrentLocation}
        >
          <MaterialIcon name="my-location" size={20} color="#22C55E" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            initialType === 'destination' 
              ? "Search destination..." 
              : "Search pickup location..."
          }
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

      {/* Map View */}
      {showMap && selectedLocation && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {selectedLocation.coordinates && (
              <Marker
                coordinate={selectedLocation.coordinates}
                title={selectedLocation.name}
                description={selectedLocation.address}
              >
                <View style={styles.mapMarker}>
                  <MaterialIcon name="place" size={40} color="#EF4444" />
                </View>
              </Marker>
            )}
          </MapView>
          
          <View style={styles.mapOverlay}>
            <View style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationIcon}>
                <MaterialIcon name="place" size={24} color="#EF4444" />
              </View>
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.selectedLocationName} numberOfLines={1}>
                  {selectedLocation.name}
                </Text>
                <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                  {selectedLocation.address}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmLocation}
            >
              <Text style={styles.confirmButtonText}>
                {initialType === 'destination' ? 'Set Destination' : 'Set Pickup'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Results */}
      {!showMap && (
        <ScrollView style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.loadingText}>Searching locations...</Text>
            </View>
          ) : searchQuery.length >= 2 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                <Text style={styles.sectionCount}>({searchResults.length})</Text>
              </View>
              
              {searchResults.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcon name="location-off" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No locations found</Text>
                  <Text style={styles.emptyStateText}>
                    Try different keywords or check your spelling
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  renderItem={renderLocationItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}
            </>
          ) : (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={handleClearRecent}>
                      <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={recentSearches}
                    renderItem={renderRecentItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </View>
              )}

              {/* Popular Destinations */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular in Lilongwe</Text>
                {LILONGWE_LOCATIONS.slice(0, 4).map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.popularItem}
                    onPress={() => handleSelectLocation(location)}
                  >
                    <MaterialIcon name="location-on" size={20} color="#3B82F6" />
                    <View style={styles.popularInfo}>
                      <Text style={styles.popularName}>{location.name}</Text>
                      <Text style={styles.popularAddress}>{location.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  currentLocationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  selectedLocationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  selectedLocationAddress: {
    fontSize: 14,
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  clearText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  recentAddress: {
    fontSize: 14,
    color: '#666',
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  popularInfo: {
    flex: 1,
    marginLeft: 12,
  },
  popularName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  popularAddress: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});