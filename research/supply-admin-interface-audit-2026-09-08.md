# Supply administrator interface audit — 8 September 2026

## Current evidence boundary

The parent reviewer has an authenticated VWSA administrator tab at `MainAdmin.aspx`. That existing Chrome tab could not be transferred into this subagent's browser session: the tool reported it already belonged to the parent's session. This is a tab-ownership boundary, not a credential rejection.

A reviewer-owned Chrome tab (136852553) was opened at the exact verified administrator URL. It displayed only the shell: game-name text field, player-password text field, and an empty weather selector. A screenshot clipped below the credential fields showed the rest of the viewport blank. No group dashboard, progression controls or charts appeared in this cloned tab. Authentication or selected-game context apparently did not carry into the new tab; the storage mechanism was not inspected and is not established.

No credentials were printed or captured in screenshots. No settings, game state, groups, accounts or passwords were changed. No login or reset was attempted. The reviewer-owned tab was marked for handoff.

This independent inspection therefore does **not** claim a complete authenticated administrator visual audit. Parent-captured authenticated evidence can supplement this report without attributing it to this subagent's direct observation. Earlier wrong-password results are historical and are not the current parent administrator-access condition.

## Verified local instructor UI

Read `forestry-game/src/Classroom.tsx` and `forestry-game/src/TeamComparison.tsx`.

- Create an instructor room from the selected region; join/rejoin by room credential; offline instructor recovery.
- Room identity, elapsed week, cash, revision and three-role ready/planning text.
- Role invitation or credential replacement; instructor advance is disabled until all operational roles are ready.
- Disruption responses, EPM grand-coalition proposal and company acceptance flows.
- Room audit trail with time, role and action.
- Comparison board imports saves/compact result packets and persists in browser local storage. It explicitly describes itself as self-reported and not a shared roster.

## Source-informed comparisons requiring populated administrator verification

The prior 7 September review reports multiple groups, add-group control, progression, delivery tolerance/bonus and weather scenario settings. These are previous-session findings, not freshly reconfirmed from this clone.

| Candidate improvement | Current local situation | Acceptance criteria |
| --- | --- | --- |
| Live multi-group instructor overview | Single active room connection; separate local packet comparison | Instructor can see authorized groups together with month/week, purchasing/production/transport readiness, latest activity and completion. A group selection opens its existing room. No credentials or private bids appear in aggregate rows. |
| Visible simulation phase | Week/revision/readiness are text | Distinguish monthly target coordination, weekly role planning, resolution and completed debrief. Status badges have labels and do not depend on color alone. |
| Setup versus live operation separation | Scenario studio configures region; classroom operates room | Display immutable scenario summary and units beside current-room controls. Changes that would invalidate comparison must create/version a new scenario rather than silently rewriting historical results. |
| Forecast scenario preview | Local weather charts and authored scenarios exist | Instructor preview identifies forecast versus actual, climate zone, selected weather pattern and reveal policy. Participant snapshots never leak future actuals. |
| Group progress charts | Imported packet board is not server-live | If live charts are added, label source and refresh time; distinguish current totals, monthly commitments and final score. Partial groups remain visibly incomplete and incomparable runs are not ranked together. |
| Semantic icons | Generic navigation icons; readiness primarily text | Use original icons for group, role, planning, ready, locked, paused and complete. Pair each with text/tooltips; preserve touch and keyboard access. Do not infer original icon meanings from appearance alone. |

## Remaining direct review checklist

Obtain the populated authenticated administrator tab's credential-free screenshots or accessible labels. Inventory navigation, group rows, progression buttons, weather selector options, target/bonus/tolerance controls, demand changes, export/benchmark tools and any harmless preview. Do not change selections that auto-save. Document disabled/enabled states and current phase. Distinguish controls merely visible from behavior actually exercised; preserve the current campaign throughout.

## Authenticated evidence supplied by parent reviewer

The following was **directly observed by the parent/root reviewer in the populated authenticated administrator tab**, then provided to this independent reviewer. It supersedes the unverified status of these specific controls above. This subagent did not independently click them or inspect their screenshots.

| Authenticated control / visual | Observed state | Local comparison and priority |
| --- | --- | --- |
| Gear sidebar icon | Game setup | Local scenario authoring exists. Use an original labelled settings icon and distinguish setup from live classroom operation; low priority visual alignment. |
| People sidebar icon | Groups progression | Local Classroom operates one room and packet comparison is local, not a live group dashboard. **P1:** authenticated multi-group readiness/progression overview remains a substantive gap. |
| Flags sidebar icon | End of game results | Local debrief and comparison exist. **P2:** dedicated instructor results entry with group completion state; original result content remains unverified, so do not claim metric/benchmark parity. |
| Question-mark sidebar icon | Help | Local teaching material/lessons exist. **P2:** contextual help should explain the active instructor screen, units and phase; navigation icon alone is not instructional parity. |
| Weather preset | Warm wet | Local Scenario Studio has a weather schedule selector. Existing capability; compare scenario meaning/provenance rather than merely duplicate the label. |
| Annual categorical access strip | North and South, weeks numbered 1–53; starting week 5 circled | Local WeatherCharts draws numerical/illustrative curves with a 52-week calendar and campaign-window toggle, while instructor weather schedule is tabular. **P1:** add an accessible zone × calendar-week categorical access overview with highlighted start/window. Resolve the source's week-53 convention explicitly; do not silently map week53 onto a 52-week regional calendar. |
| Delivery fulfillment tolerance slider | 10% | Local economy already has `tolerance`, engine scoring uses it and monthly commitments display it. No dedicated tolerance editor was found in Scenario Studio. **P1:** expose bounded percentage configuration before campaign creation, validate finite range, persist in region fingerprint, and show its resulting scoring rule. |
| Delivery bonus slider | 3 CAD/m³ | Local economy already has `bonusPerM3`, settlement pays it and commitments display it. No dedicated bonus editor was found in Scenario Studio. **P1:** expose nonnegative regional-currency/m³ control; changing it must not rewrite an active campaign's prior settlements. |
| Computer set initial targets checkbox | Unchecked | Local monthly commitments are player-editable and advisor policies exist; no explicit instructor initial-target-mode control was found. **P1:** authored versus computer-proposed initial commitments with clear source, editable proposal preview and explicit acceptance. Do not describe a draft heuristic as the original target-setting algorithm. |
| Game duration stepper | 12 weeks | Local regions carry `weeks` and have season-calendar functions, but the main Scenario Studio inspected here lacks a direct duration stepper. **P2:** offer supported campaign lengths with validation of weather coverage, partial months, contract deadlines and final settlement. A cosmetic week count change is insufficient. |

### Prioritized implementation acceptance

1. Add a coherent **instructor setup panel** using the existing scoring fields, with tolerance, per-m³ bonus, initial-target mode, campaign window and clear scenario provenance. Defaults must preserve existing regional behavior and imported saves.
2. Add the **categorical annual access matrix** with climate zones as rows, calendar positions as columns, labelled access classes, selected campaign bounds and an accessible non-color representation. Keep actual future weather instructor-only. Explain 52/53-week regional conventions.
3. Add **live groups progression** with room-scoped authorization, phase/readiness/completion and last update, separate from imported self-reported cohort results.
4. Add **instructor results/help navigation** using original gear/people/flags/question semantics where appropriate, with textual labels and mobile-friendly targets. Existing local SVG fleet symbols are a different layer of iconography and do not address instructor navigation.

No sliders, checkbox or duration controls were changed during this review. Their visible state is evidence of available interface capability, not evidence that their underlying original algorithms or saved behavior were exercised.

### Additional root-observed Groups progression screen

The parent/root reviewer directly verified a compact four-row table for Groups #01–04. Visible fields included **Week 1**, **Target is set? No**, three role columns, and **Time left 11:42**. Purchasing used teal, Production dark blue and Transport lavender; Group #01 contained a player name under Purchasing. An **Add** button and a **red X** on each group row were visible and were not clicked. The red X's exact action and reversibility were not verified; do not assume or reproduce destructive behavior based only on its shape.

This strengthens the P1 live-classroom gap: the original view combines group identity, calendar progress, target-setting status, role occupancy and remaining time. ForestCommons currently exposes readiness for one room and separately imports self-reported cohort results.

Concrete acceptance criteria:
- An authorized instructor sees all their groups in one compact table with week/month, target-set status, each role's occupancy and readiness, and last refresh.
- Participant name and role color are supplementary to text; an empty role is explicitly labelled. Use original consistent colors and ensure contrast.
- If a timed classroom mode is implemented, specify whether time is global, per group or per phase, who can pause it, and what expiry does. The observed `11:42` alone does not establish these rules. Display remaining time accessibly and test reconnect/server-time consistency.
- Add-group operations must create independently scoped room state and credentials. Do not expose or duplicate existing role secrets in the roster.
- Any removal control needs a labelled accessible action and a defined archive/recovery lifecycle. The original red X was only observed, not exercised.
