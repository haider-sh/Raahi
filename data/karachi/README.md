# Karachi network data

- `raw/`: the original route text data, unedited. Note where it came from and when it was collected in `raw/SOURCE.md`.
- `gazetteer.json`: every unique place, with its ID, en/ur names, aliases and coordinates (to be built).
- `network.json`: the generated network (to be built).

The pipeline and file format are described in [docs/05-data-strategy.md](../../docs/05-data-strategy.md).

## Sample fixture (temporary)

Until the real route text data is in `raw/`, the app runs on a sample network built by `sample/build-sample-network.mjs` (D25). It uses real place names and route codes, but the coordinates are approximate and the stop orders are illustrative. **It is not real route data.** Regenerate it from the repo root with:

```bash
node data/karachi/sample/build-sample-network.mjs
```
