# BC pilot independent playthrough and integration review

Three agents worked independently: operating campaigns; cooperative dispatch and linked stewardship; interface/source-clarity review. The first two exercised the actual simulation APIs, not independent browser users. The interface agent reviewed source; the primary task performed browser checks.

## Findings implemented

- Fixed Draft plan rounding down residual available truckloads. It now dispatches accepted residual stock above its existing half-load threshold, while retaining commitment caps. A regression reproduced the failure before the fix.
- Fixed network case creation silently returning fewer companies than requested when a regional package lacked the requested mills/trucks. It now reports the unavailable size.
- Added clickable/searchable road segments, including FSR identifiers, length, model speed/bearing, forecast access and known disruption information. Revealed closed roads stay visible in red instead of disappearing from the map.
- Added a collapsible ownership/access/route legend.
- Added a phone-sized-layout action to reveal and focus the selected feature inspector.
- Added optional validated stand source notes, populated in the BC preset with the real-area versus modelled-volume distinction. Removed the misleading “training hectares” label.
- Distinguished active campaign from studio selection, named the proposed region/weather before replacement, and updated the studio description for both available presets.

## Independent results

Operating policy used current-state/forecast information, private procurement and monthly planning. It did not inspect future actual weather or auction seeds. All three 12-week campaigns conserved timber and cash at every step:

| Schedule | Delivered m³ | Waste m³ | Closing CAD |
|---|---:|---:|---:|
| Normal | 21,773 | 3,365 | 1,637,911 |
| Long thaw | 20,150 | 4,988 | 1,380,125 |
| Dry | 21,773 | 3,365 | 1,638,964 |

These baseline policies did not achieve the 30,000 m³ delivery challenge. No objective was lowered to make them pass. The current draft remains a heuristic, with deliberate minimum-load and scheduling limits.

The linked thinning season harvested 9,121.35 m³ and ended with CAD 383,612.11; annual settlement, reload, next-year opening and treatment cooldown were exercised. A thirty-year annual run exercised final cuts, planting, growth and state validation. This is model-function evidence, not ecological calibration.

Five-company BC network exercise: independent CAD 9,994.24 versus pooled CAD 9,497.12, with every shipment accounted for and unanimous cost allocation. This is the separately labelled network lab, not a withdrawal from campaign stock.

## Integrated verification

**114 tests pass across 25 files** (`npm test -- --maxWorkers=1`, 63.21 seconds). Production build passes. Existing bundle-size advisories remain.

Browser checks on the existing completed BC campaign verified road search for FSR 7695, selected segment detail (1.22 km, 35 km/h model speed, bearing class 2), legend expansion, and the mobile jump focusing “Selected map feature.” At 390×844, document width and scrollWidth both equal 390; no console errors were reported. The viewport was reset. Campaign cash/week and saved regional parameters were not changed by these interface checks.

One review observation needs careful interpretation: the planning supply balance is terrain-accessible standing potential, not route-feasible deliveries. Its explanatory text already states road closures, treatment and fleet constraints may reduce deliveries. It must not be presented as a guaranteed dispatch quantity; a future separate road-reachable estimate would be useful.

Per-stand source notes are present in newly loaded BC presets; existing embedded saves retain their original regional metadata. Professional BC calibration and public deployment remain separate work.
