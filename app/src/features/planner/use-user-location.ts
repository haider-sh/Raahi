import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { setGps } from './store';

/**
 * - `checking`: reading the current permission
 * - `explain`: never asked; show our explanation before the system prompt
 * - `denied`: the user said no; fall back to picking on the map (no dead ends)
 * - `servicesOff`: permission granted but location is turned off
 * - `locating` / `ready`
 */
export type LocationStatus = 'checking' | 'explain' | 'denied' | 'servicesOff' | 'locating' | 'ready';

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);

  const locate = useCallback(async () => {
    if (!(await Location.hasServicesEnabledAsync())) {
      setStatus('servicesOff');
      return;
    }
    setStatus('locating');
    try {
      // Instant but possibly stale fix first, then a fresh one.
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setGps({ lat: last.coords.latitude, lng: last.coords.longitude });
        setStatus('ready');
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps({ lat: current.coords.latitude, lng: current.coords.longitude });
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'servicesOff'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync().then((perm) => {
      if (cancelled) return;
      setCanAskAgain(perm.canAskAgain);
      if (perm.granted) locate();
      else if (perm.canAskAgain && perm.status === Location.PermissionStatus.UNDETERMINED) setStatus('explain');
      else setStatus('denied');
    });
    return () => {
      cancelled = true;
    };
  }, [locate]);

  const request = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    setCanAskAgain(perm.canAskAgain);
    if (perm.granted) await locate();
    else setStatus('denied');
  }, [locate]);

  const dismissExplanation = useCallback(() => setStatus('denied'), []);

  return { status, canAskAgain, request, retry: locate, dismissExplanation };
}
