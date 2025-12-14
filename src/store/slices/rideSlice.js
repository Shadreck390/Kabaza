// src/store/slices/rideSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Alert } from 'react-native';

// Service imports (adjust based on your actual services)
import RideService from 'services/ride/RideService';
import LocationService from 'services/location/locationService';
import PaymentService from 'services/payment/PaymentService';
import realTimeService from 'services/socket/realtimeUpdates';

// ====================
// ASYNC THUNKS
// ====================

// Book a new ride
export const bookRide = createAsyncThunk(
  'ride/bookRide',
  async (rideData, { rejectWithValue, getState }) => {
    try {
      const { auth, location } = getState();
      const userId = auth.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Prepare ride data with user location
      const rideRequest = {
        ...rideData,
        userId,
        pickupLocation: location.currentLocation || rideData.pickupLocation,
        status: 'searching',
        createdAt: Date.now(),
      };
      
      // Call ride booking service
      const ride = await RideService.bookRide(rideRequest);
      
      // Subscribe to ride updates
      realTimeService.subscribeToRide(ride.id, userId);
      
      return ride;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to book ride');
    }
  }
);

// Cancel ride
export const cancelRide = createAsyncThunk(
  'ride/cancelRide',
  async ({ rideId, reason }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const userId = auth.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const result = await RideService.cancelRide(rideId, userId, reason);
      
      // Unsubscribe from ride updates
      realTimeService.unsubscribeFromRide(rideId);
      
      return { rideId, reason, ...result };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to cancel ride');
    }
  }
);

// Rate ride
export const rateRide = createAsyncThunk(
  'ride/rateRide',
  async ({ rideId, rating, review, driverRating }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const userId = auth.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const result = await RideService.rateRide(
        rideId, 
        userId, 
        rating, 
        review, 
        driverRating
      );
      
      return { rideId, rating, review, driverRating, ...result };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to rate ride');
    }
  }
);

// Get ride history
export const fetchRideHistory = createAsyncThunk(
  'ride/fetchHistory',
  async ({ page = 1, limit = 20 }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const userId = auth.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const history = await RideService.getRideHistory(userId, page, limit);
      return { history, page };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch ride history');
    }
  }
);

// Get ride details
export const fetchRideDetails = createAsyncThunk(
  'ride/fetchDetails',
  async (rideId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const userId = auth.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const details = await RideService.getRideDetails(rideId, userId);
      return details;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch ride details');
    }
  }
);

// Update ride location
export const updateRideLocation = createAsyncThunk(
  'ride/updateLocation',
  async ({ rideId, location, isPickup = false }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const userId = auth.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const result = await RideService.updateRideLocation(
        rideId, 
        userId, 
        location, 
        isPickup
      );
      
      return { rideId, location, isPickup, ...result };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update ride location');
    }
  }
);

// Get fare estimate
export const getFareEstimate = createAsyncThunk(
  'ride/getFareEstimate',
  async (rideData, { rejectWithValue }) => {
    try {
      const estimate = await RideService.getFareEstimate(rideData);
      return estimate;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get fare estimate');
    }
  }
);

// ====================
// INITIAL STATE
// ====================

const initialState = {
  // Current ride
  currentRide: null,
  rideBooking: null,
  
  // Ride requests and status
  rideRequests: [],
  searchingForDriver: false,
  driverAssigned: false,
  rideStarted: false,
  rideCompleted: false,
  rideCancelled: false,
  
  // Ride details
  rideDetails: {
    pickup: null,
    destination: null,
    distance: 0, // in km
    duration: 0, // in minutes
    estimatedFare: 0,
    actualFare: 0,
    vehicleType: 'standard',
    paymentMethod: 'cash',
    notes: '',
    passengers: 1,
  },
  
  // Driver info for current ride
  assignedDriver: null,
  driverLocation: null,
  driverDistance: 0, // in km
  driverETA: 0, // in minutes
  driverRating: 0,
  
  // Ride tracking
  rideTracking: {
    isTracking: false,
    currentLocation: null,
    routePolyline: null,
    distanceTraveled: 0,
    timeElapsed: 0,
    lastUpdate: null,
  },
  
  // Ride history
  rideHistory: [],
  historyPage: 1,
  hasMoreHistory: true,
  historyLoading: false,
  
  // Cancelled rides
  cancelledRides: [],
  
  // Favorites and frequent destinations
  favoriteDestinations: [],
  recentDestinations: [],
  frequentRoutes: [],
  
  // Payment and billing
  payment: {
    method: 'cash',
    cardLastFour: null,
    walletBalance: 0,
    needPayment: false,
    paymentStatus: 'pending',
    transactionId: null,
    receiptUrl: null,
  },
  
  // Ratings and reviews
  ratings: {
    userRating: 0,
    driverRating: 0,
    review: '',
    submitted: false,
  },
  
  // Real-time updates
  realTimeUpdates: {
    driverLocation: null,
    rideStatus: null,
    messages: [],
    lastUpdate: null,
    connectionStatus: 'disconnected',
  },
  
  // Ride preferences
  preferences: {
    vehiclePreference: 'standard',
    paymentPreference: 'cash',
    musicPreference: null,
    conversationPreference: 'neutral',
    temperaturePreference: 'moderate',
    accessibilityNeeds: [],
    recurringRide: false,
    scheduleTime: null,
  },
  
  // Safety features
  safety: {
    shareRideEnabled: false,
    emergencyContacts: [],
    sosActivated: false,
    lastSOSTime: null,
    routeDeviation: false,
  },
  
  // Ride statistics
  stats: {
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    totalSpent: 0,
    averageRating: 0,
    favoriteDriver: null,
    mostFrequentRoute: null,
    rideStreak: 0,
  },
  
  // Promotions and discounts
  promotions: {
    activePromo: null,
    promoCode: '',
    discountAmount: 0,
    creditsAvailable: 0,
    referralCode: '',
  },
  
  // Loading states
  loading: {
    booking: false,
    canceling: false,
    rating: false,
    fetchingHistory: false,
    fetchingDetails: false,
    updatingLocation: false,
    estimatingFare: false,
  },
  
  // Error states
  errors: {
    booking: null,
    canceling: null,
    rating: null,
    fetchingHistory: null,
    fetchingDetails: null,
    updatingLocation: null,
    estimatingFare: null,
    payment: null,
  },
  
  // Ride search and filters
  filters: {
    vehicleType: 'any',
    priceRange: { min: 0, max: 10000 },
    rating: 4.0,
    distance: 10, // max km
    sortBy: 'newest',
  },
  
  // Ride queue and matching
  rideQueue: {
    position: null,
    estimatedWaitTime: 0,
    driversAvailable: 0,
    surgePricing: false,
    multiplier: 1.0,
  },
  
  // Timestamps
  timestamps: {
    rideRequested: null,
    driverAccepted: null,
    driverArrived: null,
    rideStarted: null,
    rideCompleted: null,
    lastUpdated: null,
  },
  
  // Session data
  session: {
    activeRides: 0,
    sessionSpending: 0,
    sessionDuration: 0,
    startTime: null,
  },
  
  // Feature flags
  features: {
    canBookRide: true,
    canCancelRide: false,
    canRateRide: false,
    canShareRide: true,
    canScheduleRide: true,
    canUseWallet: false,
    canApplyPromo: true,
  },
  
  // Cache and optimization
  cache: {
    fareEstimates: {},
    recentSearches: [],
    quickBookmarks: [],
  },
};

// ====================
// SLICE DEFINITION
// ====================

const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    // ====================
    // RIDE BOOKING
    // ====================
    
    setRideDetails: (state, action) => {
      state.rideDetails = {
        ...state.rideDetails,
        ...action.payload,
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearRideDetails: (state) => {
      state.rideDetails = initialState.rideDetails;
    },
    
    setPickupLocation: (state, action) => {
      state.rideDetails.pickup = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    setDestination: (state, action) => {
      state.rideDetails.destination = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    setVehicleType: (state, action) => {
      state.rideDetails.vehicleType = action.payload;
      state.preferences.vehiclePreference = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    setPaymentMethod: (state, action) => {
      state.rideDetails.paymentMethod = action.payload;
      state.payment.method = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // RIDE STATUS
    // ====================
    
    setCurrentRide: (state, action) => {
      state.currentRide = action.payload;
      state.searchingForDriver = action.payload?.status === 'searching';
      state.driverAssigned = !!action.payload?.driverId;
      state.rideStarted = action.payload?.status === 'started';
      state.rideCompleted = action.payload?.status === 'completed';
      state.rideCancelled = action.payload?.status === 'cancelled';
      
      // Update features based on ride status
      state.features.canCancelRide = 
        action.payload && 
        ['searching', 'accepted', 'arriving', 'arrived'].includes(action.payload.status);
      state.features.canRateRide = action.payload?.status === 'completed';
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    setRideStatus: (state, action) => {
      const { status, data } = action.payload;
      
      if (state.currentRide) {
        state.currentRide.status = status;
        state.currentRide = {
          ...state.currentRide,
          ...data,
        };
        
        // Update status flags
        state.searchingForDriver = status === 'searching';
        state.driverAssigned = status === 'accepted' || status === 'arriving' || status === 'arrived';
        state.rideStarted = status === 'started';
        state.rideCompleted = status === 'completed';
        state.rideCancelled = status === 'cancelled';
        
        // Update timestamps
        if (status === 'accepted') {
          state.timestamps.driverAccepted = Date.now();
        } else if (status === 'arrived') {
          state.timestamps.driverArrived = Date.now();
        } else if (status === 'started') {
          state.timestamps.rideStarted = Date.now();
        } else if (status === 'completed') {
          state.timestamps.rideCompleted = Date.now();
        }
        
        state.timestamps.lastUpdated = Date.now();
      }
    },
    
    // ====================
    // DRIVER MANAGEMENT
    // ====================
    
    setAssignedDriver: (state, action) => {
      state.assignedDriver = action.payload;
      state.driverAssigned = !!action.payload;
      state.driverRating = action.payload?.rating || 0;
      state.timestamps.lastUpdated = Date.now();
    },
    
    setDriverLocation: (state, action) => {
      state.driverLocation = action.payload.location;
      state.driverDistance = action.payload.distance || state.driverDistance;
      state.driverETA = action.payload.eta || state.driverETA;
      state.realTimeUpdates.driverLocation = {
        ...action.payload,
        timestamp: Date.now(),
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearDriverInfo: (state) => {
      state.assignedDriver = null;
      state.driverLocation = null;
      state.driverDistance = 0;
      state.driverETA = 0;
      state.driverAssigned = false;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // RIDE TRACKING
    // ====================
    
    startRideTracking: (state) => {
      state.rideTracking.isTracking = true;
      state.rideTracking.lastUpdate = Date.now();
      state.timestamps.lastUpdated = Date.now();
    },
    
    stopRideTracking: (state) => {
      state.rideTracking.isTracking = false;
      state.timestamps.lastUpdated = Date.now();
    },
    
    updateRideTracking: (state, action) => {
      const { location, distanceTraveled, timeElapsed, routePolyline } = action.payload;
      
      state.rideTracking.currentLocation = location;
      state.rideTracking.distanceTraveled = distanceTraveled;
      state.rideTracking.timeElapsed = timeElapsed;
      state.rideTracking.routePolyline = routePolyline;
      state.rideTracking.lastUpdate = Date.now();
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // RIDE HISTORY
    // ====================
    
    addToRideHistory: (state, action) => {
      const ride = {
        ...action.payload,
        addedAt: Date.now(),
      };
      
      state.rideHistory.unshift(ride);
      
      // Update stats
      if (ride.status === 'completed') {
        state.stats.completedRides += 1;
        state.stats.totalSpent += ride.fare || 0;
        state.session.sessionSpending += ride.fare || 0;
      } else if (ride.status === 'cancelled') {
        state.stats.cancelledRides += 1;
      }
      
      state.stats.totalRides += 1;
      
      // Keep only last 100 rides
      if (state.rideHistory.length > 100) {
        state.rideHistory.pop();
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    addToCancelledRides: (state, action) => {
      state.cancelledRides.unshift({
        ...action.payload,
        cancelledAt: Date.now(),
      });
      
      // Keep only last 50 cancelled rides
      if (state.cancelledRides.length > 50) {
        state.cancelledRides.pop();
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearRideHistory: (state) => {
      state.rideHistory = [];
      state.cancelledRides = [];
      state.historyPage = 1;
      state.hasMoreHistory = true;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // PAYMENT MANAGEMENT
    // ====================
    
    setPaymentMethod: (state, action) => {
      state.payment.method = action.payload.method;
      state.payment.cardLastFour = action.payload.cardLastFour;
      state.rideDetails.paymentMethod = action.payload.method;
      state.timestamps.lastUpdated = Date.now();
    },
    
    setPaymentStatus: (state, action) => {
      state.payment.paymentStatus = action.payload.status;
      state.payment.transactionId = action.payload.transactionId;
      state.payment.receiptUrl = action.payload.receiptUrl;
      state.payment.needPayment = action.payload.status !== 'completed';
      state.timestamps.lastUpdated = Date.now();
    },
    
    updateWalletBalance: (state, action) => {
      state.payment.walletBalance = action.payload;
      state.features.canUseWallet = action.payload > 0;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // RATINGS & REVIEWS
    // ====================
    
    setUserRating: (state, action) => {
      state.ratings.userRating = action.payload.rating;
      state.ratings.review = action.payload.review || '';
      state.timestamps.lastUpdated = Date.now();
    },
    
    setDriverRating: (state, action) => {
      state.ratings.driverRating = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    submitRating: (state) => {
      state.ratings.submitted = true;
      
      // Update stats
      if (state.ratings.userRating > 0) {
        const totalScore = state.stats.averageRating * (state.stats.totalRides || 1);
        const newAverage = (totalScore + state.ratings.userRating) / 
                          ((state.stats.totalRides || 1) + 1);
        state.stats.averageRating = parseFloat(newAverage.toFixed(1));
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearRating: (state) => {
      state.ratings = initialState.ratings;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // REAL-TIME UPDATES
    // ====================
    
    setRealTimeConnection: (state, action) => {
      state.realTimeUpdates.connectionStatus = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    addRealTimeUpdate: (state, action) => {
      const { type, data } = action.payload;
      state.realTimeUpdates[type] = {
        ...data,
        timestamp: Date.now(),
      };
      state.realTimeUpdates.lastUpdate = Date.now();
      state.timestamps.lastUpdated = Date.now();
    },
    
    addChatMessage: (state, action) => {
      state.realTimeUpdates.messages.push({
        ...action.payload,
        timestamp: Date.now(),
      });
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearChatMessages: (state) => {
      state.realTimeUpdates.messages = [];
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // PREFERENCES
    // ====================
    
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    addFavoriteDestination: (state, action) => {
      const destination = action.payload;
      
      // Check if already exists
      const exists = state.favoriteDestinations.find(
        d => d.name === destination.name && 
             d.address === destination.address
      );
      
      if (!exists) {
        state.favoriteDestinations.unshift(destination);
        
        // Keep only last 10 favorites
        if (state.favoriteDestinations.length > 10) {
          state.favoriteDestinations.pop();
        }
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    addRecentDestination: (state, action) => {
      const destination = action.payload;
      
      // Remove if already exists
      state.recentDestinations = state.recentDestinations.filter(
        d => !(d.name === destination.name && 
               d.address === destination.address)
      );
      
      state.recentDestinations.unshift(destination);
      
      // Keep only last 20 recent destinations
      if (state.recentDestinations.length > 20) {
        state.recentDestinations.pop();
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // SAFETY FEATURES
    // ====================
    
    toggleShareRide: (state) => {
      state.safety.shareRideEnabled = !state.safety.shareRideEnabled;
      state.timestamps.lastUpdated = Date.now();
    },
    
    activateSOS: (state) => {
      state.safety.sosActivated = true;
      state.safety.lastSOSTime = Date.now();
      state.timestamps.lastUpdated = Date.now();
    },
    
    deactivateSOS: (state) => {
      state.safety.sosActivated = false;
      state.timestamps.lastUpdated = Date.now();
    },
    
    updateEmergencyContacts: (state, action) => {
      state.safety.emergencyContacts = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // STATISTICS
    // ====================
    
    updateStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    updateRideStreak: (state, action) => {
      state.stats.rideStreak = action.payload;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // PROMOTIONS
    // ====================
    
    setPromoCode: (state, action) => {
      state.promotions.promoCode = action.payload.code;
      state.promotions.discountAmount = action.payload.discount || 0;
      state.promotions.activePromo = action.payload.activePromo;
      state.timestamps.lastUpdated = Date.now();
    },
    
    applyPromo: (state, action) => {
      const { promoCode, discount, valid } = action.payload;
      
      if (valid) {
        state.promotions.activePromo = promoCode;
        state.promotions.discountAmount = discount;
        state.rideDetails.estimatedFare = Math.max(
          0, 
          state.rideDetails.estimatedFare - discount
        );
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearPromo: (state) => {
      state.promotions.activePromo = null;
      state.promotions.promoCode = '';
      state.promotions.discountAmount = 0;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // FILTERS
    // ====================
    
    updateFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // RIDE QUEUE
    // ====================
    
    setRideQueue: (state, action) => {
      state.rideQueue = {
        ...state.rideQueue,
        ...action.payload,
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    updateQueuePosition: (state, action) => {
      state.rideQueue.position = action.payload.position;
      state.rideQueue.estimatedWaitTime = action.payload.waitTime;
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearRideQueue: (state) => {
      state.rideQueue = initialState.rideQueue;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // ERROR HANDLING
    // ====================
    
    setError: (state, action) => {
      const { key, error } = action.payload;
      if (state.errors[key] !== undefined) {
        state.errors[key] = error;
      }
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearError: (state, action) => {
      const key = action.payload;
      if (state.errors[key]) {
        state.errors[key] = null;
      }
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key] = null;
      });
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // SESSION MANAGEMENT
    // ====================
    
    startSession: (state) => {
      state.session.startTime = Date.now();
      state.session.activeRides = 0;
      state.session.sessionSpending = 0;
      state.timestamps.lastUpdated = Date.now();
    },
    
    updateSession: (state) => {
      if (state.session.startTime) {
        state.session.sessionDuration = Date.now() - state.session.startTime;
      }
      state.timestamps.lastUpdated = Date.now();
    },
    
    endSession: (state) => {
      state.session = initialState.session;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // FEATURE FLAGS
    // ====================
    
    updateFeatures: (state, action) => {
      state.features = {
        ...state.features,
        ...action.payload,
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // CACHE MANAGEMENT
    // ====================
    
    cacheFareEstimate: (state, action) => {
      const { key, estimate } = action.payload;
      state.cache.fareEstimates[key] = {
        estimate,
        timestamp: Date.now(),
      };
      state.timestamps.lastUpdated = Date.now();
    },
    
    addRecentSearch: (state, action) => {
      state.cache.recentSearches.unshift(action.payload);
      
      // Keep only last 20 searches
      if (state.cache.recentSearches.length > 20) {
        state.cache.recentSearches.pop();
      }
      
      state.timestamps.lastUpdated = Date.now();
    },
    
    clearCache: (state) => {
      state.cache = initialState.cache;
      state.timestamps.lastUpdated = Date.now();
    },
    
    // ====================
    // RESET & CLEANUP
    // ====================
    
    resetRideState: (state) => {
      return {
        ...initialState,
        rideHistory: state.rideHistory,
        cancelledRides: state.cancelledRides,
        favoriteDestinations: state.favoriteDestinations,
        recentDestinations: state.recentDestinations,
        stats: state.stats,
        preferences: state.preferences,
        safety: state.safety,
        promotions: state.promotions,
      };
    },
    
    completeRideReset: (state) => {
      return {
        ...initialState,
        rideHistory: state.rideHistory,
        cancelledRides: state.cancelledRides,
        favoriteDestinations: state.favoriteDestinations,
        recentDestinations: state.recentDestinations,
        stats: state.stats,
      };
    },
    
    // Batch update
    batchUpdateRide: (state, action) => {
      return {
        ...state,
        ...action.payload,
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      };
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Book ride
      .addCase(bookRide.pending, (state) => {
        state.loading.booking = true;
        state.errors.booking = null;
        state.timestamps.rideRequested = Date.now();
      })
      .addCase(bookRide.fulfilled, (state, action) => {
        state.loading.booking = false;
        state.currentRide = action.payload;
        state.searchingForDriver = true;
        state.features.canCancelRide = true;
        state.timestamps.lastUpdated = Date.now();
      })
      .addCase(bookRide.rejected, (state, action) => {
        state.loading.booking = false;
        state.errors.booking = action.payload;
        state.timestamps.lastUpdated = Date.now();
      })
      
      // Cancel ride
      .addCase(cancelRide.pending, (state) => {
        state.loading.canceling = true;
        state.errors.canceling = null;
      })
      .addCase(cancelRide.fulfilled, (state, action) => {
        state.loading.canceling = false;
        state.currentRide = null;
        state.searchingForDriver = false;
        state.driverAssigned = false;
        state.rideCancelled = true;
        state.features.canCancelRide = false;
        
        // Add to cancelled rides
        if (action.payload.rideId) {
          state.cancelledRides.unshift({
            rideId: action.payload.rideId,
            reason: action.payload.reason,
            cancelledAt: Date.now(),
          });
        }
        
        // Update stats
        state.stats.cancelledRides += 1;
        state.stats.totalRides += 1;
        
        state.timestamps.lastUpdated = Date.now();
      })
      .addCase(cancelRide.rejected, (state, action) => {
        state.loading.canceling = false;
        state.errors.canceling = action.payload;
        state.timestamps.lastUpdated = Date.now();
      })
      
      // Rate ride
      .addCase(rateRide.pending, (state) => {
        state.loading.rating = true;
        state.errors.rating = null;
      })
      .addCase(rateRide.fulfilled, (state, action) => {
        state.loading.rating = false;
        state.ratings.userRating = action.payload.rating;
        state.ratings.driverRating = action.payload.driverRating;
        state.ratings.review = action.payload.review;
        state.ratings.submitted = true;
        state.features.canRateRide = false;
        
        // Update stats
        if (action.payload.rating > 0) {
          const totalScore = state.stats.averageRating * (state.stats.totalRides || 1);
          const newAverage = (totalScore + action.payload.rating) / 
                            ((state.stats.totalRides || 1) + 1);
          state.stats.averageRating = parseFloat(newAverage.toFixed(1));
        }
        
        state.timestamps.lastUpdated = Date.now();
      })
      .addCase(rateRide.rejected, (state, action) => {
        state.loading.rating = false;
        state.errors.rating = action.payload;
        state.timestamps.lastUpdated = Date.now();
      })
      
      // Fetch ride history
      .addCase(fetchRideHistory.pending, (state) => {
        state.loading.fetchingHistory = true;
        state.errors.fetchingHistory = null;
      })
      .addCase(fetchRideHistory.fulfilled, (state, action) => {
        state.loading.fetchingHistory = false;
        
        if (action.payload.page === 1) {
          state.rideHistory = action.payload.history;
        } else {
          state.rideHistory = [...state.rideHistory, ...action.payload.history];
        }
        
        state.historyPage = action.payload.page;
        state.hasMoreHistory = action.payload.history.length > 0;
        state.timestamps.lastUpdated = Date.now();
      })
      .addCase(fetchRideHistory.rejected, (state, action) => {
        state.loading.fetchingHistory = false;
        state.errors.fetchingHistory = action.payload;
        state.timestamps.lastUpdated = Date.now();
      })
      
      // Fetch ride details
      .addCase(fetchRideDetails.pending, (state) => {
        state.loading.fetchingDetails = true;
        state.errors.fetchingDetails = null;
      })
      .addCase(fetchRideDetails.fulfilled, (state, action) => {
        state.loading.fetchingDetails = false;
        
        // Update current ride if it matches
        if (state.currentRide?.id === action.payload.id) {
          state.currentRide = action.payload;
        }
        
        // Update in history
        const historyIndex = state.rideHistory.findIndex(
          ride => ride.id === action.payload.id
        );
        if (historyIndex !== -1) {
          state.rideHistory[historyIndex] = action.payload;
        }
        
        state.timestamps.lastUpdated = Date.now();
      })
      .addCase(fetchRideDetails.rejected, (state, action) => {
        state.loading.fetchingDetails = false;
        state.errors.fetchingDetails = action.payload;
        state.timestamps.lastUpdated = Date.now();
      })
      
      // Get fare estimate
      .addCase(getFareEstimate.pending, (state) => {
        state.loading.estimatingFare = true;
        state.errors.estimatingFare = null;
      })
      .addCase(getFareEstimate.fulfilled, (state, action) => {
        state.loading.estimatingFare = false;
        state.rideDetails.estimatedFare = action.payload.amount;
        state.rideDetails.distance = action.payload.distance;
        state.rideDetails.duration = action.payload.duration;
        
        // Cache the estimate
        const cacheKey = `${state.rideDetails.pickup?.coordinates}-${state.rideDetails.destination?.coordinates}-${state.rideDetails.vehicleType}`;
        state.cache.fareEstimates[cacheKey] = {
          estimate: action.payload,
          timestamp: Date.now(),
        };
        
        state.timestamps.lastUpdated = Date.now();
      })
      .addCase(getFareEstimate.rejected, (state, action) => {
        state.loading.estimatingFare = false;
        state.errors.estimatingFare = action.payload;
        state.timestamps.lastUpdated = Date.now();
      });
  },
});

// ====================
// ACTION CREATORS
// ====================

export const {
  setRideDetails,
  clearRideDetails,
  setPickupLocation,
  setDestination,
  setVehicleType,
  setPaymentMethod,
  setCurrentRide,
  setRideStatus,
  setAssignedDriver,
  setDriverLocation,
  clearDriverInfo,
  startRideTracking,
  stopRideTracking,
  updateRideTracking,
  addToRideHistory,
  addToCancelledRides,
  clearRideHistory,
  setPaymentStatus,
  updateWalletBalance,
  setUserRating,
  setDriverRating,
  submitRating,
  clearRating,
  setRealTimeConnection,
  addRealTimeUpdate,
  addChatMessage,
  clearChatMessages,
  updatePreferences,
  addFavoriteDestination,
  addRecentDestination,
  toggleShareRide,
  activateSOS,
  deactivateSOS,
  updateEmergencyContacts,
  updateStats,
  updateRideStreak,
  setPromoCode,
  applyPromo,
  clearPromo,
  updateFilters,
  setRideQueue,
  updateQueuePosition,
  clearRideQueue,
  setError,
  clearError,
  clearAllErrors,
  startSession,
  updateSession,
  endSession,
  updateFeatures,
  cacheFareEstimate,
  addRecentSearch,
  clearCache,
  resetRideState,
  completeRideReset,
  batchUpdateRide,
} = rideSlice.actions;

// ====================
// SELECTORS
// ====================

export const selectRide = (state) => state.ride;
export const selectCurrentRide = (state) => state.ride.currentRide;
export const selectRideDetails = (state) => state.ride.rideDetails;
export const selectRideStatus = (state) => state.ride.currentRide?.status;
export const selectIsSearchingForDriver = (state) => state.ride.searchingForDriver;
export const selectIsDriverAssigned = (state) => state.ride.driverAssigned;
export const selectIsRideStarted = (state) => state.ride.rideStarted;
export const selectIsRideCompleted = (state) => state.ride.rideCompleted;
export const selectIsRideCancelled = (state) => state.ride.rideCancelled;
export const selectAssignedDriver = (state) => state.ride.assignedDriver;
export const selectDriverLocation = (state) => state.ride.driverLocation;
export const selectDriverDistance = (state) => state.ride.driverDistance;
export const selectDriverETA = (state) => state.ride.driverETA;
export const selectRideTracking = (state) => state.ride.rideTracking;
export const selectRideHistory = (state) => state.ride.rideHistory;
export const selectCancelledRides = (state) => state.ride.cancelledRides;
export const selectFavoriteDestinations = (state) => state.ride.favoriteDestinations;
export const selectRecentDestinations = (state) => state.ride.recentDestinations;
export const selectPayment = (state) => state.ride.payment;
export const selectRatings = (state) => state.ride.ratings;
export const selectRealTimeUpdates = (state) => state.ride.realTimeUpdates;
export const selectPreferences = (state) => state.ride.preferences;
export const selectSafety = (state) => state.ride.safety;
export const selectStats = (state) => state.ride.stats;
export const selectPromotions = (state) => state.ride.promotions;
export const selectLoading = (state) => state.ride.loading;
export const selectErrors = (state) => state.ride.errors;
export const selectFilters = (state) => state.ride.filters;
export const selectRideQueue = (state) => state.ride.rideQueue;
export const selectTimestamps = (state) => state.ride.timestamps;
export const selectSession = (state) => state.ride.session;
export const selectFeatures = (state) => state.ride.features;
export const selectCache = (state) => state.ride.cache;

// Derived Selectors
export const selectHasActiveRide = (state) => !!state.ride.currentRide;
export const selectCanCancelRide = (state) => state.ride.features.canCancelRide;
export const selectCanRateRide = (state) => state.ride.features.canRateRide;
export const selectEstimatedFare = (state) => state.ride.rideDetails.estimatedFare;
export const selectActualFare = (state) => state.ride.rideDetails.actualFare;
export const selectPickupLocation = (state) => state.ride.rideDetails.pickup;
export const selectDestination = (state) => state.ride.rideDetails.destination;
export const selectRideDistance = (state) => state.ride.rideDetails.distance;
export const selectRideDuration = (state) => state.ride.rideDetails.duration;
export const selectVehicleType = (state) => state.ride.rideDetails.vehicleType;
export const selectPaymentMethod = (state) => state.ride.rideDetails.paymentMethod;
export const selectTotalRides = (state) => state.ride.stats.totalRides;
export const selectCompletedRidesCount = (state) => state.ride.stats.completedRides;
export const selectCancelledRidesCount = (state) => state.ride.stats.cancelledRides;
export const selectTotalSpent = (state) => state.ride.stats.totalSpent;
export const selectAverageRating = (state) => state.ride.stats.averageRating;
export const selectRideStreak = (state) => state.ride.stats.rideStreak;

// Complex Selectors
export const selectRideDashboard = (state) => ({
  hasActiveRide: !!state.ride.currentRide,
  currentRideStatus: state.ride.currentRide?.status,
  driverAssigned: state.ride.driverAssigned,
  driverETA: state.ride.driverETA,
  estimatedFare: state.ride.rideDetails.estimatedFare,
  totalRides: state.ride.stats.totalRides,
  completedRides: state.ride.stats.completedRides,
  averageRating: state.ride.stats.averageRating,
  totalSpent: state.ride.stats.totalSpent,
  rideStreak: state.ride.stats.rideStreak,
  walletBalance: state.ride.payment.walletBalance,
  activePromo: state.ride.promotions.activePromo,
});

export const selectRideProgress = (state) => {
  if (!state.ride.currentRide) return null;
  
  const ride = state.ride.currentRide;
  const stages = [
    { id: 'requested', label: 'Requested', completed: true },
    { id: 'searching', label: 'Searching', completed: ride.status !== 'searching' },
    { id: 'accepted', label: 'Driver Found', completed: ['accepted', 'arriving', 'arrived', 'started', 'completed'].includes(ride.status) },
    { id: 'arrived', label: 'Driver Arrived', completed: ['arrived', 'started', 'completed'].includes(ride.status) },
    { id: 'started', label: 'Ride Started', completed: ['started', 'completed'].includes(ride.status) },
    { id: 'completed', label: 'Completed', completed: ride.status === 'completed' },
  ];
  
  const currentStageIndex = stages.findIndex(stage => 
    stage.id === ride.status || 
    (ride.status === 'arriving' && stage.id === 'accepted')
  );
  
  return {
    stages,
    currentStage: currentStageIndex >= 0 ? stages[currentStageIndex] : stages[0],
    progress: ((currentStageIndex + 1) / stages.length) * 100,
    driverETA: state.ride.driverETA,
    driverDistance: state.ride.driverDistance,
  };
};

export const selectRideSummary = (rideId) => (state) => {
  const ride = state.ride.rideHistory.find(r => r.id === rideId) ||
               state.ride.cancelledRides.find(r => r.id === rideId);
  
  if (!ride) return null;
  
  return {
    ...ride,
    formattedFare: ride.fare ? `MWK ${ride.fare.toLocaleString()}` : 'N/A',
    formattedDistance: ride.distance ? `${ride.distance.toFixed(1)} km` : 'N/A',
    formattedDuration: ride.duration ? `${Math.floor(ride.duration / 60)} min` : 'N/A',
    date: new Date(ride.createdAt || ride.completedAt).toLocaleDateString(),
    time: new Date(ride.createdAt || ride.completedAt).toLocaleTimeString(),
  };
};

// ====================
// THUNKS FOR COMPLEX OPERATIONS
// ====================

// Initialize ride with real-time updates
export const initializeRide = (rideData) => async (dispatch, getState) => {
  const { auth } = getState();
  const userId = auth.user?.id;
  
  try {
    // Set initial ride details
    dispatch(setRideDetails(rideData));
    
    // Start session tracking
    dispatch(startSession());
    
    // Initialize real-time connection
    realTimeService.initialize(userId, 'rider');
    
    // Subscribe to ride updates
    realTimeService.on('driver_assigned', (driver) => {
      dispatch(setAssignedDriver(driver));
      dispatch(setRideStatus({ 
        status: 'accepted', 
        data: { driverId: driver.id } 
      }));
    });
    
    realTimeService.on('driver_location_update', (update) => {
      dispatch(setDriverLocation(update));
    });
    
    realTimeService.on('ride_status_update', (update) => {
      dispatch(setRideStatus(update));
    });
    
    realTimeService.on('chat_message', (message) => {
      dispatch(addChatMessage(message));
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize ride:', error);
    dispatch(setError({ 
      key: 'booking', 
      error: 'Failed to initialize ride' 
    }));
    throw error;
  }
};

// Complete ride with payment processing
export const completeRideWithPayment = (rideId, paymentData) => async (dispatch, getState) => {
  const { auth, ride } = getState();
  const userId = auth.user?.id;
  
  try {
    if (!ride.currentRide || ride.currentRide.id !== rideId) {
      throw new Error('No active ride found');
    }
    
    // Process payment
    let paymentResult;
    if (paymentData.method === 'wallet' && ride.payment.walletBalance >= ride.currentRide.fare) {
      // Deduct from wallet
      paymentResult = await PaymentService.processWalletPayment(
        userId,
        ride.currentRide.fare,
        rideId
      );
      
      dispatch(updateWalletBalance(ride.payment.walletBalance - ride.currentRide.fare));
    } else {
      // Process card/cash payment
      paymentResult = await PaymentService.processPayment(
        userId,
        ride.currentRide.fare,
        paymentData,
        rideId
      );
    }
    
    // Update payment status
    dispatch(setPaymentStatus({
      status: paymentResult.status,
      transactionId: paymentResult.transactionId,
      receiptUrl: paymentResult.receiptUrl,
    }));
    
    // Update ride status to completed
    dispatch(setRideStatus({
      status: 'completed',
      data: {
        paymentStatus: paymentResult.status,
        transactionId: paymentResult.transactionId,
        completedAt: Date.now(),
      },
    }));
    
    // Add to ride history
    dispatch(addToRideHistory({
      ...ride.currentRide,
      paymentStatus: paymentResult.status,
      transactionId: paymentResult.transactionId,
      completedAt: Date.now(),
    }));
    
    // Update stats
    dispatch(updateStats({
      completedRides: ride.stats.completedRides + 1,
      totalSpent: ride.stats.totalSpent + ride.currentRide.fare,
    }));
    
    // Update session
    dispatch(updateSession());
    
    // Stop tracking
    dispatch(stopRideTracking());
    
    // Clear current ride after delay
    setTimeout(() => {
      dispatch(setCurrentRide(null));
    }, 5000);
    
    return { success: true, ...paymentResult };
  } catch (error) {
    console.error('Failed to complete ride with payment:', error);
    dispatch(setError({ 
      key: 'payment', 
      error: 'Payment processing failed' 
    }));
    throw error;
  }
};

// Share ride with contacts
export const shareRideDetails = (contacts) => async (dispatch, getState) => {
  const { ride } = getState();
  
  try {
    if (!ride.currentRide) {
      throw new Error('No active ride to share');
    }
    
    const shareData = {
      rideId: ride.currentRide.id,
      pickup: ride.rideDetails.pickup?.address,
      destination: ride.rideDetails.destination?.address,
      driver: ride.assignedDriver?.name,
      vehicle: ride.assignedDriver?.vehicle,
      plate: ride.assignedDriver?.plateNumber,
      eta: ride.driverETA,
      trackingUrl: `https://kabaza.app/track/${ride.currentRide.id}`,
    };
    
    // Here you would integrate with your sharing service
    // For example: SMS, WhatsApp, Email, etc.
    
    return { success: true, shareData };
  } catch (error) {
    console.error('Failed to share ride details:', error);
    dispatch(setError({ 
      key: 'safety', 
      error: 'Failed to share ride' 
    }));
    throw error;
  }
};

// Schedule a future ride
export const scheduleRide = (rideData, scheduleTime) => async (dispatch, getState) => {
  const { auth } = getState();
  const userId = auth.user?.id;
  
  try {
    // Validate schedule time (must be at least 15 minutes in future)
    const minTime = Date.now() + (15 * 60 * 1000);
    if (scheduleTime < minTime) {
      throw new Error('Schedule time must be at least 15 minutes from now');
    }
    
    const scheduledRide = {
      ...rideData,
      userId,
      scheduledFor: scheduleTime,
      status: 'scheduled',
      createdAt: Date.now(),
    };
    
    // Call schedule ride service
    const result = await RideService.scheduleRide(scheduledRide);
    
    // Add to ride history as scheduled
    dispatch(addToRideHistory({
      ...result,
      isScheduled: true,
    }));
    
    // Set reminder notification
    // You would integrate with your notification service here
    
    return { success: true, ...result };
  } catch (error) {
    console.error('Failed to schedule ride:', error);
    dispatch(setError({ 
      key: 'booking', 
      error: 'Failed to schedule ride' 
    }));
    throw error;
  }
};

export default rideSlice.reducer;