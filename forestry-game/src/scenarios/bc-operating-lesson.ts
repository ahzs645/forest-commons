import { princeGeorge, legacyPilotSupply } from './prince-george';
import { bcTeachingTenure } from './bc-tenure';
import { emptyCalibration } from '../simulation/regional-calibration';
import type { RegionDefinition, Weather } from '../simulation/types';
import type { StandDossier, OperationsProfile, HarvestSystem } from '../simulation/operations-profile';

/** Opt-in authored case. Never migrate an embedded campaign to this preset. */
export function buildBCOperatingLesson(base: RegionDefinition = princeGeorge): RegionDefinition {
  const region = structuredClone(base);
  const profileRows: {
    id: string; title: string; area: number; density: number; age: number;
    species: Record<string, number>; mix: number[]; systems: HarvestSystem[];
    weather: Weather[]; retention: number; ready: number; rationale: string;
  }[] = [
    { id: 'BC01', title: 'Winter-access conifer case', area: .78, density: 175, age: 95,
      species: { spruce: .55, pine: .35, fir: .1 }, mix: [.64, .31, 0, 0, .05],
      systems: ['full-tree', 'cut-to-length'], weather: ['frozen'], retention: .15, ready: 1,
      rationale: 'Use the short authored frozen-ground window, or carry this timber rather than treating mapped access as year-round access.' },
    { id: 'BC02', title: 'Firm-ground flexible supply', area: .88, density: 155, age: 82,
      species: { pine: .7, spruce: .3 }, mix: [.7, .28, 0, 0, .02],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'wet', 'frozen'], retention: .15, ready: 1,
      rationale: 'A flexible source can buffer a disrupted plan even when it is not the first choice on immediate delivered margin.' },
    { id: 'BC03', title: 'Mixed-wood recovery case', area: .74, density: 145, age: 78,
      species: { aspen: .5, spruce: .4, birch: .1 }, mix: [.3, .18, .18, .14, .2],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'frozen'], retention: .22, ready: 1,
      rationale: 'Evaluate outlets for every assortment. Species and recovery are related authored inputs, not measurements or a BC grading model.' },
    { id: 'BC04', title: 'Access-recovery decision', area: .8, density: 170, age: 89,
      species: { spruce: .65, fir: .35 }, mix: [.62, .35, 0, 0, .03],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'wet', 'frozen'], retention: .2, ready: 1,
      rationale: 'An authored washout interrupts this access spur. Paid recovery still takes physical time; cash cannot reopen it immediately.' },
    { id: 'BC05', title: 'Commercial-thinning case', area: .85, density: 135, age: 48,
      species: { pine: .6, spruce: .4 }, mix: [.38, .58, 0, 0, .04],
      systems: ['cut-to-length'], weather: ['normal', 'frozen'], retention: .65, ready: 1,
      rationale: 'The case requires thinning and the compatible crew, retains substantial standing volume and produces a larger low-value component.' },
    { id: 'BC08', title: 'Authorization-expiry case', area: .82, density: 185, age: 105,
      species: { spruce: .6, fir: .25, pine: .15 }, mix: [.72, .26, 0, 0, .02],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'wet', 'frozen'], retention: .2, ready: 1,
      rationale: 'A secured timber right is not a perpetual active authorization. Review the existing exercise renewal requirement.' },
    { id: 'BC09', title: 'Layout and permit case', area: .68, density: 165, age: 86,
      species: { spruce: .45, pine: .45, aspen: .1 }, mix: [.57, .29, .04, .04, .06],
      systems: ['cut-to-length'], weather: ['normal', 'frozen'], retention: .25, ready: 3,
      rationale: 'The authored layout package becomes available in operating week 3. Harvest authorization remains an independent requirement.' },
    { id: 'BC11', title: 'Fictional private-timber case', area: .9, density: 125, age: 70,
      species: { aspen: .7, spruce: .2, birch: .1 }, mix: [.15, .13, .22, .2, .3],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'wet', 'frozen'], retention: .15, ready: 1,
      rationale: 'Upfront acquisition, recovery and outlet capacity must justify this purchase. The VRI outline does not establish real private ownership.' },
    { id: 'BC18', title: 'Fictional BCTS acquisition case', area: .76, density: 195, age: 110,
      species: { spruce: .7, fir: .2, pine: .1 }, mix: [.7, .27, 0, 0, .03],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'frozen'], retention: .2, ready: 1,
      rationale: 'Award, authorization, access and a viable operating plan are separate steps. This is not an actual timber sale.' },
    { id: 'BC24', title: 'Excluded teaching area', area: 0, density: 160, age: 130,
      species: { spruce: .5, fir: .5 }, mix: [.65, .35, 0, 0, 0],
      systems: ['full-tree', 'cut-to-length'], weather: ['normal', 'wet', 'frozen'], retention: .8, ready: 1,
      rationale: 'Source geometry remains visible, but the entire area is excluded from the modelled treatment area. No acquisition or harvesting is permitted.' },
  ];
  // This lesson was authored on the first pilot: every source stand in one zone,
  // the original supply categories and three yards on these trunk nodes. The
  // pilot has since taken VRI volumes, species and new yards; pin the lesson's
  // inherited inputs so its cases keep their meaning.
  const pilotOrder = region.stands.map(s => s.id);
  if (pilotOrder.length !== 24) throw Error('BC lesson expects the 24-stand pilot source.');
  region.roads = { nodes: region.roads.nodes.filter(n => !n.id.startsWith('pg-')), edges: region.roads.edges.filter(e => !e.id.startsWith('pg-')) };
  region.stands = region.stands.map(({ unavailableReason: _, ...s }, i) => ({ ...s, name: `${s.id} · ${s.name.replace(' (not merchantable)', '')}`, zone: 'north', supply: legacyPilotSupply(i), auctionWeek: 1 + i % 5 * 2 }));
  region.zones = [{ id: 'north', name: 'Pilot forest operating zone' }, { id: 'south', name: 'Illustrative comparison zone' }];
  region.bcTenure = bcTeachingTenure(region);
  const lessonYardNodes = ['bc-road-0', 'bc-road-7', 'bc-road-14'];
  region.mills = region.mills.slice(0, 3).map((m, i) => ({ ...m, node: lessonYardNodes[i], position: region.roads.nodes.find(n => n.id === lessonYardNodes[i])!.position }));
  region.center = [-122.91, 54.095];
  region.zoom = 11.5;
  region.sources = region.sources.map(src => src.title === 'BC VRI 2025 Rank 1' ? { ...src, note: 'Open Government Licence – British Columbia. Whole single-ring polygon geometry and area retained. Polygon selection does not establish tenure or timber availability. Lesson volumes, species and ages are authored teaching values (see the operating profile), not VRI values.' } : src);
  const byId = new Map(region.stands.map(s => [s.id, s]));
  for (const row of profileRows) if (!byId.has(row.id)) throw Error(`BC lesson source is missing ${row.id}.`);
  const products = ['soft-saw', 'soft-pulp', 'hard-saw', 'hard-pulp', 'poplar'];
  region.id = 'bc-prince-george-operating-lesson-v1';
  region.name = 'Prince George · access, recovery & commitments';
  region.description = 'Ten-site authored BC teaching lesson using the pilot inventory outlines and roads. Net treatment areas, forest attributes, systems, recovery, load limits, costs and receiving businesses are fictional. This is not a surveyed block layout, heavy-vehicle routing service, appraisal or forestry prescription.';
  region.stands = profileRows.map(row => {
    const source = byId.get(row.id)!;
    const netArea = source.hectares * row.area;
    const volume = Math.round(netArea * row.density);
    return { ...source, name: `${row.id} · ${row.title}`, volume,
      mix: Object.fromEntries(products.map((p, i) => [p, row.mix[i]])),
      productivity: row.id === 'BC05' ? 10 : row.id === 'BC03' ? 12 : 15,
      harvestCost: row.id === 'BC05' ? 19 : row.id === 'BC03' ? 17 : 15,
      askingPrice: volume * (row.id === 'BC11' ? 5 : 9),
      auctionWeek: row.id === 'BC18' ? 1 : source.auctionWeek,
      sourceNote: 'Only the inventory outline and inventory area come from the pilot source. Net treatment area, exclusions, species, age, volume range and recovery below are authored teaching assumptions. No treatment/exclusion boundary has been surveyed or mapped.' };
  });
  region.crews = region.crews.slice(0, 3).map((c, i) => ({ ...c, hours: 40,
    name: i === 1 ? 'CTL crew · teaching system' : `Full-tree crew ${i === 0 ? 1 : 2} · teaching system`,
    productivityFactor: 1, hourlyCost: i === 1 ? 72 : 65 }));
  region.trucks = region.trucks.slice(0, 3).map((t, i) => ({ ...t, name: `Teaching truck ${i + 1}`,
    hours: 40, payload: [22, 30, 34][i], fixedWeekly: 350 }));
  if (region.mills.length < 3 || region.crews.length < 3 || region.trucks.length < 3)
    throw Error('BC lesson requires three receiving yards, crews and trucks in its source.');
  const intake: Record<string, number>[] = [
    { 'soft-saw': 1050, 'soft-pulp': 150 },
    { 'soft-pulp': 300, 'hard-pulp': 150, poplar: 200 },
    { 'hard-saw': 100, 'soft-saw': 150, poplar: 100 },
  ];
  const prices: Record<string, number>[] = [
    { 'soft-saw': 112, 'soft-pulp': 38 },
    { 'soft-pulp': 43, 'hard-pulp': 39, poplar: 42 },
    { 'hard-saw': 100, 'soft-saw': 102, poplar: 46 },
  ];
  const names = ['Conifer receiving yard (fictional)', 'Fibre receiving yard (fictional)', 'Mixed-wood receiving yard (fictional)'];
  region.mills = region.mills.slice(0, 3).map((m, i) => ({ ...m, name: names[i], prices: prices[i],
    demand: Array.from({ length: 3 }, () => ({ ...intake[i] })), spotPrices: undefined, processing: undefined }));
  region.crews = region.crews.map((c, i) => ({ ...c, node: region.mills[i].node }));
  region.trucks = region.trucks.map((t, i) => ({ ...t, node: region.mills[i].node }));
  region.weeks = 12;
  region.weeksPerMonth = 4;
  region.turnDurationWeeks = 1;
  const actual: Weather[] = ['frozen', 'frozen', 'frozen', 'normal', 'thaw', 'thaw', 'wet', 'normal', 'normal', 'wet', 'normal', 'normal'];
  const forecast: Weather[] = ['frozen', 'frozen', 'frozen', 'normal', 'thaw', 'wet', 'normal', 'normal', 'normal', 'wet', 'normal', 'normal'];
  region.weather = { normal: { name: 'Authored winter-to-spring operating window',
    actual: Object.fromEntries(region.zones.map(z => [z.id, [...actual]])),
    forecast: Object.fromEntries(region.zones.map(z => [z.id, [...forecast]])) } };
  delete region.weatherCharts;
  delete region.seasonCalendar;
  // This first profile has direct single-product load mass accounting. Existing
  // standalone collaboration labs and original regional scenarios remain intact.
  delete region.partnerJobs;
  delete region.reciprocalPairs;
  delete region.facilityTransfers;
  delete region.offtakeOffers;
  delete region.auctionDisclosure;
  region.mobilization = { allowedNodes: [...new Set(region.mills.map(m => m.node))], maxHoursPerResource: 16, feePerMove: 100 };
  region.disruptions = [
    { id: 'bc-lesson-washout', title: 'Authored access-spur washout',
      description: 'Fictional closure. Paid inspection and repair require one operating week; waiting allows reopening after operating week 7.',
      kind: 'road', target: 'access-BC04', week: 5, endWeek: 7, revealWeek: 4, repairCost: 12000, repairWeeks: 1 },
    { id: 'bc-lesson-yard', title: 'Fictional receiving interruption',
      description: 'An authored intake interruption; not a report about a real facility.',
      kind: 'mill', target: region.mills[0].id, week: 8, endWeek: 8, revealWeek: 7, repairCost: 5000, repairWeeks: 1 },
  ];
  region.economy = { ...region.economy, startingCash: 120000, fixedWeekly: 900,
    terminalStandingAllowanceM3: 1000, terminalRoadsideAllowanceM3: 100,
    procurementCreditLimit: 30000, annualDebtRate: .08 };
  region.ecology.minimumRetention = .15;
  region.treatments ??= {};
  region.treatments.thinning = { name: 'Commercial thinning (authored)', retention: .65, productivity: .72, cost: 1.12, disturbance: .55 };
  if (region.bcTenure) {
    region.bcTenure.stands = Object.fromEntries(Object.entries(region.bcTenure.stands).filter(([id]) => profileRows.some(r => r.id === id)));
    // Preserve original ID-specific authorization/expiry semantics. Do not
    // regenerate them from the changed array index.
  }
  const dossiers: Record<string, StandDossier> = Object.fromEntries(profileRows.map(row => {
    const source = byId.get(row.id)!, net = source.hectares * row.area;
    const owner = row.id === 'BC18' ? 'bcts' : row.id === 'BC11' ? 'owner' : 'operator';
    return [row.id, {
      inventoryReference: source.name, inventoryAreaHa: source.hectares,
      netTreatmentAreaHa: net, excludedAreaHa: source.hectares - net,
      species: row.species, ageYears: row.age,
      merchantableM3PerHa: { low: Math.round(row.density * .8), central: row.density, high: Math.round(row.density * 1.2) },
      slopeDescription: row.systems.length === 1 ? 'Authored CTL-only site suitability; no surveyed slope or certified equipment limit.' : 'Authored ground-based site suitability; no surveyed slope or certified equipment limit.',
      soil: row.weather.includes('wet') ? 'firm' : 'sensitive',
      systems: row.systems, treatments: row.id === 'BC05' ? ['thinning'] : ['final', 'thinning'],
      layoutReadyWeek: row.ready, allowedWeather: row.weather, minimumRetention: row.retention,
      systemRateFactors: { 'full-tree': row.id === 'BC03' ? .8 : 1, 'cut-to-length': row.id === 'BC05' ? .9 : 1 },
      rationale: row.rationale,
      planningAssumptions: ['Upstream land-use and rights-holder processes are assumed addressed in this fictional case; they are not simulated by a timer.',
        'Area exclusions are numerical assumptions, not mapped riparian buffers, habitat assessments or visual-quality compliance.',
        'Volume bounds show input uncertainty only; they are not hidden random yields or a statistical confidence interval.'],
      fieldTasks: row.id === 'BC24' ? [] : [
        { id: 'closeout-note', label: 'Post-harvest close-out evidence', responsibleParty: 'operator', note: 'Record an exercise observation separately from the financial reserve. No statutory certification is made.' },
        { id: 'regeneration-note', label: 'Regeneration follow-up evidence', responsibleParty: owner, note: 'The responsible party remains visible. Funding a provision does not demonstrate establishment or complete field work.' },
      ],
    } satisfies StandDossier];
  }));
  const p: OperationsProfile = {
    version: 1, id: 'bc-operating-lesson-2026-09-v1', title: 'BC operating decisions · authored lesson',
    authoredOn: '2026-09-17', status: 'illustrative',
    scopeNote: 'Optional teaching rules, not regional calibration. Direct haulage only. Machine-chain capacities are bottleneck caps, not a machine-level event simulator. Load limits and material densities are fictional. A generic analytical route is conservative for the whole fleet.',
    lessonSteps: ['Inspect the stand dossier and distinguish inventory area from treatment area.',
      'Review rights, layout, authorizations, equipment and the operating window.',
      'Choose recovery and outlets for the whole timber mix.', 'Schedule crews and transport; rehearse before applying a draft.',
      'Compare forecast and recorded outcomes; keep field evidence separate from money.'],
    planningContext: ['Policy context is frozen for the exercise, not verified operational guidance.',
      'No real First Nation, landowner, licence holder or mill is assigned an invented decision or commercial term.',
      'The original annual stewardship exercise is a separate abstraction; this profile is not a validated multi-year silviculture model.'],
    stands: dossiers,
    crews: Object.fromEntries(region.crews.map((c, i) => [c.id, {
      system: i === 1 ? 'cut-to-length' : 'full-tree',
      stagesM3PerHour: i === 1 ? { falling: 12, extraction: 10, processing: 9, loading: 12 } : { falling: 17, extraction: 13, processing: 12, loading: 14 },
      transportGrossTonnes: 36, note: 'Illustrative system and lowbed gross mass, not an equipment operating limit.' }])),
    trucks: Object.fromEntries(region.trucks.map((t, i) => [t.id, { tareTonnes: [16, 18, 20][i],
      maximumGrossTonnes: [40, 48, 52][i], note: 'Illustrative complete vehicle/load envelope, not a permitted BC vehicle configuration.' }])),
    roads: {
      'access-BC01': { allowedWeather: ['frozen'], maximumGrossTonnes: 42, loadedSpeedFactor: .7, emptySpeedFactor: .9, delayHours: .08,
        note: 'Fictional seasonal/crossing restriction on a modelled spur. Road improvements cannot override this restriction.' },
      'access-BC03': { allowedWeather: ['normal', 'frozen'], maximumGrossTonnes: 44, loadedSpeedFactor: .75, emptySpeedFactor: .9, delayHours: .05,
        note: 'Authored gross-mass restriction, not bridge inspection data.' },
    },
    productDensityTonnesPerM3: { 'soft-saw': .85, 'soft-pulp': .9, 'hard-saw': .95, 'hard-pulp': 1, poplar: .9 },
    sources: [{ title: 'Inherited pilot geography provenance', url: 'https://github.com/ahzs645/forest-commons/blob/main/research/prince-george-playable-pilot.md',
      note: 'Source of inventory outlines and the pilot road network only. No new regional coefficient evidence was collected for this lesson.' },
      { title: 'Existing BC teaching boundaries', url: 'https://github.com/ahzs645/forest-commons/blob/main/forestry-game/BC-TENURE.md',
        note: 'Existing authored tenure and financial rules are retained. The new profile is not an appraisal, permit or compliance system.' }],
  };
  region.operations = p;
  region.objectives = [
    { id: 'lesson-service', title: 'Receiving commitments', description: 'Discuss service against the commitments chosen by the player.', metric: 'service', direction: 'at-least', target: 80, unit: '%' },
    { id: 'lesson-supply', title: 'Accepted deliveries', description: 'Deliver 4,000 m³ while explaining the product, access and cash tradeoffs. This target has not been calibrated with a teaching cohort.', metric: 'delivered', direction: 'at-least', target: 4000, unit: 'm³' },
    { id: 'lesson-waste', title: 'Recorded waste', description: 'Inspect the causes of expired inventory.', metric: 'waste', direction: 'at-most', target: 8, unit: '%' },
  ];
  region.calibration = emptyCalibration(region, true);
  for (const entry of Object.values(region.calibration.entries))
    entry.notes = 'New authored lesson. No field calibration or professional regional review; operating-profile coefficients also require review.';
  return region;
}
export const bcOperatingLesson = buildBCOperatingLesson();
