# Forest Commons gameplay design

The educational goal is to make consequences legible: a cheap lot is not automatically useful supply, high harvest is not automatically service, and a profitable partnership is not automatically acceptable to every company.

## Working additions in this pass

**A decision before every week.** The Planning desk runs the current orders against forecast weather on a copied game state. Players see expected harvest, delivery, remaining-week cash and waste, then inspect dispatch constraints. Actual simulation remains a separate action. Auction uncertainty is excluded rather than presented as a known win.

**A choice within a stand.** Commercial thinning trades lower productivity and higher direct cost for more retained standing volume and a lower modelled disturbance factor. Its cumulative cap cannot be reset by assigning another crew or waiting a week. Final harvest can subsequently access the remaining eligible volume. Treatment profiles are regional data. No tree regrowth is fabricated during a twelve-week season.

**A reason to manage more than cash.** The Québec preset now asks learners to deliver 50,000 m³, achieve 60% of settled commitments, keep expired volume below 8% of harvest and finish with nonnegative profit. These are explicit teaching challenges, not forestry benchmarks. Instructor-authored regional objectives can replace them.

**A negotiation that ends in a decision.** Proposals freeze the current partition and savings allocation. Each company records acceptance or rejection; every acceptance is required for an agreement. New offers supersede open offers and retain history. Efficiency and individual rationality gate submission; instability remains visible so learners can debate rather than be forced into a single preset.

## Implemented expansion — 7 September 2026

1. **Disruption decisions:** dated road, fleet and mill closures now affect simulation. Paid recovery or waiting records a response; repairs consume uncommitted cash and restore service after an explicit delay. Rerouting uses the remaining road graph.
2. **Procurement appraisal:** seasonal per-product margin, demand caps, forecast operating windows and synthetic bid exposure. Capacity, deadline and omitted cost limits are shown explicitly; estimates do not inspect actual future weather or the seed.
3. **Optimization lesson:** a constrained EPM solver with published-fixture and all-subset core tests. A restricted mixed-integer dispatch reference holds the learner's crew plan/forecast fixed and replays its feasible queues through the engine; it does not claim a season optimum.
4. **Cooperative dispatch:** separate finite partner cargo, origins/destinations, contract windows, actual travel and handling. Independent versus pooled trip costs determine measured savings; negotiated payment is capped by the quote. No automatic empty-leg credit remains. A global vehicle-routing optimizer remains beyond this local pooling model.
5. **Classroom multiplayer:** server-owned rooms, assigned role credentials, private bids, permission checks, revision conflicts, persisted plans, reconnect and instructor readiness barrier. Company acceptance is restricted to that company's credential. Standalone acceptance remains shared-device only.
6. **Longer stewardship:** a separate annual exercise snapshots the forest, tracks management rights, regeneration lag, planting, treatment cooldown, growth, habitat recovery, budget and timber conservation. Current parameters are illustrative, not ecological calibration.

See `expansion-verification-2026-09-07.md` for test and browser evidence. BC calibration and public hosting are later stages.

## Regional adaptation rule

Keep generic transitions in the engine and regional meaning in data: products, treatment options, road restrictions, sites, destinations, demand, weather, events and objectives. Geography should be licensed and geographically plausible; commercial and ecological training assumptions should be labelled. BC comes after the Québec mechanisms are coherent, with local parameter review rather than replacing place labels alone.

## Debrief prompts

- Which commitment failed because of insufficient timber, and which failed because the timber could not reach the mill in time?
- Did thinning improve your stewardship result enough to justify its cost and reduced output?
- How much inventory lost value while trucks served a more profitable assortment?
- Which forecast error changed your plan, and what reserve capacity would have helped?
- Could any subgroup improve on the agreement it accepted? Why did companies accept anyway?
- Which outcome would change if the same plan ran in a region with different products, seasonal access and distances?
