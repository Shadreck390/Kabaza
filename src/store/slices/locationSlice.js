// src/store/slices/locationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

// Service imports
import LocationService from '../../services/location/LocationService';
import GeocodingService from '../../services/geocoding/GeocodingService';

// ====================
// ASYNC THUNKS
// ====================

// Get current location with permission check
export const getCurrentLocation = createAsyncThunk(
  'location/getCurrentLocation',
  async (_, { rejectWithValue }) => {
    try {
      // Check/request permission
      const hasPermission = await LocationService.requestLocationPermission();
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }
      
      // Get current position
      const position = await LocationService.getCurrentPosition();
      
      // Reverse geocode to get address
      const address = await GeocodingService.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      
      return {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
        },
        address: address || null,
        timestamp: position.timestamp || Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get location');
    }
  }
);

// Start location tracking
export const startLocationTracking = createAsyncThunk(
  'location/startTracking',
  async (options, { rejectWithValue, dispatch }) => {
    try {
      // Check permission
      const hasPermission = await LocationService.requestLocationPermission();
      
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }
      
      // Start watching position
      const watchId = LocationService.watchPosition(
        (position) => {
          const location = {
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp || Date.now(),
          };
          
          // Dispatch location update
          dispatch(updateCurrentLocation(location));
          
          // Add to history
          dispatch(addToLocationHistory(location));
        },
        (error) => {
          console.error('Location tracking error:', error);
          dispatch(setError({ key: 'tracking', error: error.message }));
        },
        options || { enableHighAccuracy: true, distanceFilter: 10 }
      );
      
      return watchId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to start tracking');
    }
  }
);

// Geocode address to coordinates
export const geocodeAddress = createAsyncThunk(
  'location/geocodeAddress',
  async (address, { rejectWithValue }) => {
    try {
      const results = await GeocodingService.geocode(address);
      
      if (!results || results.length === 0) {
        throw new Error('Address not found');
      }
      
      return {
        address,
        coordinates: {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        },
        formattedAddress: results[0].formattedAddress,
        placeId: results[0].placeId,
        components: results[0].components,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to geocode address');
    }
  }
);

// Get route between two points
export const getRoute = createAsyncThunk(
  'location/getRoute',
  async ({ origin, destination, mode = 'driving' }, { rejectWithValue }) => {
    try {
      const route = await LocationService.getRoute(origin, destination, mode);
      
      return {
        origin,
        destination,
        mode,
        distance: route.distance,
        duration: route.duration,
        polyline: route.polyline,
        steps: route.steps,
        bounds: route.bounds,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get route');
    }
  }
);

// Search places
export const searchPlaces = createAsyncThunk(
  'location/searchPlaces',
  async ({ query, location, radius = 5000, type = null }, { rejectWithValue }) => {
    try {
      const places = await LocationService.searchPlaces(query, location, radius, type);
      
      return {
        query,
        results: places,
        timestamp: Date.now(),
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to search places');
    }
  }
);

// ====================
// INITIAL STATE
// ====================

const initialState = {
  // Current location
  currentLocation: null,
  currentAddress: null,
  lastLocationUpdate: null,
  
  // Location permission
  permission: {
    granted: false,
    status: 'undetermined', // 'undetermined', 'granted', 'denied', 'restricted'
    canAskAgain: true,
    rationale: null,
  },
  
  // Location tracking
  tracking: {
    isTracking: false,
    watchId: null,
    options: {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 5000,
    },
    backgroundMode: false,
  },
  
  // Location history
  history: [],
  historyLimit: 100,
  
  // Geocoding cache
  geocodingCache: {},
  reverseGeocodingCache: {},
  
  // Search and places
  searchResults: [],
  recentSearches: [],
  favoritePlaces: [],
  
  // Route calculation
  currentRoute: null,
  routeHistory: [],
  alternativeRoutes: [],
  
  // Location services status
  services: {
    gpsEnabled: true,
    networkEnabled: true,
    locationServicesEnabled: true,
    lastCheck: null,
  },
  
  // Accuracy and quality
  accuracy: {
    horizontal: 0,
    vertical: 0,
    level: 'low', // 'low', 'medium', 'high'
    providers: ['gps'],
  },
  
  // Battery and performance
  batteryImpact: {
    isOptimized: true,
    estimatedUsage: 'low', // 'low', 'medium', 'high'
    suggestions: [],
  },
  
  // Settings and preferences
  settings: {
    autoStartTracking: false,
    saveHistory: true,
    cacheGeocoding: true,
    useBackgroundLocation: false,
    optimizeBattery: true,
    defaultTransportMode: 'driving',
    units: 'metric', // 'metric' or 'imperial'
    language: 'en',
  },
  
  // Loading states
  loading: {
    currentLocation: false,
    tracking: false,
    geocoding: false,
    routing: false,
    searching: false,
  },
  
  // Error states
  errors: {
    currentLocation: null,
    tracking: null,
    geocoding: null,
    routing: null,
    searching: null,
    permission: null,
  },
  
  // Statistics
  stats: {
    totalLocationsTracked: 0,
    totalDistanceTracked: 0,
    totalTimeTracked: 0,
    averageAccuracy: 0,
    geocodingRequests: 0,
    routingRequests: 0,
  },
  
  // Timestamps
  timestamps: {
    permissionChecked: null,
    locationUpdated: null,
    serviceChecked: null,
  },
};

// ====================
// SLICE DEFINITION
// ====================

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    // ====================
    // LOCATION UPDATES
    // ====================
    
    updateCurrentLocation: (state, action) => {
      state.currentLocation = action.payload.coordinates;
      state.currentAddress = action.payload.address || state.currentAddress;
      state.lastLocationUpdate = action.payload.timestamp || Date.now();
      state.timestamps.locationUpdated = Date.now();
      
      // Update accuracy level
      if (action.payload.coordinates?.accuracy) {
        const acc = action.payload.coordinates.accuracy;
        if (acc < 10) state.accuracy.level = 'high';
        else if (acc < 50) state.accuracy.level = 'medium';
        else state.accuracy.level = 'low';
        state.accuracy.horizontal = acc;
      }
    },
    
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload;
    },
    
    clearCurrentLocation: (state) => {
      state.currentLocation = null;
      state.currentAddress = null;
      state.lastLocationUpdate = null;
    },
    
    // ====================
    // PERMISSION MANAGEMENT
    // ====================
    
    setLocationPermission: (state, action) => {
      state.permission = {
        ...state.permission,
        ...action.payload,
      };
      state.timestamps.permissionChecked = Date.now();
    },
    
    // ====================
    // TRACKING MANAGEMENT
    // ====================
    
    startTracking: (state) => {
      state.tracking.isTracking = true;
    },
    
    stopTracking: (state) => {
      state.tracking.isTracking = false;
      if (state.tracking.watchId) {
        Geolocation.clearWatch(state.tracking.watchId);
        state.tracking.watchId = null;
      }
    },
    
    setWatchId: (state, action) => {
      state.tracking.watchId = action.payload;
    },
    
    updateTrackingOptions: (state, action) => {
      state.tracking.options = {
        ...state.tracking.options,
        ...action.payload,
      };
    },
    
    // ====================
    // HISTORY MANAGEMENT
    // ====================
    
    addToLocationHistory: (state, action) => {
      const location = {
        ...action.payload,
        id: Date.now().toString(),
        savedAt: Date.now(),
      };
      
      state.history.unshift(location);
      state.stats.totalLocationsTracked += 1;
      
      // Keep only limited history
      if (state.history.length > state.historyLimit) {
        state.history.pop();
      }
    },
    
    clearLocationHistory: (state) => {
      state.history = [];
    },
    
    // ====================
    // SEARCH MANAGEMENT
    // ====================
    
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    
    addToRecentSearches: (state, action) => {
      const search = {
        ...action.payload,
        searchedAt: Date.now(),
      };
      
      // Remove if already exists
      state.recentSearches = state.recentSearches.filter(
        s => s.query !== action.payload.query
      );
      
      state.recentSearches.unshift(search);
      
      // Keep only last 20 searches
      if (state.recentSearches.length > 20) {
        state.recentSearches.pop();
      }
    },
    
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },
    
    addFavoritePlace: (state, action) => {
      const place = {
        ...action.payload,
        favoritedAt: Date.now(),
      };
      
      // Check if already exists
      const exists = state.favoritePlaces.find(
        p => p.placeId === action.payload.placeId
      );
      
      if (!exists) {
        state.favoritePlaces.unshift(place);
        
        // Keep only last 50 favorites
        if (state.favoritePlaces.length > 50) {
          state.favoritePlaces.pop();
        }
      }
    },
    
    removeFavoritePlace: (state, action) => {
      state.favoritePlaces = state.favoritePlaces.filter(
        p => p.placeId !== action.payload
      );
    },
    
    // ====================
    // ROUTE MANAGEMENT
    // ====================
    
    setCurrentRoute: (state, action) => {
      state.currentRoute = action.payload;
      
      // Add to route history
      if (action.payload) {
        state.routeHistory.unshift({
          ...action.payload,
          calculatedAt: Date.now(),
        });
        
        // Keep only last 20 routes
        if (state.routeHistory.length > 20) {
          state.routeHistory.pop();
        }
      }
    },
    
    clearCurrentRoute: (state) => {
      state.currentRoute = null;
    },
    
    setAlternativeRoutes: (state, action) => {
      state.alternativeRoutes = action.payload;
    },
    
    // ====================
    // CACHE MANAGEMENT
    // ====================
    
    cacheGeocodeResult: (state, action) => {
      const { address, result } = action.payload;
      state.geocodingCache[address] = {
        result,
        cachedAt: Date.now(),
      };
    },
    
    cacheReverseGeocodeResult: (state, action) => {
      const { lat, lng, result } = action.payload;
      const key = `${lat},${lng}`;
      state.reverseGeocodingCache[key] = {
        result,
        cachedAt: Date.now(),
      };
    },
    
    clearCache: (state) => {
      state.geocodingCache = {};
      state.reverseGeocodingCache = {};
    },
    
    // ====================
    // SERVICES STATUS
    // ====================
    
    updateServicesStatus: (state, action) => {
      state.services = {
        ...state.services,
        ...action.payload,
        lastCheck: Date.now(),
      };
      state.timestamps.serviceChecked = Date.now();
    },
    
    // ====================
    // SETTINGS MANAGEMENT
    // ====================
    
    updateSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    
    // ====================
    // ERROR HANDLING
    // ====================
    
    setError: (state, action) => {
      const { key, error } = action.payload;
      if (state.errors[key] !== undefined) {
        state.errors[key] = error;
      }
    },
    
    clearError: (state, action) => {
      const key = action.payload;
      if (state.errors[key]) {
        state.errors[key] = null;
      }
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key] = null;
      });
    },
    
    // ====================
    // STATISTICS
    // ====================
    
    updateStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
    },
    
    // ====================
    // RESET & CLEANUP
    // ====================
    
    resetLocationState: (state) => {
      return {
        ...initialState,
        permission: state.permission,
        settings: state.settings,
        favoritePlaces: state.favoritePlaces,
        stats: state.stats,
      };
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Get current location
      .addCase(getCurrentLocation.pending, (state) => {
        state.loading.currentLocation = true;
        state.errors.currentLocation = null;
      })
      .addCase(getCurrentLocation.fulfilled, (state, action) => {
        state.loading.currentLocation = false;
        state.currentLocation = action.payload.coordinates;
        state.currentAddress = action.payload.address;
        state.lastLocationUpdate = action.payload.timestamp;
        state.permission.granted = true;
        state.permission.status = 'granted';
        state.timestamps.locationUpdated = Date.now();
      })
      .addCase(getCurrentLocation.rejected, (state, action) => {
        state.loading.currentLocation = false;
        state.errors.currentLocation = action.payload;
        if (action.payload?.includes('permission')) {
          state.permission.granted = false;
          state.permission.status = 'denied';
        }
      })
      
      // Start location tracking
      .addCase(startLocationTracking.pending, (state) => {
        state.loading.tracking = true;
        state.errors.tracking = null;
      })
      .addCase(startLocationTracking.fulfilled, (state, action) => {
        state.loading.tracking = false;
        state.tracking.watchId = action.payload;
        state.tracking.isTracking = true;
      })
      .addCase(startLocationTracking.rejected, (state, action) => {
        state.loading.tracking = false;
        state.errors.tracking = action.payload;
        state.tracking.isTracking = false;
      })
      
      // Geocode address
      .addCase(geocodeAddress.pending, (state) => {
        state.loading.geocoding = true;
        state.errors.geocoding = null;
      })
      .addCase(geocodeAddress.fulfilled, (state, action) => {
        state.loading.geocoding = false;
        state.stats.geocodingRequests += 1;
        
        // Cache the result
        state.geocodingCache[action.payload.address] = {
          result: action.payload,
          cachedAt: Date.now(),
        };
      })
      .addCase(geocodeAddress.rejected, (state, action) => {
        state.loading.geocoding = false;
        state.errors.geocoding = action.payload;
      })
      
      // Get route
      .addCase(getRoute.pending, (state) => {
        state.loading.routing = true;
        state.errors.routing = null;
      })
      .addCase(getRoute.fulfilled, (state, action) => {
        state.loading.routing = false;
        state.currentRoute = action.payload;
        state.stats.routingRequests += 1;
      })
      .addCase(getRoute.rejected, (state, action) => {
        state.loading.routing = false;
        state.errors.routing = action.payload;
      })
      
      // Search places
      .addCase(searchPlaces.pending, (state) => {
        state.loading.searching = true;
        state.errors.searching = null;
      })
      .addCase(searchPlaces.fulfilled, (state, action) => {
        state.loading.searching = false;
        state.searchResults = action.payload.results;
        
        // Add to recent searches
        state.recentSearches.unshift({
          query: action.payload.query,
          results: action.payload.results.length,
          searchedAt: action.payload.timestamp,
        });
        
        // Keep only last 20 searches
        if (state.recentSearches.length > 20) {
          state.recentSearches.pop();
        }
      })
      .addCase(searchPlaces.rejected, (state, action) => {
        state.loading.searching = false;
        state.errors.searching = action.payload;
      });
  },
});

// ====================
// ACTION CREATORS
// ====================

export const {
  updateCurrentLocation,
  setCurrentAddress,
  clearCurrentLocation,
  setLocationPermission,
  startTracking,
  stopTracking,
  setWatchId,
  updateTrackingOptions,
  addToLocationHistory,
  clearLocationHistory,
  setSearchResults,
  addToRecentSearches,
  clearSearchResults,
  clearRecentSearches,
  addFavoritePlace,
  removeFavoritePlace,
  setCurrentRoute,
  clearCurrentRoute,
  setAlternativeRoutes,
  cacheGeocodeResult,
  cacheReverseGeocodeResult,
  clearCache,
  updateServicesStatus,
  updateSettings,
  setError,
  clearError,
  clearAllErrors,
  updateStats,
  resetLocationState,
} = locationSlice.actions;

// ====================
// SELECTORS
// ====================

export const selectLocation = (state) => state.location;
export const selectCurrentLocation = (state) => state.location.currentLocation;
export const selectCurrentAddress = (state) => state.location.currentAddress;
export const selectLocationPermission = (state) => state.location.permission;
export const selectIsTracking = (state) => state.location.tracking.isTracking;
export const selectLocationHistory = (state) => state.location.history;
export const selectSearchResults = (state) => state.location.searchResults;
export const selectRecentSearches = (state) => state.location.recentSearches;
export const selectFavoritePlaces = (state) => state.location.favoritePlaces;
export const selectCurrentRoute = (state) => state.location.currentRoute;
export const selectAlternativeRoutes = (state) => state.location.alternativeRoutes;
export const selectLoading = (state) => state.location.loading;
export const selectErrors = (state) => state.location.errors;
export const selectSettings = (state) => state.location.settings;
export const selectStats = (state) => state.location.stats;

// Derived Selectors
export const selectHasLocationPermission = (state) => 
  state.location.permission.granted;

export const selectCanGetLocation = (state) =>
  state.location.permission.granted &&
  state.location.services.locationServicesEnabled;

export const selectLocationAccuracy = (state) => 
  state.location.accuracy.level;

export const selectFormattedAddress = (state) => {
  const address = state.location.currentAddress;
  if (!address) return null;
  
  return address.formattedAddress || 
         `${address.street || ''} ${address.city || ''} ${address.country || ''}`.trim();
};

export const selectLastKnownLocation = (state) => {
  if (state.location.currentLocation) {
    return state.location.currentLocation;
  }
  
  if (state.location.history.length > 0) {
    return state.location.history[0].coordinates;
  }
  
  return null;
};

export const selectRouteDistance = (state) => 
  state.location.currentRoute?.distance || 0;

export const selectRouteDuration = (state) => 
  state.location.currentRoute?.duration || 0;

export const selectRoutePolyline = (state) => 
  state.location.currentRoute?.polyline || null;

export default locationSlice.reducer;