# Procurement and coalition visualizations — 7 September 2026

Implemented in ProcurementCharts.tsx and CoalitionCharts.tsx, integrated in their corresponding laboratories. D3 scales provide visual encodings; React renders SVG. These are reconstructions of teaching views using current model data, not a claim of pixel-for-pixel parity with the original FORAC applications.

## Exact semantics

- Remaining work: current selected stand remaining volume minus original stand volume times max(global retention, final-treatment retention), floored at zero. Divide by stand baseline m³/hour, mean regional crew productivity factor, final-treatment productivity factor, weather productivity multiplier and eight productive hours per reference crew-day. Wet multiplier 0.8, thaw 0.65; other weather 1, matching the operational engine. Terrain-closed weather has no bar and is named explicitly. This is neither elapsed calendar days nor a fleet duration; excludes relocation, dispatch, resource availability and disruptions. It is explicitly a final-harvest estimate, not the current crew's thinning estimate.
- Terrain composition: sum remaining eligible final-harvest volume across owned stands by the scenario's numeric terrain bearing class. Retention treatment is the same as above.
- Road composition: sum each stored road edge's km once by numeric road bearing class. Includes currently closed edges. Does not imply a route, surveyed soil data, lane-km or public road classification.
- Access summary: procurementWindows() counts remaining forecast weeks with accessible terrain and at least one reachable destination with demand. Existing forecast assumptions and availability constraints remain authoritative.
- Coalition network: equal-angle schematic nodes; edges connect companies currently assigned to the same group. No company locations, route distances or accepted-consent status are inferred.
- Allocation comparison: standalone source cost, allocated cost = standalone minus current proposal savings, and proposed savings. Uses exact selected four-/five-company source costs, preset/custom savings, exercise kSEK. Negative savings remain signed. The existing table immediately below provides accessible values and membership editing; bars have direct labels and SVG accessible descriptions. Procurement plots include expandable value tables.

All charts distinguish declared teaching assumptions from geographic evidence and campaign cash from exercise kSEK. No browser inspection was performed by this subagent.
