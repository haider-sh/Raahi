import type { LatLng as MapLatLng, Region } from 'react-native-maps';

import { boundsOf } from '@/lib/geo';
import type { LatLng } from '@/services/api/types';

export const toCoord = (p: LatLng): MapLatLng => ({ latitude: p.lat, longitude: p.lng });
export const fromCoord = (c: MapLatLng): LatLng => ({ lat: c.latitude, lng: c.longitude });

/** Launch city centre, used until we have the user's location or a saved region. */
export const KARACHI_REGION: Region = {
  latitude: 24.905,
  longitude: 67.08,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

/** Stop markers only render when zoomed in at least this far (latitude span in degrees). */
export const STOP_MARKER_MAX_DELTA = 0.06;

export const EDGE_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

export function regionFor(points: LatLng[], pad = 1.4): Region {
  const b = boundsOf(points);
  return {
    latitude: (b.minLat + b.maxLat) / 2,
    longitude: (b.minLng + b.maxLng) / 2,
    latitudeDelta: Math.max(0.01, (b.maxLat - b.minLat) * pad),
    longitudeDelta: Math.max(0.01, (b.maxLng - b.minLng) * pad),
  };
}

export function inRegion(p: LatLng, r: Region): boolean {
  return (
    Math.abs(p.lat - r.latitude) <= r.latitudeDelta / 2 && Math.abs(p.lng - r.longitude) <= r.longitudeDelta / 2
  );
}
