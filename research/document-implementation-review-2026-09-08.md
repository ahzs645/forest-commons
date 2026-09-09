# Document implementation review — 8 September 2026

The strongest next step is to connect the existing planning, procurement and collaboration exercises to the operating campaign, then fill the specific economic and interaction gaps below. Much of the original teaching content already exists; rebuilding those modules would duplicate work.

## Scope and confidence

Reviewed the repository's source-document collection through its extracted text, slide text and spreadsheet cell/formula records, with focused reading of the longer papers' models, findings and limitations. This covers all 12 standalone source files and the three decks inside MaterialToPrint.zip. This is a feature review, not a page-by-page visual reproduction audit. Equations in the thesis have extraction damage: implementing their exact mathematical model would require checking the original typeset equations. Source page references below use printed pages for the thesis, PDF page numbers for the user guide, and slide numbers for HarvestArena.

Compared findings with current simulation types/engine, planning components and existing module inventory. No gameplay code changed and no fresh playthrough was performed for this review. Existing internal research reports are useful history but can describe gaps already closed in the code.

## Source-by-source findings

| Source | Already represented | Further implementation supported |
|---|---|---|
| Guide_Usager_BidGame.pdf | Auctions, lot appraisal, refusal window, roadside inventory, delivery penalties and end-of-campaign charges | Debt interest (p13); finite contracts versus unlimited spot outlets (p12); selectable sales policies (pp14–15); terminal inventory allowances (p11); per-product bid composition (pp6–7); optional hidden future auction quantities (p4); realized lot profitability (p16). Its harvest-linked royalty payments differ from our upfront auction purchase. |
| MemoireRaja.pdf | Guaranteed/private/auction supply, bid experiments, uncertainty studies and partner concepts | Mill conversion and downstream product inventories (chapter 3); actual partner offtake of unwanted assortments (pp80–82); joint procurement/production/transport optimization; common-value uncertainty and rolling decisions (pp111–113). Private-value assumptions and case-specific gains must remain explicit. |
| Fjeld_Marier_VirtualWoodSupplyArena.docx | Purchasing/production/transport roles, 12-week play, monthly goals, access/weather, annual-window authoring and KPIs | Shared team comparison over identical conditions; calibrated annual weather cycles; a full operating-horizon benchmark. The abstract describes optimal benchmarking as under development, not as an available reproducible solver. |
| IntroHarvestArena_3video_Photo-very-small.pptx | Crew queues, weekly orders, site finder, production follow-up, rolling rehearsal, relocation and bearing constraints | Map-to-queue interaction and map-linked filters (slides10–14); planned mill destinations by stand/product (16–18); selectable bucking outcomes; pre-season fleet positioning (29). Current truck destinations do not substitute for a production destination plan. |
| 1-s2.0-S0377221710000238-main.pdf — Frisk et al., 2010 | Coalition cost tables, Shapley, volume allocation, constrained EPM, stability checks, backhaul and bounded network exercise | Balanced wood swaps; own-flow/flexible-flow separation; multi-period agreements; additional allocation methods such as nucleolus and shadow-price allocation. Sections2–5 provide the operational and allocation rationale. |
| d-amours-rönnqvist-2013-an-educational-game-in-collaborative-logistics.pdf | Four/five-company rounds, offers, acceptance, information disclosure and debrief concepts | An eight-company exercise with only pairwise savings initially disclosed; agreement on the sharing rule before larger-coalition benefits are revealed; class-wide comparisons and reflection on exclusion/bargaining power (§§5–6). Existing generated disclosure exercises are not exact eight-company source parity. |
| ExpoConference2014_PMarier_MRonnqvist_revLS.pdf | Collaboration, savings allocation and emissions discussion | No-cash exchange, minimum responsibility for own mills and repeated-period proportional sharing (p16). Historical cost/emissions findings are discussion material, not coefficients for BC. |
| Collaboration_4companiesEN.docx | Four-company data and pair/open coalition rounds | Company map explanations and printable role packets. Preserve this handout's distinct volumes. |
| Collaboration_5companiesEN.docx | Five-company data and the excluded-player situation in paired rounds | Explicit debrief on the unpaired company and bargaining power; company map explanations. |
| CollabEnglish-4-companies.xlsx | Allocation calculations and coalition comparisons | Class results board matching Game A/Game B: compare multiple teams, absolute/percentage savings and allocated-versus-available totals. |
| CollabEnglish-5companies.xlsx | Five-company allocation calculations | Same multi-team comparison, including the unpaired company's outcome. Reconcile source arithmetic rather than import totals blindly. |
| Example-Collab-French_filled.xlsx | Underlying exercise mechanics | Use anonymized example allocations as instructor discussion cases; bilingual labels and before/after comparison. These are example classroom outcomes, not optimal targets. |
| MaterialToPrint.zip / toPrint1.pptx | Coalition table | Printable reference sheet generated from the same validated dataset as the game. |
| MaterialToPrint.zip / toPrint2.pptx | General company geography concept | Spatial supply/demand explanation for each company's bargaining position. Slide images need a separate visual inspection before reproducing their layouts. |
| MaterialToPrint.zip / toPrint3.pptx | Negotiation entry and exports | Simple offline negotiation worksheet and an instructor answer/debrief pack. |

## Prioritized additions

### 1. Complete map-based production planning

Let a player filter eligible stands on the map, select a crew, append/reorder assignments and see cumulative planned production against each mill/product target. Provide touch and keyboard controls alongside desktop dragging. Add an explicit pre-season positioning step with a scenario-defined mobilization policy.

Current foundation: site finder, crew timeline, real road graph, map inspector and rehearsal. Missing connection: the visual planning gesture and production destination reservations. Bucking should be a later extension with explicit yield rules, not a free relabeling of wood.

Done when map and timeline always represent the same queue; destination reservations cannot double-count stock; infeasible assignments explain why; the flow works on a narrow touchscreen without dragging.

### 2. Make financing, contracts and spot sales meaningful

Add scenario-defined debt terms and weekly interest ledger entries. Distinguish finite contractual commitments from spot outlets, and compare immediate margin, contract-first and avoided-penalty-aware dispatch policies. Add configurable free terminal standing/roadside allowances before excess charges apply.

Current engine has finite demand, monthly commitments, terminal per-m³ charges and cash settlement. It has no interest/credit fields or terminal allowance fields. Winning auctions currently requires cash and pays upfront; the guide charges harvest-linked royalties. Offer an explicit payment-model setting rather than silently changing existing saves.

Done when interest compounds according to elapsed weeks, sales remain constrained by physical inventory and transport, avoided penalties never appear as sales revenue, and end charges apply only to stock exceeding the configured allowance. Old scenarios must retain their current accounting behavior.

### 3. Connect partner agreements to actual timber

Allow an agreement to reserve and deliver a complementary assortment from an acquired lot to a partner, with volume, price and timing obligations. This captures the thesis's reason collaboration changes a lot's value: a partner wants fibre the buyer does not need.

Current partner hauling and negotiation exercises provide useful foundations. They do not by themselves establish a complete procurement-to-offtake contract for campaign timber.

Done when accepted contracts affect appraisal, available stock, truck orders, cash and shortfall settlement exactly once; rejected or expired offers make no operational changes. Model it as an educational agreement, with assumptions exposed in the scenario.

### 4. Add a multi-team classroom comparison and teaching sequence

Run a short sequence: access planning → procurement risk → paired collaboration → open collaboration → debrief. Compare teams on the same starting scenario and weather seed, with service, margin, waste, relocation and company-level savings. Record a brief decision explanation before revealing outcomes.

Current classroom, disclosure, exports and debrief modules exist. The addition is an integrated instructor flow and a cross-team results view, not a second classroom backend. An eight-company information-limited exercise can follow the four/five-company sequence; do not fabricate the original full coalition dataset from pairwise data.

Done when cohorts remain comparable, private information stays hidden until the intended stage, and printable packets/results use the same validated data as the screen.

### 5. Extend collaboration across periods

Add balanced wood swaps, minimum own-mill service responsibility and an agreement carried across several operating periods. Compare cash settlements with volume-balanced exchange. Distinguish fixed transport obligations from the flows genuinely available for collaboration.

Current EPM and network-dispatch exercise are a good base. Start with a small bounded scenario, then connect accepted dispatch agreements to campaign state.

Done when reciprocal balances reconcile, responsibility constraints are enforced, disruption handling is stated in advance, and each participant's realized savings can be explained. A persistent trust score would be our design extension; the papers discuss trust but do not supply a validated numerical trust model.

### 6. Extend the downstream supply chain

Add mill input stock, processing capacity, conversion yields and output demand, with chips/residues moving to another facility. This develops the thesis's sawmill/pulp network beyond delivery as the terminal event.

This is a larger change: product transformation, units, inventories, revenue timing and conservation tests must be designed together. Do not infer mill-specific yields from mapped locations.

Done when delivered logs can wait or be processed, outputs/by-products reconcile to declared conversion rules, bottlenecks affect profit/service, and no delivery is also counted as a finished-product sale.

### 7. Add a bounded rolling-horizon optimizer

Combine acquisitions, harvest, inventory and dispatch over a small explicit horizon, then compare the player's decisions against it. Show which constraints bind and separate a forecast-based solution from a hindsight result.

Current draft is a heuristic; the exact network lab solves a separate finite itinerary problem. Neither should be described as an optimal solution for the full campaign. Add common-value uncertainty experiments only after an explicit signal/value model exists.

Done when solver scope and assumptions are visible, small cases have verifiable solutions, execution can be cancelled, and no future actual weather leaks into the advice offered during play.

## Lower-priority, worthwhile extensions

- Per-assortment bid contributions and realized lot margin: connect acquisition, harvested/sold proportions and attributed costs; explicitly distinguish operating margin from allocated overhead and penalties.
- Extra allocation methods: nucleolus and, with a suitable optimization model, shadow prices. Prioritize understandable explanations over adding method names.
- French/English teaching labels and downloadable lesson packets.
- Variable-duration BidGame turns as a separate mode. The current weekly fleet simulation should not silently interpret a four-week turn as one week of capacity, interest or aging.

## Data corrections and regional boundaries

- Five-company standalone costs sum to 38,680; grand-coalition cost 35,690 gives savings 2,990. Do not propagate the workbook's conflicting 38,690/3,000 totals.
- Five-company listed volumes sum to 795,190 m³, although the handout prints 795,200. Four- and five-company handouts also use different C1/C2 volumes; retain source variants.
- Handouts use kSEK; some spreadsheet labels use kNOK. Keep the selected source's units visible and document corrections.
- Historical percentage gains in the thesis and logistics papers describe their particular experiments. They are not promised game outcomes.
- These documents primarily support operations, procurement and collaboration. They do not supply a complete BC model for growth, wildfire, habitat, tenure, stumpage, road/bridge engineering or Indigenous governance.
- The BC pilot's real FSR/VRI geometry does not calibrate its teaching volumes, prices, weather, rights or mill assumptions. Keep those in versioned regional configuration with sources and review status. New financial, conversion and contract rules should also live in regional/scenario configuration.

## Recommended build order

First complete the map planning workflow and economic decisions (1–2). Then connect partner timber agreements and classroom progression (3–4). Follow with repeated collaboration (5). Treat downstream processing and joint optimization (6–7) as larger expansions with explicit acceptance tests.

This order improves the everyday game before adding more separate screens, while preserving a shared engine that can support both Québec and BC.
