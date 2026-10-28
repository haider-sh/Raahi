# 04 · App Phase 1 implementation plan

**Goal:** build a working Android app that covers the full flow (start point → destination → bus options → trip detail with stops), in Urdu and English, running entirely against a **mock API backed by a realistic fixture network**. When the backend is ready in Phase 2, we swap one implementation and the app goes live.

**Stack (as of Expo SDK 57):** Expo Router, TypeScript, `react-native-maps`, `expo-location`, `expo-localization` + `i18next`, TanStack Query, Zustand, AsyncStorage, Jest (`jest-expo`) + React Native Testing Library. The reasons for each choice, and where they differ from the original plan, are in [06-decisions.md](06-decisions.md).

> Estimates are rough and assume one developer working about 20 h/week. Total: **about 8 weeks**, plus about 1 week of stretch work.

---

## Pre-work (before writing code)

| # | Task | Why |
| --- | --- | --- |
| P1 | ✅ **Launch city: Karachi.** The primary target is informal minibus/coach routes (D7, W18, G7, Masood…); government services are an add-on. | Decided. See [01-product.md](01-product.md#launch-market-karachi). |
| P1b | Put the existing **Karachi route text data** in `data/karachi/raw/`, and pick the 4–6 routes the fixture will use. | The fixture is built from it. See [05-data-strategy.md](05-data-strategy.md#karachi-from-route-text-to-network). |
| P2 | Low-fidelity wireframes in Figma for 5 screens: Plan (map), Search, Options, Trip, Saved. Do both an LTR and an RTL version of the Trip screen. | The RTL layout of the step list is the trickiest UI. Settle it on paper first. |
| P3 | Create a Google Cloud project, enable **Maps SDK for Android**, and create an API key restricted to the app's package name and SHA-1 fingerprint. | You need it for development builds and releases. Expo Go works without it. |
| P4 | Line up **3–5 real commuters** who'll try the app at the end of M5. | Build for them, not for us. |

---

## Target folder structure (`app/src/`)

```
src/
├── app/                          # routes only (Expo Router)
│   ├── _layout.tsx               # providers: QueryClient, i18n, theme, fonts; root Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx           # NativeTabs: Plan · Saved · Settings
│   │   ├── index.tsx             # Plan: map, start/destination, nearest stop
│   │   ├── saved.tsx             # saved trips (stretch)
│   │   └── settings.tsx          # language, about/data sources
│   ├── search.tsx                # modal; ?field=from|to
│   ├── options.tsx               # trip options for current from/to
│   └── trip/[id].tsx             # trip detail: map + step list
├── features/
│   ├── planner/                  # usePlannerStore (Zustand), useTripPlan, useNearestStops
│   ├── map/                      # StopMarker, RoutePolyline, StartPin, map helpers
│   ├── places/                   # search hooks, recent searches
│   └── trips/                    # TripOptionCard, TripSteps, RouteChip, saved-trips storage
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
│   └── storage.ts                # typed, versioned AsyncStorage wrapper
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
   `react-native-maps expo-location expo-localization expo-updates i18next react-i18next @react-native-async-storage/async-storage @tanstack/react-query zustand`
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
2. Define the `RaahiApi` interface: `searchPlaces`, `nearestStops`, `plan`, `getRoute`. `getApi()` returns the mock or HTTP implementation based on `EXPO_PUBLIC_USE_MOCK_API`.
3. **Fixture network** (`network.json`): a real subset of Karachi, built from the route text data (P1b). Choose routes that overlap, e.g. a few of D7, W18, G7, G17, G3, Masood and Sheraz. Aim for **4–6 routes, both directions each (8–12 variants), 40–60 stops and 15–20 landmarks**, chosen so that at least one realistic trip *needs* a transfer. Use the format from [05-data-strategy.md](05-data-strategy.md), which is also the format the backend will import.
4. `lib/geo.ts`: haversine distance, encoded polyline encode/decode, and `sliceShape(shape, fromStop, toStop)` (snap each stop to the nearest point on the line and cut between them).
5. `mock/planner.ts`: implement the algorithm from [02-architecture.md § Trip planning](02-architecture.md#trip-planning-algorithm), covering access/egress stops, direct options, one-transfer options, scoring, dominance pruning and the top 5.
6. `mock/search.ts`: normalise text (lower-case; strip Urdu diacritics/aerab; unify ی/ي and ک/ك; strip spaces and punctuation), then match on prefix and substring across `name.en`, `name.ur` and `aliases`. Rank by match quality and then by distance to `near`.
7. `mock-api.ts`: random latency of 300–900 ms, plus a dev-only toggle to force each error code (`NO_STOPS_NEARBY`, `NO_ROUTE`, network failure). This lets you build the error states for real.
8. TanStack Query hooks: `usePlaceSearch(q)`, `useNearestStops(point)`, `useTripPlan(from, to)`, `useRoute(id)`.

**Tests (Jest, no React)**
- The planner never returns a wrong-direction ride. This is the most important test in the project.
- It finds the known direct trip and the known one-transfer trip in the fixture, and ranks the direct trip first when it's faster.
- It returns `NO_STOPS_NEARBY` for a point outside the city.
- Round-trip encode/decode of polylines; `sliceShape` returns a shape that starts and ends near the right stops.
- Search: "saddar", "Saddar" and "صدر" all find the same stop.

**Done when:** all of the above tests pass, and `getApi().plan(...)` returns sensible trips from a quick script or dev screen.

---

## M2 · Plan screen: map, start point and nearest stop (~1.5 weeks)

Covers features **2 (start point)** and **4 (nearest stop)**.

**Tasks**
1. A full-screen `MapView` (`PROVIDER_GOOGLE`). Its initial region is the last saved region, falling back to the launch-city centre.
2. **Location permission flow**:
   - Show a short in-app explanation ("to find the bus stop nearest you") *before* the system prompt.
   - If permission is denied, show "Pick your start point on the map" instead. **There are no dead ends.**
   - If GPS is off, show a banner with a retry button.
   - Fetch with `getLastKnownPositionAsync()` first for an instant result, then `getCurrentPositionAsync({ accuracy: Balanced })` to refine it.
3. **Start-point modes:** "My location" (default) or a **dropped pin**. Long-pressing the map drops a draggable pin, and a chip shows "Planning from: near ‹nearest stop/landmark›" with an ✕ to go back to GPS. Name the pin from our own data (the nearest stop or landmark). Don't use a reverse geocoder.
4. **Nearest stop card** (bottom of the map): stop name, walking distance ("350 m · ~5 min walk"), and chips for the routes serving it. Tapping it centres the map on the stop. It updates whenever the start point changes.
5. A **"Where to?"** bar that opens `search?field=to`. Tapping the start chip opens `search?field=from`.
6. **Map performance on low-end phones:**
   - Only render stop markers when zoomed in past a threshold, and only for stops inside the visible region.
   - Set `tracksViewChanges={false}` on custom markers (re-rendering markers is the most common cause of map jank on Android).
   - Memoise marker lists.

**Done when:** on a real phone, you can open the app, see yourself and your nearest stop within about 3 s, drop a pin elsewhere and watch the nearest stop update, and deny permission and still complete the flow by pin.

---

## M3 · Search: destination (and start) (~1 week)

Covers part of feature **1**.

**Tasks**
1. A `search.tsx` modal with an auto-focused input, debounced by 250 ms, that accepts Urdu and English keyboards.
2. Result rows show an icon (stop or landmark), the name in the current language, the other-language name as the subtitle, and the distance.
3. Above the results, show "**Choose on map**", which returns to the map in pick mode with a centre crosshair and a "Set destination" button.
4. Recent searches (the last 8, in AsyncStorage) appear when the input is empty.
5. A swap (⇅) button for from/to on the Plan screen.
6. Empty state: "No match. Try a nearby landmark or choose on map."

**Done when:** you can set a destination by Urdu text, by English text, by recent search and by map pick.

---

## M4 · Trip options (~1 week)

Covers feature **1** (bus suggestions, including transfers).

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
   - Offline: "No connection. Your saved trips still work."
4. Tapping a card puts the option in the store and pushes `trip/[id]`.

**Tests (RNTL):** the card renders a direct and a transfer option in both `en` and `ur`; each error code shows the right message.

**Done when:** the known direct and transfer trips from the fixture show up correctly, and every error state can be triggered with the mock toggles.

---

## M5 · Trip detail: route and stops (~1.5 weeks)

Covers feature **3**. This is the screen that actually stops people getting lost, so it gets the most polish.

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
4. A **Save trip** button (it does nothing until M7).
5. A **"Wrong info?"** link that opens a prefilled WhatsApp or email message to the team for now. This is the cheapest feedback loop, worth having from day one.

**Tests (RNTL):** the step list renders the correct order for a transfer trip; "get off" is the highlighted stop; the stop list expands.

**Done when:** a tester who doesn't know the area can follow a fixture trip using only this screen. Run the **first round of user testing** with the P4 commuters here, on paper prototypes or on the device.

---

## M6 · Urdu, RTL, accessibility and polish (~1 week)

Covers feature **5 (language)**.

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

## M7 · Saved trips offline (stretch, ~1 week)

Covers feature **5 (offline)**.

**Tasks**
1. Save the **complete `TripOption` JSON** plus the from/to labels to AsyncStorage through `lib/storage.ts`, with a schema version so the format can change later. Cap it at 20 trips.
2. The Saved tab lists saved trips; you can open them and delete them (swipe or long-press).
3. A saved trip opens with no network. The step list must render fully, even if map tiles are missing.
4. Show a "Saved on ‹date›. Routes may have changed" note.

**Done when:** in airplane mode, a saved trip opens and the full step list displays.

---

## Phase 1 definition of done

- [ ] Features 1–5 from [01-product.md](01-product.md) work end-to-end against the mock API (6/7 only if the stretch work was done).
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
4. Implement `HttpRaahiApi`, flip `EXPO_PUBLIC_USE_MOCK_API=false`, and run the same tests against the real API with a Postman collection.
