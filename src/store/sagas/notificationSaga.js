// src/store/sagas/locationSaga.js
import { call, put, takeLatest, takeEvery, all, fork } from 'redux-saga/effects';
import { Alert } from 'react-native';

// FIXED IMPORT - using alias:
import {
  getCurrentLocation,
  startLocationTracking,
  geocodeAddress,
  getRoute,
  searchPlaces,
} from '@store/slices/locationSlice';

// Mock services - replace with actual API calls
const LocationService = {
  requestLocationPermission: async () => {
    // Replace with actual permission request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  },
  
  getCurrentPosition: async () => {
    // Replace with actual geolocation call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          coords: {
            latitude: -13.9626,
            longitude: 33.7741,
            accuracy: 10,
            altitude: 1145,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        });
      }, 1000);
    });
  },
  
  watchPosition: (callback, errorCallback, options) => {
    // Replace with actual watch position
    const watchId = setInterval(() => {
      callback({
        coords: {
          latitude: -13.9626 + Math.random() * 0.01,
          longitude: 33.7741 + Math.random() * 0.01,
          accuracy: 10,
          altitude: 1145,
          heading: Math.random() * 360,
          speed: Math.random() * 10,
        },
        timestamp: Date.now(),
      });
    }, 5000);
    
    return watchId;
  },
  
  stopWatching: (watchId) => {
    clearInterval(watchId);
  },
};

const GeocodingService = {
  reverseGeocode: async (lat, lng) => {
    // Replace with actual reverse geocoding
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          formattedAddress: 'Lilongwe, Malawi',
          street: 'Kamuzu Central Hospital Road',
          city: 'Lilongwe',
          country: 'Malawi',
          countryCode: 'MW',
          postalCode: '265',
        });
      }, 1000);
    });
  },
  
  geocode: async (address) => {
    // Replace with actual geocoding
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            latitude: -13.9626,
            longitude: 33.7741,
            formattedAddress: 'Lilongwe, Malawi',
            placeId: 'ChIJL1pVSVNy0RkR4VCJrZaNvQk',
            components: {
              street: 'Kamuzu Central Hospital Road',
              city: 'Lilongwe',
              country: 'Malawi',
            },
          },
        ]);
      }, 1000);
    });
  },
  
  getRoute: async (origin, destination, mode) => {
    // Replace with actual routing API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          distance: 5.2, // km
          duration: 15, // minutes
          polyline: 'mock_polyline_string',
          steps: [
            { instruction: 'Head north', distance: 0.5, duration: 2 },
            { instruction: 'Turn right', distance: 2.0, duration: 5 },
            { instruction: 'Arrive at destination', distance: 2.7, duration: 8 },
          ],
          bounds: {
            northeast: { lat: -13.9526, lng: 33.7841 },
            southwest: { lat: -13.9726, lng: 33.7641 },
          },
        });
      }, 1000);
    });
  },
  
  searchPlaces: async (query, location, radius, type) => {
    // Replace with actual places search
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            name: 'Kamuzu Central Hospital',
            address: 'Lilongwe, Malawi',
            location: { lat: -13.9626, lng: 33.7741 },
            rating: 4.2,
            types: ['hospital', 'health'],
          },
          {
            id: '2',
            name: 'Shoprite Lilongwe',
            address: 'City Centre, Lilongwe',
            location: { lat: -13.9726, lng: 33.7841 },
            rating: 4.5,
            types: ['supermarket', 'grocery'],
          },
        ]);
      }, 1000);
    });
  },
};

// Worker sagas
function* getCurrentLocationWorker() {
  try {
    const hasPermission = yield call(LocationService.requestLocationPermission);
    
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }
    
    const position = yield call(LocationService.getCurrentPosition);
    const address = yield call(GeocodingService.reverseGeocode, 
      position.coords.latitude, 
      position.coords.longitude
    );
    
    const locationData = {
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
      },
      address,
      timestamp: position.timestamp,
    };
    
    yield put(getCurrentLocation.fulfilled(locationData));
  } catch (error) {
    yield put(getCurrentLocation.rejected(error.message));
    Alert.alert('Error', 'Failed to get current location');
  }
}

function* startLocationTrackingWorker(action) {
  try {
    const options = action.payload;
    const hasPermission = yield call(LocationService.requestLocationPermission);
    
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }
    
    const watchId = yield call([LocationService, 'watchPosition'],
      (position) => {
        // This callback will be handled by the slice
        const location = {
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        };
        
        // We'll dispatch an action here
        // In real implementation, you'd use eventChannel or similar
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      options
    );
    
    yield put(startLocationTracking.fulfilled(watchId));
  } catch (error) {
    yield put(startLocationTracking.rejected(error.message));
    Alert.alert('Error', 'Failed to start location tracking');
  }
}

function* geocodeAddressWorker(action) {
  try {
    const address = action.payload;
    const results = yield call(GeocodingService.geocode, address);
    
    if (!results || results.length === 0) {
      throw new Error('Address not found');
    }
    
    const result = {
      address,
      coordinates: {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      },
      formattedAddress: results[0].formattedAddress,
      placeId: results[0].placeId,
      components: results[0].components,
    };
    
    yield put(geocodeAddress.fulfilled(result));
  } catch (error) {
    yield put(geocodeAddress.rejected(error.message));
    Alert.alert('Error', 'Failed to find address');
  }
}

function* getRouteWorker(action) {
  try {
    const { origin, destination, mode } = action.payload;
    const route = yield call(GeocodingService.getRoute, origin, destination, mode);
    
    yield put(getRoute.fulfilled({ origin, destination, mode, ...route }));
  } catch (error) {
    yield put(getRoute.rejected(error.message));
    Alert.alert('Error', 'Failed to calculate route');
  }
}

function* searchPlacesWorker(action) {
  try {
    const { query, location, radius, type } = action.payload;
    const places = yield call(GeocodingService.searchPlaces, query, location, radius, type);
    
    yield put(searchPlaces.fulfilled({ query, results: places }));
  } catch (error) {
    yield put(searchPlaces.rejected(error.message));
    Alert.alert('Error', 'Failed to search places');
  }
}

// Watcher sagas
function* watchGetCurrentLocation() {
  yield takeLatest(getCurrentLocation.pending, getCurrentLocationWorker);
}

function* watchStartLocationTracking() {
  yield takeLatest(startLocationTracking.pending, startLocationTrackingWorker);
}

function* watchGeocodeAddress() {
  yield takeLatest(geocodeAddress.pending, geocodeAddressWorker);
}

function* watchGetRoute() {
  yield takeLatest(getRoute.pending, getRouteWorker);
}

function* watchSearchPlaces() {
  yield takeLatest(searchPlaces.pending, searchPlacesWorker);
}

// Root saga
export default function* locationSaga() {
  yield all([
    fork(watchGetCurrentLocation),
    fork(watchStartLocationTracking),
    fork(watchGeocodeAddress),
    fork(watchGetRoute),
    fork(watchSearchPlaces),
  ]);
}