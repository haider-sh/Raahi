import { ApiError } from '../../errors';
import { devToggles } from '../dev-toggles';
import { MockRaahiApi } from '../mock-api';
import { normalize } from '../search';

beforeAll(() => {
  devToggles.latency = false;
});
afterEach(() => {
  devToggles.forceError = null;
});

const api = new MockRaahiApi();

describe('search', () => {
  it('normalises spelling, case, hyphens and Urdu letter forms', () => {
    expect(normalize('D-7')).toBe('d7');
    expect(normalize('d 7')).toBe('d7');
    expect(normalize('ڈی 7')).toBe('ڈی7');
    // Arabic yeh/kaf → Urdu forms, and diacritics stripped
    expect(normalize('كراچي')).toBe(normalize('کراچی'));
    expect(normalize('صَدر')).toBe('صدر');
  });

  it.each(['saddar', 'Saddar', 'صدر', 'sadar'])('"%s" finds Saddar', async (q) => {
    const { places } = await api.searchPlaces(q);
    expect(places[0]).toMatchObject({ kind: 'stop', id: 's_saddar' });
  });

  it.each(['d7', 'D-7', 'D7', 'ڈی 7'])('"%s" finds the D7 route', async (q) => {
    const { routes } = await api.searchPlaces(q);
    expect(routes[0]?.id).toBe('r_d7');
  });

  it('finds landmarks by alias, with a nearby stop as the subtitle', async () => {
    const { places } = await api.searchPlaces('jpmc');
    expect(places[0]).toMatchObject({ kind: 'landmark', id: 'l_jpmc' });
    expect(places[0].subtitle?.en).toMatch(/^Near /);
  });

  it('returns nothing for an empty query', async () => {
    expect(await api.searchPlaces('  ')).toEqual({ places: [], routes: [] });
  });
});

describe('stops', () => {
  it('getStop lists a two-way route once per direction', async () => {
    const { routes } = await api.getStop('s_nagan');
    const w18 = routes.filter((r) => r.route.id === 'r_w18');
    expect(w18).toHaveLength(2);
    expect(w18.map((r) => r.towards.en).sort()).toEqual(['Power House Chowrangi', 'Tower']);
  });

  it('getStop leaves out the direction that ends at a terminus', async () => {
    const { routes } = await api.getStop('s_tower');
    expect(routes.every((r) => r.towards.en !== 'Tower')).toBe(true);
  });

  it('getStop throws NOT_FOUND for an unknown id', async () => {
    await expect(api.getStop('nope')).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('nearestStops returns an empty list (not an error) far from any stop', async () => {
    expect(await api.nearestStops({ lat: 25.396, lng: 68.3578 })).toEqual({ stops: [] });
  });

  it('nearestStops sorts by distance and lists routes', async () => {
    const { stops } = await api.nearestStops({ lat: 24.9653, lng: 67.0668 });
    expect(stops[0].stop.id).toBe('s_nagan');
    expect(stops[0].routes.map((r) => r.code)).toContain('W18');
  });
});

describe('getRoute', () => {
  it('returns both directions terminus to terminus', async () => {
    const detail = await api.getRoute('r_w18');
    expect(detail.variants).toHaveLength(2);
    const [a, b] = detail.variants;
    expect(a.stops.map((s) => s.id)).toEqual([...b.stops].reverse().map((s) => s.id));
  });
});

describe('forced errors', () => {
  it('can force NO_ROUTE on plan', async () => {
    devToggles.forceError = 'NO_ROUTE';
    const err = await api
      .plan({ from: { lat: 24.9653, lng: 67.0668 }, to: { lat: 24.8605, lng: 67.03 }, maxTransfers: 1 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NO_ROUTE');
  });
});

describe('accounts', () => {
  it('register → getMe → expiry → refresh rotates the token', async () => {
    const auth = new MockRaahiApi();
    const { user, tokens } = await auth.register('a@example.com', 'password1');
    expect((await auth.getMe(tokens.accessToken)).user).toEqual(user);

    auth.expireAccessTokens();
    await expect(auth.getMe(tokens.accessToken)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    const { tokens: next } = await auth.refresh(tokens.refreshToken);
    expect((await auth.getMe(next.accessToken)).user.id).toBe(user.id);
    await expect(auth.refresh(tokens.refreshToken)).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('validates registration and login', async () => {
    const auth = new MockRaahiApi();
    await expect(auth.register('bad', 'password1')).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(auth.register('b@example.com', 'short')).rejects.toMatchObject({ code: 'VALIDATION' });
    await auth.register('b@example.com', 'password1');
    await expect(auth.register('B@example.com', 'password1')).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
    await expect(auth.login('b@example.com', 'wrong-pass')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});
