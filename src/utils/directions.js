// utils/directions.js
import { Alert } from 'react-native';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAft39RTF1LB_GTSYqy-I2tswzakC4fT3Q'; // Use your key

export const getDirections = async (origin, destination, waypoints = []) => {
  try {
    const originStr = `${origin.latitude},${origin.longitude}`;
    const destStr = `${destination.latitude},${destination.longitude}`;
    
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&alternatives=false`;
    
    if (waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
      url += `&waypoints=${waypointsStr}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      const route = data.routes[0];
      const points = decodePolyline(route.overview_polyline.points);
      
      return {
        coordinates: points,
        distance: route.legs[0].distance.text,
        duration: route.legs[0].duration.text,
        steps: route.legs[0].steps,
      };
    } else {
      console.error('Directions API error:', data.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching directions:', error);
    return null;
  }
};

// Polyline decoder helper
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return points;
}