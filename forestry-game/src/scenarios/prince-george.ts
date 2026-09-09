import data from '../data/prince-george.json';
import { quebec } from './quebec';
import type { RegionDefinition, Position } from '../simulation/types';
import { emptyCalibration } from '../simulation/regional-calibration';
import { bcTeachingTenure } from './bc-tenure';
import { bcTeachingMarket } from './bc-market';

// Reuse explicit teaching mechanics; geography and entities belong to this package.
// None of the inherited economic, ecological or weather coefficients is BC calibration.
const teaching = structuredClone(quebec);
const roads = data.roads as RegionDefinition['roads'];
const depotNodes = roads.nodes.filter(n => n.id.startsWith('bc-road-'));
const mills = teaching.mills.map((m, i) => {
  const depot = depotNodes[Math.floor(i * (depotNodes.length - 1) / (teaching.mills.length - 1))];
  return { ...m, id: `BCM${i+1}`, name: `Teaching receiving yard ${i+1} (fictional)`,
    node: depot.id, position: depot.position,
    demand: m.demand.map(month => Object.fromEntries(Object.entries(month).map(([p, v]) => [p, Math.round(v * .7)]))) };
});
const stands: RegionDefinition['stands'] = data.stands.map((s, i) => ({
  sourceNote: 'VRI polygon outline and area are source data. Standing volume uses the teaching assumption of 120 m³/ha; product recovery and harvest rights are simulated.',
  id: s.id, name: `${s.id} · VRI ${s.sourceId.split('.').at(-1)}`,
  node: s.node, position: s.position as Position, polygon: s.polygon as Position[],
  hectares: s.hectares, zone: 'north', terrain: i % 6 === 0 ? 3 : 1,
  // A deliberately explicit scenario density, not a misread per-hectare inventory estimate.
  volume: Math.round(s.hectares * 120),
  mix: { 'soft-saw': .55, 'soft-pulp': .25, 'hard-saw': .05, 'hard-pulp': .1, poplar: .05 },
  productivity: 5 + (i % 4) * .65, harvestCost: 15,
  askingPrice: Math.round(s.hectares * 120 * 9),
  supply: i === 23 ? 'protected' : i < 10 ? 'guaranteed' : i < 17 ? 'private' : 'auction',
  auctionWeek: 1 + i % 5 * 2,
}));
export const princeGeorge: RegionDefinition = {
  ...teaching, id: 'bc-prince-george-fsr-teaching', name: 'Prince George FSR pilot, British Columbia',
  description: 'Twelve-week educational pilot on 83.2 km of mapped BC Forest Service Roads and 24 actual VRI polygon outlines. Receiving yards, stand access spurs, harvest rights, timber density (120 m³/ha), recovery, prices, weather and ecological coefficients are teaching assumptions. Catalogue road status does not certify current drivability, bridge capacity or harvest authorization.',
  mobilization:{allowedNodes:[...new Set(mills.map(m=>m.node))],maxHoursPerResource:16,feePerMove:100},
  center: [-122.91, 54.095], zoom: 11.5, roads, stands, mills,
  zones: [{ id: 'north', name: 'Pilot forest operating zone' }, { id: 'south', name: 'Illustrative comparison zone' }],
  crews: teaching.crews.map((c,i) => ({ ...c, node: mills[i % mills.length].node })),
  trucks: teaching.trucks.map((t,i) => ({ ...t, node: mills[i % mills.length].node })),
  partnerJobs: mills.map((m,i) => ({ id: `BCP${i+1}`, company: `Teaching partner ${i+1}`,
    from: stands[10+i].node, to: m.node, product: 'soft-saw', volume: 500, week: 1, deadline: 12, paymentPerM3: 18 })),
  disruptions: [
    { id: 'bc-access-washout', title: 'Teaching access-spur washout', description: 'An authored disruption closes the modelled BC04 spur. This is not a real road-condition report.', kind: 'road', target: 'access-BC04', week: 5, endWeek: 7, revealWeek: 4, repairCost: 18000, repairWeeks: 0 },
    { ...teaching.disruptions![1] },
    { ...teaching.disruptions![2], title: 'Teaching receiving-yard shutdown', description: 'Fictional intake stoppage for the operating exercise.', target: mills[0].id },
  ],
  stewardship: { ...teaching.stewardship!, note: 'Uncalibrated educational annual growth, regeneration and habitat coefficients reused from the teaching engine. Not BC yield curves, prescriptions or habitat assessments.' },
  objectives: teaching.objectives!.map(o => o.id === 'supply' ? { ...o, target: 30000, description: 'Deliver 30,000 m³ of accepted products during this teaching season.' } : o),
  sources: [
    { title: 'BC Forest Tenure Road Segment Lines', url: 'https://catalogue.data.gov.bc.ca/dataset/9e5bfa62-2339-445e-bf67-81657180c682', note: 'Open Government Licence – British Columbia. Selected connected source features explicitly classified Forest Service Road and ACTIVE at collection. Source vertex joins only; 35 km/h and bearing class 2 are model assumptions. Not live closure or bridge-load information.' },
    { title: 'BC VRI 2025 Rank 1', url: 'https://catalogue.data.gov.bc.ca/dataset/2ebb35d8-c82f-4a17-9c96-612ac3532d55', note: 'Open Government Licence – British Columbia. Whole single-ring polygon geometry and area retained. Polygon selection does not establish tenure or timber availability. Game volume is the labelled 120 m³/ha scenario assumption, not the published VRI volume.' },
    { title: 'Forest Commons teaching mechanics', url: 'https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/', note: 'Supply categories, auctions, markets, seasons and equipment are educational rules inspired by the FORAC materials; they do not reproduce BC tenure law or local operating economics.' },
    ...teaching.sources.filter(s => s.title === 'PGMaps'),
  ],
};
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
