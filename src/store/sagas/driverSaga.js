// src/store/sagas/driverSaga.js
import { call, put, takeLatest, takeEvery, all, fork } from 'redux-saga/effects';
import { Alert } from 'react-native';
import {
  loadNearbyRides,
  acceptRideRequest,
  startRideTrip,
  completeRideTrip,
  cancelRideRequest,
  updateDriverStatus,
  updateDriverLocation,
} from '../slices/driverSlice';

// Mock services - replace with actual API calls
const DriverService = {
  getNearbyRides: async (filters) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId: 'user1',
            pickup: { address: 'Location A', lat: -13.9626, lng: 33.7741 },
            destination: { address: 'Location B', lat: -13.9726, lng: 33.7841 },
            fare: 1500,
            distance: 2.5,
            duration: 10,
            passengerCount: 1,
            vehicleType: 'motorcycle',
            paymentMethod: 'cash',
            status: 'pending',
          },
        ]);
      }, 1000);
    });
  },
  
  acceptRide: async (rideId, driverId) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          ride: {
            id: rideId,
            driverId,
            status: 'accepted',
            acceptedAt: Date.now(),
          },
        });
      }, 1000);
    });
  },
  
  startRide: async (rideId) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          rideId,
          startedAt: Date.now(),
        });
      }, 1000);
    });
  },
  
  completeRide: async (rideId, rating, review, paymentData) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          rideId,
          fare: 1500,
          completedAt: Date.now(),
        });
      }, 1000);
    });
  },
  
  cancelRide: async (rideId, reason, cancelledBy) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          rideId,
          reason,
          cancelledBy,
        });
      }, 1000);
    });
  },
  
  updateDriverStatus: async (driverId, status, rideId) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          driverId,
          status,
          updatedAt: Date.now(),
        });
      }, 1000);
    });
  },
};

// Worker sagas
function* loadNearbyRidesWorker(action) {
  try {
    const region = action.payload;
    const rides = yield call(DriverService.getNearbyRides, region);
    yield put(loadNearbyRides.fulfilled(rides));
  } catch (error) {
    yield put(loadNearbyRides.rejected(error.message));
    Alert.alert('Error', 'Failed to load nearby rides');
  }
}

function* acceptRideRequestWorker(action) {
  try {
    const { rideId, driverId } = action.payload;
    const response = yield call(DriverService.acceptRide, rideId, driverId);
    yield put(acceptRideRequest.fulfilled(response));
    
    Alert.alert('Success', 'Ride accepted successfully');
  } catch (error) {
    yield put(acceptRideRequest.rejected(error.message));
    Alert.alert('Error', 'Failed to accept ride');
  }
}

function* startRideTripWorker(action) {
  try {
    const rideId = action.payload;
    const response = yield call(DriverService.startRide, rideId);
    yield put(startRideTrip.fulfilled(response));
    
    Alert.alert('Success', 'Ride started');
  } catch (error) {
    yield put(startRideTrip.rejected(error.message));
    Alert.alert('Error', 'Failed to start ride');
  }
}

function* completeRideTripWorker(action) {
  try {
    const { rideId, rating, review, paymentData } = action.payload;
    const response = yield call(DriverService.completeRide, rideId, rating, review, paymentData);
    yield put(completeRideTrip.fulfilled(response));
    
    Alert.alert('Success', 'Ride completed successfully');
  } catch (error) {
    yield put(completeRideTrip.rejected(error.message));
    Alert.alert('Error', 'Failed to complete ride');
  }
}

function* cancelRideRequestWorker(action) {
  try {
    const { rideId, reason, cancelledBy } = action.payload;
    const response = yield call(DriverService.cancelRide, rideId, reason, cancelledBy);
    yield put(cancelRideRequest.fulfilled(response));
    
    Alert.alert('Success', 'Ride cancelled');
  } catch (error) {
    yield put(cancelRideRequest.rejected(error.message));
    Alert.alert('Error', 'Failed to cancel ride');
  }
}

function* updateDriverStatusWorker(action) {
  try {
    const { status, rideId } = action.payload;
    const { auth } = yield select();
    const driverId = auth.user?.id;
    
    const response = yield call(DriverService.updateDriverStatus, driverId, status, rideId);
    yield put(updateDriverStatus.fulfilled(response));
  } catch (error) {
    yield put(updateDriverStatus.rejected(error.message));
    Alert.alert('Error', 'Failed to update status');
  }
}

// Watcher sagas
function* watchLoadNearbyRides() {
  yield takeLatest(loadNearbyRides.pending, loadNearbyRidesWorker);
}

function* watchAcceptRideRequest() {
  yield takeLatest(acceptRideRequest.pending, acceptRideRequestWorker);
}

function* watchStartRideTrip() {
  yield takeLatest(startRideTrip.pending, startRideTripWorker);
}

function* watchCompleteRideTrip() {
  yield takeLatest(completeRideTrip.pending, completeRideTripWorker);
}

function* watchCancelRideRequest() {
  yield takeLatest(cancelRideRequest.pending, cancelRideRequestWorker);
}

function* watchUpdateDriverStatus() {
  yield takeLatest(updateDriverStatus.pending, updateDriverStatusWorker);
}

// Root saga
export default function* driverSaga() {
  yield all([
    fork(watchLoadNearbyRides),
    fork(watchAcceptRideRequest),
    fork(watchStartRideTrip),
    fork(watchCompleteRideTrip),
    fork(watchCancelRideRequest),
    fork(watchUpdateDriverStatus),
  ]);
}