// In-app implementation of docs/03-api-contract.md over the fixture network (D8).
// Accounts are in memory only (D21), so they reset when the app restarts.

import { ApiError, type ApiErrorCode } from '../errors';
import type { RaahiApi } from '../raahi-api';
import type {
  AuthResponse,
  AuthTokens,
  LatLng,
  NearestStopsResponse,
  PlanRequest,
  PlanResponse,
  RouteDetail,
  SearchResponse,
  StopDetailResponse,
  User,
  UserData,
} from '../types';
import { devToggles, FORCEABLE_ERRORS } from './dev-toggles';
import networkFile from './fixtures/network.json';
import { indexNetwork, type Network, type NetworkFile, routesAtStop, stopsWithin, toStop } from './network';
import { plan } from './planner';
import { searchPlaces } from './search';

/** Short on purpose, so the refresh-and-retry path gets exercised in normal use. */
export const ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000;

const STATUS: Record<ApiErrorCode, number> = {
  NO_STOPS_NEARBY: 422,
  NO_ROUTE: 422,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  VALIDATION: 422,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  UNAUTHENTICATED: 401,
  NETWORK: 0,
};

const fail = (code: ApiErrorCode, message?: string): never => {
  throw new ApiError(code, STATUS[code], message);
};

type MockUser = User & { password: string };

const emptyUserData = (): UserData => ({
  home: null,
  work: null,
  bookmarks: [],
  updatedAt: new Date(0).toISOString(),
});

const randomToken = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

export class MockRaahiApi implements RaahiApi {
  readonly network: Network;
  private users = new Map<string, MockUser>(); // by email
  private accessTokens = new Map<string, { userId: string; expiresAt: number }>();
  private refreshTokens = new Map<string, string>(); // token → userId
  private userData = new Map<string, UserData>();
  /** Injectable clock, for tests. */
  now = () => Date.now();

  constructor(file: NetworkFile = networkFile as NetworkFile) {
    this.network = indexNetwork(file);
  }

  /** Fake latency plus any forced error from Settings → Developer. */
  private async simulate(method: string) {
    if (devToggles.latency) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 600));
    }
    const forced = devToggles.forceError;
    if (forced) {
      const rule = FORCEABLE_ERRORS.find((r) => r.code === forced);
      if (rule && (rule.methods.includes('*') || rule.methods.includes(method))) fail(forced);
    }
  }

  async searchPlaces(q: string, near?: LatLng, limit = 10): Promise<SearchResponse> {
    await this.simulate('searchPlaces');
    return searchPlaces(this.network, q, near, limit);
  }

  async nearestStops(point: LatLng, limit = 3, radiusM = 1500): Promise<NearestStopsResponse> {
    await this.simulate('nearestStops');
    return {
      stops: stopsWithin(this.network, point, radiusM)
        .slice(0, limit)
        .map(({ stop, distanceM }) => ({ stop: toStop(stop), distanceM, routes: routesAtStop(this.network, stop.id) })),
    };
  }

  async getStop(id: string): Promise<StopDetailResponse> {
    await this.simulate('getStop');
    const stop = this.network.stops.get(id) ?? fail('NOT_FOUND');
    const routes = (this.network.variantsAtStop.get(id) ?? [])
      // A direction that ends here can't be boarded here.
      .filter(({ variant, seq }) => seq < variant.stopIds.length - 1)
      .map(({ variant }) => ({
        route: this.network.routes.get(variant.routeId)!,
        variantId: variant.id,
        towards: variant.towards,
      }));
    return { stop: toStop(stop), routes };
  }

  async plan(req: PlanRequest): Promise<PlanResponse> {
    await this.simulate('plan');
    const result = plan(this.network, req.from, req.to, Math.min(req.maxTransfers, 1));
    if (!result.ok) {
      fail(
        result.code,
        result.code === 'NO_STOPS_NEARBY'
          ? `No stop within walking range of ${result.end === 'to' ? 'the destination' : 'the start'}`
          : 'No trip within the allowed transfers',
      );
    }
    return { options: result.ok ? result.options : [] };
  }

  async getRoute(id: string): Promise<RouteDetail> {
    await this.simulate('getRoute');
    const route = this.network.routes.get(id) ?? fail('NOT_FOUND');
    const variants = this.network.file.variants
      .filter((v) => v.routeId === id)
      .map((v) => ({
        id: v.id,
        towards: v.towards,
        stops: v.stopIds.map((s) => toStop(this.network.stops.get(s)!)),
        polyline: v.shape,
      }));
    return { route, variants };
  }

  // Accounts

  private issueTokens(userId: string): AuthTokens {
    const accessToken = randomToken('acc');
    const refreshToken = randomToken('ref');
    this.accessTokens.set(accessToken, { userId, expiresAt: this.now() + ACCESS_TOKEN_TTL_MS });
    this.refreshTokens.set(refreshToken, userId);
    return { accessToken, refreshToken };
  }

  private userFor(accessToken: string): MockUser {
    const entry = this.accessTokens.get(accessToken);
    if (!entry || entry.expiresAt <= this.now()) fail('UNAUTHENTICATED');
    const user = [...this.users.values()].find((u) => u.id === entry!.userId);
    return user ?? fail('UNAUTHENTICATED');
  }

  private publicUser({ password: _password, ...user }: MockUser): User {
    return user;
  }

  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    await this.simulate('register');
    const key = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) fail('VALIDATION', 'Enter a valid email address');
    if (password.length < 8) fail('VALIDATION', 'Password must be at least 8 characters');
    if (this.users.has(key)) fail('EMAIL_TAKEN');
    const user: MockUser = { id: randomToken('u'), email: key, password, ...(name ? { name } : {}) };
    this.users.set(key, user);
    return { user: this.publicUser(user), tokens: this.issueTokens(user.id) };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    await this.simulate('login');
    const user = this.users.get(email.trim().toLowerCase());
    if (!user || user.password !== password) fail('INVALID_CREDENTIALS');
    return { user: this.publicUser(user!), tokens: this.issueTokens(user!.id) };
  }

  async refresh(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    await this.simulate('refresh');
    const userId = this.refreshTokens.get(refreshToken) ?? fail('INVALID_TOKEN');
    this.refreshTokens.delete(refreshToken); // rotation: the old token stops working
    return { tokens: this.issueTokens(userId) };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.simulate('logout');
    this.refreshTokens.delete(refreshToken);
  }

  async getMe(accessToken: string): Promise<{ user: User }> {
    await this.simulate('getMe');
    return { user: this.publicUser(this.userFor(accessToken)) };
  }

  async getUserData(accessToken: string): Promise<UserData> {
    await this.simulate('getUserData');
    const user = this.userFor(accessToken);
    return this.userData.get(user.id) ?? emptyUserData();
  }

  async putUserData(accessToken: string, data: UserData): Promise<UserData> {
    await this.simulate('putUserData');
    const user = this.userFor(accessToken);
    const current = this.userData.get(user.id) ?? emptyUserData();
    // D24: whole-document replace, newer updatedAt wins.
    const winner = Date.parse(data.updatedAt) > Date.parse(current.updatedAt) ? data : current;
    this.userData.set(user.id, winner);
    return winner;
  }

  /** Test helper: make every issued access token expire. */
  expireAccessTokens() {
    for (const entry of this.accessTokens.values()) entry.expiresAt = 0;
  }
}
