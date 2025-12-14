// src/store/sagas/rideSaga.js
import { call, put, takeLatest, takeEvery, all, fork, select } from 'redux-saga/effects';
import { Alert } from 'react-native';
import {
  bookRide,
  cancelRide,
  rateRide,
  fetchRideHistory,
  fetchRideDetails,
  updateRideLocation,
  getFareEstimate,
} from '../slices/rideSlice';

// Mock services - replace with actual API calls
const RideService = {
  bookRide: async (rideData) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'ride_' + Date.now(),
          ...rideData,
          status: 'searching',
          createdAt: Date.now(),
          estimatedArrival: Date.now() + 300000, // 5 minutes
        });
      }, 1000);
    });
  },
  
  cancelRide: async (rideId, userId, reason) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          rideId,
          cancelledBy: userId,
          reason,
          cancelledAt: Date.now(),
        });
      }, 1000);
    });
  },
  
  rateRide: async (rideId, userId, rating, review, driverRating) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          rideId,
          userRating: rating,
          driverRating,
          review,
          ratedAt: Date.now(),
        });
      }, 1000);
    });
  },
  
  getRideHistory: async (userId, page, limit) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            userId,
            driverId: 'driver1',
            pickup: { address: 'Location A', lat: -13.9626, lng: 33.7741 },
            destination: { address: 'Location B', lat: -13.9726, lng: 33.7841 },
            fare: 1500,
            distance: 2.5,
            duration: 10,
            status: 'completed',
            completedAt: Date.now() - 86400000, // 1 day ago
          },
        ]);
      }, 1000);
    });
  },
  
  getRideDetails: async (rideId, userId) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: rideId,
          userId,
          driverId: 'driver1',
          pickup: { address: 'Location A', lat: -13.9626, lng: 33.7741 },
          destination: { address: 'Location B', lat: -13.9726, lng: 33.7841 },
          fare: 1500,
          distance: 2.5,
          duration: 10,
          status: 'completed',
          driver: {
            id: 'driver1',
            name: 'John Driver',
            rating: 4.8,
            vehicle: 'Honda CG125',
            plate: 'MH 1234',
          },
          timeline: [
            { event: 'requested', time: Date.now() - 3600000 },
            { event: 'accepted', time: Date.now() - 3500000 },
            { event: 'arrived', time: Date.now() - 3400000 },
            { event: 'started', time: Date.now() - 3300000 },
            { event: 'completed', time: Date.now() - 3200000 },
          ],
        });
      }, 1000);
    });
  },
  
  updateRideLocation: async (rideId, userId, location, isPickup) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          rideId,
          location,
          isPickup,
          updatedAt: Date.now(),
        });
      }, 1000);
    });
  },
  
  getFareEstimate: async (rideData) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const baseFare = 500;
        const perKm = 300;
        const perMinute = 50;
        const distance = rideData.distance || 5;
        const duration = rideData.duration || 15;
        
        const fare = baseFare + (distance * perKm) + (duration * perMinute);
        
        resolve({
          amount: Math.round(fare),
          distance,
          duration,
          breakdown: {
            baseFare,
            distanceCharge: distance * perKm,
            timeCharge: duration * perMinute,
            serviceFee: 100,
            tax: fare * 0.16,
          },
          currency: 'MWK',
        });
      }, 1000);
    });
  },
};

// Worker sagas
function* bookRideWorker(action) {
  try {
    const rideData = action.payload;
    const ride = yield call(RideService.bookRide, rideData);
    yield put(bookRide.fulfilled(ride));
    
    Alert.alert('Success', 'Ride booked successfully. Searching for driver...');
  } catch (error) {
    yield put(bookRide.rejected(error.message));
    Alert.alert('Error', 'Failed to book ride');
  }
}

function* cancelRideWorker(action) {
  try {
    const { rideId, reason } = action.payload;
    const { auth } = yield select();
    const userId = auth.user?.id;
    
    const response = yield call(RideService.cancelRide, rideId, userId, reason);
    yield put(cancelRide.fulfilled(response));
    
    Alert.alert('Success', 'Ride cancelled successfully');
  } catch (error) {
    yield put(cancelRide.rejected(error.message));
    Alert.alert('Error', 'Failed to cancel ride');
  }
}

function* rateRideWorker(action) {
  try {
    const { rideId, rating, review, driverRating } = action.payload;
    const { auth } = yield select();
    const userId = auth.user?.id;
    
    const response = yield call(RideService.rateRide, rideId, userId, rating, review, driverRating);
    yield put(rateRide.fulfilled(response));
    
    Alert.alert('Success', 'Thank you for your rating!');
  } catch (error) {
    yield put(rateRide.rejected(error.message));
    Alert.alert('Error', 'Failed to submit rating');
  }
}

function* fetchRideHistoryWorker(action) {
  try {
    const { page, limit } = action.payload;
    const { auth } = yield select();
    const userId = auth.user?.id;
    
    const history = yield call(RideService.getRideHistory, userId, page, limit);
    yield put(fetchRideHistory.fulfilled({ history, page }));
  } catch (error) {
    yield put(fetchRideHistory.rejected(error.message));
    Alert.alert('Error', 'Failed to load ride history');
  }
}

function* fetchRideDetailsWorker(action) {
  try {
    const rideId = action.payload;
    const { auth } = yield select();
    const userId = auth.user?.id;
    
    const details = yield call(RideService.getRideDetails, rideId, userId);
    yield put(fetchRideDetails.fulfilled(details));
  } catch (error) {
    yield put(fetchRideDetails.rejected(error.message));
    Alert.alert('Error', 'Failed to load ride details');
  }
}

function* updateRideLocationWorker(action) {
  try {
    const { rideId, location, isPickup } = action.payload;
    const { auth } = yield select();
    const userId = auth.user?.id;
    
    const response = yield call(RideService.updateRideLocation, rideId, userId, location, isPickup);
    yield put(updateRideLocation.fulfilled(response));
  } catch (error) {
    yield put(updateRideLocation.rejected(error.message));
    Alert.alert('Error', 'Failed to update location');
  }
}

function* getFareEstimateWorker(action) {
  try {
    const rideData = action.payload;
    const estimate = yield call(RideService.getFareEstimate, rideData);
    yield put(getFareEstimate.fulfilled(estimate));
  } catch (error) {
    yield put(getFareEstimate.rejected(error.message));
    Alert.alert('Error', 'Failed to get fare estimate');
  }
}

// Watcher sagas
function* watchBookRide() {
  yield takeLatest(bookRide.pending, bookRideWorker);
}

function* watchCancelRide() {
  yield takeLatest(cancelRide.pending, cancelRideWorker);
}

function* watchRateRide() {
  yield takeLatest(rateRide.pending, rateRideWorker);
}

function* watchFetchRideHistory() {
  yield takeLatest(fetchRideHistory.pending, fetchRideHistoryWorker);
}

function* watchFetchRideDetails() {
  yield takeLatest(fetchRideDetails.pending, fetchRideDetailsWorker);
}

function* watchUpdateRideLocation() {
  yield takeLatest(updateRideLocation.pending, updateRideLocationWorker);
}

function* watchGetFareEstimate() {
  yield takeLatest(getFareEstimate.pending, getFareEstimateWorker);
}

// Root saga
export default function* rideSaga() {
  yield all([
    fork(watchBookRide),
    fork(watchCancelRide),
    fork(watchRateRide),
    fork(watchFetchRideHistory),
    fork(watchFetchRideDetails),
    fork(watchUpdateRideLocation),
    fork(watchGetFareEstimate),
  ]);
}