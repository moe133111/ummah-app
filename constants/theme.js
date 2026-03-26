/**
 * Imaniq Theme System
 * Islamische Ästhetik: Dunkelgrün + Gold + meditatives Dark-Mode
 */

export const Colors = {
  // Primary
  green: '#1B5E20',
  greenLight: '#2E7D32',
  greenSoft: '#4CAF50',
  greenBg: '#E8F5E9',

  // Accent
  gold: '#B8860B',
  goldLight: '#D4A843',
  goldDim: '#8B7430',
  goldBg: 'rgba(184, 134, 11, 0.1)',

  // Dark Mode
  darkBg: '#0A1628',
  darkCard: '#0F1F38',
  darkSurface: '#121F36',
  darkBorder: '#1A3055',

  // Light Mode
  lightBg: '#F8F6F0',
  lightCard: '#FFFFFF',
  lightSurface: '#F0EDE6',
  lightBorder: '#E0DCD4',

  // Text
  textLight: '#E8E0D4',
  textLightDim: '#8B9BB4',
  textDark: '#1A1A2E',
  textDarkDim: '#666666',

  // Semantic
  success: '#2E7D32',
  warning: '#F57C00',
  error: '#C62828',
  info: '#0D47A1',

  // Common
  white: '#FFFFFF',
  black: '#000000',
};

export const DarkTheme = {
  bg: Colors.darkBg,
  card: Colors.darkCard,
  surface: Colors.darkSurface,
  border: Colors.darkBorder,
  text: Colors.textLight,
  textDim: Colors.textLightDim,
  primary: Colors.green,
  accent: Colors.gold,
  accentLight: Colors.goldLight,
};

export const LightTheme = {
  bg: Colors.lightBg,
  card: Colors.lightCard,
  surface: Colors.lightSurface,
  border: Colors.lightBorder,
  text: Colors.textDark,
  textDim: Colors.textDarkDim,
  primary: Colors.green,
  accent: Colors.gold,
  accentLight: Colors.goldLight,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  arabic: 22,
  arabicLarge: 28,
  title: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
