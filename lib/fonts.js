import { Platform } from 'react-native';

export function getArabicDisplayFont() {
  return Platform.select({
    ios: 'Geeza Pro',
    android: 'serif',
    default: 'serif',
  });
}

export function getArabicTextFont() {
  return Platform.select({
    ios: 'Geeza Pro',
    android: 'serif',
    default: 'serif',
  });
}

// Custom fonts loaded via expo-font — fall back to system fonts if not available
export const FONTS = {
  arabicDisplay: 'ScheherazadeNew-Bold',
  arabicDisplayRegular: 'ScheherazadeNew',
  arabicText: 'ScheherazadeNew',
  arabicTextBold: 'ScheherazadeNew-Bold',
};
