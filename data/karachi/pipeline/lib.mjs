// Shared helpers for the Karachi data pipeline. No dependencies; Node 18+.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const p = (...parts) => resolve(ROOT, ...parts);

export const readJson = (file, fallback) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
export const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

// Generic words that are spelled many ways. Only spellings of *common nouns* go here; spelling
// variants of a specific place ("Goro Mandir" = "Guru Mandir") go in aliases.json, where a human
// can review them.
const TOKEN_SYNONYMS = {
  chowrangi: ['chourangi', 'chorangi', 'chowrongi', 'chorungi', 'chowrangee', 'churangi'],
  chowk: ['chok', 'chouk'],
  mor: ['mour', 'more', 'morr', 'mod', 'moor'],
  road: ['rd', 'raod'],
  street: ['st'],
  qabristan: ['qabrustan', 'qabarstan', 'kabristan', 'qabrastan'],
  colony: ['coloney', 'colny'],
  society: ['socity', 'soc'],
  hospital: ['hospitel', 'hosp'],
  market: ['markeet'],
  sector: ['sec'],
  town: ['towwn'],
  goth: ['ghot'],
  masjid: ['masid', 'majid'],
  college: ['colege', 'collage', 'collge'],
  quarters: ['quaters', 'quarter', 'qtrs'],
  shahrah: ['shahra', 'shara', 'sharah', 'shahrahe', 'shahrae'],
  boulevard: ['bulevard', 'bulivard'],
  cinema: ['cenima', 'cinama'],
};

// Names made only of these words ("Petrol Pump", "Garden", "Post Office") can mean different
// places on different routes. The review lists them so a person can split them by area.
const GENERIC_WORDS = new Set(
  ('petrol pump garden post office po police station qabristan masjid chowrangi chowk mor bus stop stand ' +
    'market bazaar bridge hospital school college cinema mill mills factory park ground colony road street ' +
    'nala naka gate hotel bank town city new old main area sector block phase plaza railway crossing').split(' '),
);
export const isGeneric = (key) => key.split(' ').every((t) => GENERIC_WORDS.has(t) || /^\d+½?$/.test(t));

/** Grouping key: the normalised key with spaces removed, so "M.A.Jinnah Road" == "M.A Jinnah Road". */
export const compact = (key) => key.replace(/ /g, '');
const SYNONYM = new Map();
for (const [canon, variants] of Object.entries(TOKEN_SYNONYMS)) {
  for (const v of variants) SYNONYM.set(v, canon);
}

/** Normalised lookup key for a place name: lowercase, no punctuation, generic words unified. */
export function normKey(name) {
  let s = name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // parenthetical notes are not part of the name
    .replace(/(\d)\s*-?\s*1\/2/g, '$1½') // "3-1/2", "3 1/2" -> "3½"
    .replace(/\b(\w)\.(?=\w)/g, '$1') // "M.A", "P.E.C.H.S", "S.I.T.E" -> "ma", "pechs", "site"
    .replace(/[.'’`]/g, '')
    .replace(/[-/,&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = s.split(' ').map((t) => SYNONYM.get(t) ?? t);
  // "no" / "number" before a digit carries no meaning: "Orangi No. 5" == "Orangi 5"
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if ((tokens[i] === 'no' || tokens[i] === 'number') && /^\d/.test(tokens[i + 1] ?? '')) continue;
    out.push(tokens[i]);
  }
  return out.join(' ');
}

export const keyToId = (key) => 's_' + key.replace(/½/g, '_half').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export const similarity = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

export function km(a, b) {
  const r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

/** Google encoded polyline, precision 5 (same algorithm as app/src/lib/geo.ts). */
export function encodePolyline(points) {
  let lastLat = 0, lastLng = 0, result = '';
  const enc = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (v >= 0x20) { chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return chunk + String.fromCharCode(v + 63);
  };
  for (const { lat, lng } of points) {
    const iLat = Math.round(lat * 1e5), iLng = Math.round(lng * 1e5);
    result += enc(iLat - lastLat) + enc(iLng - lastLng);
    lastLat = iLat; lastLng = iLng;
  }
  return result;
}

/** Numbers in a key ("orangi 5" -> "5"). Names with different numbers are never the same place. */
export const digitsOf = (key) => (key.match(/\d+½?/g) ?? []).join(',');
