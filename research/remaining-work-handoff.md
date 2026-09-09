# Forest Commons — remaining work

Gameplay status at the end of the 8 September 2026 work batch. Repository setup was subsequently authorized separately. Prepared from the current acceptance matrix, final completion checkpoint and deployment instructions. This is a documentation handoff, not a restart of implementation. The persistent goal is blocked following the user's request to stop.

## What is already there

The game has regional Québec and BC maps, map-based planning, procurement and auctions, harvesting and bucking, hauling, mill processing and by-product transfers, contracts, reciprocal collaboration, finance, teaching exercises, planning advisors, variable turn durations and private classroom roles. Several complete standalone and classroom campaigns have been played through. These should not be reimplemented from the historical backlog's older “missing” descriptions.

Latest recorded verification: **432 tests passed, 2 optional tests skipped across 124 files**; production build and server TypeScript check passed. A separate optional daily suite previously passed five tests, including both 84-turn regional campaigns. These are recorded results from the last batch, not a fresh rerun for this document. The production build still reports a large-chunk advisory.

Most remaining work is broader acceptance, fixes discovered during that acceptance, regional validation and publishing. Complete reference parity and complete language/device coverage are not established. There is no defensible percentage-complete estimate from the test count.

## Recommended order

1. Finish the combined gameplay and classroom acceptance scenarios below, fixing demonstrated failures.
2. Complete mobile, keyboard, bilingual and file-roundtrip checks on those same scenarios.
3. Review populated original games and close the resulting documented differences.
4. Publish a standalone GitHub Pages pilot once a destination repository is selected.
5. Validate regional coefficients and deploy the classroom backend before describing the product as regionally calibrated or ready for a live hosted class.

Original-game access and regional evidence collection can proceed alongside local acceptance. They do not prevent the remaining local checks or an explicitly educational standalone pilot.

## 1. Gameplay and classroom acceptance still open

“Acceptance” here means exercise the real interface through the relevant settlement and reload, not merely show that its screen renders. All scenarios must preserve cash/material accounting and classroom ownership/privacy where applicable.

| Area / backlog IDs | Specific remaining work | Evidence needed to close it |
|---|---|---|
| Map planning and icons — V3/V4/M1/M4 | Combined filters → selected feature → queue editing in every role and mobile layout; all overlays on light/dark maps and with keyboard/touch. | Correct linked selection, readable symbols/legend and status, usable overlapping resources, queues matching the selected supply/destination, and no hidden-data disclosure. |
| Fleet positioning — M2 | Complete multi-role positioning workflow. Standalone French paid movement, allowance and reload already checked. | Authorized role moves equipment, cost/allowance updates, other roles see only permitted information, reload preserves position, and start lock prevents later free repositioning. |
| Bucking/recovery — M3 | Classroom and mobile variants. Standalone Québec pulp-priority actual outputs already checked. | Submit a recovery choice, settle actual production, reconcile product volumes and retain the choice after reload. |
| Finance — E1 | Linked-year finance in the browser. | Carry royalty obligations, interest/credit and terminal accounting across the year boundary and reload; explain ledger changes without double charging. Basic linked-year transition and automated royalty carry are already covered. |
| Contracts — E2/C5 | A mixed strategy with partially delivered and fulfilled repeated obligations. | Independent deadline outcomes, penalties and receipts agree with physical shipments, including reload. Reciprocal renewal consent and renewed shipments already have browser evidence. |
| Procurement — E3 | Classroom royalty and credit variants. | Purchase-role submission, budget/credit validation, award/refusal accounting, readiness, settlement and reconnect work together. Default upfront classroom win/loss/refund already verified. |
| Realized results — E4 | Representative export/re-import and physical-touch evidence drill-down. | Imported results preserve lot contributions, unallocated costs and reservation evidence; touch opens and reads the same supporting records. |
| Auction disclosure — E5 | Detailed instructor future-geometry comparison. | Instructor sees authorized future geometry; player views and advice obey reveal boundaries. Four-role quantity disclosure and reconnect already verified. |
| Classroom synchronization — C1 | Broader concurrent response/revision races. | Concurrent edits, stale responses, reconnects and readiness transitions cannot overwrite newer plans, leak private plans or settle a turn twice. |
| Reciprocal operations — C4 | Positive and asymmetric participant-benefit scenarios; mobile variants. | Actual shipments and own-mill service reconcile with each participant's benefit under fixed/flexible and paid/no-cash terms. Existing full campaigns cover fixed service and a flexible no-cash shortfall case, not every economic outcome. |
| Mill processing — P1 | A complete classroom processing season and active mobile variants. | Purchase/production/transport/instructor agree through a full season, including intake, conversion, residues, transfers, sales and endgame reload. Full BC standalone processing and a shorter four-role classroom chain already verified. |
| Planning advisor — O1 | Royalty and credit acquisition/application variants. | Solve, inspect financing assumptions, apply, settle and reload; stale or unaffordable advice cannot be applied. No-purchase and upfront private acquisition journeys already verified. |
| Uncertainty experiments — O2 | Broader regional/financing/settings variants and native export/re-import. | Paired trial counts, failures and unavailable baselines remain intelligible; recommendation application and imported evidence agree. Q21 asking-price application, stale disabling and reload are already verified. |
| Turn duration — L2 | Remaining role/region combinations. | Capacities, aging, costs, deadlines and labels remain consistent. Full default Québec half-week, quarter-week and daily browser campaigns already verified; do not repeat them as wholly missing features. |
| Region portability — R1 | Imported-region browser journey through new labs and contracts. | Alternate IDs, products, fleet/mill counts and calendars work through selection, planning, settlement and reload without hardcoded Québec/BC assumptions. |

For each journey, record the fixture, region, role, duration, language, viewport/device, actions, actual result and limitations in the checkpoint. Fix concrete failures and rerun affected checks; do not use another aggregate green suite as a substitute for the missing journey.

## 2. Interface, languages, teaching and devices

- **French/English coverage (L1):** audit all built-in controls, validation errors, statuses, product/equipment labels, result explanations and exports across roles and modes. Existing translated screens do not prove complete coverage. Imported scenario prose remains authored content.
- **Real phones (Q2):** physical-device touch playthroughs remain. Narrow browser and Safari Simulator checks already exist, including many 44px controls, but do not establish hardware touch, scrolling and full mobile workflows.
- **Teaching packets (C2/C7):** source-specific packets and populated PDFs have been reviewed. Physical printing, browser file re-import and the complete learner handoff remain unverified. Compare printed/downloaded records with the relevant scenario and debrief.
- **Save/export roundtrips (E4/O2/Q2):** use the native supported browser file workflow to export, re-import and compare meaningful state/results. Prior file-picker restrictions must not be bypassed.
- **Loading/error behavior and performance:** retain checks during the remaining journeys. The current large-bundle warning is a performance follow-up, not evidence of broken gameplay; profile loading on the intended devices before deciding what to split.

## 3. Original-game reference coverage

| Reference | Already observed | Still needed |
|---|---|---|
| Virtual Wood Supply Arena | Purchase, production, transport, targets, administrator views and empty endgame. | A populated campaign's results, flows, KPI units/denominators and benchmark presentation; compare meaningful differences with Forest Commons. |
| Harvest Arena | Administrator weather/demand setup. | Populated player planning, scheduling, bucking, fleet/map interactions, targets and final results. |
| Original mobile behavior | No complete verified playthrough. | Observe available original mobile interactions if reference comparison requires them; distinguish observed behavior from assumptions. |

Access to an appropriate populated reference session is required. Earlier successful authentication does not prove access is available now. Inventory confirmed differences and implement useful missing behaviors, preserving the regional architecture. Do not claim knowledge of inaccessible original backend algorithms.

The current advisor is a **bounded full-horizon policy/acquisition comparison**, and the transport/allocation labs have declared mathematical scopes. They are not a globally optimal campaign solver or a verified reproduction of an undisclosed research optimizer. Exact optimization equivalence remains unproven; obtaining the formal model and defining a matching benchmark would be additional substantive work if that level of parity is required.

## 4. British Columbia realism

Real FSR/VRI geometry, tenure/authorization/obligation mechanics and a market-timing exercise exist. **Geometry alone does not calibrate operations.**

Remaining work is to obtain qualified regional evidence, document coefficient provenance/units/applicability, and validate operational assumptions against it. Review productivity, travel/access, recovery and economic assumptions as applicable to the scenario. Update coefficients with evidence and rerun affected regional campaigns. Do not label illustrative values as surveyed, calibrated or suitable for operational forestry decisions.

See [BC tenure model](../forestry-game/BC-TENURE.md). This is an external evidence/review dependency, not a reason to rebuild the map or discard the educational model.

## 5. Publishing and live classroom delivery

**GitHub Pages standalone pilot**

- Repository created: private `ahzs645/forest-commons`. Pages Actions configured; deployment verification is recorded in the repository README.
- The root Pages workflow now builds from the `forestry-game/` subdirectory.
- Completed: Pages through Actions at `https://projects.ahmadjalil.com/forest-commons/`; HTTPS and repository-path assets verified.
- Published map and study worker verified. Broader deployed campaign settlement/reload acceptance remains.
- Publish only the intended application artifacts; keep room data, credentials and backups out of the repository/site.

**Live classroom**

GitHub Pages alone cannot run the classroom server. Select a separate backend host and, where required, a domain. Configure the API endpoint, administrator credential, durable room storage and HTTPS; rehearse restart, backup/restore and multi-role reconnect on that deployment. Local container checks do not prove public TLS or production persistence. See [deployment instructions](../forestry-game/deploy/README.md).

## Decisions or access eventually needed

1. GitHub destination resolved: `ahzs645/forest-commons`; preserve private source visibility.
2. Populated original-game access for the unverified reference workflows.
3. Physical phones and the native file/print workflow for device acceptance.
4. Qualified BC coefficient sources/reviewer for calibration claims.
5. Backend hosting destination for live classroom use.

These are not requests to restart the goal now. All completed changes remain in place. The goal is stopped pending an explicit resume request; this handoff documents unfinished scope without claiming the game is complete.

## Evidence index

- [Current acceptance matrix](current-acceptance-matrix-2026-09-08.md): current coverage by backlog ID.
- [Completion checkpoint](reference-completion-checkpoint-2026-09-08.md): chronological observations and limitations.
- [Original complete backlog](complete-backlog-2026-09-08.md): scope history; old missing-feature statements are superseded.
- Last full test log: `/tmp/forest-acceptance-current.log`.
- Last build/server typecheck log: `/tmp/forest-current-final-build.log`.

Temporary logs may not survive machine cleanup; the repository documents preserve the recorded outcome, but a later implementation batch should rerun checks appropriate to its changes.
