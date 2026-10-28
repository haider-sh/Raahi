import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager, Platform } from 'react-native';

import type { Lang } from '@/lib/format';
import { storage } from '@/lib/storage';

import en from './locales/en.json';
import ur from './locales/ur.json';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
];

const deviceLanguage = (): Lang => (getLocales()[0]?.languageCode === 'ur' ? 'ur' : 'en');

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

/** Expo Go resets RTL on launch, so runtime RTL switching only works in a dev or release build. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const currentLanguage = (): Lang => (i18n.language === 'ur' ? 'ur' : 'en');

async function reload() {
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates can't reload in some debug setups; the dev menu reload always works there.
    if (__DEV__) DevSettings.reload();
  }
}

/** Makes the native layout direction match `lang`. Returns true if a reload was started. */
async function syncDirection(lang: Lang): Promise<boolean> {
  const shouldBeRTL = lang === 'ur';
  if (Platform.OS === 'web' || isExpoGo || shouldBeRTL === I18nManager.isRTL) {
    await storage.remove('prefs.rtlPending');
    return false;
  }
  // If we already reloaded for this language and the direction still doesn't match, give up
  // rather than reload forever.
  if ((await storage.get('prefs.rtlPending')) === lang) {
    await storage.remove('prefs.rtlPending');
    return false;
  }
  await storage.set('prefs.rtlPending', lang);
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  await reload();
  return true;
}

/** At boot: apply the saved language choice (or the device's) and fix the layout direction. */
export async function restoreLanguage(): Promise<void> {
  const lang = (await storage.get('prefs.language')) ?? deviceLanguage();
  if (lang !== i18n.language) await i18n.changeLanguage(lang);
  await syncDirection(lang);
}

/** From Settings: persist, switch strings, and flip RTL (which needs an app reload). */
export async function setLanguage(lang: Lang): Promise<void> {
  await storage.set('prefs.language', lang);
  await i18n.changeLanguage(lang);
  await syncDirection(lang);
}
