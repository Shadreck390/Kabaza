// src/constants/dimensions.js
import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const DIMENSIONS = {
  WINDOW_WIDTH: width,
  WINDOW_HEIGHT: height,
  SCREEN_WIDTH: Dimensions.get('screen').width,
  SCREEN_HEIGHT: Dimensions.get('screen').height,
  
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