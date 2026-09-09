# Forest Commons completion contract

> Status clarification (2026-09-07): checked items below describe the implemented baseline, not full source-game parity or completion of all later design requests. The current evidence and remaining work are in [visualization-parity-audit.md](visualization-parity-audit.md). Latest verification: 78 tests passed sequentially; production build and server types passed; focused desktop/mobile D3 chart and future-schedule persistence checks passed. Future weekly order editing, the annual history calendar and the listed chart capabilities have since been implemented in the [React + D3 pass](d3-implementation-2026-09-07.md). Meteorological/source-data fidelity and broader optimization/deployment limits remain explicit there.

Active goal: complete an integrated forestry operations game, using the PGMaps mapping stack, with Quebec as the first geographic setting. British Columbia is a later regional adaptation. Regional geography and parameters must be data; the simulation must not depend on place names, coordinates or a fixed list of mills.

## Required functional scope

- [x] Regional scenario schema: geography, road network, assortments, stands, mills, fleets, time horizon, demand, weather and economic parameters.
- [x] MapLibre GL + CARTO basemap and deck.gl overlay pattern from PGMaps; real Quebec map, selectable stand areas, mills, roads, crew and truck routes, layer controls, useful hover/selection details and zoom-to-plan.
- [x] Geographic routing used by the engine: connected road network, measured route distance and travel time, separate forest-road accessibility, unreachable-route handling.
- [x] Purchasing: owned/guaranteed supply, timber auctions with next-round availability, private supply, budget commitments, cancellation, result reporting and a refusal guarantee.
- [x] Production: configurable crews, multi-week ordered stand queues, capacity and relocation time, remaining volume, retention, terrain accessibility, assortment output and completion events.
- [x] Transport: configurable trucks, actual source/destination paths, stock by assortment, loading/travel/unloading capacity, road restrictions and no duplicate shipment.
- [x] Inventory: standing/roadside/delivered mass balance, stock age and quality consequences, terminal inventory treatment.
- [x] Monthly targets: configurable per-mill/assortment commitments, planning targets across roles, bonuses/penalties and changed demand.
- [x] Weather: regional zones, forecast versus actual, seasonal access windows and deterministic scenario seeds for replay.
- [x] Collaboration: complete coalition partition, no duplicate membership, negotiated allocation, efficiency/individual rationality/core checks, allocation presets and operational coordination effects explicitly modelled.
- [x] Full campaign loop: progress gates, reports, debits/credits ledger, resource/environment metrics, endgame scorecard and meaningful replay comparison.
- [x] Instructor/scenario setup and role-oriented operation; supported play mode explicit and functional.
- [x] Scenario import/export and save migration with validation, resilient persistence, tutorial and provenance.
- [x] Unit/integration invariants, complete campaigns across scenario settings, browser end-to-end flows and responsive map verification.

## Regional separation

The first setting follows the supplied Quebec supply-chain materials. PGMaps contributes map technology, not its Prince George scenario. Simulated commercial entities and educational parameters must be distinguished from real cartography. The framework must permit adding BC through a validated scenario package rather than edits to simulation logic.

## Completion discipline

Do not mark the active goal complete merely because the map renders or a prototype runs. Track implemented and verified items here, record material gaps, and continue until the required operating model is coherent and complete.

## Verification checkpoint · 2026-09-07

Implemented the regional v2 app and moved the unused schematic prototype to `research/prototype-v1/`. The app is served at http://127.0.0.1:5173/ (HTTP 200). TypeScript and the Vite 8 production build pass. The map module is loaded separately; its approximately 485 kB gzip bundle still triggers Vite's size advisory.

**23 current tests pass** (20 regional engine/scenario tests and 3 coalition tests). They cover all three 12-week weather campaigns with per-week stock/cash reconciliation and save roundtrips, a shorter renamed region with a renamed product, reproducible auctions, private purchase/refusal/upgrades, shared crew/truck stock, aging/waste, role readiness, commitments, saved negotiations and corrupted imports.

The map implementation uses MapLibre GL with CARTO styles, an interleaved deck.gl overlay, real cached Quebec trunk-road geometry, modelled access roads, supply polygons, mill/fleet markers, plan and historical routes, layer switches and fit controls. Weekly snapshots preserve historical inventory, resource positions and road upgrades. These changes **have not yet received the required browser verification**.

CUA was attempted three times during this work turn and returned: “The Mac is locked and automatic unlock could not unlock it.” Manual device unlock is needed before testing browser controls and responsive rendering. This is an external verification blocker, not a completed goal. The goal remains active.

Next browser pass: load/reload local app; confirm basemap/overlays and console; select areas; private purchase and auction bid; edit crew/haul queues; targets and role readiness; run weeks and inspect historical maps; verify coalition partition/manual allocations persist; export/import/new campaign; complete a UI season; verify desktop and 390px layouts. Fix anything found before closing the goal.

Version 1 prototype saves are retained separately and explicitly rejected by the new importer because their schematic assets cannot be faithfully mapped onto the new region. Early regional v2 saves migrate default negotiation fields. No networked multiplayer or actual BC data package is claimed.

## Continuation audit · 2026-09-07

Previous goal turn: progress (regional implementation and verified campaigns). Browser access was rechecked in the next goal turn; the Mac remains locked. Independent save review found and fixed missing mill target records and duplicate historical stand snapshots being accepted on import. Monthly commitment equality now compares values rather than JSON key order. Two regression tests added: **25 tests pass**, and the production build passes. Browser verification remains outstanding; this is the second consecutive goal turn encountering the same lock condition.

Third consecutive goal-turn lock audit: the previous turn made progress through save-validation fixes and passing regression checks. CUA was rechecked now and still reports the Mac is locked and cannot be automatically unlocked. Remaining browser and responsive-map verification cannot proceed without manual unlock. Goal marked blocked, not complete; resume the documented browser pass after unlock.

## Gameplay continuation requested by user

The user explicitly asked to continue ideas and game parts independently of browser testing. Added functional regional treatment profiles (thinning/final harvest), cumulative treatment retention, a forecast rehearsal and supply-gap Planning desk, region-authored learning objectives, and saved negotiation offers with unanimous local acceptance/rejection/history. A latest-preset studio action preserves existing campaign parameters while allowing an updated scenario to be selected for a new campaign. Current strategy additions compile and six new behavioral checks pass alongside the previous 25 checks (31 total before the final small preset UI change). Browser verification is still separate and outstanding; it is not a reason to treat design extensions as impossible. Further scoped ideas and debrief questions are in `research/game-design-next.md`.

## Browser verification completed · 2026-09-07

The device became available. A complete twelve-week browser playthrough, map picking/layers, mobile planning layouts, procurement/refusal, role readiness, negotiations, report replay, regional import, save import and reload were verified. Browser testing found and fixed zero-height map CSS, exposed hidden inputs, mobile treatment overflow and full-season localStorage exhaustion. Route deduplication now preserves the completed season across reload. Production build and 33 automated checks pass. See `research/browser-verification-2026-09-07.md` for authoritative workflow evidence, outcomes and remaining product boundaries. Earlier lock checkpoints are historical, not the current verification state.
