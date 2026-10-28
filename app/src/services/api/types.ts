// Mirrors docs/03-api-contract.md exactly. Change both in the same commit.

export type LatLng = { lat: number; lng: number };
export type LocalizedText = { en: string; ur: string };

export type Stop = {
  id: string;
  name: LocalizedText;
  location: LatLng;
};

export type RouteMode = 'minibus' | 'coach' | 'bus' | 'brt'; // bus/brt = government services (add-on)

export type RouteSummary = {
  id: string;
  code: string; // the name commuters use: "D7", "W18", "Masood"
  name: LocalizedText;
  mode: RouteMode;
};
// No colour, plate or fare. Leg colours on the map are assigned by the app.

export type WalkLeg = {
  type: 'walk';
  from: LatLng;
  to: LatLng;
  toStopId?: string;
  distanceM: number;
  durationMin: number;
};

export type RideLeg = {
  type: 'ride';
  route: RouteSummary;
  variantId: string;
  towards: LocalizedText; // last stop of this direction, e.g. "Saddar"
  boardStop: Stop;
  alightStop: Stop;
  stops: Stop[]; // ordered, board → alight inclusive
  durationMin: number;
  polyline: string; // shape between board and alight
};

export type TripOption = {
  id: string;
  legs: (WalkLeg | RideLeg)[];
  durationMin: number;
  walkM: number;
  transfers: number;
};

export type Place = {
  kind: 'stop' | 'landmark';
  id: string;
  name: LocalizedText;
  location: LatLng;
  subtitle?: LocalizedText; // e.g. area name
};

export type RouteVariantDetail = {
  id: string;
  towards: LocalizedText;
  stops: Stop[]; // ordered, terminus → terminus
  polyline: string;
};

export type RouteDetail = {
  route: RouteSummary;
  variants: RouteVariantDetail[]; // usually two: one per direction
};

export type User = { id: string; email: string; name?: string };

export type AuthTokens = { accessToken: string; refreshToken: string };

export type SavedPlace = {
  name: LocalizedText; // from the chosen Place, or the nearest stop/landmark for a map pick
  location: LatLng;
  placeId?: string;
};

export type Bookmark =
  | { id: string; kind: 'route'; routeId: string; savedAt: string }
  | {
      id: string;
      kind: 'trip';
      trip: TripOption;
      fromName: LocalizedText;
      toName: LocalizedText;
      savedAt: string;
    };
// The server stores route bookmarks by ID only. The app keeps its own offline copy of each RouteDetail.

export type UserData = {
  home: SavedPlace | null;
  work: SavedPlace | null;
  bookmarks: Bookmark[];
  updatedAt: string; // ISO 8601; last write wins
};

// Response bodies

export type SearchResponse = { places: Place[]; routes: RouteSummary[] };

export type NearestStop = { stop: Stop; distanceM: number; routes: RouteSummary[] };
export type NearestStopsResponse = { stops: NearestStop[] };

export type StopRouteDirection = { route: RouteSummary; variantId: string; towards: LocalizedText };
export type StopDetailResponse = { stop: Stop; routes: StopRouteDirection[] };

export type PlanRequest = { from: LatLng; to: LatLng; maxTransfers: number };
export type PlanResponse = { options: TripOption[] };

export type AuthResponse = { user: User; tokens: AuthTokens };

export type ErrorCode =
  | 'NO_STOPS_NEARBY'
  | 'NO_ROUTE'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'UNAUTHENTICATED';
