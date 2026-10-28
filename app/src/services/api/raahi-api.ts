import { HttpRaahiApi } from './http-api';
import { MockRaahiApi } from './mock/mock-api';
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
} from './types';

/**
 * Everything the app knows about the backend. Screens and hooks only ever talk to this, so the
 * mock (Phase 1) and the HTTP client (Phase 2) are interchangeable. See docs/03-api-contract.md.
 * Failures throw `ApiError`.
 */
export interface RaahiApi {
  searchPlaces(q: string, near?: LatLng, limit?: number): Promise<SearchResponse>;
  nearestStops(point: LatLng, limit?: number, radiusM?: number): Promise<NearestStopsResponse>;
  getStop(id: string): Promise<StopDetailResponse>;
  plan(req: PlanRequest): Promise<PlanResponse>;
  getRoute(id: string): Promise<RouteDetail>;

  register(email: string, password: string, name?: string): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
  refresh(refreshToken: string): Promise<{ tokens: AuthTokens }>;
  logout(refreshToken: string): Promise<void>;
  getMe(accessToken: string): Promise<{ user: User }>;
  getUserData(accessToken: string): Promise<UserData>;
  putUserData(accessToken: string, data: UserData): Promise<UserData>;
}

let instance: RaahiApi | null = null;

/** The mock unless EXPO_PUBLIC_USE_MOCK_API is explicitly "false". */
export function getApi(): RaahiApi {
  if (!instance) {
    instance =
      process.env.EXPO_PUBLIC_USE_MOCK_API === 'false'
        ? new HttpRaahiApi(process.env.EXPO_PUBLIC_API_URL ?? '')
        : new MockRaahiApi();
  }
  return instance;
}
