# Raahi app

Expo (SDK 57) + Expo Router, Android-first. Read [AGENTS.md](AGENTS.md) before changing anything, and [docs/04-app-phase-1-plan.md](../docs/04-app-phase-1-plan.md) for what's built and why.

In Phase 1 the app runs entirely against `MockRaahiApi`, an in-app implementation of [docs/03-api-contract.md](../docs/03-api-contract.md) over a **sample** Karachi network. The sample data isn't real route data (D25).

## Setup

```bash
npm install
cp .env.example .env   # then fill in GOOGLE_MAPS_API_KEY for native builds
```

| Variable | Used for |
| --- | --- |
| `GOOGLE_MAPS_API_KEY` | Maps SDK for Android, read by `app.config.ts` at build time. Never commit it (D13). For EAS builds, set it as an EAS environment variable. |
| `EXPO_PUBLIC_USE_MOCK_API` | `true` (default) uses the mock. `false` uses `HttpRaahiApi` (Phase 2). |
| `EXPO_PUBLIC_API_URL` | Base URL for `HttpRaahiApi`. |

## Scripts

```bash
npm start          # dev server (press a for Android)
npm run check      # typecheck + lint + tests; must pass before every PR
npm test           # Jest only
```

## Development build

RTL and the Maps key only work in a development build, not in Expo Go (D12).

```bash
npx eas-cli@latest login
npx eas-cli@latest init                      # links the project; adds extra.eas.projectId
npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --value <key> --environment development --visibility secret
npx eas-cli@latest build --profile development --platform android
```

Install the APK from the link EAS prints, then run `npm start` and open the project in the dev client.

## Layout

```
src/app/            routes only (Expo Router)
src/features/       planner, map, places, trips, routes, saved, account
src/services/api/   RaahiApi interface, HTTP client, mock API + planner + search + fixture
src/lib/            geo, storage (AsyncStorage), secure-storage (tokens + home/work only)
src/i18n/           i18next setup, en/ur strings, RTL switching
src/components/     generic UI primitives
```

`services/` and `lib/` never import React, and `services/api/mock/planner.ts` must stay portable to `api/`.

## Developer toggles

In a dev build, **Settings → Developer** can force each mock API error (`NO_STOPS_NEARBY`, `NO_ROUTE`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, network failure), so every error state can be checked by hand. Mock accounts reset when the app restarts (D28).
