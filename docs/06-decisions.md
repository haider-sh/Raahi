# 06 · Decision log

Add a row whenever you make a non-obvious choice. To reverse a decision, add a new row rather than editing the old one.

| # | Date | Decision | Why | Revisit when |
| --- | --- | --- | --- | --- |
| D1 | 2026-10-27 | **Monorepo:** `app/`, `api/` and `docs/` in one git repo, with **no** npm workspaces yet | One place for docs and the contract, with history preserved. Workspaces add Metro and tooling friction we don't need while there's no shared code. | We want shared TS types or a shared planner package between app and API. |
| D2 | 2026-10-27 | **Expo Router** instead of using React Navigation directly | It's built on React Navigation, gives file-based and typed routes (already enabled in `app.json`), and is the project rule in `app/AGENTS.md`. | — |
| D3 | 2026-10-27 | **`react-native-maps`** with `PROVIDER_GOOGLE`, not `expo-maps` | In SDK 57, `expo-maps` is **alpha** (with frequent breaking changes) and doesn't run in Expo Go. `react-native-maps` is stable, runs in Expo Go, and supports polylines, draggable markers and `onLongPress`. | `expo-maps` becomes stable. |
| D4 | 2026-10-27 | Google Maps for **rendering only**. Transit data is ours; we use **no Google Directions or Transit API**. | Their transit coverage of informal Pakistani routes is weak, they cost money per request, and their ToS forbid storing results. | — |
| D5 | 2026-10-27 | **No street-address geocoder** in Phase 1. Search covers our own stops and landmarks only. | Users navigate by landmarks. Nominatim's coverage in Pakistan is weak and its usage policy forbids heavy app traffic, and Google Places costs money. It also works offline. | Users keep searching for things we don't have. Then consider Places Autocomplete as a fallback. |
| D6 | 2026-10-27 | **TanStack Query + `fetch`** instead of axios | Query gives caching, retries and loading/error states for free, and `fetch` is enough underneath. *Keeping axios is fine if you prefer it: it's a swap inside `http-api.ts` only.* | — |
| D7 | 2026-10-27 | **Zustand** for planner state (from, to, chosen option) | It's tiny, needs no providers, and is easy to read from any screen. | — |
| D8 | 2026-10-27 | **In-app mock API** (`MockRaahiApi`) running a real JS planner over fixture data | It works offline, it's deterministic, it can force error states, and the planner becomes the prototype for the backend. A Postman mock server only replays canned responses. | Phase 2: use Postman for API contract tests. |
| D9 | 2026-10-27 | **At most 1 transfer** in Phase 1 | It covers most real trips. Each extra transfer grows the search space a lot and makes trips harder to explain to users. | Real data shows common trips needing 2 changes. |
| D10 | 2026-10-27 | **GTFS-shaped data model** with one **variant per direction** | We can import real GTFS if any turns up. Modelling direction explicitly prevents "right bus, wrong way" results. | — |
| D11 | 2026-10-27 | **AsyncStorage** for preferences and saved trips; SQLite deferred | The data is small key-value JSON. SQLite only earns its keep for whole-network offline mode. | Phase 3 offline network. |
| D12 | 2026-10-27 | **Android-first**, with an **EAS development build** from M0 | It's the target platform. RTL is disabled in Expo Go, and release maps need the API key. | — |
| D13 | 2026-10-27 | The Google Maps API key comes from an env var through `app.config.ts`, and is **never committed** | Keys committed to a public repo get abused and billed. | — |
| D14 | 2026-10-27 | **Launch city: Karachi** | It's the team's city, so routes can be ridden and verified first-hand, and we already have route text data. | — |
| D15 | 2026-10-27 | **Informal minibus/coach routes are the primary target**; government services (People's Bus, BRT) are an add-on | That's what everyday Karachi commuters actually ride. | Informal data can't be kept accurate enough. |
| D16 | 2026-10-27 | **Identify buses by route name only.** No colour, plate, destination board or fare. Direction is shown as "towards ‹last stop›". | Many vehicles share one route name and have no consistent markings; fares are out of scope. Keeping per-direction variants (D10) still prevents wrong-way trips. | — |
| D17 | 2026-10-27 | Phase 1 stops = **well-known points listed in the route text**, shared through one gazetteer | Buses are hail-and-ride, but route descriptions list landmarks, and shared gazetteer IDs are what make transfers work. | Phase 2+: board or alight at the nearest point on a route's shape. |
| D18 | 2026-10-27 | Fares and women-specific features are **out of scope** | Product decision. | — |
