# 07 · Risks and open questions

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Route data is incomplete or wrong** | Very high. It causes exactly the stranding the app exists to prevent. | Start with the busiest Karachi routes. Store source and verified date per record. Add a "Wrong info?" link from M5. Be honest in the UI when we don't know ("we don't know a bus for this yet"). |
| **Informal routes change without notice**, and they're our primary target | High | Show "last verified" on routes. Treat feedback reports as top priority. Recruit a few regular riders per corridor to re-check their routes. |
| **The route text data is outdated or ambiguous** (spellings, missing segments) | High | Use one shared gazetteer with aliases. Mark shapes built by the router as unverified until someone rides them. Spot-check with commuters. See [05-data-strategy.md](05-data-strategy.md#karachi-from-route-text-to-network). |
| **Data work takes far longer than code** | High, for the schedule | Start the gazetteer in parallel with M1. Don't leave it for Phase 2. |
| **Map performance on low-end phones** | Medium | Viewport-limited markers, `tracksViewChanges={false}`, and early testing on a cheap device (M2, M6). |
| **Unnatural Urdu** | Medium. Users will feel the app isn't for them. | Use a native-speaker review of conversational Urdu, and test with the real users. |
| **Google Maps billing** | Low. It needs a billing account; mobile map loads are currently free, but other APIs aren't. | Enable **only** Maps SDK for Android, and restrict the key to that API and to the app's package + SHA-1 (D19). A budget alert only notifies, so the restrictions are the real guard. Fallback: MapLibre + OpenFreeMap/Protomaps. |
| **Personal data on shared phones** (home location, account) | Medium | Home/work and tokens go in `expo-secure-store` only (D22). Accounts are optional. Sign-out explains that saved data stays on the phone. |
| **Optional login reads as required** | Medium, for adoption by our users | No feature is gated. Sign-in is reached only from Settings and a dismissible hint, always with "Skip" (D20). |
| **Users trust asking people over an app** | Medium, for adoption | Make the trip screen faster than asking (target: under 30 s). Show the route name and direction ("W18 towards Saddar"), which users can confirm with the conductor. |
| **Scope creep** (real-time tracking, fares, multiple cities) | Medium | Hold to the scope list in [01-product.md](01-product.md). New ideas go in Phase 3. |

## Answered (2026-10-27)

| # | Question | Answer |
| --- | --- | --- |
| 1 | Launch city | **Karachi** |
| 2 | Formal or informal services | **Informal minibuses and coaches are the primary target** (D7, W18, G7, G17, G3, Masood, Sheraz…). Government People's Buses are a good add-on. Many vehicles run under one route name, so we target **route names**, not headsigns, plates or colours. |
| 3 | Existing route data | **Some text data covering Karachi bus routes**, which still needs converting into a map-ready network. |
| 4 | What gap Raahi fills | Agreed: informal routes, Urdu-first design, landmark search, and the "where do I get off" focus. |
| 5 | Fares | Out of scope |
| 6 | Women-specific features | Out of scope |
| 7 | Deadline | None fixed. Build everything for now and trim later. If it comes to that, cut M7 first, then M6 polish. Never cut the M1 planner tests. |
| 8 | Licence | Undecided. The repo `LICENSE` is still the Expo template's ("Copyright 650 Industries"), so replace it before making the repo public. |

## Answered (2026-10-28)

| # | Question | Answer |
| --- | --- | --- |
| 9 | Map provider | **Google Maps**, rendering only, with a locked-down key (D19). |
| 10 | Accounts | **Optional and local-first**: everything works as a guest; signing in adds backup and sync (D20). Mock auth in Phase 1 (D21), with tokens and home/work in `expo-secure-store` (D22). |

## Still open

1. **Where does the Karachi route text data come from, and how old is it?** This decides how much it can be trusted.
2. **Which 4–6 routes go into the Phase 1 fixture?** They should overlap, so that at least one test trip needs a transfer.
3. **Do the routes run the same stops in both directions?** Note any one-way sections, because they affect the variants.
4. **Does the assignment accept mock auth** (real secure storage and session handling, fake server), or does it need a real auth server in Phase 1? If the latter, pull the Phase 2 auth endpoints forward.
5. **Sign-in identifier for Phase 2:** email + password (free) or phone + OTP (familiar to users, but every SMS costs money). The contract uses email for now.
