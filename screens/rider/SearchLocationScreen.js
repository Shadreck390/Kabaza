// screens/rider/SearchLocationScreen.js - FIXED VERSION WITH PACKAGE DELIVERY SUPPORT
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
  ActivityIndicator,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import { useNavigation, useRoute } from '@react-navigation/native';
import placeSearchService from '@src/services/location/PlaceSearchService';
import { POPULAR_MALAWI_LOCATIONS } from '@src/services/location/constants';

export default function SearchLocationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { source, locationType } = route.params || {}; // Add locationType for package delivery
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Determine header title based on source and locationType
  const getHeaderTitle = () => {
    if (source === 'package_delivery') {
      return locationType === 'pickup' ? 'Select Pickup Location' : 'Select Delivery Location';
    }
    return 'Where to?';
  };

  // Determine placeholder text
  const getPlaceholderText = () => {
    if (source === 'package_delivery') {
      return locationType === 'pickup' ? 'Search pickup location' : 'Search delivery location';
    }
    return 'Search destination';
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load default places
    loadDefaultPlaces();
  }, []);

  const loadDefaultPlaces = () => {
    setResults(POPULAR_MALAWI_LOCATIONS);
  };

  // Search places when user types
  useEffect(() => {
    const searchPlaces = async () => {
      if (searchQuery.trim().length < 2) {
        loadDefaultPlaces();
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await placeSearchService.searchPlaces(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPlaces, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectLocation = async (location) => {
    try {
      let selectedLocation = location;

      if (location.source === 'google' && location.placeId) {
        selectedLocation = await placeSearchService.getPlaceDetails(
          location.placeId, 
          'google'
        );
      }

      placeSearchService.addToRecent(selectedLocation);

      // Handle different navigation sources
      if (source === 'package_delivery') {
        // For package delivery: navigate back to PackageDelivery with location and type
        navigation.navigate('PackageDelivery', { 
          selectedLocation,
          locationType: locationType // 'pickup' or 'delivery'
        });
      } else if (source === 'schedule') {
        // For schedule flow, navigate back with location WITHOUT any auto-navigation
        navigation.navigate('Schedule', { 
          selectedLocation,
          fromScheduleSelect: true  // Add flag to indicate this is from schedule selection
        });
      } else {
        // For home flow, navigate back to RiderHome
        navigation.navigate('RiderHome', { selectedLocation });
      }
    } catch (error) {
      console.error('Error selecting location:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectLocation(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: item.source === 'google' ? '#E3F2FD' : '#F5F5F5' }
      ]}>
        <MaterialIcon 
          name={item.source === 'google' ? 'map' : 'place'} 
          size={20} 
          color={item.source === 'google' ? '#2196F3' : '#666'} 
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name || item.address}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {item.address || item.fullAddress || ''}
        </Text>
        {item.source === 'google' && (
          <Text style={styles.sourceLabel}>Google Maps</Text>
        )}
      </View>
      <MaterialIcon name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <View style={{ width: 24 }} />
      </Animated.View>

      {/* Search Input */}
      <Animated.View style={[styles.searchContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchBox}>
          <MaterialIcon name="search" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder={getPlaceholderText()}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#0066CC" />
        </View>
      )}

      {/* Results */}
      {!isLoading && (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || item.placeId || index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searchQuery.length >= 2 && (
              <View style={styles.empty}>
                <MaterialIcon name="search-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No places found</Text>
              </View>
            )
          }
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    padding: 0,
  },
  loading: {
    padding: 20,
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sourceLabel: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});