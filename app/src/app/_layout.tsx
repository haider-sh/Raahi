import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { bootSession } from '@/features/account/session';
import { hydrateSaved } from '@/features/saved/store';
import { startSync } from '@/features/saved/sync';
import { restoreLanguage } from '@/i18n';
import { isApiError } from '@/services/api/errors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Only network failures are worth retrying; a 4xx will say the same thing again.
      retry: (count, error) => isApiError(error, 'NETWORK') && count < 2,
    },
  },
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const { t } = useTranslation();
  const [booted, setBooted] = useState(false);
  const [fontsLoaded, fontError] = useFonts({ NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold });

  useEffect(() => {
    let stopSync: (() => void) | undefined;
    (async () => {
      // Language first: it may reload the app to flip RTL.
      await restoreLanguage();
      await Promise.all([hydrateSaved(), bootSession()]);
      stopSync = startSync();
      setBooted(true);
    })();
    return () => stopSync?.();
  }, []);

  const ready = booted && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const theme = {
    ...base,
    colors: { ...base.colors, primary: palette.primary, background: palette.background, card: palette.background },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="search" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="options" options={{ title: t('options.title') }} />
          <Stack.Screen name="trip/[id]" options={{ title: t('trip.title') }} />
          <Stack.Screen name="route/[id]" options={{ title: '' }} />
          <Stack.Screen name="stop/[id]" options={{ title: '' }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: '' }} />
          <Stack.Screen name="about" options={{ title: t('about.title') }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
