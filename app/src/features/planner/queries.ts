import { useQuery } from '@tanstack/react-query';

import { getApi } from '@/services/api/raahi-api';
import type { LatLng } from '@/services/api/types';

/** Round to ~10 m so tiny GPS jitter doesn't refetch. */
const key = (p: LatLng | null | undefined) => (p ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : null);

export function useNearestStops(point: LatLng | null | undefined, limit = 3, radiusM = 1500, enabled = true) {
  return useQuery({
    queryKey: ['nearestStops', key(point), limit, radiusM],
    queryFn: () => getApi().nearestStops(point!, limit, radiusM),
    enabled: enabled && !!point,
  });
}

export function useTripPlan(from: LatLng | null | undefined, to: LatLng | null | undefined) {
  return useQuery({
    queryKey: ['plan', key(from), key(to)],
    queryFn: () => getApi().plan({ from: from!, to: to!, maxTransfers: 1 }),
    enabled: !!from && !!to,
  });
}
