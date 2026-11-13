// Step 3 · Suggest coordinates (and Urdu names) for gazetteer places from an OpenStreetMap export.
//
// Input:  osm/places.json, the raw JSON saved from the Overpass query in data/karachi/README.md.
// Output: build/osm-suggestions.json. Suggestions only: nothing is written into gazetteer.json.
//         A person checks each one on the map and copies it in (set locationSource: "osm").
// OSM data is ODbL-licensed: see docs/06-decisions.md D33.

import { existsSync } from 'node:fs';
import { p, readJson, writeJson, normKey, similarity, digitsOf, compact, km } from './lib.mjs';

export function runOsmMatch(places) {
  const file = p('osm/places.json');
  if (!existsSync(file)) return null;
  const elements = readJson(file).elements ?? [];

  // Each OSM feature -> point + every name it carries.
  const feats = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || !t.name) continue;
    const names = [t.name, t['name:en'], t.alt_name, t.old_name, t.official_name, t.short_name, t.loc_name]
      .filter(Boolean)
      .flatMap((n) => n.split(';'))
      .filter((n) => /[a-z]/i.test(n));
    if (!names.length) continue;
    feats.push({
      osm: `${el.type}/${el.id}`,
      kind: ['place', 'junction', 'highway', 'public_transport', 'railway', 'amenity', 'leisure', 'historic', 'shop', 'landuse', 'building']
        .filter((k) => t[k]).map((k) => `${k}=${t[k]}`).join(' ') || 'other',
      rank: kindRank(t),
      lat: +lat.toFixed(6), lng: +lng.toFixed(6),
      ur: t['name:ur'] ?? (/[؀-ۿ]/.test(t.name) ? t.name : null),
      names, keys: names.map((n) => compact(normKey(n))),
    });
  }
  const byKey = new Map();
  const byCore = new Map();
  const add = (m, k, f) => { if (k) m.set(k, [...new Set([...(m.get(k) ?? []), f])]); };
  for (const f of feats) for (const n of f.names) {
    const nk = normKey(n);
    add(byKey, compact(nk), f);
    add(byCore, core(nk), f);
  }

  // Fuzzy fallback index: bucket every OSM key by first letter, so a place is only compared with
  // keys that start the same way and are of similar length (a full scan is ~100M comparisons).
  const buckets = new Map();
  for (const f of feats) for (const k of new Set(f.keys)) {
    if (!k) continue;
    const b = buckets.get(k[0]) ?? [];
    b.push({ k, f });
    buckets.set(k[0], b);
  }
  const fuzzyHits = (own) => {
    const best = new Map(); // feature -> score
    const maxDiff = Math.floor(own.length * 0.15);
    for (const { k, f } of buckets.get(own[0]) ?? []) {
      if (Math.abs(k.length - own.length) > maxDiff || digitsOf(k) !== digitsOf(own)) continue;
      const score = similarity(k, own);
      if (score >= 0.85 && score > (best.get(f) ?? 0)) best.set(f, score);
    }
    return [...best].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([f, score]) => ({ ...f, match: 'fuzzy', score: +score.toFixed(2) }));
  };

  const out = [];
  const counts = { exact: 0, core: 0, fuzzy: 0 };
  for (const pl of places) {
    if (pl.unused) continue;
    const nks = [pl.name.en, ...pl.aliases].map(normKey);
    const own = compact(pl.key);
    // exact: same name. core: same name once suffixes like Chowrangi/Chowk/Stop/BRT Station are
    // dropped ("NIPA" = "NIPA Chowrangi"). fuzzy: a near spelling, only when nothing else matched.
    const exact = new Set(nks.flatMap((k) => byKey.get(compact(k)) ?? []));
    const coreHits = new Set(nks.flatMap((k) => byCore.get(core(k)) ?? []).filter((f) => !exact.has(f)));
    let hits = [
      ...[...exact].map((f) => ({ ...f, match: 'exact', score: 1 })),
      ...[...coreHits].map((f) => ({ ...f, match: 'core', score: 0.95 })),
    ];
    if (!hits.length) hits = fuzzyHits(own);
    if (!hits.length) continue;
    counts[hits.some((h) => h.match === 'exact') ? 'exact' : hits.some((h) => h.match === 'core') ? 'core' : 'fuzzy']++;
    // Best first: a junction/place/stop beats a shop or mosque named after the area.
    hits.sort((a, b) => a.rank - b.rank || b.score - a.score);
    hits = hits.slice(0, 5);
    let spread = 0;
    for (const a of hits) for (const b of hits) spread = Math.max(spread, km(a, b));
    out.push({
      id: pl.id, en: pl.name.en, routeCount: pl.routeCount, hasLocation: !!pl.location,
      ...(pl.generic ? { generic: true } : {}), ...(pl.kind === 'road' ? { kind: 'road' } : {}),
      // Candidates more than 500 m apart may be different places: pick by the route's neighbours.
      spreadKm: +spread.toFixed(2), ambiguous: spread > 0.5,
      candidates: hits.map(({ osm, kind, lat, lng, ur, names, match, score }) => ({ osm, kind, lat, lng, ur, names, match, score })),
    });
  }
  writeJson(p('build/osm-suggestions.json'), {
    note: 'Suggestions from OpenStreetMap (ODbL, © OpenStreetMap contributors). Verify each on the map before copying into gazetteer.json.',
    suggestions: out,
  });
  const live = places.filter((pl) => !pl.unused).length;
  return {
    features: feats.length, ...counts, none: live - counts.exact - counts.core - counts.fuzzy,
    ambiguous: out.filter((s) => s.ambiguous).length, withUr: out.filter((s) => s.candidates.some((c) => c.ur)).length,
    suggestions: out,
  };
}

// Trailing words that name the *kind* of spot, not the place: "NIPA Chowrangi", "Board Office BRT
// Station", "Jail Chowrangi Stop", "Cantt Station Karachi".
const SUFFIXES = ['bus stop', 'brt station', 'stop', 'chowrangi', 'chowk', 'mor', 'flyover', 'signal', 'roundabout', 'karachi'];
function core(nk) {
  let s = nk;
  for (let changed = true; changed; ) {
    changed = false;
    for (const suf of SUFFIXES) {
      if (s.endsWith(' ' + suf)) { s = s.slice(0, -suf.length - 1); changed = true; }
    }
  }
  return compact(s);
}

// 0: junctions, places, stops, stations: what a route description usually means.
// 1: named landmarks (hospital, college, market, park). 2: everything else (shops, banks, mosques).
function kindRank(t) {
  if (t.junction || t.place || t.public_transport || t.railway || t.amenity === 'bus_station' ||
      ['bus_stop', 'traffic_signals', 'crossing', 'turning_circle', 'motorway_junction'].includes(t.highway)) return 0;
  if (['hospital', 'college', 'university', 'marketplace', 'cinema', 'police', 'post_office'].includes(t.amenity) ||
      t.leisure || t.historic || t.shop === 'mall') return 1;
  return 2;
}
