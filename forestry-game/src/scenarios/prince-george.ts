import data from '../data/prince-george.json';
import vri from '../data/prince-george-vri.json';
import connector from '../data/prince-george-connector.json';
import { quebec } from './quebec';
import type { RegionDefinition, Position, Weather } from '../simulation/types';
import { emptyCalibration } from '../simulation/regional-calibration';
import { bcTeachingTenure } from './bc-tenure';
import { bcTeachingMarket } from './bc-market';

// Reuse explicit teaching mechanics; geography and entities belong to this package.
// None of the inherited economic, ecological or weather coefficients is BC calibration.
const teaching = structuredClone(quebec);
const inventory = vri.stands as unknown as Record<string, { featureId: string; liveM3PerHa175: number; ageYears: number | null; species: [string, number][] }>;

/**
 * Teaching conversion from VRI species to the game's five assortments. The
 * shares are authored assumptions, not BC recovery or scaling factors:
 * conifers split 75/25 sawlog/pulp (the 2017 Prince George TSA base case is
 * about 76% sawlog, 24% non-sawlog), paper birch 15/85, aspen and cottonwood
 * all go to the poplar (panel) assortment. Unlisted codes count as conifer.
 */
export const PG_PRODUCT_RULES = { coniferSawShare: .75, birchSawShare: .15, birch: ['EP', 'EA'], poplar: ['AT', 'AC', 'ACT', 'ACB'] };
/** Stands below this projected live volume at 17.5 cm are not offered as timber (young or non-productive stands). */
export const PG_MERCHANTABLE_M3_PER_HA = 60;
export function vriMix(species: [string, number][]): Record<string, number> {
  const mix = { 'soft-saw': 0, 'soft-pulp': 0, 'hard-saw': 0, 'hard-pulp': 0, poplar: 0 };
  const total = species.reduce((n, [, pct]) => n + pct, 0) || 1;
  for (const [code, pct] of species) {
    const share = pct / total;
    if (PG_PRODUCT_RULES.poplar.includes(code)) mix.poplar += share;
    else if (PG_PRODUCT_RULES.birch.includes(code)) { mix['hard-saw'] += share * PG_PRODUCT_RULES.birchSawShare; mix['hard-pulp'] += share * (1 - PG_PRODUCT_RULES.birchSawShare); }
    else { mix['soft-saw'] += share * PG_PRODUCT_RULES.coniferSawShare; mix['soft-pulp'] += share * (1 - PG_PRODUCT_RULES.coniferSawShare); }
  }
  const rounded = Object.fromEntries(Object.entries(mix).map(([p, v]) => [p, Math.round(v * 1000) / 1000]));
  // Shares must sum to exactly 1; the rounding remainder goes to the largest.
  const largest = Object.keys(rounded).reduce((a, b) => rounded[b] > rounded[a] ? b : a);
  rounded[largest] = Math.round((1 - Object.entries(rounded).filter(([p]) => p !== largest).reduce((n, [, v]) => n + v, 0)) * 1000) / 1000;
  return rounded;
}
/** Supply categories of the first pilot (by source order), kept for the authored BC lesson built on it. */
export const legacyPilotSupply = (i: number): RegionDefinition['stands'][number]['supply'] =>
  i === 23 ? 'protected' : i < 10 ? 'guaranteed' : i < 17 ? 'private' : 'auction';

// The mapped FSR network ends at Pilot Mountain Road, about 15 km of public
// road short of Prince George. The connector follows cached OSRM car routes
// (Pilot Mountain Road → Chief Lake Road → John Hart Highway) to a junction
// in the city and on to five fictional receiving locations in general
// industrial areas (scripts/build-prince-george-connector.py). Two further
// yards sit at the network's northern ends.
const roads = structuredClone(data.roads) as RegionDefinition['roads'];
// FPInterface (Prince George TSA) class 2–3 FSR speeds average about 40 km/h
// loaded and empty; IAM in-block travel is 10 km/h loaded and 15 km/h empty.
for (const edge of roads.edges) edge.speed = edge.id.startsWith('access-') ? 12 : edge.id.startsWith('fsr-') ? 40 : edge.speed;
roads.nodes.push(...connector.nodes as RegionDefinition['roads']['nodes']);
roads.edges.push(...connector.edges as RegionDefinition['roads']['edges']);

const standInputs = data.stands.map((s, i) => {
  const inv = inventory[s.id];
  const perHa = inv.liveM3PerHa175;
  return { s, i, inv, perHa, merchantable: perHa >= PG_MERCHANTABLE_M3_PER_HA && i !== 23 };
});
let offered = 0;
const stands: RegionDefinition['stands'] = standInputs.map(({ s, i, inv, perHa, merchantable }) => {
  const volume = Math.max(1, Math.round(perHa * s.hectares));
  // Offered stands are ranked in source order: eight secured, six private, the rest at auction.
  const rank = merchantable ? offered++ : -1;
  const supply = !merchantable ? 'protected' : rank < 8 ? 'guaranteed' : rank < 14 ? 'private' : 'auction';
  return {
    sourceNote: `VRI 2025 Rank 1 feature ${inv.featureId}: outline, area, species (${inv.species.map(([c, p]) => `${c}${p}`).join(' ')}), age ${inv.ageYears ?? '?'} and projected live volume ${perHa} m³/ha at 17.5 cm are source data, not a cruise. `
      + (i === 23 ? 'Held back as the teaching conservation area. ' : !merchantable ? `Below the ${PG_MERCHANTABLE_M3_PER_HA} m³/ha teaching merchantability threshold, so not offered as timber. ` : '')
      + 'The species-to-product split, productivity, rights and prices are teaching assumptions.',
    // Screens prefix the stand ID themselves, so the name is only the inventory reference.
    id: s.id, name: `VRI ${s.sourceId.split('.').at(-1)}${!merchantable && i !== 23 ? ' (not merchantable)' : ''}`,
    ...(!merchantable && i !== 23 ? { unavailableReason: 'Not merchantable (VRI)' } : {}),
    node: s.node, position: s.position as Position, polygon: s.polygon as Position[],
    hectares: s.hectares, zone: 'north', terrain: i % 6 === 0 ? 3 : 1,
    volume, mix: vriMix(inv.species),
    // m³ per scheduled crew hour for a full-tree ground system. Prince George
    // feller-buncher studies show 47–87 m³/PMH at 51–92% utilization; denser
    // stands (larger pieces) sit higher. Teaching derivation, not a BC function.
    // harvestCost covers landing and road upkeep; crew time carries the system rate.
    productivity: Math.round(Math.min(45, Math.max(22, 15 + perHa / 12)) * 10) / 10, harvestCost: 3,
    askingPrice: Math.round(volume * 9),
    supply, auctionWeek: supply === 'auction' ? [1, 3, 5, 7, 9][(rank - 14) % 5] : 1 + i % 5 * 2,
  };
});

// Receiving businesses by assortment. Season demand is 40% of the offered
// district volume of each product: about what six trucks can haul in the
// weeks break-up leaves open, so buying timber matters but targets can be met.
// The remote yards pay a premium for their longer haul. Monthly shares
// 1.45 / 0.85 / 0.7 follow the February winter haul and spring break-up.
const offeredSupply: Record<string, number> = {};
for (const st of stands) if (st.supply !== 'protected') for (const [p, share] of Object.entries(st.mix)) offeredSupply[p] = (offeredSupply[p] ?? 0) + st.volume * share;
const yardPlan: { name: string; node: string; products: string[]; premium: number }[] = [
  { name: 'North satellite sawlog yard (fictional)', node: 'bc-road-1', products: ['soft-saw'], premium: 10 },
  { name: 'North-west reload yard (fictional)', node: 'bc-road-4', products: ['soft-saw', 'soft-pulp'], premium: 6 },
  { name: 'Prince George sawmill A (fictional)', node: 'pg-yard-a', products: ['soft-saw'], premium: 0 },
  { name: 'Prince George sawmill B (fictional)', node: 'pg-yard-b', products: ['soft-saw', 'hard-saw'], premium: 0 },
  { name: 'Prince George pulp mill A (fictional)', node: 'pg-yard-c', products: ['soft-pulp', 'hard-pulp'], premium: 0 },
  { name: 'Prince George panel plant (fictional)', node: 'pg-yard-d', products: ['poplar'], premium: 0 },
  { name: 'Prince George pulp mill B (fictional)', node: 'pg-yard-e', products: ['soft-pulp', 'hard-pulp'], premium: 0 },
];
// Delivered prices (CAD/m³). SPF sawlog 105 and pulp log 58 follow the BC
// Interior Log Market Report (Jan–Mar 2026 averages 106.53 and 57.60). BC
// publishes no deciduous price: aspen 55 is an unverified estimate (stumpage
// near zero, so price ≈ logging plus haul) and birch sawlog 70 is a fictional
// specialty outlet.
const basePrice = (p: string) => p === 'soft-saw' ? 105 : p === 'hard-saw' ? 70 : p === 'poplar' ? 55 : 58;
const buyers = (p: string) => yardPlan.filter(y => y.products.includes(p)).length;
const mills = yardPlan.map((y, i) => {
  const node = roads.nodes.find(n => n.id === y.node)!;
  return { ...teaching.mills[i], id: `BCM${i + 1}`, name: y.name, node: node.id, position: node.position,
    prices: Object.fromEntries(y.products.map(p => [p, basePrice(p) + y.premium])),
    // Mills build log decks over the winter haul and take less during break-up.
    demand: [1.45, .85, .7].map(f => Object.fromEntries(y.products.map(p => [p, Math.round((offeredSupply[p] ?? 0) * .4 / 3 * f / buyers(p) / 10) * 10]))) };
});
// Weekly access classes for a season starting in early February. Built from
// Prince George ECCC 1991–2020 normals (Feb −5.4 °C with about 26 frost days;
// March nights freezing while days thaw; snow gone by the end of April) and
// spring load-restriction timing (city start 2 Feb 2024 and 4 Mar 2025).
// Classes, not forecasts: FSRs (bearing 2) close in thaw weeks, standing in
// for break-up restrictions. Forecasts differ from actual weather in two weeks.
const pgSeasons: RegionDefinition['weather'] = {};
for (const [id, name, actual, forecastChanges] of [
  ['normal', 'Typical Prince George late winter and break-up (1991–2020 normals)',
    ['frozen', 'frozen', 'frozen', 'normal', 'frozen', 'normal', 'thaw', 'thaw', 'thaw', 'wet', 'thaw', 'wet'], { 4: 'normal', 9: 'thaw' }],
  ['long-thaw', 'Early break-up after a mild winter (cf. 2024)',
    ['frozen', 'frozen', 'normal', 'thaw', 'thaw', 'thaw', 'thaw', 'wet', 'wet', 'thaw', 'wet', 'wet'], { 2: 'frozen', 7: 'thaw' }],
  ['dry', 'Late, dry break-up',
    ['frozen', 'frozen', 'frozen', 'frozen', 'frozen', 'normal', 'normal', 'thaw', 'thaw', 'wet', 'normal', 'normal'], { 5: 'frozen', 9: 'thaw' }],
] as [string, string, Weather[], Record<number, Weather>][]) {
  const forecast = actual.map((w, i) => forecastChanges[i] ?? w);
  pgSeasons[id] = { name, actual: { north: [...actual], south: [...actual] }, forecast: { north: forecast, south: [...forecast] } };
}
// Crews start at landings inside the stand block; trucks start at the receiving yards.
const landings = ['bc-road-14', 'bc-road-21', 'bc-road-29', 'bc-road-36', 'bc-road-44'];
// Fleet sized to the scenario's roughly 5,000 m³/week of demand, with rates
// from published BC Interior sources (see the Prince George pilot notes):
// single 10-hour shifts; buncher, skidder, processor and loader at about
// CAD 800/h (TimberTracks 2022, Interior Appraisal Manual 2024); lowbed moves
// about CAD 12/km with return; 8-axle Super B at about 43 t (≈45 m³) and
// CAD 225/h all-in, split into a weekly and a per-km part; 78 minutes of
// terminal time per cycle (IAM 2024).
const pgCrews: RegionDefinition['crews'] = teaching.crews.slice(0, 4).map((c, i) => ({ ...c, name: `Full-tree crew ${i + 1}`,
  node: landings[i % landings.length], hours: 50, productivityFactor: 1, hourlyCost: 800, relocationSpeed: 40, relocationCostKm: 12 }));
const pgTrucks: RegionDefinition['trucks'] = teaching.trucks.slice(0, 6).map((t, i) => ({ ...t, name: `B-train ${i + 1}`,
  // CAD 225 per working hour is a contractor rate: about 2,000/week of ownership while parked,
  // the rest as about 6/km while working (≈ 1,730 km in a 55-hour week).
  node: mills[i % mills.length].node, hours: 55, payload: 45, loadingHours: .75, unloadingHours: .55, costKm: 6, fixedWeekly: 2000 }));
const seasonDemand = mills.reduce((n, m) => n + m.demand.reduce((t, month) => t + Object.values(month).reduce((a, b) => a + b, 0), 0), 0);
const supplyTarget = Math.round(seasonDemand * .5 / 1000) * 1000;
export const princeGeorge: RegionDefinition = {
  ...teaching, id: 'bc-prince-george-fsr-teaching', name: 'Prince George FSR pilot, British Columbia',
  description: 'Twelve-week educational pilot on 83.2 km of mapped BC Forest Service Roads and 24 actual VRI polygon outlines, with each stand\'s species, age and projected live volume taken from VRI 2025. Receiving businesses in Prince George are reached by a labelled teaching connector; the product split, merchantability threshold, rights, prices, weather and ecological coefficients are educational assumptions, not BC calibration.',
  mobilization:{allowedNodes:[...new Set([...landings, ...mills.map(m=>m.node)])],maxHoursPerResource:16,feePerMove:100},
  center: [-122.88, 54.02], zoom: 10, roads, stands, mills, weather: pgSeasons,
  zones: [{ id: 'north', name: 'FSR 7695 operating area' }, { id: 'south', name: 'Prince George haul corridor' }],
  crews: pgCrews,
  trucks: pgTrucks,
  partnerJobs: mills.map((m,i) => ({ id: `BCP${i+1}`, company: `Teaching partner ${i+1}`,
    from: stands[10+i].node, to: m.node, product: 'soft-saw', volume: 500, week: 1, deadline: 12, paymentPerM3: 18 })),
  disruptions: [
    { id: 'bc-access-washout', title: 'Teaching access-spur washout', description: 'An authored disruption closes the modelled BC04 spur. This is not a real road-condition report.', kind: 'road', target: 'access-BC04', week: 5, endWeek: 7, revealWeek: 4, repairCost: 18000, repairWeeks: 0 },
    { ...teaching.disruptions![1] },
    { ...teaching.disruptions![2], title: 'Teaching receiving-yard shutdown', description: 'Fictional intake stoppage for the operating exercise.', target: mills[0].id },
  ],
  stewardship: { ...teaching.stewardship!, note: 'Uncalibrated educational annual growth, regeneration and habitat coefficients reused from the teaching engine. Not BC yield curves, prescriptions or habitat assessments.' },
  // Half of the season's receiving demand, rounded: reachable with bought timber, not with the secured lots alone.
  objectives: teaching.objectives!.map(o => o.id === 'supply' ? { ...o, target: supplyTarget, description: `Deliver ${supplyTarget.toLocaleString('en-CA')} m³ of accepted products during this teaching season.` } : o),
  sources: [
    { title: 'BC Forest Tenure Road Segment Lines', url: 'https://catalogue.data.gov.bc.ca/dataset/9e5bfa62-2339-445e-bf67-81657180c682', note: 'Open Government Licence – British Columbia. Selected connected source features explicitly classified Forest Service Road and ACTIVE at collection. Source vertex joins only; 35 km/h and bearing class 2 are model assumptions. Not live closure or bridge-load information.' },
    { title: 'BC VRI 2025 Rank 1', url: 'https://catalogue.data.gov.bc.ca/dataset/2ebb35d8-c82f-4a17-9c96-612ac3532d55', note: 'Open Government Licence – British Columbia. Whole single-ring polygon geometry and area retained. Polygon selection does not establish tenure or timber availability. Stand species, age and LIVE_STAND_VOLUME_175 are copied from the cached snapshot (src/data/prince-george-vri.json); projections, not cruised or net merchantable volume.' },
    { title: 'Forest Commons teaching mechanics', url: 'https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/', note: 'Supply categories, auctions, markets, seasons and equipment are educational rules inspired by the FORAC materials; they do not reproduce BC tenure law or local operating economics.' },
    ...teaching.sources.filter(s => s.title === 'PGMaps'),
  ],
};
// Québec numerical temperature curves are not reused for BC (REGION-PACKAGES.md); the access schedules remain.
delete princeGeorge.weatherCharts;
princeGeorge.bcTenure = bcTeachingTenure(princeGeorge);
princeGeorge.bcMarket = bcTeachingMarket();
princeGeorge.sources.push(
  { title: 'BC harvesting and road authorizations', url: 'https://www2.gov.bc.ca/gov/content/industry/forestry/forest-tenures/timber-harvesting-rights/cutting-permit-road-tenure-administration', note: 'CP, RP and industrial FSR road-use distinctions inform the exercise. Authored eligibility, approval times and statuses are not real permits.' },
  { title: 'BC Crown timber stumpage', url: 'https://www2.gov.bc.ca/gov/content/taxes/natural-resource-taxes/forestry/stumpage', note: 'Crown timber payment principles only. Bundled product rates are illustrative and are not a provincial appraisal or scaling schedule.' },
  { title: 'BCTS within the Ministry of Forests', url: 'https://blog.gov.bc.ca/bctimbersales/about-bc-timber-sales/', note: 'Institutional and reforestation roles inform the teaching assignment of responsibilities. No real BCTS sale or post-harvest obligation is identified by these polygons.' },
  { title: 'Interior stumpage market parameters', url: 'https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing/interior-appraisal-parameters', note: 'Published parameters include lumber values, CPI, exchange rates, harvest volume and BCTS market adjustment. The game uses its own much smaller lagged-index exercise, not these equations or current published values.' },
  { title: 'Stumpage payment timing', url: 'https://www2.gov.bc.ca/gov/content/taxes/natural-resource-taxes/forestry/stumpage/pay', note: 'Official balances are due immediately upon billing. The simulation aggregates harvest and payment in one turn and does not imply a government interest-free payment delay.' },
);
princeGeorge.calibration = emptyCalibration(princeGeorge, true);
for (const entry of Object.values(princeGeorge.calibration.entries)) {
  entry.notes = 'BC teaching pilot. Geometry has source provenance; operational coefficients and harvest rights are explicitly illustrative and have not received professional regional review.';
}
// Published sources found on 2026-09-24 (research/bc-coefficient-evidence-2026-09-24.md).
// "source-identified" records where a value came from; no qualified reviewer has
// checked the values or their use, so nothing is marked reviewed.
const evidence: Record<string, { sourceUrl: string; license: string; sourceDate: string; notes: string }> = {
  geography: { sourceUrl: 'https://catalogue.data.gov.bc.ca/dataset/9e5bfa62-2339-445e-bf67-81657180c682', license: 'Open Government Licence – British Columbia; connector: OpenStreetMap (ODbL) via OSRM', sourceDate: '2026-09-24',
    notes: 'FSR 7695/7727 geometry from BC Forest Tenure Road Segment Lines. Public connector (Pilot Mountain Rd → Chief Lake Rd → Hwy 97, 15.2 km) from cached OSRM car routes, research/bc-inputs/pg-connector-osrm. Receiving locations are fictional points in general industrial areas.' },
  inventory: { sourceUrl: 'https://catalogue.data.gov.bc.ca/dataset/2ebb35d8-c82f-4a17-9c96-612ac3532d55', license: 'Open Government Licence – British Columbia', sourceDate: '2026-09-08',
    notes: 'VRI 2025 Rank 1 LIVE_STAND_VOLUME_175 × polygon area, species and age (src/data/prince-george-vri.json). Projections without decay/waste/breakage deductions; stands under 60 m³/ha not offered (teaching threshold).' },
  products: { sourceUrl: 'https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/stewardship/forest-analysis-inventory/tsr-annual-allowable-cut/prince_george_tsa_rationale_2017.pdf', license: 'Province of British Columbia publication', sourceDate: '2026-09-24',
    notes: 'Prince George TSA 2017 AAC rationale: base case about 76% sawlog / 24% non-sawlog (beetle-affected pine), used for the 75/25 conifer split. No published birch sawlog/pulp split; 15/85 remains an assumption. Deciduous uses named: OSB, pellets, bioenergy.' },
  access: { sourceUrl: 'https://climate.weather.gc.ca/climate_normals/results_1991_2020_e.html?stnID=0&climate_id=1096450', license: 'Environment and Climate Change Canada data (Open Government Licence – Canada)', sourceDate: '2026-09-24',
    notes: 'Weekly classes from Prince George ECCC 1991–2020 normals (Feb −5.4 °C, ~26 frost days; snow gone by end of April) and load-restriction timing (City of Prince George start 2024-02-02 and 2025-03-04; provincial Fort George area lifted 2026-06-29; TranBC 2022 explains 70%/50% axle limits). FSR speed 40 km/h (FPInterface PG TSA class 2–3); spurs 12 km/h (IAM 2024 in-block 10/15).' },
  fleet: { sourceUrl: 'https://library.fpinnovations.ca/media/FOP/TR2017N11.PDF', license: 'FPInnovations technical report', sourceDate: '2026-09-24',
    notes: '8-axle Super B at 63.5 t GVW carries about 43 t (≈45 m³ assuming 0.95 t/m³, unverified conversion). Trucks 55 h/week (FPInterface PG TSA: 1 shift × 10 h). Load + unload 1.3 h from the IAM 2024 78-minute terminal allowance (interpretation).' },
  crews: { sourceUrl: 'https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/supporting-innovation/prince_george_tsa.pdf', license: 'Province of British Columbia / FPInnovations publication', sourceDate: '2026-09-24',
    notes: 'Single 10-hour shifts (FPInterface PG TSA). Stand productivity 22–45 m³ per scheduled hour, derived from Prince George feller-buncher data at 47–87 m³/PMH and 51–92% utilization (Lakehead University undergraduate thesis, 2024). Relocation 40 km/h, about CAD 12/km with return (lowbed ~CAD 244/h, TimberTracks 2022; derived).' },
  prices: { sourceUrl: 'https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing/interior-log-market-reports', license: 'Province of British Columbia publication', sourceDate: '2026-09-24',
    notes: 'BC Interior Log Market Report, Jan–Mar 2026: SPF sawlog 106.53, pulp log 57.60 CAD/m³ (game 105 and 58). Deciduous price not published; aspen 55 is an unverified estimate and birch sawlog 70 a fictional outlet. Mills are fictional analogues of the 2023 Major Primary Timber Processing Facilities list; there is no OSB/panel mill in the PG district.' },
  operating: { sourceUrl: 'https://www2.gov.bc.ca/assets/gov/farming-natural-resources-and-industry/forestry/timber-pricing/interior-timber-pricing/interior-appraisal-manual/iam_2024_master_b.pdf', license: 'Province of British Columbia publication; TimberTracks rates published with the ILA/TLA', sourceDate: '2026-09-24',
    notes: 'Full-tree system (buncher, skidder, processor, loader) about CAD 800/h all-found from TimberTracks 2022 and IAM 2024 appendix rates, plus CAD 3/m³ landing/road upkeep: about CAD 25–30/m³ stump-to-truck (derived; published range 11–22/m³ in older UNBC studies). B-train about CAD 225/h all-in (TimberTracks 2022) split as 2,000/week ownership and 6/km working.' },
};
for (const [id, e] of Object.entries(evidence)) Object.assign(princeGeorge.calibration.entries[id], { ...e, status: 'source-identified' as const });
