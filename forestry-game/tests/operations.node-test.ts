import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type ProfileGame, type ProfileRegion, type OperationsProfile,
  validateOperationsProfile, validateFieldEvidence, standWorkProblems, profilePlanProblems,
  physicalOperatingWeek, chainBottleneck, operatingProductionRate, operatingRetention,
  operatingPayload, travelGrossTonnes, roadTravelRule, recordFieldEvidence,
} from '../src/simulation/operations-profile';
import { route } from '../src/simulation/routing';
import type { RegionDefinition } from '../src/simulation/types';

function fixture() {
  const profile: OperationsProfile = {
    version: 1, id: 'test-case', title: 'Fictional test case', authoredOn: '2026-09-17',
    status: 'illustrative', scopeNote: 'Test coefficients only.', lessonSteps: ['Review then run'],
    planningContext: ['Fictional prerequisites, not real approvals.'],
    stands: { S1: {
      inventoryReference: 'test-outline', inventoryAreaHa: 10, netTreatmentAreaHa: 8,
      excludedAreaHa: 2, species: { spruce: .7, pine: .3 }, ageYears: 80,
      merchantableM3PerHa: { low: 80, central: 100, high: 120 },
      slopeDescription: 'Authored equipment eligibility, not a surveyed slope.', soil: 'sensitive',
      systems: ['cut-to-length'], treatments: ['thinning'], layoutReadyWeek: 3,
      allowedWeather: ['normal', 'frozen'], minimumRetention: .65,
      systemRateFactors: { 'cut-to-length': .8 }, rationale: 'Explicit test case.',
      planningAssumptions: ['No statutory approval is inferred.'],
      fieldTasks: [
        { id: 'closeout', label: 'Close-out note', responsibleParty: 'operator', note: 'Evidence required separately.' },
        { id: 'owner', label: 'Owner task', responsibleParty: 'owner', note: 'Owner responsibility.' },
      ],
    } },
    crews: {
      C1: { system: 'cut-to-length', transportGrossTonnes: 30, stagesM3PerHour: { falling: 20, extraction: 12, processing: 10, loading: 15 }, note: 'Test CTL chain.' },
      C2: { system: 'full-tree', transportGrossTonnes: 42, stagesM3PerHour: { falling: 30, extraction: 20, processing: 18, loading: 25 }, note: 'Test full-tree chain.' },
    },
    trucks: { T1: { tareTonnes: 20, maximumGrossTonnes: 44, note: 'Test truck.' } },
    roads: { E1: { allowedWeather: ['frozen'], maximumGrossTonnes: 40, loadedSpeedFactor: .5, emptySpeedFactor: 1, delayHours: .1, note: 'Fictional crossing.' } },
    productDensityTonnesPerM3: { log: 1, pulp: .8 },
    sources: [{ title: 'Test fixture', url: 'https://example.org/fixture', note: 'Synthetic; not operational data.' }],
  };
  const region = {
    operations: profile, weeks: 12, turnDurationWeeks: 1,
    stands: [{ id: 'S1', hectares: 10, volume: 800, supply: 'guaranteed' }],
    crews: [{ id: 'C1' }, { id: 'C2' }], trucks: [{ id: 'T1', payload: 30 }],
    mills: [{ id: 'M1' }], products: [{ id: 'log' }, { id: 'pulp' }],
    roads: {
      nodes: [{ id: 'A', position: [0, 0] }, { id: 'B', position: [1, 0] }, { id: 'C', position: [0, 1] }],
      edges: [
        { id: 'E1', from: 'A', to: 'B', km: 10, speed: 40, bearing: 1, zone: 'north', geometry: [[0, 0], [1, 0]], name: 'Test restricted crossing' },
      ],
    },
    treatments: { thinning: {} },
  } satisfies ProfileRegion & { roads: { nodes: unknown[]; edges: unknown[] } };
  const game: ProfileGame & { cash: number } = {
    region, week: 3, cash: 1000, stands: [{ id: 'S1', owned: true, harvested: 100 }],
    plan: { crews: { C1: [{ stand: 'S1', treatment: 'thinning' }], C2: [] }, trucks: { T1: [] },
      ready: { purchase: true, production: true, transport: true } },
  };
  return { region, game, profile };
}
const routingRegion = (region: ProfileRegion) => region as unknown as RegionDefinition;

test('complete authored profile validates without mutating it', () => {
  const { region } = fixture(), before = JSON.stringify(region);
  validateOperationsProfile(region); assert.equal(JSON.stringify(region), before);
});
test('inventory area, treatment area and excluded area must reconcile', () => {
  const { region } = fixture(); region.operations.stands.S1.excludedAreaHa = 3;
  assert.throws(() => validateOperationsProfile(region), /stand S1/);
});
test('modelled volume must use net area, not inventory area', () => {
  const { region } = fixture(); region.stands[0].volume = 1000;
  assert.throws(() => validateOperationsProfile(region), /volume basis/);
});
test('non-finite coefficients are rejected', () => {
  const { region } = fixture(); region.operations.productDensityTonnesPerM3.log = NaN;
  assert.throws(() => validateOperationsProfile(region), /density/);
});
test('unknown references and invalid dates are rejected', () => {
  const { region } = fixture(); region.operations.authoredOn = '2026-02-30';
  assert.throws(() => validateOperationsProfile(region), /metadata/);
  region.operations.authoredOn = '2026-09-17'; region.operations.roads.unknown = region.operations.roads.E1;
  assert.throws(() => validateOperationsProfile(region), /references/);
});
test('species composition must total one', () => {
  const { region } = fixture(); region.operations.stands.S1.species.pine = .4;
  assert.throws(() => validateOperationsProfile(region), /species/);
});
test('old regions require no profile and preserve legacy rate, retention and payload', () => {
  const { region } = fixture(); const old = { ...region, operations: undefined };
  validateOperationsProfile(old);
  assert.equal(operatingProductionRate(old, 'C1', 'S1', 19), 19);
  assert.equal(operatingRetention(old, 'S1', .15), .15);
  assert.equal(operatingPayload(old, 'T1', 'log'), 30);
  assert.deepEqual(roadTravelRule(old, 'E1', 'thaw'), { allowed: true, speedFactor: 1, delayHours: 0 });
});
test('operating time is invariant for weekly, half-week and daily turns', () => {
  const { game } = fixture();
  for (const [duration, turn] of [[1, 3], [.5, 5], [1 / 7, 15]]) {
    game.region.turnDurationWeeks = duration; game.week = turn;
    assert.equal(physicalOperatingWeek(game), 3);
    assert.equal(standWorkProblems(game, 'S1', 'C1', 'thinning', 'frozen').length, 0);
  }
});
test('layout not ready is a runtime prerequisite, not an invalid plan', () => {
  const { game } = fixture(); game.week = 1;
  assert(standWorkProblems(game, 'S1', 'C1', 'thinning').some(x => x.code === 'layout'));
  assert.equal(profilePlanProblems(game).length, 0);
});
test('wrong equipment and treatment cannot be traded for a penalty', () => {
  const { game } = fixture(); game.plan.crews.C2 = [{ stand: 'S1', treatment: 'final' }];
  assert.equal(profilePlanProblems(game).length, 2);
});
test('seasonal access is checked against the explicitly supplied weather', () => {
  const { game } = fixture();
  assert.equal(standWorkProblems(game, 'S1', 'C1', 'thinning', 'frozen').length, 0);
  assert(standWorkProblems(game, 'S1', 'C1', 'thinning', 'wet').some(x => x.code === 'season'));
});
test('production uses the bottleneck without increasing a slower base rate', () => {
  const { region } = fixture();
  assert.deepEqual(chainBottleneck(region, 'C1', 'S1'), { stage: 'processing', rateM3PerHour: 8 });
  assert.equal(operatingProductionRate(region, 'C1', 'S1', 20, 'normal'), 8);
  assert.equal(operatingProductionRate(region, 'C1', 'S1', 20, 'wet'), 6.4);
  assert.equal(operatingProductionRate(region, 'C1', 'S1', 4, 'wet'), 4);
  assert.equal(operatingRetention(region, 'S1', .2), .65);
});
test('payload is limited by both volume and product-dependent net mass', () => {
  const { region } = fixture();
  assert.equal(operatingPayload(region, 'T1', 'log'), 24);
  assert.equal(operatingPayload(region, 'T1', 'pulp'), 30);
  assert.equal(operatingPayload(region, 'missing', 'log'), 0);
  assert.equal(operatingPayload(region, 'T1', 'unknown'), 0);
});
test('gross mass distinguishes empty, partial and full loads', () => {
  const { region } = fixture();
  assert.equal(travelGrossTonnes(region, { kind: 'truck', id: 'T1', product: 'log', payloadM3: 0 }), 20);
  assert.equal(travelGrossTonnes(region, { kind: 'truck', id: 'T1', product: 'log', payloadM3: 18 }), 38);
  assert.equal(travelGrossTonnes(region, { kind: 'truck', id: 'T1', product: 'log' }), 44);
  assert.equal(travelGrossTonnes(region), 44);
});
test('unknown equipment, overcapacity and negative loads fail closed', () => {
  const { region } = fixture();
  for (const payloadM3 of [-1, 25, Infinity, NaN]) assert.equal(travelGrossTonnes(region,
    { kind: 'truck', id: 'T1', product: 'log', payloadM3 }), Infinity);
  assert.equal(travelGrossTonnes(region, { kind: 'crew', id: 'missing' }), Infinity);
});
test('crossing restrictions apply even after bearing upgrades', () => {
  const { region } = fixture(), r = routingRegion(region);
  assert.equal(route(r, 'A', 'B', { north: 'frozen' }, ['E1'], { kind: 'truck', id: 'T1', product: 'log' }), null);
  assert.equal(route(r, 'A', 'B', { north: 'wet' }, ['E1'], { kind: 'crew', id: 'C1' }), null);
  assert(route(r, 'A', 'B', { north: 'frozen' }, [], { kind: 'crew', id: 'C1' }));
});
test('empty and loaded times use separate speed factors and handling delay', () => {
  const { region } = fixture(), r = routingRegion(region);
  const empty = route(r, 'A', 'B', { north: 'frozen' }, [], { kind: 'truck', id: 'T1', product: 'log', payloadM3: 0 });
  const loaded = route(r, 'A', 'B', { north: 'frozen' }, [], { kind: 'truck', id: 'T1', product: 'log', payloadM3: 18 });
  assert.equal(empty?.hours, .35); assert.equal(loaded?.hours, .6);
  assert.deepEqual(loaded?.nodes, ['A', 'B']);
});
test('no-vehicle analytical routing is conservative, not falsely certified', () => {
  const { region } = fixture(); assert.equal(route(routingRegion(region), 'A', 'B', { north: 'frozen' }), null);
});
test('same-node routing still rejects an invalid vehicle request', () => {
  const { region } = fixture();
  assert.equal(route(routingRegion(region), 'A', 'A', { north: 'frozen' }, [], { kind: 'crew', id: 'missing' }), null);
});
test('legacy road distances and hours remain unchanged', () => {
  const { region } = fixture();
  const result = route(routingRegion({ ...region, operations: undefined }), 'A', 'B', { north: 'thaw' });
  assert.equal(result?.km, 10); assert.equal(result?.hours, .25);
});
test('field evidence records notes immutably without changing cash', () => {
  const { game } = fixture(), before = JSON.stringify(game);
  const next = recordFieldEvidence(game, 'S1', 'closeout', 'Exercise inspection notes only.');
  assert.equal(JSON.stringify(game), before); assert.equal(next.cash, 1000);
  assert.equal(next.fieldEvidence?.length, 1);
  assert.deepEqual(next.plan.ready, { purchase: false, production: false, transport: false });
  validateFieldEvidence(next);
});
test('field evidence survives a JSON roundtrip and cannot overwrite an original note', () => {
  const { game } = fixture();
  const next = recordFieldEvidence(game, 'S1', 'closeout', 'Documented exercise observation.');
  validateFieldEvidence(JSON.parse(JSON.stringify(next)));
  assert.throws(() => recordFieldEvidence(next, 'S1', 'closeout', 'Different later observation.'), /immutable/);
});
test('field notes cannot certify somebody else’s task or unharvested timber', () => {
  const { game } = fixture();
  assert.throws(() => recordFieldEvidence(game, 'S1', 'owner', 'Owner work claimed by operator.'), /Only operator/);
  game.stands[0].harvested = 0;
  assert.throws(() => recordFieldEvidence(game, 'S1', 'closeout', 'No harvest happened yet.'), /Only operator/);
});
test('invalid and duplicate evidence imports are rejected', () => {
  const { game } = fixture();
  const next = recordFieldEvidence(game, 'S1', 'closeout', 'Documented exercise observation.');
  next.fieldEvidence!.push({ ...next.fieldEvidence![0] });
  assert.throws(() => validateFieldEvidence(next), /Invalid save/);
  next.fieldEvidence!.pop(); next.fieldEvidence![0].recordedTurn = 30;
  assert.throws(() => validateFieldEvidence(next), /Invalid save/);
});
test('profile rejects unmodelled mixed-cargo modes without disabling them in old scenarios', () => {
  const { game } = fixture(); game.plan.trucks.T1.push({ partnerJob: 'P1' });
  assert(profilePlanProblems(game).some(message => message.includes('direct haulage only')));
  game.region.operations = undefined; assert.deepEqual(profilePlanProblems(game), []);
});
