# Visualization parity and playthrough audit — 2026-09-07

> Superseded implementation status: the [React + D3 pass](d3-implementation-2026-09-07.md) adds the future-week scheduler, production intervals/road-class chart, numerical teaching weather curves, procurement and inventory charts, coalition graphics, annual calendar and managed-area habitat. The table below preserves the earlier audit baseline, not current missing-feature claims. The new report records current limits and verification.

Full visual parity is **not complete**. This audit compares the reviewed Harvest Arena slide screenshots (notably slides 11 and 16, extracted in source-visuals) and the prior targeted app review. Populated original endgame/optimizer views have not been verified exhaustively.

| Original view | Forest Commons status | Remaining difference |
|---|---|---|
| Geographic stands, fleets and routes | Implemented with MapLibre/deck.gl and Québec road graph | Different regional scenario and density; not the original Norway map |
| Crew scheduling chart | New recorded/current allocation timeline in Production | No independently editable future-week calendar or measured per-stop start/end times |
| Cumulative mill/assortment volume | New filterable delivery chart, period resets and optional forecast overlay | Original chart includes production and public/forest-road stacked areas; our chart measures deliveries |
| Mill × assortment goal matrix | New period-specific actual/commitment matrix | Explicit under/within/over tolerance; current progress is not settled success |
| Seasonal weather/access | New forecast/observed categorical matrix, future observations hidden | Original continuous temperature, snow and precipitation curves require numerical regional data, absent here |
| Fleet utilization | New actual capacity bars, crew relocation separated | Truck travel and handling remain combined in recorded hours |
| Supply composition | New secured standing/roadside assortment bars | Purchase-bank workdays cylinder and terrain/road-type composition not reproduced |
| Company/collaboration graphics | Existing allocations, profiles, coalition diagnostics and route comparison | Not every source company map or network figure reproduced |
| Endgame/optimizer visuals | Existing campaign debrief, scorecard and bounded benchmarks | Original populated screens not fully audited; no global dispatch optimization claim |

## Independent agent playthroughs

These were programmatic engine/API playthroughs, **not three browser usability sessions**. Scripts, results and detailed reviews are in playthroughs/.

- Operations: 12 weeks, 56,009 m³ delivered, CAD2,723,839 profit, 8/29 commitments achieved, 9.96% expired. All 24 save/reload roundtrips matched. Of 21 misses, 18 were over-delivery. This motivated the fulfillment matrix; service-aware automatic drafting remains future work.
- Classroom: 4 weeks with three operating roles and five companies; 23,872 m³ delivered. Ready barrier, permissions, bid privacy, revisions, reconnect and unanimous EPM agreement passed. Negative-benefit volume allocation was correctly blocked.
- Stewardship: 12-week thinning campaign and separate 30-year exercise. Retention, cooldown, protected stands, planting affordability, duplicate planting, horizon and reload checks passed. Treatment-aware drafting and managed-area habitat reporting remain improvements.

## Verification

63 tests across 10 files passed with `npm test -- --maxWorkers=1`. Initial parallel run: 62 passed, existing full-season save test exceeded its five-second timeout. No assertion failed. Production build and server TypeScript check passed. Map bundle still emits the existing large-chunk warning.

Browser verification used the existing week-5 save without advancing it. Confirmed Reports charts, Dolbeau filter, forecast overlay weeks 5–8, period-1 matrix (Dolbeau 3,500/3,500), expanded chart data and Production timeline. Inspected rendered chart screenshot. Future observations remained blank. This is a focused UI check, not exhaustive responsive coverage or a replacement for the earlier browser campaign evidence.

## Next implementation work

Independent future-week orders; commitment-aware and treatment-aware drafting; inventory age/expiry timeline; managed-area habitat reporting; annual calendar; staged information disclosure; documented auction uncertainty. Full numerical weather and road-type production graphics require additional model/data work. BC parameter review and a production classroom deployment remain separate work.
