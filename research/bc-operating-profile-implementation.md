# BC operating profile and responsive workbench

## Purpose and baseline

Implementation patch for `ahzs645/forest-commons`, based on commit
`d6ac13d451aa9aaa2f70e937af4fdf33746c34b0` (17 September 2026).

This is an opt-in educational extension, not a replacement for the existing
Prince George or Québec preset and not a claim of regional calibration. Existing
saves retain their embedded region and have no operating profile injected.

## Implemented

| Recommendation | Implementation |
| --- | --- |
| Meaningfully different BC sites | New ten-site lesson with different authored species, ages, recovery mixes, net treatment areas, volume ranges, access windows and treatment eligibility. Existing source inventory outlines remain unmodified. |
| Inventory versus treatment | Separate inventory, numerical exclusion and net treatment area fields. Net area drives modelled standing volume. No invented exclusion geometry is presented as surveyed. |
| Equipment suitability | Full-tree/CTL eligibility is enforced by settlement and planning validation. Incompatible equipment/treatment combinations are not traded for penalties. |
| Production stages | Falling, extraction, processing and loading capacities provide an explicit bottleneck cap. This is not four independent machine inventories or discrete-event scheduling. |
| Seasonal/vehicle access | Optional road weather restrictions, gross-mass limits, product density, net-mass payload caps, loaded/empty speed factors and per-traversal delays. Road-bearing upgrades cannot override the additional restrictions. |
| Repair duration | The new washout case requires one operating week after paid recovery, using the existing disruption machinery. |
| Product/outlet differentiation | Three fictional receiving yards have different assortment prices and finite ordinary demand. The inspector calls attention to recovery without a selected outlet. |
| Readiness | Shared forecast-only adapter combines rights, permits, terrain, layout prerequisites, equipment, relocation, ordinary receiving capacity and haul routes. It separates harvest and haul checks. |
| Desktop planning | Selected-site readiness/dossier, persistent role controls, map-linked queue dock and exception-first plan review. Existing visual identity is retained. |
| Mobile workflow | Map/Plan/Results/More navigation, map/list switch, expandable nonmodal inspector sheet, larger assignment cards and safe-area-aware controls. Existing classroom unsent-draft navigation guard remains in force. |
| Draft safety | Header Draft plan opens a proposal without mutating the campaign. Current/candidate forecasts can be reviewed; a stale proposal cannot be applied. Other existing advanced advisors retain their own workflows. |
| Debrief | Recorded production, deliveries, source-attributed ledger entries and engine messages are connected by exact site IDs. Shared cash remains unallocated rather than being called block profit. |
| Learning content | New-case chooser and authored lesson steps/planning assumptions in the plan review. Existing full regional scenarios remain available. |
| Obligations versus fieldwork | Separate immutable exercise evidence notes for harvested, secured timber. Notes neither pay reserves nor issue certificates. Current accrued/settled financial provisions are still authoritative. |
| Weak connectivity | Browser offline notice and a list-based workbench for already-loaded data. No claim of offline cold-start or successful classroom submission. |
| Data safety | Optional versioned schema, source/units, complete entity references, finite numeric checks, area/volume reconciliation, save evidence validation and legacy no-profile behavior. |

## Model boundaries

The lesson's forest attributes, net areas, exclusions, access/mass limits, machine
capacities, prices, receiving businesses, soil descriptions and objective targets
are authored values. Volume bounds are input ranges, not confidence intervals or
randomly sampled inventory truth. Only inherited pilot geography has source
provenance. No new BC field dataset or qualified regional review was obtained.

No real rights holder, First Nation, landowner or forestry business is assigned
an invented decision. Upstream rights-holder/land-use prerequisites are explicit
fictional scenario assumptions, not an approval game or a relationship score.
The layout-ready date is an authored operational planning input, not a statutory
approval deadline. The original tenure/stumpage model retains its original
published limitations. This patch does not claim current legal or safety advice.

Crew-chain output is a bottleneck-cap approximation. It does not add shared
loaders, inter-machine buffers, shift calendars, operator fatigue or a machine-
level simulator. Truck limits are an illustrative total gross envelope, not axle,
bridge-engineering, permitted-configuration or hours-of-service compliance.
Routes use the selected full envelope even when a final load may be partial;
there is no optimization that deliberately reduces a load to cross a lighter
bridge. Callers without a vehicle identity use a conservative whole-fleet envelope.
Some existing analytical tools therefore remain conservative rather than having
a fully vehicle-specific optimization model. Authoritative direct dispatch and
its rehearsal use the same new constraints.

The new profile explicitly rejects pooled partner jobs, reciprocal dispatch and
intermill loads because their mixed-cargo mass accounting has not been extended.
Those modes remain available unchanged in the original regional scenarios and
standalone labs. This is a scoped case, not removal of those features.

Linked annual operating windows are explicitly refused for this profile. The
original annual exercise remains available, but evidence carry-forward, changing
net-area/yield definitions and multi-year field obligations have not been coupled
to this new model. The guard prevents silently losing evidence or bypassing the
new constraints through an unsupported annual transition.

Field notes are entered only through the standalone workbench. An authenticated
classroom write command, role-specific UI and concurrent acceptance testing are
still needed before exposing editable notes inside shared classroom rooms.
The patch does not assert complete classroom integration.

French translations are included for the new fixed interface labels. Authored
scenario prose and some existing/dynamic model messages remain English. Complete
bilingual and screen-reader coverage must not be inferred from these additions.

## Verification performed while preparing the patch

- 25 isolated Node tests passed against the actual new operating-rule module and
  modified routing implementation. Tests cover validation, time units, equipment,
  retention, bottlenecks, payload/mass, closures, old-region behavior and evidence.
- Strict TypeScript checking of the standalone pure rule module passed.
- New TypeScript/TSX modules were syntax-transpiled using TypeScript. This is not
  a complete application semantic typecheck.
- Patch syntax and application to exact-source context fixtures were checked.
  Small reconstructed originals were checked against their Git blob hashes.
  A context fixture is not a complete checkout of the repository.

The environment could read GitHub through its connector but could not clone the
repository or install the pinned dependencies. Consequently **the full npm test
suite, application build, server typecheck, new full-season integration tests and
interactive application browser tests were not run here**. The accompanying
verification report gives the exact outcomes; no historical green suite is
presented as a new run.

## Checks to run in a complete checkout

From `forestry-game/`:

```sh
npm ci
npm run test:operations
npm test
npx tsc -p tsconfig.server.json
npm run build
```

The added Vitest integration file covers the real built-in lesson, old/new save
roundtrips, equipment rejection, forecast privacy, twelve turns with cash/material
conservation, evidence reload and the unsupported linked-year guard. It is
included in the normal suite and the new pull-request workflow. Passing those
checks is a merge gate, not an assumption made by this patch.

## Browser acceptance checklist

Test at 390×844 and 430×932 touch emulation; 820×1180 tablet; 1440×900 desktop.
Then repeat the principal journey on a physical phone and desktop browser.

1. With an existing campaign, load the new lesson in Scenario studio and cancel
   confirmation. Check that the old campaign, selected site and save are intact.
   Confirm a new case separately and verify 10 sites / 3 crews / 3 trucks / 3 yards.
2. Select BC05. Confirm that a full-tree crew cannot append its required thinning
   work; select CTL and inspect its retention and bottleneck. Confirm the
   assignment, rehearsal and actual production agree about eligibility.
3. Verify BC01 access restrictions in frozen versus non-frozen conditions and
   vehicle selection at restricted crossings. A bearing upgrade must not bypass
   gross-mass or profile seasonal restrictions.
4. Use map, list, selected-site inspector, role tabs, queue cards and desktop dock.
   Check that externally selected sites update the inspector. Verify no horizontal
   page overflow, reachable sheet controls, keyboard focus and 200% zoom.
5. Open Draft plan and cancel; the saved plan must be identical. Review and apply
   separately. Simulate a state change while the proposal is open and confirm the
   stale-action guard. Review exceptions before running the turn.
6. Complete a season. Inspect report/source-lot accounting, shared cash and financial
   provisions. Export/import through the native file picker and compare results.
   Record an exercise field note after harvest; cash must remain unchanged.
7. Toggle browser offline mode after loading. List/planning views must remain usable
   where data are loaded. Classroom submission must never be inferred from a local
   draft or the browser's network indicator. Cold-start offline is not promised.
8. In Classroom, attempt bottom-navigation departure with an unsent draft. It must
   respect the original guard. Validate role privacy, reconnect and concurrent edits
   independently; a standalone pass does not establish those properties.

## Still needed for the broader review

Regional evidence and forestry/rights-holder co-authorship; real block layouts
and exclusions; locally reviewed rates, recovery and growth; multi-machine resource
queues; comprehensive truck compliance data; shared-load accounting; separate
scale/invoice/receivable clocks; annual lifecycle coupling; complete classroom
and physical-device acceptance; full localization/accessibility audit; offline
cold-start/caching. These are not claimed complete by this patch.
