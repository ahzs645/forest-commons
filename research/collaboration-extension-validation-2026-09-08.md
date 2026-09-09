# Collaboration extension and combined-operation verification

## Fixed/flexible obligations, payment and shadow allocation

Implemented `TransportObligationsLab` and `simulation/transport-obligations.ts` as a separate, bounded two-company teaching optimization. Each company owns one supply and matching-volume demand for a homogeneous divisible product. The input gives four per-m³ transport rates and two own-mill minimums.

- Fixed obligations require all supply to its owner's mill.
- Flexible obligations allow reciprocal equal-volume cross flows while respecting own-mill minimums.
- No-cash exchange requires neither participant's outgoing transport bill to increase.
- Paid exchange uses a zero-sum internal transfer to implement a certified optimal dual allocation.

The primal minimizes transport cost subject to supply, demand, own-mill minimum and nonnegative-flow constraints. A separate dual solve supplies supply/demand potentials and nonnegative own-minimum multipliers. Each company's cost allocation is its resource contribution to the dual objective. The implementation checks nonnegative dual slacks, matching primal/dual objective and each company's standalone-cost upper bound. Artificial bounded potential variables are never accepted without a closing dual certificate.

These are shadow values of the declared continuous transport model. They are not derived from the original four/five-company cost tables or the campaign's discrete fleet routing engine. Both optimal flows and allocations can be nonunique; one certified solution is displayed. The model omits dates, fleet scheduling, heterogeneous timber and quality. It does not mutate campaign physical inventories or cash.

Seven focused tests cover reciprocal flow conservation, unequal volumes, no-cash blocking, mutually beneficial no-cash exchange, fixed/unprofitable routing, individual rationality, strong duality/complementarity over 30 varied cases, degenerate equal/zero rates and invalid obligations.

## Combined full operating campaigns

Two additional tests complete all 24 half-week turns for Québec and Prince George region-based scenarios. Controlled authored overlays guarantee meaningful interaction coverage: two purchased royalty supplies, accessible road bearing, cross-compatible mill locations, processing recipes and byproduct transfer links. These are interaction tests on the regional graphs, not calibration or unmodified baseline performance comparisons.

Each turn checks total forest volume conservation, cash/ledger reconciliation, truck operating-hour limits and save/reload fidelity. The campaigns require nonzero realized royalty charges, balanced reciprocal deliveries, internal byproduct transfers and finished-product sales. Both completed successfully. Initial five-hour crew assignments starved reciprocal dispatch because ordinary processing haul consumed A's stock first; increasing planned crew availability to 20 hours exercised the intended paths. The engine correctly preserved atomic dispatch when stock was insufficient.
