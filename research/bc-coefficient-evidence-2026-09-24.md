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

## Still missing

- **Grapple skidder and processor productivity for Prince George:** literature ranges were too wide to use, so a system rate stands in.
- **A current stump-to-truck average:** the Interior Logging Cost Report data is confidential.
- **Tonnes-to-m³ conversion** for loads, and **decay/waste/breakage factors** for VRI volumes.
- **Deciduous prices and birch recovery.**
- **Exact break-up dates** for the FSRs themselves.
- **Qualified review** of every item above before the scenario is described as calibrated.
