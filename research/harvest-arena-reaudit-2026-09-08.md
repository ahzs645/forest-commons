# Harvest Arena reinspection — 8 September 2026

## Evidence and access boundary

New live inspection used a separate background browser tab at https://apps.forac.ulaval.ca/HarvestArena/. The landing page and Player → Returning player flow were verified. The game list still contains **Forest Review 2026-09-07**, and its player list contains **Forest Reviewer**. One sign-in attempt using the existing credential supplied earlier by the user returned **“Login failed: Wrong password”**. No other credentials were guessed, no account or password was created, and no campaign state was changed. The login problem prevents a fresh authenticated review of planning, populated reports and endgame. Initial browser transport timeouts recovered; the remaining boundary is the rejected credential.

Accordingly, authenticated observations below are explicitly from the 7 September review and supplied slide images, not newly verified live behavior. The public landing page newly confirms production planning under uncertain weather affecting harvest-area and road accessibility, and separate Player / Administrator entry.

Read alongside `forestry-game-review.md`, `d3-implementation-2026-09-07.md`, and the current game source. Historical missing-feature tables are superseded where implementation reports or code now provide equivalents.

## Original visual inventory from supplied screenshots

Directly inspected `source-visuals/slide11-image8.png` and `source-visuals/slide16-image12.png`:

- Large geographic map with dense contract dots, a bearing-capacity legend, harvester pictograms, destination pins with product symbols, crew travel lines and visible relocation-distance labels such as 203 km and 301 km.
- Four bearing classes use red, pale orange, green and blue in that source. These represent all-conditions through winter-only capability, not a universal danger/safe scale. Copying the colors without preserving meanings would mislead.
- Six crew rows with weekly colored schedule segments and yellow warning triangles inside affected intervals. A total production number sits immediately below the timeline.
- Mill-by-assortment target matrix: matching destination/product symbols, numeric target cells and checkmarks on satisfied targets.
- Four-week cumulative production with public/forest-road stacked areas, cumulative production line, dashed net demand, and selectable destination and assortment legends.
- Numerical annual temperature, snow and precipitation curves for Outer/Mid/Inner zones; separate categorical weekly weather/access matrix.
- KPI / Ground damage tabs, relocation per 1,000 m³, damage percentage, target tolerance, utilization, average bank time, weighted bank time, average bank volume and workdays.
- Purchase-bank workdays cylinder and residual terrain-bearing / road-type composition; All / Outer / Mid / Inner tabs.

The 7 September live review additionally recorded contract filters for bearing, productivity, workdays, volume and assortment percentages, six-team scheduling, and a 12-week calendar. Its 1,143 live contracts versus creation-page 1,148 and eight displayed destination names versus five described mills remain a source-version discrepancy. Do not invent missing five contracts or force all destinations to have positive demand.

## Current local equivalents and remaining work

Code review confirms MapLibre/deck.gl polygons, roads, routes, replay, mill/harvester/log-truck SVG symbols, symbol legend, ID labels, resource inspector and search. The app also has future crew scheduling, production interval records, cumulative charts, goal matrix, numerical teaching-weather and categorical access views, procurement bearing/workday composition and efficiency KPIs. These should be refined rather than rebuilt as missing.

| Priority | Gap or refinement | Testable acceptance criterion |
|---|---|---|
| P1 | Fleet icons at the same road node overlap within each resource type: every crew uses the same offset and every truck another offset. Ten crews can appear as one. | With three colocated crews and two trucks, every resource is selectable through a cluster list or deterministic separation; count and IDs are visible; keyboard/search equivalent remains available at 375 px. |
| P1 | Plan map routes are assembled only from crew and stand-haul orders. Facility-transfer-only plans currently omit the transfer path, and Fit plan omits their facilities. | A facility-transfer-only order draws source-to-destination route plus empty repositioning as appropriate; Fit plan includes both facilities; replay remains actual recorded movement. |
| P1 | Resource state is mainly tooltip text; static pictograms do not visibly separate scheduled, idle, unavailable and inaccessible orders. | Distinct badge/outline plus text for each state; unavailable is based on the active scenario/disruption state, inaccessible uses forecast route/terrain, not future realized weather; no color-only meaning. |
| P2 | Map polygons primarily encode ownership; source uses bearing-capacity dots for rapid planning. | Add selectable map coloring by ownership / terrain bearing / forecast accessibility with a legend that updates, while keeping selection and protected status distinguishable. |
| P2 | Original schedule warnings and relocation-distance labels expose consequences near decisions. | Each forecast-blocked crew stop has a warning icon and reason; applicable route inspection gives km and estimated relocation hours; no warning based on unrevealed actual conditions. |
| P2 | One generic mill symbol loses the source's product/destination visual shorthand. | Region-authored product symbols reused consistently in mill inspector, target matrix, inventory and filters; accessible names and text labels; unsupported product IDs receive a neutral fallback. Use original SVG art rather than copying source logos. |
| P2 | Stand roadside volume is only in tooltip/inspector; major inventory bottlenecks are not visible at district level. | Optional stock markers show summed m³ and aging/expiry status, with consistent time convention; layer can be disabled; overlapping markers aggregate safely. This is a proposed usability addition, not freshly observed original behavior. |
| P2 | Source-specific bank-time/ground-damage semantics are not fully verified against backend equations. | Every equivalent KPI names units, numerator/denominator and aggregation period; do not equate teaching disturbance with empirically measured ground damage or unweighted stock age with weighted bank residence. |
| P3 | Exact original populated optimizer/endgame, warning semantics and interactive chart behavior remain unaudited. | Reuse a working authorized player session and inspect without advancing an existing campaign; record actual screen inventory and only then add missing semantic equivalents. |

## Scope recommendation

The strongest next visual pass is operational information design: distinguish resources and their state, expose bearing/access and stocked wood, and connect warning icons to actionable explanations. Merely swapping decorative icons will not reproduce the original game's dense decision support. Preserve the map-focused drilldown and mobile access instead of reproducing the original screenshot's very wide dashboard literally.

No game code was changed during this audit. Authenticated live parity is unresolved because the reviewed credential was rejected; this report does not claim completion of that verification.
