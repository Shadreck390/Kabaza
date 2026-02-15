// src/utils/formatters.js

// Currency formatting for Malawian Kwacha
export const formatCurrency = (amount, currency = 'MWK') => {
  if (amount === null || amount === undefined) return `${currency} 0`;
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : Number(amount);
  
  if (isNaN(numericAmount)) return `${currency} 0`;
  
  return `${currency} ${numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Format phone numbers for Malawi
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // Check if it's a Malawian number
  if (cleaned.startsWith('265')) {
    // Format as +265 xxx xxx xxx
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 12)}`;
  } else if (cleaned.startsWith('0')) {
    // Format local number as 0xxx xxx xxx
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
  } else {
    // Return as is
    return cleaned;
  }
};

// Format date and time
export const formatDate = (dateString, format = 'short') => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return '';
  
  const options = {
    short: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
    },
    datetime: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  };
  
  return date.toLocaleDateString('en-US', options[format] || options.short);
};

// Format distance in km or meters
export const formatDistance = (distanceInMeters, unit = 'km') => {
  if (distanceInMeters === null || distanceInMeters === undefined) return '0 m';
  
  if (unit === 'km') {
    const km = distanceInMeters / 1000;
    return km >= 1 
      ? `${km.toFixed(1)} km`
      : `${distanceInMeters.toFixed(0)} m`;
  } else {
    return `${distanceInMeters.toFixed(0)} m`;
  }
};

// Format duration in hours/minutes
export const formatDuration = (seconds) => {
  if (!seconds) return '0 min';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes} min`;
  }
};

// Format rating with stars
export const formatRating = (rating) => {
  if (!rating) return 'No rating';
  
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  
  if (isNaN(numericRating)) return 'No rating';
  
  return `${numericRating.toFixed(1)} ★`;
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(numericValue)) return '0%';
  
  return `${numericValue.toFixed(decimals)}%`;
};

// Format vehicle plate number (Malawi format)
export const formatPlateNumber = (plate) => {
  if (!plate) return '';
  
  // Remove spaces and convert to uppercase
  const cleaned = plate.toString().toUpperCase().replace(/\s/g, '');
  
  // Format as MJ xxx yyy (example: MJ 123 ABC)
  if (cleaned.length >= 7) {
    const prefix = cleaned.slice(0, 2);
    const numbers = cleaned.slice(2, 5);
    const letters = cleaned.slice(5, 8);
    return `${prefix} ${numbers} ${letters}`;
  }
  
  return cleaned;
};

// Format name (capitalize first letters)
export const formatName = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Format address (truncate if too long)
export const formatAddress = (address, maxLength = 30) => {
  if (!address) return '';
  
  if (address.length <= maxLength) return address;
  
  return `${address.substring(0, maxLength - 3)}...`;
};

// Format numbers with commas
export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  
  const numericValue = typeof number === 'string' ? parseFloat(number) : Number(number);
  
  if (isNaN(numericValue)) return '0';
  
  return numericValue.toLocaleString('en-US');
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format time ago (like "2 hours ago")
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  
  return 'just now';
};

// Format social security or ID number
export const formatIDNumber = (id) => {
  if (!id) return '';
  
  const cleaned = id.toString().replace(/\D/g, '');
  
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}`;
  }
  
  return cleaned;
};

// Format coordinates
export const formatCoordinates = (latitude, longitude, decimals = 6) => {
  if (!latitude || !longitude) return '';
  
  const lat = Number(latitude).toFixed(decimals);
  const lng = Number(longitude).toFixed(decimals);
  
  return `${lat}, ${lng}`;
};

// Format bank account number
export const formatAccountNumber = (accountNumber) => {
  if (!accountNumber) return '';
  
  const cleaned = accountNumber.toString().replace(/\D/g, '');
  
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
  
  return cleaned;
};

// Format verification code (spaces every 3 digits)
export const formatVerificationCode = (code) => {
  if (!code) return '';
  
  const cleaned = code.toString().replace(/\D/g, '');
  
  return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
};

// Export all formatters
export default {
  formatCurrency,
  formatPhoneNumber,
  formatDate,
  formatDistance,
  formatDuration,
  formatRating,
  formatPercentage,
  formatPlateNumber,
  formatName,
  formatAddress,
  formatNumber,
  formatFileSize,
  formatTimeAgo,
  formatIDNumber,
  formatCoordinates,
  formatAccountNumber,
  formatVerificationCode,
};