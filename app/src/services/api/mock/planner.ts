// Trip planner: docs/02-architecture.md § Trip planning algorithm.
// A working prototype of the backend's planner. Pure TypeScript with relative imports only, so it
// can be copied into api/ unchanged.

import { encodePolyline, haversineM, sliceShape, walkMinutes, WALK_M_PER_MIN } from '../../../lib/geo';
import type { LatLng, RideLeg, TripOption, WalkLeg } from '../types';
import {
  AVG_MIN_PER_STOP,
  type Network,
  type NetworkStop,
  type NetworkVariant,
  stopsWithin,
  toStop,
} from './network';

export const ACCESS_RADIUS_M = 800;
export const ACCESS_RADIUS_WIDE_M = 1500;
export const TRANSFER_PENALTY_MIN = 8;
export const MAX_OPTIONS = 5;
/** Walk legs shorter than this are dropped (you're already at the stop). */
const MIN_WALK_LEG_M = 15;

export type PlanResult =
  | { ok: true; options: TripOption[] }
  | { ok: false; code: 'NO_STOPS_NEARBY' | 'NO_ROUTE'; end?: 'from' | 'to' };

type Endpoint = { stop: NetworkStop; distanceM: number };

/** A ride on one variant, from position `fromSeq` to `toSeq` (fromSeq < toSeq). */
type Ride = { variant: NetworkVariant; fromSeq: number; toSeq: number };

type Candidate = {
  access: Endpoint;
  rides: Ride[];
  transferWalkM: number;
  egress: Endpoint;
  score: number;
  walkM: number;
};

export function endpointStops(net: Network, point: LatLng): Endpoint[] {
  const near = stopsWithin(net, point, ACCESS_RADIUS_M);
  return near.length > 0 ? near : stopsWithin(net, point, ACCESS_RADIUS_WIDE_M);
}

function rideMinutes(net: Network, ride: Ride): number {
  const mode = net.routes.get(ride.variant.routeId)?.mode ?? 'minibus';
  return Math.round((ride.toSeq - ride.fromSeq) * AVG_MIN_PER_STOP[mode]);
}

function score(net: Network, c: Omit<Candidate, 'score' | 'walkM'>): Pick<Candidate, 'score' | 'walkM'> {
  const walkM = c.access.distanceM + c.transferWalkM + c.egress.distanceM;
  const rideMin = c.rides.reduce((sum, r) => sum + rideMinutes(net, r), 0);
  const transfers = c.rides.length - 1;
  return { walkM, score: walkM / WALK_M_PER_MIN + rideMin + transfers * TRANSFER_PENALTY_MIN };
}

export function plan(net: Network, from: LatLng, to: LatLng, maxTransfers = 1): PlanResult {
  const access = endpointStops(net, from);
  if (access.length === 0) return { ok: false, code: 'NO_STOPS_NEARBY', end: 'from' };
  const egress = endpointStops(net, to);
  if (egress.length === 0) return { ok: false, code: 'NO_STOPS_NEARBY', end: 'to' };

  const egressById = new Map(egress.map((e) => [e.stop.id, e]));
  // Keep only the best candidate per sequence of variants, so the same buses don't show up
  // several times with slightly different boarding stops.
  const best = new Map<string, Candidate>();
  const consider = (c: Omit<Candidate, 'score' | 'walkM'>) => {
    const scored: Candidate = { ...c, ...score(net, c) };
    const key = c.rides.map((r) => r.variant.id).join('>');
    const existing = best.get(key);
    if (!existing || scored.score < existing.score) best.set(key, scored);
  };

  for (const a of access) {
    for (const { variant: v1, seq: seqA } of net.variantsAtStop.get(a.stop.id) ?? []) {
      // Only stops *after* the boarding stop on this variant: this is what makes a
      // wrong-direction ride impossible.
      for (let seqT = seqA + 1; seqT < v1.stopIds.length; seqT++) {
        const t1 = v1.stopIds[seqT];

        // Direct: get off at an egress stop.
        const e = egressById.get(t1);
        if (e) {
          consider({ access: a, rides: [{ variant: v1, fromSeq: seqA, toSeq: seqT }], transferWalkM: 0, egress: e });
        }

        if (maxTransfers < 1) continue;

        // One transfer: change at t1 itself, or walk to a stop within MAX_TRANSFER_WALK_M.
        const transferPoints = [{ stopId: t1, distanceM: 0 }, ...(net.neighbours.get(t1) ?? [])];
        for (const t2 of transferPoints) {
          for (const { variant: v2, seq: seqT2 } of net.variantsAtStop.get(t2.stopId) ?? []) {
            // Changing to the same route (either direction) never helps.
            if (v2.routeId === v1.routeId) continue;
            for (let seqE = seqT2 + 1; seqE < v2.stopIds.length; seqE++) {
              const e2 = egressById.get(v2.stopIds[seqE]);
              if (!e2) continue;
              consider({
                access: a,
                rides: [
                  { variant: v1, fromSeq: seqA, toSeq: seqT },
                  { variant: v2, fromSeq: seqT2, toSeq: seqE },
                ],
                transferWalkM: t2.distanceM,
                egress: e2,
              });
            }
          }
        }
      }
    }
  }

  if (best.size === 0) return { ok: false, code: 'NO_ROUTE' };

  const ranked = pruneDominated([...best.values()])
    .sort((x, y) => x.score - y.score || x.rides.length - y.rides.length || x.walkM - y.walkM)
    .slice(0, MAX_OPTIONS);

  return { ok: true, options: ranked.map((c) => toTripOption(net, c, from, to)) };
}

/** Drop an option when another is at least as good on time, transfers and walking, and better on one. */
function pruneDominated(candidates: Candidate[]): Candidate[] {
  return candidates.filter(
    (c) =>
      !candidates.some(
        (o) =>
          o !== c &&
          o.score <= c.score &&
          o.rides.length <= c.rides.length &&
          o.walkM <= c.walkM &&
          (o.score < c.score || o.rides.length < c.rides.length || o.walkM < c.walkM),
      ),
  );
}

/** FNV-1a, base 36. Stable short IDs; not for security. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function walkLeg(from: LatLng, to: LatLng, toStopId?: string): WalkLeg | null {
  const distanceM = Math.round(haversineM(from, to));
  if (distanceM < MIN_WALK_LEG_M) return null;
  return { type: 'walk', from, to, ...(toStopId ? { toStopId } : {}), distanceM, durationMin: walkMinutes(distanceM) };
}

function rideLeg(net: Network, ride: Ride): RideLeg {
  const { variant, fromSeq, toSeq } = ride;
  const route = net.routes.get(variant.routeId)!;
  const stops = variant.stopIds.slice(fromSeq, toSeq + 1).map((id) => toStop(net.stops.get(id)!));
  const board = stops[0];
  const alight = stops[stops.length - 1];
  return {
    type: 'ride',
    route,
    variantId: variant.id,
    towards: variant.towards,
    boardStop: board,
    alightStop: alight,
    stops,
    durationMin: rideMinutes(net, ride),
    polyline: encodePolyline(sliceShape(net.shapes.get(variant.id)!, board.location, alight.location)),
  };
}

function toTripOption(net: Network, c: Candidate, from: LatLng, to: LatLng): TripOption {
  const legs: TripOption['legs'] = [];
  const push = (leg: WalkLeg | RideLeg | null) => {
    if (leg) legs.push(leg);
  };

  const rides = c.rides.map((r) => rideLeg(net, r));
  push(walkLeg(from, rides[0].boardStop.location, rides[0].boardStop.id));
  rides.forEach((ride, i) => {
    if (i > 0) {
      const prev = rides[i - 1].alightStop;
      if (prev.id !== ride.boardStop.id) push(walkLeg(prev.location, ride.boardStop.location, ride.boardStop.id));
    }
    push(ride);
  });
  push(walkLeg(rides[rides.length - 1].alightStop.location, to));

  const transfers = rides.length - 1;
  const legMinutes = legs.reduce((sum, l) => sum + l.durationMin, 0);
  const walkM = legs.reduce((sum, l) => sum + (l.type === 'walk' ? l.distanceM : 0), 0);
  const key = c.rides
    .map((r) => `${r.variant.id}~${r.variant.stopIds[r.fromSeq]}~${r.variant.stopIds[r.toSeq]}`)
    .join('+');
  const id = `t_${hash(`${key}@${from.lat.toFixed(4)},${from.lng.toFixed(4)}>${to.lat.toFixed(4)},${to.lng.toFixed(4)}`)}`;

  return { id, legs, durationMin: legMinutes + transfers * TRANSFER_PENALTY_MIN, walkM, transfers };
}
