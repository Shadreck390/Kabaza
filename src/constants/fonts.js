import { Platform } from 'react-native';

// Safe system fonts for iOS/Android
export const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif' });
export const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium' });
export const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif' }); // or 'sans-serif-black' for extra bold
