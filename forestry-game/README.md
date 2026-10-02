# Forest Commons

A regional forestry operations game built with **Vite 8, React, TypeScript, MapLibre GL and deck.gl**. The first scenario is **Lac-Saint-Jean, Québec**. A Prince George FSR teaching pilot is also selectable in Scenario studio, using the same simulation engine. Its real FSR/VRI geography is paired with explicitly illustrative operational coefficients.

## Run and verify

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

The development app is served at http://127.0.0.1:5173/. Dependencies are pinned by `package-lock.json`. The map architecture follows PGMaps (direct MapLibre map and interleaved deck.gl `MapboxOverlay`); attribution is retained in `PGMAPS-LICENSE.txt`.

## Play a full season

1. Inspect supply areas on the real map or accessible supply table. Guaranteed timber is owned initially; buy private lots or enter sealed bids for upcoming auctions.
2. Set per-mill, per-assortment commitments in the first week of each month. Targets then lock until the next month.
3. Assign ordered crew stops and their hours, or use **Draft plan** to create a forecast-based starting plan.
4. Schedule truck orders. Each truck uses its actual location, open roads, travel time, handling time, payload and shared inventory. This week's harvest can ship in the same week.
5. Run the week. Review actual weather, closures, resource utilization, routes, stock deterioration and the signed financial ledger.
6. Adapt across all twelve weeks. Monthly settlements and final inventory charges are automatic. Read the season scorecard and compare a subsequent campaign.

The operating screens use one saved campaign; Classroom rooms are separate; the Stewardship screen can link annual management to operating seasons. Export/import JSON saves through the header. **Scenario studio** imports/exports validated regional packages, changes starting cash, selects weather and seeds, and starts a new campaign. Shared-device role mode requires purchase, production and transport readiness. For networked classroom roles, run `FOREST_ALLOW_LOCAL_CREATE=1 npm run server` for local development and open **Classroom**; see [CLASSROOM.md](CLASSROOM.md).

## Interactive operating workspace

The English/French interface separates the immediate task from analysis tools. Production edits one crew queue at a time; Transport edits one truck; Planning, Reports and Collaboration have task tabs. The complete plan remains visible on the map.

- **First delivery guide:** choose a learning site, check timber rights and authorization, assign crews and trucks, rehearse, and review a recorded delivery. Progress follows the campaign; opening the forecast alone does not count as rehearsal.
- **Map queue editing:** select equipment, edit hours or loads, move or remove stops, and undo recent queue edits. Numeric drafts apply on Enter or when leaving the field; Escape restores the saved amount. Restoring a campaign, running a turn or changing other campaign state clears queue undo.
- **Turn readiness and events:** distinguish idle, waiting and productive turns; review revealed disruption choices and repair timing before advancing. These views do not reveal hidden future events.
- **Plan A / B:** save two sets of current operating orders and compare their forecasts without advancing. Applying a plan preserves current cash, rights, stock, bids, commitments and future schedules, and resets role readiness. Changes to campaign conditions invalidate saved alternatives. Drafts are device-local interface data, separate from exported campaign JSON.
- **Turn results and route replay:** see settled deliveries, cash movements, inventory losses and follow-up actions after advancing. Replay recorded route geometry with play, pause, speed and a scrubber. Progress represents geographic distance along each resource's recorded routes, not synchronized operating time. Legacy records without equipment snapshots do not substitute today's fleet positions.
- **Negotiation board:** inspect frozen proposals, changes in offered savings and actual recorded responses. The allocation lab remains available separately. Standalone company responses are shared-device decisions; authenticated classroom roles retain their existing server controls.
- **Recorded year explorer:** select a stewardship year to inspect recorded closing timber, habitat, budget and treatments. It uses annual observations rather than inventing historical stand measurements from the present forest.

The guide and saved alternatives are scoped to the current campaign. Another tab changing the campaign pauses saving and disables alternative application until the latest campaign is restored or reloaded. Browser storage failure is reported while in-memory play remains available.

On 2 October 2026, a twelve-agent team exercised beginner, full-season, phone, French, comparison, negotiation, map queue, BC lesson, replay, save recovery, stewardship and keyboard journeys. Both Québec and the BC lesson completed twelve turns. The pass found and corrected numeric draft handling, historical site-report selection and misleading save status after storage failure; focused browser retests passed. The unit suite passed 521 tests (two skipped), with 25 operations checks, a production build and server type check also passing. The longer analysis, allocation and annual-action screens remain candidates for further interface simplification.

## Implemented operating model

- Québec training scenario: 32 supply areas, seven mill destinations, five assortments, ten crews, ten trucks, three weather schedules and twelve weeks.
- Real OpenStreetMap road geometry around Lac-Saint-Jean, cached from OSRM; synthetic forestry access spurs and stand boundaries are explicitly labelled.
- Dijkstra routing over connected roads; route distance and time drive relocation and haul costs/capacity. Weather restricts road and terrain access independently; road investment improves road bearing only.
- Immediate private supply, guaranteed areas, first-price sealed auctions, seeded rival bids, next-week auction availability and a one-week refusal guarantee. No winning payment is charged twice.
- Multi-stop crew queues, persistent resource positions, relocation time, finite shared standing stock, configurable productivity and retention.
- Ordered truck dispatch, empty and loaded journeys, handling time, shared assortment inventory, monthly demand caps and oldest-stock-first sales.
- Batch-level age/quality: sawlogs and poplar downgrade, expired pulp becomes recorded waste. Standing + roadside + delivered + waste reconciles to original volume.
- Monthly commitments, tolerance bands, bonuses and shortfall penalties; operational, acquisition, storage and terminal charges reconcile to cash.
- Explicit finite partner freight jobs with origins, destinations, contract windows, extra handling/travel, measured independent-versus-pooled trip costs and negotiated savings. No automatic empty-leg credit remains.
- Four/five-company collaboration datasets, full partitions, pair-only/open negotiation rounds, manual allocations, equal/proportional/Shapley/constrained EPM presets, efficiency, individual rationality and subgroup stability. Negotiation state is included in saves.
- Reports, actual-route review, service/profit/emissions/retention metrics, instructor weather schedule, scenario provenance and an in-app field guide.

The one-click draft planner is a greedy forecast heuristic. Planning desk also provides a restricted mixed-integer dispatch reference using the same forecast and crew plan; it is replayed through the engine and does not claim a season optimum. It does not purchase supply for you. Poor targets, product mix, freshness, access or dispatch choices can cause lost service despite positive cash.

## Regional architecture

- `src/simulation/types.ts`: the region package and campaign contract.
- `src/simulation/engine.ts`: pure transitions and planning rules; no Québec names, coordinates, mill IDs or product IDs.
- `src/simulation/routing.ts`: region-independent routing and accessibility.
- `src/simulation/validation.ts`: scenario graph/entity/numeric validation and save consistency checks.
- `src/scenarios/quebec.ts`: first-region geography and educational coefficients.
- `src/data/quebec-road-network.json`: cached public-road legs.
- `src/maps/OperationsMap.tsx`: MapLibre/deck.gl map, layers and route display; loaded separately from the main UI.
- `src/RegionalApp.tsx`: operating screens and shared-device roles.
- `src/CollaborationLab.tsx`, `src/coalition.ts`: negotiation UI and exact subset calculations.

See [REGION-PACKAGES.md](REGION-PACKAGES.md) for adapting another region. The original schematic prototype is preserved outside the app in `../research/prototype-v1/`; it is not imported or shipped. Version 1 saves cannot be faithfully mapped onto a different geographic operating model; imports explain this without silently corrupting them. Early regional v2 saves receive default negotiation state during migration.

## Source fidelity and limitations

This is an original educational implementation informed by the supplied documents and inspected FORAC apps, not a copy of their server-side model. Public roads are real cartography. Mill placements, parcels, forestry roads, capacities, demand, prices, weather, rival bidding and ecological coefficients are training assumptions. Routing geometry was produced by a car-routing service; it is not a certified heavy-truck network. Basemap tiles and fonts require internet; the simulation and cached road graph do not.

The campaign uses its region's currency. The collaboration exercise follows the handouts' **kSEK** convention. Its numbers are not silently converted into campaign money. Proportional savings are not the constrained equal-profit method (EPM), and Shapley does not guarantee core stability.

Source arithmetic correction: the five singleton costs sum to **38,680**; joint cost **35,690** implies savings **2,990**. `CollabEnglish-5companies.xlsx` instead prints 38,690 / 3,000; the handouts agree with the corrected sum. All source files remain unchanged.

The original review is in `../research/forestry-game-review.md`. Completion status and outstanding verification are tracked in `../research/completion-checklist.md`.

## Strategy expansion

The **Planning desk** rehearses the current plan under forecast weather without advancing the campaign, shows assortment supply gaps against remaining commitments, and tracks region-authored season objectives. Rehearsal excludes uncertain auction awards/payments and reports its assumptions explicitly.

Crew stops now select **final harvest or commercial thinning**. The Québec teaching profile for thinning retains at least 65% of original standing volume, multiplies productivity by 0.72, direct harvest cost by 1.12 and disturbance by 0.55. The cap is cumulative across crews and weeks. These are authored teaching coefficients, not calibrated silvicultural prescriptions. Both treatment profiles and learning objectives are optional region data.

The collaboration lab now freezes proposals, records each company's local acceptance or rejection, retains offer history, and requires all companies to accept before recording an agreement. Editing a draft does not rewrite a frozen offer. Standalone acceptance is a shared-device interaction. Classroom rooms enforce separate company credentials for acceptance; neither mode sends external messages.

Older saves keep their original region package. To use the expanded Québec scenario, load **Latest Québec preset** in Scenario studio and start a new campaign. Export an existing campaign first if you want to retain it.

## Browser verification and compact saves

A full twelve-week browser playthrough and desktop/mobile checks were completed on 7 September 2026. Findings and outcomes are in `../research/browser-verification-2026-09-07.md`. The map sizing, hidden file controls, mobile crew layout and oversized full-season autosave defects found in that pass were fixed.

`src/simulation/save-format.ts` deduplicates repeated route coordinates for both autosave and exported campaigns. Imports accept the packed format and legacy v2 game JSON; the game engine still receives the same expanded campaign structure. Oversized or malformed data remains validated at the file boundary.


## Completed expansion mechanics

- **Disruption decisions:** authored road washout, fleet service and mill stoppage; paid recovery or waiting, persistent responses, capacity/route effects and cash ledger entries. The Planning desk reveals each event at its authored time.
- **Procurement:** per-product seasonal delivered margins, demand caps, forecast operating windows and a synthetic rival-bid exposure comparison. Estimates disclose excluded scheduling costs and do not inspect actual future weather or the seed.
- **Optimization:** the EPM linear program enforces every subgroup's core constraint and minimizes relative-savings spread; tests reproduce the published three-company example. Operational reference lanes are limited to four candidates per truck and one full-load lane per truck, with shared stock/demand constraints and a two-second solver limit.
- **Cooperative dispatch:** real partner cargo consumes hours and travel distance; quotes cap compensation, measured trip savings are shared, and economically infeasible pairings are rejected. The comparison is local trip pooling, not a global vehicle-routing optimizer.
- **Classroom:** server-owned rooms, private bids, role permissions, revision conflicts, readiness barrier, company decisions, atomic persistence and reconnect. See CLASSROOM.md for running it and deployment limits.
- **Stewardship:** a separate thirty-year teaching exercise with stand management rights, regeneration delay, planting, treatment cooldown, growth, habitat recovery, annual cash and conserved timber. Coefficients are explicit educational assumptions.
- **Debrief:** actual weekly evidence, guided lesson steps, downloadable instructor Markdown and negotiation CSV.

The server is checked with `npx tsc -p tsconfig.server.json`. Tests include regional migration, conservation, game constraints, published EPM results, finite partner cargo, disruption response, annual state and classroom permission boundaries. See `../research/expansion-workplan.md` for current verification status and `../research/bc-adaptation-package.md` for later regional review requirements.

## Harvest Arena document pass

Production now includes a source-backed site finder: crew, assortment percentage, minimum production rate/eligible volume, destination demand, terrain/road access and relocation filters. Selecting a site opens its map inspector; appending a site uses only that crew's unassigned hours and preserves its existing queue. The two-/four-week access view follows the planning horizons discussed in the supplied Harvest Arena slides.

A rolling forecast repeats the current queues on a copied campaign for two or four weeks, excludes all bids and unrevealed disruptions, and shows harvest, delivery, waste and closing cash. It is a rehearsal under published forecasts, not an optimized future schedule. Production efficiency adds relocation km per 1,000 m³, capacity utilization and disturbance intensity.

Collaboration includes company volume/distance profiles from each handout and **Volume-weighted total cost**. This distributes coalition cost by volume, then computes individual savings; companies can lose and fail the individual-rationality gate. The five-company source's volume rows sum to 795,190 m³ versus its printed 795,200 total. The game uses the rows and explains the discrepancy.

Source mapping: `../research/document-pass-harvest-planning.md`. For the current implementation and acceptance coverage, see the [completion checkpoint](../research/reference-completion-checkpoint-2026-09-08.md). Browser and iOS Simulator checks have since progressed; complete original-game parity and physical-phone testing remain unverified.


### Latest visualization and playthrough pass
Reports now include cumulative deliveries, mill/assortment commitment bands, supply composition, fleet utilization and forecast/observed access. Production includes recorded/current crew allocations. Full original-game visual parity is not complete; see [audit and independent playthrough results](../research/visualization-parity-audit.md).

### React + D3 continuation
The production calendar now saves future weekly crew overrides. D3 powers delivery, production road-class, numerical teaching-weather, procurement, inventory, coalition and annual stewardship views. Reports distinguish recorded history from forecasts and missing legacy data. [Implementation, assumptions and verification](../research/d3-implementation-2026-09-07.md).

### Extended teaching workflows

- **Forest & timber:** paired weather/demand/rival procurement experiments run in a cancellable worker, with D3 cash distributions, uncertainty intervals and result export.
- **Collaboration:** choose two to five companies (up to ten shipments) for a bounded three-week freight case; compare independent and pooled schedules and negotiate the measured savings.
- **Stewardship:** add an explicitly illustrative annual access calendar, select a twelve-week window, and carry forest, rights and cash through linked management years.
- **Classroom:** staged private economics, consented sharing, before/after estimates and authenticated allocation decisions; see [deployment and recovery](deploy/README.md).
- **Scenario studio:** attach regional evidence and reviewer statements, detect changed coefficients, and prepare a BC evidence worksheet. A completed worksheet still requires appropriate local review.

See [implementation and playthrough evidence](../research/remaining-implementation-workplan.md) for outcomes and model boundaries.

## Prince George FSR pilot

The latest preset includes explicit BC tenure, harvest/road authorizations, Crown stumpage and post-harvest financial provisions, plus an illustrative lagged market exercise. See [BC gameplay rules and source boundaries](BC-TENURE.md). New rules apply to new campaigns; older embedded saves retain their original rules.

Choose **Prince George FSR pilot, British Columbia** in Scenario studio, then start a new campaign. The preset has 24 real inventory outlines and 83.2 km of connected mapped Forest Service Roads (7695/01, 7695/02 and 7727/03). Stand volume, species and age come from VRI 2025 (live volume at 17.5 cm). Stands are offered only above the Prince George TSA minimums (140 m³/ha pine-leading, 182 m³/ha others), plans leave at least the TSA's 12.1% median retention, and lot asking prices are ranked by BC's 2010 Interior bid equation. Four secured stands hold less wood than the fleet can move, so which lots to buy is a real, weather-dependent decision. Receiving businesses in Prince George are reached by a labelled teaching connector. Crew, truck, price, speed and weather values now follow published BC sources ([evidence](../research/bc-coefficient-evidence-2026-09-24.md)), recorded as source-identified, not reviewed. Access spurs, harvest rights, demand scale and ecological values remain teaching assumptions. Export the current campaign before replacing it. [Source and complete-campaign verification](../research/prince-george-playable-pilot.md).

Save format 3 deduplicates coordinate pairs across road geometry, stand outlines and historical route sequences without rounding; format 4 also writes consecutive coordinate references as runs. Formats 1–3 and raw regional saves remain readable. This resolves the BC full-season browser storage issue found during playthrough.

## Interactive workflows and mobile play

The Planning desk's Analysis task selector opens one tool at a time and retains its entered settings when switching tools. Supply gaps, current-plan forecasts, deliverability, season outlook, dispatch reference plans and harvest strategies have separate views. Production and Transport keep a compact first-delivery guide and touch/keyboard model glossary. Numeric queue edits apply on Enter or blur; Escape restores the saved value.

The negotiation board previews the exact company groups and savings that publication freezes. It displays balance errors, changed offers and dataset differences before publication. Allocation inputs lead the focused lab; freight pooling and transport obligations live under Operating agreements.

The map offers timber-rights, standing-volume, roadside-stock and terrain-access lenses, with exact values available in its accessible list. Reports separates route replay from Forest changes to keep one map canvas active. Recorded movement buttons seek route distance, not arrival times; named viewpoints are scoped to the campaign and region. Forest changes compares captured end states from a fixed camera, without reconstructing unrecorded starting states.

Stewardship separates Annual forest and Operating seasons. Annual choices can be rehearsed as A/B alternatives before advancing; advancing invalidates drafts from the previous forest and budget. New annual records capture per-stand observations for year comparisons, while older records without those observations stay unavailable. The timber/regeneration illustration represents the teaching model, not measured canopy or scenic visibility.

The Landscape lesson links the PGMaps visual-quality workflow and downloads the selected inventory outline and learner notes as GeoJSON. That outline is labelled as an unreviewed inventory reference, not an assessment cutblock or landform. No official visual-quality rating is inferred from the Commons habitat index or retained timber fraction. BC lot summaries distinguish rights, authorizations and physical access; VRI projections and authored scenario assumptions have separate source labels.

Mobile controls use at least 44px targets and 16px text entry, with safe-area bottom navigation, contained tables and an independently scrolling map inspector. Map rendering caps device pixel ratio at 2. Basemap loading requires the network; loaded simulation, list and planning controls remain usable without basemap tiles. Physical iOS/Android device testing is separate from browser touch emulation.

## GitHub Pages deployment

Publish this `forestry-game` directory as the repository root. The included `.github/workflows/pages.yml` installs pinned dependencies, tests, builds and uploads **only `dist`** to Pages. Select **GitHub Actions** as the repository's Pages source. The workflow derives the repository subpath from Pages configuration; local builds still use `/`. It runs on pushes to `main` and manual dispatch. Research documents outside this directory are not part of the artifact. Do not add credentials or `.forest-rooms` to the repository.

Verify a repository-path production build locally:

```sh
VITE_BASE_PATH=/forest-commons/ VITE_STANDALONE=1 npm run build
npm run preview
```

Open `/forest-commons/` on the preview host. Map equipment SVGs, bundled scenario modules and workers use the build base. Pages is a static host: this default build deliberately shows a standalone Classroom explanation and does not send failing `/api` requests. Local saves, campaigns and scenario tools remain available.

For optional live classroom access, host `server/index.ts` separately with persistent storage, HTTPS, `FOREST_ADMIN_TOKEN`, and `FOREST_ALLOWED_ORIGINS=https://YOUR-ACCOUNT.github.io` (exact origins, comma-separated; no wildcard). Set repository variable `VITE_CLASSROOM_API_URL=https://YOUR-CLASSROOM-HOST` before rebuilding. This value is public configuration, never a token. The API receives bearer credentials in headers; its exact-origin allowlist supports the required preflight without enabling cookie credentials. Origin checks supplement role authentication, they do not replace it. Configure `FOREST_ROOM_HOST` and `FOREST_ROOM_PORT` for the backend host as needed. GitHub Pages does not run that service or store classroom sessions.
