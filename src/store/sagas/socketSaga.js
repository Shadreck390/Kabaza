// src/store/sagas/socketSaga.js - FIXED VERSION
import { eventChannel, END } from 'redux-saga';
import { call, put, take, takeLatest, fork, cancel, cancelled, all } from 'redux-saga/effects';
import io from 'socket.io-client';
import { Alert } from 'react-native';
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

// Socket service
let socket = null;

const SocketService = {
  connect: (url, options = {}) => {
    return new Promise((resolve, reject) => {
      try {
        socket = io(url, {
          transports: ['websocket', 'polling'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
          ...options,
        });

        socket.on('connect', () => {
          console.log('Socket connected');
          resolve(socket);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  emit: (event, data) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  },

  on: (event, callback) => {
    if (socket) {
      socket.on(event, callback);
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
    // Connection events
    socket.on('connect', () => {
      emit({ type: 'SOCKET_CONNECTED' });
    });

    socket.on('disconnect', (reason) => {
      emit({ type: 'SOCKET_DISCONNECTED', payload: reason });
    });

    socket.on('connect_error', (error) => {
      emit({ type: 'SOCKET_CONNECT_ERROR', payload: error });
    });

    socket.on('reconnect', (attemptNumber) => {
      emit({ type: 'SOCKET_RECONNECT', payload: attemptNumber });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      emit({ type: 'SOCKET_RECONNECT_ATTEMPT', payload: attemptNumber });
    });

    socket.on('reconnect_error', (error) => {
      emit({ type: 'SOCKET_RECONNECT_ERROR', payload: error });
    });

    socket.on('reconnect_failed', () => {
      emit({ type: 'SOCKET_RECONNECT_FAILED' });
    });

    socket.on('ping', () => {
      emit({ type: 'SOCKET_PING' });
    });

    socket.on('pong', (latency) => {
      emit({ type: 'SOCKET_PONG', payload: latency });
    });

    // Application-specific events
    socket.on('ride_request', (ride) => {
      emit({ type: 'RIDE_REQUEST', payload: ride });
    });

    socket.on('ride_status_update', (update) => {
      emit({ type: 'RIDE_STATUS_UPDATE', payload: update });
    });

    socket.on('driver_location_update', (location) => {
      emit({ type: 'DRIVER_LOCATION_UPDATE', payload: location });
    });

    socket.on('driver_assigned', (driver) => {
      emit({ type: 'DRIVER_ASSIGNED', payload: driver });
    });

    socket.on('chat_message', (message) => {
      emit({ type: 'CHAT_MESSAGE', payload: message });
    });

    socket.on('typing_indicator', (data) => {
      emit({ type: 'TYPING_INDICATOR', payload: data });
    });

    socket.on('message_status', (status) => {
      emit({ type: 'MESSAGE_STATUS', payload: status });
    });

    socket.on('notification', (notification) => {
      emit({ type: 'NOTIFICATION', payload: notification });
    });

    socket.on('location_update', (location) => {
      emit({ type: 'LOCATION_UPDATE', payload: location });
    });

    socket.on('nearby_rides_update', (rides) => {
      emit({ type: 'NEARBY_RIDES_UPDATE', payload: rides });
    });

    // Cleanup function
    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('reconnect');
        socket.off('reconnect_attempt');
        socket.off('reconnect_error');
        socket.off('reconnect_failed');
        socket.off('ping');
        socket.off('pong');
        socket.off('ride_request');
        socket.off('ride_status_update');
        socket.off('driver_location_update');
        socket.off('driver_assigned');
        socket.off('chat_message');
        socket.off('typing_indicator');
        socket.off('message_status');
        socket.off('notification');
        socket.off('location_update');
        socket.off('nearby_rides_update');
      }
    };
  });
}

// Worker sagas
function* connectSocketWorker(action) {
  try {
    const { url, options, userId, userType } = action.payload;
    
    // Get auth token
    const token = yield call([AsyncStorage, 'getItem'], 'auth_token');
    
    const connectionOptions = {
      query: {
        userId,
        userType: userType || 'user',
        token: token || '',
      },
      auth: {
        token: token || '',
      },
      ...options,
    };
    
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
    
    console.log('Socket connected successfully');
  } catch (error) {
    console.error('Failed to connect socket:', error);
    yield put(setSocketConnected(false));
    yield put(setChatConnection(false));
    
    Alert.alert('Connection Error', 'Failed to connect to real-time service');
  }
}

function* disconnectSocketWorker() {
  try {
    yield call(SocketService.disconnect);
    yield put(setSocketConnected(false));
    yield put(setChatConnection(false));
    
    console.log('Socket disconnected');
  } catch (error) {
    console.error('Failed to disconnect socket:', error);
  }
}

function* listenToSocketEvents(socketChannel) {
  try {
    while (true) {
      const event = yield take(socketChannel);
      
      switch (event.type) {
        case 'SOCKET_CONNECTED':
          yield put(setSocketConnected(true));
          yield put(setChatConnection(true));
          yield put(updateConnectionQuality('good'));
          break;
          
        case 'SOCKET_DISCONNECTED':
          yield put(setSocketConnected(false));
          yield put(setChatConnection(false));
          console.log('Socket disconnected:', event.payload);
          break;
          
        case 'SOCKET_CONNECT_ERROR':
          yield put(setSocketConnected(false));
          yield put(setChatConnection(false));
          console.error('Socket connection error:', event.payload);
          break;
          
        case 'SOCKET_RECONNECT':
          yield put(setSocketReconnecting(false));
          yield put(setSocketConnected(true));
          yield put(setChatConnection(true));
          console.log('Socket reconnected on attempt:', event.payload);
          break;
          
        case 'SOCKET_RECONNECT_ATTEMPT':
          yield put(setSocketReconnecting(event.payload));
          console.log('Socket reconnection attempt:', event.payload);
          break;
          
        case 'SOCKET_RECONNECT_ERROR':
          console.error('Socket reconnection error:', event.payload);
          break;
          
        case 'SOCKET_RECONNECT_FAILED':
          yield put(setSocketConnected(false));
          yield put(setChatConnection(false));
          Alert.alert('Connection Lost', 'Unable to reconnect to server');
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
          yield put(addRideRequest(event.payload));
          yield put(addNotification({
            id: `ride_request_${Date.now()}`,
            title: 'New Ride Request',
            message: `Ride request from ${event.payload.pickup.address}`,
            type: 'ride_request',
            data: event.payload,
            timestamp: Date.now(),
          }));
          break;
          
        case 'RIDE_STATUS_UPDATE':
          yield put(updateRideStatus(event.payload));
          yield put(setRideStatus(event.payload));
          
          // Add notification for significant status changes
          const status = event.payload.status;
          if (['accepted', 'arrived', 'started', 'completed', 'cancelled'].includes(status)) {
            yield put(addNotification({
              id: `ride_status_${Date.now()}`,
              title: 'Ride Update',
              message: `Ride status: ${status}`,
              type: 'ride_update',
              data: event.payload,
              timestamp: Date.now(),
            }));
          }
          break;
          
        case 'DRIVER_LOCATION_UPDATE':
          yield put(setDriverLocation(event.payload));
          break;
          
        case 'DRIVER_ASSIGNED':
          yield put(setAssignedDriver(event.payload));
          yield put(addNotification({
            id: `driver_assigned_${Date.now()}`,
            title: 'Driver Assigned',
            message: `${event.payload.name} is your driver`,
            type: 'driver_assigned',
            data: event.payload,
            timestamp: Date.now(),
          }));
          break;
          
        case 'CHAT_MESSAGE':
          yield put(addMessage({
            conversationId: event.payload.conversationId,
            message: event.payload,
          }));
          break;
          
        case 'TYPING_INDICATOR':
          yield put(setTyping(event.payload));
          break;
          
        case 'MESSAGE_STATUS':
          yield put(updateMessageStatus(event.payload));
          break;
          
        case 'NOTIFICATION':
          yield put(addNotification(event.payload));
          break;
          
        case 'LOCATION_UPDATE':
          yield put(addRealTimeUpdate({
            type: 'locationUpdates',
            data: event.payload,
          }));
          break;
          
        case 'NEARBY_RIDES_UPDATE':
          // FIXED: Use 'all' effect instead of forEach with yield
          yield all(
            event.payload.map(ride => 
              put(addNearbyRide(ride))
            )
          );
          break;
          
        default:
          console.log('Unhandled socket event:', event.type);
      }
    }
  } catch (error) {
    console.error('Error in socket event listener:', error);
  } finally {
    if (yield cancelled()) {
      socketChannel.close();
    }
  }
}

function* emitSocketEventWorker(action) {
  try {
    const { event, data } = action.payload;
    
    if (!SocketService.isConnected()) {
      throw new Error('Socket not connected');
    }
    
    SocketService.emit(event, data);
  } catch (error) {
    console.error('Failed to emit socket event:', error);
  }
}

function* joinRoomWorker(action) {
  try {
    const { room, data } = action.payload;
    
    if (!SocketService.isConnected()) {
      throw new Error('Socket not connected');
    }
    
    SocketService.emit('join_room', { room, ...data });
  } catch (error) {
    console.error('Failed to join room:', error);
  }
}

function* leaveRoomWorker(action) {
  try {
    const { room } = action.payload;
    
    if (!SocketService.isConnected()) {
      throw new Error('Socket not connected');
    }
    
    SocketService.emit('leave_room', { room });
  } catch (error) {
    console.error('Failed to leave room:', error);
  }
}

function* sendChatMessageWorker(action) {
  try {
    const message = action.payload;
    
    if (!SocketService.isConnected()) {
      throw new Error('Socket not connected');
    }
    
    SocketService.emit('send_message', message);
  } catch (error) {
    console.error('Failed to send chat message:', error);
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
    console.error('Failed to send typing indicator:', error);
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
    console.error('Failed to update location:', error);
  }
}

// Watcher sagas
function* watchConnectSocket() {
  yield takeLatest('SOCKET_CONNECT_REQUEST', connectSocketWorker);
}

function* watchDisconnectSocket() {
  yield takeLatest('SOCKET_DISCONNECT_REQUEST', disconnectSocketWorker);
}

function* watchEmitSocketEvent() {
  yield takeLatest('SOCKET_EMIT', emitSocketEventWorker);
}

function* watchJoinRoom() {
  yield takeLatest('SOCKET_JOIN_ROOM', joinRoomWorker);
}

function* watchLeaveRoom() {
  yield takeLatest('SOCKET_LEAVE_ROOM', leaveRoomWorker);
}

function* watchSendChatMessage() {
  yield takeLatest('SOCKET_SEND_MESSAGE', sendChatMessageWorker);
}

function* watchSendTypingIndicator() {
  yield takeLatest('SOCKET_SEND_TYPING', sendTypingIndicatorWorker);
}

function* watchUpdateLocation() {
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
}