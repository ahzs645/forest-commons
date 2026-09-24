# Prince George coefficient evidence — 24 September 2026

A web search for published figures behind the Prince George FSR pilot's operational coefficients, and what the pilot now uses. All amounts are nominal CAD.

**Status:** these are sources identified by desk research. No qualified BC forester or reviewer has checked the values or how they are applied. The in-app evidence worksheet therefore marks them *source-identified*, never *reviewed*.

Items marked **(derived)** are calculations from the sources, not published figures. Items marked **(unverified)** came from search summaries or could not be confirmed against the primary document.

## Applied to the pilot

| Coefficient | Before (Québec teaching value) | Now | Basis |
|---|---|---|---|
| SPF sawlog price | 105 | 105 | BC Interior Log Market Report, Jan–Mar 2026: 106.53 $/m³ (range 106–117 in 2024–26) |
| Pulp log price | 58 | 58 | Same report: 57.60 $/m³ (range 54–62) |
| Aspen/poplar price | 68 | 55 **(unverified)** | BC deciduous row is suppressed (too few reporters). Alberta OSB timber dues are 0.53 $/m³, so the price is roughly logging plus haul |
| Birch sawlog price | 105 | 70, fictional specialty outlet | No BC birch market price found |
| Conifer sawlog/pulp split | 70/30 | 75/25 | PG TSA 2017 AAC rationale: about 76% sawlog / 24% non-sawlog |
| Weather schedule | Québec spring sequences | Prince George February–April classes (below) | ECCC 1991–2020 normals, load-restriction dates |
| Crews | 10 × 160 h, $55/h | 4 × 50 h, $800/h system rate | FPInterface PG TSA (1 shift × 10 h); TimberTracks 2022; IAM 2024 |
| Stand productivity | 4.5–8.5 m³/h | 22–45 m³ per scheduled hour | 47–87 m³/PMH feller-buncher, 51–92% utilization (Lakehead 2024) **(derived)** |
| Harvest cost | $15/m³ + wages | $3/m³ + system rate: about $25–30/m³ stump-to-truck **(derived)** | TimberTracks/IAM hourly rates; UNBC studies 11–22 $/m³ |
| Crew relocation | $8/km | $12/km | Lowbed about $244/h (TimberTracks 2022), with return **(derived)** |
| Trucks | 10 × 60 h, 40 m³, $1.85/km + $600/wk | 6 × 55 h, 45 m³, $6/km + $2,000/wk | 8-axle Super B about 43 t payload (FPInnovations TR2017N11); about $225/h all-in (TimberTracks 2022), split **(derived)** |
| Load + unload | 0.6 + 0.4 h | 0.75 + 0.55 h | IAM 2024 §3.2.12.1, 78-minute unavoidable-delay allowance (interpretation) |
| FSR / spur speed | 35 / 15 km/h | 40 / 12 km/h | FPInterface PG TSA class 2–3 speeds (34–48 km/h); IAM in-block 10 loaded / 15 empty |
| Public connector | straight teaching line | real route: Pilot Mountain Rd → Chief Lake Rd → Hwy 97 | OSRM car route over OpenStreetMap, cached in `bc-inputs/pg-connector-osrm` |
| Season demand | 55% of offered volume, 1.0/1.1/0.9 by month | 40% of offered volume (43,560 m³), 1.45/0.85/0.70 by month | Scaled to what six trucks can haul in the weeks break-up leaves open **(derived)** |

### Weather classes (season starting early February)

| Schedule | Weeks 1–12 |
|---|---|
| Typical (normals) | F F F N F N T T T W T W |
| Early break-up (mild winter, as in 2024) | F F N T T T T W W T W W |
| Late, dry break-up | F F F F F N N T T W N N |

F = frozen, N = normal, W = wet, T = thaw. Each schedule's forecast differs from its actual weather in two weeks. FSRs (bearing class 2) close in thaw weeks, standing in for spring load restrictions.

Prince George normals (1991–2020; mean °C, snowfall cm, days with a minimum ≤ 0 °C):

| Month | Mean °C | Snowfall (cm) | Frost days |
|---|---|---|---|
| Feb | −5.4 | 26.3 | 26.4 |
| Mar | −0.7 | 23.7 | 27.0 |
| Apr | 4.9 | 7.7 | 19.2 |

Snow depth at month end is 26 cm (Feb), 12 cm (Mar) and 0 cm (Apr).

## Resulting play

Engine replays, seed 2026, draft plan every week:

| Weather | Cash | Delivered | Targets met |
|---|---|---|---|
| Typical | +388k | 29,303 m³ | 19 / 33 |
| Early break-up | about −26k | 22,032 m³ | 14 / 33 |
| Late, dry break-up | +497k | 29,859 m³ | 19 / 33 |

Buying and bidding on every lot delivered less and ended at a loss, about −477k. Timber bought after the winter haul cannot be moved before break-up. This is a deliberate teaching point.

## Sources

- BC Ministry of Forests, *Interior Log Market Reports* (3-month rolled-up): https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing/interior-log-market-reports
- BC Ministry of Forests, *Major Primary Timber Processing Facilities in BC 2023* (appendix): https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/fibre-mills/appendix_for_2023_mill_list_report-share.xlsx
  - Prince George sawmills: Canfor PG, Carrier, Lakeland/Sinclar.
  - Pulp: Northwood, Intercontinental, PG Pulp & Paper.
  - There is no OSB or panel mill in the district.
  - Northwood's closure was announced on 2026-07-14: https://www.canfor.com/newsroom/2026-07-14/canfor-announces-closure-of-northwood-pulp-mill
- ECCC Canadian Climate Normals 1991–2020, Prince George A / Airport Auto (1096450, 1096453): https://climate.weather.gc.ca/
- TranBC, *Seasonal BC load restrictions* (2022): https://www.tranbc.ca/2022/05/31/seasonal-bc-load-restrictions-answering-trucking-questions/
  - Provincial Fort George area notice: https://www.th.gov.bc.ca/roadreports/lr.asp?filename=dist19.txt
  - City of Prince George start dates come from notice titles **(unverified)**.
- FPInnovations, *Using FPInterface… Prince George TSA* (2018): https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/supporting-innovation/prince_george_tsa.pdf
- FPInnovations TR2017N11, heavier-truck configurations: https://library.fpinnovations.ca/media/FOP/TR2017N11.PDF
- BC Ministry of Forests, *Interior Appraisal Manual 2024*: https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/timber-pricing/interior-timber-pricing/interior-appraisal-manual/iam_2024_master_b.pdf
- TimberTracks, *Forestry Equipment Hourly Rates 2022* (with ILA/TLA): https://www.tla.ca/wp-content/uploads/2022/05/TT-2022-Forestry-Hourly-Rates.pdf
- Subhash, *Evaluating Feller Buncher Performance in Interior BC*, Lakehead University undergraduate thesis (2024): https://knowledgecommons.lakeheadu.ca/bitstreams/c2c33799-68c8-4a3b-82ab-1cdc1f2674f6/download
- Phillips, FERIC *Advantage* 2(21), 2001, cut-to-length in the southern Interior: https://library.fpinnovations.ca/media/FOP/ADV2N21.PDF
- Renzie & Han (UNBC), ground-based costs in ICH stands (2008): https://www.koreascience.or.kr/article/JAKO200822350101567.page
  - Han & Renzie (2005) figures come from abstracts only **(unverified)**.
- *Prince George TSA AAC Rationale* (2017): https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/stewardship/forest-analysis-inventory/tsr-annual-allowable-cut/prince_george_tsa_rationale_2017.pdf
  - Current allowable annual cut is 6,917,231 m³/yr.
- OSRM demo server (car profile) over OpenStreetMap (ODbL). Cached routes and request URLs are in `research/bc-inputs/pg-connector-osrm/manifest.json`.

## Documents supplied or found on 24 September 2026

The user supplied five documents, and a search of the Legislative Library of BC catalogue (searchcollections.llbc.leg.bc.ca) found five more. None of them has changed a game value yet.

### Interior market pricing specifications (2009 and November 2010)

Both specifications give the full equation for the estimated winning bid on an Interior timber sale. The 2009 version was supplied; the November 2010 version was found in the library. Every term is in real dollars per m³ of **coniferous** cruise volume, and deciduous volume is not part of that base.

| Term | 2009 | 2010 |
|---|---|---|
| Constant | 41.74 | 32.85 |
| Selling price index ÷ (CPI ÷ 109.3) | × 0.162 | × 0.152 |
| US$/C$ exchange rate | × −15.93 | × −11.86 |
| Hemlock/balsam fraction | × −19.10 | × −18.91 |
| ln(coniferous volume ÷ 1,000) | × 2.06 | × 1.71 |
| ln(volume per tree) | × 8.22 | × 8.70 |
| 1 ÷ volume per tree | × −0.530 | not used |
| ln(coniferous m³/ha) | not used | × 1.50 |
| Deciduous fraction | × −8.44 | replaced by a flag for competitive deciduous sales |
| Total cycle time (hours) | × −1.37 | × −1.01 |
| District average number of bidders (Prince George) | 3.7 × 0.922 | 3.6 × 0.871 |
| Beetle attack fraction | −6.40 green, −6.05 red/grey | −5.56 total attack |

The equations were tried on the pilot's five auction lots:

- Species, volume per tree and m³/ha came from the cached VRI record, and cycle time from the game's route to the nearest mill.
- Decay was set at 5%, slope at 10%, ground-based clearcut. The VRI shows no dead volume in these stands.
- Hemlock/balsam includes subalpine fir (BL). The 2010 text defines it from hemlock volume, so this may overstate the penalty.
- Lumber values, recovery and CPI are **assumed**, not taken from either specification: 230 fbm/m³ recovery, then either $330/Mbm, 0.88 US$/C$ and CPI 114.7 ("2009-like"), or $520/Mbm, 0.73 US$/C$ and CPI 165 ("2026-like").

| Lot | Volume (m³) | Coniferous | m³ per tree | 2009 equation, 2009-like ($/conifer m³) | 2010 equation, 2009-like ($/conifer m³) | 2010 equation, 2009-like ($ per lot m³) | 2010 equation, 2026-like ($ per lot m³) | Game asking price ($/m³) |
|---|---|---|---|---|---|---|---|---|
| BC19 | 4,626 | 90% | 0.48 | 33.75 | 35.65 | 32.09 | 50.00 | 9.0 |
| BC20 | 5,170 | 75% | 0.82 | 34.67 | 39.71 | 29.79 | 46.05 | 9.0 |
| BC21 | 5,543 | 52% | 0.36 | 20.79 | 27.42 | 14.26 | 22.73 | 9.0 |
| BC22 | 5,574 | 75% | 1.08 | 34.84 | 40.02 | 30.02 | 46.38 | 9.0 |
| BC23 | 8,326 | 90% | 1.18 | 45.24 | 48.12 | 43.31 | 66.14 | 9.0 |

An earlier version of this table spread coniferous value over deciduous volume as well, which understated every lot slightly. The pattern between lots did not change.

What this shows:

- **The totals cannot be compared directly.** The equation estimates the whole winning bid. The game charges a separate premium and then its own stumpage, which comes to roughly 17–19 $/m³ in total. For scale, BC Timber Sales' 2022/23 average billed rate across the province was $60.85/m³.
- **The spread between lots is usable now.** The game prices every lot at a flat 9 $/m³. Per m³ of lot volume, the equation values the small-tree, half-aspen lot (BC21) at about half the typical lot, and the large-tree lot (BC23) about 40% higher. A rival bid that followed these ratios would reward players who read the stand data.
- **Using the equation directly** would need the lumber values, recovery factors and CPI for the same period, plus a revised stumpage model. That is a balance change and has not been made.

### Prince George TSA timber supply review data package (April 2015)

This is the Prince George TSA's own set of analysis inputs, found in the library.

- **Utilization:** pine 12.5 cm minimum dbh; other species 17.5 cm; 30 cm maximum stump; 10 cm minimum top (15 cm for cedar older than 141 years).
- **Minimum merchantable stand, net volume:**
  - 182 m³/ha for stands not affected by the beetle;
  - 140 m³/ha for beetle-affected pine-leading stands;
  - taken from 30 years of appraisal data. The first percentile was 153 m³/ha for pine-leading stands and 186 m³/ha for others.
- **Recent net volumes:** the median for pine-leading cutting permits fell from about 280 m³/ha (2008) to 240 m³/ha (2013).
- **Decay, waste and breakage:** built into the model's natural-stand yield curves. Managed stands lose up to 5% by age 100 (OAF2).
- **Stand types excluded** as uneconomic:
  - hemlock-leading, black spruce-leading and non-commercial deciduous stands;
  - deciduous-leading stands in Vanderhoof District.
  - Stands over 80% balsam are handled separately: balsam-leading stands are 22% of the area but only 1.6% of the harvest.
- **Deciduous:** 160,000 m³/yr of the cut was set aside for deciduous stands in 2011. By 2015 every deciduous licence had expired, with no significant deciduous-leading harvest since.
- **Haul limit:** historic harvesting stops at a cycle-time index of about 22.1 hours.
- **In-block retention:** a median of 12.1% of stand area.

Checked against the pilot:

- **Merchantability:** the pilot counts a stand at 60 m³/ha of gross VRI volume. A 140 m³/ha floor would drop one offered stand, the 110.6 m³/ha stand that is 65% aspen. A 182 m³/ha floor would also drop the 161.9 m³/ha stand. The data package's floors apply to net volume, so they would bite harder on gross VRI figures.
- **Aspen:** the aspen/poplar outlet is fictional, and the data package confirms there is no current deciduous market in the TSA.
- **Retention:** the pilot takes no retention off harvest volume. Taking off 12.1% would lower every stand's volume.

### 2016 Prince George TSA timber supply analysis discussion paper

- The base case starts at 10.1 million m³/yr.
- The harvest request includes deciduous-leading stands at 4% of the total.
- Sawlog shelf life of dead pine is assumed to decline exponentially.

### BC Timber Sales performance reports (2014/15 Q1, 2018/19 Q3, annual 2022/23)

- BCTS sells timber partly to supply price data for the market pricing system.
- **2018/19, April to December:**
  - Prince George business area sold 1.09 million m³ against a 1.36 million target (−20%);
  - Stuart–Nechako sold 0.79 million against 1.22 million (−36%).
- **2014/15 Q1:** BCTS advertised 4.1% of the projected provincial harvest against a 4.6% target.
- **2022/23:**
  - the North Interior sold 0.9 million m³ against 2.4 million;
  - the average billed rate across the province was $60.85/m³;
  - developed timber cost $12.30/m³, and access $11.29/m³ sold.

These figures give context for the auction share and price level only. The pilot's 5 auction lots out of 19 offered are a teaching ratio.

### Cranbrook TSA timber supply analysis report v3 (2004)

This report comes from another district, so it is a cross-check only. The Prince George data package above supersedes it for the pilot.

- Utilization is a 17.5 cm minimum dbh (12.5 cm for lodgepole pine), a 30 cm maximum stump and a 10 cm minimum top.
- Managed stands lose 15% (OAF1) and a further 5–10.8% (OAF2).
- The minimum harvestable stand is 150 m³/ha, or 100 m³/ha for pine on slopes under 40%.

### Library holdings still to read

- Interior Appraisal Manual, 2017 and July 2019 editions: https://www.llbc.leg.bc.ca/public/pubdocs/bcdocs2019_2/696139/iam_july_2019_master.pdf
- Interior market pricing system, 2006: the tenure obligation adjustments and specified operations components.
- *An assessment of the strategic importance of the hardwood resource in British Columbia* (1994): https://www.llbc.leg.bc.ca/public/pubdocs/bcdocs2012_2/183356/frr221.pdf
- *Paper birch managers' handbook for British Columbia* (1997): https://www.llbc.leg.bc.ca/public/pubdocs/bcdocs2012_2/305246/frr271_1.pdf
- *Cubic foot log-scaling and lumber-recovery studies in the Prince George Forest District* (1954): too old for current recovery.
- BC Timber Sales annual performance reports, 2013/14 to 2022/23.

Not in the catalogue: the Interior Logging Cost Report, Interior Log Market Reports, published market pricing parameters (lumber values, CPI) and load-restriction notices.

## Sources for this section

- Prince George TSA data package (2015): https://www.llbc.leg.bc.ca/public/pubdocs/bcdocs2018_2/688303/prince_george_tsa_data_package.pdf
- Prince George TSA discussion paper (2016): https://www.llbc.leg.bc.ca/public/pubdocs/bcdocs2016/595458/24tspdp16_final.pdf
- *Specifications: the Interior market pricing system* (November 2010): https://www.llbc.leg.bc.ca/public/pubdocs/bcdocs2011/469332/mps-interior-spec.pdf
- *Specifications: calculation of the Interior average market price* (July 2009): https://www.llbc.leg.bc.ca/public/PubDocs/bcdocs/459169/Specs-InteriorAMV-Jul09.pdf
- BC Timber Sales annual performance report 2022/23: https://www.llbc.leg.bc.ca/public/PubDocs/bcdocs2024/736594/736594_BCTimber_Annual_Performance_Report_2022_23.pdf

## Still missing

- **Grapple skidder and processor productivity for Prince George:** literature ranges were too wide to use, so a system rate stands in.
- **A current stump-to-truck average:** the Interior Logging Cost Report data is confidential.
- **Tonnes-to-m³ conversion** for loads.
- **Deciduous prices and birch recovery.**
- **Lumber values, recovery factors and CPI** for the same period as the 2010 bid equation.
- **Exact break-up dates** for the FSRs themselves.
- **Qualified review** of every item above before the scenario is described as calibrated.
