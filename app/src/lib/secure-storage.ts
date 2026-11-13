// Typed wrapper over expo-secure-store (Android Keystore-backed encryption).
//
// ONLY the keys below belong here: auth tokens and the home/work locations (D22). SecureStore is
// meant for small values, so bookmarks, trips and preferences stay in ./storage.ts. Don't add
// keys for anything that isn't secret or personal.

import * as SecureStore from 'expo-secure-store';

import type { AuthTokens, SavedPlace } from '@/services/api/types';

type Schema = {
  'auth.tokens': AuthTokens;
  'place.home': SavedPlace;
  'place.work': SavedPlace;
};

export type SecureKey = keyof Schema;

const VERSION = 1;

export const secureStorage = {
  async get<K extends SecureKey>(key: K): Promise<Schema[K] | null> {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw == null) return null;
      const parsed = JSON.parse(raw) as { v: number; data: Schema[K] };
      return parsed.v === VERSION ? parsed.data : null;
    } catch {
      return null;
    }
  },

  async set<K extends SecureKey>(key: K, data: Schema[K]): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify({ v: VERSION, data }));
  },

  async remove(key: SecureKey): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
