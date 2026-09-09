# Prince George FSR teaching pilot

## Implemented

Scenario studio now offers Québec and **Prince George FSR pilot, British Columbia**. Selecting a preset edits studio state only; starting a campaign remains an explicit action. Existing embedded region saves are not silently updated. The existing Québec week-five campaign was exported before the BC browser playthrough.

The BC package includes 24 whole, single-ring VRI inventory polygons, seven fictional receiving yards, ten crews, ten trucks, five teaching assortments and a twelve-week season. Source inventory FEATURE_ID identifiers are retained in stand labels. Multi-part polygons and polygons containing holes were excluded rather than flattened inaccurately.

The connected mapped road component contains **83.2044 km** from:

- FSR 7695 section 01
- FSR 7695 section 02
- FSR 7727 section 03

These are from the [BC Forest Tenure Road Segment Lines catalogue](https://catalogue.data.gov.bc.ca/dataset/9e5bfa62-2339-445e-bf67-81657180c682), explicitly classified Forest Service Road (B40) with ACTIVE lifecycle status at collection. The query returned 11 features; three share a source-vertex-connected component serving the selected inventory. No artificial links between disconnected FSR components were introduced. Source vertices are joined at five-decimal coordinate precision, approximately one metre. Original intermediate geometry is preserved; distances are measured along it. The game graph has 69 nodes and 68 edges, including 24 labelled model access spurs.

Inventory came from [VRI 2025 Rank 1](https://catalogue.data.gov.bc.ca/dataset/2ebb35d8-c82f-4a17-9c96-612ac3532d55). The new corridor snapshot contains 989 inventory features and 25 tenure-road features. The separate FSR query supplies the actual road classification filter. Request URLs, source metadata and FSR checksums are in `bc-inputs/`. Both bundled geometry datasets have the Open Government Licence – British Columbia; the map and source panel retain attribution. Access Only DRA/mill geometry was not bundled.

## Teaching assumptions

Source geometry does not establish a right to harvest, current road access or bridge capacity. Road speeds and bearing classes, forest spurs, receiving-yard locations, product recovery, weather, prices, equipment and ecological coefficients are authored teaching values. Supply categories and refusal/auction mechanics are instructional rules, not a representation of BC tenure law. The forest density is explicitly **120 m³/ha**, not a silently misinterpreted VRI utilization field. Current professional calibration status stays unreviewed.

The pilot reuses the existing operating mechanisms and optional annual model. A new BC yield model, actual mill capacity, restrictions and local procurement terms are outside the claims of this teaching preset.

## Verification

- **106 tests pass across 22 files**, including three complete BC weather campaigns with per-week stock/cash conservation, saved-region checks, terminal-state checks and packed-save size bounds.
- Production build passes. Existing map/application bundle-size advisories remain.
- Browser Scenario studio selection, correct source/forecast preview and first-week operation verified. The preview previously showed current-campaign sources after switching the selected region; this was corrected.
- Complete twelve-week BC browser campaign: **19,712 m³ delivered**, **CAD 1,075,764 closing cash**, seed 2026, normal weather, repeated forecast draft. This is evidence of operability, not an optimal strategy; the 30,000 m³ delivery challenge was not met.
- The full browser season exposed a localStorage quota failure. Packed-save version 3 now shares exact coordinate pairs across distinct paths, polygons and road geometry. No coordinate rounding or route-distance change is introduced. Version 1/2 and raw saves remain readable, with invalid dictionary/index tests.
- The completed exported save is **2,533,582 UTF-16 bytes**. It imported and survived a browser reload with the same season-end cash and delivered volume. The old quota notice disappeared after reload. Export: `/Users/ahmadjalil/Downloads/forest-campaign-week-13 (2).json`.
- Phone viewport 390×844 had clientWidth = scrollWidth = 390, a visible map and stacked inspector. No browser console errors. Temporary viewport reset after checking.

## Rebuild

From `forestry-game`, run `python3 scripts/build-prince-george.py` to regenerate `src/data/prince-george.json` from the cached FSR and corridor VRI snapshots. `scripts/collect-bc-inputs.py OUTPUT west south east north` collects a new bounded evidence snapshot without overwriting an old one. The FSR filter request itself is retained in `research/bc-inputs/fsr-prince-george.request.txt` for review/recollection. Recheck metadata and licence before using newer source data.
