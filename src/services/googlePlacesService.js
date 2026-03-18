import { GOOGLE_PLACES_API_KEY } from '@src/config/config';
import { SAVED_PLACES, POPULAR_MALAWI_LOCATIONS } from './location/constants';

// Check if API key is configured
const isApiKeyConfigured = () => {
  return GOOGLE_PLACES_API_KEY && 
         GOOGLE_PLACES_API_KEY.length > 10;
};

export const googlePlacesService = {
  /**
   * Search for places using Google Places Autocomplete
   */
  searchPlaces: async (query, options = {}) => {
    // Return empty if API key not configured
    if (!isApiKeyConfigured()) {
      console.log('Google Places API key not configured');
      return [];
    }

    if (!query || query.length < 2) return [];
    
    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;

      if (options.latitude && options.longitude) {
        url += `&location=${options.latitude},${options.longitude}&radius=50000`;
      }

      // Optional: Add language preference
      if (options.language) {
        url += `&language=${options.language}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'REQUEST_DENIED') {
        console.error('Google Places API access denied - check API key and billing');
        return [];
      }
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Places API error:', data.status);
        return [];
      }
      
      return data.predictions.map(prediction => ({
        id: prediction.place_id,
        placeId: prediction.place_id,
        name: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
        address: prediction.structured_formatting?.secondary_text || prediction.description,
        fullAddress: prediction.description,
        type: 'google',
        icon: 'map-pin'
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  },

  /**
   * Get place details by place ID
   */
  getPlaceDetails: async (placeId) => {
    if (!isApiKeyConfigured()) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=name,formatted_address,geometry,address_components`
      );
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Place details error: ${data.status}`);
      }
      
      const place = data.result;
      return {
        id: placeId,
        placeId: placeId,
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        type: 'google',
        country: place.address_components?.find(c => c.types.includes('country'))?.long_name
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      throw error;
    }
  },

  /**
   * Search all locations (local + Google)
   * FIXED: Added options parameter
   */
  searchAllLocations: async (query, options = {}) => {  // ADDED options parameter
    if (!query || query.length < 2) {
      // Return saved and popular locations when no query
      return [...SAVED_PLACES, ...POPULAR_MALAWI_LOCATIONS];
    }
    
    // Filter local places first
    const queryLower = query.toLowerCase();
    const localResults = [
      ...SAVED_PLACES.filter(place => 
        place.name.toLowerCase().includes(queryLower) ||
        place.address.toLowerCase().includes(queryLower)
      ),
      ...POPULAR_MALAWI_LOCATIONS.filter(place =>
        place.name.toLowerCase().includes(queryLower) ||
        place.address.toLowerCase().includes(queryLower)
      )
    ].map(place => ({
      ...place,
      source: 'local'
    }));
    
    // Get Google Places results - NOW options is defined!
    const googleResults = await googlePlacesService.searchPlaces(query, options);
    const formattedGoogleResults = googleResults.map(place => ({
      ...place,
      source: 'google'
    }));
    
    // Combine results
    return [...formattedGoogleResults, ...localResults];
  },
  
  /**
   * Search with location bias
   */
  searchNearby: async (query, latitude, longitude) => {
    return googlePlacesService.searchAllLocations(query, { 
      latitude, 
      longitude,
      bias: true // Indicate that we want to bias results based on location
    });
  }
};

// Re-export for backward compatibility
export { SAVED_PLACES, POPULAR_MALAWI_LOCATIONS };