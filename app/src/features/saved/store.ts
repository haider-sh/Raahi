// Saved items: home, work and bookmarks. Local-first (D20): every change is written on the
// device first; ./sync.ts then pushes it to the account in the background when signed in.
//
// Home/work → secure storage (D22). Bookmarks, the route cache and updatedAt → AsyncStorage.

import { create } from 'zustand';

import { secureStorage } from '@/lib/secure-storage';
import { storage } from '@/lib/storage';
import type { Bookmark, LocalizedText, RouteDetail, SavedPlace, TripOption, UserData } from '@/services/api/types';

export const MAX_SAVED_TRIPS = 20;
export const MAX_SAVED_ROUTES = 20;

type SavedState = {
  hydrated: boolean;
  home: SavedPlace | null;
  work: SavedPlace | null;
  bookmarks: Bookmark[];
  /** Offline copies of bookmarked routes (both directions), by route id. */
  routeCache: Record<string, RouteDetail>;
  updatedAt: string;
};

const EPOCH = new Date(0).toISOString();

export const useSavedStore = create<SavedState>(() => ({
  hydrated: false,
  home: null,
  work: null,
  bookmarks: [],
  routeCache: {},
  updatedAt: EPOCH,
}));

const listeners = new Set<() => void>();
/** Called after every local change (not after applying data from the server). */
export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hydrateSaved(): Promise<void> {
  const [home, work, bookmarks, routeCache, updatedAt] = await Promise.all([
    secureStorage.get('place.home'),
    secureStorage.get('place.work'),
    storage.get('saved.bookmarks'),
    storage.get('saved.routeCache'),
    storage.get('saved.updatedAt'),
  ]);
  useSavedStore.setState({
    hydrated: true,
    home,
    work,
    bookmarks: bookmarks ?? [],
    routeCache: routeCache ?? {},
    updatedAt: updatedAt ?? EPOCH,
  });
}

async function persistPlace(which: 'home' | 'work', place: SavedPlace | null) {
  const key = which === 'home' ? 'place.home' : 'place.work';
  if (place) await secureStorage.set(key, place);
  else await secureStorage.remove(key);
}

async function commit(change: Partial<Pick<SavedState, 'home' | 'work' | 'bookmarks'>>) {
  const updatedAt = new Date().toISOString();
  useSavedStore.setState({ ...change, updatedAt });
  const writes: Promise<void>[] = [storage.set('saved.updatedAt', updatedAt)];
  if ('home' in change) writes.push(persistPlace('home', change.home ?? null));
  if ('work' in change) writes.push(persistPlace('work', change.work ?? null));
  if (change.bookmarks) writes.push(storage.set('saved.bookmarks', change.bookmarks));
  await Promise.all(writes);
  listeners.forEach((l) => l());
}

export function setSavedPlace(which: 'home' | 'work', place: SavedPlace | null) {
  return commit({ [which]: place });
}

export const tripBookmarkId = (tripId: string) => `b_trip_${tripId}`;
export const routeBookmarkId = (routeId: string) => `b_route_${routeId}`;

export function saveTrip(trip: TripOption, fromName: LocalizedText, toName: LocalizedText) {
  const { bookmarks } = useSavedStore.getState();
  const id = tripBookmarkId(trip.id);
  if (bookmarks.some((b) => b.id === id)) return Promise.resolve();
  const trips = bookmarks.filter((b) => b.kind === 'trip');
  // Over the cap, the oldest trip goes.
  const dropped = trips.length >= MAX_SAVED_TRIPS ? trips[trips.length - 1].id : null;
  const next: Bookmark = { id, kind: 'trip', trip, fromName, toName, savedAt: new Date().toISOString() };
  return commit({ bookmarks: [next, ...bookmarks.filter((b) => b.id !== dropped)] });
}

export async function saveRoute(detail: RouteDetail) {
  const { bookmarks } = useSavedStore.getState();
  const id = routeBookmarkId(detail.route.id);
  await cacheRoute(detail);
  if (bookmarks.some((b) => b.id === id)) return;
  const routes = bookmarks.filter((b) => b.kind === 'route');
  const dropped = routes.length >= MAX_SAVED_ROUTES ? routes[routes.length - 1].id : null;
  const next: Bookmark = { id, kind: 'route', routeId: detail.route.id, savedAt: new Date().toISOString() };
  await commit({ bookmarks: [next, ...bookmarks.filter((b) => b.id !== dropped)] });
}

export async function removeBookmark(id: string) {
  const { bookmarks, routeCache } = useSavedStore.getState();
  const target = bookmarks.find((b) => b.id === id);
  if (!target) return;
  if (target.kind === 'route') {
    const { [target.routeId]: _removed, ...rest } = routeCache;
    useSavedStore.setState({ routeCache: rest });
    await storage.set('saved.routeCache', rest);
  }
  await commit({ bookmarks: bookmarks.filter((b) => b.id !== id) });
}

/** Store or refresh the offline copy of a route. Not a user change, so it doesn't sync. */
export async function cacheRoute(detail: RouteDetail) {
  const routeCache = { ...useSavedStore.getState().routeCache, [detail.route.id]: detail };
  useSavedStore.setState({ routeCache });
  await storage.set('saved.routeCache', routeCache);
}

export function toUserData(): UserData {
  const { home, work, bookmarks, updatedAt } = useSavedStore.getState();
  return { home, work, bookmarks, updatedAt };
}

/** Replace local saved data with the server's copy (it was newer). */
export async function applyUserData(data: UserData) {
  useSavedStore.setState({ home: data.home, work: data.work, bookmarks: data.bookmarks, updatedAt: data.updatedAt });
  await Promise.all([
    persistPlace('home', data.home),
    persistPlace('work', data.work),
    storage.set('saved.bookmarks', data.bookmarks),
    storage.set('saved.updatedAt', data.updatedAt),
  ]);
}

/** Last write wins (D24). */
export const isNewer = (a: UserData, b: UserData) => Date.parse(a.updatedAt) > Date.parse(b.updatedAt);
