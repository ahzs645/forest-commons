# Adapting a region without changing the game engine

Export the Québec package from Scenario studio. Edit a copy, validate it by importing it, then start a campaign. The imported package travels with every campaign save. A new region should use its own stable `id`, sources and description; changing a package does not mutate an existing saved campaign.

The authoritative TypeScript contract is `src/simulation/types.ts`, `RegionDefinition`. The runtime validator is `src/simulation/validation.ts`. Engine code depends on IDs and parameters, never place names or a fixed number of assortments, stands, mills, zones, trucks or crews.

## Spatial package

Coordinates are `[longitude, latitude]` in WGS84; distances are kilometres, time is hours, inventory is cubic metres. Coordinates must be finite and inside longitude ±180 / latitude ±85. IDs use letters, digits, hyphens and underscores and must be unique within each entity table.

- `center`, `zoom`: initial map view.
- `roads.nodes`: `{id, position}`. Every stand, mill and initial crew/truck location references a node.
- `roads.edges`: `{id, from, to, km, speed, bearing, zone, geometry, name}`. Edges are bidirectional. Geometry runs from the `from` node toward the `to` node. `km` and `speed` determine travel time; obtain a connected, region-appropriate network and measured lengths. A disconnected graph is rejected.
- `stands`: a node, geographic point and closed polygon, a weather zone, terrain bearing, initial volume and a product-fraction `mix` summing to one. Include productivity in m³/hour, harvest cost per m³, asking price for the whole lot, supply type, auction week and teaching hectares.
- `mills`: point/node, accepted-product prices per m³ and one demand object per month. A product without a mill price is not accepted at that mill.

**Bearing classes:** 1 all conditions; 2 wet/normal/frozen; 3 normal/frozen; 4 frozen only. Forest soil uses `terrain`; road edges use `bearing`. An improved road is always available, but does not alter stand terrain access.

Current graph semantics are bidirectional single-edge travel times with seasonal closures. A future region requiring legal one-way truck routing, bridges with load limits or daily road schedules should extend the schema and routing rules explicitly instead of pretending those constraints are already represented.

## Operations and markets

- `products`: ID, display name, map color, `maxFreshWeeks`, optional `downgradeTo`. Degradation links must exist and may not form cycles. Products without a downgrade destination become explicit waste when their freshness window expires.
- `crews`: initial node, weekly hours, productivity multiplier, hourly cost, relocation speed and cost/km.
- `trucks`: initial node, weekly hours, payload, loading/unloading hours, cost/km and fixed weekly cost. Empty repositioning and loaded journeys consume capacity. The truck ends at its last actual mill.
- `weeks`, `weeksPerMonth`: campaign and commitment periods. Mill demand arrays contain `ceil(weeks/weeksPerMonth)` entries. Partial final months settle at campaign end.
- `weather`: named schedules with an actual and a forecast array for each zone, exactly one entry per campaign week. Supported conditions are `frozen`, `normal`, `wet`, `thaw`.
- `economy`: starting cash, weekly overhead, commitment bonus/shortfall rates and tolerance, road-upgrade cost/km, refusal guarantee fraction, storage and terminal inventory charges.
- `ecology`: minimum retention fraction, harvest/haul emission rates and per-weather disturbance coefficients. These are educational indices unless calibrated and independently validated.

Private supply can be purchased immediately. Auction bids settle at the end of the listed week and are available the following week. Bids compete against a deterministic synthetic rival using the scenario asking price and campaign seed. The original retained seed allows repeatable auction comparisons; it does not vary the explicitly authored weather schedule.

## Québec provenance

`src/data/quebec-road-network.json` has seven public trunk legs totalling about 261.4 km. `scripts/build-quebec-roads.py` regenerates them from the cached `../research/geography/quebec-trunk-routes.json` OSRM response. Original OpenStreetMap-derived route points are kept in that source response. The visual geometry is thinned; lengths use the original geometry. Training access spurs are generated separately in the scenario file and use assumed logging-road speeds and bearing.

For British Columbia later, substitute an appropriately licensed BC road network, real region center, documented training or licensed stand polygons, local assortments/destinations and regional season/cost/capacity rules. Keep training assumptions explicit. PGMaps technology has been reused here; PGMaps itself was not changed and its Prince George data was not used as the Québec scenario.

## Acceptance for a new region

Import validation checks entity references, graph connectivity, product mixtures, degradation links, weather calendars, numeric bounds and demand shape. Automated engine tests also run a shorter renamed region with a renamed assortment to detect hard-coded geography or product logic. Before using a new package in teaching, play full seasons, reconcile mass and cash, review routes for geographic plausibility, and calibrate service and financial outcomes. Validation cannot certify real-world regulatory or forestry accuracy.

## Treatments and learning objectives

Optional `treatments` maps treatment IDs to `{name, retention, productivity, cost, disturbance}`. Include a `final` profile whenever defining treatments. Retention is an absolute fraction of initial stand volume; the effective floor is the greater of the profile and the player's selected retention. Other fields multiply baseline stand productivity, direct harvest cost and modelled disturbance. A crew order's optional `treatment` selects the profile. Omitting it selects final harvest; packages without profiles preserve earlier baseline behavior.

Optional `objectives` entries use `{id, title, description, metric, direction, target, unit}`. Metrics: delivered volume (`delivered`, m³), fraction of settled nonzero commitments achieved (`service`, percent), expired volume / harvested volume (`waste`, percent), emissions / delivered volume (`emissions`, kg/m³), and change from starting cash (`profit`, regional currency). Direction is `at-least` or `at-most`. Ratios without observations remain unassessed. Objective status is provisional until campaign end.

Do not transplant Québec thinning coefficients or teaching thresholds to BC as if they were local forestry standards. A BC scenario can author its own profiles and objectives through the same package structure.

## Expansion data

Optional `disruptions` contain `id`, `title`, `description`, `kind` (`road`, `crew`, `truck`, `mill`), `target`, `week`, `endWeek`, `revealWeek`, `repairCost`, `repairWeeks`. Targets must exist. Dates use campaign weeks, reveal cannot follow onset, and duration stays within the region calendar. Responses record paid recovery or waiting; the original region graph is retained and active closures produce an operating graph. Immediate recovery has zero delay. Old saves without disruptions continue unchanged.

Optional `partnerJobs` contain `id`, `company`, road-node `from`/`to`, `product`, finite `volume`, `week`, `deadline`, `paymentPerM3`. This is separate partner cargo, not harvest from player inventory. Quotes cap settlement. Shared dispatch visits the job origin and destination before the player's pickup, charging route distance and extra handling. Travel savings compare that trip to player repositioning plus a partner round trip, at the selected truck's cost rate. No network-wide optimality is implied. Closed roads apply to every segment.

Optional `stewardship` parameters are typed in `src/simulation/stewardship.ts`: annual horizon, growth/capacity, natural/planted regeneration lags, planting cost, treatment fractions and net revenue, habitat recovery/initial index, separate starting budget and an explicit model note. The exercise snapshots current forest volume and management rights; it cannot modify the weekly campaign. It has its own annual history, conservation equation and budget. Protected and unsecured areas cannot be treated. Current Québec parameters are illustrative, not yield curves or validated ecological indicators.

When shortening a region calendar, adapt disruption dates and partner contract windows along with weather, auctions and mill demand. When renaming a product, update partner cargo references as well as stands and markets. The automated portability fixture covers these references.

BC preparation requirements are recorded in `../research/bc-adaptation-package.md`. A local parameter review remains necessary before releasing a BC preset.


## D3 visualization data extensions

Optional `roads.edges[].roadClass` is `public` or `forest`. Missing classifications display as unknown. The engine records production by the stand's connecting road class; this is not route-distance composition or a mill commitment.

Optional `weatherCharts` supplies `{ startCalendarWeek, provenance, scenarios }`. For every weather scenario, `forecast` and `actual` map zone IDs to exactly 52 values `{ temperatureC, snowCm, precipitationMm }`. Temperature is °C, snow depth cm, weekly precipitation mm. This optional profile currently requires an operating horizon no longer than 52 weeks; the general operating schema still supports longer horizons without it. Campaign axes use sequential campaign weeks. `model: "category-illustration"` identifies the built-in pedagogical display model; omit that flag for independently authored numerical data and provide accurate provenance. Numerical values are display-only: existing weather categories still control terrain/road access. A future physical climate/access model would need independent calibration and validation.

Saves optionally contain `scheduledCrews[week][crewId]`: sparse future overrides; absent means carry, `[]` means rest. They are consumed as weeks begin. Production records and truck travel/handling records start with newly played weeks and are not reconstructed for old histories. Managed-area annual habitat is similarly optional. Save envelope format 2 packs numerical weather triples losslessly; format 1 and plain saves remain accepted.

For BC, author the geography, road classes, weather provenance, treatment/ecology parameters and commercial scenario together. Do not reuse the Québec illustrative temperatures as a regional weather dataset.
