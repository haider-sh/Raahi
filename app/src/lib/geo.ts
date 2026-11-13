// Pure geometry helpers. No React: this file is shared with the planner, which moves to the API.

import type { LatLng } from '@/services/api/types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Google encoded polyline, precision 5. */
export function encodePolyline(points: LatLng[]): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';
  for (const { lat, lng } of points) {
    const iLat = Math.round(lat * 1e5);
    const iLng = Math.round(lng * 1e5);
    result += encodeValue(iLat - lastLat) + encodeValue(iLng - lastLng);
    lastLat = iLat;
    lastLng = iLng;
  }
  return result;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let chunk = '';
  while (v >= 0x20) {
    chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return chunk + String.fromCharCode(v + 63);
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lng += next();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/**
 * Where `p` lands on the line, as a fractional vertex index (2.5 = halfway between vertex 2 and 3).
 * Uses a local equirectangular projection, which is accurate enough at city scale.
 */
export function projectOntoLine(line: LatLng[], p: LatLng, fromIndex = 0): number {
  if (line.length < 2) return 0;
  const kx = Math.cos(toRad(p.lat));
  let best = fromIndex;
  let bestD = Infinity;
  for (let i = Math.floor(fromIndex); i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const ax = a.lng * kx;
    const ay = a.lat;
    const dx = b.lng * kx - ax;
    const dy = b.lat - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((p.lng * kx - ax) * dx + (p.lat - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    if (i + t < fromIndex) t = fromIndex - i;
    const ex = ax + t * dx - p.lng * kx;
    const ey = ay + t * dy - p.lat;
    const d = ex * ex + ey * ey;
    if (d < bestD) {
      bestD = d;
      best = i + t;
    }
  }
  return best;
}

function pointAt(line: LatLng[], pos: number): LatLng {
  const i = Math.min(Math.floor(pos), line.length - 2);
  const t = pos - i;
  const a = line[i];
  const b = line[i + 1];
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/**
 * The part of `shape` between two stops. Each stop is snapped to the nearest point on the line,
 * and the end stop is searched for only after the start, so a shape that doubles back still
 * slices in travel order.
 */
export function sliceShape(shape: LatLng[], fromStop: LatLng, toStop: LatLng): LatLng[] {
  if (shape.length < 2) return [fromStop, toStop];
  const start = projectOntoLine(shape, fromStop);
  const end = projectOntoLine(shape, toStop, start);
  const out: LatLng[] = [pointAt(shape, start)];
  for (let i = Math.floor(start) + 1; i <= Math.floor(end) && i < shape.length; i++) {
    out.push(shape[i]);
  }
  const last = pointAt(shape, end);
  const prev = out[out.length - 1];
  if (prev.lat !== last.lat || prev.lng !== last.lng) out.push(last);
  return out;
}

/** Bounding region for a set of points, for the map camera. */
export function boundsOf(points: LatLng[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

export const WALK_M_PER_MIN = 75;

export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / WALK_M_PER_MIN));
}
