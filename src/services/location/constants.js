// src/services/location/constants.js

// Location types
export const LOCATION_TYPES = {
  SAVED: 'saved',
  POPULAR: 'popular',
  RECENT: 'recent',
  GOOGLE: 'google',
  CURRENT: 'current'
};

// Default saved places (like home, work)
export const SAVED_PLACES = [
  {
    id: 'saved_home',
    name: 'Home',
    address: '123 Your Street, Lilongwe',
    latitude: -13.9626,
    longitude: 33.7741,
    icon: 'home',
    type: 'saved'
  },
  {
    id: 'saved_work',
    name: 'Work',
    address: '456 Office Road, Lilongwe',
    latitude: -13.9726,
    longitude: 33.7841,
    icon: 'briefcase',
    type: 'saved'
  }
];

// Popular locations in Malawi
export const POPULAR_MALAWI_LOCATIONS = [
  {
    id: 'popular_llw_center',
    name: 'Lilongwe City Center',
    address: 'Lilongwe, Malawi',
    latitude: -13.9626,
    longitude: 33.7741,
    icon: 'city',
    type: 'popular'
  },
  {
    id: 'popular_blantyre',
    name: 'Blantyre CBD',
    address: 'Blantyre, Malawi',
    latitude: -15.7861,
    longitude: 35.0058,
    icon: 'city',
    type: 'popular'
  },
  {
    id: 'popular_mzuzu',
    name: 'Mzuzu',
    address: 'Mzuzu, Malawi',
    latitude: -11.4656,
    longitude: 34.0207,
    icon: 'city',
    type: 'popular'
  },
  {
    id: 'popular_zomba',
    name: 'Zomba',
    address: 'Zomba, Malawi',
    latitude: -15.3766,
    longitude: 35.3356,
    icon: 'city',
    type: 'popular'
  }
];

// Search settings
export const SEARCH_DEBOUNCE_TIME = 500; // ms
export const MIN_SEARCH_CHARS = 2;