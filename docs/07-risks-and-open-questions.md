# 07 · Risks and open questions

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Route data is incomplete or wrong** | Very high. It causes exactly the stranding the app exists to prevent. | Launch in one city with formal routes first. Store source and verified date per record. Add a "Wrong info?" link from M5. Be honest in the UI when we don't know ("we don't know a bus for this yet"). |
| **Informal routes change without notice** | High, if they're in scope | Leave them out of v1, or label them "less reliable". Build a correction flow before adding many. |
| **Data work takes far longer than code** | High, for the schedule | Start data collection in parallel with M1. Don't leave it for Phase 2. |
| **Map performance on low-end phones** | Medium | Viewport-limited markers, `tracksViewChanges={false}`, and early testing on a cheap device (M2, M6). |
| **Unnatural Urdu** | Medium. Users will feel the app isn't for them. | Use a native-speaker review of conversational Urdu, and test with the real users. |
| **Google Maps billing** | Low–medium. It needs a billing account; mobile map loads are currently free, but other APIs aren't. | Use only the Maps SDK for Android. Restrict the key. Set a budget alert in Google Cloud. |
| **Users trust asking people over an app** | Medium, for adoption | Make the trip screen faster than asking (target: under 30 s). Show the bus code and headsign exactly as painted on the bus, so users can confirm it with their own eyes. |
| **Scope creep** (real-time tracking, fares, multiple cities) | Medium | Hold to the scope list in [01-product.md](01-product.md). New ideas go in Phase 3. |

## Open questions

These need answers before or during M0 and M1.

1. **Which city launches first?** Ideally the one you live in, so you can ride and verify routes yourself.
2. **Formal services only, or informal wagons and minibuses too?** This drives both the data effort and the trust model.
3. **Is there existing route data** (a GTFS feed, published route lists, an OSM mapping community) for that city? Spend a day looking before you map anything by hand.
4. **What already exists?** Check official transit-authority apps and Google Maps transit coverage for the city. Know exactly what gap Raahi fills that they don't. Most likely it's informal and feeder routes, Urdu-first design, landmark search and the "where do I get off" focus.
5. **Fares:** are they stable enough to show? If they're shown and wrong, they erode trust.
6. **Women commuters:** do formal services have women-only sections or doors, and is that worth showing? It might be a meaningful differentiator.
7. **Is there a fixed deadline** (a course or FYP submission, a demo day)? If so, cut M7 first, then trim M6 polish. Never cut the M1 planner tests.
8. **Licensing:** the repo `LICENSE` is still the Expo template's MIT licence ("Copyright 650 Industries"). Replace it with your own licence and name.
