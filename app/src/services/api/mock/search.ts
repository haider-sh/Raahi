// Text search over stops, landmarks and routes. Pure TypeScript, portable to api/.

import { haversineM } from '../../../lib/geo';
import type { LatLng, LocalizedText, Place, RouteSummary } from '../types';
import { type Network, routesAtStop } from './network';

/**
 * Lower-case; strip Latin accents and Urdu/Arabic diacritics (aerab); unify the Arabic and Urdu
 * forms of ی, ک and ہ; turn Urdu/Arabic digits into ASCII; drop spaces and punctuation.
 * "D-7", "d 7" and "D7" all become "d7"; "ڈی 7" becomes "ڈی7".
 */
export function normalize(text: string): string {
  const lower = text.toLowerCase();
  // normalize() needs Intl on some JS engines; without it we only lose accent folding.
  return (typeof lower.normalize === 'function' ? lower.normalize('NFKD') : lower)
    .replace(/[̀-ͯ]/g, '') // Latin combining accents
    .replace(/[ً-ٰٟۖ-ۭ]/g, '') // Arabic/Urdu diacritics
    .replace(/[يى]/g, 'ی') // ي ى → ی
    .replace(/ك/g, 'ک') // ك → ک
    .replace(/ه/g, 'ہ') // ه → ہ
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(NON_WORD, '');
}

/**
 * Spaces, punctuation and symbols in Latin and Arabic script. An explicit list rather than
 * /[^\p{L}\p{N}]/u, because Unicode property escapes aren't supported by every JS engine.
 */
const NON_WORD = /[\s!-/:-@[-`{-~ -¿،؛؟٪-٭۔ -⁯]/g;

/** Split into words before normalising, so "Nagan Chowrangi" can match "chow". */
function words(text: string): string[] {
  return text.split(/[\s\-/.,()]+/).map(normalize).filter(Boolean);
}

/** 0 = no match. Higher is better. */
export function matchScore(query: string, candidates: string[]): number {
  if (!query) return 0;
  let best = 0;
  for (const c of candidates) {
    const n = normalize(c);
    if (!n) continue;
    if (n === query) return 100;
    if (n.startsWith(query)) best = Math.max(best, 80);
    else if (words(c).some((w) => w.startsWith(query))) best = Math.max(best, 70);
    else if (n.includes(query)) best = Math.max(best, 50);
  }
  return best;
}

const texts = (name: LocalizedText, aliases: string[] = []) => [name.en, name.ur, ...aliases];

export function searchPlaces(
  net: Network,
  q: string,
  near: LatLng | undefined,
  limit: number,
): { places: Place[]; routes: RouteSummary[] } {
  const query = normalize(q);
  if (!query) return { places: [], routes: [] };

  type Hit<T> = { item: T; score: number; distanceM: number };
  const byQuality = <T>(a: Hit<T>, b: Hit<T>) => b.score - a.score || a.distanceM - b.distanceM;
  const distance = (p: LatLng) => (near ? haversineM(near, p) : 0);

  const places: Hit<Place>[] = [];
  for (const stop of net.file.stops) {
    const score = matchScore(query, texts(stop.name, stop.aliases));
    if (!score) continue;
    const codes = routesAtStop(net, stop.id)
      .map((r) => r.code)
      .join(' · ');
    places.push({
      item: {
        kind: 'stop',
        id: stop.id,
        name: stop.name,
        location: stop.location,
        ...(codes ? { subtitle: { en: codes, ur: codes } } : {}),
      },
      score,
      distanceM: distance(stop.location),
    });
  }
  for (const lm of net.file.landmarks) {
    const score = matchScore(query, texts(lm.name, lm.aliases));
    if (!score) continue;
    const nearest = nearestStopName(net, lm.location);
    places.push({
      item: {
        kind: 'landmark',
        id: lm.id,
        name: lm.name,
        location: lm.location,
        ...(nearest ? { subtitle: { en: `Near ${nearest.en}`, ur: `${nearest.ur} کے قریب` } } : {}),
      },
      score,
      distanceM: distance(lm.location),
    });
  }

  const routes: Hit<RouteSummary>[] = [];
  for (const route of net.file.routes) {
    const score = matchScore(query, [route.code, route.name.en, route.name.ur]);
    if (score) routes.push({ item: route, score, distanceM: 0 });
  }

  return {
    places: places.sort(byQuality).slice(0, limit).map((h) => h.item),
    routes: routes.sort(byQuality).slice(0, limit).map((h) => h.item),
  };
}

function nearestStopName(net: Network, p: LatLng): LocalizedText | null {
  let best: { name: LocalizedText; d: number } | null = null;
  for (const s of net.file.stops) {
    const d = haversineM(p, s.location);
    if (!best || d < best.d) best = { name: s.name, d };
  }
  return best && best.d <= 1500 ? best.name : null;
}
