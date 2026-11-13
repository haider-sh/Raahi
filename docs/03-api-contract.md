# 03 · API contract (v1, draft)

This is the contract between `app/` and `api/`. In Phase 1 the app's `MockRaahiApi` implements it; in Phase 2 the real API implements it. **Change this file in the same commit as any change to either side.**

When the API work starts, convert this into an OpenAPI spec in `api/` and generate the app's types from it.

## Conventions

- Base URL: `EXPO_PUBLIC_API_URL` (e.g. `https://api.raahi.pk/v1`).
- Coordinates are always `{ "lat": number, "lng": number }` (WGS84).
- Distances are in metres (integers); durations are in minutes (integers).
- Text shown to users is `LocalizedText = { "en": string, "ur": string }`. The client picks the language; the server never does.
- Polylines use the [Google encoded polyline](https://developers.google.com/maps/documentation/utilities/polylinealgorithm) format, precision 5.
- Errors look like `{ "error": { "code": "NO_STOPS_NEARBY", "message": "..." } }` with a matching HTTP status.
- Endpoints marked 🔒 need `Authorization: Bearer <accessToken>` and return `401 UNAUTHENTICATED` without a valid one. Everything else is public and works without an account (D20).

## Types

```ts
type LatLng = { lat: number; lng: number };
type LocalizedText = { en: string; ur: string };

type Stop = {
  id: string;
  name: LocalizedText;
  location: LatLng;
};

type RouteMode = 'minibus' | 'coach' | 'bus' | 'brt'; // bus/brt = government services (add-on)

type RouteSummary = {
  id: string;
  code: string;             // the name commuters use: "D7", "W18", "Masood"
  name: LocalizedText;
  mode: RouteMode;
};
// No colour, plate or fare. Leg colours on the map are assigned by the app.

type WalkLeg = {
  type: 'walk';
  from: LatLng;
  to: LatLng;
  toStopId?: string;
  distanceM: number;
  durationMin: number;
};

type RideLeg = {
  type: 'ride';
  route: RouteSummary;
  variantId: string;
  towards: LocalizedText;   // last stop of this direction, e.g. "Saddar"
  boardStop: Stop;
  alightStop: Stop;
  stops: Stop[];            // ordered, board → alight inclusive
  durationMin: number;
  polyline: string;         // shape between board and alight
};

type TripOption = {
  id: string;
  legs: (WalkLeg | RideLeg)[];
  durationMin: number;
  walkM: number;
  transfers: number;
};

type Place = {
  kind: 'stop' | 'landmark';
  id: string;
  name: LocalizedText;
  location: LatLng;
  subtitle?: LocalizedText; // e.g. area name
};

type RouteVariantDetail = {
  id: string;
  towards: LocalizedText;
  stops: Stop[];            // ordered, terminus → terminus
  polyline: string;
};

type RouteDetail = {
  route: RouteSummary;
  variants: RouteVariantDetail[]; // usually two: one per direction
};

type User = { id: string; email: string; name?: string };

type AuthTokens = { accessToken: string; refreshToken: string };

type SavedPlace = {
  name: LocalizedText;      // from the chosen Place, or the nearest stop/landmark for a map pick
  location: LatLng;
  placeId?: string;
};

type Bookmark =
  | { id: string; kind: 'route'; routeId: string; savedAt: string }
  | { id: string; kind: 'trip'; trip: TripOption; fromName: LocalizedText; toName: LocalizedText; savedAt: string };
// The server stores route bookmarks by ID only. The app keeps its own offline copy of each RouteDetail.

type UserData = {
  home: SavedPlace | null;
  work: SavedPlace | null;
  bookmarks: Bookmark[];
  updatedAt: string;        // ISO 8601; last write wins
};
```

## Endpoints

### `GET /places/search?q=<text>&near=<lat>,<lng>&limit=10`

Search stops and landmarks by Urdu, English or romanised text (for example "saddar", "صدر" and "Saddar" should all match). `near` biases results towards that point. It also matches **routes** by `code` and `name` ("d7", "D-7", "ڈی 7"), so one search box finds both places and buses.

→ `200 { "places": Place[], "routes": RouteSummary[] }`. `limit` applies to each list separately.

### `GET /stops/nearest?lat=&lng=&limit=3&radiusM=1500`

→ `200 { "stops": { "stop": Stop, "distanceM": number, "routes": RouteSummary[] }[] }`

If no stop is within `radiusM`, it returns an empty list (not an error).

### `GET /stops/:id`

A stop and every bus that passes through it, for the stop detail screen.

→ `200 { "stop": Stop, "routes": { "route": RouteSummary, "variantId": string, "towards": LocalizedText }[] }`

There's one entry per **direction**, so a route serving the stop both ways appears twice. A direction whose **last** stop is this stop is left out, because nobody can board it here (so a terminus lists only the outbound direction). Error: `404 NOT_FOUND`.

### `POST /plan`

```json
{ "from": { "lat": 31.5, "lng": 74.3 }, "to": { "lat": 31.52, "lng": 74.35 }, "maxTransfers": 1 }
```

→ `200 { "options": TripOption[] }`, ranked best first, at most 5.

Errors: `422 NO_STOPS_NEARBY` (no stop within walking range of `from` or `to`), `422 NO_ROUTE` (stops exist but no trip within `maxTransfers`).

### `GET /routes/:id`

The full route, terminus to terminus in each direction, for the route detail screen. The app also stores this response for bookmarked routes so they open offline.

→ `200 RouteDetail`. Error: `404 NOT_FOUND`.

### Accounts (optional)

Phase 1 implements these in `MockRaahiApi` (D21). The app stores both tokens in `expo-secure-store`, never in AsyncStorage (D22).

| Endpoint | Body | Response | Errors |
| --- | --- | --- | --- |
| `POST /auth/register` | `{ "email", "password", "name"? }` | `201 { "user": User, "tokens": AuthTokens }` | `409 EMAIL_TAKEN`, `422 VALIDATION` (password under 8 characters, bad email) |
| `POST /auth/login` | `{ "email", "password" }` | `200 { "user": User, "tokens": AuthTokens }` | `401 INVALID_CREDENTIALS` |
| `POST /auth/refresh` | `{ "refreshToken" }` | `200 { "tokens": AuthTokens }`. The refresh token rotates: the old one stops working. | `401 INVALID_TOKEN` |
| `POST /auth/logout` | `{ "refreshToken" }` | `204` | — |
| 🔒 `GET /me` | — | `200 { "user": User }` | — |

The access token is short-lived. On a `401` the app calls `/auth/refresh` once and retries; if that fails too, it signs the user out **and keeps all local data**.

### Saved data sync 🔒

| Endpoint | Body | Response |
| --- | --- | --- |
| `GET /me/data` | — | `200 UserData` (empty lists and `null`s for a new user) |
| `PUT /me/data` | `UserData` | `200 UserData`: whichever copy has the newer `updatedAt` (D24) |

On sign-in the app sends its local copy with `PUT`, then uses whatever comes back. Home/work locations are sent to the server only when the user is signed in.

### Later (not in Phase 1)

- `GET /network/version` and `GET /network/bundle`: the whole-city download for offline mode.
- `POST /reports`: "this info is wrong" feedback.
