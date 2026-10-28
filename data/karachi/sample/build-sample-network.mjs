// Builds the Phase 1 SAMPLE fixture network for the app's mock API.
//
// This is NOT real route data. Place names and route codes are real Karachi names, but the
// coordinates are hand-approximated and the stop sequences are illustrative. Shapes are straight
// lines between stops. Every variant is marked `source: "sample"` in `meta`, and the app says so
// on its About screen. Replace this with the output of the real pipeline (docs/05-data-strategy.md)
// once the route text data is in data/karachi/raw/.
//
// Usage (from the repo root): node data/karachi/sample/build-sample-network.mjs

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../../app/src/services/api/mock/fixtures/network.json');

// id, en, ur, lat, lng, aliases
const STOPS = [
  ['power_house', 'Power House Chowrangi', 'پاور ہاؤس چورنگی', 24.9862, 67.064, ['powerhouse']],
  ['up_more', 'U.P. More', 'یو پی موڑ', 24.973, 67.066, ['up mor', 'up morr']],
  ['nagan', 'Nagan Chowrangi', 'ناگن چورنگی', 24.9653, 67.0668, ['nagin chowrangi', 'nagan']],
  ['sakhi_hassan', 'Sakhi Hassan', 'سخی حسن', 24.953, 67.057, ['sakhi hasan']],
  ['five_star', 'Five Star Chowrangi', 'فائیو اسٹار چورنگی', 24.9395, 67.0445, ['5 star']],
  ['hyderi', 'Hyderi', 'حیدری', 24.9355, 67.0385, ['hydri', 'haidery']],
  ['board_office', 'Board Office', 'بورڈ آفس', 24.9235, 67.044, []],
  ['nazimabad_1', 'Nazimabad No. 1', 'ناظم آباد نمبر 1', 24.9055, 67.033, ['nazimabad']],
  ['lasbela', 'Lasbela', 'لسبیلہ', 24.893, 67.031, ['lasbella']],
  ['gurumandir', 'Gurumandir', 'گرومندر', 24.881, 67.038, ['guru mandir', 'gru mandir']],
  ['numaish', 'Numaish', 'نمائش', 24.8737, 67.0335, ['numaish chowrangi', 'numaesh']],
  ['saddar', 'Saddar', 'صدر', 24.8605, 67.03, ['sadar', 'empress market']],
  ['regal', 'Regal Chowk', 'ریگل چوک', 24.8578, 67.0255, ['regal']],
  ['tower', 'Tower', 'ٹاور', 24.8505, 66.9965, ['merewether tower', 'towar']],
  ['orangi_5', 'Orangi Town No. 5', 'اورنگی ٹاؤن نمبر 5', 24.9475, 67.0005, ['orangi', 'orangi 5']],
  ['qasba', 'Qasba Mor', 'قصبہ موڑ', 24.939, 67.012, ['qasba more', 'kasba']],
  ['banaras', 'Banaras Chowk', 'بنارس چوک', 24.9265, 67.0095, ['banaras']],
  ['site', 'SITE', 'سائٹ', 24.912, 67.0085, ['site area']],
  ['golimar', 'Golimar', 'گولیمار', 24.906, 67.0215, ['gulbahar']],
  ['jail_chowrangi', 'Jail Chowrangi', 'جیل چورنگی', 24.884, 67.049, ['jail']],
  ['bahadurabad', 'Bahadurabad', 'بہادرآباد', 24.8805, 67.069, ['bahadur abad']],
  ['tariq_road', 'Tariq Road', 'طارق روڈ', 24.8722, 67.064, ['tariq rd']],
  ['nursery', 'Nursery', 'نرسری', 24.8628, 67.0702, []],
  ['ftc', 'FTC', 'ایف ٹی سی', 24.854, 67.06, ['f.t.c']],
  ['kala_pul', 'Kala Pul', 'کالا پل', 24.8455, 67.0545, ['kala pull']],
  ['malir_15', 'Malir 15', 'ملیر 15', 24.888, 67.2025, ['malir']],
  ['malir_halt', 'Malir Halt', 'ملیر ہالٹ', 24.8885, 67.188, []],
  ['star_gate', 'Star Gate', 'اسٹار گیٹ', 24.887, 67.154, ['airport']],
  ['drigh_road', 'Drigh Road', 'ڈرگ روڈ', 24.8885, 67.1215, ['shah faisal']],
  ['karsaz', 'Karsaz', 'کارساز', 24.879, 67.094, []],
  ['baloch_colony', 'Baloch Colony', 'بلوچ کالونی', 24.87, 67.079, ['baloch pul']],
  ['cantt', 'Cantt Station', 'کینٹ اسٹیشن', 24.8435, 67.0418, ['cant station', 'city station']],
  ['safoora', 'Safoora Chowrangi', 'صفورا چورنگی', 24.942, 67.152, ['safora']],
  ['maskan', 'Maskan Chowrangi', 'مسکن چورنگی', 24.9345, 67.11, ['maskan']],
  ['nipa', 'NIPA', 'نیپا', 24.9175, 67.097, ['nipa chowrangi']],
  ['hassan_square', 'Hassan Square', 'حسن اسکوائر', 24.903, 67.0785, ['hasan square']],
  ['civic_centre', 'Civic Centre', 'سوک سینٹر', 24.8998, 67.0712, ['civic center']],
  ['teen_talwar', 'Teen Talwar', 'تین تلوار', 24.8337, 67.0336, ['3 talwar', 'clifton']],
  ['boat_basin', 'Boat Basin', 'بوٹ بیسن', 24.8268, 67.036, []],
  ['sohrab_goth', 'Sohrab Goth', 'سہراب گوٹھ', 24.9455, 67.087, ['sohrab goth']],
  ['water_pump', 'Water Pump', 'واٹر پمپ', 24.9285, 67.0632, ['waterpump']],
  ['ayesha_manzil', 'Ayesha Manzil', 'عائشہ منزل', 24.9228, 67.0585, ['aisha manzil']],
  ['karimabad', 'Karimabad', 'کریم آباد', 24.916, 67.0505, ['kareemabad']],
  ['liaquatabad_10', 'Liaquatabad No. 10', 'لیاقت آباد نمبر 10', 24.9045, 67.044, ['lalukhet', 'liaquatabad']],
  ['teen_hatti', 'Teen Hatti', 'تین ہٹی', 24.8925, 67.044, ['3 hatti']],
];

const LANDMARKS = [
  ['mazar_e_quaid', 'Mazar-e-Quaid', 'مزارِ قائد', 24.8754, 67.0405, ['quaid mazar', 'jinnah mausoleum']],
  ['empress_market', 'Empress Market', 'ایمپریس مارکیٹ', 24.8606, 67.0301, []],
  ['jpmc', 'Jinnah Hospital', 'جناح ہسپتال', 24.852, 67.045, ['jpmc', 'jinnah postgraduate']],
  ['civil_hospital', 'Civil Hospital', 'سول ہسپتال', 24.8592, 67.0105, ['civil']],
  ['abbasi_shaheed', 'Abbasi Shaheed Hospital', 'عباسی شہید ہسپتال', 24.921, 67.0337, ['abbasi']],
  ['aga_khan', 'Aga Khan Hospital', 'آغا خان ہسپتال', 24.8922, 67.0745, ['aku', 'aga khan']],
  ['karachi_university', 'Karachi University', 'جامعہ کراچی', 24.943, 67.117, ['ku', 'university of karachi']],
  ['ned', 'NED University', 'این ای ڈی یونیورسٹی', 24.9325, 67.1118, ['ned']],
  ['lucky_one', 'Lucky One Mall', 'لکی ون مال', 24.933, 67.087, ['lucky one']],
  ['frere_hall', 'Frere Hall', 'فریئر ہال', 24.8476, 67.033, []],
  ['dolmen_tariq', 'Dolmen Mall Tariq Road', 'ڈولمین مال طارق روڈ', 24.8705, 67.0605, ['dolmen']],
  ['national_stadium', 'National Stadium', 'نیشنل اسٹیڈیم', 24.896, 67.081, ['stadium']],
  ['karachi_zoo', 'Karachi Zoo', 'کراچی چڑیا گھر', 24.876, 67.023, ['zoo', 'gandhi garden']],
  ['liaquat_national', 'Liaquat National Hospital', 'لیاقت نیشنل ہسپتال', 24.8935, 67.07, ['lnh']],
  ['cantt_station_rail', 'Karachi Cantonment Railway Station', 'کراچی کینٹ ریلوے اسٹیشن', 24.8442, 67.0425, ['railway station']],
];

// id, code, en, ur, mode, stopIds (one direction; the other is generated reversed)
const ROUTES = [
  ['w18', 'W18', 'W-18', 'ڈبلیو 18', 'minibus',
    ['power_house', 'up_more', 'nagan', 'sakhi_hassan', 'five_star', 'hyderi', 'board_office', 'nazimabad_1', 'lasbela', 'gurumandir', 'numaish', 'saddar', 'regal', 'tower']],
  ['d7', 'D7', 'D-7', 'ڈی 7', 'minibus',
    ['orangi_5', 'qasba', 'banaras', 'site', 'golimar', 'lasbela', 'gurumandir', 'jail_chowrangi', 'bahadurabad', 'tariq_road', 'nursery', 'ftc', 'kala_pul']],
  ['g7', 'G7', 'G-7', 'جی 7', 'coach',
    ['malir_15', 'malir_halt', 'star_gate', 'drigh_road', 'karsaz', 'baloch_colony', 'nursery', 'ftc', 'cantt', 'saddar', 'tower']],
  ['masood', 'Masood', 'Masood Coach', 'مسعود کوچ', 'coach',
    ['safoora', 'maskan', 'nipa', 'hassan_square', 'civic_centre', 'jail_chowrangi', 'gurumandir', 'numaish', 'saddar', 'cantt', 'teen_talwar', 'boat_basin']],
  ['sheraz', 'Sheraz', 'Sheraz Coach', 'شیراز کوچ', 'coach',
    ['sohrab_goth', 'water_pump', 'ayesha_manzil', 'karimabad', 'liaquatabad_10', 'teen_hatti', 'gurumandir']],
];

// Google encoded polyline, precision 5 (same algorithm as app/src/lib/geo.ts).
function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';
  const encodeValue = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return chunk + String.fromCharCode(v + 63);
  };
  for (const { lat, lng } of points) {
    const iLat = Math.round(lat * 1e5);
    const iLng = Math.round(lng * 1e5);
    result += encodeValue(iLat - lastLat) + encodeValue(iLng - lastLng);
    lastLat = iLat;
    lastLng = iLng;
  }
  return result;
}

const stops = STOPS.map(([id, en, ur, lat, lng, aliases]) => ({
  id: `s_${id}`,
  name: { en, ur },
  location: { lat, lng },
  aliases,
}));
const stopById = new Map(stops.map((s) => [s.id, s]));

const landmarks = LANDMARKS.map(([id, en, ur, lat, lng, aliases]) => ({
  id: `l_${id}`,
  name: { en, ur },
  location: { lat, lng },
  aliases,
}));

const routes = [];
const variants = [];
const meta = [];
for (const [id, code, en, ur, mode, ids] of ROUTES) {
  routes.push({ id: `r_${id}`, code, name: { en, ur }, mode });
  const forward = ids.map((s) => `s_${s}`);
  for (const [suffix, stopIds] of [['a', forward], ['b', [...forward].reverse()]]) {
    for (const s of stopIds) if (!stopById.has(s)) throw new Error(`Unknown stop ${s} in ${id}`);
    const last = stopById.get(stopIds[stopIds.length - 1]);
    const variantId = `r_${id}_${suffix}`;
    variants.push({
      id: variantId,
      routeId: `r_${id}`,
      towards: last.name,
      stopIds,
      shape: encodePolyline(stopIds.map((s) => stopById.get(s).location)),
    });
    meta.push({ entity: 'variant', id: variantId, source: 'sample', verifiedAt: null });
  }
}

const network = {
  version: '2026-10-28-sample',
  city: 'karachi',
  stops,
  landmarks,
  routes,
  variants,
  meta,
};

writeFileSync(out, JSON.stringify(network, null, 2) + '\n');
console.log(
  `Wrote ${out}: ${stops.length} stops, ${landmarks.length} landmarks, ${routes.length} routes, ${variants.length} variants`,
);
