This is a monorepo for Raahi, a bus route finder.

- `app/`: Expo/React Native mobile app. **Read [app/AGENTS.md](app/AGENTS.md) before touching anything in `app/`.** Run all app commands (`npx expo ...`, `npx tsc`) from inside `app/`.
- `api/`: Node.js + Express + PostgreSQL/PostGIS backend (not started yet).
- `docs/`: product, architecture and implementation plans. Check them before making design decisions, and update [docs/06-decisions.md](docs/06-decisions.md) when you make a new one.

The app and the API must agree on [docs/03-api-contract.md](docs/03-api-contract.md). If you change one side, update the contract in the same change.
