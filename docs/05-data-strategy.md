# 05 · Data strategy

The app is only as good as its route data. **Wrong data is worse than no data**, because it's exactly what strands people. This is the hardest and most important part of the project, and it isn't a coding problem.

## Principles

1. **One city first: Karachi.** Get its network complete and correct before touching another city.
2. **Informal routes are the product.** Karachi commuters mostly ride informal minibuses and coaches (D7, W18, G7, G17, G3, Masood, Sheraz…), so those come first, even though they're harder to keep accurate. Government services (People's Bus Service, BRT) are an add-on. Because informal routes shift, verification and the "Wrong info?" feedback loop matter from day one.
3. **Identify routes by name only.** We don't record bus colour, plate or destination boards; there's no reliable source for them. A variant's direction is just its last stop.
4. **Every record has a source and a verified date** (`data_meta` table). The app can then say "verified Oct 2026", and we know what's going stale.
5. **Bilingual at the source.** Every stop and route gets an `en` and a `ur` name, entered by a human. We never machine-translate place names.

## Karachi: from route text to network

We already have **text descriptions of Karachi bus routes**, i.e. a route name plus the areas it passes through. Text alone can't go on a map, so it has to be converted in four steps:

```
data/karachi/raw/*.txt          route name + list of places, in order
        │  1. parse
        ▼
routes + ordered place names    "W18: Nagan Chowrangi → … → Saddar"
        │  2. normalise names, using one shared gazetteer
        ▼
gazetteer.json                  each unique place → { id, en, ur, aliases, lat/lng }
        │  3. build shapes      route along roads between consecutive stops
        ▼
network.json                    stops + routes + variants (both directions) + shapes
        │  4. validate          automated checks + a manual look on the map
```

1. **Parse.** Write a script that splits each route into an ordered list of place names. The exact parsing rules depend on how the text is written.
2. **Gazetteer.** This is most of the work. The same place shows up spelled differently across routes ("Gurumandir", "Guru Mandir", "Gru Mandir"), and **a place shared by two routes is what makes transfers possible**. So keep one gazetteer where every place gets one ID, its spelling variants as aliases, an Urdu name, and coordinates. Set the coordinates by hand: look the place up on OpenStreetMap and click its location in geojson.io. Don't use a geocoding API.
3. **Shapes.** Text doesn't say which roads a bus takes between two places. To start, route between consecutive stops with an OSM-based router (OSRM or GraphHopper, run locally), then fix the obvious detours by hand. Mark these shapes as `source: "routed"` until someone rides the route.
4. **Directions.** Unless the text says otherwise, assume each route runs the same stops in both directions: one variant forward and one reversed. Write down any one-way sections you know about.
5. **Validate.** Run the checks under "Tooling" below, then plot all variants on a map and eyeball them. Ask Karachi commuters to spot-check the routes they ride.

## Sources, in order of preference

| Source | What it gives | Caveats |
| --- | --- | --- |
| **Karachi route text data** (we have it) | Route names and the order of places along them | No coordinates and no road geometry, so it needs the pipeline above. It may be outdated, so check its age and source. |
| **Existing GTFS feed** for the city (search the [Mobility Database](https://mobilitydatabase.org/), operator and transit-authority websites, and research or NGO projects) | Complete stops, routes and shapes in a standard format | It may not exist, or may be outdated. Check the licence. |
| **Operator / transit authority published route maps and stop lists** | Authoritative stop lists and order | Usually PDFs or images, so they need manual transcription. Check terms of use. |
| **OpenStreetMap route relations** (`type=route` + `route=bus`) via Overpass | Stops, order and geometry, often for BRT and metro lines | Quality and completeness vary a lot. Licensed **ODbL**: requires attribution, and share-alike applies to a derived database. |
| **Manual field mapping:** ride the route, record a GPS track, and mark each stop | Ground truth | Slow. Each route needs to be ridden in both directions. |
| **Crowdsourced corrections** (Phase 3, "Wrong info?" reports) | Keeps data fresh | Needs moderation. |

**Do not scrape Google Maps** or use its transit results as a data source. Its terms of service forbid it, and its coverage of informal routes in Pakistan is weak anyway.

### Example Overpass query (try it at [overpass-turbo.eu](https://overpass-turbo.eu/))

```
[out:json][timeout:90];
area["name:en"="Karachi"]["boundary"="administrative"]->.city;
relation["type"="route"]["route"="bus"](area.city);
out body;
>;
out skel qt;
```

Expect this to return mostly BRT and government routes, if anything. Even so, OSM is very useful for **place coordinates** for the gazetteer and as the road network for building shapes.

## Network file format

This is one format for everything: the Phase 1 fixture (`app/src/services/api/mock/fixtures/network.json`), the Phase 2 database importer, and the Phase 3 offline bundle.

```jsonc
{
  "version": "2026-10-27",
  "city": "karachi",
  "stops": [
    { "id": "s_gurumandir", "name": { "en": "Gurumandir", "ur": "گرو مندر" },
      "location": { "lat": 24.0, "lng": 67.0 },          // placeholder coords
      "aliases": ["guru mandir", "gru mandir"] }
  ],
  "landmarks": [
    { "id": "l_example", "name": { "en": "Example Hospital", "ur": "..." },
      "location": { "lat": 24.0, "lng": 67.0 }, "aliases": [] }
  ],
  "routes": [
    { "id": "r_w18", "code": "W18", "name": { "en": "W-18", "ur": "ڈبلیو 18" },
      "mode": "minibus" }
  ],
  "variants": [
    { "id": "r_w18_a", "routeId": "r_w18",
      "towards": { "en": "Saddar", "ur": "صدر" },          // = last stop's name
      "stopIds": ["...", "s_gurumandir", "..."],           // in travel order
      "shape": "<encoded polyline>" }
  ],
  "meta": [
    { "entity": "variant", "id": "r_w18_a", "source": "text-data+routed", "verifiedAt": null }
  ]
}
```

## Tooling for building the fixture (Phase 1)

1. Trace route shapes and place stops in [geojson.io](https://geojson.io/), or in JOSM if you're starting from OSM data.
2. Write a small script (`api/scripts/` in Phase 2, or a throwaway one for now) that converts GeoJSON plus a stop-order list into the JSON above, encoding the shapes.
3. Validate the result: every `stopId` exists, each variant has at least 2 stops, every stop lies within about 50 m of its variant's shape, and every name has both `en` and `ur`. Add these checks as a Jest test over the fixture.

## Phase 2: getting to a full city

- Rough sizing: Karachi's informal network is likely well over a hundred named routes, sharing hundreds of places. That's weeks of careful gazetteer and shape work, not days. Prioritise the busiest routes and corridors first.
- Treat data like code: keep it in git (`data/<city>/`, as plain JSON or CSV), review changes in PRs, and import it into PostGIS in CI.
- Once real data exists, re-verify a sample by riding the routes before launch.
