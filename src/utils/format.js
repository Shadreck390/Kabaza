// src/utils/format.js

/**
 * Formatting utilities for dates, currency, distances, etc.
 */

// Format currency (Malawi Kwacha - MWK)
export const formatCurrency = (amount, currency = 'MWK') => {
  if (amount === null || amount === undefined) return '--';
  
  const formattedAmount = new Intl.NumberFormat('en-MW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  
  return `${currency} ${formattedAmount}`;
};

// Format distance (meters to km/m)
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return '--';
  
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  
  const kilometers = meters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)} km`;
  }
  
  return `${Math.round(kilometers)} km`;
};

// Format duration (minutes to hours/minutes)
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '--';
  
  if (minutes < 1) {
    return 'Less than a minute';
  }
  
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

// Format date to readable string
export const formatDate = (date, format = 'medium') => {
  if (!date) return '--';
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const options = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    medium: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    dateOnly: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  };
  
  return dateObj.toLocaleDateString('en-MW', options[format] || options.medium);
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '--';
  
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  
  return formatDate(timestamp, 'short');
};

// Format phone number for display
export const formatPhone = (phone) => {
  if (!phone) return '--';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format Malawi numbers
  if (digits.length === 9) {
    // Format: 088 123 456
    return `${digits.substr(0, 3)} ${digits.substr(3, 3)} ${digits.substr(6, 3)}`;
  }
  
  if (digits.length === 12 && digits.startsWith('265')) {
    // Format: +265 88 123 456
    return `+${digits.substr(0, 3)} ${digits.substr(3, 2)} ${digits.substr(5, 3)} ${digits.substr(8, 3)}`;
  }
  
  return phone;
};

// Format vehicle plate for display
export const formatVehiclePlate = (plate) => {
  if (!plate) return '--';
  
  // Remove spaces and hyphens, convert to uppercase
  const cleanPlate = plate.replace(/[\s\-]/g, '').toUpperCase();
  
  // Format: LL 1234 A
  if (cleanPlate.length >= 6) {
    const letters = cleanPlate.substr(0, 2);
    const numbers = cleanPlate.substr(2, 4);
    const suffix = cleanPlate.substr(6) || '';
    
    return `${letters} ${numbers}${suffix ? ' ' + suffix : ''}`;
  }
  
  return plate.toUpperCase();
};

// Format rating with stars
export const formatRating = (rating, maxStars = 5) => {
  if (rating === null || rating === undefined) return 'No rating';
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  let stars = '★'.repeat(fullStars);
  if (hasHalfStar) stars += '½';
  stars += '☆'.repeat(maxStars - fullStars - (hasHalfStar ? 1 : 0));
  
  return `${stars} (${rating.toFixed(1)})`;
};

// Format percentage
export const formatPercentage = (value, decimals = 0) => {
  if (value === null || value === undefined) return '--';
  
  return `${value.toFixed(decimals)}%`;
};

// Format large numbers (thousands, millions)
export const formatLargeNumber = (num) => {
  if (num === null || num === undefined) return '--';
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  
  return num.toString();
};

// Format address from location object
export const formatAddress = (location) => {
  if (!location) return 'Unknown location';
  
  if (typeof location === 'string') return location;
  
  if (location.address) return location.address;
  
  if (location.latitude && location.longitude) {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
  
  return 'Unknown location';
};

// Format ride status for display
export const formatRideStatus = (status) => {
  const statusMap = {
    searching: 'Searching for driver',
    matched: 'Driver matched',
    accepted: 'Driver accepted',
    arriving: 'Driver arriving',
    arrived: 'Driver arrived',
    ongoing: 'Trip in progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  
  return statusMap[status] || status;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  formatCurrency,
  formatDistance,
  formatDuration,
  formatDate,
  formatRelativeTime,
  formatPhone,
  formatVehiclePlate,
  formatRating,
  formatPercentage,
  formatLargeNumber,
  formatAddress,
  formatRideStatus,
  formatFileSize
};