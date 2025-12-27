// src/constants/dimensions.js - FIXED VERSION
import { Dimensions, Platform } from 'react-native';

// Safely get dimensions with fallback
const getWindowDimensions = () => {
  try {
    const window = Dimensions.get('window');
    if (!window || typeof window.width !== 'number' || typeof window.height !== 'number') {
      return { width: 375, height: 667 }; // iPhone default fallback
    }
    return { width: window.width, height: window.height };
  } catch (error) {
    console.warn('Failed to get window dimensions:', error);
    return { width: 375, height: 667 };
  }
};

const getScreenDimensions = () => {
  try {
    const screen = Dimensions.get('screen');
    if (!screen || typeof screen.width !== 'number' || typeof screen.height !== 'number') {
      const window = getWindowDimensions();
      return { width: window.width, height: window.height };
    }
    return { width: screen.width, height: screen.height };
  } catch (error) {
    console.warn('Failed to get screen dimensions:', error);
    const window = getWindowDimensions();
    return { width: window.width, height: window.height };
  }
};

// Get window dimensions (usually available immediately)
const { width, height } = getWindowDimensions();

// Get screen dimensions with safety check
const { width: screenWidth, height: screenHeight } = getScreenDimensions();

export const DIMENSIONS = {
  WINDOW_WIDTH: width,
  WINDOW_HEIGHT: height,
  SCREEN_WIDTH: screenWidth,
  SCREEN_HEIGHT: screenHeight,
  
  // Platform
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  IS_SMALL_DEVICE: width < 375,
  IS_LARGE_DEVICE: width > 414,
  
  // Spacing (in pixels)
  SPACING: {
    XS: 4,
    S: 8,
    M: 12,
    L: 16,
    XL: 20,
    XXL: 24,
    XXXL: 32,
  },
  
  // Border Radius
  BORDER_RADIUS: {
    XS: 4,
    S: 6,
    M: 8,
    L: 12,
    XL: 16,
    ROUND: 999,
  },
  
  // Icon Sizes
  ICON_SIZE: {
    XS: 16,
    S: 20,
    M: 24,
    L: 32,
    XL: 40,
    XXL: 48,
  },
  
  // Button Sizes
  BUTTON_HEIGHT: {
    S: 36,
    M: 48,
    L: 56,
  },
  
  // Input Heights
  INPUT_HEIGHT: {
    S: 40,
    M: 48,
    L: 56,
  },
  
  // Card Sizes
  CARD_PADDING: 16,
  CARD_BORDER_RADIUS: 12,
  
  // Header
  HEADER_HEIGHT: 56,
  STATUS_BAR_HEIGHT: Platform.OS === 'ios' ? 44 : 24,
  
  // Bottom Tab
  TAB_BAR_HEIGHT: 60,
  
  // Map
  MAP_HEIGHT: 200,
  MAP_MARKER_SIZE: 40,
};

export default DIMENSIONS;