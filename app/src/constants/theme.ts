import { useColorScheme } from 'react-native';

// High-contrast palette: it has to stay readable in direct sunlight on a cheap screen.
export const Colors = {
  light: {
    text: '#111814',
    textSecondary: '#4A5550',
    background: '#FFFFFF',
    surface: '#F2F5F3',
    surfaceStrong: '#E3E9E5',
    border: '#CBD5CF',
    primary: '#0B6E4F',
    onPrimary: '#FFFFFF',
    /** The "get off here" highlight. */
    highlight: '#FFF1C2',
    highlightBorder: '#E0A800',
    danger: '#B3261E',
    walk: '#5F6B66',
    overlay: 'rgba(0,0,0,0.35)',
  },
  dark: {
    text: '#F1F5F2',
    textSecondary: '#B4C0BA',
    background: '#0E1311',
    surface: '#1A211E',
    surfaceStrong: '#26302B',
    border: '#36423C',
    primary: '#3FBF8C',
    onPrimary: '#06140E',
    highlight: '#3D3108',
    highlightBorder: '#E0A800',
    danger: '#F2B8B5',
    walk: '#9AA6A0',
    overlay: 'rgba(0,0,0,0.55)',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function useColors(): Palette {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/**
 * Colours the app assigns to ride legs, in order, just to tell legs apart. They are not data
 * about the bus: Karachi buses have no consistent colour (D16).
 */
export const LegPalette = ['#1565C0', '#C62828', '#6A1B9A', '#EF6C00', '#00838F', '#2E7D32'] as const;

export const legColor = (rideIndex: number) => LegPalette[rideIndex % LegPalette.length];

/** 8-pt spacing scale. */
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Minimum touch target, in dp. */
export const TOUCH = 48;

export const Fonts = {
  /** Loaded in the root layout with expo-font. */
  urdu: 'NotoNastaliqUrdu_400Regular',
  urduBold: 'NotoNastaliqUrdu_700Bold',
} as const;

/** Nastaliq is tall and clips at normal line heights. */
export const URDU_LINE_HEIGHT = 2;
