// The network file format from docs/05-data-strategy.md, plus the lookup indexes the planner and
// search need. Pure TypeScript (relative imports only) so it ports to api/ unchanged.

import { decodePolyline, haversineM } from '../../../lib/geo';
import type { LatLng, LocalizedText, RouteMode, RouteSummary, Stop } from '../types';

export type NetworkStop = Stop & { aliases: string[] };
export type NetworkLandmark = { id: string; name: LocalizedText; location: LatLng; aliases: string[] };
export type NetworkRoute = RouteSummary;
export type NetworkVariant = {
  id: string;
  routeId: string;
  towards: LocalizedText;
  stopIds: string[];
  shape: string;
};
export type NetworkMeta = { entity: string; id: string; source: string; verifiedAt: string | null };

export type NetworkFile = {
  version: string;
  city: string;
  stops: NetworkStop[];
  landmarks: NetworkLandmark[];
  routes: NetworkRoute[];
  variants: NetworkVariant[];
  meta: NetworkMeta[];
};

export type VariantAtStop = { variant: NetworkVariant; seq: number };

export type Network = {
  file: NetworkFile;
  stops: Map<string, NetworkStop>;
  routes: Map<string, NetworkRoute>;
  variants: Map<string, NetworkVariant>;
  shapes: Map<string, LatLng[]>;
  /** Every variant that calls at a stop, with the stop's position in it. */
  variantsAtStop: Map<string, VariantAtStop[]>;
  /** Other stops within transfer walking distance, with the distance. */
  neighbours: Map<string, { stopId: string; distanceM: number }[]>;
};

export const MAX_TRANSFER_WALK_M = 300;

export function indexNetwork(file: NetworkFile): Network {
  const stops = new Map(file.stops.map((s) => [s.id, s]));
  const routes = new Map(file.routes.map((r) => [r.id, r]));
  const variants = new Map(file.variants.map((v) => [v.id, v]));
  const shapes = new Map(file.variants.map((v) => [v.id, decodePolyline(v.shape)]));

  const variantsAtStop = new Map<string, VariantAtStop[]>();
  for (const variant of file.variants) {
    variant.stopIds.forEach((stopId, seq) => {
      const list = variantsAtStop.get(stopId) ?? [];
      list.push({ variant, seq });
      variantsAtStop.set(stopId, list);
    });
  }

  const neighbours = new Map<string, { stopId: string; distanceM: number }[]>();
  for (const a of file.stops) {
    const near: { stopId: string; distanceM: number }[] = [];
    for (const b of file.stops) {
      if (a.id === b.id) continue;
      const d = haversineM(a.location, b.location);
      if (d <= MAX_TRANSFER_WALK_M) near.push({ stopId: b.id, distanceM: Math.round(d) });
    }
    neighbours.set(a.id, near);
  }

  return { file, stops, routes, variants, shapes, variantsAtStop, neighbours };
}

/** Public shape of a stop: the contract's `Stop` has no aliases. */
export function toStop(s: NetworkStop): Stop {
  return { id: s.id, name: s.name, location: s.location };
}

export function stopsWithin(
  net: Network,
  point: LatLng,
  radiusM: number,
): { stop: NetworkStop; distanceM: number }[] {
  const out: { stop: NetworkStop; distanceM: number }[] = [];
  for (const stop of net.file.stops) {
    const d = haversineM(point, stop.location);
    if (d <= radiusM) out.push({ stop, distanceM: Math.round(d) });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

/** Routes calling at a stop, de-duplicated across directions, in network order. */
export function routesAtStop(net: Network, stopId: string): RouteSummary[] {
  const ids = new Set((net.variantsAtStop.get(stopId) ?? []).map((v) => v.variant.routeId));
  return net.file.routes.filter((r) => ids.has(r.id));
}

export const AVG_MIN_PER_STOP: Record<RouteMode, number> = {
  minibus: 4,
  coach: 4,
  bus: 4,
  brt: 2.5,
};
