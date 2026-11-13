# Karachi network data

| Path | What | Edit by hand? |
| --- | --- | --- |
| `raw/` | The original route text, unedited, plus `SOURCE.md` (where it came from, how old it is) | No |
| `pipeline/` | Scripts that turn the text into data (plain Node, no dependencies) | — |
| `aliases.json` | Curated merges ("Goro Mandir" = "Guru Mandir"), `doNotMerge` vetoes, per-route renames | **Yes** |
| `network.json` | The network the app runs on (also copied to `app/src/services/api/mock/fixtures/network.json`) | No (generated) |
| `gazetteer.json` | Every unique place: ID, en/ur names, aliases, coordinates, which routes use it | **Yes**: `name.ur`, `location`, `locationSource`, `notes`, `name.en` (+ `enLocked`) |
| `build/routes.json` | Parsed routes: ordered stop names plus parse warnings | No (generated) |
| `build/review.md` | To-do list: flagged routes, possible duplicate places, generic names, busiest places | No (generated) |
| `osm/places.json` | Your Overpass export (not committed) | No |
| `build/osm-suggestions.json` | Coordinate and Urdu-name candidates from OSM. Committed, so the network rebuilds without the raw export | No (generated) |

The pipeline and file format are described in [docs/05-data-strategy.md](../../docs/05-data-strategy.md).

## Running the pipeline

From the repo root:

```bash
node data/karachi/pipeline/run.mjs
```

It's safe to re-run at any time. It never overwrites the hand-edited fields in `gazetteer.json`.

1. **Parse** `raw/*.txt` → `build/routes.json`. Joins wrapped lines, splits stops, and pulls out notes in parentheses. Duplicate codes become `16-F#1` and `16-F#2`. Truncated stops are dropped and flagged.
2. **Gazetteer** → `gazetteer.json` + `build/review.md`. Groups spellings by a normalised key (case, dots, spaces, "No.", and generic-word spellings such as Chowrangi/Chourangi/Chorangi), then by `aliases.json`. Then it **auto-merges near-spellings** (D34): similarity ≥ 0.8, same numbers, and only into clusters where every name is close to every other, so a chain of loose pairs can't fuse different areas. Names that only *contain* each other ("Defence" / "Defence Society") are never auto-merged; they stay under "Possible duplicate places" in `review.md`. A route code listed twice with ≥ 80% shared stops becomes one route. It also tags `generic` names ("Petrol Pump", which may be several places) and `road` names ("M.A Jinnah Road", a corridor, not a point).
3. **OSM match** → `build/osm-suggestions.json`. For each place, the OSM features with the same name, the same name minus a suffix ("NIPA" = "NIPA Chowrangi"), or a very similar one, with coordinates and `name:ur`. Without `osm/places.json` it reuses the committed suggestions.
4. **Network** → `network.json` + the app fixture (D35). Each place uses its hand-set `location` if it has one, otherwise the best OSM candidate. Generic names, roads, ambiguous names with no candidate near their route, and points far from their neighbouring stops get **no** location, and those stops are left out of their routes. Each route gets two variants (forward and reversed) with straight-line shapes. Everything is marked unverified. The step refuses to overwrite a network with one less than half its size; pass `--force` to override.

## Working through the data

Everything improves the network on the next run:

1. Read `build/review.md`. **Network coverage** lists the busiest places that have no location yet. Setting `location` (and `name.ur`) for those in `gazetteer.json` adds the most stops. A hand-set location always beats OSM.
2. If an **auto-merged** place is wrong, add the pair to `doNotMerge` in `aliases.json`.
3. Go through the remaining **Possible duplicate places** (mostly "contains" pairs). Add real duplicates to `merges`.
4. Go through **Generic names**. Where one route's "Petrol Pump" is a different place, add a `routeOverrides` entry.
5. Confirm each route still runs before a public release (see `raw/SOURCE.md`: the text is from 2009–2010).

## Getting OSM data from Overpass

Open <https://overpass-turbo.eu/>, paste a query, click **Run**, then **Export → Data → "raw OSM data" (JSON)**. If the browser struggles to draw the map, export anyway; the export doesn't need the map.

**Query A: named places, for coordinates and Urdu names.** Save the result as `data/karachi/osm/places.json`, then re-run the pipeline.

```
[out:json][timeout:300][bbox:24.74,66.65,25.25,67.55];
(
  nwr["place"~"^(suburb|neighbourhood|quarter|locality|village|hamlet|town|square)$"]["name"];
  nwr["highway"="bus_stop"]["name"];
  nwr["public_transport"]["name"];
  nwr["amenity"="bus_station"]["name"];
  nwr["railway"~"^(station|halt)$"]["name"];
  nwr["junction"]["name"];
  node["highway"~"^(traffic_signals|crossing|turning_circle|motorway_junction)$"]["name"];
  nwr["amenity"~"^(hospital|clinic|college|university|school|cinema|police|post_office|marketplace|fuel|bank|place_of_worship)$"]["name"];
  nwr["shop"~"^(mall|department_store|supermarket)$"]["name"];
  nwr["leisure"~"^(park|stadium|garden)$"]["name"];
  nwr["historic"]["name"];
  nwr["landuse"~"^(retail|industrial|commercial|residential)$"]["name"];
  nwr["building"]["name"]["building"!~"^(yes|house)$"];
);
out center tags;
```

**Query B: bus route relations, to check what OSM already has.** Save it as `data/karachi/osm/routes.json`. The pipeline doesn't read it yet; it's for comparing by eye.

```
[out:json][timeout:180][bbox:24.74,66.65,25.25,67.55];
relation["type"="route"]["route"~"^(bus|minibus|share_taxi|coach)$"];
out tags;
```

Licence: OSM data is © OpenStreetMap contributors, under the ODbL. See D33 in [docs/06-decisions.md](../../docs/06-decisions.md).

## Sample network (unit tests only)

`sample/build-sample-network.mjs` (D25) builds a small hand-made network at `app/src/services/api/mock/__tests__/fixtures/sample-network.json`. The planner, mock-API and component tests assert exact trips on it (W18, D7…), so it stays even though the app now runs on `network.json` (D35). **It is not real route data.** Regenerate it from the repo root with:

```bash
node data/karachi/sample/build-sample-network.mjs
```
