# Document-supported additions and current coverage

Reviewed against the local extracted source text and current regional implementation on 7 September 2026. These are feature gaps, not a claim that the original server-side applications have been fully reproduced.

| Document | Already represented | Further addition supported by the material |
|---|---|---|
| Guide_Usager_BidGame.pdf (printed pages 6–7; purchasing section) | Auction timing, guarantee/refusal, roadside inventory and capped sales | Per-lot and per-product potential margin range. Show the original guide's estimate without demand limits separately from a demand-aware appraisal. Include purchase price, seasonal harvest cost and route-dependent transport cost. |
| MemoireRaja.pdf (procurement strategies and risk-coefficient discussion) | Guaranteed/private/auction procurement and a reproducible synthetic rival | Compare procurement strategies under multiple uncertain outcomes; explain bid exposure, supply shortfalls and risk preferences. A research-equivalent optimal-bid model is not currently implemented. |
| 1-s2.0-S0377221710000238-main.pdf (Frisk et al., cost allocation and planning models) | Shapley, subgroup stability, regional routing | Actual constrained EPM optimization, comparison against other allocations, and explicit partner cargo/backhaul routes. The existing assumed empty-leg cost contribution is not a multi-company routing optimizer. |
| d-amours-rönnqvist-2013-an-educational-game-in-collaborative-logistics.pdf | Partitions, local negotiation offers, accept/reject and history | Role-specific information, staged disclosure and a structured comparison/debrief of accepted versus stable allocations. Authenticated/private multiplayer roles require a backend; shared-device UI alone cannot provide secrecy. |
| Collaboration_4companiesEN.docx / Collaboration_5companiesEN.docx / MaterialToPrint.zip | Separate cost datasets, pair/open rounds, allocations and offer history | Exportable completed company/round worksheets and an instructor debrief report based on actual saved offers. |
| IntroHarvestArena_3video_Photo-very-small.pptx / Fjeld_Marier_VirtualWoodSupplyArena.docx | Crew/truck planning, seasonal access, forecast/actual outcomes, monthly commitments, relocation and disturbance | A guided multi-step lesson using the learner's own missed deliveries and actual routes; better explanation of whether soil, roads, inventory or capacity caused a failure. |

Suggested implementation sequence: lot appraisal → saved debrief/worksheet export → constrained EPM → explicit partner dispatch → server-based classroom roles. Each addition should use the regional schema and retain clear model assumptions.

## Interaction and mobile status

The rebuilt interface includes planning, map selection/layers, production and haul queues, procurement actions, commitments, forecast rehearsal, negotiation, reports and import/export. Pure simulation and save behavior are covered by automated checks; the rebuilt browser workflows are still unverified because CUA reports the Mac locked.

Responsive CSS stacks panels on small screens, scrolls wide tables and adapts navigation. This pass adds 44px minimum touch controls, larger checkboxes and cooperative map gestures on coarse-pointer devices. The production build passes. This is source-level mobile support, not evidence of a successful phone/tablet usability test. No PWA installation or offline basemap claim is made.

## Current-status correction after expansion

The earlier gap table and browser-lock note above are historical. Procurement appraisal, EPM, explicit partner freight, debrief exports and server-backed role rooms were implemented and verified in the expansion pass; see `expansion-verification-2026-09-07.md`.

The next document pass adds Harvest Arena site screening, rolling two-/four-week rehearsal, relocation intensity and handout volume-weighted total-cost allocation. See `document-pass-harvest-planning.md` for exact source mapping, limitations and the remaining annual-calendar / staged-disclosure / future-queue / stochastic-bidding gaps. Browser checks for this latest pass are again blocked by the locked Mac.
