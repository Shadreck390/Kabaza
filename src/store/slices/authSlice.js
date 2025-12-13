// src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  // Authentication State
  user: null,
  token: null,
  refreshToken: null,
  role: null, // 'rider', 'driver', 'admin'
  isAuthenticated: false,
  isVerified: false,
  isProfileComplete: false,
  
  // Loading & Error States
  loading: false,
  error: null,
  lastError: null,
  
  // Session Management
  session: {
    startedAt: null,
    expiresAt: null,
    lastActivity: null,
    deviceId: null,
    sessionId: null,
  },
  
  // Real-time Presence
  socketConnected: false,
  lastOnline: null,
  presenceStatus: 'offline', // 'online', 'away', 'offline', 'busy'
  driverStatus: 'offline', // 'offline', 'online', 'available', 'unavailable', 'on_trip', 'on_break'
  
  // User Profile Data
  profile: {
    personalInfo: null,
    preferences: null,
    settings: null,
    documents: null,
    stats: null,
  },
  
  // Permissions & Settings
  permissions: {
    location: false,
    notifications: false,
    camera: false,
    contacts: false,
    backgroundLocation: false,
  },
  
  // Wallet & Payment
  wallet: {
    balance: 0,
    currency: 'MWK',
    transactions: [],
    lastUpdated: null,
  },
  
  // Driver Specific (if applicable)
  driverInfo: {
    vehicle: null,
    license: null,
    documents: [],
    verificationStatus: 'pending', // 'pending', 'verified', 'rejected', 'expired'
    ratings: {
      average: 0,
      total: 0,
      breakdown: {},
    },
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
    },
    stats: {
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      acceptanceRate: 0,
      cancellationRate: 0,
      totalDistance: 0,
      totalHours: 0,
    },
    currentRide: null,
    rideQueue: [],
  },
  
  // Rider Specific (if applicable)
  riderInfo: {
    favoriteLocations: [],
    recentRides: [],
    paymentMethods: [],
    preferences: {
      vehicleType: 'motorcycle',
      autoConfirmPickup: false,
      shareETA: true,
    },
    ratingsGiven: [],
  },
  
  // App State
  appState: 'active', // 'active', 'background', 'inactive'
  networkStatus: 'unknown', // 'unknown', 'connected', 'disconnected'
  
  // Security
  security: {
    lastPasswordChange: null,
    twoFactorEnabled: false,
    biometricEnabled: false,
    trustedDevices: [],
  },
  
  // Cache & Timestamps
  lastUpdated: {
    profile: null,
    wallet: null,
    documents: null,
    preferences: null,
  },
  
  // Feature Flags
  features: {
    canRequestRide: false,
    canAcceptRides: false,
    canUseWallet: false,
    canRateRides: false,
    canChat: false,
  },
  
  // Meta Data
  meta: {
    signupMethod: null, // 'phone', 'email', 'google', 'facebook'
    signupDate: null,
    lastLogin: null,
    loginCount: 0,
  },
};

// Async Thunks for API calls
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ phone, password, userType }, { rejectWithValue }) => {
    try {
      // API call would go here
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, userType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phone, otp }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { refreshToken } = getState().auth;
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ====================
    // AUTHENTICATION
    // ====================
    
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    // Login success
    loginSuccess: (state, action) => {
      const { user, token, refreshToken, role } = action.payload;
      
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.role = role;
      state.isAuthenticated = true;
      state.isVerified = user.isVerified || false;
      state.isProfileComplete = user.isProfileComplete || false;
      state.loading = false;
      state.error = null;
      state.lastError = null;
      
      // Update session
      state.session.startedAt = Date.now();
      state.session.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
      state.session.lastActivity = Date.now();
      state.session.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update meta
      state.meta.lastLogin = new Date().toISOString();
      state.meta.loginCount += 1;
      
      // Set features based on role
      state.features = {
        canRequestRide: role === 'rider',
        canAcceptRides: role === 'driver',
        canUseWallet: true,
        canRateRides: true,
        canChat: true,
      };
      
      // Set user-specific data
      if (role === 'driver') {
        state.driverInfo = {
          ...state.driverInfo,
          verificationStatus: user.verificationStatus || 'pending',
          ratings: user.ratings || { average: 0, total: 0, breakdown: {} },
        };
      } else if (role === 'rider') {
        state.riderInfo = {
          ...state.riderInfo,
          preferences: user.preferences || state.riderInfo.preferences,
        };
      }
    },
    
    // Login failure
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.lastError = {
        message: action.payload,
        timestamp: Date.now(),
        type: 'login',
      };
      state.isAuthenticated = false;
    },
    
    // Logout
    logout: (state) => {
      // Preserve some data for analytics
      const preservedData = {
        meta: state.meta,
        session: {
          deviceId: state.session.deviceId,
        },
      };
      
      // Reset to initial state but preserve some data
      return {
        ...initialState,
        meta: preservedData.meta,
        session: {
          ...initialState.session,
          deviceId: preservedData.session.deviceId,
        },
      };
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // ====================
    // USER PROFILE
    // ====================
    
    // Update user profile
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      state.lastUpdated.profile = Date.now();
      
      // Check if profile is complete
      if (action.payload.firstName && action.payload.lastName && action.payload.phone) {
        state.isProfileComplete = true;
      }
    },
    
    // Update profile picture
    updateProfilePicture: (state, action) => {
      if (state.user) {
        state.user.profilePicture = action.payload;
      }
      state.lastUpdated.profile = Date.now();
    },
    
    // ====================
    // ROLE & PERMISSIONS
    // ====================
    
    // Set role
    setRole: (state, action) => {
      state.role = action.payload;
      
      // Update features based on new role
      state.features = {
        canRequestRide: action.payload === 'rider',
        canAcceptRides: action.payload === 'driver',
        canUseWallet: true,
        canRateRides: true,
        canChat: true,
      };
    },
    
    // Update permissions
    updatePermissions: (state, action) => {
      state.permissions = {
        ...state.permissions,
        ...action.payload,
      };
    },
    
    // ====================
    // REAL-TIME & SOCKET
    // ====================
    
    // Set socket connection status
    setSocketConnected: (state, action) => {
      state.socketConnected = action.payload;
      state.lastOnline = action.payload ? Date.now() : state.lastOnline;
    },
    
    // Update presence status
    updatePresence: (state, action) => {
      state.presenceStatus = action.payload.status;
      state.lastOnline = Date.now();
      
      if (action.payload.driverStatus) {
        state.driverStatus = action.payload.driverStatus;
      }
    },
    
    // Update driver status
    updateDriverStatus: (state, action) => {
      state.driverStatus = action.payload;
      state.lastUpdated.profile = Date.now();
    },
    
    // ====================
    // DRIVER SPECIFIC
    // ====================
    
    // Update driver info
    updateDriverInfo: (state, action) => {
      state.driverInfo = {
        ...state.driverInfo,
        ...action.payload,
      };
      state.lastUpdated.profile = Date.now();
    },
    
    // Update vehicle info
    updateVehicleInfo: (state, action) => {
      state.driverInfo.vehicle = {
        ...state.driverInfo.vehicle,
        ...action.payload,
      };
    },
    
    // Update driver verification
    updateVerificationStatus: (state, action) => {
      state.driverInfo.verificationStatus = action.payload;
      state.isVerified = action.payload === 'verified';
    },
    
    // Update driver earnings
    updateDriverEarnings: (state, action) => {
      state.driverInfo.earnings = {
        ...state.driverInfo.earnings,
        ...action.payload,
      };
      state.lastUpdated.wallet = Date.now();
    },
    
    // Update driver stats
    updateDriverStats: (state, action) => {
      state.driverInfo.stats = {
        ...state.driverInfo.stats,
        ...action.payload,
      };
    },
    
    // Set current ride
    setCurrentRide: (state, action) => {
      state.driverInfo.currentRide = action.payload;
      state.driverStatus = action.payload ? 'on_trip' : 'available';
    },
    
    // Add to ride queue
    addToRideQueue: (state, action) => {
      state.driverInfo.rideQueue.push(action.payload);
    },
    
    // Remove from ride queue
    removeFromRideQueue: (state, action) => {
      state.driverInfo.rideQueue = state.driverInfo.rideQueue.filter(
        ride => ride.id !== action.payload
      );
    },
    
    // ====================
    // RIDER SPECIFIC
    // ====================
    
    // Update rider info
    updateRiderInfo: (state, action) => {
      state.riderInfo = {
        ...state.riderInfo,
        ...action.payload,
      };
    },
    
    // Add favorite location
    addFavoriteLocation: (state, action) => {
      // Remove if already exists
      state.riderInfo.favoriteLocations = state.riderInfo.favoriteLocations.filter(
        loc => loc.id !== action.payload.id
      );
      // Add to beginning
      state.riderInfo.favoriteLocations.unshift(action.payload);
      // Keep only last 10
      if (state.riderInfo.favoriteLocations.length > 10) {
        state.riderInfo.favoriteLocations = state.riderInfo.favoriteLocations.slice(0, 10);
      }
    },
    
    // Add recent ride
    addRecentRide: (state, action) => {
      state.riderInfo.recentRides.unshift(action.payload);
      // Keep only last 20
      if (state.riderInfo.recentRides.length > 20) {
        state.riderInfo.recentRides = state.riderInfo.recentRides.slice(0, 20);
      }
    },
    
    // Update rider preferences
    updateRiderPreferences: (state, action) => {
      state.riderInfo.preferences = {
        ...state.riderInfo.preferences,
        ...action.payload,
      };
    },
    
    // ====================
    // WALLET & PAYMENTS
    // ====================
    
    // Update wallet balance
    updateWalletBalance: (state, action) => {
      state.wallet.balance = action.payload;
      state.wallet.lastUpdated = Date.now();
    },
    
    // Add wallet transaction
    addWalletTransaction: (state, action) => {
      const transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      
      state.wallet.transactions.unshift(transaction);
      // Keep only last 50 transactions
      if (state.wallet.transactions.length > 50) {
        state.wallet.transactions = state.wallet.transactions.slice(0, 50);
      }
      
      // Update balance if amount provided
      if (action.payload.amount) {
        if (action.payload.type === 'credit') {
          state.wallet.balance += action.payload.amount;
        } else if (action.payload.type === 'debit') {
          state.wallet.balance -= action.payload.amount;
        }
      }
    },
    
    // ====================
    // SESSION MANAGEMENT
    // ====================
    
    // Update session activity
    updateSessionActivity: (state) => {
      state.session.lastActivity = Date.now();
    },
    
    // Set device ID
    setDeviceId: (state, action) => {
      state.session.deviceId = action.payload;
    },
    
    // Extend session
    extendSession: (state, action) => {
      const extension = action.payload || (24 * 60 * 60 * 1000); // Default 24 hours
      state.session.expiresAt = Date.now() + extension;
    },
    
    // ====================
    // APP STATE
    // ====================
    
    // Update app state
    updateAppState: (state, action) => {
      state.appState = action.payload;
      
      // Update presence based on app state
      if (action.payload === 'background') {
        state.presenceStatus = 'away';
      } else if (action.payload === 'active') {
        state.presenceStatus = 'online';
        state.session.lastActivity = Date.now();
      }
    },
    
    // Update network status
    updateNetworkStatus: (state, action) => {
      state.networkStatus = action.payload;
      
      // Update socket connection if network lost
      if (action.payload === 'disconnected') {
        state.socketConnected = false;
      }
    },
    
    // ====================
    // SECURITY
    // ====================
    
    // Update security settings
    updateSecuritySettings: (state, action) => {
      state.security = {
        ...state.security,
        ...action.payload,
      };
    },
    
    // Add trusted device
    addTrustedDevice: (state, action) => {
      state.security.trustedDevices.push({
        ...action.payload,
        addedAt: new Date().toISOString(),
      });
    },
    
    // ====================
    // FEATURE FLAGS
    // ====================
    
    // Update feature flags
    updateFeatureFlags: (state, action) => {
      state.features = {
        ...state.features,
        ...action.payload,
      };
    },
    
    // ====================
    // TOKEN MANAGEMENT
    // ====================
    
    // Update tokens
    updateTokens: (state, action) => {
      const { token, refreshToken } = action.payload;
      if (token) state.token = token;
      if (refreshToken) state.refreshToken = refreshToken;
      state.session.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // Extend 7 days
    },
    
    // ====================
    // META DATA
    // ====================
    
    // Update meta data
    updateMetaData: (state, action) => {
      state.meta = {
        ...state.meta,
        ...action.payload,
      };
    },
    
    // ====================
    // BATCH UPDATES
    // ====================
    
    // Batch update auth state
    batchUpdateAuth: (state, action) => {
      return {
        ...state,
        ...action.payload,
      };
    },
    
    // Reset auth state (for testing/debugging)
    resetAuthState: () => {
      return initialState;
    },
  },
  
  // Handle async thunks
  extraReducers: (builder) => {
    builder
      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { user, token, refreshToken, role } = action.payload;
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken;
        state.role = role;
        state.isAuthenticated = true;
        state.isVerified = user.isVerified || false;
        state.isProfileComplete = user.isProfileComplete || false;
        state.loading = false;
        state.error = null;
        
        // Update session
        state.session.startedAt = Date.now();
        state.session.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
        state.session.lastActivity = Date.now();
        state.session.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Update meta
        state.meta.lastLogin = new Date().toISOString();
        state.meta.loginCount += 1;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.lastError = {
          message: action.payload,
          timestamp: Date.now(),
          type: 'login',
        };
      })
      
      // verifyOTP
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        const { user, token, refreshToken, role } = action.payload;
        state.user = user;
        state.token = token;
        state.refreshToken = refreshToken;
        state.role = role;
        state.isAuthenticated = true;
        state.isVerified = user.isVerified || false;
        state.isProfileComplete = user.isProfileComplete || false;
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.lastError = {
          message: action.payload,
          timestamp: Date.now(),
          type: 'otp_verification',
        };
      })
      
      // refreshToken
      .addCase(refreshToken.fulfilled, (state, action) => {
        const { token, refreshToken } = action.payload;
        state.token = token;
        state.refreshToken = refreshToken;
        state.session.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
      })
      
      // updateProfile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload.user };
        state.isProfileComplete = action.payload.user.isProfileComplete || false;
        state.loading = false;
        state.lastUpdated.profile = Date.now();
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.lastError = {
          message: action.payload,
          timestamp: Date.now(),
          type: 'profile_update',
        };
      });
  },
});

// Action Creators
export const {
  setLoading,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateProfilePicture,
  setRole,
  clearError,
  updatePermissions,
  setSocketConnected,
  updatePresence,
  updateDriverStatus,
  updateDriverInfo,
  updateVehicleInfo,
  updateVerificationStatus,
  updateDriverEarnings,
  updateDriverStats,
  setCurrentRide,
  addToRideQueue,
  removeFromRideQueue,
  updateRiderInfo,
  addFavoriteLocation,
  addRecentRide,
  updateRiderPreferences,
  updateWalletBalance,
  addWalletTransaction,
  updateSessionActivity,
  setDeviceId,
  extendSession,
  updateAppState,
  updateNetworkStatus,
  updateSecuritySettings,
  addTrustedDevice,
  updateFeatureFlags,
  updateTokens,
  updateMetaData,
  batchUpdateAuth,
  resetAuthState,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectRefreshToken = (state) => state.auth.refreshToken;
export const selectRole = (state) => state.auth.role;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsVerified = (state) => state.auth.isVerified;
export const selectIsProfileComplete = (state) => state.auth.isProfileComplete;
export const selectLoading = (state) => state.auth.loading;
export const selectError = (state) => state.auth.error;
export const selectSocketConnected = (state) => state.auth.socketConnected;
export const selectPresenceStatus = (state) => state.auth.presenceStatus;
export const selectDriverStatus = (state) => state.auth.driverStatus;
export const selectPermissions = (state) => state.auth.permissions;
export const selectWallet = (state) => state.auth.wallet;
export const selectDriverInfo = (state) => state.auth.driverInfo;
export const selectRiderInfo = (state) => state.auth.riderInfo;
export const selectSession = (state) => state.auth.session;
export const selectFeatures = (state) => state.auth.features;
export const selectAppState = (state) => state.auth.appState;
export const selectNetworkStatus = (state) => state.auth.networkStatus;

// Derived Selectors
export const selectIsDriver = (state) => state.auth.role === 'driver';
export const selectIsRider = (state) => state.auth.role === 'rider';
export const selectIsAdmin = (state) => state.auth.role === 'admin';
export const selectIsDriverAvailable = (state) => 
  state.auth.role === 'driver' && state.auth.driverStatus === 'available';
export const selectIsDriverOnTrip = (state) =>
  state.auth.role === 'driver' && state.auth.driverStatus === 'on_trip';
export const selectCanRequestRide = (state) =>
  state.auth.role === 'rider' && 
  state.auth.isAuthenticated && 
  state.auth.isProfileComplete;
export const selectCanAcceptRides = (state) =>
  state.auth.role === 'driver' && 
  state.auth.isAuthenticated && 
  state.auth.isVerified && 
  state.auth.driverStatus === 'available';
export const selectWalletBalance = (state) => state.auth.wallet.balance;
export const selectDriverVerificationStatus = (state) => 
  state.auth.driverInfo?.verificationStatus || 'pending';
export const selectDriverRatings = (state) => 
  state.auth.driverInfo?.ratings || { average: 0, total: 0, breakdown: {} };
export const selectDriverEarnings = (state) => 
  state.auth.driverInfo?.earnings || { today: 0, week: 0, month: 0, total: 0 };
export const selectSessionExpired = (state) => {
  if (!state.auth.session.expiresAt) return false;
  return Date.now() > state.auth.session.expiresAt;
};
export const selectIsSessionActive = (state) => {
  if (!state.auth.session.lastActivity) return false;
  return Date.now() - state.auth.session.lastActivity < (30 * 60 * 1000); // 30 minutes
};

// Complex Selectors
export const selectAuthSummary = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  role: state.auth.role,
  isVerified: state.auth.isVerified,
  isProfileComplete: state.auth.isProfileComplete,
  socketConnected: state.auth.socketConnected,
  presenceStatus: state.auth.presenceStatus,
  driverStatus: state.auth.driverStatus,
  walletBalance: state.auth.wallet.balance,
  permissions: state.auth.permissions,
  features: state.auth.features,
});

export const selectDriverDashboard = (state) => ({
  isAvailable: state.auth.driverStatus === 'available',
  isOnTrip: state.auth.driverStatus === 'on_trip',
  currentRide: state.auth.driverInfo.currentRide,
  rideQueue: state.auth.driverInfo.rideQueue,
  earnings: state.auth.driverInfo.earnings,
  stats: state.auth.driverInfo.stats,
  ratings: state.auth.driverInfo.ratings,
  verificationStatus: state.auth.driverInfo.verificationStatus,
});

export const selectRiderDashboard = (state) => ({
  favoriteLocations: state.auth.riderInfo.favoriteLocations,
  recentRides: state.auth.riderInfo.recentRides,
  preferences: state.auth.riderInfo.preferences,
  paymentMethods: state.auth.riderInfo.paymentMethods,
  walletBalance: state.auth.wallet.balance,
});

export default authSlice.reducer;