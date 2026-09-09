# Harvest Arena authenticated-interface audit — 8 September 2026

## Current evidence boundary

An existing user Chrome tab at `https://apps.forac.ulaval.ca/HarvestArena/MainAdmin.aspx` was identified for review. It is held by the parent task's browser session; the audit subagent could not claim it concurrently. A separate Chrome tab in the same profile was opened at that verified URL. It displayed **“Login failed: Wrong password”**, followed, after dismissing that notice, by an empty administrator interface shell. No credential was entered or changed during this second attempt.

The duplicate tab therefore does **not** verify an authenticated administrator session. The existing tab may retain page-specific session state; this is an inference, not an inspected implementation fact. The parent task retains the original tab and can inspect it directly. This audit must not be presented as completion of all authenticated interfaces.

## Newly observed administrator shell

Read-only DOM control inspection and a screenshot cropped below the credential fields verified:

- Separate **Weather prognostic (P)** and **Weather actual (A)** labels and dropdown controls.
- Administrator form controls for game name, player password, administrator password and demand change. Credential values were not inspected or included in screenshots.
- A large rounded white weather panel on a light gray canvas; other contents and dropdown options were not populated in the duplicate tab.
- A warning modal with a Close button. Dismissing this notice is the only interaction performed after opening the page.

No player preview, populated player list, progress grid, results chart, weather option names, settings values or game controls were verified from this shell. No settings were saved, no player was created/deleted and no week was advanced.

## Findings to carry into direct authenticated review

The prior [Harvest reinspection](harvest-arena-reaudit-2026-09-08.md) includes a detailed source-screenshot symbol inventory and code-based Forest Commons gaps. Its historical evidence remains valid within its stated scope; it is not replaced by new live proof here.

The direct review should record each reachable administrator tab, the populated weather forecast/actual comparison, demand changes, participant progress/readiness, per-player results and any exposed player-preview navigation. Capture icons with their actual meaning and inspect warnings without triggering destructive or simulation actions. Keep credential fields outside screenshot crops.

Forest Commons already separates published forecast and realized weather and offers instructor controls. The newly observed shell supports preserving that distinction, but cannot establish any further missing mechanic. Actionable map refinements and their acceptance criteria are listed in the preceding audit; current parent implementation may already resolve some of them.

## Authenticated evidence supplied by the parent task

The parent task directly inspected the original authenticated administrator tab after the duplicate-tab limitation above. The following is **root-observed authenticated UI evidence**, relayed to this audit author; it is not inferred from the empty duplicate tab:

- Weather prognostic selection: **Prognosis (expected trends)**.
- Weather actual selection: **Normal weather**.
- A **52-week grid**, with campaign start **13 circled**, and paired **Outer (P/A)**, **Mid (P/A)** and **Inner (P/A)** rows.
- Categorical visual key: **spring thaw red**, **wet yellow**, **normal green**, **winter blue**.
- Demand-change card: **No changes from initial scenario**. An available authored option is **Gauldal +1000 3rd Month**.

This verifies the administrator's side-by-side treatment of expectation and realization, annual context for a shorter campaign, and a simple named demand-shock preset. It does not verify any mutation, resulting simulation outcome, player preview or populated endgame screen.

## Comparison and priorities for Forest Commons

Local code already stores separate forecast/actual categorical schedules, supplies a 52-week teaching calendar, allows a selected 12-week seasonal window, exposes a forecast/actual instructor table, validates thirteen four-week demand periods, and supports dated demand disruptions. Thus these are primarily presentation and authoring gaps rather than absent simulation fundamentals.

| Priority | Refinement supported by the live admin evidence | Acceptance criterion |
|---|---|---|
| P1 | Replace the dense instructor forecast/actual text pairs with an optional paired-row annual categorical grid. | For every region-defined zone, show distinct P and A rows, a textual legend and tooltips; classroom students must never receive unrevealed A values. Accessible table remains available. |
| P1 | Make forecast and actual scenario choices explicit in scenario authoring. The current principal scenario selector selects a weather object containing both. | Instructor can inspect which expectation and realization schedule will be used, including a clearly described mismatch preset; selected values and provenance survive export/import. Independent mixing, if implemented, must validate complete zone/week coverage. |
| P2 | Show campaign start and selected operating window directly on the annual view. | Highlight the selected calendar start and all twelve included weeks, including windows crossing week 52; retain sequential operating-week labels and avoid treating calendar week 13 as mandatory for BC. |
| P2 | Offer compact named demand-change presets alongside the general disruption editor. | Display destination, product, amount, effective period and reveal timing before applying; no-change is explicit; preview reconciles baseline and adjusted demand. An illustrative regional preset must not silently copy Gauldal's Norwegian quantity into Québec or BC. |
| P2 | Reuse categorical icon/color semantics consistently across the map, instructor grid and player access legend. | Each category has matching text and a non-color cue; distinguish climate state from whether a specific terrain/road class can operate. Red thaw does not mean every area is closed. |

No implementation changes were made in this analysis pass. The parent-observed administrator evidence supersedes the earlier blanket statement that no populated weather options were verified, while the uninspected participant/results/player-interface limits remain.
