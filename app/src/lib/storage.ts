// Typed, versioned AsyncStorage wrapper for non-secret data: preferences, recent searches,
// bookmarks and cached routes. Secrets and home/work go in ./secure-storage.ts instead (D22).

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Bookmark, LatLng, Place, RouteDetail } from '@/services/api/types';

export type MapRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

type Schema = {
  'prefs.language': 'en' | 'ur';
  /** The language RTL was last switched for, to stop a reload loop if the switch doesn't stick. */
  'prefs.rtlPending': 'en' | 'ur';
  'map.lastRegion': MapRegion;
  'search.recent': Place[];
  'saved.bookmarks': Bookmark[];
  /** Offline copies of bookmarked routes, by route id. */
  'saved.routeCache': Record<string, RouteDetail>;
  'saved.updatedAt': string;
  'saved.hintDismissed': boolean;
  'planner.lastGps': LatLng;
};

export type StorageKey = keyof Schema;

const VERSION = 1;
const prefix = 'raahi:';

export const storage = {
  async get<K extends StorageKey>(key: K): Promise<Schema[K] | null> {
    try {
      const raw = await AsyncStorage.getItem(prefix + key);
      if (raw == null) return null;
      const parsed = JSON.parse(raw) as { v: number; data: Schema[K] };
      return parsed.v === VERSION ? parsed.data : null;
    } catch {
      return null;
    }
  },

  async set<K extends StorageKey>(key: K, data: Schema[K]): Promise<void> {
    await AsyncStorage.setItem(prefix + key, JSON.stringify({ v: VERSION, data }));
  },

  async remove(key: StorageKey): Promise<void> {
    await AsyncStorage.removeItem(prefix + key);
  },
};
