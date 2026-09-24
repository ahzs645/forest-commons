import data from '../data/prince-george.json';
import vri from '../data/prince-george-vri.json';
import { quebec } from './quebec';
import type { RegionDefinition, Position } from '../simulation/types';
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
 * conifers split 70/30 sawlog/pulp, paper birch 15/85, aspen and cottonwood
 * all go to the poplar (panel) assortment. Unlisted codes count as conifer.
 */
export const PG_PRODUCT_RULES = { coniferSawShare: .7, birchSawShare: .15, birch: ['EP', 'EA'], poplar: ['AT', 'AC', 'ACT', 'ACB'] };
/** Stands below this projected live volume at 17.5 cm are not offered as timber (young or non-productive stands). */
export const PG_MERCHANTABLE_M3_PER_HA = 60;
function vriMix(species: [string, number][]): Record<string, number> {
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

// The mapped FSR network ends about 13 km short of Prince George. A labelled
// teaching connector from its southern exit reaches a modelled mill district,
// so the town receiving businesses sit at a real haul distance instead of on
// stand spurs. Two further yards sit at the network's northern ends.
const roads = structuredClone(data.roads) as RegionDefinition['roads'];
const exitNode = roads.nodes.find(n => n.id === 'bc-road-30')!;
const district: Position = [-122.765, 53.935];
const flatKm = (a: Position, b: Position) => 6371.0088 * Math.hypot((b[0] - a[0]) * Math.PI / 180 * Math.cos((a[1] + b[1]) / 2 * Math.PI / 180), (b[1] - a[1]) * Math.PI / 180);
roads.nodes.push({ id: 'pg-district', position: district });
roads.edges.push({ id: 'pg-connector', name: 'Modelled public-road connector to Prince George · teaching link, not a mapped route',
  from: exitNode.id, to: 'pg-district', geometry: [exitNode.position, district], km: Math.round(flatKm(exitNode.position, district) * 1.3 * 10) / 10,
  speed: 70, bearing: 1, zone: 'south', roadClass: 'public' });
const townYards: [string, Position, number][] = [
  ['pg-yard-a', [-122.752, 53.928], 1.5], ['pg-yard-b', [-122.781, 53.921], 2.5], ['pg-yard-c', [-122.744, 53.944], 2],
  ['pg-yard-d', [-122.790, 53.940], 2.5], ['pg-yard-e', [-122.735, 53.918], 3.5],
];
for (const [id, position, km] of townYards) {
  roads.nodes.push({ id, position });
  roads.edges.push({ id: `${id}-spur`, name: 'Modelled mill-district street · teaching link', from: 'pg-district', to: id,
    geometry: [district, position], km, speed: 40, bearing: 1, zone: 'south', roadClass: 'public' });
}

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
    // Teaching assumption: denser stands give larger pieces and a higher hourly rate. Not a BC productivity function.
    productivity: Math.round(Math.min(8.5, Math.max(4.5, 3 + perHa / 70)) * 100) / 100, harvestCost: 15,
    askingPrice: Math.round(volume * 9),
    supply, auctionWeek: supply === 'auction' ? [1, 3, 5, 7, 9][(rank - 14) % 5] : 1 + i % 5 * 2,
  };
});

// Receiving businesses by assortment. Season demand is 55% of the offered
// district volume of each product, so buying timber matters but targets can
// be met; the remote yards pay a premium for their longer haul.
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
const basePrice = (p: string) => p.endsWith('saw') ? 105 : p === 'poplar' ? 68 : 58;
const buyers = (p: string) => yardPlan.filter(y => y.products.includes(p)).length;
const mills = yardPlan.map((y, i) => {
  const node = roads.nodes.find(n => n.id === y.node)!;
  return { ...teaching.mills[i], id: `BCM${i + 1}`, name: y.name, node: node.id, position: node.position,
    prices: Object.fromEntries(y.products.map(p => [p, basePrice(p) + y.premium])),
    demand: [1, 1.1, .9].map(f => Object.fromEntries(y.products.map(p => [p, Math.round((offeredSupply[p] ?? 0) * .55 / 3 * f / buyers(p) / 10) * 10]))) };
});
// Crews start at landings inside the stand block; trucks start at the receiving yards.
const landings = ['bc-road-14', 'bc-road-21', 'bc-road-29', 'bc-road-36', 'bc-road-44'];
const seasonDemand = mills.reduce((n, m) => n + m.demand.reduce((t, month) => t + Object.values(month).reduce((a, b) => a + b, 0), 0), 0);
const supplyTarget = Math.round(seasonDemand * .5 / 1000) * 1000;
export const princeGeorge: RegionDefinition = {
  ...teaching, id: 'bc-prince-george-fsr-teaching', name: 'Prince George FSR pilot, British Columbia',
  description: 'Twelve-week educational pilot on 83.2 km of mapped BC Forest Service Roads and 24 actual VRI polygon outlines, with each stand\'s species, age and projected live volume taken from VRI 2025. Receiving businesses in Prince George are reached by a labelled teaching connector; the product split, merchantability threshold, rights, prices, weather and ecological coefficients are educational assumptions, not BC calibration.',
  mobilization:{allowedNodes:[...new Set([...landings, ...mills.map(m=>m.node)])],maxHoursPerResource:16,feePerMove:100},
  center: [-122.88, 54.02], zoom: 10, roads, stands, mills,
  zones: [{ id: 'north', name: 'FSR 7695 operating area' }, { id: 'south', name: 'Prince George haul corridor' }],
  crews: teaching.crews.map((c,i) => ({ ...c, node: landings[i % landings.length] })),
  trucks: teaching.trucks.map((t,i) => ({ ...t, node: mills[i % mills.length].node })),
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
