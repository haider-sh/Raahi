// Step 4 · Build network.json (the format in docs/05-data-strategy.md) from whatever locations we
// have: a hand-set gazetteer location wins, otherwise the best OSM suggestion (D35).
//
// Everything here is UNVERIFIED. Stops without a usable location are left out of their routes,
// shapes are straight lines between stops, and every variant is marked
// `source: "text-2009+osm-unverified"` so the app warns about it.
//
// Guards against bad OSM matches:
// - generic names ("Petrol Pump") get no location: one point can't stand for all of them;
// - road names get one only if OSM matched a place/station/junction of that name (Drigh Road);
// - ambiguous places (candidates > 500 m apart) take the candidate nearest their neighbours on
//   the routes that use them;
// - a stop that makes its route jump far off and back (a big detour) is dropped from that route,
//   and a place that does this on most of its routes is dropped everywhere.

import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { p, readJson, writeJson, km, encodePolyline } from './lib.mjs';

const APP_FIXTURE = resolve(p(), '../../app/src/services/api/mock/fixtures/network.json');
const DETOUR_KM = 5; // dropping the stop shortens the route by more than this
const LEG_KM = 3; // ...and both its legs are longer than this
const END_JUMP_KM = 10; // a first/last stop this far from its neighbour is suspect
const NEIGHBOUR_KM = 8; // median distance to the stops just before/after it above this = wrong match
const AMBIGUOUS_KM = 4; // an ambiguous name's best candidate must be this close to its route neighbours
const OUTLIER_SHARE = 0.5; // off-route on this share of its routes = location dropped everywhere
const ROAD_OK = /place=|railway=|junction=|amenity=bus_station|public_transport=station/;
const SOURCE = 'text-2009+osm-unverified';

export function runNetwork({ places, routes, osm }) {
  const byId = new Map(places.map((pl) => [pl.id, pl]));
  const sug = new Map((osm?.suggestions ?? []).map((s) => [s.id, s]));

  // 1. Usable candidates per place.
  const cands = new Map();
  const why = new Map(); // place id -> reason it has no location
  for (const pl of places) {
    if (pl.unused) continue;
    if (pl.location) { cands.set(pl.id, [{ ...manualLocation(pl), manual: true }]); continue; }
    const s = sug.get(pl.id);
    if (!s) { why.set(pl.id, 'no OSM match'); continue; }
    if (pl.generic) { why.set(pl.id, 'generic name'); continue; }
    let cs = s.candidates;
    if (pl.kind === 'road') cs = cs.filter((c) => ROAD_OK.test(c.kind));
    if (!cs.length) { why.set(pl.id, 'road (corridor, not a point)'); continue; }
    cands.set(pl.id, cs);
  }

  // Route neighbours of each place, for picking between ambiguous candidates.
  const nbrs = new Map(); // ±2 stops, for choosing between candidates
  const nbrs1 = new Map(); // ±1 stop, for the consistency check
  for (const r of routes) {
    r.stops.forEach((s, i) => {
      const list = nbrs.get(s.placeId) ?? [];
      const list1 = nbrs1.get(s.placeId) ?? [];
      for (const j of [i - 2, i - 1, i + 1, i + 2]) if (r.stops[j]) list.push(r.stops[j].placeId);
      for (const j of [i - 1, i + 1]) if (r.stops[j]) list1.push(r.stops[j].placeId);
      nbrs.set(s.placeId, list);
      nbrs1.set(s.placeId, list1);
    });
  }

  // 2. Choose one point per place: clear cases first, then ambiguous ones by their neighbours.
  const loc = new Map();
  const ambiguous = [];
  for (const [id, cs] of cands) {
    const spread = Math.max(0, ...cs.flatMap((a) => cs.map((b) => km(a, b))));
    if (cs.length === 1 || spread <= 0.5) loc.set(id, pick(cs[0]));
    else ambiguous.push(id);
  }
  for (const id of ambiguous) {
    const anchors = (nbrs.get(id) ?? []).map((n) => loc.get(n)).filter(Boolean);
    const cs = cands.get(id);
    if (!anchors.length) { loc.set(id, pick(cs[0])); continue; }
    const score = (c) => median(anchors.map((a) => km(a, c)));
    const best = [...cs].sort((a, b) => score(a) - score(b))[0];
    if (anchors.length >= 2 && score(best) > AMBIGUOUS_KM) {
      why.set(id, `ambiguous name, no OSM candidate near its route (best ${score(best).toFixed(1)} km off)`);
      continue;
    }
    loc.set(id, pick(best));
  }

  // 2b. Consistency: an OSM point far from the place's route neighbours is probably a different
  //     place with the same name (OSM's "Nursery Stop" is not Shahrah-e-Faisal's Nursery).
  for (let pass = 0; pass < 2; pass++) {
    const verdicts = [];
    for (const [id, l] of loc) {
      if (l.source === 'manual') continue;
      const d = [...new Set(nbrs1.get(id) ?? [])].filter((n) => n !== id && loc.has(n)).map((n) => km(loc.get(n), l));
      if (d.length >= 2 && median(d) > NEIGHBOUR_KM) verdicts.push([id, median(d)]);
    }
    for (const [id, m] of verdicts) { loc.delete(id); why.set(id, `location looks wrong (${m.toFixed(1)} km from its route neighbours)`); }
  }

  // 3. Drop detour outliers. Pass 1 counts them per place; places that are outliers on most of
  //    their routes lose their location; pass 2 builds the final stop lists.
  const outlierCount = new Map();
  for (const r of routes) for (const id of outliers(located(r, loc))) outlierCount.set(id, (outlierCount.get(id) ?? 0) + 1);
  for (const [id, n] of outlierCount) {
    if (n / byId.get(id).routeCount >= OUTLIER_SHARE) { loc.delete(id); why.set(id, `location looks wrong (off-route on ${n} of ${byId.get(id).routeCount} routes)`); }
  }

  const routeOut = [], variants = [], meta = [], usedStops = new Set(), report = [];
  for (const r of routes) {
    let ids = located(r, loc);
    const bad = new Set(outliers(ids));
    ids = ids.filter((id) => !bad.has(id));
    report.push({ key: r.key, total: r.stops.length, kept: ids.length, offRoute: [...bad].map((id) => byId.get(id).name.en) });
    if (ids.length < 2) continue;
    const rid = 'r_' + slug(r.key);
    const code = r.code.replace(/ Coach$/, '');
    routeOut.push({ id: rid, code, name: { en: r.code, ur: r.code }, mode: r.kind });
    for (const [suffix, stopIds] of [['a', ids], ['b', [...ids].reverse()]]) {
      const vid = `${rid}_${suffix}`;
      variants.push({
        id: vid, routeId: rid,
        towards: null, // filled below, once stop names are final
        stopIds,
        shape: encodePolyline(stopIds.map((id) => loc.get(id))),
      });
      meta.push({ entity: 'variant', id: vid, source: SOURCE, verifiedAt: null });
    }
    ids.forEach((id) => usedStops.add(id));
  }

  // 4. Stops.
  const stops = [...usedStops].map((id) => {
    const pl = byId.get(id);
    const l = loc.get(id);
    meta.push({ entity: 'stop', id, source: l.source, verifiedAt: null });
    return {
      id,
      // Urdu: hand-entered, else OSM's name:ur, else the English name. Never machine-translated.
      name: { en: pl.name.en, ur: pl.name.ur ?? l.ur ?? pl.name.en },
      location: { lat: l.lat, lng: l.lng },
      aliases: pl.aliases.map((a) => a.toLowerCase()).filter((a, i, all) => all.indexOf(a) === i),
    };
  });
  const stopById = new Map(stops.map((s) => [s.id, s]));
  for (const v of variants) v.towards = stopById.get(v.stopIds.at(-1)).name;

  const network = {
    version: new Date().toISOString().slice(0, 10) + '-unverified',
    city: 'karachi',
    stops: stops.sort((a, b) => a.id.localeCompare(b.id)),
    landmarks: [],
    routes: routeOut,
    variants,
    meta,
  };
  // Never silently replace a working network with a much smaller one (e.g. run without OSM data).
  const prev = existsSync(p('network.json')) ? readJson(p('network.json')).routes.length : 0;
  if (routeOut.length < prev / 2 && !process.argv.includes('--force')) {
    throw new Error(`network would shrink from ${prev} to ${routeOut.length} routes; not writing it. Missing osm/places.json? Re-run with --force to write anyway.`);
  }
  writeJson(p('network.json'), network);
  mkdirSync(dirname(APP_FIXTURE), { recursive: true });
  writeJson(APP_FIXTURE, network);

  return { network, report, why, urFromOsm: stops.filter((s) => s.name.ur !== s.name.en && !byId.get(s.id).name.ur).length };
}

/** Located place ids of a route, in order, without repeats (a loop's second visit is dropped). */
function located(r, loc) {
  const out = [];
  for (const s of r.stops) if (loc.has(s.placeId) && !out.includes(s.placeId)) out.push(s.placeId);
  out.loc = loc; // carried along for outliers()
  return out;
}

/** Ids whose position makes the route jump far away and back. Greedy: worst first, repeat. */
function outliers(ids) {
  const loc = ids.loc;
  let cur = ids.slice();
  const out = [];
  for (;;) {
    let worst = null, worstScore = 0;
    for (let i = 0; i < cur.length; i++) {
      const here = loc.get(cur[i]);
      const prev = i > 0 ? loc.get(cur[i - 1]) : null;
      const next = i < cur.length - 1 ? loc.get(cur[i + 1]) : null;
      let score = 0;
      if (prev && next) {
        const a = km(prev, here), b = km(here, next);
        const detour = a + b - km(prev, next);
        if (detour > DETOUR_KM && a > LEG_KM && b > LEG_KM) score = detour;
      } else if (prev || next) {
        const d = km(prev ?? next, here);
        if (d > END_JUMP_KM && cur.length > 2) score = d;
      }
      if (score > worstScore) { worst = i; worstScore = score; }
    }
    if (worst === null) return out;
    out.push(cur[worst]);
    cur = cur.filter((_, i) => i !== worst);
  }
}

// Rough box around Karachi; anything outside is a typo or swapped lat/lng.
const KARACHI = { minLat: 24.6, maxLat: 25.4, minLng: 66.6, maxLng: 67.7 };

/**
 * A hand-entered gazetteer location as numbers. Quoted numbers ("24.87") are accepted, because
 * they're an easy slip when editing JSON by hand; MapLibre crashes on strings, so they must never
 * reach network.json. Anything unreadable or outside Karachi stops the build with a clear message.
 */
function manualLocation(pl) {
  const lat = typeof pl.location.lat === 'string' ? Number(pl.location.lat.trim()) : pl.location.lat;
  const lng = typeof pl.location.lng === 'string' ? Number(pl.location.lng.trim()) : pl.location.lng;
  const where = `gazetteer.json, "${pl.id}" (${pl.name.en}): location ${JSON.stringify(pl.location)}`;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${where} must be numbers, e.g. { "lat": 24.8789, "lng": 67.1883 }`);
  }
  if (lat < KARACHI.minLat || lat > KARACHI.maxLat || lng < KARACHI.minLng || lng > KARACHI.maxLng) {
    const swapped = lng >= KARACHI.minLat && lng <= KARACHI.maxLat && lat >= KARACHI.minLng && lat <= KARACHI.maxLng;
    throw new Error(`${where} is outside Karachi${swapped ? ' (lat and lng look swapped)' : ''}`);
  }
  return { lat, lng };
}

function pick(c) {
  if (c.manual) return { lat: c.lat, lng: c.lng, ur: null, source: 'manual' };
  // name:ur is only trusted when OSM's name is our name (not "Hyderi BRT Station" for "Hyderi").
  const urOk = c.match === 'exact' || (c.match === 'core' && /place=|junction=/.test(c.kind));
  return { lat: c.lat, lng: c.lng, ur: urOk ? c.ur : null, source: c.match === 'fuzzy' ? 'osm-fuzzy' : 'osm' };
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const slug = (s) => s.toLowerCase().replace(/#/g, '_').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
