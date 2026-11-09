import type { ConfigContext, ExpoConfig } from 'expo/config';

// The Google Maps key is never committed (D13). Set GOOGLE_MAPS_API_KEY in a local
// .env for `expo run:android`, and as an EAS environment variable for cloud builds.
// Expo Go doesn't need it.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

// Without the key the manifest has no com.google.android.geo.API_KEY and every
// MapView crashes on mount, so fail the cloud build instead of shipping that APK.
if (!googleMapsApiKey && process.env.EAS_BUILD_PLATFORM === 'android') {
  throw new Error(
    'GOOGLE_MAPS_API_KEY is not set for this EAS build. Add it with `eas env:create` ' +
      "for the build profile's environment.",
  );
}

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
      "projectId": "4bc214f3-24dc-42c3-9585-860b14c99078"
    },
  },
});
