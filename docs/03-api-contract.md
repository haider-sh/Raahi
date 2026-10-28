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
```

## Endpoints

### `GET /places/search?q=<text>&near=<lat>,<lng>&limit=10`

Search stops and landmarks by Urdu, English or romanised text (for example "saddar", "صدر" and "Saddar" should all match). `near` biases results towards that point.

→ `200 { "places": Place[] }`

### `GET /stops/nearest?lat=&lng=&limit=3&radiusM=1500`

→ `200 { "stops": { "stop": Stop, "distanceM": number, "routes": RouteSummary[] }[] }`

If no stop is within `radiusM`, it returns an empty list (not an error).

### `POST /plan`

```json
{ "from": { "lat": 31.5, "lng": 74.3 }, "to": { "lat": 31.52, "lng": 74.35 }, "maxTransfers": 1 }
```

→ `200 { "options": TripOption[] }`, ranked best first, at most 5.

Errors: `422 NO_STOPS_NEARBY` (no stop within walking range of `from` or `to`), `422 NO_ROUTE` (stops exist but no trip within `maxTransfers`).

### `GET /routes/:id`

The full route, for a "view whole route" screen.

→ `200 { "route": RouteSummary, "variants": { "id": string, "towards": LocalizedText, "stops": Stop[], "polyline": string }[] }`

### Later (not in Phase 1)

- `GET /network/version` and `GET /network/bundle`: the whole-city download for offline mode.
- `POST /reports`: "this info is wrong" feedback.
