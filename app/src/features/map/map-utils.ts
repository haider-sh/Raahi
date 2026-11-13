import type { LngLat, LngLatBounds, ViewPadding, ViewState } from '@maplibre/maplibre-react-native';

import { boundsOf, haversineM } from '@/lib/geo';
import type { LatLng } from '@/services/api/types';

// MapLibre works in [lng, lat] arrays; the rest of the app uses { lat, lng }. Convert at the map edge only.
export const toLngLat = (p: LatLng): LngLat => [p.lng, p.lat];
export const fromLngLat = ([lng, lat]: LngLat): LatLng => ({ lat, lng });

/** What we persist between launches: where the map was looking. */
export type MapCamera = { center: LatLng; zoom: number };

/** The live view after a pan or zoom. */
export type Viewport = MapCamera & { bounds: LngLatBounds };

export const toViewport = (v: ViewState): Viewport => ({ center: fromLngLat(v.center), zoom: v.zoom, bounds: v.bounds });

/** Launch city centre, used until we have the user's location or a saved camera. */
export const KARACHI_CAMERA: MapCamera = { center: { lat: 24.905, lng: 67.08 }, zoom: 11 };

/** Zoom levels used across the app. 13 shows roughly 5 km of city on a phone screen. */
export const Zoom = {
  /** Stop markers only render at or above this zoom. */
  stopMarkers: 13,
  /** Centring on the user. */
  neighbourhood: 15,
  /** Focusing a single stop. */
  stop: 16,
} as const;

export const EDGE_PADDING: ViewPadding = { top: 48, right: 48, bottom: 48, left: 48 };

/** Smallest span (degrees) we fit to, so a single point or a very short walk doesn't zoom to street level. */
const MIN_SPAN = 0.005;

export function boundsFor(points: LatLng[]): LngLatBounds {
  const b = boundsOf(points);
  const padLat = Math.max(0, MIN_SPAN - (b.maxLat - b.minLat)) / 2;
  const padLng = Math.max(0, MIN_SPAN - (b.maxLng - b.minLng)) / 2;
  return [b.minLng - padLng, b.minLat - padLat, b.maxLng + padLng, b.maxLat + padLat];
}

export function inBounds(p: LatLng, [west, south, east, north]: LngLatBounds): boolean {
  return p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east;
}

/** Distance from the centre of the view to its corner: the radius that covers everything on screen. */
export function viewRadiusM(v: Viewport): number {
  const [, , east, north] = v.bounds;
  return Math.round(haversineM(v.center, { lat: north, lng: east }));
}
