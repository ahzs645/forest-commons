# Bounded cooperative network dispatch lab

This separate teaching lab answers a different question from the campaign's single partner backhaul action: how can multiple companies share finite vehicles across a multiweek freight manifest, and divide the resulting measured cost savings?

It accepts authored/imported company, vehicle, cargo, release/deadline and outside-service quote data. Regional roads, forecast weather and revealed disruptions come from the current campaign. Company ownership, transfer cargo and outside-service prices in the starter case are illustrative assumptions, not claims about real mill operators.

## Solver scope

The admissible policy contains at most three companies, three vehicles, six indivisible shipments and three weeks. A vehicle performs zero, one or two shipments in a week. Its location carries between jobs and weeks; combined travel and handling must fit weekly hours. It returns to its starting depot by the horizon end. Each shipment is served exactly once within its release/deadline window by a payload-capable vehicle, or receives its explicit exogenous outside-service quote. That quote assumes guaranteed outside capacity; no hidden carrier routes are claimed.

Every feasible action sequence in this finite policy is considered. Dynamic dominance pruning keeps the least costly prefix with the same week, location and serviced shipment set. Completed itineraries return to their depot, so only the cheapest itinerary per serviced subset is needed. A binary set-partition model chooses one itinerary per vehicle and exact cover for every shipment. The solver uses no timeout or gap relaxation. A successful result is optimal within this bounded itinerary policy and fastest-open-road routing convention, not an unconstrained global forest transport optimum.

Independent mode restricts each vehicle to its owner's shipments. Pooled mode allows shared assignments. Both use identical cargo, vehicle hours, forecast, deadlines, costs, return rules and outside quotes. Ledger cost is actual empty plus loaded plus terminal-return kilometres times vehicle cost/km, plus all fixed fleet charges and any outside quotes. The solution verifier checks integral vehicle selection and exact cargo cover.

## Negotiation and persistence

A frozen proposal derives company allocated costs from their independent costs minus equal or proportional shares of measured savings. Allocation must conserve the pooled cost and cannot create negative company costs. Every company accepts before an agreement is recorded; rejection closes the offer. This is shared-device teaching consent. It neither changes campaign orders nor impersonates classroom company authorization.

The editable case, frozen run and proposal are saved separately in browser local storage under a region-specific key. Case JSON can be imported/exported; results and decisions can be exported. Solving a modified case clears the old proposal so acceptance cannot silently apply to changed routes.

## Verification

Six focused tests cover exact-cost pooling savings, location continuity/depot return, weekly time/payload capacity, published route availability, exact cargo cover, bounded action count, measured allocation and unanimity. The independent programmatic three-week round served all six regional starter loads: CAD6,285.2176 independent versus CAD5,842.6088 pooled, savings CAD442.6088. All three companies accepted proportional savings. The round replay independently reconciled each vehicle's continuity, deadlines, weekly capacity, unique shipment service and final cost.

Reproduce: `./node_modules/.bin/tsx ../research/playthroughs/operations-network-round.ts` from forestry-game. Evidence: `playthroughs/operations-network-round.json`. Browser interaction remains for the root agent's integrated UI review.
