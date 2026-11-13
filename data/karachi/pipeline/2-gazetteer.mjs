// Step 2 · Build / update gazetteer.json: one entry per unique place.
//
// - Spellings are grouped by normKey() and by the human-curated aliases.json.
// - Then near-spellings (similarity >= 0.8, same numbers) are merged automatically (D34), with
//   complete linkage: a cluster only forms if *every* member is similar to every other, so
//   chains like Golimar ~ Goli Maar ~ ... ~ Cantt Station can't fuse unrelated places.
//   "Contained" names (Defence / Defence Society) are never auto-merged. aliases.json
//   `doNotMerge` vetoes a wrong merge.
// - Codes listed twice whose stops overlap >= 80% (both ways) become one route.
// - Re-running is safe: fields a human has filled in (name.ur, location, and a hand-edited
//   name.en) are kept. Entries no longer referenced by any route are kept and marked `unused`.

import { p, readJson, writeJson, normKey, keyToId, similarity, digitsOf, compact, isGeneric } from './lib.mjs';

const AUTO_MERGE_MIN = 0.8; // a pair this similar starts a merge
const CLUSTER_MIN = 0.75; // every pair inside a merged cluster must be at least this similar
const ROUTE_DUP_MIN = 0.8; // duplicate route codes merge when stops overlap this much both ways

const ROMAN = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']);
/** Numbers incl. roman numerals ("Phase II"), so numbered places never merge with each other. */
const numbersOf = (spacedKey) => digitsOf(spacedKey) + '/' + spacedKey.split(' ').filter((t) => ROMAN.has(t)).join(',');
const topKey = (counts) => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

export function runGazetteer(routes) {
  const aliasFile = readJson(p('aliases.json'), {});
  const curated = aliasFile.merges ?? {};
  const overrides = aliasFile.routeOverrides ?? {}; // { routeKeyOrCode: { "name in text": "place name" } }
  const existing = readJson(p('gazetteer.json'), { places: [] }).places;

  // compact key -> canonical compact key, from aliases.json
  const canonOf = new Map();
  const canonName = new Map(); // canonical compact key -> { name, key }
  const curatedVariants = new Map(); // canonical compact key -> [variant spellings]
  for (const [canon, variants] of Object.entries(curated)) {
    const ck = compact(normKey(canon));
    canonName.set(ck, { name: canon, key: normKey(canon) });
    curatedVariants.set(ck, variants);
    for (const v of variants) canonOf.set(compact(normKey(v)), ck);
  }

  // Collect every spelling.
  const groups = new Map(); // compact key -> { spellings, spacedKeys, routes }
  for (const r of routes) {
    const ov = overrides[r.key] ?? overrides[r.code] ?? {};
    for (const s of r.stops) {
      if (ov[s.name]) s.place = ov[s.name];
      const k = normKey(s.place ?? s.name);
      const gk = canonOf.get(compact(k)) ?? compact(k);
      s.gk = gk;
      const g = groups.get(gk) ?? { spellings: new Map(), spacedKeys: new Map(), routes: new Set() };
      const spelling = s.place ?? s.name;
      g.spellings.set(spelling, (g.spellings.get(spelling) ?? 0) + 1);
      g.spacedKeys.set(k, (g.spacedKeys.get(k) ?? 0) + 1);
      groups.set(gk, g);
    }
  }

  // Merge near-spellings, then point every stop at its final group.
  const doNotMerge = new Set(
    (aliasFile.doNotMerge ?? []).map((pair) => pair.map((n) => compact(normKey(n))).sort().join('|')),
  );
  const { mergedInto, clusters } = autoMerge(groups, canonName, doNotMerge);
  for (const r of routes) for (const s of r.stops) s.gk = mergedInto.get(s.gk) ?? s.gk;

  // Duplicate route codes that are really one route.
  const { kept, routeMerges } = dedupeRoutes(routes);
  for (const r of kept) for (const s of r.stops) groups.get(s.gk).routes.add(r.key);
  for (const [gk, g] of groups) if (!g.routes.size) groups.delete(gk); // only on a dropped duplicate

  const prevById = new Map(existing.map((e) => [e.id, e]));
  const places = [];
  for (const [gk, g] of groups) {
    // Readable key/id: the curated canonical, else the most common spaced spelling.
    const key = canonName.get(gk)?.key ?? g.fixedKey ?? topKey(g.spacedKeys);
    const id = keyToId(key);
    g.id = id;
    const prev = prevById.get(id);
    prevById.delete(id);
    // Display name: the curated canonical, else the most common spelling (ties: the one with
    // more capital letters, since the source is inconsistent about case).
    const auto =
      canonName.get(gk)?.name ??
      [...g.spellings.entries()].sort(
        (a, b) => b[1] - a[1] || (b[0].match(/[A-Z]/g)?.length ?? 0) - (a[0].match(/[A-Z]/g)?.length ?? 0),
      )[0][0];
    const en = prev?.name?.enLocked ? prev.name.en : auto;
    places.push({
      id,
      key,
      name: { en, ur: prev?.name?.ur ?? null, ...(prev?.name?.enLocked ? { enLocked: true } : {}) },
      location: prev?.location ?? null,
      locationSource: prev?.locationSource ?? null,
      // Spellings seen in the text, plus curated ones (useful for search and OSM matching).
      aliases: [...new Set([...g.spellings.keys(), ...(curatedVariants.get(gk) ?? [])])].filter((s) => s !== en).sort(),
      routeCount: g.routes.size,
      routes: [...g.routes].sort(),
      ...(isGeneric(key) ? { generic: true } : {}),
      // A road is a corridor, not a point: it needs per-route handling (the point where that
      // route joins/leaves it, or dropping it), not one coordinate.
      ...(/\b(road|street|shahrah|avenue|boulevard|highway)\b/.test(key) ? { kind: 'road' } : {}),
      ...(prev?.notes ? { notes: prev.notes } : {}),
    });
  }
  // Keep human work on places that no longer appear (e.g. after a new merge).
  for (const old of prevById.values()) {
    if (old.name?.ur || old.location || old.notes) places.push({ ...old, routeCount: 0, routes: [], unused: true });
  }
  places.sort((a, b) => b.routeCount - a.routeCount || a.id.localeCompare(b.id));

  // ID collisions would silently merge two places.
  const seen = new Map();
  for (const pl of places) {
    if (seen.has(pl.id) && seen.get(pl.id) !== pl.key) throw new Error(`id collision ${pl.id}: "${seen.get(pl.id)}" vs "${pl.key}"`);
    seen.set(pl.id, pl.key);
  }

  writeJson(p('gazetteer.json'), {
    note:
      'Generated by pipeline/2-gazetteer.mjs, then completed by hand. Safe to edit: name.ur, location {lat,lng}, ' +
      'locationSource, notes, and name.en (set name.enLocked: true to keep your edit). Merge places via aliases.json, not here.',
    places,
  });

  for (const r of kept) for (const s of r.stops) s.placeId = groups.get(s.gk).id;
  const byId = new Map(places.map((pl) => [pl.id, pl]));
  return {
    places,
    routes: kept,
    candidates: mergeCandidates(places),
    autoMerged: clusters.map((c) => ({ into: byId.get(groups.get(c.into).id), spellings: c.spellings })),
    routeMerges,
  };
}

/** Complete-linkage merge of near-spelled groups. Mutates `groups`. */
function autoMerge(groups, canonName, doNotMerge) {
  const items = [...groups].map(([gk, g]) => {
    const sp = topKey(g.spacedKeys);
    return { gk, num: numbersOf(sp), n: [...g.spellings.values()].reduce((a, b) => a + b, 0) };
  });
  const vetoed = (a, b) => doNotMerge.has([a.gk, b.gk].sort().join('|'));
  const close = (a, b, min) => {
    if (a.num !== b.num || vetoed(a, b)) return false;
    const len = Math.max(a.gk.length, b.gk.length);
    if (Math.abs(a.gk.length - b.gk.length) > len * (1 - min)) return false;
    return similarity(a.gk, b.gk) >= min;
  };

  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (!close(items[i], items[j], AUTO_MERGE_MIN)) continue;
      pairs.push([i, j, similarity(items[i].gk, items[j].gk)]);
    }
  }
  pairs.sort((x, y) => y[2] - x[2]);

  const clusterOf = items.map((_, i) => i);
  const members = new Map(items.map((_, i) => [i, [i]]));
  for (const [i, j] of pairs) {
    const A = clusterOf[i], B = clusterOf[j];
    if (A === B) continue;
    const ok = members.get(A).every((a) => members.get(B).every((b) => close(items[a], items[b], CLUSTER_MIN)));
    if (!ok) continue;
    for (const b of members.get(B)) clusterOf[b] = A;
    members.set(A, [...members.get(A), ...members.get(B)]);
    members.delete(B);
  }

  const mergedInto = new Map();
  const clusters = [];
  for (const idx of members.values()) {
    if (idx.length < 2) continue;
    const ms = idx.map((i) => items[i]);
    // Keep a curated canonical if there is one, else the most-mentioned spelling.
    const target = ms.find((m) => canonName.has(m.gk)) ?? ms.sort((a, b) => b.n - a.n)[0];
    const into = groups.get(target.gk);
    into.fixedKey = topKey(into.spacedKeys); // pin the id to the target's own spelling
    const spellings = [];
    for (const m of ms) {
      if (m === target) continue;
      const g = groups.get(m.gk);
      for (const [s, c] of g.spellings) { into.spellings.set(s, (into.spellings.get(s) ?? 0) + c); spellings.push(s); }
      for (const [k, c] of g.spacedKeys) into.spacedKeys.set(k, (into.spacedKeys.get(k) ?? 0) + c);
      groups.delete(m.gk);
      mergedInto.set(m.gk, target.gk);
    }
    clusters.push({ into: target.gk, spellings });
  }
  return { mergedInto, clusters };
}

/** Same code listed twice with >= 80% shared stops (both ways): keep the longer listing. */
function dedupeRoutes(routes) {
  const byCode = new Map();
  for (const r of routes) byCode.set(r.code, [...(byCode.get(r.code) ?? []), r]);
  const drop = new Set();
  const routeMerges = [];
  for (const group of byCode.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        if (drop.has(a) || drop.has(b)) continue;
        const A = new Set(a.stops.map((s) => s.gk)), B = new Set(b.stops.map((s) => s.gk));
        const shared = [...A].filter((k) => B.has(k)).length;
        const overlap = Math.min(shared / A.size, shared / B.size);
        if (overlap < ROUTE_DUP_MIN) continue;
        const [keep, lose] = b.stops.length > a.stops.length ? [b, a] : [a, b];
        drop.add(lose);
        keep.flags.push(`merged with duplicate listing ${lose.key} (${Math.round(overlap * 100)}% shared stops); kept this longer one`);
        routeMerges.push({ keep: keep.key, drop: lose.key, overlap });
      }
    }
  }
  return { kept: routes.filter((r) => !drop.has(r)), routeMerges };
}

/** Pairs of places that are probably the same, for human review. */
function mergeCandidates(places) {
  const live = places.filter((pl) => !pl.unused);
  const out = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i].key, b = live[j].key;
      if (digitsOf(a) !== digitsOf(b)) continue; // "orangi 4" vs "orangi 5" are different places
      const sim = similarity(a.replace(/ /g, ''), b.replace(/ /g, ''));
      const contained = a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a));
      if (sim >= 0.8 || contained) out.push({ a: live[i], b: live[j], sim, contained });
    }
  }
  return out.sort((x, y) => y.sim - x.sim);
}
