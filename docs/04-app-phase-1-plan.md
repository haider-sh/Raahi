# 04 · App Phase 1 implementation plan

**Goal:** build a working Android app that covers the full flow (start point → destination → bus options → trip detail with stops), in Urdu and English, running entirely against a **mock API backed by a realistic fixture network**. When the backend is ready in Phase 2, we swap one implementation and the app goes live.

**Stack (as of Expo SDK 57):** Expo Router, TypeScript, `react-native-maps`, `expo-location`, `expo-localization` + `i18next`, TanStack Query, Zustand, AsyncStorage, `expo-secure-store`, Jest (`jest-expo`) + React Native Testing Library. The reasons for each choice, and where they differ from the original plan, are in [06-decisions.md](06-decisions.md).

## Status (2026-10-28)

The code for M0–M7 is in (branch `phase-1-app`). `npm run check` is green: 72 tests covering the planner, search, mock API, fixture validation, secure storage, refresh-and-retry, sync, and the trip/route/stop components. What's left can't be done in code alone:

| Still to do | Milestone |
| --- | --- |
| First **development build** on a real phone, then check maps, location, RTL and the Urdu font there | M0, M2, M6 |
| Google Cloud project and a restricted Maps key (P3). Until then, map tiles in the dev build may be blank. | P3 |
| Replace the **sample fixture** with real routes from the Karachi text data (D25) | P1b, M1 |
| Native-speaker review of the Urdu copy | M6 |
| Low-end phone profiling, outdoor contrast check | M6 |
| User testing with 3–5 commuters (P4) | M5 |
| A real feedback inbox (`FEEDBACK_EMAIL` in `features/trips/links.ts` is a placeholder) | M5 |

> Estimates are rough and assume one developer working about 20 h/week. Total: **about 11 weeks**. M1b (secure storage, home, optional account) is scheduled early so it can be demoed before the map screens are done.

---

## Pre-work (before writing code)

| # | Task | Why |
| --- | --- | --- |
| P1 | ✅ **Launch city: Karachi.** The primary target is informal minibus/coach routes (D7, W18, G7, Masood…); government services are an add-on. | Decided. See [01-product.md](01-product.md#launch-market-karachi). |
| P1b | Put the existing **Karachi route text data** in `data/karachi/raw/`, and pick the 4–6 routes the fixture will use. | The fixture is built from it. See [05-data-strategy.md](05-data-strategy.md#karachi-from-route-text-to-network). |
| P2 | Low-fidelity wireframes in Figma for 8 screens: Plan (map), Search, Options, Trip, Route, Stop, Saved, Sign in. Do both an LTR and an RTL version of the Trip screen. | The RTL layout of the step list is the trickiest UI. Settle it on paper first. |
| P3 | Create a Google Cloud project and billing account. Enable **only Maps SDK for Android**. Create an API key restricted to that one API *and* to the app's package name and SHA-1 fingerprint. Add a budget alert as a tripwire. Don't enable any other Maps Platform API (D19). | You need it for development builds and releases. Expo Go works without it. With the restrictions in place, the key can only do things that are free. |
| P4 | Line up **3–5 real commuters** who'll try the app at the end of M5. | Build for them, not for us. |

---

## Target folder structure (`app/src/`)

```
src/
├── app/                          # routes only (Expo Router)
│   ├── _layout.tsx               # providers: QueryClient, i18n, theme, fonts; root Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx           # NativeTabs: Plan · Saved · Settings
│   │   ├── index.tsx             # Plan: map, start/destination, nearest stop, "Take me home"
│   │   ├── saved.tsx             # bookmarked routes and trips, home/work
│   │   └── settings.tsx          # language, account, home/work, about/data sources
│   ├── search.tsx                # modal; ?field=from|to|home|work (places + routes)
│   ├── options.tsx               # trip options for current from/to
│   ├── trip/[id].tsx             # trip detail: map + step list
│   ├── route/[id].tsx            # route detail: both directions, terminus to terminus
│   ├── stop/[id].tsx             # stop detail: buses through this stop
│   └── sign-in.tsx               # modal; sign in / register (optional)
├── features/
│   ├── planner/                  # usePlannerStore (Zustand), useTripPlan, useNearestStops
│   ├── map/                      # StopMarker, RoutePolyline, StartPin, map helpers
│   ├── places/                   # search hooks, recent searches
│   ├── trips/                    # TripOptionCard, TripSteps, RouteChip
│   ├── routes/                   # useRoute, useStop, RouteStopList
│   ├── saved/                    # useSavedStore: bookmarks + home/work, local-first, sync
│   └── account/                  # useSession: tokens, sign in/out, refresh-and-retry
├── services/api/
│   ├── types.ts                  # mirrors docs/03-api-contract.md exactly
│   ├── raahi-api.ts              # RaahiApi interface + getApi() (mock vs http by env)
│   ├── http-api.ts               # Phase 2; stub now
│   └── mock/
│       ├── mock-api.ts           # implements RaahiApi; fake latency + error injection
│       ├── planner.ts            # pure TS trip planner (prototype of the backend's)
│       ├── search.ts             # text normalisation + matching
│       └── fixtures/network.json # the launch-city fixture network
├── lib/
│   ├── geo.ts                    # haversine, polyline encode/decode, slice shape between stops
│   ├── storage.ts                # typed, versioned AsyncStorage wrapper
│   └── secure-storage.ts         # typed expo-secure-store wrapper (tokens, home/work only)
├── i18n/
│   ├── index.ts
│   └── locales/{en,ur}.json
├── components/                   # generic UI primitives (Button, Text, Card, Sheet...)
└── constants/theme.ts            # colours, spacing, type scale, mode colours
```

The rules: route files stay thin (they compose feature components); `services/` and `lib/` never import React; anything in `mock/planner.ts` must be portable to the API unchanged.

---

## M0 · Foundation (~1 week)

**Tasks**
1. Run `npm run reset-project` in `app/` to remove the template screens (they also hold the current lint and type errors). Then delete the `reset-project` script.
2. Run `npx expo start` once so `expo-env.d.ts` is generated.
3. Install dependencies, **always with `npx expo install`**:
   `react-native-maps expo-location expo-localization expo-updates expo-secure-store i18next react-i18next @react-native-async-storage/async-storage @tanstack/react-query zustand`
   For development: `jest-expo jest @types/jest @testing-library/react-native`
4. Convert `app.json` to `app.config.ts` so the Google Maps key comes from an environment variable (`GOOGLE_MAPS_API_KEY`, set as an EAS env var for builds) and is **never committed**. Configure the `react-native-maps` plugin (`androidGoogleMapsApiKey`), the `expo-location` plugin (permission strings), and `expo-localization`.
5. Add app env vars: `EXPO_PUBLIC_USE_MOCK_API=true` and `EXPO_PUBLIC_API_URL`.
6. Add `package.json` scripts: `typecheck` (`tsc --noEmit`), `lint`, `test`, and `check`, which runs all three. Every PR must pass `check`.
7. Set up i18n: `en.json` and `ur.json`, initial language from `getLocales()`, and the user's choice persisted to storage. Add the language switch in Settings: set `I18nManager.forceRTL`, then call `Updates.reloadAsync()`.
8. Theme: colour tokens (light and dark), a **leg palette** of about 6 distinguishable colours that the app assigns to ride legs on the map (buses have no colour data), an 8-pt spacing scale, a minimum 48 dp touch target, and the Urdu font loaded with `expo-font` (already installed).
9. Run `npx eas-cli@latest build --profile development --platform android` to get a **development build** onto a real Android phone. You need it for RTL and for the Maps key. Use Expo Go for quick iteration until then.

**Done when:** `npm run check` passes, the app boots to an empty Plan tab in the dev build, and switching to Urdu flips the layout to RTL.

---

## M1 · Data layer and mock API (~1.5 weeks)

Build this **before** the screens, so every screen is built against realistically shaped data and the planner logic is tested on its own.

**Tasks**
1. `types.ts`: copy the types from [03-api-contract.md](03-api-contract.md) verbatim.
2. Define the `RaahiApi` interface: `searchPlaces`, `nearestStops`, `getStop`, `plan`, `getRoute`, plus the account methods `register`, `login`, `refresh`, `logout`, `getMe`, `getUserData` and `putUserData`. `getApi()` returns the mock or HTTP implementation based on `EXPO_PUBLIC_USE_MOCK_API`.
3. **Fixture network** (`network.json`): a real subset of Karachi, built from the route text data (P1b). Choose routes that overlap, e.g. a few of D7, W18, G7, G17, G3, Masood and Sheraz. Aim for **4–6 routes, both directions each (8–12 variants), 40–60 stops and 15–20 landmarks**, chosen so that at least one realistic trip *needs* a transfer. Use the format from [05-data-strategy.md](05-data-strategy.md), which is also the format the backend will import.
4. `lib/geo.ts`: haversine distance, encoded polyline encode/decode, and `sliceShape(shape, fromStop, toStop)` (snap each stop to the nearest point on the line and cut between them).
5. `mock/planner.ts`: implement the algorithm from [02-architecture.md § Trip planning](02-architecture.md#trip-planning-algorithm), covering access/egress stops, direct options, one-transfer options, scoring, dominance pruning and the top 5.
6. `mock/search.ts`: normalise text (lower-case; strip Urdu diacritics/aerab; unify ی/ي and ک/ك; strip spaces, hyphens and punctuation), then match on prefix and substring across `name.en`, `name.ur` and `aliases` for places, and `code` and `name` for routes. Rank by match quality and then by distance to `near`.
7. `mock-api.ts`: random latency of 300–900 ms, plus a dev-only toggle to force each error code (`NO_STOPS_NEARBY`, `NO_ROUTE`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, network failure). This lets you build the error states for real. Mock accounts live in memory (D21); access tokens "expire" after a few minutes so the refresh path gets exercised.
8. TanStack Query hooks: `usePlaceSearch(q)`, `useNearestStops(point)`, `useStop(id)`, `useTripPlan(from, to)`, `useRoute(id)`.

**Tests (Jest, no React)**
- The planner never returns a wrong-direction ride. This is the most important test in the project.
- It finds the known direct trip and the known one-transfer trip in the fixture, and ranks the direct trip first when it's faster.
- It returns `NO_STOPS_NEARBY` for a point outside the city.
- Round-trip encode/decode of polylines; `sliceShape` returns a shape that starts and ends near the right stops.
- Search: "saddar", "Saddar" and "صدر" all find the same stop; "d7", "D-7" and "D7" all find the D7 route.
- `getStop` lists one entry per direction for a route that serves the stop both ways.

**Done when:** all of the above tests pass, and `getApi().plan(...)` returns sensible trips from a quick script or dev screen.

---

## M1b · Secure storage, home and optional account (~1 week)

Covers feature **10**, and the home/work part of **9**. It's scheduled here, before the map screens, because the secure-storage work has to be demoable early. Nothing in it depends on the map.

**Tasks**
1. `lib/secure-storage.ts`: a typed wrapper over `expo-secure-store` with `get`, `set` and `remove` per key (`auth.tokens`, `place.home`, `place.work`), JSON-encoded, with a schema version. Only these keys go in it (D22). Add a comment saying so, so bookmarks don't drift in later.
2. `features/account/useSession`: on boot, read the tokens and call `getMe` in the background (the app never waits on it). It exposes `signIn`, `register` and `signOut`. Wrap API calls so that a `401` triggers one refresh and one retry; if the refresh fails, sign out quietly.
3. `sign-in.tsx` modal: email + password, a toggle between sign in and register, inline validation errors, and a clear "**Skip, use without an account**". It's reached from Settings → Account and from a dismissible hint on the Saved tab. **Nothing else opens it.**
4. `features/saved/useSavedStore` (Zustand): home, work and bookmarks. Home/work persist to secure storage; bookmarks persist to AsyncStorage (bookmarks arrive in M7, but build the store here). Every change writes locally first. When signed in, it is then pushed with `putUserData` in the background, and on sign-in it does the merge described in [02-architecture.md § Accounts](02-architecture.md#accounts-and-secure-storage).
5. Settings: an **Account** row (signed out → "Sign in to back up your saved places"; signed in → email + Sign out) and **Home / Work** rows. Until M3 exists, "Set home" can use a plain list from `usePlaceSearch`; M3 swaps in the full search modal (`search?field=home`).
6. Sign-out keeps local data and removes only the tokens. Explain this in the confirmation dialog.

**Tests (Jest)**
- The secure-storage wrapper round-trips values and returns `null` for a missing key (mock `expo-secure-store`).
- Tokens are never written to AsyncStorage.
- Refresh-and-retry: a `401` followed by a successful refresh retries once; a failed refresh signs out and keeps the saved data.
- Sync merge: the newer `updatedAt` wins in both directions.

**Done when:** you can save home as a guest, kill the app, reopen it and still see home; register, sign out and sign in again, and see home restored from the mock server; and show that the tokens and home are not in AsyncStorage.

---

## M2 · Plan screen: map, start point and nearest stop (~1.5 weeks)

Covers features **1 (start point)** and **3 (nearest stop)**.

**Tasks**
1. A full-screen `MapView` (`PROVIDER_GOOGLE`). Its initial region is the last saved region, falling back to the launch-city centre.
2. **Location permission flow**:
   - Show a short in-app explanation ("to find the bus stop nearest you") *before* the system prompt.
   - If permission is denied, show "Pick your start point on the map" instead. **There are no dead ends.**
   - If GPS is off, show a banner with a retry button.
   - Fetch with `getLastKnownPositionAsync()` first for an instant result, then `getCurrentPositionAsync({ accuracy: Balanced })` to refine it.
3. **Start-point modes:** "My location" (default) or a **dropped pin**. Long-pressing the map drops a draggable pin, and a chip shows "Planning from: near ‹nearest stop/landmark›" with an ✕ to go back to GPS. Name the pin from our own data (the nearest stop or landmark). Don't use a reverse geocoder.
4. **Nearest stop card** (bottom of the map): stop name, walking distance ("350 m · ~5 min walk"), and chips for the routes serving it. Tapping the stop name centres the map on it, and a "Buses here" link opens `stop/[id]` (M5b). It updates whenever the start point changes.
5. A **"Where to?"** bar that opens `search?field=to`. Tapping the start chip opens `search?field=from`.
6. A **"Take me home"** chip under the bar when home is saved: it sets the destination to home and goes straight to options. Show "Work" next to it if work is saved.
7. **Map performance on low-end phones:**
   - Only render stop markers when zoomed in past a threshold, and only for stops inside the visible region.
   - Set `tracksViewChanges={false}` on custom markers (re-rendering markers is the most common cause of map jank on Android).
   - Memoise marker lists.

**Done when:** on a real phone, you can open the app, see yourself and your nearest stop within about 3 s, drop a pin elsewhere and watch the nearest stop update, and deny permission and still complete the flow by pin.

---

## M3 · Search: destination (and start) (~1 week)

Covers features **1 and 2** (search for start and destination), and the search side of **6** and **9**.

**Tasks**
1. A `search.tsx` modal with an auto-focused input, debounced by 250 ms, that accepts Urdu and English keyboards. The `field` param decides what a tap does: set from/to, or save home/work.
2. Result rows show an icon (stop or landmark), the name in the current language, the other-language name as the subtitle, and the distance. **Route matches** ("D7") appear in their own "Buses" section at the top (or below places for `field=home|work`), and open `route/[id]`.
3. Above the results, show "**Choose on map**", which returns to the map in pick mode with a centre crosshair and a "Set destination" button.
4. Recent searches (the last 8, in AsyncStorage) appear when the input is empty.
5. A swap (⇅) button for from/to on the Plan screen.
6. Empty state: "No match. Try a nearby landmark or choose on map."

**Done when:** you can set a destination by Urdu text, by English text, by recent search and by map pick; set home the same way; and typing "D7" offers the D7 route.

---

## M4 · Trip options (~1 week)

Covers feature **4** (bus suggestions, including transfers).

**Tasks**
1. `options.tsx` reads from/to from `usePlannerStore` and calls `useTripPlan`.
2. **TripOptionCard** shows:
   - The route chip(s) showing the **route name in large text** (D7, W18, Masood), since that's the only way people identify the bus, joined by → when there's a transfer.
   - Total time, total walking, and the number of stops.
   - A "Direct" badge, or "1 change at ‹stop›".
3. States:
   - Loading: a skeleton.
   - `NO_STOPS_NEARBY`: "No bus stop within walking distance of your start/destination", plus a button to move the pin.
   - `NO_ROUTE`: "We don't know a bus for this trip yet." Be honest, and show the nearest stops at both ends.
   - Offline: "No connection. Your saved trips and buses still work."
4. Tapping a card puts the option in the store and pushes `trip/[id]`.

**Tests (RNTL):** the card renders a direct and a transfer option in both `en` and `ur`; each error code shows the right message.

**Done when:** the known direct and transfer trips from the fixture show up correctly, and every error state can be triggered with the mock toggles.

---

## M5 · Trip detail: route and stops (~1.5 weeks)

Covers feature **5**. This is the screen that actually stops people getting lost, so it gets the most polish.

**Tasks**
1. **Layout:** the map takes the top ~45% and the step list scrolls below it. Use a plain split layout rather than a bottom-sheet library: it's simpler and smoother on low-end phones. Revisit this after user testing.
2. **The map:**
   - Walk legs: a dashed grey polyline.
   - Ride legs: a solid polyline in the leg's palette colour, matching that leg's chip in the step list.
   - Board stop: a filled marker. Get-off stop: a flag marker. Transfer: a distinct marker.
   - Fit the camera to all legs with padding.
3. **The step list** (each step tappable to focus the map on it):
   - 🚶 *Walk 350 m to **Nagan Chowrangi*** (~5 min)
   - 🚌 *Board* **[W18]** *towards **Saddar***. Show the route name big, with a tip: "Ask the conductor: *Saddar jayegi?*". Buses going the other way carry the same name, so the direction is what matters.
   - *Ride 12 stops*. Collapsed by default; expanding it shows every stop in order.
   - 🛑 ***Get off at Saddar***. Highlighted, and also showing the stop *before* it, so the user knows when to get ready and can tell the conductor in advance.
   - (on a transfer) *Walk 120 m to …* / *Board …*
   - 🚶 *Walk 200 m to destination*
   - Each walk step has an **"Open walking directions"** button that opens a Google Maps URL with `travelmode=walking` in the Google Maps app (D19). Never call a Directions API.
   - Each route chip opens `route/[id]`.
4. A **Save trip** button (it does nothing until M7).
5. A **"Wrong info?"** link that opens a prefilled WhatsApp or email message to the team for now. This is the cheapest feedback loop, worth having from day one.

**Tests (RNTL):** the step list renders the correct order for a transfer trip; "get off" is the highlighted stop; the stop list expands.

**Done when:** a tester who doesn't know the area can follow a fixture trip using only this screen. Run the **first round of user testing** with the P4 commuters here, on paper prototypes or on the device.

---

## M5b · Route and stop lookup (~1 week)

Covers features **6** and **7**.

**Tasks**
1. `route/[id].tsx` uses the same split layout as the trip screen. The map shows the route's shape; the list shows every stop, terminus to terminus. A **direction toggle** ("towards Saddar" / "towards Orangi") switches variant, and both the map and the list follow it. Tapping a stop opens `stop/[id]`.
2. `stop/[id].tsx`: the stop name (both languages) and a small map, then one row per **route and direction** ("W18 · towards Saddar"). Tapping a row opens that route with that direction selected. A "Plan from here" / "Plan to here" pair sets the stop as from or to.
3. Both screens have a **Bookmark** button for the route (it does nothing until M7). Hide it on the stop screen for now; bookmarking stops is not in scope.
4. Every stop marker on the Plan map (when zoomed in) opens `stop/[id]` on tap.

**Tests (RNTL):** the route screen lists stops in reverse order after toggling direction; the stop screen shows a two-way route twice, once per direction.

**Done when:** you can go Search "D7" → D7 route → tap a stop → see every bus there → plan a trip from that stop.

---

## M6 · Urdu, RTL, accessibility and polish (~1 week)

Covers feature **8 (language)**.

**Tasks**
1. **No hard-coded strings** anywhere. Add a lint rule or review checklist item for it.
2. Get the Urdu copy reviewed by a native speaker for natural *spoken* Urdu. Formal or machine-translated Urdu reads badly to the target users.
3. Walk through every screen in RTL in the dev build. Directional icons (arrows, chevrons, "→" between route chips) must flip. Map controls stay put.
4. Urdu font: check `lineHeight` everywhere, and make sure no text is clipped at 1.3× system font scale.
5. Accessibility: `accessibilityLabel` on every icon button, a logical reading order in the step list, and contrast that holds up in **direct sunlight** (test outdoors).
6. The Android back button and predictive back behave sensibly on every screen.
7. **Test on a low-end device** (2–3 GB RAM). Profile the Plan and Trip screens and fix any jank.
8. A Settings → **About / Data sources** screen with the OSM attribution (required under ODbL if any data came from OSM) and "data last verified ‹date›".

**Done when:** the whole flow is usable in Urdu with no layout bugs, and runs smoothly on the low-end test phone.

---

## M7 · Bookmarks offline (~1 week)

Covers feature **9 (bookmarks)**. No longer a stretch goal (D24).

**Tasks**
1. Wire up the Save buttons from M5 and M5b to `useSavedStore` (M1b). A **trip** bookmark stores the complete `TripOption` plus the from/to names. A **route** bookmark stores the route ID in `UserData` and keeps the full `RouteDetail` (both directions) in a separate AsyncStorage cache, so it opens offline. Use `lib/storage.ts` with a schema version. Cap it at 20 trips and 20 routes.
2. The Saved tab has three sections: **Home/Work** (tap to plan, edit), **Buses** (bookmarked routes) and **Trips**. You can delete bookmarks by swipe or long-press.
3. Bookmarks open with no network. Lists must render fully even if map tiles are missing (Google tiles aren't available offline).
4. Show a "Saved on ‹date›. Routes may have changed" note. When online, refresh cached `RouteDetail`s quietly in the background.
5. Signed in: changes sync through `putUserData` (M1b). A route bookmark that arrives from the server without a local cache is fetched the next time the app is online.

**Done when:** in airplane mode, a bookmarked trip and a bookmarked route both open with their full stop lists, as a guest and when signed in.

---

## Phase 1 definition of done

- [ ] Features 1–10 from [01-product.md](01-product.md) work end-to-end against the mock API, both as a guest and signed in.
- [ ] Auth tokens and home/work exist only in `expo-secure-store`, never in AsyncStorage.
- [ ] The Google Cloud project has only Maps SDK for Android enabled, and the key is restricted (D19).
- [ ] `npm run check` (typecheck, lint, tests) is green.
- [ ] The planner tests cover direction, direct, transfer and no-route cases.
- [ ] It's tested on at least one low-end Android phone, in both languages.
- [ ] At least 3 real commuters have tried it, and their findings are written up in `docs/`.
- [ ] `HttpRaahiApi` is stubbed and the contract is frozen as v1, ready for Phase 2.

## Working conventions

- Branch per milestone (or per task within one), e.g. `m2-start-point`. Commit small. Open a PR into `master`, even when working solo, because it gives you a reviewable history.
- Update [06-decisions.md](06-decisions.md) whenever you make a new non-obvious choice.
- Never edit `android/` or `ios/` by hand. Configure everything through `app.config.ts` and plugins.

## What comes after (Phase 2 preview)

1. Turn [03-api-contract.md](03-api-contract.md) into an OpenAPI spec, and scaffold `api/` (Express + TypeScript + PostGIS in Docker).
2. Write an importer for the [05-data-strategy.md](05-data-strategy.md) format, seed it with the same fixture, then grow the dataset to the full launch city.
3. Port `mock/planner.ts` to the API. It should be a near copy-paste.
4. Real auth: hashed passwords (argon2id or bcrypt), short-lived JWT access tokens, rotating refresh tokens stored hashed, and rate-limited login.
5. Implement `HttpRaahiApi`, flip `EXPO_PUBLIC_USE_MOCK_API=false`, and run the same tests against the real API with a Postman collection.
