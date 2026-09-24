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

Source geometry does not establish a right to harvest, current road access or bridge capacity. Road speeds and bearing classes, forest spurs, receiving-yard locations, the species-to-product split, weather, prices, equipment and ecological coefficients are authored teaching values. Supply categories and refusal/auction mechanics are instructional rules; BC tenure is modelled separately in `BC-TENURE.md`. Stand volume, species and age now come from VRI (see *Data-driven rebuild* below); the original 120 m³/ha density applied until 24 September 2026. Current professional calibration status stays unreviewed.

The pilot reuses the existing operating mechanisms and optional annual model. A new BC yield model, actual mill capacity, restrictions and local procurement terms are outside the claims of this teaching preset.

## Data-driven rebuild (24 September 2026)

Two problems made the first preset hard to learn from. Its seven yards were placed by node-list index, so five sat 0–1 km from the stands and hauling to them was nearly free. Its demand was Québec's product mix scaled by 0.7: 14,700 m³ of hardwood sawlog demand against 3,044 m³ in the district. With active purchasing and bidding, 32% of the harvest expired and 14 of 30 monthly targets were met.

`scripts/extract-prince-george-vri.py` copies each stand's VRI attributes from the cached snapshot into `src/data/prince-george-vri.json`, with no network request. The copied fields are FEATURE_ID, LIVE_STAND_VOLUME_175, DEAD_STAND_VOLUME_175, PROJ_AGE_1, BCLCS_LEVEL_4 and species codes and percentages. `src/scenarios/prince-george.ts` then derives:

- **Volume:** projected live volume at 17.5 cm × polygon area. District total 117,458 m³, against 60,871 m³ at 120 m³/ha. This is an inventory projection with no decay, waste or breakage deduction, not a cruise.
- **Merchantability:** stands below 60 m³/ha are not offered and are labelled *Not merchantable (VRI)*:
  - BC05, black spruce, 0 m³/ha;
  - BC10, 30 years old, 4 m³/ha;
  - BC15, 40 m³/ha;
  - BC18, 44 m³/ha.

  BC24 stays the conservation area. The 19 offered stands are ranked in source order: eight secured, six private and five at auction (weeks 1, 3, 5, 7 and 9).
- **Product mix (teaching mapping):**
  - Conifers (SX, BL, FDI, PLI, SB and others) split 70/30 between sawlog and pulp.
  - Paper birch (EP) splits 15/85 between hardwood sawlog and hardwood pulp.
  - Aspen and cottonwood (AT, AC) go to the poplar/panel assortment.

  The district is about one-third hardwood, mostly birch.
- **Productivity (teaching assumption):** 3 + (m³/ha ÷ 70) m³/h, limited to 4.5–8.5.
- **Receiving businesses:** the mapped network ends about 13 km short of Prince George.
  - A labelled teaching connector (public road, bearing class 1, 70 km/h, straight-line distance × 1.3) runs from the southern FSR exit, `bc-road-30`, to a modelled mill district with five fictional businesses: sawmills A and B, pulp mills A and B, and a panel plant. They are about 19–22 km from the stands.
  - Two fictional yards sit at the northern network ends, 27 km and 61 km away, and pay CAD 6–10 more per m³.
  - Public connector roads need no FSR road-use permit.
- **Demand:** 55% of the offered volume of each product over the season, split across the yards that buy it, with the monthly pattern 1.0 / 1.1 / 0.9. The season total is 59,910 m³. The delivery objective is half the demand, 30,000 m³.
- **Starting positions:** crews start at landings inside the stand block and trucks at the yards. Québec's numerical temperature curves are no longer attached; the frozen, thaw and wet access schedules remain.

The authored operating lesson is built from this pilot. It keeps its previous supply categories, tenure, single zone, yard nodes, map view and roads, so its region definition is unchanged apart from a corrected source note.

Engine replays (seed 2026, normal weather, draft plan every week), before → after:

- **Draft only:** 35,365 m³ delivered and 526 m³ waste. Supply runs out mid-season unless timber is bought.
- **Active play** (permits, purchases, 125% auction bids): delivered 33,638 → 54,230 m³; targets met 14/30 → 29/33. Waste of 18,248 m³ remains because the draft keeps harvesting after a month's demand is filled.

Saves: longer hauls roughly doubled the stored route geometry. Save format 4 writes consecutive dictionary indices as runs, which shrinks a full-season Prince George save from 1.98M to 0.88M characters. Formats 1–3 remain readable.

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
