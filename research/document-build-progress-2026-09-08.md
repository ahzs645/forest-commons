# Document-backed implementation progress

Scope: all seven priorities in document-implementation-review-2026-09-08.md. The full scope is not complete.

## Implemented in this pass

- Map inspector: append a selected stand for a chosen number of crew hours, reorder and remove assignments, navigate back to queued stands. Shared plan is edited directly; readiness resets after mutations. Invalid/excess hours are rejected.
- Map filter: show secured stands whose terrain is accessible under the forecast. This is explicitly a terrain filter, not a claim that roads or crew relocation are feasible.
- Scenario economics: optional effective annual debt rate, converted to a weekly compounded rate; interest posts on closing negative cash after settlement. Optional terminal purchased-standing and roadside volume allowances. Existing scenarios default to zero for all new fields.
- Scenario studio exposes these economic settings. Imported scenarios validate their finite nonnegative values; calibration fingerprints already include the full economy object.
- Draft options: net transport margin per hour, contracts first, or avoided-shortfall-penalty-aware ranking. Avoided penalties are capped to the remaining committed shortfall volume and affect ranking, never ledger revenue. This remains heuristic advice. Default one-click drafts preserve prior ranking.
- Reports/planning: classroom team comparison accepts validated exported saves and displays actual delivery, cash, waste and emissions. Exact scenario/weather/seed/progress equality determines comparability. Imports do not replace the active save; the board is session-local.

## Verification

- Full suite after initial economics/map changes: 117 tests across 26 files passed.
- After refining sales-policy scoring: six focused finance/policy tests passed, including three additional policy cases.
- Production build passed after all UI changes. Existing bundle-size advisory remains.
- Browser inspection confirmed the terrain filter and all new scenario economic controls render against the existing completed BC campaign. No new campaign was started for browser verification; queue interaction and team-file import still need live browser checks.

## Still to implement

1. Map planning: destination reservations, map-linked product/site finder filters, pre-season positioning, production-by-destination chart and optional bucking rules. No desktop drag/drop yet; current buttons support touch/keyboard.
2. Economics: explicit finite-contract versus spot outlets, credit limits/purchase financing policy, harvest-linked royalty payment option, per-assortment bids and realized lot margins.
3. Partner offtake contracts linked to campaign inventory, dispatch, payment and deadline settlement.
4. Classroom: persistent cohort comparison, decision explanations, integrated negotiation lesson sequence, eight-company disclosure exercise and complete printable packs.
5. Repeated collaboration: balanced swaps, own-mill obligations, multi-period acceptance and realized settlement.
6. Mill processing: input inventories, conversion rules, capacity, downstream products and by-products, plus conservation validation.
7. Bounded integrated procurement/harvest/transport rolling optimizer with explicit forecast scope and cancellation.

Next implementation dependency: introduce typed campaign contract and market state before processing/output flows, so sales accounting and physical delivery are not counted twice. Preserve versioned save compatibility and existing scenario defaults.

## Continuation: campaign markets and mill processing

Implemented after the first pass:

- Authored partner offtake offers: company, mill endpoint, assortment, volume, acceptance window, delivery deadline, price and shortfall rate. The player explicitly accepts an offer and queues contract deliveries. Engine checks the accepted contract, physical stock, actual access and truck hours; deadline shortfall is charged once. Contract delivery and monthly mill commitments have separate counters.
- Optional spot prices per receiving yard/product. Spot demand has no artificial quantity ceiling, but every shipment still consumes actual stock and transport capacity. It does not satisfy contracts or monthly commitments.
- Draft dispatch now considers accepted partner offers and spot outlets. Appraisal includes their net margins and remaining demand. These are heuristic, forecast-based calculations, not the still-outstanding integrated optimizer.
- Configurable procurement credit limit and harvest-linked royalty payment mode. Upfront payment remains the default. Royalty mode charges actual harvested volume at award price divided by original stand volume. Refusal charges the guarantee without refunding an unpaid acquisition.
- Optional mill processing recipes: accepted inputs, weekly capacity, cost, output yields, output prices and weekly demand. Intake transfers timber to mill inventory without log-sale revenue. Processing and output sale are explicit player orders; unprocessed inputs, unsold output and residue remain accounted for. Mill shutdowns suspend processing and sales. Output volumes use input-equivalent m³; recipes are educational, not calibrated recovery tables.
- New scenario controls enable clearly labelled illustrative offers, spot prices and mill recipes. Existing scenarios retain old behaviour unless these options are enabled. Imported region packages can provide authored coefficients.
- Processing inventory carries into linked annual seasons with opening balances, rather than disappearing. Output sales and physical balances are validated on load.
- New model fields participate in regional evidence fingerprints.

Browser findings: the local dev server had stopped, so it was restarted. The previously completed BC campaign was exported before starting a new BC teaching campaign with the new modules enabled. The browser advanced to week 2. A duplicate React component-key warning was found and fixed; processing UI now displays one selected mill at a time.

Remaining within the original scope: destination reservations, map-linked product filters, pre-season positioning, bucking, per-assortment bid composition and realized lot profitability; persistent classroom cohorts and new exercises; repeated multi-company exchange agreements; transferring processing by-products between facilities; integrated rolling optimization and comprehensive mobile/browser checks. Server classroom workflows do not yet expose all new contract and processing controls.

Goal status: attempting to create the requested implementation goal failed because the task already has an unfinished forestry-game goal marked blocked. Available goal tools cannot reactivate it. No goal was falsely marked complete.

### Continuation verification results

- Full suite: 128 passed; one existing classroom disclosure test exceeded its 5-second timeout during a busy machine run. It passed when rerun with a larger execution allowance.
- Focused follow-up: processing tests, classroom disclosure and the new full BC market campaign test all passed (4 tests). The campaign test runs twelve weeks, reloads each week's save, checks money and forest material balances, delivers partner timber, processes mill intake and carries inventory into a linked season. Its explicit timeout is 120 seconds because full-map save/reload and routing took 11–51 seconds under variable machine load.
- Finance/market focused run: 10 tests passed, including actual harvest royalties, non-refunding refusal, credit limits, spot sales, contract deadlines and save/reload.
- Production build passed; existing bundle-size advisory remains.
- Live browser: teaching BC campaign now at week 3. Week 2 processed 160 m³ into 88 lumber equivalent, 56 chip equivalent and 16 residue, and delivered 40 m³ separately to the accepted partner contract. Reload preserved the mill state. Responsive check observed 375 px document/client width with no horizontal document overflow; temporary viewport override was reset.
- Previous completed BC campaign was exported before the new campaign was started. Current browser tab is retained for follow-up.

## Integration and independent audit pass

This section supersedes earlier integration-gap notes above; it does not claim the entire document-derived backlog is complete.

Implemented:
- Server classroom purchasing accepts single and repeated partner agreements; production owns processing and destination reservations; transport owns intake, delivery and facility transfers. Shared plan changes invalidate readiness. Revision checks, role-private snapshots and restart persistence cover the added fields.
- Stand/product destination reservations are accessible from the map inspector and Production. Earlier reservations allocate scarce physical stock first. Dispatch and forecast drafting consume reservations without double-counting projected supply. Future unproduced reservations remain explicit requests, not guaranteed deliveries.
- Repeated agreements atomically accept dated legs and settle each independently. Expandable terms keep the contract screen manageable.
- Mill by-products can move over configured routes with actual truck payload, remaining hours, closures, cost and emissions. Transfer output, destination intake, processing, residue and sales reconcile. Internal transfers are not sales. The optional teaching recipe converts chips to a distinct fibre input/product, not sawlogs.
- Six guided lessons and persistent browser-local explanations, exports and validated imports. Compact cohort packets compare original conditions and elapsed calendar position, including currency.
- Cancellable worker compares up to 13 harvest/dispatch policies over 2–4 forecast weeks. It evaluates inventory, contracts, processing and transfers through the engine, excludes hidden actual weather/events and does not simulate procurement. Application changes only the current plan and refuses stale advice. It is a bounded policy comparison, not a globally optimal joint acquisition model.

Independent defects reproduced and fixed:
- Royalty rate disappearing when ownership carries into a linked season.
- Missing processing inventories and invalid opening product keys passing reload validation.
- Reserved draft shipments consuming too much projected stock.
- Deleted transfer destination receipts escaping reconciliation.
- Invalid cohort calendar positions and mismatched currencies being treated as comparable.
- Classroom draft changes leaving other roles marked ready.

Browser checks: accepted repeated agreement; reserved processing intake; 160 m³ input produced 88 lumber + 56 chips + 16 residue; following week moved 40 m³ internally. Corrected fibre preset subsequently verified in a fresh campaign. Ran 13-policy comparison, applied a current plan, and reloaded successfully. Lesson text survived reload. Planning and Transport fit a narrow viewport (360 CSS-pixel content width, equal document scroll width), and mobile navigation expands/closes. No captured browser errors. Previous campaigns were exported before replacement; the browser is left at a fresh BC map with optional modules enabled.

Limits remaining in the larger source-document backlog: balanced reciprocal multi-company wood swaps/own-mill responsibility, joint acquisition optimization, per-assortment bid attribution/realized lot margin, bucking and pre-season mobilization. Cohort records remain local self-reported results, not a centralized authenticated roster. BC operational parameters remain explicit teaching assumptions. No global implementation goal is marked complete.

Additional browser verification: imported an existing completed campaign into the comparison board; it was correctly labelled Different conditions against the new BC campaign, survived page reload, and exported as a comparison packet. The campaign itself was not replaced by cohort import.

Final verification: current production build passed (Vite 8.2.2, 3,480 modules). Independent reviewer accounted for 157 current tests across 42 files: initial full run had 141 passes; all 11 previously failed cases passed on targeted rerun; 5 tests added after the full run started passed separately. Ten original failures were execution-time limits under heavy host contention, so explicit time budgets were increased without changing assertions. One helper test had loaded pre-edit code during parallel integration and passed against the finished implementation. No remaining assertion failures were reported. This is combined full-run plus targeted-rerun coverage, not a claim of a single clean 157-test sweep.
