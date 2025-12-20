// src/constants/colors.js

/**
 * Light Green Theme for Kabaza Ride-Hailing App
 * Fresh, clean, and professional color palette
 */

export const COLORS = {
  // ====================
  // PRIMARY GREEN THEME
  // ====================
  PRIMARY: '#22C55E',        // Vibrant green (main brand color)
  PRIMARY_DARK: '#16A34A',   // Darker green for pressed states
  PRIMARY_LIGHT: '#86EFAC',  // Light green for backgrounds
  PRIMARY_SOFT: '#DCFCE7',   // Very light green for subtle backgrounds
  
  // ====================
  // SECONDARY COLORS
  // ====================
  SECONDARY: '#3B82F6',      // Blue for secondary actions
  SECONDARY_DARK: '#2563EB',
  SECONDARY_LIGHT: '#93C5FD',
  
  ACCENT: '#F59E0B',         // Amber for highlights/notifications
  ACCENT_DARK: '#D97706',
  ACCENT_LIGHT: '#FDE68A',
  
  // ====================
  // STATUS COLORS
  // ====================
  SUCCESS: '#10B981',        // Green for success states
  SUCCESS_DARK: '#059669',
  SUCCESS_LIGHT: '#A7F3D0',
  SUCCESS_BG: '#ECFDF5',
  
  WARNING: '#F59E0B',        // Amber for warnings
  WARNING_DARK: '#D97706',
  WARNING_LIGHT: '#FDE68A',
  WARNING_BG: '#FFFBEB',
  
  ERROR: '#EF4444',          // Red for errors/danger
  ERROR_DARK: '#DC2626',
  ERROR_LIGHT: '#FCA5A5',
  ERROR_BG: '#FEF2F2',
  
  INFO: '#3B82F6',           // Blue for information
  INFO_DARK: '#2563EB',
  INFO_LIGHT: '#93C5FD',
  INFO_BG: '#EFF6FF',
  
  // ====================
  // NEUTRAL COLORS
  // ====================
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  
  GRAY_50: '#FAFAFA',
  GRAY_100: '#F5F5F5',
  GRAY_200: '#E5E5E5',
  GRAY_300: '#D4D4D4',
  GRAY_400: '#A3A3A3',
  GRAY_500: '#737373',
  GRAY_600: '#525252',
  GRAY_700: '#404040',
  GRAY_800: '#262626',
  GRAY_900: '#171717',
  
  // ====================
  // TEXT COLORS
  // ====================
  TEXT_PRIMARY: '#171717',    // Almost black for main text
  TEXT_SECONDARY: '#525252',  // Dark gray for secondary text
  TEXT_TERTIARY: '#A3A3A3',   // Light gray for hints/placeholders
  TEXT_DISABLED: '#D4D4D4',   // Gray for disabled text
  TEXT_LIGHT: '#FFFFFF',      // White for text on dark backgrounds
  TEXT_INVERSE: '#FFFFFF',    // Text on primary backgrounds
  
  // ====================
  // BACKGROUND COLORS
  // ====================
  BACKGROUND: '#FFFFFF',      // Main app background
  BACKGROUND_ALT: '#FAFAFA',  // Alternate background
  BACKGROUND_CARD: '#FFFFFF', // Card backgrounds
  BACKGROUND_MODAL: 'rgba(0, 0, 0, 0.5)', // Modal overlay
  
  SURFACE: '#FFFFFF',         // Surface colors (cards, sheets)
  SURFACE_ELEVATED: '#F8FAFC', // Elevated surfaces
  
  // ====================
  // BORDER COLORS
  // ====================
  BORDER: '#E5E5E5',          // Default borders
  BORDER_LIGHT: '#F5F5F5',    // Light borders
  BORDER_DARK: '#D4D4D4',     // Dark borders
  BORDER_FOCUS: '#22C55E',    // Focus state border
  
  // ====================
  // BUTTON COLORS
  // ====================
  BUTTON_PRIMARY: '#22C55E',
  BUTTON_PRIMARY_TEXT: '#FFFFFF',
  BUTTON_PRIMARY_DISABLED: '#86EFAC',
  
  BUTTON_SECONDARY: '#3B82F6',
  BUTTON_SECONDARY_TEXT: '#FFFFFF',
  
  BUTTON_OUTLINE: 'transparent',
  BUTTON_OUTLINE_BORDER: '#22C55E',
  BUTTON_OUTLINE_TEXT: '#22C55E',
  
  BUTTON_GHOST: 'transparent',
  BUTTON_GHOST_TEXT: '#525252',
  
  BUTTON_DISABLED: '#E5E5E5',
  BUTTON_DISABLED_TEXT: '#A3A3A3',
  
  // ====================
  // INPUT COLORS
  // ====================
  INPUT_BACKGROUND: '#FFFFFF',
  INPUT_BORDER: '#E5E5E5',
  INPUT_BORDER_FOCUS: '#22C55E',
  INPUT_PLACEHOLDER: '#A3A3A3',
  INPUT_TEXT: '#171717',
  INPUT_LABEL: '#525252',
  INPUT_ERROR_BORDER: '#EF4444',
  INPUT_ERROR_BACKGROUND: '#FEF2F2',
  
  // ====================
  // VEHICLE TYPE COLORS
  // ====================
  VEHICLE_MOTORCYCLE: '#22C55E',  // Green
  VEHICLE_CAR: '#3B82F6',         // Blue
  VEHICLE_MINIBUS: '#8B5CF6',     // Purple
  VEHICLE_BICYCLE: '#F59E0B',     // Amber
  VEHICLE_PREMIUM: '#EC4899',     // Pink
  VEHICLE_XL: '#EF4444',          // Red
  
  // ====================
  // RIDE STATUS COLORS
  // ====================
  RIDE_SEARCHING: '#F59E0B',      // Amber
  RIDE_MATCHED: '#3B82F6',        // Blue
  RIDE_ACCEPTED: '#22C55E',       // Green
  RIDE_ARRIVING: '#8B5CF6',       // Purple
  RIDE_ONGOING: '#0EA5E9',        // Sky blue
  RIDE_COMPLETED: '#6B7280',      // Gray
  RIDE_CANCELLED: '#EF4444',      // Red
  
  // ====================
  // MAP COLORS
  // ====================
  MAP_ROUTE: '#22C55E',           // Green route line
  MAP_PICKUP: '#3B82F6',          // Blue pickup pin
  MAP_DESTINATION: '#EF4444',     // Red destination pin
  MAP_DRIVER: '#8B5CF6',          // Purple driver pin
  MAP_CURRENT_LOCATION: '#F59E0B', // Amber current location
  
  // ====================
  // CHAT COLORS
  // ====================
  CHAT_BUBBLE_SENT: '#22C55E',    // Green for sent messages
  CHAT_BUBBLE_RECEIVED: '#F3F4F6', // Gray for received messages
  CHAT_TEXT_SENT: '#FFFFFF',
  CHAT_TEXT_RECEIVED: '#171717',
  CHAT_TIME_TEXT: '#A3A3A3',
  
  // ====================
  // SHADOWS
  // ====================
  SHADOW_SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  SHADOW_MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  SHADOW_LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  SHADOW_XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  
  // ====================
  // GRADIENTS
  // ====================
  GRADIENT_PRIMARY: ['#22C55E', '#16A34A'],
  GRADIENT_SECONDARY: ['#3B82F6', '#2563EB'],
  GRADIENT_SUCCESS: ['#10B981', '#059669'],
  GRADIENT_WARNING: ['#F59E0B', '#D97706'],
  GRADIENT_ERROR: ['#EF4444', '#DC2626'],
  
  // ====================
  // TRANSPARENT COLORS
  // ====================
  TRANSPARENT: 'transparent',
  OVERLAY: 'rgba(0, 0, 0, 0.5)',
  BACKDROP: 'rgba(0, 0, 0, 0.3)',
  
  // ====================
  // SOCIAL MEDIA COLORS
  // ====================
  FACEBOOK: '#1877F2',
  GOOGLE: '#4285F4',
  APPLE: '#000000',
  WHATSAPP: '#25D366',
};

// Helper functions
export const ColorUtils = {
  // Opacity variants
  withOpacity: (color, opacity) => {
    if (color.startsWith('#')) {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },
  
  // Lighten color
  lighten: (color, percent) => {
    // Simplified lightening (for hex colors)
    return color; // You can implement actual color manipulation here
  },
  
  // Darken color
  darken: (color, percent) => {
    return color;
  },
  
  // Get status color
  getStatusColor: (status) => {
    const statusColors = {
      searching: COLORS.RIDE_SEARCHING,
      matched: COLORS.RIDE_MATCHED,
      accepted: COLORS.RIDE_ACCEPTED,
      arriving: COLORS.RIDE_ARRIVING,
      ongoing: COLORS.RIDE_ONGOING,
      completed: COLORS.RIDE_COMPLETED,
      cancelled: COLORS.RIDE_CANCELLED,
    };
    return statusColors[status] || COLORS.GRAY_400;
  },
  
  // Get vehicle color
  getVehicleColor: (vehicleType) => {
    const vehicleColors = {
      motorcycle: COLORS.VEHICLE_MOTORCYCLE,
      car: COLORS.VEHICLE_CAR,
      minibus: COLORS.VEHICLE_MINIBUS,
      bicycle: COLORS.VEHICLE_BICYCLE,
      premium: COLORS.VEHICLE_PREMIUM,
      xl: COLORS.VEHICLE_XL,
    };
    return vehicleColors[vehicleType] || COLORS.PRIMARY;
  },
};

export default COLORS;