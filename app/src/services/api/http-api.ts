// Phase 2 client for api/. Written against docs/03-api-contract.md but not yet run against a real
// server; the app uses MockRaahiApi until EXPO_PUBLIC_USE_MOCK_API=false.

import { ApiError } from './errors';
import type { RaahiApi } from './raahi-api';
import type {
  AuthResponse,
  AuthTokens,
  ErrorCode,
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

type RequestOptions = { method?: string; body?: unknown; token?: string };

export class HttpRaahiApi implements RaahiApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('NETWORK', 0, 'Network request failed');
    }
    if (res.status === 204) return undefined as T;
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = json?.error as { code?: ErrorCode; message?: string } | undefined;
      throw new ApiError(err?.code ?? (res.status === 401 ? 'UNAUTHENTICATED' : 'NOT_FOUND'), res.status, err?.message);
    }
    return json as T;
  }

  searchPlaces(q: string, near?: LatLng, limit = 10) {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (near) params.set('near', `${near.lat},${near.lng}`);
    return this.request<SearchResponse>(`/places/search?${params}`);
  }

  nearestStops(point: LatLng, limit = 3, radiusM = 1500) {
    const params = new URLSearchParams({
      lat: String(point.lat),
      lng: String(point.lng),
      limit: String(limit),
      radiusM: String(radiusM),
    });
    return this.request<NearestStopsResponse>(`/stops/nearest?${params}`);
  }

  getStop(id: string) {
    return this.request<StopDetailResponse>(`/stops/${encodeURIComponent(id)}`);
  }

  plan(req: PlanRequest) {
    return this.request<PlanResponse>('/plan', { method: 'POST', body: req });
  }

  getRoute(id: string) {
    return this.request<RouteDetail>(`/routes/${encodeURIComponent(id)}`);
  }

  register(email: string, password: string, name?: string) {
    return this.request<AuthResponse>('/auth/register', { method: 'POST', body: { email, password, name } });
  }

  login(email: string, password: string) {
    return this.request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
  }

  refresh(refreshToken: string) {
    return this.request<{ tokens: AuthTokens }>('/auth/refresh', { method: 'POST', body: { refreshToken } });
  }

  logout(refreshToken: string) {
    return this.request<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
  }

  getMe(accessToken: string) {
    return this.request<{ user: User }>('/me', { token: accessToken });
  }

  getUserData(accessToken: string) {
    return this.request<UserData>('/me/data', { token: accessToken });
  }

  putUserData(accessToken: string, data: UserData) {
    return this.request<UserData>('/me/data', { method: 'PUT', body: data, token: accessToken });
  }
}
