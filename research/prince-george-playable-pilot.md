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
  - Conifers (SX, BL, FDI, PLI, SB and others) split 75/25 between sawlog and pulp (70/30 until the 24 September evidence pass; see below).
  - Paper birch (EP) splits 15/85 between hardwood sawlog and hardwood pulp.
  - Aspen and cottonwood (AT, AC) go to the poplar/panel assortment.

  The district is about one-third hardwood, mostly birch.
- **Productivity:** superseded by the evidence pass below.
- **Receiving businesses:** the mapped network ends at Pilot Mountain Road, north of Prince George.
  - The connector now follows real public roads, taken from cached OSRM car routes (`research/bc-inputs/pg-connector-osrm/`, built by `scripts/build-prince-george-connector.py`, OpenStreetMap ODbL). The route is Pilot Mountain Road → Chief Lake Road → John Hart Highway (BC 97): 15.2 km to a junction in the city.
  - Street routes of 3.0–7.9 km then lead to five fictional businesses in general industrial areas: sawmills A and B, pulp mills A and B, and a panel plant. They are 20–26 km from the stands.
  - Edge speed is the OSRM car average, capped at 70 km/h for loaded trucks. It is not a certified heavy-truck route or a permitted haul.
  - Two fictional yards sit at the northern network ends, 27 km and 61 km away, and pay CAD 6–10 more per m³.
  - Public connector roads need no FSR road-use permit.
- **Demand:** superseded by the evidence pass below. At the rebuild it was 55% of the offered volume of each product, 59,910 m³ in the season, with a 30,000 m³ delivery objective.
- **Starting positions:** crews start at landings inside the stand block and trucks at the yards. Québec's numerical temperature curves are no longer attached.

The authored operating lesson is built from this pilot. It keeps its own tenure, single zone, yard nodes, map view and roads.

Its ten cases now take species, age and live volume (17.5 cm) from each stand's VRI record, and its product split uses the pilot mapping. Two cases moved to stands whose inventory fits them:
- The commercial-thinning case moved from BC05 (black spruce, 0 m³/ha) to BC15 (35-year pine–spruce).
- The BC Timber Sales acquisition case moved from BC18 (44 m³/ha) to BC20 (168-year spruce).

The titles follow the inventory (for example, BC01 is an aspen–pine winter-access case). Yard intake keeps each yard's outlets and 2,200 m³ per month, split by the offered product mix. Net treatment area, systems, operating windows, layout timing and retention remain authored settings.

In a draft-only replay, the rebuilt lesson delivers 5,126 m³ (previously 4,483), wastes 1,454 m³ (previously 2,372) and meets 16 of 24 targets (previously 14).

Engine replays (seed 2026, normal weather, draft plan every week), before → after:

- **Draft only:** 35,365 m³ delivered and 526 m³ waste. Supply runs out mid-season unless timber is bought.
- **Active play** (permits, purchases, 125% auction bids): delivered 33,638 → 54,230 m³; targets met 14/30 → 29/33. Waste of 18,248 m³ remains because the draft keeps harvesting after a month's demand is filled.

Saves: longer hauls roughly doubled the stored route geometry. Save format 4 writes consecutive dictionary indices as runs, which shrinks a full-season Prince George save from 1.98M to 0.88M characters. Formats 1–3 remain readable.

## Evidence pass (24 September 2026)

A desk search for published BC figures replaced the Québec operating values; see [coefficient evidence](bc-coefficient-evidence-2026-09-24.md). The pilot now uses:

- **Crews:** four full-tree crews on single 10-hour shifts at a CAD 800/h system rate. Stand productivity is 22–45 m³ per scheduled hour, and stump-to-truck works out to about CAD 25–30/m³.
- **Trucks:** six 8-axle B-trains carrying 45 m³, with 1.3 h of terminal time per cycle.
- **Speeds:** FSR 40 km/h and spurs 12 km/h.
- **Products and prices:** the conifer split is 75/25. Log prices follow the Interior Log Market Report, and the aspen and birch prices are marked unverified or fictional.
- **Weather:** Prince George February–April schedules built from the 1991–2020 normals and load-restriction timing.
- **Demand:** 40% of the offered volume (43,560 m³), weighted towards the February winter haul; the delivery objective is 22,000 m³.

Every sourced item is recorded as *source-identified* in the in-app evidence worksheet. None is marked reviewed.

Engine replays (seed 2026, draft plan every week):

| Weather | Delivered | Targets met | Closing cash |
|---|---|---|---|
| Typical | 29,303 m³ | 19/33 | CAD 1,038,496 |
| Early break-up | 22,032 m³ | 14/33 | CAD 623,964 |
| Late, dry break-up | 29,859 m³ | 19/33 | CAD 1,147,110 |

Buying and bidding on every lot delivers less and ends below the starting cash, because timber bought after the winter haul cannot be moved before break-up.

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
