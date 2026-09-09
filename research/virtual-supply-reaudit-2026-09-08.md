# Virtual Wood Supply Arena re-audit — 8 September 2026

## Coverage and evidence boundary

Read the original project review and the latest implementation report, then fetched the original website's public entry, About, Player, Administrator, first-time player, returning-player and administrator-login pages read-only. No operations, game creation or account changes were made. One authorized existing-password login was later attempted, as detailed below.

An authenticated graphical re-review was attempted but **not completed**. CUA `createBrowserTab` timed out and reset its kernel after approximately 49 seconds; two subsequent `getState` attempts also timed out/reset (approximately 68 and 27 seconds). The reviewer therefore could not discover the created tab, access the existing authorized session or inspect rendered player screens. Browser-only discovery subsequently recovered. A fresh reviewer-owned tab reached the returning-player UI and listed Forest Review 2026-09-07 → Group #01 → Forest Reviewer. One login attempt using the exact existing password supplied by the user returned **“Login failed: Wrong password.”** No alternative credentials were guessed and no password reset was attempted. Public HTTP pages were reachable. No browser cookies were extracted and no authentication was bypassed. The fresh boundary is now rejected existing credentials, after the initial browser-control failure.

Sources:
- [Original entry](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/)
- [About](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/About.aspx)
- [Player entry](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/Player.aspx)
- [Returning player](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/ReturningPlayer.aspx)
- [First-time player](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/FirstTimePlayer.aspx)
- [Administrator entry](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/Administrator.aspx)
- [Administrator login](https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/AdminLogin.aspx)

The prior authenticated observations remain in `research/forestry-game-review.md`; they were not independently reconfirmed here. In particular, no fresh evidence establishes the original games' exact fleet pictograms, selected/disabled states, tooltips, animation, successful endgame benchmark output or hidden optimizer.

## Newly observed public control inventory

| Screen | Observed controls/content | Consequence for local design |
| --- | --- | --- |
| Entry | Player, Administrator, Read more; VWSA logo and institutional logo strip | Preserve clear learner/instructor entry. Create original branding rather than copying institutional logos. |
| About | Monthly coordination between purchasing, production and transport; weekly management under weather uncertainty; endgame benchmark follow-up | The coordinated planning cycle and comparison debrief deserve visible progression, not only separate tools. |
| Player | First time login, Returning player, Back | Onboarding and rejoining are distinct flows. |
| First time | Game and group selectors, player name/password, purchasing/production/transport radio choices, Login, Back | Local classroom should clearly identify current room/team/role and offer an obvious rejoin path. |
| Returning player | Game, group and user selectors; password; Login; Back | Existing saved/classroom identity should be recoverable without starting a new campaign. |
| Administrator | Game creation, Game admin, Back | Scenario authoring and active classroom operation should remain distinguishable. |
| Admin login | Game selector and administrator password | Instructor-only state changes must stay server enforced. |

Public images are identified by markup only (`images/VWSAlogo.png`, `images/Logos.jpg`, favicon); these were not visually inspected. Some pages label the header image `Truck`, which does not establish that it is an in-game truck symbol.

## Local code comparison and actionable gaps

Observed current code includes `src/maps/OperationsMap.tsx`, `src/MapWorkspace.tsx`, `src/RegionalApp.tsx`, and the latest document build report. This report does not label an already implemented feature as missing.

| Priority | Finding | Acceptance criteria |
| --- | --- | --- |
| Fixed during parent integration | Initial review found same-type fleet resources at a node using identical offsets and overlapping. Parent reports deterministic 40 px spacing implemented, build passed and rendered icons inspected. | Keep regression coverage for multiple same-type resources; every crew/truck at a shared depot must remain selectable, with actual node geometry unchanged. |
| P1 | Scheduled/unavailable fleet states are represented in tooltip text, with the same icon appearance. Mill icons do not visibly encode intake/processing/closure status. | Add original status badges or outlines with text equivalents for idle, scheduled and unavailable; mill closure and stock should be available on selection. State must agree with current/replay period and not disclose unrevealed events. Do not rely on color alone. |
| P1 | The map currently filters by secured + forecast terrain accessibility and searches by name/ID. This is narrower than the assortment/bank/access/resource-use planning described by prior source review. | Map-linked product and minimum-volume filters; separate standing/roadside inventories, terrain and road feasibility; preserve selection and explain zero results. A road-feasible claim must include the actual selected destination/route, not just terrain bearing. |
| P1 | A best-of-policy forecast advisor exists, while the original public description promises endgame benchmarking. The latest report explicitly excludes joint acquisition. | Present attainable comparison baseline, objective, known-information scope and search limits; show actual versus baseline cost/delivery/idle time at debrief. Do not relabel the existing 13-policy advisor as a globally optimal benchmark. |
| P2 | Reserved destinations exist, but the original review describes a compact monthly target/bank/roadside/required-production/demand view. | One product × month comparison must reconcile target, delivered, secured standing, current roadside, reserved volume and remaining required production, with clearly different physical and planned totals. Clicking a row should filter/select relevant map sites. |
| P2 | Source-described monthly coordination is spread across classroom and planning desks. | Surface a simple monthly cycle checklist: review forecast and commitments → procurement → production → transport → all-role readiness → weekly resolution → debrief. Server readiness remains authoritative. |
| P2 | Calendar/forecast charts exist, but fresh original graphical comparison could not be done. | When CUA is restored, compare climate-zone weather matrix, monthly separators, planned versus actual curves, and demand-shock reveal states; only add differences verified against source or explicitly proposed as extensions. |

## Icon and visual-state specification

Use an original consistent SVG family. Current local pictograms are a suitable starting point, not evidence of visual parity with the FORAC originals.

- **Entity:** harvester/crew, log truck, receiving mill, processing mill, roadside log pile, stand, road restriction, auction/private/secured timber.
- **State:** selected, scheduled, idle, unavailable, inaccessible under forecast, known closure, completed/depleted. Distinguish entity and state rather than inventing a different unlabelled color for each combination.
- **Quantities:** optional number badge for co-located fleet; roadside volume and stock age on selection; destination intake/output volumes in the mill inspector.
- **Legend:** icons plus words, not color-only prose; show only supported states and identify forecast versus historical time. Offer a compact mobile disclosure.
- **Interaction:** hover gives a preview; click/tap opens the same inspector; search/list provides a keyboard alternative to WebGL picking. Aim for at least 44 CSS-pixel actionable mobile hit areas even when artwork is 32 px.
- **Geometry:** round road caps/joins already exist. Do not smooth cadastral/VRI boundaries into different land geometry merely to hide pixel jaggies; use appropriate antialiasing/render resolution and line styling.

## Required next authenticated pass

Once valid existing access is available, reuse the authorized session in a reviewer-owned tab. Browser control recovered for the public login flow, but the supplied password was rejected. Capture purchasing, production, transport, target setting, forecast, KPI and endgame navigation at the current saved state without advancing it. Record every symbol's entity, state, tooltip, click action and legend meaning, plus screen-specific quantities/units. Test nondestructive filters and tab navigation. Only use a separately preserved disposable scenario for week advancement. Until then, mark original in-game icon parity and full endgame behavior **unverified**, not done.
