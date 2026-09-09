# Forest Commons browser verification · 7 September 2026

The device was unlocked and the current Vite app was exercised in Chrome through the supported CUA browser interface. This supersedes the earlier locked-device verification blocker.

## Defects found and fixed

1. **Blank map:** the lazily loaded MapLibre stylesheet overrode the host container's positioning, leaving it at zero height. A scoped host rule now preserves its absolute positioning and full height. Real basemap, road overlays, labels and fleet positions were visibly verified afterward.
2. **Unhidden upload input:** generic input styling overrode the HTML hidden attribute. Hidden app controls now stay hidden.
3. **Mobile treatment selector overflow:** at the narrow viewport, the production queue compressed its treatment select off-screen and increased document width. Mobile queue orders now use an explicit grid. Overview, production and transport all subsequently reported document width equal to viewport client width (375 CSS pixels with the scrollbar in the 390px override). The override was reset afterward.
4. **Full-season persistence failure:** repeated coordinate arrays for each truck load and week exceeded localStorage capacity. Reload initially recovered only week 6. The exported completed season was preserved. Saves now deduplicate route paths into a versioned envelope, and imports support both that format and existing v2 saves. The actual completed-season file fell from 32,553,738 bytes (old pretty JSON) to 2,262,399 bytes (packed JSON). Import and reload then restored CAMPAIGN COMPLETE, the same cash/delivery totals, and week-one historical routes. No progress was silently declared preserved before this reload check succeeded.

## Workflows exercised

- Existing campaign export; latest Québec preset load; new-campaign confirmation.
- Draft planning and the forecast rehearsal; ten crews/trucks assigned.
- Crew-one commercial thinning selection and actual first-week production.
- Direct map-label selection of Q02 updated the supply inspector; route-layer toggle, fit district and basemap-theme control worked.
- Q01 access investment: CAD 15,021 displayed cost; Q11 private timber purchase: CAD 72,000. Cash and ownership updated.
- Q21 sealed bid CAD 60,000; week-one auction win; week-two refusal returned CAD 54,000 and left the guarantee paid.
- First-week actual report: about 9,521 m³ harvested and 5,887 m³ delivered, with resource hours, auction note, signed ledger and actual routes.
- Pair-round coalition partition, frozen offer and all five local company acceptances; Proposal 1 reached agreed and persisted after reload.
- Partner backhaul setting; three-role readiness gate blocked advancement until all roles were ready.
- Truck queue reordering visibly changed the first source.
- All twelve operating weeks through both monthly transitions, seasonal closures, deterioration and terminal settlement.
- Historical report selection; complete-season export/import/reload; regional scenario export/import validation.
- New campaign after completion; month-one commitment editing updated the remaining target, then restored to its default.
- Final browser error log was empty. The app was left on a fresh week-one overview with the default viewport restored.

## Completed test-season outcome

Delivered: approximately **53,460 m³**. Harvested: **58,660 m³**. Closing cash: **CAD 2,999,415**. Net result: **CAD 2,349,415**. Commitments achieved: **6 / 30**. Expired inventory: approximately **4,405 m³**. The scorecard correctly separated financial success from the missed service challenge.

The run used mostly the draft heuristic with deliberate procurement, thinning, refusal and cooperation actions. It is a workflow verification, not an optimized strategy or a calibrated real-world business forecast.

## Code verification

Production build passes. **33 automated checks pass** across four test files, including three full weather campaigns, a renamed regional/product package, timber/cash invariants, treatment/negotiation behavior, and compact-save roundtrip/size/reference checks.

## Artifacts

- Original pre-review week-one export: `/Users/ahmadjalil/Downloads/forest-campaign-week-1.json`
- Preserved original completed-season export: `/Users/ahmadjalil/Downloads/forest-campaign-week-13.json`
- Compact completed-season export: `/Users/ahmadjalil/Downloads/forest-campaign-week-13 (1).json`
- Exported regional package: `/Users/ahmadjalil/Downloads/quebec-lac-saint-jean-scenario.json`

These results verify the current local teaching game. Networked multiplayer, calibrated ecology, actual cooperative network optimization and a BC dataset remain explicitly distinct future extensions; the app does not claim to implement them.
