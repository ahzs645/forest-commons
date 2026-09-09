# British Columbia adaptation package — preparation, not a calibrated scenario

The operating and annual mechanisms now consume regional data. A BC campaign should be authored as a new RegionDefinition and validated with `validateRegion`; copying Québec place labels is insufficient. The existing shortened-calendar / renamed-product test demonstrates schema portability, not BC realism.

Required review before a BC preset is published:

| Regional input | Current teaching implementation | BC authoring requirement |
|---|---|---|
| Geography | Licensed OSM/OSRM Québec trunk geometry; illustrative parcels and spurs | Licensed BC stand/road/destination layers with connected nodes, plausible road classes and checked route distances |
| Products and markets | Five Québec training assortments; authored prices and demand | Locally reviewed species/product definitions, mill acceptance, grade conversion and period demand |
| Harvest access | Bearing class plus forecast thaw/wet/normal/frozen | Region-specific seasonal restrictions, terrain and treatment productivity; document omitted legal/operational constraints |
| Procurement | Immediate private purchase, sealed auctions, guarantee/refusal | Appropriate tenure and procurement teaching rules; do not imply the current auction represents BC tenure law |
| Disruptions | Dated road/fleet/mill closures and paid restoration | Authored dates, disclosure times, recovery costs and durations with a stated learning purpose |
| Partner freight | Separate finite cargo, origins, destinations, contract windows and maximum quote | Plausible local freight flows, compatible cargo and rates; review vehicle/handling assumptions |
| Objectives | Explicit instructional targets | Instructor-set success thresholds; distinguish these from regulatory or sustainability criteria |
| Annual stewardship | Thirty annual steps; scalar growth, regeneration lag, habitat index | Reviewed species/age/site yield models and ecological indicators; current coefficients are illustrative only |

Keep source title, license/URL, geography date, units, confidence, reviewer and known exclusions with each input family. Use REGION-PACKAGES.md for the executable field contract. Preserve the original Québec region ID and create a distinct BC ID; saves embed their own regional parameters, so an existing campaign must not silently switch coefficients.

A BC map/data collection and professional parameter review are intentionally a later stage, as requested. No BC preset is represented as ready or locally validated in this pass.

## Source acquisition continuation

An official, bounded Prince George sample is now collected and validated geometrically: 781 VRI 2025 rank-1 polygons and 10 tenure-road features. Dataset-specific licences and conversion gaps are documented in [BC input collection](bc-inputs/README.md). This supersedes the earlier statement that collection had not started; it does not supersede the outstanding regional-model review.
