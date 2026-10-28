import type { ConfigContext, ExpoConfig } from 'expo/config';

// The Google Maps key is never committed (D13). Set GOOGLE_MAPS_API_KEY in a local
// .env for `expo run:android`, and as an EAS environment variable for cloud builds.
// Expo Go doesn't need it.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Raahi',
  slug: 'Raahi',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'raahi',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'pk.raahi.app',
  },
  android: {
    package: 'pk.raahi.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B6E4F',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-localization',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Raahi uses your location to find the bus stop nearest you.',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
    },
  },
});
