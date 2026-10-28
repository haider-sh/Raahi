# 02 · Architecture

## System overview

```
┌────────────────────────── app/ (Expo, Android-first) ──────────────────────────┐
│  Screens (Expo Router)                                                          │
│     │                                                                           │
│  Feature hooks (useTripPlan, useNearestStops, ...)  ← TanStack Query cache      │
│     │                                                                           │
│  RaahiApi interface ──┬── HttpRaahiApi  ──────────────► api/ (Phase 2)          │
│                       └── MockRaahiApi  (Phase 1: fixture network + JS planner) │
│                                                                                 │
│  Device: expo-location · react-native-maps                                      │
│          AsyncStorage (bookmarks, prefs) · expo-secure-store (tokens, home/work) │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────── api/ (Node + Express, Phase 2) ────────────────────────┐
│  /v1/places/search  /v1/stops/nearest  /v1/stops/:id  /v1/plan  /v1/routes/:id  │
│  /v1/auth/*  /v1/me  /v1/me/data   (optional accounts)                          │
│     │                                                                           │
│  Planner service (in-memory network graph, rebuilt on data import)              │
│     │                                                                           │
│  PostgreSQL + PostGIS  (stops, routes, variants, shapes, landmarks)             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

The key design choice is that **the app talks only to the `RaahiApi` interface**. In Phase 1 that interface is backed by a mock that runs a simplified version of the real planning algorithm over a hand-built fixture network. In Phase 2 we swap in the HTTP implementation, and no screens change.

## Domain model

The model is shaped after [GTFS](https://gtfs.org/schedule/reference/) (the standard transit data format) but simplified, so that any real GTFS feed we find later can be imported directly.

| Entity | Meaning | Key fields |
| --- | --- | --- |
| **Stop** | A place a bus stops | `id`, `name {en, ur}`, `location (lat,lng)`, `aliases[]` (romanised spellings, nearby landmarks) |
| **Route** | A bus service as people know it, e.g. "W18", "Masood" | `id`, `code` ("W18"; the name people use), `name {en, ur}`, `mode` (minibus / coach / bus / brt) |
| **RouteVariant** | **One direction** (or branch) of a route | `id`, `routeId`, `towards {en, ur}` (the last stop's name, which we derive; it is *not* a painted sign), `stopIds[]` in order, `shape` (polyline) |
| **Landmark** | A searchable place that isn't a stop ("Jinnah Hospital") | `id`, `name {en, ur}`, `location`, `aliases[]` |

**Why variants matter:** a route runs in two directions, and the most common way to get stranded is **boarding the right bus going the wrong way**. Trip planning always works on variants, never on routes, and the UI always shows the direction ("towards Saddar").

**Identifying buses:** in Karachi, many vehicles run under one route name (every "D7" serves the D7 route), and they have no consistent colour, plate or destination board. So **the route code is the only identifier we show**, and direction is given as "towards ‹last stop›". We do still give each leg a colour on the map, but the app assigns it from a fixed palette just to tell legs apart; it isn't data about the bus.

**Hail-and-ride:** informal minibuses pick people up and drop them off almost anywhere along the road. In Phase 1, "stops" are the **well-known points** along each route (chowrangis, mors, markets), which is also how route descriptions list them. A later improvement is to let the planner board or alight at the nearest point *on the route's shape*, rather than only at a listed stop.

### PostGIS tables (Phase 2, for reference)

```sql
stops          (id, name_en, name_ur, aliases text[], geom geography(Point,4326))   -- GIST index on geom
routes         (id, code, name_en, name_ur, mode)
route_variants (id, route_id, towards_en, towards_ur, shape geography(LineString,4326))
variant_stops  (variant_id, seq, stop_id, dist_along_m)                            -- PK (variant_id, seq)
landmarks      (id, name_en, name_ur, aliases text[], geom geography(Point,4326))
data_meta      (entity, entity_id, source, verified_at, confidence)
users          (id, email unique, password_hash, name, created_at)                 -- argon2id/bcrypt hash
refresh_tokens (id, user_id, token_hash, expires_at, revoked_at)                   -- stored hashed, rotated on use
user_data      (user_id PK, doc jsonb, updated_at)                                 -- the UserData document
```

Nearest-stop lookups use `ST_DWithin(geom, :point, :radius)` ordered by `geom <-> :point`.

## Trip planning algorithm

The input is `from`, `to` and `maxTransfers` (1 for now). The output is a ranked list of trip options.

1. **Access stops:** all stops within walking radius `R` (default 800 m, widened to 1.5 km if nothing is found) of `from`, with walk distance.
2. **Egress stops:** the same, around `to`.
3. **Direct options:** for every variant `v` that contains an access stop `a` and an egress stop `e` with `seq(a) < seq(e)`, emit `walk → ride v from a to e → walk`.
4. **One-transfer options:** for variants `v1` (from an access stop) and `v2` (to an egress stop), find a transfer pair `(t1 on v1 after a, t2 on v2 before e)` where `t1 == t2` or the two are within 300 m walking. Emit `walk → v1 → (walk) → v2 → walk`.
5. **Score** each option:
   `time = walk_m / 75 m·min⁻¹ + ride_stops × avg_min_per_stop(mode) + transfers × 8 min penalty`.
   Keep the best few, and drop any option that is dominated (slower *and* has more transfers and more walking than another).
6. **Return** at most 5 options, with each leg's polyline cut from the variant's shape between the board and get-off stops.

This brute-force approach is fast enough for one city (a few hundred variants and a few thousand stops). If we add more cities or more transfers, switch to **RAPTOR**, the standard round-based transit routing algorithm. Its data structures fit the same model.

In Phase 1 the **same algorithm runs in JavaScript inside `MockRaahiApi`** over the fixture data. That code is a working prototype of the backend planner, so it should be written to be portable (pure TypeScript functions, no React).

## Map stack

- **Rendering:** `react-native-maps` with `PROVIDER_GOOGLE` on Android. See [06-decisions.md](06-decisions.md).
- **Our data:** stops and route shapes come from our own dataset, drawn as `Marker`s and `Polyline`s.
- **Shapes over the wire:** [encoded polylines](https://developers.google.com/maps/documentation/utilities/polylinealgorithm). These are roughly 5–10× smaller than GeoJSON coordinate arrays, which matters on prepaid data.
- **No other Google Maps Platform APIs** (Directions/Routes, Places, Geocoding…). They're billed per request (D19). Walking legs are drawn as straight dashed lines, and the trip screen offers "Open walking directions", which opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=walking` in the Google Maps app. That URL is free and needs no key.

## Offline and caching

| Data | Where | Phase |
| --- | --- | --- |
| Language, last map region, recent searches | AsyncStorage | 1 |
| Bookmarked trips (the full `TripOption` JSON including polylines) | AsyncStorage | 1 |
| Bookmarked routes (the full `RouteDetail`, both directions) | AsyncStorage | 1 |
| Home / work (`SavedPlace`) | expo-secure-store | 1 |
| Auth tokens | expo-secure-store | 1 |
| API responses | TanStack Query in-memory cache | 1 |
| Entire city network, for on-device planning | expo-sqlite, or a JSON file plus versioning | 3 |

Bookmarks store the complete trip or route, not just an ID, so they render with no network at all.

## Accounts and secure storage

Accounts are **optional and local-first** (D20). The device is always the source of truth for a guest; signing in adds backup and sync.

- **Guest:** bookmarks and home/work live only on the device. Nothing personal leaves it, except the from/to points sent to plan a trip.
- **Signed in:** on sign-in, the local `UserData` is pushed with `PUT /me/data` and the newer copy wins (D24). After that, every local change is saved locally first and then pushed in the background. A failed push is retried later; it never blocks the UI.
- **Sign-out** keeps the local data and deletes only the tokens.
- **What goes where (D22):** `expo-secure-store` (Android Keystore-backed encryption) holds the access and refresh tokens and the home/work locations. Use it through one small wrapper (`lib/secure-storage.ts`) that JSON-encodes values and keeps them small. Bookmarks and preferences are neither secret nor small, so they stay in AsyncStorage.
- **Tokens:** a short-lived access token and a rotating refresh token. On a `401`, refresh once and retry. If the refresh fails, sign out quietly.
- **Phase 1:** `MockRaahiApi` implements `/auth/*` and `/me/*` with in-memory users and fake tokens (D21). The secure-storage and session code is real and carries over to Phase 2 unchanged.

## Localisation

- `i18next` + `react-i18next` for strings; `expo-localization` to pick the initial language.
- **Data is bilingual at the source** (`name.en`, `name.ur`). We don't machine-translate stop names.
- **RTL:** in SDK 57, RTL is enabled by default in builds but **disabled in Expo Go**. Switching language flips `I18nManager.forceRTL`, which needs an app reload (`Updates.reloadAsync()` from `expo-updates`). So RTL must be tested in a **development build**.
- Layout uses logical properties (`marginStart`, `paddingEnd`, `start`/`end`) everywhere, never `left`/`right`, so that RTL just works.
- **Font:** Urdu needs an Urdu-capable font (e.g. Noto Nastaliq Urdu) and a generous `lineHeight`, because Nastaliq is tall and gets clipped at default line heights. Compare it against Noto Naskh Arabic for legibility at small sizes on a cheap screen before committing.
