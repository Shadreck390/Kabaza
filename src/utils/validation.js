// src/utils/validation.js

/**
 * Form validation utilities for Kabaza ride-hailing app
 */

// Phone number validation for Malawi
export const validatePhone = (phone) => {
  // Accepts formats: 0881234567, +265881234567, 265881234567
  const phoneRegex = /^(\+?265|0)(88|99|98|31)\d{7}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Name validation
export const validateName = (name) => {
  return name && name.trim().length >= 2;
};

// PIN validation (for OTP/verification)
export const validatePIN = (pin) => {
  const pinRegex = /^\d{4,6}$/;
  return pinRegex.test(pin);
};

// Vehicle registration plate validation (Malawi format)
export const validateVehiclePlate = (plate) => {
  // Format: LL 1234 A, LL-1234-A, LL1234A
  const plateRegex = /^[A-Z]{2}[\s\-]?\d{3,4}[\s\-]?[A-Z]?$/i;
  return plateRegex.test(plate.trim());
};

// Location coordinate validation
export const validateCoordinates = (lat, lng) => {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
};

// Ride request validation
export const validateRideRequest = (request) => {
  const errors = [];
  
  if (!request.pickupLocation || !request.pickupLocation.latitude || !request.pickupLocation.longitude) {
    errors.push('Valid pickup location is required');
  }
  
  if (!request.destination || !request.destination.latitude || !request.destination.longitude) {
    errors.push('Valid destination is required');
  }
  
  if (!request.vehicleType) {
    errors.push('Vehicle type is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Payment method validation
export const validatePaymentMethod = (method) => {
  const validMethods = ['cash', 'card', 'mobile_money', 'wallet'];
  return validMethods.includes(method);
};

// Rating validation (1-5 stars)
export const validateRating = (rating) => {
  return rating >= 1 && rating <= 5;
};

// Date validation
export const validateDate = (date) => {
  return !isNaN(Date.parse(date));
};

// Number validation with range
export const validateNumberRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

// Empty field validation
export const isFieldEmpty = (value) => {
  return !value || value.toString().trim() === '';
};

// Form validation helper
export const validateForm = (fields, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(fieldName => {
    const value = fields[fieldName];
    const fieldRules = rules[fieldName];
    
    if (fieldRules.required && isFieldEmpty(value)) {
      errors[fieldName] = fieldRules.requiredMessage || `${fieldName} is required`;
      return;
    }
    
    if (value && fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[fieldName] = fieldRules.patternMessage || `${fieldName} is invalid`;
    }
    
    if (value && fieldRules.minLength && value.length < fieldRules.minLength) {
      errors[fieldName] = fieldRules.minLengthMessage || `${fieldName} must be at least ${fieldRules.minLength} characters`;
    }
    
    if (value && fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors[fieldName] = fieldRules.maxLengthMessage || `${fieldName} must be less than ${fieldRules.maxLength} characters`;
    }
    
    if (value && fieldRules.validate) {
      const customError = fieldRules.validate(value, fields);
      if (customError) {
        errors[fieldName] = customError;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validation rules for common fields
export const VALIDATION_RULES = {
  PHONE: {
    required: true,
    pattern: /^(\+?265|0)(88|99|98|31)\d{7}$/,
    patternMessage: 'Please enter a valid Malawi phone number'
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Please enter a valid email address'
  },
  PASSWORD: {
    required: true,
    minLength: 6,
    minLengthMessage: 'Password must be at least 6 characters'
  },
  NAME: {
    required: true,
    minLength: 2,
    minLengthMessage: 'Name must be at least 2 characters'
  },
  PIN: {
    required: true,
    pattern: /^\d{4,6}$/,
    patternMessage: 'PIN must be 4-6 digits'
  }
};

export default {
  validatePhone,
  validateEmail,
  validatePassword,
  validateName,
  validatePIN,
  validateVehiclePlate,
  validateCoordinates,
  validateRideRequest,
  validatePaymentMethod,
  validateRating,
  validateDate,
  validateNumberRange,
  isFieldEmpty,
  validateForm,
  VALIDATION_RULES
};