// services/socket/EventTypes.js - All socket events for Malawi ride-hailing app

const SOCKET_EVENTS = {
  // ====================
  // CONNECTION EVENTS
  // ====================
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
  PING: 'ping',
  PONG: 'pong',

  // ====================
  // USER & AUTH EVENTS
  // ====================
  USER_CONNECTED: 'user_connected',
  USER_DISCONNECTED: 'user_disconnected',
  USER_ONLINE_STATUS: 'user_online_status',
  USER_TYPING: 'user_typing',
  USER_TYPING_STOP: 'user_typing_stop',
  USER_ACTIVITY: 'user_activity',
  USER_LOCATION_UPDATE: 'user_location_update',

  // ====================
  // RIDE EVENTS (CORE)
  // ====================
  RIDE_REQUEST: 'ride_request',              // Rider requests a ride
  RIDE_REQUEST_CANCELLED: 'ride_request_cancelled', // Rider cancels request
  RIDE_DRIVERS_AVAILABLE: 'ride_drivers_available', // Available drivers near rider
  RIDE_ACCEPTED: 'ride_accepted',            // Driver accepts ride
  RIDE_REJECTED: 'ride_rejected',            // Driver rejects ride
  RIDE_CANCELLED: 'ride_cancelled',          // Either party cancels after acceptance
  RIDE_TIMEOUT: 'ride_timeout',              // Ride request times out
  RIDE_DRIVER_ARRIVING: 'ride_driver_arriving', // Driver is arriving
  RIDE_DRIVER_ARRIVED: 'ride_driver_arrived', // Driver arrived at pickup
  RIDE_STARTED: 'ride_started',              // Ride started
  RIDE_LOCATION_UPDATE: 'ride_location_update', // Real-time location during ride
  RIDE_COMPLETED: 'ride_completed',          // Ride completed
  RIDE_ROUTE_UPDATE: 'ride_route_update',    // Route changed during ride

  // ====================
  // LOCATION EVENTS
  // ====================
  LOCATION_UPDATE: 'location_update',        // General location update
  DRIVER_LOCATION_UPDATE: 'driver_location_update', // Driver location
  RIDER_LOCATION_UPDATE: 'rider_location_update',   // Rider location
  LOCATION_BULK_UPDATE: 'location_bulk_update',     // Multiple locations

  // ====================
  // CHAT EVENTS
  // ====================
  SEND_MESSAGE: 'send_message',              // Send chat message
  RECEIVE_MESSAGE: 'receive_message',        // Receive chat message
  MESSAGE_DELIVERED: 'message_delivered',    // Message delivered to recipient
  MESSAGE_READ: 'message_read',              // Message read by recipient
  CHAT_TYPING: 'chat_typing',                // User is typing
  CHAT_TYPING_STOP: 'chat_typing_stop',      // User stopped typing

  // ====================
  // PAYMENT EVENTS
  // ====================
  PAYMENT_INITIATED: 'payment_initiated',    // Payment started
  PAYMENT_PROCESSING: 'payment_processing',  // Payment processing
  PAYMENT_CONFIRMED: 'payment_confirmed',    // Payment successful (MWK)
  PAYMENT_FAILED: 'payment_failed',          // Payment failed
  PAYMENT_REFUNDED: 'payment_refunded',      // Payment refunded
  RECEIPT_GENERATED: 'receipt_generated',    // Receipt available

  // ====================
  // RATING & FEEDBACK
  // ====================
  RATING_SUBMITTED: 'rating_submitted',      // Rating given
  FEEDBACK_SUBMITTED: 'feedback_submitted',  // Feedback given
  DRIVER_RATED: 'driver_rated',              // Driver was rated
  RIDER_RATED: 'rider_rated',                // Rider was rated

  // ====================
  // NOTIFICATION EVENTS
  // ====================
  PUSH_NOTIFICATION: 'push_notification',    // Push notification
  SYSTEM_NOTIFICATION: 'system_notification', // System notification
  PROMOTION_NOTIFICATION: 'promotion_notification', // Promo/Malawi offers

  // ====================
  // EMERGENCY & SAFETY
  // ====================
  EMERGENCY_ALERT: 'emergency_alert',        // Emergency button pressed
  SOS_TRIGGERED: 'sos_triggered',            // SOS activated
  SAFETY_CHECK: 'safety_check',              // Safety status check
  RIDE_SHARE_LINK: 'ride_share_link',        // Share ride link with family

  // ====================
  // SYSTEM EVENTS
  // ====================
  SERVER_MESSAGE: 'server_message',          // Message from server
  MAINTENANCE_MODE: 'maintenance_mode',      // Server maintenance
  APP_UPDATE: 'app_update',                  // App update available
  FORCE_LOGOUT: 'force_logout',              // Force user logout
};

const USER_ROLES = {
  DRIVER: 'driver',
  RIDER: 'rider',
  ADMIN: 'admin',
  DISPATCHER: 'dispatcher',
};

const RIDE_STATUS = {
  SEARCHING: 'searching',      // Looking for drivers
  REQUESTED: 'requested',      // Ride requested
  ACCEPTED: 'accepted',        // Driver accepted
  ARRIVING: 'arriving',        // Driver arriving
  ARRIVED: 'arrived',          // Driver arrived
  STARTED: 'started',          // Ride started
  IN_PROGRESS: 'in_progress',  // Ride in progress
  COMPLETED: 'completed',      // Ride completed
  CANCELLED: 'cancelled',      // Ride cancelled
  TIMEOUT: 'timeout',          // Request timeout
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const PAYMENT_METHODS = {
  CASH: 'cash',
  MWALLET: 'mwallet',      // Airtel Money, TNM Mpamba
  CREDIT_CARD: 'credit_card',
  BANK_TRANSFER: 'bank_transfer',
};

// Malawi-specific ride types
const RIDE_TYPES = {
  BODA: 'boda',            // Motorcycle taxi
  TAXI: 'taxi',            // Car taxi
  DELIVERY: 'delivery',    // Package delivery
  EXPRESS: 'express',      // Fast delivery
};

// Export everything
export {
  SOCKET_EVENTS,
  USER_ROLES,
  RIDE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  RIDE_TYPES,
};