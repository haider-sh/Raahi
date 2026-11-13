import i18n from '@/i18n';
import { getApi } from '@/services/api/raahi-api';
import type { LatLng, LocalizedText, Place, SavedPlace } from '@/services/api/types';

import type { PlanPoint } from './store';

/**
 * Names a map point after the nearest stop ("Near Nagan Chowrangi"), in both languages, from our
 * own data. No reverse geocoder (D5).
 */
export async function nameForPoint(p: LatLng): Promise<LocalizedText | null> {
  try {
    const { stops } = await getApi().nearestStops(p, 1);
    const stop = stops[0]?.stop;
    if (!stop) return null;
    return {
      en: i18n.getFixedT('en')('plan.near', { name: stop.name.en }),
      ur: i18n.getFixedT('ur')('plan.near', { name: stop.name.ur }),
    };
  } catch {
    return null;
  }
}

/** For a map pick with no stop nearby. */
export const droppedPinName = (): LocalizedText => ({
  en: i18n.getFixedT('en')('plan.droppedPin'),
  ur: i18n.getFixedT('ur')('plan.droppedPin'),
});

/** A point's name in both languages, for saving with a trip. */
export function pointName(p: PlanPoint | null): LocalizedText {
  if (p?.name) return p.name;
  if (p && p.kind !== 'gps') return droppedPinName();
  return { en: i18n.getFixedT('en')('plan.myLocation'), ur: i18n.getFixedT('ur')('plan.myLocation') };
}

export const placeToPoint = (place: Place): PlanPoint => ({
  kind: 'place',
  location: place.location,
  name: place.name,
  placeId: place.id,
});

export const placeToSaved = (place: Place): SavedPlace => ({
  name: place.name,
  location: place.location,
  placeId: place.id,
});

export const savedToPoint = (saved: SavedPlace): PlanPoint => ({
  kind: 'place',
  location: saved.location,
  name: saved.name,
  placeId: saved.placeId,
});
