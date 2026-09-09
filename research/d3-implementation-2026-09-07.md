# React + D3 implementation pass — 2026-09-07

This pass implements the previously listed visualization and crew-scheduling gaps. It does not claim an exhaustive pixel-for-pixel recreation of every original screen or meteorological/forestry validation of teaching coefficients.

## React/D3 approach

Reviewed the public [React Graph Gallery course outline](https://www.react-graph-gallery.com/react-d3-dataviz-course) and [D3 scales](https://d3js.org/d3-scale/linear) / [areas](https://d3js.org/d3-shape/area) documentation. No paid course content was accessed. React owns DOM and interaction; D3 provides scales, line/area generators, stacking, band layouts, color scales and nearest-point lookup. The shared time-series component observes container size, offers mouse and keyboard inspection, legends, units and an accessible data table. Operations reports load lazily.

## Delivered

- **Production calendar:** independently saved future-week crew queues, rest overrides, carry-forward reset, reorder/remove/append. Sparse overrides activate on week advance and in rehearsal. Production-role classroom drafts submit atomically with existing optimistic revisions. Invalid future inputs are rejected at import, room mutation and direct advance.
- **Exact production intervals:** newly settled weeks record stand, crew, treatment, elapsed interval, relocation hours and product volumes. The selected historical week shows relocation/production bars and an accessible table. Old saves explicitly lack these records.
- **Production source chart:** D3 stacked production by public/forest/unknown connecting-road class, assortment filter and period-cumulative toggle. This is roadside production, not mill-assigned supply or the fraction of a journey spent on forest road. Québec's authored stand connectors are forest roads; imported classes may differ. Legacy production stays unknown.
- **Weather:** 52-week temperature, snow-depth and precipitation curves, campaign/full-year toggle, zone selection, settled observations only, keyboard tooltips. Optional regional numerical datasets have provenance and validation. The Québec default is an explicitly illustrative display dataset: category examples during the campaign, seasonal illustration outside it. It is not extracted weather observations and does not drive access. Categorical simulation remains authoritative. Derived settled values use recorded weather, including classroom randomized realizations. Other scenario realizations and future numerical observations are masked in classroom responses. Numeric profiles currently support a campaign of at most 52 weeks; longer operations can omit this optional profile. Campaign x-values remain sequential across the year boundary.
- **Fleet:** newly recorded truck travel and handling hours are separate, including partner handling. Historical combined records remain combined. Production volume and resource-hour balance are validated.
- **Procurement:** reference crew-workdays, secured terrain mix, road bearing and declared public/forest/unknown composition. Reference days mean eight productive hours with stated productivity/retention assumptions; not promised calendar completion.
- **Inventory:** age, quality, complete downgrade chain and terminal expiry timeline. It respects pre-dispatch ageing and clock resets; dates beyond campaign end are explicitly hypothetical holding consequences.
- **Collaboration:** schematic coalition membership network and source-based standalone/allocated cost and savings graphics. No company geography is fabricated. Existing exact editable allocation tables remain available.
- **Stewardship:** D3 annual growth/harvest, landscape versus managed-area habitat, stand/year action calendar and accessible history. Managed-area history is optional for old saves. These are separate annual exercise records, not a claim of validated ecological sustainability.
- **Drafting:** treatment-aware harvest projection and an optional commitment cap; projected stock now undergoes the same single pre-dispatch ageing pass as simulation. Six full-season comparisons show the revised cap ties default commitment hits (6/30 normal, 6/30 long thaw, 9/30 dry); cash is slightly lower. It is a cap, not an optimizer or a guarantee of better service.
- **Save size:** format 2 stores weather points as lossless numeric tuples and deduplicates route geometry. Plain saves and format 1 remain readable. No financial or volume precision is rounded away.

## Browser evidence

Used the existing week-5 campaign. A transient hot-reload validation error left its original save intact; reloading the corrected build restored week 5 and CAD1,719,349. Saved a future crew assignment, reloaded, verified the 40-hour override, then restored its original carry-forward state without advancing the campaign. Confirmed Reports, procurement, collaboration and annual chart views. Exercised full-year/zone weather selection and keyboard inspection. Checked the shared D3 chart at 390px phone width, then reset the viewport. Existing saves correctly show unavailable detailed production/managed-history records. The full agent gameplay comparisons are programmatic, not browser sessions.

## Limits and remaining broader work

The supplied screenshots are not an exhaustive inventory of the original games' populated endgame/optimizer views. Numerical meteorological observations, surveyed road classifications for all datasets, and original company geography are not available from the reviewed documents. The game provides truthful equivalents or explicit unknowns. Global cooperative network optimization, additional staged-information/auction lessons, production hosting and a reviewed BC scenario remain broader work; this pass does not silently mark them complete.

## Final automated verification

`npm test -- --maxWorkers=1 --testTimeout=30000`: **78 tests / 16 files passed**. `npm run build` and `npx tsc -p tsconfig.server.json` passed. The full-season storage test initially caught a real 4,006,136-byte UTF-16 size estimate above its 4MB guard; format-2 lossless weather tuples fixed it without relaxing that size assertion. Two route-heavy tests first timed out under concurrent scenario comparisons; their explicit full-season timeout budgets were made 60 seconds, and the final suite ran serially. Existing map/initial bundle-size warnings remain; reporting code is split into a lazy module.
