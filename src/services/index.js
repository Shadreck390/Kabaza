// Update your src/services/index.js:
export { default as LocationService } from './location';
export { default as DocumentService } from './document';
export { default as SocketService } from './socket';
export { default as RealTimeService } from './realtime';
export { default as RideService } from './ride';
export { default as PaymentService } from './payment';
export { default as NotificationService } from './notification';

// Add driver service export
export { default as DriverService } from './driver/driverService';

// API exports
export { default as authAPI } from './api/authAPI';
export { default as rideAPI } from './api/rideAPI';
export { default as tripAPI } from './api/tripAPI';
export { default as vehicleAPI } from './api/vehicleAPI';
export { default as apiClient } from './api/apiService';

// Socket utilities and constants
export { SocketEvents } from './socket/EventTypes';
export { ConnectionManager } from './socket/ConnectionManager';

// Location utilities
export { default as locationUtils } from './location/Location.utils';

// Ride utilities
export { default as rideUtils } from './ride/rideutils';

// Optional: Create a main default export
const Services = {
  LocationService,
  DocumentService,
  SocketService,
  RealTimeService,
  RideService,
  PaymentService,
  NotificationService,
  DriverService, // Add this
  authAPI,
  rideAPI,
  tripAPI,
  vehicleAPI,
  apiClient,
  SocketEvents,
  ConnectionManager,
  locationUtils,
  rideUtils,
};

export default Services;