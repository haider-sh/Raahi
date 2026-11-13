import { storage } from '@/lib/storage';
import type { Place } from '@/services/api/types';

const MAX_RECENT = 8;

export async function getRecentPlaces(): Promise<Place[]> {
  return (await storage.get('search.recent')) ?? [];
}

export async function addRecentPlace(place: Place): Promise<void> {
  const recent = await getRecentPlaces();
  await storage.set('search.recent', [place, ...recent.filter((p) => p.id !== place.id)].slice(0, MAX_RECENT));
}
