// src/services/api/client.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import socketIO from 'socket.io-client'; // Install: npm install socket.io-client
import { store } from '@store'; // For Redux integration

// Base URL - Update with your actual API URL
const API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000/api',
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
});

// SOCKET_URL (can be same as API or different)
const SOCKET_URL = API_BASE_URL.replace('/api', ''); // Remove /api for socket

class APIClient {
  constructor() {
    // REST API instance
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Socket.IO instance
    this.socket = null;
    this.isSocketConnected = false;
    this.socketListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Setup
    this.setupInterceptors();
  }

  // ====================
  // REST API METHODS
  // ====================

  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

              const { token, refreshToken: newRefreshToken } = response.data;

              await AsyncStorage.setItem('auth_token', token);
              if (newRefreshToken) {
                await AsyncStorage.setItem('refresh_token', newRefreshToken);
              }

              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await this.clearAuth();
            this.disconnectSocket();
          }
        }

        // Network errors
        if (!error.response) {
          error.message = 'Network error. Please check your internet connection.';
        }

        return Promise.reject(error);
      }
    );
  }

  // REST CRUD methods
  async get(url, params = {}, config = {}) {
    return this.api.get(url, { params, ...config });
  }

  async post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.api.delete(url, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.api.patch(url, data, config);
  }

  // ====================
  // REAL-TIME SOCKET METHODS
  // ====================

  async connectSocket(userId = null) {
    if (this.socket && this.isSocketConnected) {
      console.log('Socket already connected');
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      this.socket = socketIO(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 20000,
        query: { token, userId },
        forceNew: true,
      });

      // Socket event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isSocketConnected = true;
        this.reconnectAttempts = 0;
        this.emitSocketEvent('socket:connected', { socketId: this.socket.id });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isSocketConnected = false;
        this.emitSocketEvent('socket:disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isSocketConnected = false;
        this.emitSocketEvent('socket:error', { error: error.message });
        
        // Auto-reconnect
        this.reconnectAttempts++;
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          setTimeout(() => {
            if (!this.isSocketConnected) {
              this.connectSocket(userId);
            }
          }, 2000);
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        this.isSocketConnected = true;
        this.emitSocketEvent('socket:reconnected', { attemptNumber });
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to connect socket:', error);
      throw error;
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isSocketConnected = false;
      this.socketListeners.clear();
      console.log('Socket disconnected');
    }
  }

  // Emit event to server
  emitSocketEvent(event, data) {
    if (this.socket && this.isSocketConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: Socket not connected`);
    }
  }

  // Listen to socket events
  onSocketEvent(event, callback) {
    if (!this.socketListeners.has(event)) {
      this.socketListeners.set(event, []);
    }
    this.socketListeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => this.offSocketEvent(event, callback);
  }

  // Remove socket listener
  offSocketEvent(event, callback) {
    if (this.socketListeners.has(event)) {
      const listeners = this.socketListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      
      if (this.socket) {
        this.socket.off(event, callback);
      }
    }
  }

  // ====================
  // RIDE REAL-TIME EVENTS (Bolt-like)
  // ====================

  // Rider: Request a ride
  async requestRide(rideData) {
    // Send via REST
    const response = await this.post('/rides/book', rideData);
    const rideId = response.data.rideId;
    
    // Listen for real-time updates on this ride
    this.onSocketEvent(`ride:${rideId}:status`, (data) => {
      this.emitSocketEvent('ride:status_update', data);
    });
    
    this.onSocketEvent(`ride:${rideId}:driver_assigned`, (data) => {
      this.emitSocketEvent('ride:driver_assigned', data);
    });
    
    this.onSocketEvent(`ride:${rideId}:location`, (data) => {
      this.emitSocketEvent('ride:driver_location', data);
    });

    return response;
  }

  // Driver: Listen for nearby ride requests
  listenForRideRequests(callback) {
    return this.onSocketEvent('ride:request', callback);
  }

  // Driver: Accept a ride request
  acceptRideRequest(rideId) {
    this.emitSocketEvent('ride:accept', { rideId });
  }

  // Send driver location updates
  sendLocationUpdate(location) {
    this.emitSocketEvent('driver:location', location);
  }

  // Send ride status updates
  updateRideStatus(rideId, status) {
    this.emitSocketEvent('ride:status', { rideId, status });
  }

  // ====================
  // CHAT REAL-TIME
  // ====================

  // Join ride chat room
  joinRideChat(rideId) {
    this.emitSocketEvent('chat:join', { rideId });
    
    return this.onSocketEvent(`chat:${rideId}:message`, (message) => {
      this.emitSocketEvent('chat:new_message', { rideId, message });
    });
  }

  // Send chat message
  sendChatMessage(rideId, message) {
    this.emitSocketEvent('chat:message', { rideId, message });
  }

  // ====================
  // UTILITY METHODS
  // ====================

  async clearAuth() {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('user');
    delete this.api.defaults.headers.common['Authorization'];
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  setBaseURL(url) {
    this.api.defaults.baseURL = url;
  }

  // File upload
  async uploadFile(file, endpoint, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = onProgress;
    }

    return this.api.post(endpoint, formData, config);
  }

  // Cancel token
  createCancelToken() {
    return axios.CancelToken.source();
  }

  isCancel(error) {
    return axios.isCancel(error);
  }

  // ====================
  // STATUS METHODS
  // ====================

  isConnected() {
    return this.isSocketConnected;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }
}

// Create singleton instance
const apiClient = new APIClient();

// Export for backward compatibility
export const API = {
  // Auth
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (userData) => apiClient.post('/auth/register', userData),
    verifyPhone: (phone, code) => apiClient.post('/auth/verify-phone', { phone, code }),
    me: () => apiClient.get('/auth/me'),
  },
  
  // Rides
  rides: {
    bookRide: (rideData) => apiClient.requestRide(rideData),
    cancelRide: (rideId, reason) => apiClient.put(`/rides/${rideId}/cancel`, { reason }),
    getRideDetails: (rideId) => apiClient.get(`/rides/${rideId}`),
    getNearbyRides: (params) => apiClient.get('/rides/nearby', { params }),
    acceptRide: (rideId) => apiClient.post(`/rides/${rideId}/accept`),
  },
  
  // Drivers
  drivers: {
    updateLocation: (location) => apiClient.put('/drivers/location', location),
    updateStatus: (status) => apiClient.put('/drivers/status', { status }),
  },
};

// Export everything
export { apiClient, API_BASE_URL };
export default apiClient;