// Optional account session (D20). Tokens live only in secure storage (D22). Signing out removes
// the tokens and nothing else: saved places and trips stay on the phone.

import { create } from 'zustand';

import { secureStorage } from '@/lib/secure-storage';
import { isApiError } from '@/services/api/errors';
import { getApi } from '@/services/api/raahi-api';
import type { AuthResponse, AuthTokens, User } from '@/services/api/types';

type SessionState = {
  /** `unknown` until boot has read secure storage. */
  status: 'unknown' | 'signedOut' | 'signedIn';
  user: User | null;
  tokens: AuthTokens | null;
};

export const useSession = create<SessionState>(() => ({ status: 'unknown', user: null, tokens: null }));

async function setSignedIn({ user, tokens }: AuthResponse) {
  await secureStorage.set('auth.tokens', tokens);
  useSession.setState({ status: 'signedIn', user, tokens });
}

/** Reads tokens and confirms them with GET /me in the background. The app never waits on it. */
export async function bootSession(): Promise<void> {
  const tokens = await secureStorage.get('auth.tokens');
  if (!tokens) {
    useSession.setState({ status: 'signedOut', user: null, tokens: null });
    return;
  }
  useSession.setState({ status: 'signedIn', tokens });
  withAuth((token) => getApi().getMe(token))
    .then(({ user }) => useSession.setState({ user }))
    .catch(() => {
      // withAuth has already signed out if the tokens are dead; a network error just waits.
    });
}

export async function signIn(email: string, password: string): Promise<void> {
  await setSignedIn(await getApi().login(email, password));
}

export async function register(email: string, password: string, name?: string): Promise<void> {
  await setSignedIn(await getApi().register(email, password, name));
}

export async function signOut(): Promise<void> {
  const { tokens } = useSession.getState();
  useSession.setState({ status: 'signedOut', user: null, tokens: null });
  await secureStorage.remove('auth.tokens');
  if (tokens) getApi().logout(tokens.refreshToken).catch(() => {});
}

let refreshing: Promise<AuthTokens | null> | null = null;

/** One refresh at a time, shared by every request that hit a 401 at once. */
function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  refreshing ??= getApi()
    .refresh(refreshToken)
    .then(async ({ tokens }) => {
      await secureStorage.set('auth.tokens', tokens);
      useSession.setState({ tokens });
      return tokens;
    })
    .catch((e) => (isApiError(e, 'NETWORK') ? Promise.reject(e) : null))
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Runs an authenticated call. On a 401 it refreshes once and retries; if the refresh is rejected
 * it signs out quietly (keeping local data) and rethrows.
 */
export async function withAuth<T>(call: (accessToken: string) => Promise<T>): Promise<T> {
  const { tokens } = useSession.getState();
  if (!tokens) throw new Error('Not signed in');
  try {
    return await call(tokens.accessToken);
  } catch (e) {
    if (!isApiError(e) || e.status !== 401) throw e;
    const fresh = await refreshTokens(tokens.refreshToken);
    if (!fresh) {
      await signOut();
      throw e;
    }
    return call(fresh.accessToken);
  }
}
