import { useQuery } from '@tanstack/react-query';

import { cacheRoute, useSavedStore } from '@/features/saved/store';
import { getApi } from '@/services/api/raahi-api';

/** Falls back to the saved offline copy, and refreshes that copy when online. */
export function useRoute(id: string | undefined) {
  const cached = useSavedStore((s) => (id ? s.routeCache[id] : undefined));
  return useQuery({
    queryKey: ['route', id],
    queryFn: async () => {
      const detail = await getApi().getRoute(id!);
      if (useSavedStore.getState().routeCache[detail.route.id]) await cacheRoute(detail);
      return detail;
    },
    enabled: !!id,
    placeholderData: cached,
  });
}

export function useStop(id: string | undefined) {
  return useQuery({
    queryKey: ['stop', id],
    queryFn: () => getApi().getStop(id!),
    enabled: !!id,
  });
}
