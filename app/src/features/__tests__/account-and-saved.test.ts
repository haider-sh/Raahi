import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { bootSession, register, signIn, signOut, useSession, withAuth } from '@/features/account/session';
import { applyUserData, hydrateSaved, isNewer, setSavedPlace, toUserData, useSavedStore } from '@/features/saved/store';
import { syncNow } from '@/features/saved/sync';
import { secureStorage } from '@/lib/secure-storage';
import { devToggles } from '@/services/api/mock/dev-toggles';
import type { MockRaahiApi } from '@/services/api/mock/mock-api';
import { getApi } from '@/services/api/raahi-api';
import type { SavedPlace, UserData } from '@/services/api/types';

const api = getApi() as MockRaahiApi;
const home: SavedPlace = { name: { en: 'Near Nagan Chowrangi', ur: 'ناگن چورنگی کے قریب' }, location: { lat: 24.965, lng: 67.067 } };

async function allAsyncStorage(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  return JSON.stringify(pairs);
}

let n = 0;
const freshEmail = () => `user${++n}@example.com`;

beforeAll(() => {
  devToggles.latency = false;
});

beforeEach(async () => {
  await AsyncStorage.clear();
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
  useSession.setState({ status: 'signedOut', user: null, tokens: null });
  await hydrateSaved();
});

describe('secure storage', () => {
  it('round-trips values and returns null for a missing key', async () => {
    expect(await secureStorage.get('place.home')).toBeNull();
    await secureStorage.set('place.home', home);
    expect(await secureStorage.get('place.home')).toEqual(home);
    await secureStorage.remove('place.home');
    expect(await secureStorage.get('place.home')).toBeNull();
  });
});

describe('what is stored where', () => {
  it('never writes tokens or home to AsyncStorage', async () => {
    await register(freshEmail(), 'password1');
    await setSavedPlace('home', home);
    const { tokens } = useSession.getState();

    const everything = await allAsyncStorage();
    expect(everything).not.toContain(tokens!.accessToken);
    expect(everything).not.toContain(tokens!.refreshToken);
    expect(everything).not.toContain('Nagan');

    expect(await secureStorage.get('auth.tokens')).toEqual(tokens);
    expect(await secureStorage.get('place.home')).toEqual(home);
  });

  it('keeps home after a restart (re-hydrate)', async () => {
    await setSavedPlace('home', home);
    useSavedStore.setState({ home: null, hydrated: false });
    await hydrateSaved();
    expect(useSavedStore.getState().home).toEqual(home);
  });
});

describe('refresh and retry', () => {
  it('retries once after a successful refresh on a 401', async () => {
    await register(freshEmail(), 'password1');
    const before = useSession.getState().tokens!;
    api.expireAccessTokens();

    const call = jest.fn((token: string) => api.getMe(token));
    const { user } = await withAuth(call);

    expect(user.email).toMatch(/@example.com$/);
    expect(call).toHaveBeenCalledTimes(2);
    const after = useSession.getState().tokens!;
    expect(after.refreshToken).not.toBe(before.refreshToken);
    expect(await secureStorage.get('auth.tokens')).toEqual(after);
  });

  it('signs out quietly and keeps saved data when the refresh fails', async () => {
    await register(freshEmail(), 'password1');
    await setSavedPlace('home', home);
    const { refreshToken } = useSession.getState().tokens!;
    await api.logout(refreshToken); // kill the refresh token server-side
    api.expireAccessTokens();

    await expect(withAuth((t) => api.getMe(t))).rejects.toMatchObject({ status: 401 });

    expect(useSession.getState().status).toBe('signedOut');
    expect(await secureStorage.get('auth.tokens')).toBeNull();
    expect(useSavedStore.getState().home).toEqual(home);
    expect(await secureStorage.get('place.home')).toEqual(home);
  });

  it('boot signs out quietly when stored tokens are unknown to the server', async () => {
    await secureStorage.set('auth.tokens', { accessToken: 'acc_dead', refreshToken: 'ref_dead' });
    await bootSession();
    expect(useSession.getState().status).toBe('signedIn'); // optimistic; never blocks
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(useSession.getState().status).toBe('signedOut');
  });
});

describe('sync merge (last write wins)', () => {
  const data = (updatedAt: string, h: SavedPlace | null = null): UserData => ({
    home: h,
    work: null,
    bookmarks: [],
    updatedAt,
  });

  it('compares updatedAt', () => {
    expect(isNewer(data('2026-10-28T10:00:00Z'), data('2026-10-28T09:00:00Z'))).toBe(true);
    expect(isNewer(data('2026-10-28T09:00:00Z'), data('2026-10-28T10:00:00Z'))).toBe(false);
  });

  it('local wins when it is newer: the server gets the local copy', async () => {
    const email = freshEmail();
    await register(email, 'password1');
    await setSavedPlace('home', home);
    await syncNow();
    const server = await withAuth((t) => api.getUserData(t));
    expect(server.home).toEqual(home);
  });

  it('server wins when it is newer: local is replaced on sign-in', async () => {
    const email = freshEmail();
    // Device A saves home and syncs.
    await register(email, 'password1');
    await setSavedPlace('home', home);
    await syncNow();
    await signOut();

    // Device B: an empty guest (updatedAt = epoch) signs in.
    await applyUserData(data(new Date(0).toISOString()));
    expect(useSavedStore.getState().home).toBeNull();
    await signIn(email, 'password1');
    await syncNow();

    expect(useSavedStore.getState().home).toEqual(home);
    expect(await secureStorage.get('place.home')).toEqual(home);
    expect(toUserData().updatedAt).not.toBe(new Date(0).toISOString());
  });

  it('sign-out keeps local data and removes only the tokens', async () => {
    await register(freshEmail(), 'password1');
    await setSavedPlace('home', home);
    await signOut();
    expect(await secureStorage.get('auth.tokens')).toBeNull();
    expect(await secureStorage.get('place.home')).toEqual(home);
  });
});
