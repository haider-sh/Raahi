# Raahi (راہی)

A bus route finder for Pakistani commuters. Give it where you are (or a pin on the map) and where you want to go, and it tells you **which bus to board, where to board it, and where to get off**, including trips that need one change of bus.

## Repository layout

```
Raahi/
├── app/     Expo / React Native mobile app (Android first)
├── api/     Node.js + Express + PostgreSQL/PostGIS backend (not started)
└── docs/    Product, architecture and implementation plans for both
```

`app/` and `api/` each have their own `package.json` and are installed, run, and deployed separately. They share only the API contract, which is defined in [docs/03-api-contract.md](docs/03-api-contract.md).

## Docs

| Doc | What's in it |
| --- | --- |
| [01-product.md](docs/01-product.md) | Refined idea: users, problem, scope, what's in and out of the MVP |
| [02-architecture.md](docs/02-architecture.md) | System design, data model, how trip planning works |
| [03-api-contract.md](docs/03-api-contract.md) | Endpoints and types the app and API agree on |
| [04-app-phase-1-plan.md](docs/04-app-phase-1-plan.md) | **Phase 1 implementation plan for the app**, with milestones and tasks |
| [05-data-strategy.md](docs/05-data-strategy.md) | Where the route and stop data comes from, which is the hardest part |
| [06-decisions.md](docs/06-decisions.md) | Decision log (stack choices and why) |
| [07-risks-and-open-questions.md](docs/07-risks-and-open-questions.md) | Things that could sink the project, and questions that still need answers |

## Running the app

```bash
cd app
npm install
npx expo start
```

See [app/AGENTS.md](app/AGENTS.md) for Expo-specific rules (SDK 57).
