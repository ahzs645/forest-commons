# Stewardship player: programmatic playthrough

Executed against actual TypeScript simulation APIs, not the browser. Reproduce from `forestry-game` with `./node_modules/.bin/tsx ../research/playthroughs/stewardship-player.ts`. Full per-week messages, annual ledgers and final stands are in `stewardship-results.json` alongside the script.

## Decisions and results

The operating player used the forecast draft, a 65% retained-volume floor and commercial thinning throughout the 12-week Québec season. No future actual weather, auction seed or rival bid was consulted for decisions. No new timber was bought and no repair spending was undertaken. Each week's forecast was rehearsed, actual operations advanced, then the campaign serialized and parsed through the real save validator.

- Harvest: 20,877.50 m³.
- Delivery: 19,938.23 m³.
- Closing cash: CAD763,341.61.
- Cumulative retained standing volume stayed above 65% on every stand through all twelve weeks. Repeated drafting and different crew assignments did not reset the limit.

The annual exercise began from that completed season. One owned stand received final harvest in year 1 and planting in year 2. Three other owned stands were thinned in years 1, 6, 11, 16, 21 and 26; other stands rested. Every annual state was JSON round-tripped and validated.

- Thirty years completed; annual exercise ends at year 31.
- Closing cash: CAD332,731.54, from its separate CAD200,000 teaching budget.
- Annual-layer harvest: 14,481.15 m³.
- Final area-weighted habitat indicator: 0.94375375.
- Protected harvest, early repeated thinning, repeated planting, planting with a zero-cash controlled fixture, and advancing beyond the horizon were rejected.

## Findings and limits

No reproducible transition or save/reload failure occurred in this strategy. The conservation choice produces substantially less supply than the 50,000 m³ campaign teaching objective; this is a meaningful competing-objective outcome rather than a failed assertion.

The default draft does not offer a treatment-aware draft choice: it generates final-harvest orders and projected transport first. This player subsequently converted them to thinning. Transport forecasts can therefore initially over-allocate trucks relative to thinning output. Actual advance safely limits loaded timber, and the rehearsal exposes the shortage; a user-facing treatment-aware draft would improve planning.

The annual habitat metric averages all stands, including unmanaged and protected stands recovering through time. The 94.4% final indicator should not be interpreted as 94.4% habitat performance on the actively treated subset. A separate managed-area indicator or comparison would make local effects more legible.

Annual regeneration, habitat recovery and five-year treatment intervals remain simplified teaching coefficients. Planting only accelerates establishment; it adds no species, survival, density or spatial habitat mechanism. This run does not establish ecological calibration or forestry realism.

Browser discoverability, charts and controls were outside this player's scope. This is one strategy, not exhaustive validation.

## Follow-up implementation

The two identified teaching gaps were implemented after the playthrough:

- `draftPlan` accepts an optional treatment before it estimates production and truck allocations. Optional commitment-aware mode reserves whole loads within remaining monthly commitments across all trucks; it retains price-per-cycle ranking. Default drafting retains its previous behavior. This is a forecast heuristic, not an optimization guarantee. Sub-payload remainders deliberately require manual dispatch; the draft does not invent partial-load control.
- Annual reports now save an area-weighted managed habitat indicator separately from the full landscape indicator. Management membership remains frozen at annual start. Old histories lacking the new field display an unavailable value and a chart gap rather than reconstructed precision.
- D3 scales and lines drive annual growth/removal and habitat charts. A stand/year calendar shows rest, thinning, final harvest and planting; per-mark titles and a textual history complement colors. These are new Forest Commons teaching views, not claims of exact visual reproduction from FORAC.

Three focused tests pass for treatment-aware projection and retention, aggregate commitment reservation, and habitat subset/legacy validation. Browser checking remains the root task's integration responsibility.
