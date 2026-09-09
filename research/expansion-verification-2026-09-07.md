# Expansion verification — 7 September 2026

## Automated evidence

53 tests pass across eight suites. Coverage includes:
- Every full twelve-week weather campaign with timber/cash conservation and packed/raw save reloads.
- Disruption road removal, delayed restoration, cash reservation, waiting, duplicate repair prevention, crew unavailability and event save validation.
- Published three-company EPM fixture and core/efficiency checks for every subset of the four/five-company datasets; explicit empty-core failure.
- Procurement estimation independent of actual weather and auction seed.
- Finite partner freight, actual payment, no automatic credit, shared stock and persisted delivery accounting.
- A feasible restricted dispatch reference independent of actual weather/seed.
- Annual timber balance, regeneration delay, planting budget, protected areas, treatment cooldown and horizon completion.
- Room role boundaries, credential replacement, server restart, stale revisions, bid privacy, readiness barrier and company-specific acceptance.

The long full-season tests have an explicit 20-second timeout because browser/build activity can push a whole campaign above Vitest's five-second default; the model assertions remain intact.

## Browser evidence

Used the in-app browser through CUA at localhost:5173. Loaded the latest Québec preset after exporting the prior fresh campaign.

- Calculated a dispatch reference; its apply button became enabled.
- Started the annual exercise, applied Q02 final harvest and advanced one year. Report: opening + 3,690 growth − 4,200 harvest = 196,090 m³; budget movement +84,000; habitat index 0.81. Protected/unsecured stand controls disabled. Annual report survived reload.
- Created an instructor room, issued purchase/production/transport credentials, and joined an independent participant tab. Submitted Q21's sealed bid of 60,000, generated production and transport queues, and marked all three roles ready. Instructor advanced the room to week 2; both sessions showed CAD 695,860 and revision 11. Transport reloaded and rejoined the same role/state.
- A stale invitation was rejected after another participant changed the room, demonstrating the revision check. After refresh, issuance succeeded. Added a visible refresh/discard-draft control for that case.
- Checked the transport classroom at 390×844: clientWidth and scrollWidth both 375; screenshot showed usable stacked controls. Restored the viewport and closed the temporary participant tab.
- Advanced standalone campaign to week 5, saw the authored washout and blocked Q04 route in the rehearsal, paid 18,000 for recovery, and verified “Recovery paid · restored week 5.” This survived export/reload.
- Selected EPM in Collaboration; Internal core showed Stable and a frozen proposal was created.
- Confirmed forecast operating windows render in procurement.
- Final clean reload produced no new browser console errors. Temporary HMR errors during editing were resolved by the successful build and clean reload.

The other task's bounded UI pass separately verified sidebar persistence, phone drawer, toolbar consolidation, no horizontal overflow, and antialiased road rendering. Those changes were preserved.

## Limits

This verifies an educational implementation, not calibrated forestry performance. Operational optimization uses restricted candidate lanes; partner comparisons measure local trip pooling; annual growth/habitat are illustrative coefficients. Server rooms use a single local file-store process with role credentials, not institutional identity or a deployed internet service. BC geography/calibration is a later authoring stage.
