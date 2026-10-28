// Background sync of saved items for signed-in users (D20, D24). It never blocks the UI: a failed
// push is retried on the next change or when the app comes back to the foreground.

import { AppState } from 'react-native';

import { useSession, withAuth } from '@/features/account/session';
import { getApi } from '@/services/api/raahi-api';

import { applyUserData, cacheRoute, isNewer, onLocalChange, toUserData, useSavedStore } from './store';

let pending = false;

/** PUT the local copy, then keep whichever copy is newer. */
export async function syncNow(): Promise<void> {
  if (useSession.getState().status !== 'signedIn') return;
  pending = true;
  const result = await withAuth((token) => getApi().putUserData(token, toUserData()));
  pending = false;
  if (isNewer(result, toUserData())) await applyUserData(result);
}

/**
 * Fetch an offline copy of every bookmarked route that lacks one (e.g. it arrived from the
 * server), and refresh the rest quietly. Failures are ignored: the old copy stays.
 */
export async function refreshRouteCaches(): Promise<void> {
  const { bookmarks } = useSavedStore.getState();
  await Promise.all(
    bookmarks.map(async (b) => {
      if (b.kind !== 'route') return;
      try {
        await cacheRoute(await getApi().getRoute(b.routeId));
      } catch {
        // offline or gone; keep what we have
      }
    }),
  );
}

const quietly = (p: Promise<unknown>) => p.catch(() => {});

let timer: ReturnType<typeof setTimeout> | null = null;
function schedulePush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => quietly(syncNow()), 500);
}

/** Wire up sync. Call once, after the saved store and session have booted. */
export function startSync(): () => void {
  const unsubLocal = onLocalChange(() => {
    if (useSession.getState().status === 'signedIn') schedulePush();
    else pending = false;
  });

  const unsubSession = useSession.subscribe((state, prev) => {
    if (state.status === 'signedIn' && prev.status !== 'signedIn') {
      quietly(syncNow().then(refreshRouteCaches));
    }
  });

  const appState = AppState.addEventListener('change', (next) => {
    if (next === 'active' && pending) quietly(syncNow());
  });

  if (useSession.getState().status === 'signedIn') quietly(syncNow());
  quietly(refreshRouteCaches());

  return () => {
    unsubLocal();
    unsubSession();
    appState.remove();
    if (timer) clearTimeout(timer);
  };
}
