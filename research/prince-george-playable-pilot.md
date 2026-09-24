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
- **Merchantability** (superseded by the TSA rules below): stands below 60 m³/ha were not offered and were labelled *Not merchantable (VRI)*:
  - BC05, black spruce, 0 m³/ha;
  - BC10, 30 years old, 4 m³/ha;
  - BC15, 40 m³/ha;
  - BC18, 44 m³/ha.

  BC24 stays the conservation area. The 19 offered stands were ranked in source order: eight secured, six private and five at auction (weeks 1, 3, 5, 7 and 9).
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
- **Demand:** 40% of the offered volume (43,560 m³), weighted towards the February winter haul; the delivery objective is 22,000 m³. After the TSA rules below, the 43,560 m³ total is kept and split by product.

Every sourced item is recorded as *source-identified* in the in-app evidence worksheet. None is marked reviewed.

Engine replays (seed 2026, draft plan every week):

| Weather | Delivered | Targets met | Closing cash |
|---|---|---|---|
| Typical | 29,303 m³ | 19/33 | CAD 1,038,496 |
| Early break-up | 22,032 m³ | 14/33 | CAD 623,964 |
| Late, dry break-up | 29,859 m³ | 19/33 | CAD 1,147,110 |

Buying and bidding on every lot delivers less and ends below the starting cash, because timber bought after the winter haul cannot be moved before break-up.

## Prince George TSA rules and lot prices (24 September 2026)

Three changes use documents found in the Legislative Library of BC (see the [evidence notes](bc-coefficient-evidence-2026-09-24.md)).

### What changed

- **Minimum stand volume.** A stand is offered only at or above the Prince George TSA minimums from the April 2015 timber supply review data package: 140 m³/ha when pine-leading, 182 m³/ha otherwise.
  - No offered stand is pine-leading, so 182 applies throughout.
  - Two more stands drop out: BC01 (110.6 m³/ha, aspen-leading) and BC04 (161.9 m³/ha).
  - Unoffered stands show *Below 182 m³/ha (TSA minimum)* (or 140), in English and French.
  - The data package applies these minimums to net appraisal volumes. The pilot applies them to VRI projections, which are not net.
- **Retention.** The game already makes every plan leave a share of each stand standing. Its minimum for this scenario is now 12.1%, the TSA's median stand-level retention for 2006–2014 (it was Québec's 10%). Stand volumes themselves are unchanged.
- **Lot prices from the 2010 bid equation.**
  - `src/scenarios/interior-bid-equation.ts` implements the Interior market pricing system's estimated winning bid (November 2010 coefficients).
  - Each stand feeds it from its VRI record: conifer share, hemlock and balsam share, cedar, m³/ha, volume per tree (volume ÷ `VRI_LIVE_STEMS_PER_HA`, now copied by the extract script) and lot volume. Cycle time comes from the road network to the nearest yard, and the Prince George average of 3.6 bidders is used.
  - Market inputs are assumed, so only the ratio between lots is used. Offered timber still averages about 9 $/m³ (8.89 after clamping), with each lot between 0.4× and 1.8× of that.
  - Rival bids stay the engine's 86–121% of the asking price, so they now follow the lot's value too.
- **Supply ranking.** 17 stands are offered, ranked in source order: the last five go to auction (weeks 1, 3, 5, 7 and 9), the five before them are private, and the first seven are secured. (Superseded below: four secured, eight private.)
- **Demand** stays at 43,560 m³ for the season, the level sized to six trucks. It is split by product in proportion to the offered volume. Holding it at 40% of the smaller offered volume would have cut it by 16% although the fleet is unchanged.

### Lot prices

| Lot | Supply | Volume (m³) | Estimated bid ($/m³) | Asking ($/m³) |
|---|---|---|---|---|
| BC03 | Secured | 10,386 | 15 | 3.87 |
| BC12 | Private | 3,978 | 17 | 4.34 |
| BC21 | Auction, week 5 | 5,543 | 23 | 5.82 |
| BC16 | Private | 3,677 | 34 | 8.76 |
| BC20 | Auction, week 3 | 5,170 | 46 | 11.80 |
| BC22 | Auction, week 7 | 5,574 | 46 | 11.88 |
| BC19 | Auction, week 1 | 4,626 | 50 | 12.81 |
| BC11 | Secured | 6,752 | 66 | 16.20 (upper limit) |
| BC23 | Auction, week 9 | 8,326 | 66 | 16.20 (upper limit) |

- Birch- and balsam-heavy stands are priced lowest, because the equation gives deciduous volume no value and penalizes balsam.
- Large-tree spruce and fir stands are priced highest.

### How it plays

Engine replays over seeds 1–10:

- The automatic draft plan has no random element, so it gives the same result for every seed.
- Seeds change only rival bids.
- "Flat" bids 10 $/m³ on every lot; "read" bids 110% of the asking price. Both also buy every private lot while cash allows.

| Plan | Weather | Before: cash change | After: cash change | Before: delivered / targets | After: delivered / targets |
|---|---|---|---|---|---|
| Draft only | Typical | +388,496 | +419,743 | 29,303 m³ / 19 of 33 | 27,706 m³ / 15 of 33 |
| Draft only | Early break-up | −26,036 | +139,498 | 22,032 m³ / 14 | 21,917 m³ / 13 |
| Draft only | Late, dry | +497,110 | +560,350 | 29,859 m³ / 19 | 29,981 m³ / 19 |
| Flat bids | Typical (median) | −340,735 | −62,454 | 4 lots won | 2 lots won |
| Read bids | Typical (median) | −338,644 | −191,979 | 4 lots won | 4 lots won |

Closing cash for the draft plan is CAD 1,069,743 (typical), 789,498 (early break-up) and 1,210,350 (late, dry).

What this shows:

- **Rival bids now respond to lot value.**
  - Before, a flat 10 $/m³ bid won four of five lots and played identically to reading the asking price.
  - Now it wins only BC21, the cheapest lot, and BC22, in every seed. In the median seed it loses both BC19 and BC23, the most valuable lots.
  - Bidding from the asking price wins four.
- **Buying timber still loses money** in every weather. Timber bought after the winter haul cannot be moved before break-up, as before.
- **Monthly targets are harder under typical weather** (15 of 33, from 19). The secured stands are mostly birch–balsam mixedwood, so the draft cuts more pulp and less sawlog than the mills ask for.
- **Early break-up is very sensitive to which stands are secured.**
  - An intermediate version took retention out of stand volumes instead of using the plan minimum. The same weather then ended at −232,022, or −285,790 with demand also cut to 40% of offered volume.
  - In the −232,022 run, sawlog buyers got 8,943 of 21,920 m³, while pulp overflowed and decayed at the roadside during the thaw.
  - Choosing which secured stands to cut in the three winter weeks matters more than before.

The guided lesson is unchanged: its replay is identical (5,051 m³ delivered, 16 of 24 targets).

## Buying, planning signals and lot explanations (24 September 2026)

### Why buying never paid

With seven secured stands, targeted purchases still lost money in every weather:

| Plan (typical weather) | Cash change |
|---|---|
| No buying | +394,176 |
| Buy BC17 in week 1 | +168,418 |
| Win BC19 at 125% | +132,862 |

The secured stands held about 41,000 m³ above retention, but six trucks deliver only about 28,000–31,000 m³ a season. Bought wood took truck time from wood already owned, so the purchase price and extra harvest cost were pure loss.

### What changed

- **Four secured stands** (BC02, BC03, BC06 and BC07, all birch–balsam mixedwood) hold about 26,000 m³ above retention, less than the fleet can move.
- **Eight private and five auction lots.** BC08, BC09 and BC11, the sawlog-rich stands, are now for sale.
- **Permit teaching cases kept.** BC07 starts without a cutting permit and BC06's permit lapses after six weeks.
  - These roles were tied to source positions 8–10, which are now private. `bcTeachingTenure` now takes the stands by name.
  - The guided lesson keeps its default, and its replay is unchanged.

### Replays

Seed 2026, draft plan every week, applying for permits on owned stands:

| Plan | Typical | Early break-up | Late, dry |
|---|---|---|---|
| No buying | +325,437 | −131,083 | +349,090 |
| Buy BC11 | **+422,544** | −203,552 | +431,170 |
| Buy BC11 and BC08 | +354,295 | **+60,175** | +494,901 |
| Buy BC11 and BC08, win BC23 at 130% | +301,006 | −100,001 | **+650,563** |
| Buy every private lot | +2,842 | −598,401 | +119,745 |

- The right amount to buy now depends on the weather.
- Buying everything still loses money in every weather.
- With no buying, 23,397 m³ is delivered in typical weather, just above the 22,000 m³ delivery objective.

### New interface signals (all scenarios)

- **Haul-window warning** in the plan review and draft review. It flags any stand this turn's crews cut when no road to a buyer is forecast open in time: before its sawlogs become pulp (3 turns) or its pulp becomes waste (4 turns). It uses the published forecast only.
  - In Prince George early break-up it fires in weeks 4–6.
  - In the guided lesson it fires in weeks 6–7, on BC04.
- **Season outlook by product** on the Planning desk: buyers' remaining demand, roadside stock, secured standing volume above retention, the shortfall or surplus, and what is still offered to buy.
  - At the start of Prince George, sawlog is short by about 12,300 m³ against 36,500 m³ on offer.
- **Why this asking price** in the lot appraisal: each bid-equation attribute's effect against the district average, largest first.
  - BC21: aspen and birch share 48% (district 33%), −1.91 $/m³; volume per tree 0.36 m³ (district 0.59), −0.89 $/m³.

### Appraisal fix

The lot appraisal routed only over roads already authorized. A lot not yet owned, whose access road still needed a permit, showed no route to any buyer, and its margin equalled minus the price in every weather. BC21 showed −32,274.

It now values a lot as if its own access road were authorized, because the buyer applies for that permit after acquiring the lot. It still excludes fleet capacity and competition for demand, as its text says.

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
