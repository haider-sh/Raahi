import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getApi } from '@/services/api/raahi-api';
import type { LatLng } from '@/services/api/types';

export function usePlaceSearch(q: string, near?: LatLng | null) {
  const query = q.trim();
  return useQuery({
    queryKey: ['search', query, near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : null],
    queryFn: () => getApi().searchPlaces(query, near ?? undefined, 10),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
}
