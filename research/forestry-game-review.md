# Forestry game document and application review

Reviewed 7 September 2026. The materials support a combined educational game connecting timber procurement, harvest scheduling, inventory, transport, mill commitments and collaboration. The implementation in `../forestry-game` is a playable starting point. It uses original interfaces and an explicitly synthetic campaign model, while preserving the supplied coalition cost tables.

## Evidence and review coverage

All 13 original files were inventoried. Text was extracted from the PDFs, Word documents, presentation and spreadsheets. The three presentations inside MaterialToPrint.zip were also inspected through their text. This is a targeted mechanics and feasibility review, not a page-by-page scholarly critique or visual audit of every source figure. Extracted files in `extracted/` retain the available text for follow-up; original files were not edited.

The live administrator pages, first-time player flows, and planning screens of both apps were inspected in the user-created test games. A player named Forest Reviewer was created in Harvest Arena and in Group #01 of Virtual Wood Supply Arena. The original apps were not played through an entire campaign. Their hidden algorithms, optimizer, and full endgame exports remain unverified.

## Source inventory and what to carry forward

| Material | Contribution | Review findings |
|---|---|---|
| Fjeld_Marier_VirtualWoodSupplyArena.docx | 2022 description of coordinated procurement, production and transport | 12-week operational horizon with monthly targets and weekly weather/trafficability; three managers; described Swedish setup has 10 teams, 10 trucks, four regions, two climate zones, five assortments and five mills. Figures show the separate interfaces. |
| IntroHarvestArena_3video_Photo-very-small.pptx | Harvest training and planning cycle | Six CTL teams, 12 weeks, site bearing capacity, productivity, workdays, assortment filters, team routes and mill assignment. Training aims include ±10% monthly delivery goals, capacity utilization, relocation and ground damage. Useful starting point for a tutorial. |
| Collaboration_4companiesEN.docx | Four-company negotiation exercise | Coalition formation and division of savings. Keep the separate four-company dataset rather than treating it as a truncated five-company game. |
| Collaboration_5companiesEN.docx | Five-company negotiation exercise | Part A allows pairs; Part B allows arbitrary coalitions. Each company belongs to only one coalition. Each player seeks its own benefit, so aggregate savings are insufficient to judge an agreement. |
| CollabEnglish-4-companies.xlsx | Four-company costs and team recording | Valeurs contains all 15 nonempty subsets. Game A/B use lookups for coalition savings and compare allocated versus available savings. |
| CollabEnglish-5companies.xlsx | Five-company costs and team recording | Valeurs contains all 31 nonempty subsets. Includes a grand-total arithmetic discrepancy and different currency labels from the handout; see below. |
| Example-Collab-French_filled.xlsx | Example recorded exercise | Shows how team coalitions and assigned savings are entered and checked. It is an example outcome, not a universal optimal allocation. |
| d-amours-rönnqvist-2013-an-educational-game-in-collaborative-logistics.pdf | Educational rationale and cost-sharing methods | Sections 3 and 5 are directly useful: efficient allocation, individual rationality, the core, coalition excess, Shapley values, equal profit method, and negotiation practice. Shapley need not lie in the core. |
| 1-s2.0-S0377221710000238-main.pdf | Cost allocation in collaborative forest transportation | Frisk et al. (2010) examines allocation methods including Shapley, nucleolus, shadow prices, volume weights and EPM. Provides the motivation to compare fairness and stability rather than offer a single unexplained score. |
| ExpoConference2014_PMarier_MRonnqvist_revLS.pdf | Collaboration workshop | Links shared transport planning and resource allocation, presents the five-company case, and offers discussion prompts. Historical case-study savings are not assumptions for our fictional campaign. |
| MaterialToPrint.zip | Classroom handouts | toPrint1 gives coalition cost/savings, toPrint2 gives company maps and descriptors, toPrint3 provides blank negotiation recording sheets. |
| Guide_Usager_BidGame.pdf | Auction, harvest and sales sequence | Bids resolve for use in the following turn; players schedule limited harvest, then sell roadside products. Details include block composition, seasonal cost, transport cost, demand, guarantee/refusal and inventory limits. Estimated potential profit explicitly ignores demand volume limits. |
| MemoireRaja.pdf | Procurement under timber auction uncertainty | Raja Ziedi (2016), Stratégies d’approvisionnement dans un contexte d’enchères de bois. Abstract, selected procurement sections and discussion describe first-price sealed-bid optimization, guaranteed/private sources and collaboration. Future work includes rolling horizons and uncertainty in common values. Do not label a simplified rival simulation as this thesis's optimal bidding model. |

## Live application observations

### Harvest Arena

Entry: https://apps.forac.ulaval.ca/HarvestArena/

- Self-service game creation asks for game name, administrator password and scenario. Player entry uses the published game, a player name and a separate player password.
- The Norway creation screen describes Trøndelag, five mills, 1,148 contract areas and six harvest teams.
- The live player screen instead reports **1,143 contracts** and displays eight mill names, including destinations with zero/unused demand. This is a source-version discrepancy, not evidence that all eight are active demand commitments.
- Administrator settings distinguish forecast from actual weather; options include normal weather, varied conditions and colder winter/drier fall. Three zones are Outer, Mid and Inner. A demand-change option adds 1,000 to Gauldal in the third month.
- The reviewed player begins at calendar week 13 and shows a 12-week horizon through week 24.
- Large Leaflet map, stand markers, crew markers, contract filter table, cumulative delivery plot, seasonal temperature/snow/precipitation curves and forecast matrix.
- Contract filters include road and terrain bearing capacity, daily productivity, workdays, volume and PG pulp / sawlog / SG pulp shares.
- Production tab includes six team rows and a schedule. Visible monthly targets sum to 16,000 m³: 7,500 PG pulp, 7,500 sawlogs and 1,000 SG pulp.
- KPIs include relocation per 1,000 m³, ground damage, goal fulfillment within 10%, capacity utilization and purchase-bank stock/work measures.

### Virtual Wood Supply Arena

Entry: https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/

- Creation scenarios: Quebec 12 weeks, Sweden 12 weeks and Sweden 8 weeks.
- Quebec creation screen describes Saguenay–Lac-Saint-Jean, seven mills, 32 supply areas and ten harvest teams. This differs from the Swedish example in the 2022 abstract and must not be conflated with it.
- Reviewed game is Forest Review 2026-09-07. Administrator group progression initially includes four groups; an Add control is available.
- Targets include delivery tolerance (10%), bonus (3 CAD/m³), computer-set initial targets and campaign length. Weather scenarios include warm/wet and short/long/medium thaw variants; North/South access classes are shown.
- Player joins a group as purchasing, production or transport manager. Monthly targets precede weekly work. The selected purchase-manager session can navigate the other role views; write permissions across roles were not systematically tested.
- Target setting shows market, purchased bank, roadside stock, required production and mill demand together, alongside expected resource use, average distance and productivity.
- Purchase manager: map and lots with zone, treatment (thinning/final cutting), bearing capacity and five assortment volumes; target/bank/done tracking.
- Production manager: ten team rows, 160 hours per week, site scheduling and production targets.
- Transport manager: ten trucks, utilization, road-access filtering, roadside inventory by assortment, flows and transport targets.
- General KPIs and endgame results are navigation options; populated endgame behavior and optimizer output are not yet verified.

## Source reconciliation

The five standalone company costs are 3,780 + 14,860 + 10,340 + 4,960 + 4,740 = **38,680**. The grand-coalition cost is **35,690**, yielding **2,990**, or approximately **7.73%**, in savings.

The English five-company workbook's Valeurs!C11:D11 instead says 38,690 and 3,000. The handout and printable coalition summary support the recomputed value. The app preserves coalition costs and recomputes savings from singleton costs.

The English workbook labels monetary values kNOK; Word and printable handouts label them kSEK. The learning lab follows the handouts' kSEK. Campaign values are synthetic CAD and are never added to these collaboration figures.

Company volume descriptors also differ across handout versions (for example C1/C2). The cost-based allocation methods use standalone and coalition costs only. The later **Volume-weighted total cost** method uses the English five-company handout rows (77,360 / 301,660 m³ for C1/C2, closest to Frisk et al. 2010); the four-company handout and the French printed map sheet give 77,300 / 301,300 m³, which the lab notes.

## Combined game design

A coherent round has the following sequence:

1. Review monthly demand, standing timber, roadside stock, fleet capacity and weather forecast.
2. Commit procurement decisions, including bids for later availability.
3. Assign crews to accessible terrain; respect volume, work-time and retention limits.
4. Assign trucks to accessible roads and assortment-compatible mills; reconcile capacity and inventory.
5. Resolve actual conditions, operational work and bids. Record decisions and outcomes.
6. Evaluate monthly delivery commitments and discuss missed targets, overproduction, idle capacity and environmental tradeoffs.

The prototype implements that sequence at a simplified scale with four crews, four trucks and three mills. Weather uncertainty and supply-chain handoffs are the core learning mechanisms. Retention and a protected stand add environmental tradeoffs; they are proposed additions, not claimed features of the original applications.

The independent collaboration lab uses source costs, selected partners, three savings-allocation methods and exact subgroup breakaway checks. The next expansion should allow a full partition into simultaneous coalitions and negotiated allocations, while ensuring no company joins two coalitions. Only after that should dynamic haul pooling be integrated with the campaign; a fixed percentage discount would misrepresent the logistics problem.

## Architecture for a more comprehensive game

Vite 8 is suitable for the browser interface and can serve a local solo simulation. It is a build tool, not a multiplayer server. The implemented TypeScript state transitions are separate from React so they can later run on a server or worker.

For classroom multiplayer, add a server-authoritative campaign state, instructor-managed rooms, role assignments, private bids, readiness barriers and reconnect support. Store decisions as an event log for replay and debriefing. Instructor controls should set scenario seed, reveal schedule, demand shocks, duration and scoring weights.

Further work, in dependency order:

1. Validate the operating rules against a completed run in each original app; capture production, transport and endgame behavior with meaningful stock.
2. Add multi-week crew queues, relocation travel/time, logging-road network routing, stock age/quality and actual assortment constraints.
3. Add whole-class coalition partitions, negotiated shares, consent, offer history and EPM using an actual optimization solver.
4. Add procurement choices from the BidGame guide: guaranteed supply, private purchases, refusal guarantees and terminal inventory limits.
5. Add scenario editor and imports with explicit units, provenance and versioning. Support Quebec/Norway presets without mixing their product definitions.
6. Add shared classroom rooms and role-specific information, then cross-company timber exchanges and cooperative routing.
7. Add rolling-horizon baselines and optimizer benchmarks, clearly separating what was knowable at decision time from hindsight.
8. Add calibrated regeneration, habitat, soil, carbon and disturbance models with forestry expert review. Forest growth requires a longer time horizon than a 12-week operations game.

## Verification of the prototype

Production compilation and invariant tests cover mass balance over 12 weeks, stock sharing, retention, separate road/terrain access, auction timing, budget limits, monthly scoring, save validation, cash reconciliation, all coalition subsets and allocation methods. Browser checks exercise a drafted plan, weekly simulation, resulting report, navigation and responsive layout. See the application README for current functionality and limitations.


## Regional v2 implementation checkpoint (2026-09-07)

The initial schematic prototype has been superseded by the regional app described in `forestry-game/README.md` and `forestry-game/REGION-PACKAGES.md`. Quebec remains the first setting; PGMaps contributes the MapLibre/deck.gl technology, not its BC scenario. The simulation now reads region-defined roads, stands, products, mills, fleets, calendars and coefficients. Public-road geometry is real OSM/OSRM cartography; commercial facilities, training parcels and logging-road spurs are modelled and labelled accordingly.

The source-inspired mechanics now include multi-stop resource queues, measured routing and accessibility, guaranteed/private/auction procurement and refusal, inventory deterioration, monthly commitments, multi-coalition negotiations, backhaul credits, historical operating snapshots and complete campaign settlements. These are original educational rules rather than a claim to reproduce inaccessible FORAC backend algorithms. The full scope and remaining browser verification are in `research/completion-checklist.md`.
