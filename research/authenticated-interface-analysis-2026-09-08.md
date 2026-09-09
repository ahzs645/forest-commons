# Authenticated original-game interface analysis — 8 September 2026

## Scope and evidence

Read-only root-browser inspection of authenticated Virtual Wood Supply Arena player and administrator tabs, and Harvest Arena administrator setup. Two agents compared instructor features against local code. No purchases, assignments, settings, readiness submissions or week advances were made. Earlier failed-login reports are historical: the original root tabs are now authenticated; separate agent tabs did not inherit their state.

This is interface evidence, not a validation of original simulation algorithms. The player is at week 1 with empty plans; populated campaign results, Harvest player interactions and mobile behavior remain unverified. A Harvest Results click did not produce a verified results view. General KPI containers were blank in the observed state; this is not evidence that the game lacks charts.

## Screens inspected

| Screen | Direct observations | Adaptation for Forest Commons |
|---|---|---|
| Supply targets | Coordinated purchase, production and transport target/availability charts; bank and roadside stock; mill demand; resource capacity; assortment selectors; patterned mill series | Put planned and available quantities beside demand, using one product/zone selection across views |
| Purchase | Dominant regional map; sortable market table; irregular stand polygons; thinning/final-cut legend; bank/planned markers; purchase-target chart; four-week North/South weather strip | A map-linked market workbench, rather than requiring navigation away from the selected stand |
| Production | E01–E10 equipment symbols; crew-by-week schedule at 160 hours/week; production-target chart; planned purchase/transport states; weather and role-KPI entry | Keep queue/timeline and forecast capacity visible beside the map; retain our regional capacity definitions rather than hardcoding 160 |
| Transport | T01–T10 truck symbols and utilization percentages; roadside-stock table with site, supply area, road access and five products; selected-flow and accessible-only filters; transport targets | Link truck, origin stock, destination and product; distinguish forecast terrain access from a reachable, capacity-feasible route |
| General KPIs | Roadside stock development container; target metric tabs Purchase, Production, Transport, Mill delivery; observed plots blank | Provide explicit no-history states with instructions instead of empty panels |
| Supply results | Monthly mill×product delivery table; demand/delivery/percent modes; tolerance/bonus explanation; purchase-bank and roadside averages by saw/pulp; crew hours/relocation km; truck hours/distance; player/optimal tabs; CSV menu | Reconcile every metric with ledger records; expose denominator and period; label unavailable benchmarks |
| Supply admin setup | Weather preset; annual North/South access strip labelled 1–53; start marker; 12-week duration; tolerance10%; bonus3 CAD/m³; initial-target checkbox | Compact instructor settings with a scenario preview; explicitly define calendar conventions |
| Supply group progression | Four groups with week, target-set status, role-colored player columns, time left, Add and remove controls | Live multi-group instructor roster and readiness monitoring; local imported comparisons are a different capability |
| Harvest admin | Forecast and actual weather selectors; paired Outer/Mid/Inner rows over 52 weeks; start13; thaw/wet/normal/winter categories; demand-change preset | Paired instructor weather matrix, campaign window and demand-change preview; future actuals stay private |

## Interface conclusions

The original supply game is organized around the decision currently being made. The map remains dominant, while the right panel changes with the role. A compact lower strip supplies legend, pinned information and access forecasts. Forest Commons already has a map inspector, entity search, purchase action, crew queue and reservations in `src/MapWorkspace.tsx`, plus specialist planning screens. The gap is coordinated presentation and shared selection, not the absence of every underlying mechanic.

Its icons form a consistent vocabulary: harvester for production, loaded truck for transport, log/pulp and board/saw symbols for assortments, and distinct mill patterns. Product selection repeats across charts. Our mill/harvester/truck SVG map symbols are a useful start; product symbols and explicit idle/planned/blocked/completed states still need the same consistency across map, queue, chart and legend. Use original artwork with text labels and non-color cues.

The original map uses subdued geography and stronger operational symbols. Preserve real road and stand geometry in our map. Improve line rendering, zoom-dependent width and contrast without smoothing away meaningful road bends or implying schematic fleet offsets are true positions.

The original desktop layout is extremely dense. Small controls, hover-dependent information and spacebar pinning should become click/tap selection with an explicit pin control and keyboard focus. On narrow screens, keep the map with a resizable bottom sheet and role tabs; show one detail panel at a time. This is a proposed adaptation, not a claim of completed mobile verification.

The result screen already exposes useful teaching distinctions: standing purchase bank versus roadside stock, crew relocation versus productive capacity, monthly service versus total deliveries. It also showed `NaN km` for an empty distance average and unavailable optimal values. Our empty states should show “No trips yet” or “Benchmark unavailable,” never invented zero performance or a divide-by-zero result. Observed zero values do not establish original scoring denominators or optimizer behavior.

## Prioritized implementation and acceptance

1. **Map role workbench (M1).** Extend MapWorkspace/PlanningDesk with purchase, production and transport tabs; shared stand/resource/product selection; compact target–plan–available–delivered comparison. Selecting a row highlights the map, and selecting a map feature reveals its row. Filters persist across role changes and have visible reset controls.
2. **Operational symbols (V3/V4).** Extend OperationsMap and charts with regional product pictograms, status badges and matching legends. All symbols have accessible names and touch-sized targets; overlapping resources remain individually selectable.
3. **Feasible supply view (M4).** Add product/zone and selected-flow filters. Explain closures, relocation, roadside availability, truck time and mill receiving capacity separately. Use revealed/forecast information only.
4. **Instructor scenario preview.** SeasonBuilder should expose scoring tolerance/bonus and initial-target mode where supported, plus forecast/actual categorical rows and an explicit campaign window. Demand presets show destination, product, effective period and quantity before applying. Region IDs and calendars remain data-driven.
5. **Live cohort monitor.** Classroom/server need a multi-room instructor roster with role occupancy, target/readiness state and progression. TeamComparison imports remain useful for debrief, but cannot substitute for live monitoring. Timed sessions require explicit server rules, not a cosmetic countdown.
6. **Results clarity (O3).** Debrief should reconcile stock averages, service, hours, relocation, haul distance and bonus by period/product. Explain denominator and missing reference data; exports match displayed values. A populated original campaign is still needed for deeper parity verification.
7. **Interaction verification (Q2).** Test keyboard selection, tap pinning, sheet navigation, queue reorder, filter reset and map resize at narrow widths. Confirm no hidden future weather leaks into player previews or advice.

## Supporting reviews

- supply-admin-interface-audit-2026-09-08.md — independent local instructor comparison, with root-observed original evidence attributed.
- harvest-authenticated-interface-audit-2026-09-08.md — paired-weather and demand-preset comparison.
- complete-backlog-2026-09-08.md — implementation queue; this review does not mark unimplemented mechanics complete.
