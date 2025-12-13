// src/store/slices/driverSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Alert } from 'react-native';

// Real-time service imports (these should be your actual services)
import realTimeService from '../../services/socket/realtimeUpdates';
import LocationService from '../../services/location/LocationService';
import RideService from '../../services/ride/RideService';

// ====================
// ASYNC THUNKS
// ====================

// Load nearby rides with real-time updates
export const loadNearbyRides = createAsyncThunk(
  'driver/loadNearbyRides',
  async (region, { rejectWithValue, getState }) => {
    try {
      const { driver } = getState();
      const { currentLocation } = driver;
      
      if (!currentLocation) {
        throw new Error('Location not available');
      }
      
      // Use RideService to get nearby rides
      const rides = await RideService.getNearbyRides({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: 5, // 5km radius
        vehicleType: driver.filters.rideTypes[0],
      });
      
      return rides;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load nearby rides');
    }
  }
);

// Accept ride request with real-time confirmation
export const acceptRideRequest = createAsyncThunk(
  'driver/acceptRide',
  async ({ rideId, driverId }, { rejectWithValue, dispatch }) => {
    try {
      // Send real-time acceptance
      const result = await RideService.acceptRide(rideId, driverId);
      
      // Subscribe to ride updates
      dispatch(subscribeToRideUpdates(rideId));
      
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to accept ride');
    }
  }
);

// Start ride with location tracking
export const startRideTrip = createAsyncThunk(
  'driver/startRide',
  async (rideId, { rejectWithValue, getState, dispatch }) => {
    try {
      const { driver } = getState();
      
      // Update ride status via real-time
      const result = await RideService.startRide(rideId);
      
      // Start location tracking for the ride
      dispatch(startRideTracking(rideId));
      
      // Update driver status
      dispatch(updateDriverStatus({
        status: 'on_trip',
        rideId,
      }));
      
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to start ride');
    }
  }
);

// Complete ride with payment processing
export const completeRideTrip = createAsyncThunk(
  'driver/completeRide',
  async ({ rideId, rating, review, paymentData }, { rejectWithValue, dispatch }) => {
    try {
      // Complete ride via service
      const result = await RideService.completeRide(
        rideId, 
        rating, 
        review, 
        paymentData
      );
      
      // Stop location tracking
      dispatch(stopRideTracking());
      
      // Update earnings
      dispatch(updateEarnings(result.fare));
      
      // Add to ride history
      dispatch(addToRideHistory({
        ...result,
        rating,
        review,
      }));
      
      // Reset driver status
      dispatch(updateDriverStatus({
        status: 'available',
        rideId: null,
      }));
      
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to complete ride');
    }
  }
);

// Cancel ride with reason
export const cancelRideRequest = createAsyncThunk(
  'driver/cancelRide',
  async ({ rideId, reason, cancelledBy }, { rejectWithValue, dispatch }) => {
    try {
      const result = await RideService.cancelRide(rideId, reason, cancelledBy);
      
      // Stop location tracking if active
      dispatch(stopRideTracking());
      
      // Update driver status
      dispatch(updateDriverStatus({
        status: 'available',
        rideId: null,
      }));
      
      // Add to cancellation history
      dispatch(addToCancellationHistory({
        rideId,
        reason,
        cancelledBy,
        timestamp: Date.now(),
      }));
      
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to cancel ride');
    }
  }
);

// Update driver status (online/offline/available)
export const updateDriverStatus = createAsyncThunk(
  'driver/updateStatus',
  async ({ status, rideId = null }, { rejectWithValue, getState }) => {
    try {
      const { driver, auth } = getState();
      const driverId = auth.user?.id;
      
      if (!driverId) {
        throw new Error('Driver ID not found');
      }
      
      // Update status via real-time service
      await realTimeService.updateDriverStatus(driverId, status, rideId);
      
      return { status, rideId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update driver status');
    }
  }
);

// Update driver location
export const updateDriverLocation = createAsyncThunk(
  'driver/updateLocation',
  async (location, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const driverId = auth.user?.id;
      
      if (!driverId) {
        throw new Error('Driver ID not found');
      }
      
      // Send location update via real-time
      await realTimeService.updateLocation(
        driverId,
        location,
        true, // isDriver
        getState().driver.currentRide?.id
      );
      
      return location;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update location');
    }
  }
);

// ====================
// INITIAL STATE
// ====================

const initialState = {
  // Driver profile and status
  driverProfile: null,
  driverId: null,
  status: 'offline', // 'offline', 'online', 'available', 'unavailable', 'on_trip', 'on_break'
  isOnline: false,
  isActive: false,
  isVerified: false,
  verificationStatus: 'pending', // 'pending', 'verified', 'rejected', 'expired'
  
  // Location tracking
  currentLocation: null,
  locationPermission: false,
  locationWatcher: null,
  isTrackingLocation: false,
  locationHistory: [],
  lastLocationUpdate: null,
  
  // Real-time connection
  socketConnected: false,
  lastSocketConnection: null,
  socketReconnectAttempts: 0,
  
  // Ride management
  nearbyRides: [],
  rideRequests: [],
  currentRide: null,
  rideHistory: [],
  cancelledRides: [],
  selectedRide: null,
  rideQueue: [],
  
  // Ride metrics
  rideMetrics: {
    totalDistance: 0,
    totalDuration: 0,
    averageRating: 0,
    acceptanceRate: 100,
    cancellationRate: 0,
  },
  
  // Earnings and payments
  earnings: {
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    pending: 0,
    lastPayout: null,
    nextPayout: null,
  },
  
  // Statistics
  stats: {
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    todayRides: 0,
    weeklyRides: 0,
    monthlyRides: 0,
    rating: 0,
    totalRatings: 0,
    onlineHours: 0,
    idleHours: 0,
  },
  
  // Vehicle information
  vehicle: {
    type: null,
    model: null,
    year: null,
    color: null,
    plateNumber: null,
    registration: null,
    insurance: null,
    capacity: 1,
    features: [],
  },
  
  // Documents
  documents: {
    license: null,
    registration: null,
    insurance: null,
    photo: null,
    status: 'pending',
    expiryDates: {},
  },
  
  // Preferences and settings
  preferences: {
    autoAcceptRides: false,
    maxRideDistance: 10, // km
    minFareAmount: 500, // MWK
    preferredAreas: [],
    workingHours: {
      start: '08:00',
      end: '20:00',
      days: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    },
    notifications: {
      rideRequests: true,
      messages: true,
      earnings: true,
      system: true,
    },
  },
  
  // Filters for ride requests
  filters: {
    minFare: 0,
    maxDistance: 10, // km
    rideTypes: ['motorcycle'],
    paymentMethods: ['cash', 'wallet'],
    ratingThreshold: 4.0,
  },
  
  // Loading states
  loading: {
    rides: false,
    acceptance: false,
    starting: false,
    completion: false,
    cancellation: false,
    statusUpdate: false,
    locationUpdate: false,
    earnings: false,
  },
  
  // Error states
  errors: {
    rides: null,
    acceptance: null,
    starting: null,
    completion: null,
    cancellation: null,
    statusUpdate: null,
    locationUpdate: null,
    earnings: null,
    connection: null,
  },
  
  // Real-time tracking
  realTime: {
    rideUpdates: {},
    locationUpdates: {},
    chatMessages: {},
    lastPing: null,
    connectionQuality: 'good', // 'good', 'fair', 'poor'
  },
  
  // Session data
  session: {
    startTime: null,
    duration: 0,
    earningsSession: 0,
    ridesSession: 0,
    distanceSession: 0,
  },
  
  // Cache and timestamps
  lastUpdated: {
    rides: null,
    earnings: null,
    location: null,
    profile: null,
  },
  
  // Feature flags
  features: {
    canAcceptRides: false,
    canGoOnline: false,
    canTrackLocation: false,
    canReceivePayments: false,
    canUseWallet: false,
  },
  
  // SOS and emergency
  sos: {
    enabled: true,
    lastActivated: null,
    emergencyContacts: [],
  },
};

// ====================
// SLICE DEFINITION
// ====================

const driverSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    // ====================
    // DRIVER PROFILE
    // ====================
    
    setDriverProfile: (state, action) => {
      state.driverProfile = action.payload;
      state.driverId = action.payload.id;
      state.isVerified = action.payload.isVerified || false;
      state.verificationStatus = action.payload.verificationStatus || 'pending';
      
      // Set features based on profile
      state.features.canAcceptRides = action.payload.isVerified && action.payload.isActive;
      state.features.canGoOnline = action.payload.isVerified;
      state.features.canTrackLocation = true;
      
      // Update last updated timestamp
      state.lastUpdated.profile = Date.now();
    },
    
    updateDriverProfile: (state, action) => {
      state.driverProfile = {
        ...state.driverProfile,
        ...action.payload,
      };
      state.lastUpdated.profile = Date.now();
    },
    
    // ====================
    // DRIVER STATUS
    // ====================
    
    setDriverStatus: (state, action) => {
      const { status, rideId } = action.payload;
      state.status = status;
      state.isOnline = ['online', 'available', 'on_trip'].includes(status);
      state.isActive = status === 'on_trip';
      
      if (rideId) {
        state.currentRide = state.currentRide?.id === rideId 
          ? state.currentRide 
          : null;
      }
      
      // Update session start time when going online
      if (status === 'online' || status === 'available') {
        if (!state.session.startTime) {
          state.session.startTime = Date.now();
        }
      } else if (status === 'offline') {
        state.session.startTime = null;
        state.session.duration = 0;
      }
    },
    
    goOnline: (state) => {
      state.status = 'online';
      state.isOnline = true;
      state.errors.statusUpdate = null;
      
      // Start session timing
      if (!state.session.startTime) {
        state.session.startTime = Date.now();
      }
    },
    
    goOffline: (state) => {
      state.status = 'offline';
      state.isOnline = false;
      state.isActive = false;
      state.nearbyRides = [];
      state.rideRequests = [];
      state.currentRide = null;
      state.selectedRide = null;
      state.errors.statusUpdate = null;
      
      // Reset session
      state.session.startTime = null;
      state.session.duration = 0;
      state.session.earningsSession = 0;
      state.session.ridesSession = 0;
      state.session.distanceSession = 0;
    },
    
    setActive: (state, action) => {
      state.isActive = action.payload;
      state.status = action.payload ? 'on_trip' : 'available';
    },
    
    takeBreak: (state, action) => {
      state.status = 'on_break';
      state.isOnline = true;
      state.isActive = false;
      
      // Store break duration if provided
      if (action.payload?.duration) {
        state.preferences.breakDuration = action.payload.duration;
      }
    },
    
    // ====================
    // LOCATION MANAGEMENT
    // ====================
    
    setCurrentLocation: (state, action) => {
      const location = action.payload;
      state.currentLocation = location;
      state.lastLocationUpdate = Date.now();
      
      // Add to location history (for route tracking)
      state.locationHistory.push({
        ...location,
        timestamp: Date.now(),
      });
      
      // Keep only last 100 locations
      if (state.locationHistory.length > 100) {
        state.locationHistory.shift();
      }
      
      // Update last updated timestamp
      state.lastUpdated.location = Date.now();
    },
    
    setLocationPermission: (state, action) => {
      state.locationPermission = action.payload;
      state.features.canTrackLocation = action.payload;
    },
    
    setLocationWatcher: (state, action) => {
      state.locationWatcher = action.payload;
      state.isTrackingLocation = !!action.payload;
    },
    
    clearLocationWatcher: (state) => {
      state.locationWatcher = null;
      state.isTrackingLocation = false;
    },
    
    // ====================
    // RIDE MANAGEMENT
    // ====================
    
    setCurrentRide: (state, action) => {
      state.currentRide = action.payload;
      state.isActive = !!action.payload;
      state.status = action.payload ? 'on_trip' : 'available';
      
      if (action.payload) {
        // Clear nearby rides and requests when starting a ride
        state.nearbyRides = state.nearbyRides.filter(
          ride => ride.id !== action.payload.id
        );
        state.rideRequests = state.rideRequests.filter(
          ride => ride.id !== action.payload.id
        );
      }
    },
    
    addNearbyRide: (state, action) => {
      const ride = action.payload;
      
      // Check if ride already exists
      const existingIndex = state.nearbyRides.findIndex(r => r.id === ride.id);
      
      if (existingIndex !== -1) {
        // Update existing ride
        state.nearbyRides[existingIndex] = {
          ...state.nearbyRides[existingIndex],
          ...ride,
          updatedAt: Date.now(),
        };
      } else {
        // Add new ride with timestamp
        state.nearbyRides.push({
          ...ride,
          receivedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      
      // Sort by distance or fare (closest/highest first)
      state.nearbyRides.sort((a, b) => {
        // Priority: distance then fare
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return b.fare - a.fare;
      });
      
      // Keep only last 20 rides
      if (state.nearbyRides.length > 20) {
        state.nearbyRides = state.nearbyRides.slice(0, 20);
      }
      
      state.lastUpdated.rides = Date.now();
    },
    
    removeNearbyRide: (state, action) => {
      const rideId = action.payload;
      state.nearbyRides = state.nearbyRides.filter(ride => ride.id !== rideId);
    },
    
    clearNearbyRides: (state) => {
      state.nearbyRides = [];
    },
    
    addRideRequest: (state, action) => {
      const ride = action.payload;
      
      // Check if already in queue
      const exists = state.rideRequests.find(r => r.id === ride.id);
      if (!exists) {
        state.rideRequests.unshift({
          ...ride,
          requestedAt: Date.now(),
          expiresAt: Date.now() + 30000, // 30 seconds to accept
        });
        
        // Show notification (in real app, this would trigger a push notification)
        if (state.preferences.notifications.rideRequests) {
          // Store for UI notification
          state.realTime.rideUpdates[ride.id] = {
            type: 'new_request',
            timestamp: Date.now(),
          };
        }
      }
    },
    
    removeRideRequest: (state, action) => {
      const rideId = action.payload;
      state.rideRequests = state.rideRequests.filter(ride => ride.id !== rideId);
    },
    
    clearRideRequests: (state) => {
      state.rideRequests = [];
    },
    
    addToRideHistory: (state, action) => {
      const ride = {
        ...action.payload,
        completedAt: Date.now(),
      };
      
      state.rideHistory.unshift(ride);
      
      // Update stats
      state.stats.completedRides += 1;
      state.stats.totalRides += 1;
      state.stats.todayRides += 1;
      
      // Update session stats
      state.session.ridesSession += 1;
      state.session.earningsSession += ride.fare || 0;
      state.session.distanceSession += ride.distance || 0;
      
      // Keep only last 100 rides in history
      if (state.rideHistory.length > 100) {
        state.rideHistory.pop();
      }
    },
    
    addToCancellationHistory: (state, action) => {
      state.cancelledRides.unshift({
        ...action.payload,
        cancelledAt: Date.now(),
      });
      
      // Update stats
      state.stats.cancelledRides += 1;
      state.stats.totalRides += 1;
      state.stats.cancellationRate = 
        (state.stats.cancelledRides / state.stats.totalRides) * 100;
      
      // Keep only last 50 cancellations
      if (state.cancelledRides.length > 50) {
        state.cancelledRides.pop();
      }
    },
    
    updateRideStatus: (state, action) => {
      const { rideId, status, data } = action.payload;
      
      // Update current ride if it matches
      if (state.currentRide?.id === rideId) {
        state.currentRide = {
          ...state.currentRide,
          status,
          ...data,
        };
      }
      
      // Update in history if exists
      const historyIndex = state.rideHistory.findIndex(r => r.id === rideId);
      if (historyIndex !== -1) {
        state.rideHistory[historyIndex] = {
          ...state.rideHistory[historyIndex],
          status,
          ...data,
        };
      }
    },
    
    // ====================
    // REAL-TIME CONNECTION
    // ====================
    
    setSocketConnected: (state, action) => {
      state.socketConnected = action.payload;
      state.lastSocketConnection = action.payload ? Date.now() : state.lastSocketConnection;
      
      if (action.payload) {
        state.socketReconnectAttempts = 0;
        state.errors.connection = null;
      }
    },
    
    setSocketReconnecting: (state, action) => {
      state.socketReconnectAttempts = action.payload;
    },
    
    updateConnectionQuality: (state, action) => {
      state.realTime.connectionQuality = action.payload;
    },
    
    // ====================
    // EARNINGS & STATS
    // ====================
    
    updateEarnings: (state, action) => {
      const { amount, type = 'ride' } = action.payload;
      
      // Update earnings
      state.earnings.today += amount;
      state.earnings.week += amount;
      state.earnings.month += amount;
      state.earnings.total += amount;
      
      // Update session earnings
      state.session.earningsSession += amount;
      
      // Update stats based on type
      if (type === 'ride') {
        state.stats.todayRides += 1;
        state.session.ridesSession += 1;
      }
      
      state.lastUpdated.earnings = Date.now();
    },
    
    resetDailyEarnings: (state) => {
      state.earnings.today = 0;
      state.stats.todayRides = 0;
    },
    
    updateStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
    },
    
    updateRating: (state, action) => {
      const { rating } = action.payload;
      
      // Calculate new average rating
      const totalScore = state.stats.rating * state.stats.totalRatings;
      state.stats.totalRatings += 1;
      state.stats.rating = (totalScore + rating) / state.stats.totalRatings;
      state.stats.rating = parseFloat(state.stats.rating.toFixed(1));
      
      // Update ride metrics
      state.rideMetrics.averageRating = state.stats.rating;
    },
    
    // ====================
    // VEHICLE & DOCUMENTS
    // ====================
    
    updateVehicleInfo: (state, action) => {
      state.vehicle = {
        ...state.vehicle,
        ...action.payload,
      };
    },
    
    updateDocuments: (state, action) => {
      state.documents = {
        ...state.documents,
        ...action.payload,
      };
      
      // Update verification status if all documents are uploaded
      if (
        state.documents.license &&
        state.documents.registration &&
        state.documents.insurance &&
        state.documents.photo
      ) {
        state.documents.status = 'submitted';
      }
    },
    
    setVerificationStatus: (state, action) => {
      state.verificationStatus = action.payload;
      state.isVerified = action.payload === 'verified';
      state.features.canAcceptRides = action.payload === 'verified';
    },
    
    // ====================
    // PREFERENCES & FILTERS
    // ====================
    
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    
    updateFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
    
    toggleAutoAccept: (state) => {
      state.preferences.autoAcceptRides = !state.preferences.autoAcceptRides;
    },
    
    // ====================
    // SESSION MANAGEMENT
    // ====================
    
    updateSessionDuration: (state) => {
      if (state.session.startTime) {
        state.session.duration = Date.now() - state.session.startTime;
        state.stats.onlineHours = state.session.duration / (1000 * 60 * 60); // Convert to hours
      }
    },
    
    resetSession: (state) => {
      state.session = {
        startTime: null,
        duration: 0,
        earningsSession: 0,
        ridesSession: 0,
        distanceSession: 0,
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
    // REAL-TIME UPDATES
    // ====================
    
    addRealTimeUpdate: (state, action) => {
      const { type, data } = action.payload;
      state.realTime[type] = {
        ...state.realTime[type],
        ...data,
        timestamp: Date.now(),
      };
    },
    
    // ====================
    // FEATURE FLAGS
    // ====================
    
    updateFeatures: (state, action) => {
      state.features = {
        ...state.features,
        ...action.payload,
      };
    },
    
    // ====================
    // SOS & EMERGENCY
    // ====================
    
    activateSOS: (state) => {
      state.sos.lastActivated = Date.now();
    },
    
    updateEmergencyContacts: (state, action) => {
      state.sos.emergencyContacts = action.payload;
    },
    
    // ====================
    // RESET & CLEANUP
    // ====================
    
    resetDriverState: (state) => {
      return {
        ...initialState,
        driverProfile: state.driverProfile,
        driverId: state.driverId,
        vehicle: state.vehicle,
        documents: state.documents,
        preferences: state.preferences,
        rideHistory: state.rideHistory,
        earnings: state.earnings,
        stats: state.stats,
      };
    },
    
    // Batch update
    batchUpdateDriver: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },
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
        state.lastUpdated.rides = Date.now();
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
        state.status = 'on_trip';
        
        // Remove from nearby rides and requests
        state.nearbyRides = state.nearbyRides.filter(
          ride => ride.id !== action.payload.ride.id
        );
        state.rideRequests = state.rideRequests.filter(
          ride => ride.id !== action.payload.ride.id
        );
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
          state.currentRide.startedAt = Date.now();
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
        const completedRide = {
          ...state.currentRide,
          ...action.payload,
          completedAt: Date.now(),
        };
        
        state.rideHistory.unshift(completedRide);
        
        // Update stats
        state.stats.completedRides += 1;
        state.stats.totalRides += 1;
        state.stats.todayRides += 1;
        
        // Update session
        state.session.ridesSession += 1;
        state.session.earningsSession += action.payload.fare || 0;
        
        // Update earnings
        state.earnings.today += action.payload.fare || 0;
        state.earnings.total += action.payload.fare || 0;
        state.earnings.week += action.payload.fare || 0;
        state.earnings.month += action.payload.fare || 0;
        
        // Clear current ride
        state.currentRide = null;
        state.isActive = false;
        state.status = 'available';
        
        state.lastUpdated.earnings = Date.now();
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
        
        // Add to cancellation history
        state.cancelledRides.unshift({
          ...state.currentRide,
          status: 'cancelled',
          cancellationReason: action.payload.reason,
          cancelledAt: Date.now(),
        });
        
        // Update stats
        state.stats.cancelledRides += 1;
        state.stats.totalRides += 1;
        state.stats.cancellationRate = 
          (state.stats.cancelledRides / state.stats.totalRides) * 100;
        
        // Clear current ride
        state.currentRide = null;
        state.isActive = false;
        state.status = 'available';
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
        state.status = action.payload.status;
        state.isOnline = ['online', 'available', 'on_trip'].includes(action.payload.status);
        state.isActive = action.payload.status === 'on_trip';
        
        if (action.payload.status === 'online' || action.payload.status === 'available') {
          if (!state.session.startTime) {
            state.session.startTime = Date.now();
          }
        } else if (action.payload.status === 'offline') {
          state.session.startTime = null;
          state.session.duration = 0;
        }
      })
      .addCase(updateDriverStatus.rejected, (state, action) => {
        state.loading.statusUpdate = false;
        state.errors.statusUpdate = action.payload;
      })
      
      // Update driver location
      .addCase(updateDriverLocation.pending, (state) => {
        state.loading.locationUpdate = true;
        state.errors.locationUpdate = null;
      })
      .addCase(updateDriverLocation.fulfilled, (state, action) => {
        state.loading.locationUpdate = false;
        state.currentLocation = action.payload;
        state.lastLocationUpdate = Date.now();
        state.lastUpdated.location = Date.now();
      })
      .addCase(updateDriverLocation.rejected, (state, action) => {
        state.loading.locationUpdate = false;
        state.errors.locationUpdate = action.payload;
      });
  },
});

// ====================
// ACTION CREATORS
// ====================

export const {
  setDriverProfile,
  updateDriverProfile,
  setDriverStatus,
  goOnline,
  goOffline,
  setActive,
  takeBreak,
  setCurrentLocation,
  setLocationPermission,
  setLocationWatcher,
  clearLocationWatcher,
  setCurrentRide,
  addNearbyRide,
  removeNearbyRide,
  clearNearbyRides,
  addRideRequest,
  removeRideRequest,
  clearRideRequests,
  addToRideHistory,
  addToCancellationHistory,
  updateRideStatus,
  setSocketConnected,
  setSocketReconnecting,
  updateConnectionQuality,
  updateEarnings,
  resetDailyEarnings,
  updateStats,
  updateRating,
  updateVehicleInfo,
  updateDocuments,
  setVerificationStatus,
  updatePreferences,
  updateFilters,
  toggleAutoAccept,
  updateSessionDuration,
  resetSession,
  setError,
  clearError,
  clearAllErrors,
  addRealTimeUpdate,
  updateFeatures,
  activateSOS,
  updateEmergencyContacts,
  resetDriverState,
  batchUpdateDriver,
} = driverSlice.actions;

// ====================
// SELECTORS
// ====================

export const selectDriver = (state) => state.driver;
export const selectDriverProfile = (state) => state.driver.driverProfile;
export const selectDriverId = (state) => state.driver.driverId;
export const selectDriverStatus = (state) => state.driver.status;
export const selectIsOnline = (state) => state.driver.isOnline;
export const selectIsActive = (state) => state.driver.isActive;
export const selectIsVerified = (state) => state.driver.isVerified;
export const selectVerificationStatus = (state) => state.driver.verificationStatus;
export const selectCurrentLocation = (state) => state.driver.currentLocation;
export const selectLocationPermission = (state) => state.driver.locationPermission;
export const selectIsTrackingLocation = (state) => state.driver.isTrackingLocation;
export const selectSocketConnected = (state) => state.driver.socketConnected;
export const selectNearbyRides = (state) => state.driver.nearbyRides;
export const selectRideRequests = (state) => state.driver.rideRequests;
export const selectCurrentRide = (state) => state.driver.currentRide;
export const selectRideHistory = (state) => state.driver.rideHistory;
export const selectCancelledRides = (state) => state.driver.cancelledRides;
export const selectEarnings = (state) => state.driver.earnings;
export const selectStats = (state) => state.driver.stats;
export const selectVehicle = (state) => state.driver.vehicle;
export const selectDocuments = (state) => state.driver.documents;
export const selectPreferences = (state) => state.driver.preferences;
export const selectFilters = (state) => state.driver.filters;
export const selectLoading = (state) => state.driver.loading;
export const selectErrors = (state) => state.driver.errors;
export const selectSession = (state) => state.driver.session;
export const selectFeatures = (state) => state.driver.features;
export const selectRealTime = (state) => state.driver.realTime;
export const selectLastUpdated = (state) => state.driver.lastUpdated;

// Derived Selectors
export const selectCanAcceptRides = (state) =>
  state.driver.isVerified &&
  state.driver.status === 'available' &&
  state.driver.socketConnected &&
  state.driver.locationPermission;

export const selectHasActiveRide = (state) => !!state.driver.currentRide;
export const selectHasRideRequests = (state) => state.driver.rideRequests.length > 0;
export const selectHasNearbyRides = (state) => state.driver.nearbyRides.length > 0;
export const selectTotalEarnings = (state) => state.driver.earnings.total;
export const selectTodayEarnings = (state) => state.driver.earnings.today;
export const selectAverageRating = (state) => state.driver.stats.rating;
export const selectCompletedRidesCount = (state) => state.driver.stats.completedRides;
export const selectSessionEarnings = (state) => state.driver.session.earningsSession;
export const selectSessionRides = (state) => state.driver.session.ridesSession;
export const selectSessionDuration = (state) => state.driver.session.duration;

// Complex Selectors
export const selectDriverDashboard = (state) => ({
  status: state.driver.status,
  isOnline: state.driver.isOnline,
  hasActiveRide: !!state.driver.currentRide,
  earningsToday: state.driver.earnings.today,
  ridesToday: state.driver.stats.todayRides,
  rating: state.driver.stats.rating,
  rideRequests: state.driver.rideRequests.length,
  nearbyRides: state.driver.nearbyRides.length,
  sessionEarnings: state.driver.session.earningsSession,
  sessionDuration: state.driver.session.duration,
  vehicle: state.driver.vehicle,
  verificationStatus: state.driver.verificationStatus,
});

export const selectRideRequestDetails = (rideId) => (state) => {
  const ride = state.driver.rideRequests.find(r => r.id === rideId) ||
               state.driver.nearbyRides.find(r => r.id === rideId);
  return ride || null;
};

export const selectCurrentRideDetails = (state) => {
  if (!state.driver.currentRide) return null;
  
  return {
    ...state.driver.currentRide,
    elapsedTime: state.driver.currentRide.startedAt 
      ? Date.now() - state.driver.currentRide.startedAt 
      : 0,
    driverLocation: state.driver.currentLocation,
    status: state.driver.currentRide.status,
  };
};

// ====================
// THUNKS FOR REAL-TIME OPERATIONS
// ====================

// Initialize driver session with location and socket
export const initializeDriverSession = (driverProfile) => async (dispatch) => {
  try {
    dispatch(setDriverProfile(driverProfile));
    
    // Request location permission
    const hasPermission = await LocationService.requestLocationPermission();
    dispatch(setLocationPermission(hasPermission));
    
    if (hasPermission) {
      // Get initial location
      const location = await LocationService.getCurrentPosition();
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: Date.now(),
      };
      
      dispatch(setCurrentLocation(locationData));
      
      // Start location tracking
      const watchId = LocationService.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            bearing: position.coords.heading || 0,
            speed: position.coords.speed || 0,
            timestamp: Date.now(),
          };
          
          dispatch(setCurrentLocation(newLocation));
          
          // Send location update via real-time if online
          if (driverProfile.id) {
            dispatch(updateDriverLocation(newLocation));
          }
        },
        (error) => {
          console.error('Location tracking error:', error);
          dispatch(setError({ 
            key: 'locationUpdate', 
            error: 'Location tracking failed' 
          }));
        },
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
      
      dispatch(setLocationWatcher(watchId));
      
      return watchId;
    }
  } catch (error) {
    console.error('Failed to initialize driver session:', error);
    dispatch(setError({ 
      key: 'connection', 
      error: 'Failed to initialize driver session' 
    }));
  }
};

// Toggle online status with real-time updates
export const toggleOnlineStatus = () => async (dispatch, getState) => {
  const state = getState();
  const { driver, auth } = state;
  const driverId = auth.user?.id;
  
  try {
    if (driver.status === 'offline') {
      // Going online
      dispatch(goOnline());
      
      // Update status via real-time
      await dispatch(updateDriverStatus({ 
        status: 'available',
        rideId: null 
      })).unwrap();
      
      // Initialize real-time service
      realTimeService.initialize(auth.user?.id, 'driver');
      
      // Subscribe to ride requests
      realTimeService.on('ride_request', (ride) => {
        dispatch(addRideRequest(ride));
        
        // Auto-accept if enabled
        if (driver.preferences.autoAcceptRides) {
          setTimeout(() => {
            dispatch(acceptRideRequest({ 
              rideId: ride.id, 
              driverId 
            }));
          }, 1000);
        }
      });
      
      // Subscribe to ride updates
      realTimeService.on('ride_status_update', (update) => {
        if (update.rideId === driver.currentRide?.id) {
          dispatch(updateRideStatus(update));
        }
      });
      
    } else {
      // Going offline
      dispatch(goOffline());
      
      // Update status via real-time
      await dispatch(updateDriverStatus({ 
        status: 'offline',
        rideId: null 
      })).unwrap();
      
      // Disconnect real-time service
      realTimeService.disconnect();
      
      // Clear ride data
      dispatch(clearNearbyRides());
      dispatch(clearRideRequests());
    }
  } catch (error) {
    console.error('Failed to toggle online status:', error);
    dispatch(setError({ 
      key: 'statusUpdate', 
      error: 'Failed to update status' 
    }));
    
    // Revert status on error
    if (driver.status === 'offline') {
      dispatch(goOffline());
    } else {
      dispatch(goOnline());
    }
  }
};

// Start ride tracking
export const startRideTracking = (rideId) => async (dispatch, getState) => {
  const { driver } = getState();
  
  try {
    // Start enhanced location tracking for ride
    if (driver.locationWatcher) {
      LocationService.stopWatching(driver.locationWatcher);
    }
    
    const watchId = LocationService.watchPositionForRide(
      rideId,
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          bearing: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          timestamp: Date.now(),
        };
        
        dispatch(setCurrentLocation(location));
        dispatch(updateDriverLocation(location));
      },
      (error) => {
        console.error('Ride tracking error:', error);
      },
      { 
        enableHighAccuracy: true, 
        distanceFilter: 5,
        interval: 3000 
      }
    );
    
    dispatch(setLocationWatcher(watchId));
  } catch (error) {
    console.error('Failed to start ride tracking:', error);
  }
};

// Stop ride tracking
export const stopRideTracking = () => async (dispatch, getState) => {
  const { driver } = getState();
  
  try {
    if (driver.locationWatcher) {
      LocationService.stopWatching(driver.locationWatcher);
      dispatch(clearLocationWatcher());
    }
    
    // Resume normal tracking
    const watchId = LocationService.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        dispatch(setCurrentLocation(location));
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
    
    dispatch(setLocationWatcher(watchId));
  } catch (error) {
    console.error('Failed to stop ride tracking:', error);
  }
};

// Subscribe to ride updates
export const subscribeToRideUpdates = (rideId) => async (dispatch) => {
  realTimeService.on(`ride_update_${rideId}`, (update) => {
    dispatch(updateRideStatus(update));
  });
  
  realTimeService.on(`chat_message_${rideId}`, (message) => {
    dispatch(addRealTimeUpdate({
      type: 'chatMessages',
      data: { [rideId]: message }
    }));
  });
};

// Update driver earnings with payout
export const processPayout = (amount, method) => async (dispatch, getState) => {
  const { driver } = getState();
  
  try {
    // API call to process payout
    // const result = await PaymentService.processPayout(amount, method);
    
    // Update earnings
    dispatch(updateEarnings({ amount: -amount, type: 'payout' }));
    
    // Add to transaction history
    dispatch(addRealTimeUpdate({
      type: 'transactions',
      data: {
        type: 'payout',
        amount,
        method,
        timestamp: Date.now(),
        status: 'completed',
      }
    }));
    
    return { success: true };
  } catch (error) {
    console.error('Payout processing failed:', error);
    dispatch(setError({ 
      key: 'earnings', 
      error: 'Payout failed' 
    }));
    throw error;
  }
};

// Update driver rating
export const updateDriverRating = (newRating) => async (dispatch, getState) => {
  const { driver } = getState();
  
  try {
    // Calculate new average
    const totalScore = driver.stats.rating * driver.stats.totalRatings;
    const updatedTotalRatings = driver.stats.totalRatings + 1;
    const updatedRating = (totalScore + newRating) / updatedTotalRatings;
    
    // Update local state
    dispatch(updateRating({ rating: newRating }));
    
    // API call to update rating on server
    // await DriverService.updateRating(driver.driverId, updatedRating);
    
    return { success: true, newRating: updatedRating };
  } catch (error) {
    console.error('Failed to update rating:', error);
    dispatch(setError({ 
      key: 'stats', 
      error: 'Failed to update rating' 
    }));
    throw error;
  }
};

export default driverSlice.reducer;