// src/hooks/useRedux.js
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useCallback, useMemo } from 'react';

// ====================
// CORE HOOKS
// ====================

/**
 * Custom hook to access Redux store directly
 */
export const useReduxStore = () => {
  return useStore();
};

/**
 * Custom hook for dispatch with logging in development
 */
export const useAppDispatch = () => {
  const dispatch = useDispatch();
  
  const dispatchWithLog = useCallback((action) => {
    if (__DEV__) {
      console.log('📤 Redux Dispatch:', {
        type: action.type,
        payload: action.payload,
        timestamp: new Date().toISOString(),
      });
    }
    return dispatch(action);
  }, [dispatch]);
  
  return dispatchWithLog;
};

// ====================
// AUTH HOOKS (Enhanced for Real-time)
// ====================

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useSelector((state) => state.auth);
  
  const derivedState = useMemo(() => ({
    // Basic auth state
    ...auth,
    
    // User role checks
    isDriver: auth.user?.role === 'driver',
    isRider: auth.user?.role === 'rider',
    isAuthenticated: !!auth.token && !!auth.user,
    isProfileComplete: auth.user?.isProfileComplete || false,
    isVerified: auth.user?.isVerified || false,
    
    // Real-time connection status
    isSocketConnected: auth.socketConnected || false,
    lastActive: auth.lastActive || null,
    
    // Driver-specific
    isDriverOnline: auth.user?.role === 'driver' && auth.driverStatus === 'online',
    isDriverAvailable: auth.user?.role === 'driver' && auth.driverStatus === 'available',
    isDriverOnTrip: auth.user?.role === 'driver' && auth.driverStatus === 'on_trip',
    
    // User preferences
    hasLocationPermission: auth.permissions?.location || false,
    hasNotificationPermission: auth.permissions?.notifications || false,
    
    // Helper functions
    isCurrentUser: (userId) => auth.user?.id === userId,
    hasPermission: (permission) => auth.permissions?.[permission] || false,
    
    // Real-time presence
    isUserOnline: auth.user?.presence === 'online',
    lastSeen: auth.user?.lastSeen || null,
  }), [auth]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useAuthActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Login/Logout
    login: (userData, token) => dispatch({
      type: 'AUTH_LOGIN_SUCCESS',
      payload: { user: userData, token }
    }),
    logout: () => dispatch({ type: 'AUTH_LOGOUT' }),
    
    // Token management
    updateToken: (token) => dispatch({
      type: 'AUTH_UPDATE_TOKEN',
      payload: { token }
    }),
    refreshToken: (newToken) => dispatch({
      type: 'AUTH_REFRESH_TOKEN',
      payload: { token: newToken }
    }),
    
    // User profile
    updateProfile: (profileUpdates) => dispatch({
      type: 'AUTH_UPDATE_PROFILE',
      payload: profileUpdates
    }),
    updateAvatar: (avatarUrl) => dispatch({
      type: 'AUTH_UPDATE_AVATAR',
      payload: { avatar: avatarUrl }
    }),
    
    // Real-time presence
    setOnline: () => dispatch({ type: 'AUTH_SET_ONLINE' }),
    setOffline: () => dispatch({ type: 'AUTH_SET_OFFLINE' }),
    updateLastActive: () => dispatch({
      type: 'AUTH_UPDATE_LAST_ACTIVE',
      payload: { lastActive: new Date().toISOString() }
    }),
    
    // Socket connection
    setSocketConnected: (isConnected) => dispatch({
      type: 'AUTH_SET_SOCKET_CONNECTED',
      payload: { connected: isConnected }
    }),
    
    // Driver status
    setDriverStatus: (status) => dispatch({
      type: 'AUTH_SET_DRIVER_STATUS',
      payload: { status }
    }),
    
    // Permissions
    updatePermissions: (permissions) => dispatch({
      type: 'AUTH_UPDATE_PERMISSIONS',
      payload: permissions
    }),
  }), [dispatch]);
};

// ====================
// APP HOOKS (Enhanced for Real-time)
// ====================

export const useApp = () => {
  const dispatch = useAppDispatch();
  const app = useSelector((state) => state.app);
  
  const derivedState = useMemo(() => ({
    ...app,
    
    // Connection state
    isOnline: app.networkStatus === 'connected',
    isOffline: app.networkStatus === 'disconnected',
    isConnecting: app.networkStatus === 'connecting',
    
    // Real-time features
    realTimeEnabled: app.features?.realTime || false,
    locationTracking: app.features?.locationTracking || false,
    backgroundUpdates: app.features?.backgroundUpdates || false,
    
    // App state
    isForeground: app.appState === 'active',
    isBackground: app.appState === 'background',
    isInactive: app.appState === 'inactive',
    
    // Loading states
    isLoading: app.loadingStates?.some(state => state.loading) || false,
    hasError: app.errors?.length > 0,
    
    // Helper functions
    getLoadingState: (key) => app.loadingStates?.[key] || { loading: false },
    getError: (key) => app.errors?.find(error => error.key === key),
    
    // Real-time data freshness
    isDataStale: (key, maxAge = 30000) => {
      const lastUpdate = app.lastUpdates?.[key];
      if (!lastUpdate) return true;
      return Date.now() - lastUpdate > maxAge;
    },
  }), [app]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useAppActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Network status
    setNetworkStatus: (status) => dispatch({
      type: 'APP_SET_NETWORK_STATUS',
      payload: { status }
    }),
    
    // App state
    setAppState: (state) => dispatch({
      type: 'APP_SET_STATE',
      payload: { state }
    }),
    
    // Loading states
    setLoading: (key, loading, message = '') => dispatch({
      type: 'APP_SET_LOADING',
      payload: { key, loading, message }
    }),
    
    // Errors
    setError: (key, error) => dispatch({
      type: 'APP_SET_ERROR',
      payload: { key, error }
    }),
    clearError: (key) => dispatch({
      type: 'APP_CLEAR_ERROR',
      payload: { key }
    }),
    clearAllErrors: () => dispatch({ type: 'APP_CLEAR_ALL_ERRORS' }),
    
    // Real-time updates
    updateDataTimestamp: (key) => dispatch({
      type: 'APP_UPDATE_DATA_TIMESTAMP',
      payload: { key, timestamp: Date.now() }
    }),
    
    // Features
    toggleFeature: (feature, enabled) => dispatch({
      type: 'APP_TOGGLE_FEATURE',
      payload: { feature, enabled }
    }),
    
    // Notifications
    addNotification: (notification) => dispatch({
      type: 'APP_ADD_NOTIFICATION',
      payload: notification
    }),
    removeNotification: (id) => dispatch({
      type: 'APP_REMOVE_NOTIFICATION',
      payload: { id }
    }),
    clearNotifications: () => dispatch({ type: 'APP_CLEAR_NOTIFICATIONS' }),
    
    // Real-time connection
    setRealtimeStatus: (status) => dispatch({
      type: 'APP_SET_REALTIME_STATUS',
      payload: { status }
    }),
  }), [dispatch]);
};

// ====================
// DRIVER HOOKS (Enhanced for Real-time)
// ====================

export const useDriver = () => {
  const dispatch = useAppDispatch();
  const driver = useSelector((state) => state.driver);
  
  const derivedState = useMemo(() => ({
    ...driver,
    
    // Active ride status
    hasActiveRide: !!driver.currentRide,
    hasRideRequests: driver.rideRequests?.length > 0 || false,
    hasPendingRides: driver.pendingRides?.length > 0 || false,
    
    // Availability
    isAvailable: driver.status === 'available',
    isUnavailable: driver.status === 'unavailable',
    isOnBreak: driver.status === 'on_break',
    isOnTrip: driver.status === 'on_trip',
    
    // Earnings
    todaysEarnings: driver.earnings?.today || 0,
    weeklyEarnings: driver.earnings?.week || 0,
    monthlyEarnings: driver.earnings?.month || 0,
    totalEarnings: driver.earnings?.total || 0,
    
    // Stats
    completedRides: driver.stats?.completedRides || 0,
    cancellationRate: driver.stats?.cancellationRate || 0,
    rating: driver.stats?.rating || 0,
    acceptanceRate: driver.stats?.acceptanceRate || 0,
    
    // Location
    hasLocation: !!driver.currentLocation,
    locationAccuracy: driver.currentLocation?.accuracy || 0,
    
    // Vehicle
    vehicleInfo: driver.vehicle || {},
    hasValidVehicle: !!(driver.vehicle?.registration && driver.vehicle?.type),
    
    // Real-time metrics
    onlineDuration: driver.metrics?.onlineDuration || 0,
    idleDuration: driver.metrics?.idleDuration || 0,
    tripDuration: driver.metrics?.tripDuration || 0,
    
    // Helper functions
    getActiveRideStatus: () => driver.currentRide?.status,
    getCurrentLocation: () => driver.currentLocation,
    getNextRideRequest: () => driver.rideRequests?.[0],
    
    // Ride queue
    rideQueueLength: driver.rideRequests?.length || 0,
    hasMultipleRequests: (driver.rideRequests?.length || 0) > 1,
  }), [driver]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useDriverActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Status management
    setDriverStatus: (status) => dispatch({
      type: 'DRIVER_SET_STATUS',
      payload: { status }
    }),
    goOnline: () => dispatch({ type: 'DRIVER_GO_ONLINE' }),
    goOffline: () => dispatch({ type: 'DRIVER_GO_OFFLINE' }),
    takeBreak: (duration) => dispatch({
      type: 'DRIVER_TAKE_BREAK',
      payload: { duration }
    }),
    
    // Location updates
    updateLocation: (location) => dispatch({
      type: 'DRIVER_UPDATE_LOCATION',
      payload: { location }
    }),
    setLastLocationUpdate: (timestamp) => dispatch({
      type: 'DRIVER_SET_LAST_LOCATION_UPDATE',
      payload: { timestamp }
    }),
    
    // Ride management
    setCurrentRide: (ride) => dispatch({
      type: 'DRIVER_SET_CURRENT_RIDE',
      payload: { ride }
    }),
    clearCurrentRide: () => dispatch({ type: 'DRIVER_CLEAR_CURRENT_RIDE' }),
    
    // Ride requests
    addRideRequest: (request) => dispatch({
      type: 'DRIVER_ADD_RIDE_REQUEST',
      payload: { request }
    }),
    removeRideRequest: (requestId) => dispatch({
      type: 'DRIVER_REMOVE_RIDE_REQUEST',
      payload: { requestId }
    }),
    clearAllRequests: () => dispatch({ type: 'DRIVER_CLEAR_ALL_REQUESTS' }),
    
    // Earnings
    updateEarnings: (earnings) => dispatch({
      type: 'DRIVER_UPDATE_EARNINGS',
      payload: { earnings }
    }),
    addEarning: (amount, rideId) => dispatch({
      type: 'DRIVER_ADD_EARNING',
      payload: { amount, rideId }
    }),
    
    // Stats
    updateStats: (stats) => dispatch({
      type: 'DRIVER_UPDATE_STATS',
      payload: { stats }
    }),
    incrementCompletedRides: () => dispatch({ 
      type: 'DRIVER_INCREMENT_COMPLETED_RIDES' 
    }),
    updateRating: (newRating) => dispatch({
      type: 'DRIVER_UPDATE_RATING',
      payload: { rating: newRating }
    }),
    
    // Vehicle
    updateVehicleInfo: (vehicleInfo) => dispatch({
      type: 'DRIVER_UPDATE_VEHICLE_INFO',
      payload: { vehicleInfo }
    }),
    
    // Real-time metrics
    updateMetrics: (metrics) => dispatch({
      type: 'DRIVER_UPDATE_METRICS',
      payload: { metrics }
    }),
    resetDailyMetrics: () => dispatch({ type: 'DRIVER_RESET_DAILY_METRICS' }),
    
    // Queue management
    prioritizeRideRequest: (requestId) => dispatch({
      type: 'DRIVER_PRIORITIZE_RIDE_REQUEST',
      payload: { requestId }
    }),
  }), [dispatch]);
};

// ====================
// RIDE HOOKS (Real-time Ride Management)
// ====================

export const useRide = () => {
  const dispatch = useAppDispatch();
  const ride = useSelector((state) => state.ride);
  
  const derivedState = useMemo(() => ({
    ...ride,
    
    // Ride status
    isSearching: ride.status === 'searching',
    isMatched: ride.status === 'matched',
    isAccepted: ride.status === 'accepted',
    isArriving: ride.status === 'arriving',
    isArrived: ride.status === 'arrived',
    isOngoing: ride.status === 'ongoing',
    isCompleted: ride.status === 'completed',
    isCancelled: ride.status === 'cancelled',
    
    // Time tracking
    elapsedTime: ride.timestamps?.started ? 
      Date.now() - new Date(ride.timestamps.started).getTime() : 0,
    waitingTime: ride.timestamps?.requested ?
      Date.now() - new Date(ride.timestamps.requested).getTime() : 0,
    
    // Driver info
    hasDriver: !!ride.driver,
    driverName: ride.driver?.name,
    driverRating: ride.driver?.rating,
    driverVehicle: ride.driver?.vehicle,
    
    // Location info
    pickupLocation: ride.pickup,
    destinationLocation: ride.destination,
    currentLocation: ride.currentLocation,
    driverLocation: ride.driverLocation,
    
    // ETA and distance
    pickupETA: ride.eta?.pickup || 0,
    destinationETA: ride.eta?.destination || 0,
    distanceToPickup: ride.distance?.toPickup || 0,
    distanceToDestination: ride.distance?.toDestination || 0,
    
    // Pricing
    fareEstimate: ride.fare?.estimate || 0,
    finalFare: ride.fare?.final || 0,
    isPaid: ride.payment?.status === 'completed',
    
    // Real-time tracking
    isTracking: ride.realTime?.tracking || false,
    lastLocationUpdate: ride.realTime?.lastLocationUpdate || null,
    lastDriverUpdate: ride.realTime?.lastDriverUpdate || null,
    
    // Helper functions
    getStatusText: () => {
      const statusMap = {
        searching: 'Looking for drivers',
        matched: 'Driver found',
        accepted: 'Driver accepted',
        arriving: 'Driver arriving',
        arrived: 'Driver arrived',
        ongoing: 'Trip in progress',
        completed: 'Trip completed',
        cancelled: 'Trip cancelled',
      };
      return statusMap[ride.status] || 'Unknown status';
    },
    
    getProgressPercentage: () => {
      if (!ride.distance?.toDestination || !ride.distance?.traveled) return 0;
      return (ride.distance.traveled / ride.distance.toDestination) * 100;
    },
    
    getTimeRemaining: () => {
      if (!ride.eta?.destination) return 0;
      const now = Date.now();
      const arrivalTime = new Date(ride.eta.destination).getTime();
      return Math.max(0, arrivalTime - now);
    },
  }), [ride]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useRideActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Ride lifecycle
    requestRide: (rideData) => dispatch({
      type: 'RIDE_REQUEST',
      payload: rideData
    }),
    acceptRide: (rideId, driverId) => dispatch({
      type: 'RIDE_ACCEPT',
      payload: { rideId, driverId }
    }),
    startRide: (rideId) => dispatch({
      type: 'RIDE_START',
      payload: { rideId }
    }),
    completeRide: (rideId, fare) => dispatch({
      type: 'RIDE_COMPLETE',
      payload: { rideId, fare }
    }),
    cancelRide: (rideId, reason) => dispatch({
      type: 'RIDE_CANCEL',
      payload: { rideId, reason }
    }),
    
    // Status updates
    updateRideStatus: (rideId, status) => dispatch({
      type: 'RIDE_UPDATE_STATUS',
      payload: { rideId, status }
    }),
    
    // Location updates
    updateRideLocation: (location) => dispatch({
      type: 'RIDE_UPDATE_LOCATION',
      payload: { location }
    }),
    updateDriverLocation: (location) => dispatch({
      type: 'RIDE_UPDATE_DRIVER_LOCATION',
      payload: { location }
    }),
    
    // ETA updates
    updateETA: (eta) => dispatch({
      type: 'RIDE_UPDATE_ETA',
      payload: { eta }
    }),
    
    // Distance updates
    updateDistance: (distance) => dispatch({
      type: 'RIDE_UPDATE_DISTANCE',
      payload: { distance }
    }),
    
    // Fare updates
    updateFare: (fare) => dispatch({
      type: 'RIDE_UPDATE_FARE',
      payload: { fare }
    }),
    
    // Payment updates
    updatePayment: (payment) => dispatch({
      type: 'RIDE_UPDATE_PAYMENT',
      payload: { payment }
    }),
    
    // Driver updates
    updateDriverInfo: (driver) => dispatch({
      type: 'RIDE_UPDATE_DRIVER_INFO',
      payload: { driver }
    }),
    
    // Real-time tracking
    startTracking: () => dispatch({ type: 'RIDE_START_TRACKING' }),
    stopTracking: () => dispatch({ type: 'RIDE_STOP_TRACKING' }),
    updateTrackingData: (data) => dispatch({
      type: 'RIDE_UPDATE_TRACKING_DATA',
      payload: { data }
    }),
    
    // Timestamps
    updateTimestamp: (key, timestamp) => dispatch({
      type: 'RIDE_UPDATE_TIMESTAMP',
      payload: { key, timestamp }
    }),
    
    // Cleanup
    clearRide: () => dispatch({ type: 'RIDE_CLEAR' }),
    resetRideState: () => dispatch({ type: 'RIDE_RESET_STATE' }),
  }), [dispatch]);
};

// ====================
// LOCATION HOOKS (Real-time Location Management)
// ====================

export const useLocation = () => {
  const dispatch = useAppDispatch();
  const location = useSelector((state) => state.location);
  
  const derivedState = useMemo(() => ({
    ...location,
    
    // Location status
    hasLocation: !!location.current,
    hasPermission: location.permission?.granted || false,
    isTracking: location.tracking?.active || false,
    
    // Accuracy
    highAccuracy: location.current?.accuracy < 50,
    mediumAccuracy: location.current?.accuracy >= 50 && location.current?.accuracy < 100,
    lowAccuracy: location.current?.accuracy >= 100,
    
    // Real-time tracking
    isLiveTracking: location.tracking?.live || false,
    isBackgroundTracking: location.tracking?.background || false,
    trackingInterval: location.tracking?.interval || 5000,
    
    // Last updates
    lastUpdateAge: location.current?.timestamp ? 
      Date.now() - location.current.timestamp : null,
    
    // Helper functions
    getFormattedAddress: () => location.current?.address || 'Unknown location',
    getCoordinates: () => location.current?.coords || null,
    getAccuracyLevel: () => {
      if (!location.current?.accuracy) return 'unknown';
      if (location.current.accuracy < 20) return 'high';
      if (location.current.accuracy < 100) return 'medium';
      return 'low';
    },
    
    // Nearby drivers
    nearbyDriversCount: location.nearbyDrivers?.length || 0,
    hasNearbyDrivers: (location.nearbyDrivers?.length || 0) > 0,
    getClosestDriver: () => {
      if (!location.nearbyDrivers?.length) return null;
      return location.nearbyDrivers.reduce((closest, driver) => 
        driver.distance < closest.distance ? driver : closest
      );
    },
  }), [location]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useLocationActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Current location
    updateCurrentLocation: (location) => dispatch({
      type: 'LOCATION_UPDATE_CURRENT',
      payload: { location }
    }),
    
    // Permission
    setLocationPermission: (granted) => dispatch({
      type: 'LOCATION_SET_PERMISSION',
      payload: { granted }
    }),
    
    // Tracking
    startTracking: (options) => dispatch({
      type: 'LOCATION_START_TRACKING',
      payload: { options }
    }),
    stopTracking: () => dispatch({ type: 'LOCATION_STOP_TRACKING' }),
    setTrackingMode: (mode) => dispatch({
      type: 'LOCATION_SET_TRACKING_MODE',
      payload: { mode }
    }),
    
    // Nearby drivers
    updateNearbyDrivers: (drivers) => dispatch({
      type: 'LOCATION_UPDATE_NEARBY_DRIVERS',
      payload: { drivers }
    }),
    clearNearbyDrivers: () => dispatch({ type: 'LOCATION_CLEAR_NEARBY_DRIVERS' }),
    
    // Address
    updateAddress: (address) => dispatch({
      type: 'LOCATION_UPDATE_ADDRESS',
      payload: { address }
    }),
    
    // History
    addLocationToHistory: (location) => dispatch({
      type: 'LOCATION_ADD_TO_HISTORY',
      payload: { location }
    }),
    clearLocationHistory: () => dispatch({ type: 'LOCATION_CLEAR_HISTORY' }),
    
    // Settings
    updateLocationSettings: (settings) => dispatch({
      type: 'LOCATION_UPDATE_SETTINGS',
      payload: { settings }
    }),
  }), [dispatch]);
};

// ====================
// NOTIFICATION HOOKS (Real-time Notifications)
// ====================

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const notifications = useSelector((state) => state.notifications);
  
  const derivedState = useMemo(() => ({
    ...notifications,
    
    // Notification counts
    unreadCount: notifications.items?.filter(n => !n.read).length || 0,
    unreadRideCount: notifications.items?.filter(n => 
      !n.read && n.type?.includes('ride')
    ).length || 0,
    unreadChatCount: notifications.items?.filter(n => 
      !n.read && n.type?.includes('chat')
    ).length || 0,
    
    // Filtered notifications
    rideNotifications: notifications.items?.filter(n => 
      n.type?.includes('ride')
    ) || [],
    chatNotifications: notifications.items?.filter(n => 
      n.type?.includes('chat')
    ) || [],
    systemNotifications: notifications.items?.filter(n => 
      n.type?.includes('system')
    ) || [],
    
    // Settings
    areNotificationsEnabled: notifications.settings?.enabled || false,
    areSoundsEnabled: notifications.settings?.sounds || false,
    areVibrationsEnabled: notifications.settings?.vibrations || false,
    
    // Helper functions
    getLatestNotification: () => {
      if (!notifications.items?.length) return null;
      return [...notifications.items].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
    },
    
    hasUnread: (type) => {
      return notifications.items?.some(n => !n.read && 
        (type ? n.type?.includes(type) : true)
      ) || false;
    },
  }), [notifications]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useNotificationActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Add notifications
    addNotification: (notification) => dispatch({
      type: 'NOTIFICATIONS_ADD',
      payload: { notification }
    }),
    
    // Mark as read
    markAsRead: (id) => dispatch({
      type: 'NOTIFICATIONS_MARK_READ',
      payload: { id }
    }),
    markAllAsRead: () => dispatch({ type: 'NOTIFICATIONS_MARK_ALL_READ' }),
    
    // Remove notifications
    removeNotification: (id) => dispatch({
      type: 'NOTIFICATIONS_REMOVE',
      payload: { id }
    }),
    clearAllNotifications: () => dispatch({ type: 'NOTIFICATIONS_CLEAR_ALL' }),
    
    // Settings
    updateNotificationSettings: (settings) => dispatch({
      type: 'NOTIFICATIONS_UPDATE_SETTINGS',
      payload: { settings }
    }),
    toggleNotifications: (enabled) => dispatch({
      type: 'NOTIFICATIONS_TOGGLE',
      payload: { enabled }
    }),
    
    // Real-time notification handling
    handlePushNotification: (notification) => dispatch({
      type: 'NOTIFICATIONS_HANDLE_PUSH',
      payload: { notification }
    }),
  }), [dispatch]);
};

// ====================
// CHAT HOOKS (Real-time Messaging)
// ====================

export const useChat = () => {
  const dispatch = useAppDispatch();
  const chat = useSelector((state) => state.chat);
  
  const derivedState = useMemo(() => ({
    ...chat,
    
    // Active chat
    hasActiveChat: !!chat.activeChat,
    activeChatId: chat.activeChat?.id,
    activeChatParticipants: chat.activeChat?.participants || [],
    
    // Messages
    unreadMessagesCount: chat.unreadCount || 0,
    hasUnreadMessages: (chat.unreadCount || 0) > 0,
    
    // Real-time status
    isConnected: chat.connection?.connected || false,
    isTyping: chat.typing?.isTyping || false,
    typingUser: chat.typing?.userId || null,
    
    // Helper functions
    getChatMessages: (chatId) => {
      return chat.messages?.[chatId] || [];
    },
    
    getUnreadCountForChat: (chatId) => {
      return chat.unreadCounts?.[chatId] || 0;
    },
    
    getLastMessage: (chatId) => {
      const messages = chat.messages?.[chatId];
      if (!messages?.length) return null;
      return messages[messages.length - 1];
    },
    
    isUserTyping: (userId) => {
      return chat.typing?.userId === userId && chat.typing?.isTyping;
    },
    
    // Message status
    hasPendingMessages: chat.pendingMessages?.length > 0,
  }), [chat]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

export const useChatActions = () => {
  const dispatch = useAppDispatch();
  
  return useMemo(() => ({
    // Chat management
    setActiveChat: (chatId) => dispatch({
      type: 'CHAT_SET_ACTIVE',
      payload: { chatId }
    }),
    clearActiveChat: () => dispatch({ type: 'CHAT_CLEAR_ACTIVE' }),
    
    // Messages
    sendMessage: (message) => dispatch({
      type: 'CHAT_SEND_MESSAGE',
      payload: { message }
    }),
    receiveMessage: (message) => dispatch({
      type: 'CHAT_RECEIVE_MESSAGE',
      payload: { message }
    }),
    markMessagesAsRead: (chatId) => dispatch({
      type: 'CHAT_MARK_AS_READ',
      payload: { chatId }
    }),
    
    // Typing indicators
    setTyping: (userId, isTyping) => dispatch({
      type: 'CHAT_SET_TYPING',
      payload: { userId, isTyping }
    }),
    
    // Connection
    setChatConnected: (connected) => dispatch({
      type: 'CHAT_SET_CONNECTED',
      payload: { connected }
    }),
    
    // Message status
    updateMessageStatus: (messageId, status) => dispatch({
      type: 'CHAT_UPDATE_MESSAGE_STATUS',
      payload: { messageId, status }
    }),
    
    // Cleanup
    clearChatHistory: (chatId) => dispatch({
      type: 'CHAT_CLEAR_HISTORY',
      payload: { chatId }
    }),
  }), [dispatch]);
};

// ====================
// PAYMENT HOOKS
// ====================

export const usePayment = () => {
  const dispatch = useAppDispatch();
  const payment = useSelector((state) => state.payment);
  
  const derivedState = useMemo(() => ({
    ...payment,
    
    // Payment methods
    hasPaymentMethods: payment.methods?.length > 0,
    defaultPaymentMethod: payment.methods?.find(m => m.isDefault),
    hasWallet: !!payment.wallet,
    
    // Wallet
    walletBalance: payment.wallet?.balance || 0,
    walletCurrency: payment.wallet?.currency || 'MWK',
    
    // Transaction status
    isProcessing: payment.currentTransaction?.status === 'processing',
    isCompleted: payment.currentTransaction?.status === 'completed',
    isFailed: payment.currentTransaction?.status === 'failed',
    
    // History
    recentTransactions: payment.history?.slice(0, 5) || [],
    totalTransactions: payment.history?.length || 0,
    
    // Helper functions
    getPaymentMethodById: (id) => {
      return payment.methods?.find(m => m.id === id);
    },
    
    getTransactionById: (id) => {
      return payment.history?.find(t => t.id === id);
    },
    
    canMakePayment: (amount) => {
      if (payment.currentTransaction) return false;
      if (payment.wallet?.balance >= amount) return true;
      return payment.methods?.some(m => m.isActive);
    },
  }), [payment]);
  
  return {
    ...derivedState,
    dispatch,
  };
};

// ====================
// COMPOSED HOOKS (Combine multiple hooks)
// ====================

/**
 * Master hook combining all major hooks
 */
export const useAppState = () => {
  const auth = useAuth();
  const app = useApp();
  const ride = useRide();
  const location = useLocation();
  const notifications = useNotifications();
  const chat = useChat();
  const payment = usePayment();
  
  return {
    auth,
    app,
    ride,
    location,
    notifications,
    chat,
    payment,
    
    // Combined derived state
    isAppReady: auth.isAuthenticated && app.isOnline && location.hasPermission,
    canRequestRide: auth.isRider && 
                     app.isOnline && 
                     location.hasLocation && 
                     !ride.isSearching && 
                     !ride.isOngoing,
    canAcceptRides: auth.isDriverAvailable && 
                    app.isOnline && 
                    location.hasLocation &&
                    !ride.hasActiveRide,
    
    // Real-time status
    realTimeStatus: {
      socket: auth.isSocketConnected,
      location: location.isTracking,
      ride: ride.isTracking,
      chat: chat.isConnected,
    },
  };
};

/**
 * Hook for driver dashboard
 */
export const useDriverDashboard = () => {
  const auth = useAuth();
  const driver = useDriver();
  const ride = useRide();
  const location = useLocation();
  const notifications = useNotifications();
  
  return {
    ...auth,
    ...driver,
    ...ride,
    ...location,
    ...notifications,
    
    // Dashboard specific
    dashboardStats: {
      earningsToday: driver.todaysEarnings,
      ridesToday: driver.completedRides,
      acceptanceRate: driver.acceptanceRate,
      rating: driver.rating,
      onlineTime: driver.onlineDuration,
    },
    
    canGoOnline: auth.isDriver && 
                 location.hasPermission && 
                 driver.hasValidVehicle &&
                 !driver.isOnTrip,
    
    shouldShowRideRequest: driver.hasRideRequests && 
                          auth.isDriverAvailable &&
                          !ride.hasActiveRide,
  };
};

/**
 * Hook for rider interface
 */
export const useRiderInterface = () => {
  const auth = useAuth();
  const ride = useRide();
  const location = useLocation();
  const notifications = useNotifications();
  const chat = useChat();
  
  return {
    ...auth,
    ...ride,
    ...location,
    ...notifications,
    ...chat,
    
    // Rider specific
    rideStatusInfo: {
      status: ride.status,
      statusText: ride.getStatusText(),
      progress: ride.getProgressPercentage(),
      timeRemaining: ride.getTimeRemaining(),
      eta: ride.pickupETA || ride.destinationETA,
    },
    
    driverInfo: ride.hasDriver ? {
      name: ride.driverName,
      rating: ride.driverRating,
      vehicle: ride.driverVehicle,
      location: ride.driverLocation,
      distance: ride.distanceToPickup,
    } : null,
    
    canChat: ride.hasActiveRide && chat.isConnected,
    canCancel: ride.isSearching || ride.isMatched || ride.isAccepted,
    canRate: ride.isCompleted && !ride.isRated,
  };
};

// ====================
// EXPORT ALL HOOKS
// ====================

export default {
  // Core
  useReduxStore,
  useAppDispatch,
  
  // State hooks
  useAuth,
  useAuthActions,
  useApp,
  useAppActions,
  useDriver,
  useDriverActions,
  useRide,
  useRideActions,
  useLocation,
  useLocationActions,
  useNotifications,
  useNotificationActions,
  useChat,
  useChatActions,
  usePayment,
  
  // Composed hooks
  useAppState,
  useDriverDashboard,
  useRiderInterface,
};