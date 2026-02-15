// src/utils/vehicleValidation.js

export const validatePlateNumber = (plateNumber) => {
  if (!plateNumber || plateNumber.trim() === '') {
    return {
      isValid: false,
      message: 'Plate number is required',
    };
  }

  // Malawi plate number format: MJ 123 ABC or similar
  const cleaned = plateNumber.trim().toUpperCase().replace(/\s/g, '');
  
  if (cleaned.length < 5) {
    return {
      isValid: false,
      message: 'Plate number is too short',
    };
  }

  // Basic validation - can be enhanced
  const hasLetters = /[A-Z]/.test(cleaned);
  const hasNumbers = /\d/.test(cleaned);

  if (!hasLetters || !hasNumbers) {
    return {
      isValid: false,
      message: 'Plate number should contain both letters and numbers',
    };
  }

  return {
    isValid: true,
    message: 'Valid plate number',
    formatted: formatPlateNumber(cleaned),
  };
};

export const validateVehicleData = (vehicleData) => {
  const errors = {};

  // Validate make
  if (!vehicleData.make || vehicleData.make.trim() === '') {
    errors.make = 'Vehicle make is required';
  }

  // Validate model
  if (!vehicleData.model || vehicleData.model.trim() === '') {
    errors.model = 'Vehicle model is required';
  }

  // Validate year
  if (!vehicleData.year) {
    errors.year = 'Manufacturing year is required';
  } else {
    const currentYear = new Date().getFullYear();
    const year = parseInt(vehicleData.year);
    
    if (isNaN(year) || year < 1900 || year > currentYear + 1) {
      errors.year = 'Please enter a valid year';
    }
  }

  // Validate color
  if (!vehicleData.color || vehicleData.color.trim() === '') {
    errors.color = 'Vehicle color is required';
  }

  // Validate capacity
  if (!vehicleData.capacity) {
    errors.capacity = 'Passenger capacity is required';
  } else {
    const capacity = parseInt(vehicleData.capacity);
    if (isNaN(capacity) || capacity < 1 || capacity > 10) {
      errors.capacity = 'Capacity must be between 1 and 10';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateInsurance = (insuranceData) => {
  if (!insuranceData.policyNumber || insuranceData.policyNumber.trim() === '') {
    return {
      isValid: false,
      message: 'Insurance policy number is required',
    };
  }

  if (!insuranceData.expiryDate) {
    return {
      isValid: false,
      message: 'Insurance expiry date is required',
    };
  }

  const expiryDate = new Date(insuranceData.expiryDate);
  const today = new Date();

  if (expiryDate < today) {
    return {
      isValid: false,
      message: 'Insurance has expired',
    };
  }

  return {
    isValid: true,
    message: 'Valid insurance data',
  };
};

const formatPlateNumber = (plate) => {
  // Format as MJ 123 ABC
  if (plate.length >= 7) {
    const prefix = plate.slice(0, 2);
    const numbers = plate.slice(2, 5);
    const letters = plate.slice(5, 8);
    return `${prefix} ${numbers} ${letters}`;
  }
  return plate;
};

export default {
  validatePlateNumber,
  validateVehicleData,
  validateInsurance,
};