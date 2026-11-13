# Source: Bus-Routes-Karachi.txt

- **Origin:** blog post "Karachi bus routes", <http://adiekhan.blogspot.com/2009/01/karachi-bus-routes_24.html> (posted January 2009). The file's header says "January 2010". It looks like a copy of a PDF of that post, with page breaks (form feeds) and mid-name line wraps.
- **Added to the repo:** 2026-11-12, unedited.
- **Age:** about 17 years old at the time it was added. Many numbered minibus routes have since stopped running, been renumbered or changed path, and newer services (Green Line BRT, People's Bus Service, Orange Line) are missing. **Treat every route as unverified** until someone confirms it's still running.
- **Licence:** unknown; it's a personal blog. Use it as a starting list to verify, not as a dataset to republish.
- **Contents:** 344 route entries (265 numbered minibus routes such as `W-18` or `G-7`, plus 79 named coaches), each an ordered list of places. No coordinates, directions or timings.

Known problems (see `build/review.md`, which the pipeline regenerates):

- 5 route codes appear twice (`16-F`, `17-I`, `17-J`, `18-K`, `5-A`). Some look like the same route listed twice; others are clearly different routes.
- 6 routes end in a truncated stop name (`G-12`, `H-2`, `Ghulam Coach`, `Gulistan Coach`, `Rainbow Coach`, `Waziristan Coach`), so they're missing at least their last stop.
- Inconsistent spellings everywhere ("Goro Mandir", "Guru Mandir"; "Sadar", "Saddar").
