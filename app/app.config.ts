import type { ConfigContext, ExpoConfig } from 'expo/config';

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
    // MapLibre with OpenFreeMap tiles: no API key (D32). Needs a development build, not Expo Go.
    '@maplibre/maplibre-react-native',
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
