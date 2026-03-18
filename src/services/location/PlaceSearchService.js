// services/location/PlaceSearchService.js
import { googlePlacesService } from '@src/services/googlePlacesService';
import { SAVED_PLACES, POPULAR_MALAWI_LOCATIONS } from './constants';

class PlaceSearchService {
  constructor() {
    this.searchCache = new Map();
    this.recentSearches = [];
    this.MAX_RECENT = 10;
  }

  /**
   * Search places (combines Google + local)
   */
  async searchPlaces(query, userLocation = null) {
    if (!query || query.length < 2) {
      return this.getDefaultPlaces();
    }

    // Try cache first
    const cacheKey = `${query}_${userLocation?.latitude || '0'}`;
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 min cache
        return cached.results;
      }
    }

    try {
      // Get Google results (NOW GLOBAL - no Malawi restriction)
      const googleResults = await googlePlacesService.searchAllLocations(query, userLocation);

      // Get local matches
      const localResults = this.getLocalMatches(query);

      // Combine and remove duplicates
      const allResults = this.mergeResults(googleResults, localResults);

      // Cache results
      this.searchCache.set(cacheKey, {
        results: allResults,
        timestamp: Date.now()
      });

      return allResults;
    } catch (error) {
      console.error('Place search error:', error);
      return this.getLocalMatches(query); // Fallback to local only
    }
  }

  /**
   * Get local matches from saved and popular places
   */
  getLocalMatches(query) {
    const queryLower = query.toLowerCase();
    return [
      ...SAVED_PLACES.filter(p => 
        p.name.toLowerCase().includes(queryLower) ||
        p.address.toLowerCase().includes(queryLower)
      ).map(p => ({ ...p, source: 'saved' })),
      ...POPULAR_MALAWI_LOCATIONS.filter(p =>
        p.name.toLowerCase().includes(queryLower) ||
        p.address.toLowerCase().includes(queryLower)
      ).map(p => ({ ...p, source: 'popular' }))
    ];
  }

  /**
   * Get default places (when no search query)
   */
  getDefaultPlaces() {
    return [
      ...this.recentSearches.map(p => ({ ...p, source: 'recent' })),
      ...SAVED_PLACES.map(p => ({ ...p, source: 'saved' })),
      ...POPULAR_MALAWI_LOCATIONS.map(p => ({ ...p, source: 'popular' }))
    ];
  }

  /**
   * Merge Google and local results, remove duplicates
   */
  mergeResults(googleResults, localResults) {
    const seen = new Set();
    const merged = [];

    // Add Google results first
    googleResults.forEach(result => {
      const key = result.placeId || result.address;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ ...result, source: 'google' });
      }
    });

    // Add local results if not duplicate
    localResults.forEach(result => {
      const key = result.address;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    });

    return merged;
  }

  /**
   * Add to recent searches
   */
  addToRecent(place) {
    this.recentSearches = [
      place,
      ...this.recentSearches.filter(p => p.id !== place.id)
    ].slice(0, this.MAX_RECENT);
  }

  /**
   * Get place details
   */
  async getPlaceDetails(placeId, source = 'google') {
    if (source === 'google') {
      return await googlePlacesService.getPlaceDetails(placeId);
    }
    
    // Find in local places
    const allLocal = [...SAVED_PLACES, ...POPULAR_MALAWI_LOCATIONS];
    return allLocal.find(p => p.id === placeId);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.searchCache.clear();
  }
}

// Export singleton
const placeSearchService = new PlaceSearchService();
export default placeSearchService;