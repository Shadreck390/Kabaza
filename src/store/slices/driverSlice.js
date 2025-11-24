// src/store/slices/driverSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// TODO: Replace with actual service imports when ready
const fetchNearbyRides = async (region) => {
  console.log('Mock: fetchNearbyRides', region);
  return [];
};

const acceptRide = async (rideId, driverId) => {
  console.log('Mock: acceptRide', rideId, driverId);
  return { ride: { id: rideId, status: 'accepted' } };
};

const startRide = async (rideId) => {
  console.log('Mock: startRide', rideId);
  return { status: 'in_progress' };
};

const completeRide = async (rideId, rating, review) => {
  console.log('Mock: completeRide', rideId);
  return { amount: 100 };
};

const cancelRide = async (rideId, reason) => {
  console.log('Mock: cancelRide', rideId, reason);
  return { reason };
};

const updateDriverAvailability = async (driverId, isOnline, location) => {
  console.log('Mock: updateDriverAvailability', driverId, isOnline);
  return { success: true };
};

const realTimeService = {
  disconnectSocket: () => console.log('Mock: disconnectSocket'),
  initializeSocket: (profile) => console.log('Mock: initializeSocket', profile),
  addConnectionListener: (callback) => console.log('Mock: addConnectionListener'),
  registerCallback: (event, callback) => console.log('Mock: registerCallback', event),
  socket: null
};

const LocationService = {
  requestLocationPermission: async () => {
    console.log('Mock: requestLocationPermission');
    return true;
  },
  getCurrentPosition: async () => {
    console.log('Mock: getCurrentPosition');
    return { coords: { latitude: -15.4167, longitude: 28.2833 } }; // Lusaka coordinates
  },
  watchPosition: (onSuccess, onError) => {
    console.log('Mock: watchPosition');
    return 1;
  }
};

// Continue with the rest of your driverSlice code...
// ✅ Async thunks for driver operations
export const loadNearbyRides = createAsyncThunk(
  'driver/loadNearbyRides',
  async (region, { rejectWithValue }) => {
    try {
      const rides = await fetchNearbyRides(region);
      return rides;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load nearby rides');
    }
  }
);

// ... rest of the file stays the same

export const acceptRideRequest = createAsyncThunk(
  'driver/acceptRide',
  async ({ rideId, driverId }, { rejectWithValue }) => {
    try {
      const result = await acceptRide(rideId, driverId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to accept ride');
    }
  }
);

export const startRideTrip = createAsyncThunk(
  'driver/startRide',
  async (rideId, { rejectWithValue }) => {
    try {
      const result = await startRide(rideId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to start ride');
    }
  }
);

export const completeRideTrip = createAsyncThunk(
  'driver/completeRide',
  async ({ rideId, rating, review }, { rejectWithValue }) => {
    try {
      const result = await completeRide(rideId, rating, review);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to complete ride');
    }
  }
);

export const cancelRideRequest = createAsyncThunk(
  'driver/cancelRide',
  async ({ rideId, reason }, { rejectWithValue }) => {
    try {
      const result = await cancelRide(rideId, reason);
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to cancel ride');
    }
  }
);

export const updateDriverStatus = createAsyncThunk(
  'driver/updateStatus',
  async ({ driverId, isOnline, location }, { rejectWithValue }) => {
    try {
      const result = await updateDriverAvailability(driverId, isOnline, location);
      return { isOnline, location };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update driver status');
    }
  }
);

const driverSlice = createSlice({
  name: 'driver',
  initialState: {
    // Driver profile and status
    driverProfile: null,
    isOnline: false,
    isActive: false, // Currently on a trip
    
    // Location tracking
    currentLocation: null,
    locationPermission: false,
    
    // Ride management
    nearbyRides: [],
    rideRequests: [],
    currentRide: null,
    rideHistory: [],
    
    // Loading states
    loading: {
      rides: false,
      acceptance: false,
      starting: false,
      completion: false,
      cancellation: false,
      statusUpdate: false
    },
    
    // Error states
    errors: {
      rides: null,
      acceptance: null,
      starting: null,
      completion: null,
      cancellation: null,
      statusUpdate: null
    },
    
    // Statistics
    stats: {
      totalEarnings: 0,
      completedRides: 0,
      todayEarnings: 0,
      todayRides: 0,
      rating: 0,
      onlineTime: 0
    },
    
    // Real-time tracking
    socketConnected: false,
    locationWatcher: null,
    
    // Filters and preferences
    filters: {
      minFare: 0,
      maxDistance: 10, // km
      rideTypes: ['motorcycle']
    }
  },
  reducers: {
    // Driver status management
    setDriverProfile: (state, action) => {
      state.driverProfile = action.payload;
    },
    
    goOnline: (state) => { 
      state.isOnline = true;
      state.errors.statusUpdate = null;
    },
    
    goOffline: (state) => { 
      state.isOnline = false;
      state.isActive = false;
      state.nearbyRides = [];
      state.rideRequests = [];
      state.currentRide = null;
      state.errors.statusUpdate = null;
    },
    
    setActive: (state, action) => {
      state.isActive = action.payload;
    },
    
    // Location management
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
    
    setLocationPermission: (state, action) => {
      state.locationPermission = action.payload;
    },
    
    // Ride selection and management
    selectRide: (state, action) => {
      state.selectedRide = action.payload;
    },
    
    clearSelectedRide: (state) => {
      state.selectedRide = null;
    },
    
    addOrUpdateRide: (state, action) => {
      const ride = action.payload;
      const index = state.nearbyRides.findIndex(r => r.id === ride.id);
      if (index !== -1) {
        state.nearbyRides[index] = { ...state.nearbyRides[index], ...ride };
      } else {
        state.nearbyRides.unshift(ride);
      }
    },
    
    removeRide: (state, action) => {
      const rideId = action.payload;
      state.nearbyRides = state.nearbyRides.filter(ride => ride.id !== rideId);
      state.rideRequests = state.rideRequests.filter(ride => ride.id !== rideId);
    },
    
    addRideRequest: (state, action) => {
      const ride = action.payload;
      const exists = state.rideRequests.find(r => r.id === ride.id);
      if (!exists) {
        state.rideRequests.unshift(ride);
      }
    },
    
    clearRideRequests: (state) => {
      state.rideRequests = [];
    },
    
    // Real-time connection
    setSocketConnected: (state, action) => {
      state.socketConnected = action.payload;
    },
    
    // Statistics
    updateStats: (state, action) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    
    // Filters
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Error handling
    clearError: (state, action) => {
      const errorType = action.payload;
      if (state.errors[errorType]) {
        state.errors[errorType] = null;
      }
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key] = null;
      });
    },
    
    // Reset state
    resetDriverState: (state) => {
      return {
        ...state,
        isOnline: false,
        isActive: false,
        nearbyRides: [],
        rideRequests: [],
        currentRide: null,
        selectedRide: null,
        loading: {
          rides: false,
          acceptance: false,
          starting: false,
          completion: false,
          cancellation: false,
          statusUpdate: false
        },
        errors: {
          rides: null,
          acceptance: null,
          starting: null,
          completion: null,
          cancellation: null,
          statusUpdate: null
        }
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Load nearby rides
      .addCase(loadNearbyRides.pending, (state) => { 
        state.loading.rides = true; 
        state.errors.rides = null; 
      })
      .addCase(loadNearbyRides.fulfilled, (state, action) => {
        state.loading.rides = false;
        state.nearbyRides = action.payload;
      })
      .addCase(loadNearbyRides.rejected, (state, action) => {
        state.loading.rides = false;
        state.errors.rides = action.payload;
      })
      
      // Accept ride
      .addCase(acceptRideRequest.pending, (state) => { 
        state.loading.acceptance = true; 
        state.errors.acceptance = null; 
      })
      .addCase(acceptRideRequest.fulfilled, (state, action) => {
        state.loading.acceptance = false;
        state.currentRide = action.payload.ride;
        state.isActive = true;
        // Remove from nearby rides and requests
        state.nearbyRides = state.nearbyRides.filter(ride => ride.id !== action.payload.ride.id);
        state.rideRequests = state.rideRequests.filter(ride => ride.id !== action.payload.ride.id);
        state.selectedRide = null;
      })
      .addCase(acceptRideRequest.rejected, (state, action) => {
        state.loading.acceptance = false;
        state.errors.acceptance = action.payload;
      })
      
      // Start ride
      .addCase(startRideTrip.pending, (state) => { 
        state.loading.starting = true; 
        state.errors.starting = null; 
      })
      .addCase(startRideTrip.fulfilled, (state, action) => {
        state.loading.starting = false;
        if (state.currentRide) {
          state.currentRide.status = 'in_progress';
        }
      })
      .addCase(startRideTrip.rejected, (state, action) => {
        state.loading.starting = false;
        state.errors.starting = action.payload;
      })
      
      // Complete ride
      .addCase(completeRideTrip.pending, (state) => { 
        state.loading.completion = true; 
        state.errors.completion = null; 
      })
      .addCase(completeRideTrip.fulfilled, (state, action) => {
        state.loading.completion = false;
        // Add to history
        state.rideHistory.unshift({ ...state.currentRide, ...action.payload });
        // Update stats
        state.stats.completedRides += 1;
        state.stats.totalEarnings += action.payload.amount;
        // Clear current ride
        state.currentRide = null;
        state.isActive = false;
      })
      .addCase(completeRideTrip.rejected, (state, action) => {
        state.loading.completion = false;
        state.errors.completion = action.payload;
      })
      
      // Cancel ride
      .addCase(cancelRideRequest.pending, (state) => { 
        state.loading.cancellation = true; 
        state.errors.cancellation = null; 
      })
      .addCase(cancelRideRequest.fulfilled, (state, action) => {
        state.loading.cancellation = false;
        // Add to history as cancelled
        state.rideHistory.unshift({ 
          ...state.currentRide, 
          status: 'cancelled',
          cancellationReason: action.payload.reason 
        });
        // Clear current ride
        state.currentRide = null;
        state.isActive = false;
      })
      .addCase(cancelRideRequest.rejected, (state, action) => {
        state.loading.cancellation = false;
        state.errors.cancellation = action.payload;
      })
      
      // Update driver status
      .addCase(updateDriverStatus.pending, (state) => { 
        state.loading.statusUpdate = true; 
        state.errors.statusUpdate = null; 
      })
      .addCase(updateDriverStatus.fulfilled, (state, action) => {
        state.loading.statusUpdate = false;
        state.isOnline = action.payload.isOnline;
        if (action.payload.location) {
          state.currentLocation = action.payload.location;
        }
      })
      .addCase(updateDriverStatus.rejected, (state, action) => {
        state.loading.statusUpdate = false;
        state.errors.statusUpdate = action.payload;
      });
  }
});

export const {
  setDriverProfile,
  goOnline,
  goOffline,
  setActive,
  setCurrentLocation,
  setLocationPermission,
  selectRide,
  clearSelectedRide,
  addOrUpdateRide,
  removeRide,
  addRideRequest,
  clearRideRequests,
  setSocketConnected,
  updateStats,
  updateFilters,
  clearError,
  clearAllErrors,
  resetDriverState
} = driverSlice.actions;

// ✅ Selectors
export const selectDriverProfile = (state) => state.driver.driverProfile;
export const selectIsOnline = (state) => state.driver.isOnline;
export const selectIsActive = (state) => state.driver.isActive;
export const selectCurrentLocation = (state) => state.driver.currentLocation;
export const selectNearbyRides = (state) => state.driver.nearbyRides;
export const selectRideRequests = (state) => state.driver.rideRequests;
export const selectCurrentRide = (state) => state.driver.currentRide;
export const selectSelectedRide = (state) => state.driver.selectedRide;
export const selectRideHistory = (state) => state.driver.rideHistory;
export const selectLoading = (state) => state.driver.loading;
export const selectErrors = (state) => state.driver.errors;
export const selectStats = (state) => state.driver.stats;
export const selectSocketConnected = (state) => state.driver.socketConnected;
export const selectFilters = (state) => state.driver.filters;

// ✅ Thunk for initializing driver session
export const initializeDriverSession = (driverProfile) => async (dispatch) => {
  try {
    dispatch(setDriverProfile(driverProfile));
    
    // Request location permission
    const hasPermission = await LocationService.requestLocationPermission();
    dispatch(setLocationPermission(hasPermission));
    
    if (hasPermission) {
      // Get current location
      const location = await LocationService.getCurrentPosition();
      dispatch(setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
      
      // Start location tracking
      const watchId = LocationService.watchPosition(
        (position) => {
          dispatch(setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Location tracking error:', error);
        }
      );
      
      return watchId;
    }
  } catch (error) {
    console.error('Failed to initialize driver session:', error);
  }
};

// ✅ Thunk for toggling online status
export const toggleOnlineStatus = () => async (dispatch, getState) => {
  const state = getState();
  const { isOnline, driverProfile, currentLocation } = state.driver;
  
  try {
    if (isOnline) {
      // Going offline
      dispatch(goOffline());
      await updateDriverAvailability(driverProfile.id, false);
      
      // Stop real-time updates
      realTimeService.disconnectSocket();
    } else {
      // Going online
      dispatch(goOnline());
      await updateDriverAvailability(driverProfile.id, true, currentLocation);
      
      // Start real-time updates
      realTimeService.initializeSocket(driverProfile);
      realTimeService.addConnectionListener((connected) => {
        dispatch(setSocketConnected(connected));
      });
    }
  } catch (error) {
    dispatch(clearError('statusUpdate'));
    console.error('Failed to toggle online status:', error);
  }
};

// ✅ Thunk for subscribing to ride requests
export const subscribeToRideRequests = (driverId) => async (dispatch) => {
  realTimeService.registerCallback('newRideRequest', (ride) => {
    dispatch(addRideRequest(ride));
  });
  
  // Join driver room for real-time updates
  realTimeService.socket?.emit('joinDriverRoom', { driverId });
};

// ✅ Thunk for handling ride completion with rating
export const completeRideWithRating = (rideId, rating, review) => async (dispatch) => {
  try {
    await dispatch(completeRideTrip({ rideId, rating, review })).unwrap();
    
    // Update driver stats after successful completion
    const state = dispatch((_, getState) => getState().driver);
    const newRating = ((state.stats.rating * state.stats.completedRides) + rating) / (state.stats.completedRides + 1);
    
    dispatch(updateStats({
      rating: parseFloat(newRating.toFixed(1))
    }));
    
  } catch (error) {
    console.error('Failed to complete ride with rating:', error);
    throw error;
  }
};

export default driverSlice.reducer;