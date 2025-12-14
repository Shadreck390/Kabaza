// Kabaza/services/ride/RideService.js
import locationService from '../location/locationServices';
import socketService from '../socket/socketService';
import { SocketEvents } from '../socket';

class RideService {
  constructor() {
    this.currentRide = null;
    this.rideState = {
      isActive: false,
      isSearching: false,
      isMatched: false,
      isOngoing: false,
      isCompleted: false
    };
    this.driverLocation = null;
    this.riderLocation = null;
    this.rideListeners = new Map();
    this.locationUpdateInterval = null;
  }

  // ====================
  // RIDE REQUEST
  // ====================

  /**
   * Request a new ride
   */
  async requestRide(rideData) {
    try {
      const enhancedRideData = {
        ...rideData,
        rideId: this.generateRideId(),
        requestedAt: new Date().toISOString(),
        status: 'searching'
      };

      // Emit ride request via socket
      const success = socketService.emit(SocketEvents.RIDE_REQUEST, enhancedRideData);
      
      if (success) {
        this.currentRide = enhancedRideData;
        this.rideState.isSearching = true;
        this.setupRideListeners(enhancedRideData.rideId);
        
        console.log('🚖 Ride requested:', enhancedRideData.rideId);
        return enhancedRideData.rideId;
      }
      
      throw new Error('Failed to send ride request');
      
    } catch (error) {
      console.error('❌ Ride request failed:', error);
      throw error;
    }
  }

  // ====================
  // RIDE MANAGEMENT (DRIVER)
  // ====================

  /**
   * Accept a ride request (driver)
   */
  async acceptRide(rideId, driverData) {
    try {
      const rideData = {
        rideId,
        driverId: driverData.id,
        driverName: driverData.name,
        driverLocation: driverData.location,
        vehicleInfo: driverData.vehicle,
        acceptedAt: new Date().toISOString()
      };

      const success = socketService.emit(SocketEvents.RIDE_ACCEPTED, rideData);
      
      if (success) {
        this.currentRide = { ...this.currentRide, ...rideData, status: 'accepted' };
        this.rideState.isSearching = false;
        this.rideState.isMatched = true;
        
        // Start location tracking for driver
        this.startDriverLocationUpdates(rideId, driverData.location);
        
        console.log('✅ Ride accepted:', rideId);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to accept ride:', error);
      throw error;
    }
  }

  /**
   * Start ride (driver arrives and picks up rider)
   */
  async startRide(rideId, driverId) {
    try {
      const success = socketService.emit(SocketEvents.RIDE_STARTED, {
        rideId,
        driverId,
        startedAt: new Date().toISOString()
      });

      if (success) {
        this.currentRide.status = 'ongoing';
        this.rideState.isMatched = false;
        this.rideState.isOngoing = true;
        
        console.log('🚗 Ride started:', rideId);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to start ride:', error);
      throw error;
    }
  }

  // ====================
  // RIDE COMPLETION
  // ====================

  /**
   * Complete a ride
   */
  async completeRide(rideId, fare, distance, duration) {
    try {
      const rideCompletionData = {
        rideId,
        fare,
        distance,
        duration,
        completedAt: new Date().toISOString(),
        status: 'completed'
      };

      const success = socketService.emit(SocketEvents.RIDE_COMPLETED, rideCompletionData);
      
      if (success) {
        this.currentRide = { ...this.currentRide, ...rideCompletionData };
        this.rideState.isOngoing = false;
        this.rideState.isCompleted = true;
        
        // Stop location updates
        this.stopDriverLocationUpdates();
        
        console.log('✅ Ride completed:', rideId);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to complete ride:', error);
      throw error;
    }
  }

  /**
   * Cancel a ride
   */
  async cancelRide(rideId, reason, cancelledBy) {
    try {
      const cancellationData = {
        rideId,
        reason,
        cancelledBy,
        cancelledAt: new Date().toISOString(),
        status: 'cancelled'
      };

      const success = socketService.emit(SocketEvents.RIDE_CANCELLED, cancellationData);
      
      if (success) {
        this.currentRide = { ...this.currentRide, ...cancellationData };
        this.resetRideState();
        
        // Stop location updates
        this.stopDriverLocationUpdates();
        
        console.log('❌ Ride cancelled:', rideId);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Failed to cancel ride:', error);
      throw error;
    }
  }

  // ====================
  // LOCATION TRACKING
  // ====================

  /**
   * Start driver location updates for a ride
   */
  startDriverLocationUpdates(rideId, initialLocation) {
    this.stopDriverLocationUpdates(); // Clear any existing interval
    
    this.driverLocation = initialLocation;
    
    this.locationUpdateInterval = setInterval(async () => {
      try {
        const position = await locationService.getCurrentPosition();
        
        if (position) {
          const locationData = {
            rideId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            bearing: position.coords.heading || 0,
            speed: position.coords.speed || 0,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          this.driverLocation = locationData;
          
          // Send via socket
          socketService.emit(SocketEvents.DRIVER_LOCATION_UPDATE, {
            ...locationData,
            userType: 'driver'
          });
          
          // Notify listeners
          this.notifyRideListeners('driver_location_update', locationData);
        }
      } catch (error) {
        console.error('❌ Failed to update driver location:', error);
      }
    }, 5000); // Update every 5 seconds
    
    console.log('📍 Started driver location updates for ride:', rideId);
  }

  /**
   * Stop driver location updates
   */
  stopDriverLocationUpdates() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
      console.log('📍 Stopped driver location updates');
    }
  }

  // ====================
  // RIDE STATUS & UTILS
  // ====================

  /**
   * Get current ride status
   */
  getRideStatus() {
    return {
      ride: this.currentRide,
      state: this.rideState,
      driverLocation: this.driverLocation,
      riderLocation: this.riderLocation,
      isActive: this.rideState.isSearching || this.rideState.isMatched || this.rideState.isOngoing
    };
  }

  /**
   * Reset ride state
   */
  resetRideState() {
    this.currentRide = null;
    this.rideState = {
      isActive: false,
      isSearching: false,
      isMatched: false,
      isOngoing: false,
      isCompleted: false
    };
    this.driverLocation = null;
    this.riderLocation = null;
    this.stopDriverLocationUpdates();
    
    console.log('🔄 Ride state reset');
  }

  /**
   * Generate unique ride ID
   */
  generateRideId() {
    return `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ====================
  // EVENT LISTENERS
  // ====================

  /**
   * Setup ride event listeners
   */
  setupRideListeners(rideId) {
    // Listen for ride status updates
    const statusHandler = (data) => {
      if (data.rideId === rideId) {
        this.handleRideStatusUpdate(data);
      }
    };

    // Listen for driver location updates (for riders)
    const locationHandler = (data) => {
      if (data.rideId === rideId && data.userType === 'driver') {
        this.driverLocation = data.location;
        this.notifyRideListeners('driver_location_update', data);
      }
    };

    // Listen for rider location updates (for drivers)
    const riderLocationHandler = (data) => {
      if (data.rideId === rideId && data.userType === 'rider') {
        this.riderLocation = data.location;
        this.notifyRideListeners('rider_location_update', data);
      }
    };

    // Register listeners
    socketService.on(SocketEvents.RIDE_STATUS_UPDATE, statusHandler);
    socketService.on(SocketEvents.LOCATION_UPDATE, locationHandler);
    socketService.on(SocketEvents.LOCATION_UPDATE, riderLocationHandler);
    
    // Store for cleanup
    this.rideListeners.set(rideId, {
      statusHandler,
      locationHandler,
      riderLocationHandler
    });
  }

  /**
   * Handle ride status update
   */
  handleRideStatusUpdate(data) {
    const { rideId, status, ...updateData } = data;
    
    if (this.currentRide && this.currentRide.rideId === rideId) {
      this.currentRide = { ...this.currentRide, ...updateData, status };
      
      // Update ride state based on status
      switch (status) {
        case 'searching':
          this.rideState.isSearching = true;
          break;
        case 'matched':
          this.rideState.isSearching = false;
          this.rideState.isMatched = true;
          break;
        case 'accepted':
          this.rideState.isMatched = true;
          break;
        case 'arriving':
          this.rideState.isMatched = true;
          break;
        case 'ongoing':
          this.rideState.isMatched = false;
          this.rideState.isOngoing = true;
          break;
        case 'completed':
          this.rideState.isOngoing = false;
          this.rideState.isCompleted = true;
          this.stopDriverLocationUpdates();
          break;
        case 'cancelled':
          this.resetRideState();
          break;
      }
      
      // Notify listeners
      this.notifyRideListeners('status_update', data);
    }
  }

  /**
   * Add ride event listener
   */
  onRideEvent(rideId, event, callback) {
    const key = `${rideId}_${event}`;
    
    if (!this.rideListeners.has(key)) {
      this.rideListeners.set(key, []);
    }
    
    this.rideListeners.get(key).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.rideListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify ride event listeners
   */
  notifyRideListeners(event, data) {
    const key = `${data.rideId}_${event}`;
    
    if (this.rideListeners.has(key)) {
      this.rideListeners.get(key).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Cleanup ride listeners
   */
  cleanupRideListeners(rideId) {
    // Remove specific ride listeners
    const keysToRemove = [];
    for (const key of this.rideListeners.keys()) {
      if (key.startsWith(`${rideId}_`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.rideListeners.delete(key);
    });
    
    console.log(`🧹 Cleaned up listeners for ride: ${rideId}`);
  }

  // ====================
  // FARE CALCULATION
  // ====================

  /**
   * Calculate ride fare
   */
  calculateFare(distance, duration, vehicleType, surgeMultiplier = 1.0) {
    // Base fares (MWK - Malawi Kwacha)
    const baseFares = {
      motorcycle: 500,
      car: 800,
      minibus: 1000,
      bicycle: 300
    };
    
    // Per km rates
    const perKmRates = {
      motorcycle: 300,
      car: 500,
      minibus: 400,
      bicycle: 200
    };
    
    // Per minute rates
    const perMinuteRates = {
      motorcycle: 20,
      car: 30,
      minibus: 25,
      bicycle: 10
    };
    
    const baseFare = baseFares[vehicleType] || baseFares.car;
    const distanceFare = distance * (perKmRates[vehicleType] || perKmRates.car);
    const timeFare = duration * (perMinuteRates[vehicleType] || perMinuteRates.car);
    
    const subtotal = baseFare + distanceFare + timeFare;
    const totalFare = subtotal * surgeMultiplier;
    
    return {
      baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      subtotal: Math.round(subtotal),
      surgeMultiplier,
      totalFare: Math.round(totalFare),
      breakdown: {
        base: baseFare,
        distance: Math.round(distanceFare),
        time: Math.round(timeFare),
        surge: surgeMultiplier > 1 ? Math.round(subtotal * (surgeMultiplier - 1)) : 0,
        total: Math.round(totalFare)
      }
    };
  }

  // ====================
  // CLEANUP
  // ====================

  /**
   * Complete cleanup
   */
  cleanup() {
    this.resetRideState();
    this.rideListeners.clear();
    
    // Remove socket listeners
    if (socketService && typeof socketService.removeAllListeners === 'function') {
      socketService.removeAllListeners();
    }
    
    console.log('🧹 RideService cleanup complete');
  }
}

// Create and export singleton instance
const rideServiceInstance = new RideService();
export default rideServiceInstance;