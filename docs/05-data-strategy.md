# 05 · Data strategy

The app is only as good as its route data. **Wrong data is worse than no data**, because it's exactly what strands people. This is the hardest and most important part of the project, and it isn't a coding problem.

## Principles

1. **One city first.** Get one city's network complete and correct before touching another.
2. **Formal services first, informal later.** Metro, BRT and official feeder routes have fixed stops and published maps, so they're tractable. Informal wagons and minibuses change routes and stop anywhere. Add them only once there's a way to verify and update them.
3. **Every record has a source and a verified date** (`data_meta` table). The app can then say "verified Oct 2026", and we know what's going stale.
4. **Bilingual at the source.** Every stop and route gets an `en` and a `ur` name, entered by a human. We never machine-translate place names.

## Sources, in order of preference

| Source | What it gives | Caveats |
| --- | --- | --- |
| **Existing GTFS feed** for the city (search the [Mobility Database](https://mobilitydatabase.org/), operator and transit-authority websites, and research or NGO projects) | Complete stops, routes and shapes in a standard format | It may not exist, or may be outdated. Check the licence. |
| **Operator / transit authority published route maps and stop lists** | Authoritative stop lists and order | Usually PDFs or images, so they need manual transcription. Check terms of use. |
| **OpenStreetMap route relations** (`type=route` + `route=bus`) via Overpass | Stops, order and geometry, often for BRT and metro lines | Quality and completeness vary a lot. Licensed **ODbL**: requires attribution, and share-alike applies to a derived database. |
| **Manual field mapping:** ride the route, record a GPS track, and mark each stop | Ground truth | Slow. Each route needs to be ridden in both directions. |
| **Crowdsourced corrections** (Phase 3, "Wrong info?" reports) | Keeps data fresh | Needs moderation. |

**Do not scrape Google Maps** or use its transit results as a data source. Its terms of service forbid it, and its coverage of informal routes in Pakistan is weak anyway.

### Example Overpass query (try it at [overpass-turbo.eu](https://overpass-turbo.eu/))

```
[out:json][timeout:90];
area["name"="Lahore"]["boundary"="administrative"]->.city;
relation["type"="route"]["route"="bus"](area.city);
out body;
>;
out skel qt;
```

Swap in your launch city. Look at what comes back to judge OSM's coverage before relying on it.

## Network file format

This is one format for everything: the Phase 1 fixture (`app/src/services/api/mock/fixtures/network.json`), the Phase 2 database importer, and the Phase 3 offline bundle.

```jsonc
{
  "version": "2026-10-27",
  "city": "lahore",
  "stops": [
    { "id": "s_kalma", "name": { "en": "Kalma Chowk", "ur": "کلمہ چوک" },
      "location": { "lat": 31.0, "lng": 74.0 },          // placeholder coords
      "aliases": ["kalma", "kalma chok"] }
  ],
  "landmarks": [
    { "id": "l_example", "name": { "en": "Example Hospital", "ur": "..." },
      "location": { "lat": 31.0, "lng": 74.0 }, "aliases": [] }
  ],
  "routes": [
    { "id": "r_12", "code": "12", "name": { "en": "Route 12", "ur": "روٹ 12" },
      "mode": "feeder", "color": "#1E88E5", "farePkr": null }
  ],
  "variants": [
    { "id": "r_12_a", "routeId": "r_12",
      "headsign": { "en": "towards X", "ur": "..." },
      "stopIds": ["s_kalma", "..."],                         // in travel order
      "shape": "<encoded polyline>" }
  ],
  "meta": [
    { "entity": "variant", "id": "r_12_a", "source": "field-survey", "verifiedAt": "2026-10-20" }
  ]
}
```

## Tooling for building the fixture (Phase 1)

1. Trace route shapes and place stops in [geojson.io](https://geojson.io/), or in JOSM if you're starting from OSM data.
2. Write a small script (`api/scripts/` in Phase 2, or a throwaway one for now) that converts GeoJSON plus a stop-order list into the JSON above, encoding the shapes.
3. Validate the result: every `stopId` exists, each variant has at least 2 stops, every stop lies within about 50 m of its variant's shape, and every name has both `en` and `ur`. Add these checks as a Jest test over the fixture.

## Phase 2: getting to a full city

- Rough sizing: a city's formal network is a few dozen routes and hundreds to low thousands of stops. That's weeks of careful data work, not days. Plan for it.
- Treat data like code: keep it in git (`data/<city>/`, as plain JSON or CSV), review changes in PRs, and import it into PostGIS in CI.
- Once real data exists, re-verify a sample by riding the routes before launch.
