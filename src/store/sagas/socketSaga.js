// src/store/sagas/socketSaga.js - FIXED VERSION
import { eventChannel, END } from 'redux-saga';
import { call, put, take, takeLatest, fork, cancel, cancelled, all } from 'redux-saga/effects';
import io from 'socket.io-client';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIXED IMPORTS - using aliases:
import {
  setSocketConnected,
  setSocketReconnecting,
  updateConnectionQuality,
  addRealTimeUpdate,
  addNotification,
} from '@store/slices/notificationSlice';

import {
  addMessage,
  setChatConnection,
  setTyping,
  updateMessageStatus,
} from '@store/slices/chatSlice';

import {
  setDriverLocation,
  addRideRequest,
  updateRideStatus,
  addNearbyRide,
} from '@store/slices/driverSlice';

import {
  setAssignedDriver,
  setRideStatus,
  addRealTimeUpdate as addRideRealTimeUpdate,
} from '@store/slices/rideSlice';

// ✅ ADD DEVELOPMENT MODE CHECK
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Socket service
let socket = null;

const SocketService = {
  connect: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Attempting to connect to socket: ${url}`);
        
        // ✅ ADD DEVELOPMENT MODE CHECK
        if (isDevelopment && (!url || url.includes('localhost') || url.includes('10.0.2.2'))) {
          console.warn('⚠️ Development mode: Socket connection to localhost disabled');
          console.log('   To enable socket, start your backend server');
          reject(new Error('Development mode: Socket disabled'));
          return;
        }
        
        socket = io(url, {
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 3, // Reduced for development
          reconnectionDelay: 1000,
          timeout: 10000, // Reduced timeout
          ...options,
        });

        socket.on('connect', () => {
          console.log('✅ Socket connected successfully');
          resolve(socket);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error.message);
          reject(error);
        });

        socket.on('error', (error) => {
          console.error('❌ Socket error:', error.message);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
        });

      } catch (error) {
        console.error('❌ Socket initialization error:', error.message);
        reject(error);
      }
    });
  },

  disconnect: () => {
    if (socket) {
      console.log('🔌 Disconnecting socket...');
      socket.disconnect();
      socket = null;
      console.log('✅ Socket disconnected');
    }
  },

  emit: (event, data) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
      console.log(`📤 Emitted socket event: ${event}`, data);
    } else {
      console.warn(`⚠️ Socket not connected, cannot emit: ${event}`);
    }
  },

  on: (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      console.log(`👂 Listening to socket event: ${event}`);
    }
  },

  off: (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  },

  isConnected: () => {
    return socket && socket.connected;
  },
};

// Create event channel for socket events
function createSocketChannel(socket) {
  return eventChannel((emit) => {
    // ✅ ADD NULL CHECK for socket
    if (!socket) {
      console.error('❌ Cannot create socket channel: socket is null');
      emit(END); // Close the channel immediately
      return () => {};
    }

    console.log('🔧 Creating socket event channel...');

    // Connection events
    const handleConnect = () => {
      console.log('📡 Socket connected event received');
      emit({ type: 'SOCKET_CONNECTED' });
    };

    const handleDisconnect = (reason) => {
      console.log('📡 Socket disconnected event received:', reason);
      emit({ type: 'SOCKET_DISCONNECTED', payload: reason });
    };

    const handleConnectError = (error) => {
      console.error('📡 Socket connection error event:', error.message);
      emit({ type: 'SOCKET_CONNECT_ERROR', payload: error });
    };

    const handleReconnect = (attemptNumber) => {
      console.log(`📡 Socket reconnected on attempt ${attemptNumber}`);
      emit({ type: 'SOCKET_RECONNECT', payload: attemptNumber });
    };

    const handleReconnectAttempt = (attemptNumber) => {
      console.log(`📡 Socket reconnection attempt ${attemptNumber}`);
      emit({ type: 'SOCKET_RECONNECT_ATTEMPT', payload: attemptNumber });
    };

    const handleReconnectError = (error) => {
      console.error('📡 Socket reconnection error:', error.message);
      emit({ type: 'SOCKET_RECONNECT_ERROR', payload: error });
    };

    const handleReconnectFailed = () => {
      console.error('📡 Socket reconnection failed after all attempts');
      emit({ type: 'SOCKET_RECONNECT_FAILED' });
    };

    const handlePing = () => {
      emit({ type: 'SOCKET_PING' });
    };

    const handlePong = (latency) => {
      emit({ type: 'SOCKET_PONG', payload: latency });
    };

    // Application-specific events
    const handleRideRequest = (ride) => {
      console.log('📡 Ride request event received:', ride?.id);
      emit({ type: 'RIDE_REQUEST', payload: ride });
    };

    const handleRideStatusUpdate = (update) => {
      console.log('📡 Ride status update event received:', update?.rideId);
      emit({ type: 'RIDE_STATUS_UPDATE', payload: update });
    };

    const handleDriverLocationUpdate = (location) => {
      console.log('📡 Driver location update event received');
      emit({ type: 'DRIVER_LOCATION_UPDATE', payload: location });
    };

    const handleDriverAssigned = (driver) => {
      console.log('📡 Driver assigned event received:', driver?.id);
      emit({ type: 'DRIVER_ASSIGNED', payload: driver });
    };

    const handleChatMessage = (message) => {
      console.log('📡 Chat message event received:', message?.id);
      emit({ type: 'CHAT_MESSAGE', payload: message });
    };

    const handleTypingIndicator = (data) => {
      emit({ type: 'TYPING_INDICATOR', payload: data });
    };

    const handleMessageStatus = (status) => {
      console.log('📡 Message status event received:', status?.messageId);
      emit({ type: 'MESSAGE_STATUS', payload: status });
    };

    const handleNotification = (notification) => {
      console.log('📡 Notification event received:', notification?.id);
      emit({ type: 'NOTIFICATION', payload: notification });
    };

    const handleLocationUpdate = (location) => {
      emit({ type: 'LOCATION_UPDATE', payload: location });
    };

    const handleNearbyRidesUpdate = (rides) => {
      console.log('📡 Nearby rides update event received, count:', rides?.length || 0);
      emit({ type: 'NEARBY_RIDES_UPDATE', payload: rides });
    };

    // Attach event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_failed', handleReconnectFailed);
    socket.on('ping', handlePing);
    socket.on('pong', handlePong);
    socket.on('ride_request', handleRideRequest);
    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('driver_location_update', handleDriverLocationUpdate);
    socket.on('driver_assigned', handleDriverAssigned);
    socket.on('chat_message', handleChatMessage);
    socket.on('typing_indicator', handleTypingIndicator);
    socket.on('message_status', handleMessageStatus);
    socket.on('notification', handleNotification);
    socket.on('location_update', handleLocationUpdate);
    socket.on('nearby_rides_update', handleNearbyRidesUpdate);

    console.log('✅ Socket event channel created successfully');

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket event channel...');
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('reconnect', handleReconnect);
        socket.off('reconnect_attempt', handleReconnectAttempt);
        socket.off('reconnect_error', handleReconnectError);
        socket.off('reconnect_failed', handleReconnectFailed);
        socket.off('ping', handlePing);
        socket.off('pong', handlePong);
        socket.off('ride_request', handleRideRequest);
        socket.off('ride_status_update', handleRideStatusUpdate);
        socket.off('driver_location_update', handleDriverLocationUpdate);
        socket.off('driver_assigned', handleDriverAssigned);
        socket.off('chat_message', handleChatMessage);
        socket.off('typing_indicator', handleTypingIndicator);
        socket.off('message_status', handleMessageStatus);
        socket.off('notification', handleNotification);
        socket.off('location_update', handleLocationUpdate);
        socket.off('nearby_rides_update', handleNearbyRidesUpdate);
      }
    };
  });
}

// Worker sagas
function* connectSocketWorker(action) {
  try {
    console.log('🚀 Starting socket connection worker...');
    
    const { url, options, userId, userType } = action.payload;
    
    // ✅ CHECK IF IN DEVELOPMENT MODE
    if (isDevelopment) {
      console.log('🔧 Development mode: Simulating socket connection');
      yield put(setSocketConnected(true));
      yield put(setChatConnection(true));
      console.log('✅ Development socket connection established (mock)');
      return;
    }
    
    // Get auth token
    const token = yield call([AsyncStorage, 'getItem'], 'auth_token');
    
    const connectionOptions = {
      query: {
        userId: userId || 'anonymous',
        userType: userType || 'user',
        token: token || '',
        platform: Platform.OS,
        appVersion: '1.0.0',
      },
      auth: {
        token: token || '',
      },
      ...options,
    };
    
    console.log('🔗 Connecting to socket with options:', {
      url,
      userId: connectionOptions.query.userId,
      userType: connectionOptions.query.userType
    });
    
    // Connect to socket
    const socket = yield call(SocketService.connect, url, connectionOptions);
    
    // Join user-specific rooms
    if (userId) {
      SocketService.emit('join_user', { userId, userType });
    }
    
    // Create event channel for socket events
    const socketChannel = yield call(createSocketChannel, socket);
    
    // Start listening to socket events
    yield fork(listenToSocketEvents, socketChannel);
    
    yield put(setSocketConnected(true));
    yield put(setChatConnection(true));
    
    console.log('✅ Socket connected successfully');
    
  } catch (error) {
    console.error('❌ Failed to connect socket:', error.message);
    yield put(setSocketConnected(false));
    yield put(setChatConnection(false));
    
    // ✅ ONLY SHOW ALERT IN PRODUCTION OR IF ERROR IS SERIOUS
    if (!isDevelopment || error.message.includes('Network Error')) {
      Alert.alert(
        'Connection Error', 
        'Failed to connect to real-time service. Some features may be limited.',
        [{ text: 'OK' }]
      );
    }
  }
}

function* disconnectSocketWorker() {
  try {
    console.log('🔌 Starting socket disconnection worker...');
    
    if (isDevelopment) {
      console.log('🔧 Development mode: Simulating socket disconnection');
      yield put(setSocketConnected(false));
      yield put(setChatConnection(false));
      return;
    }
    
    yield call(SocketService.disconnect);
    yield put(setSocketConnected(false));
    yield put(setChatConnection(false));
    
    console.log('✅ Socket disconnected');
  } catch (error) {
    console.error('❌ Failed to disconnect socket:', error);
  }
}

// ✅ FIXED: listenToSocketEvents with proper null checks
function* listenToSocketEvents(socketChannel) {
  try {
    console.log('👂 Starting to listen to socket events...');
    
    while (true) {
      const event = yield take(socketChannel);
      
      // ✅ ADD NULL CHECK for event
      if (!event || !event.type) {
        console.warn('⚠️ Received invalid socket event:', event);
        continue;
      }
      
      console.log(`📡 Processing socket event: ${event.type}`);
      
      switch (event.type) {
        case 'SOCKET_CONNECTED':
          yield put(setSocketConnected(true));
          yield put(setChatConnection(true));
          yield put(updateConnectionQuality('good'));
          console.log('✅ Socket connection established in saga');
          break;
          
        case 'SOCKET_DISCONNECTED':
          yield put(setSocketConnected(false));
          yield put(setChatConnection(false));
          console.log('🔌 Socket disconnected in saga:', event.payload);
          break;
          
        case 'SOCKET_CONNECT_ERROR':
          yield put(setSocketConnected(false));
          yield put(setChatConnection(false));
          console.error('❌ Socket connection error in saga:', event.payload?.message);
          break;
          
        case 'SOCKET_RECONNECT':
          yield put(setSocketReconnecting(false));
          yield put(setSocketConnected(true));
          yield put(setChatConnection(true));
          console.log('🔁 Socket reconnected in saga on attempt:', event.payload);
          break;
          
        case 'SOCKET_RECONNECT_ATTEMPT':
          yield put(setSocketReconnecting(event.payload));
          console.log('🔄 Socket reconnection attempt in saga:', event.payload);
          break;
          
        case 'SOCKET_RECONNECT_ERROR':
          console.error('❌ Socket reconnection error in saga:', event.payload?.message);
          break;
          
        case 'SOCKET_RECONNECT_FAILED':
          yield put(setSocketConnected(false));
          yield put(setChatConnection(false));
          console.error('❌ Socket reconnection failed in saga');
          if (!isDevelopment) {
            Alert.alert('Connection Lost', 'Unable to reconnect to server');
          }
          break;
          
        case 'SOCKET_PONG':
          // Update connection quality based on latency
          const latency = event.payload;
          let quality = 'good';
          if (latency > 500) quality = 'fair';
          if (latency > 1000) quality = 'poor';
          yield put(updateConnectionQuality(quality));
          break;
          
        case 'RIDE_REQUEST':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(addRideRequest(event.payload));
            yield put(addNotification({
              id: `ride_request_${Date.now()}`,
              title: 'New Ride Request',
              message: `Ride request from ${event.payload.pickup?.address || 'unknown location'}`,
              type: 'ride_request',
              data: event.payload,
              timestamp: Date.now(),
            }));
          } else {
            console.warn('⚠️ Received RIDE_REQUEST with null payload');
          }
          break;
          
        case 'RIDE_STATUS_UPDATE':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(updateRideStatus(event.payload));
            yield put(setRideStatus(event.payload));
            
            // Add notification for significant status changes
            const status = event.payload.status;
            if (status && ['accepted', 'arrived', 'started', 'completed', 'cancelled'].includes(status)) {
              yield put(addNotification({
                id: `ride_status_${Date.now()}`,
                title: 'Ride Update',
                message: `Ride status: ${status}`,
                type: 'ride_update',
                data: event.payload,
                timestamp: Date.now(),
              }));
            }
          } else {
            console.warn('⚠️ Received RIDE_STATUS_UPDATE with null payload');
          }
          break;
          
        case 'DRIVER_LOCATION_UPDATE':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(setDriverLocation(event.payload));
          } else {
            console.warn('⚠️ Received DRIVER_LOCATION_UPDATE with null payload');
          }
          break;
          
        case 'DRIVER_ASSIGNED':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(setAssignedDriver(event.payload));
            yield put(addNotification({
              id: `driver_assigned_${Date.now()}`,
              title: 'Driver Assigned',
              message: `${event.payload.name || 'A driver'} is your driver`,
              type: 'driver_assigned',
              data: event.payload,
              timestamp: Date.now(),
            }));
          } else {
            console.warn('⚠️ Received DRIVER_ASSIGNED with null payload');
          }
          break;
          
        case 'CHAT_MESSAGE':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(addMessage({
              conversationId: event.payload.conversationId,
              message: event.payload,
            }));
          } else {
            console.warn('⚠️ Received CHAT_MESSAGE with null payload');
          }
          break;
          
        case 'TYPING_INDICATOR':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(setTyping(event.payload));
          }
          break;
          
        case 'MESSAGE_STATUS':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(updateMessageStatus(event.payload));
          } else {
            console.warn('⚠️ Received MESSAGE_STATUS with null payload');
          }
          break;
          
        case 'NOTIFICATION':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(addNotification(event.payload));
          } else {
            console.warn('⚠️ Received NOTIFICATION with null payload');
          }
          break;
          
        case 'LOCATION_UPDATE':
          // ✅ ADD NULL CHECK for payload
          if (event.payload) {
            yield put(addRealTimeUpdate({
              type: 'locationUpdates',
              data: event.payload,
            }));
          } else {
            console.warn('⚠️ Received LOCATION_UPDATE with null payload');
          }
          break;
          
        case 'NEARBY_RIDES_UPDATE':
          // ✅ FIXED: Proper null check and array validation
          const rides = event.payload;
          
          if (rides && Array.isArray(rides)) {
            console.log(`🚗 Processing ${rides.length} nearby rides`);
            
            // Process valid rides only
            const validRides = rides.filter(ride => ride && ride.id);
            
            if (validRides.length > 0) {
              // Use all effect to process rides in parallel
              yield all(
                validRides.map(ride => 
                  put(addNearbyRide(ride))
                )
              );
              console.log(`✅ Added ${validRides.length} nearby rides`);
            } else {
              console.warn('⚠️ No valid rides in NEARBY_RIDES_UPDATE');
            }
          } else {
            console.warn('⚠️ Received NEARBY_RIDES_UPDATE with invalid data:', rides);
          }
          break;
          
        default:
          console.log('📡 Unhandled socket event:', event.type);
      }
    }
  } catch (error) {
    console.error('❌ Error in socket event listener:', error.message);
  } finally {
    if (yield cancelled()) {
      console.log('🧹 Socket event listener cancelled, closing channel...');
      try {
        socketChannel.close();
      } catch (closeError) {
        console.error('❌ Error closing socket channel:', closeError.message);
      }
    }
  }
}

function* emitSocketEventWorker(action) {
  try {
    const { event, data } = action.payload;
    
    console.log(`📤 Emitting socket event: ${event}`);
    
    if (!SocketService.isConnected()) {
      console.warn(`⚠️ Cannot emit ${event}: Socket not connected`);
      return;
    }
    
    SocketService.emit(event, data);
    console.log(`✅ Successfully emitted socket event: ${event}`);
    
  } catch (error) {
    console.error(`❌ Failed to emit socket event ${action.payload.event}:`, error.message);
  }
}

function* joinRoomWorker(action) {
  try {
    const { room, data } = action.payload;
    
    console.log(`🚪 Joining socket room: ${room}`);
    
    if (!SocketService.isConnected()) {
      console.warn(`⚠️ Cannot join room ${room}: Socket not connected`);
      return;
    }
    
    SocketService.emit('join_room', { room, ...data });
    console.log(`✅ Successfully joined socket room: ${room}`);
    
  } catch (error) {
    console.error(`❌ Failed to join socket room ${action.payload.room}:`, error.message);
  }
}

function* leaveRoomWorker(action) {
  try {
    const { room } = action.payload;
    
    console.log(`🚪 Leaving socket room: ${room}`);
    
    if (!SocketService.isConnected()) {
      console.warn(`⚠️ Cannot leave room ${room}: Socket not connected`);
      return;
    }
    
    SocketService.emit('leave_room', { room });
    console.log(`✅ Successfully left socket room: ${room}`);
    
  } catch (error) {
    console.error(`❌ Failed to leave socket room ${action.payload.room}:`, error.message);
  }
}

function* sendChatMessageWorker(action) {
  try {
    const message = action.payload;
    
    console.log('💬 Sending chat message:', message?.id || 'unknown');
    
    if (!SocketService.isConnected()) {
      console.warn('⚠️ Cannot send chat message: Socket not connected');
      Alert.alert('Offline', 'Cannot send message while offline');
      return;
    }
    
    SocketService.emit('send_message', message);
    console.log('✅ Chat message sent successfully');
    
  } catch (error) {
    console.error('❌ Failed to send chat message:', error.message);
    Alert.alert('Error', 'Failed to send message');
  }
}

function* sendTypingIndicatorWorker(action) {
  try {
    const { conversationId, userId, isTyping } = action.payload;
    
    if (!SocketService.isConnected()) {
      return;
    }
    
    SocketService.emit('typing', {
      conversationId,
      userId,
      isTyping,
    });
    
  } catch (error) {
    console.error('❌ Failed to send typing indicator:', error.message);
  }
}

function* updateLocationWorker(action) {
  try {
    const location = action.payload;
    
    if (!SocketService.isConnected()) {
      return;
    }
    
    SocketService.emit('update_location', location);
    
  } catch (error) {
    console.error('❌ Failed to update location:', error.message);
  }
}

// Watcher sagas
function* watchConnectSocket() {
  console.log('👀 Starting socket connection watcher...');
  yield takeLatest('SOCKET_CONNECT_REQUEST', connectSocketWorker);
}

function* watchDisconnectSocket() {
  console.log('👀 Starting socket disconnection watcher...');
  yield takeLatest('SOCKET_DISCONNECT_REQUEST', disconnectSocketWorker);
}

function* watchEmitSocketEvent() {
  console.log('👀 Starting socket emit watcher...');
  yield takeLatest('SOCKET_EMIT', emitSocketEventWorker);
}

function* watchJoinRoom() {
  console.log('👀 Starting join room watcher...');
  yield takeLatest('SOCKET_JOIN_ROOM', joinRoomWorker);
}

function* watchLeaveRoom() {
  console.log('👀 Starting leave room watcher...');
  yield takeLatest('SOCKET_LEAVE_ROOM', leaveRoomWorker);
}

function* watchSendChatMessage() {
  console.log('👀 Starting send chat message watcher...');
  yield takeLatest('SOCKET_SEND_MESSAGE', sendChatMessageWorker);
}

function* watchSendTypingIndicator() {
  console.log('👀 Starting typing indicator watcher...');
  yield takeLatest('SOCKET_SEND_TYPING', sendTypingIndicatorWorker);
}

function* watchUpdateLocation() {
  console.log('👀 Starting location update watcher...');
  yield takeLatest('SOCKET_UPDATE_LOCATION', updateLocationWorker);
}

// Action creators for socket operations
export const connectSocket = (url, options, userId, userType) => ({
  type: 'SOCKET_CONNECT_REQUEST',
  payload: { url, options, userId, userType },
});

export const disconnectSocket = () => ({
  type: 'SOCKET_DISCONNECT_REQUEST',
});

export const emitSocketEvent = (event, data) => ({
  type: 'SOCKET_EMIT',
  payload: { event, data },
});

export const joinSocketRoom = (room, data = {}) => ({
  type: 'SOCKET_JOIN_ROOM',
  payload: { room, data },
});

export const leaveSocketRoom = (room) => ({
  type: 'SOCKET_LEAVE_ROOM',
  payload: { room },
});

export const sendSocketMessage = (message) => ({
  type: 'SOCKET_SEND_MESSAGE',
  payload: message,
});

export const sendSocketTyping = (conversationId, userId, isTyping) => ({
  type: 'SOCKET_SEND_TYPING',
  payload: { conversationId, userId, isTyping },
});

export const sendSocketLocation = (location) => ({
  type: 'SOCKET_UPDATE_LOCATION',
  payload: location,
});

// Root saga
export default function* socketSaga() {
  try {
    console.log('🚀 Initializing socket saga...');
    
    // ✅ ADD DEVELOPMENT MODE CHECK
    if (isDevelopment) {
      console.log('🔧 Development mode: Starting socket saga in mock mode');
      // Simulate socket connection for development
      yield put(setSocketConnected(true));
      yield put(setChatConnection(true));
    }
    
    yield all([
      fork(watchConnectSocket),
      fork(watchDisconnectSocket),
      fork(watchEmitSocketEvent),
      fork(watchJoinRoom),
      fork(watchLeaveRoom),
      fork(watchSendChatMessage),
      fork(watchSendTypingIndicator),
      fork(watchUpdateLocation),
    ]);
    
    console.log('✅ Socket saga started successfully');
    
  } catch (error) {
    console.error('❌ Failed to start socket saga:', error.message);
  }
}