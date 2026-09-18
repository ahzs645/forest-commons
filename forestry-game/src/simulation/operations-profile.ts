/**
 * Optional, versioned operating rules. No React, engine or routing imports:
 * authoritative settlement, forecasts and interface adapters share these rules.
 * All built-in coefficients are authored teaching values, NOT BC prescriptions.
 */
export type OperatingWeather = 'thaw' | 'wet' | 'normal' | 'frozen';
export type HarvestSystem = 'full-tree' | 'cut-to-length';
export type FindingLevel = 'blocked' | 'warning' | 'ready';
export interface OperatingFinding {
  code: string;
  level: FindingLevel;
  subject: string;
  message: string;
  action?: 'permits' | 'production' | 'transport' | 'commitments' | 'evidence';
}
export interface StandDossier {
  inventoryReference: string;
  /** Display only: the source outline is NOT a mapped treatment boundary. */
  inventoryAreaHa: number;
  netTreatmentAreaHa: number;
  excludedAreaHa: number;
  species: Record<string, number>;
  ageYears: number;
  merchantableM3PerHa: { low: number; central: number; high: number };
  slopeDescription: string;
  soil: 'firm' | 'sensitive';
  systems: HarvestSystem[];
  treatments: string[];
  /** Physical operating-week boundary, never a turn index or service standard. */
  layoutReadyWeek: number;
  allowedWeather: OperatingWeather[];
  minimumRetention: number;
  systemRateFactors: Partial<Record<HarvestSystem, number>>;
  rationale: string;
  planningAssumptions: string[];
  fieldTasks: { id: string; label: string; responsibleParty: 'operator' | 'bcts' | 'owner'; note: string }[];
}
export interface CrewSystem {
  system: HarvestSystem;
  /** Whole-chain bottleneck model. There is no intermediate machine inventory. */
  stagesM3PerHour: { falling: number; extraction: number; processing: number; loading: number };
  transportGrossTonnes: number;
  note: string;
}
export interface TruckMassProfile {
  tareTonnes: number;
  maximumGrossTonnes: number;
  note: string;
}
export interface RoadOperatingRule {
  allowedWeather: OperatingWeather[];
  maximumGrossTonnes?: number;
  loadedSpeedFactor: number;
  emptySpeedFactor: number;
  delayHours: number;
  note: string;
}
export interface OperationsProfile {
  version: 1;
  id: string;
  title: string;
  authoredOn: string;
  status: 'illustrative';
  scopeNote: string;
  lessonSteps: string[];
  planningContext: string[];
  stands: Record<string, StandDossier>;
  crews: Record<string, CrewSystem>;
  trucks: Record<string, TruckMassProfile>;
  roads: Record<string, RoadOperatingRule>;
  productDensityTonnesPerM3: Record<string, number>;
  sources: { title: string; url: string; note: string }[];
}
export interface FieldEvidenceRecord {
  stand: string;
  task: string;
  note: string;
  recordedTurn: number;
  /** Annotation only: no claim that statutory fieldwork was certified. */
  status: 'recorded-in-exercise';
}
/** Structural contracts let the pure rules run without constructing the UI. */
export interface ProfileRegion {
  operations?: OperationsProfile;
  weeks: number;
  turnDurationWeeks?: number;
  stands: { id: string; hectares: number; volume: number; supply: string }[];
  crews: { id: string }[];
  trucks: { id: string; payload: number }[];
  mills: { id: string }[];
  products: { id: string }[];
  roads: { edges: { id: string }[] };
  treatments?: Record<string, unknown>;
}
export interface ProfileGame {
  region: ProfileRegion;
  week: number;
  stands: { id: string; owned: boolean; harvested: number }[];
  plan: {
    crews: Record<string, { stand: string; treatment?: string }[]>;
    trucks: Record<string, { partnerJob?: string }[]>;
    reciprocal?: unknown[];
    facilityTransfers?: unknown[];
    ready: Record<'purchase' | 'production' | 'transport', boolean>;
  };
  fieldEvidence?: FieldEvidenceRecord[];
}
export type TravelRequest =
  | { kind: 'truck'; id: string; product: string; payloadM3?: number }
  | { kind: 'crew'; id: string };

const EPS = 1e-7;
export const physicalOperatingWeek = (game: Pick<ProfileGame, 'week' | 'region'>): number =>
  1 + (game.week - 1) * (game.region.turnDurationWeeks ?? 1);

export function standWorkProblems(
  game: Pick<ProfileGame, 'week' | 'region'>,
  standId: string,
  crewId: string,
  treatment = 'final',
  weather?: OperatingWeather,
): OperatingFinding[] {
  const p = game.region.operations;
  if (!p) return [];
  const stand = p.stands[standId], crew = p.crews[crewId];
  if (!stand || !crew) return [{ code: 'missing-profile', level: 'blocked', subject: standId,
    message: 'Operating profile missing for this stand or crew.', action: 'evidence' }];
  const issues: OperatingFinding[] = [];
  const block = (code: string, message: string, action: OperatingFinding['action']) =>
    issues.push({ code, level: 'blocked', subject: standId, message, action });
  if (physicalOperatingWeek(game) + EPS < stand.layoutReadyWeek)
    block('layout', `Authored layout package becomes available in operating week ${stand.layoutReadyWeek}.`, 'permits');
  if (!stand.systems.includes(crew.system))
    block('system', `${crewId}: ${crew.system} is not an eligible system for ${standId}.`, 'production');
  if (!stand.treatments.includes(treatment))
    block('treatment', `${standId}: ${treatment} is not an eligible treatment.`, 'production');
  if (weather !== undefined && !stand.allowedWeather.includes(weather))
    block('season', `${standId}: ${weather} is outside the authored operating window.`, 'production');
  return issues;
}

/** Static incompatible work is rejected, not exchanged for a monetary penalty. */
export function profilePlanProblems(game: ProfileGame): string[] {
  if (!game.region.operations) return [];
  const issues: string[] = [];
  for (const [crew, orders] of Object.entries(game.plan.crews))
    for (const order of orders)
      issues.push(...standWorkProblems(game, order.stand, crew, order.treatment)
        .filter(i => i.code !== 'layout').map(i => i.message));
  // Do not silently run an un-modelled mixed-cargo mass balance. The original
  // regional scenarios retain all existing collaboration and transfer modes.
  if (Object.values(game.plan.trucks).some(orders => orders.some(o => o.partnerJob)) ||
      game.plan.reciprocal?.length || game.plan.facilityTransfers?.length)
    issues.push('This operating profile supports direct haulage only. Remove pooled, reciprocal or intermill loads, or use the original regional scenario.');
  return [...new Set(issues)];
}

export function chainBottleneck(region: ProfileRegion, crewId: string, standId: string) {
  const crew = region.operations?.crews[crewId];
  const stand = region.operations?.stands[standId];
  if (!crew || !stand) return null;
  const factor = stand.systemRateFactors[crew.system] ?? 1;
  const entries = Object.entries(crew.stagesM3PerHour).sort((a, b) => a[1] - b[1]);
  return { stage: entries[0][0], rateM3PerHour: entries[0][1] * factor };
}
export function operatingProductionRate(
  region: ProfileRegion, crew: string, stand: string, unconstrainedRate: number,
  weather: OperatingWeather = 'normal',
): number {
  const limit = chainBottleneck(region, crew, stand);
  const weatherFactor = weather === 'wet' ? .8 : weather === 'thaw' ? .65 : 1;
  return limit ? Math.min(unconstrainedRate, limit.rateM3PerHour * weatherFactor) : unconstrainedRate;
}
export function operatingRetention(region: ProfileRegion, stand: string, existing: number): number {
  return Math.max(existing, region.operations?.stands[stand]?.minimumRetention ?? 0);
}
export function operatingPayload(region: ProfileRegion, truckId: string, product: string): number {
  const truck = region.trucks.find(t => t.id === truckId);
  if (!truck) return 0;
  if (!region.operations) return truck.payload;
  const mass = region.operations.trucks[truckId];
  const density = region.operations.productDensityTonnesPerM3[product];
  if (!mass || !(density > 0)) return 0;
  return Math.max(0, Math.min(truck.payload, (mass.maximumGrossTonnes - mass.tareTonnes) / density));
}
export function travelGrossTonnes(region: ProfileRegion, request?: TravelRequest): number {
  const p = region.operations;
  if (!p) return 0;
  if (request?.kind === 'crew') return p.crews[request.id]?.transportGrossTonnes ?? Infinity;
  if (request?.kind === 'truck') {
    const truck = p.trucks[request.id];
    const density = p.productDensityTonnesPerM3[request.product];
    const volume = request.payloadM3 ?? operatingPayload(region, request.id, request.product);
    if (!truck || !(density > 0) || !Number.isFinite(volume) || volume < 0 ||
        volume > operatingPayload(region, request.id, request.product) + EPS) return Infinity;
    return truck.tareTonnes + volume * density;
  }
  // Legacy analytical callers have no vehicle identity: their route is
  // conservative for the whole configured fleet, not falsely certified.
  return Math.max(0, ...Object.values(p.trucks).map(t => t.maximumGrossTonnes),
    ...Object.values(p.crews).map(c => c.transportGrossTonnes));
}
export function roadTravelRule(
  region: ProfileRegion, edgeId: string, weather: OperatingWeather, request?: TravelRequest,
): { allowed: boolean; speedFactor: number; delayHours: number } {
  if (!region.operations) return { allowed: true, speedFactor: 1, delayHours: 0 };
  const gross = travelGrossTonnes(region, request);
  if (!Number.isFinite(gross)) return { allowed: false, speedFactor: 1, delayHours: 0 };
  const rule = region.operations.roads[edgeId];
  if (!rule) return { allowed: true, speedFactor: 1, delayHours: 0 };
  const empty = request?.kind === 'truck' && request.payloadM3 === 0;
  return {
    allowed: rule.allowedWeather.includes(weather) &&
      (rule.maximumGrossTonnes === undefined || gross <= rule.maximumGrossTonnes + EPS),
    speedFactor: empty ? rule.emptySpeedFactor : rule.loadedSpeedFactor,
    delayHours: rule.delayHours,
  };
}

/** Record exercise evidence, not an authorization or statutory certification. */
export function recordFieldEvidence<G extends ProfileGame>(
  game: G, standId: string, taskId: string, note: string,
): G {
  const stand = game.stands.find(s => s.id === standId);
  const task = game.region.operations?.stands[standId]?.fieldTasks.find(t => t.id === taskId);
  const text = note.trim();
  if (!stand?.owned || !(stand.harvested > 0) || !task || task.responsibleParty !== 'operator')
    throw Error('Only operator tasks for harvested, secured timber can be annotated.');
  if (!Number.isInteger(game.week) || game.week < 1 || game.week > game.region.weeks + 1 || text.length < 8 || text.length > 1000)
    throw Error('Enter an evidence note of 8–1,000 characters within this campaign.');
  const next = structuredClone(game);
  next.fieldEvidence ??= [];
  if (next.fieldEvidence.some(e => e.stand === standId && e.task === taskId))
    throw Error('Evidence is already recorded for this task. Original records are immutable.');
  next.fieldEvidence.push({ stand: standId, task: taskId, note: text,
    recordedTurn: game.week, status: 'recorded-in-exercise' });
  next.plan.ready = { purchase: false, production: false, transport: false };
  return next;
}

/** Validate every optional extension at the scenario/save boundary. */
export function validateOperationsProfile(region: ProfileRegion): void {
  const p = region.operations;
  if (p === undefined) return;
  const fail = (field: string): never => { throw Error(`Invalid operating profile: ${field}`); };
  const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  const text = (x: unknown, max = 1000): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
  const number = (x: unknown, low: number, high: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= low && x <= high;
  const keys = (x: unknown, ids: string[], complete: boolean) => record(x) &&
    Object.keys(x).every(k => ids.includes(k)) && (!complete || Object.keys(x).length === ids.length);
  const strings = (x: unknown, max = 30): x is string[] => Array.isArray(x) && x.length > 0 && x.length <= max && x.every(v => text(v));
  const weather = (x: unknown): x is OperatingWeather[] => strings(x, 4) && new Set(x).size === x.length && x.every(v => ['thaw', 'wet', 'normal', 'frozen'].includes(v));
  if (!record(p) || p.version !== 1 || p.status !== 'illustrative' || !text(p.id, 100) ||
      !text(p.title) || !text(p.scopeNote) || !text(p.authoredOn, 10) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(p.authoredOn) || Number.isNaN(Date.parse(p.authoredOn)) ||
      new Date(p.authoredOn).toISOString().slice(0, 10) !== p.authoredOn ||
      !strings(p.lessonSteps) || !strings(p.planningContext)) fail('metadata');
  if (!keys(p.stands, region.stands.map(s => s.id), true) ||
      !keys(p.crews, region.crews.map(c => c.id), true) ||
      !keys(p.trucks, region.trucks.map(t => t.id), true) ||
      !keys(p.roads, region.roads.edges.map(e => e.id), false) ||
      !keys(p.productDensityTonnesPerM3, region.products.map(x => x.id), true)) fail('entity references');
  for (const density of Object.values(p.productDensityTonnesPerM3))
    if (!number(density, .05, 3)) fail('product density');
  for (const [id, d] of Object.entries(p.stands)) {
    const s = region.stands.find(s => s.id === id)!;
    if (!record(d) || !text(d.inventoryReference) || !text(d.slopeDescription) || !text(d.rationale) ||
        !number(d.inventoryAreaHa, .000001, 1e7) || Math.abs(d.inventoryAreaHa - s.hectares) > .011 ||
        !number(d.netTreatmentAreaHa, 0, d.inventoryAreaHa) || !number(d.excludedAreaHa, 0, d.inventoryAreaHa) ||
        Math.abs(d.netTreatmentAreaHa + d.excludedAreaHa - d.inventoryAreaHa) > .011 ||
        !number(d.ageYears, 0, 1000) || !['firm', 'sensitive'].includes(d.soil) ||
        !number(d.layoutReadyWeek, 1, 105) || !number(d.minimumRetention, 0, .8) ||
        !weather(d.allowedWeather) || !strings(d.systems, 2) ||
        !d.systems.every(x => ['full-tree', 'cut-to-length'].includes(x)) ||
        !strings(d.treatments) || !d.treatments.every(x => x === 'final' || !!region.treatments?.[x]) ||
        !strings(d.planningAssumptions)) fail(`stand ${id}`);
    if (!record(d.species) || Object.keys(d.species).length < 1 || Object.keys(d.species).length > 20 ||
        Object.entries(d.species).some(([k, v]) => !text(k, 80) || !number(v, 0, 1)) ||
        Math.abs(Object.values(d.species).reduce((a, b) => a + b, 0) - 1) > EPS) fail(`species ${id}`);
    const v = d.merchantableM3PerHa;
    if (!record(v) || ![v.low, v.central, v.high].every(n => number(n, 0, 1500)) ||
        v.low > v.central || v.central > v.high ||
        Math.abs(s.volume - Math.round(d.netTreatmentAreaHa * v.central)) > 1) fail(`volume basis ${id}`);
    if (!record(d.systemRateFactors) || Object.entries(d.systemRateFactors).some(([k, v]) =>
      !['full-tree', 'cut-to-length'].includes(k) || !number(v, .1, 3))) fail(`system factors ${id}`);
    if (!Array.isArray(d.fieldTasks) || d.fieldTasks.length > 12 || new Set(d.fieldTasks.map(t => t?.id)).size !== d.fieldTasks.length ||
        d.fieldTasks.some(t => !t || !text(t.id, 80) || !text(t.label) || !text(t.note) ||
          !['operator', 'bcts', 'owner'].includes(t.responsibleParty))) fail(`field tasks ${id}`);
  }
  for (const [id, c] of Object.entries(p.crews)) {
    if (!c || !['full-tree', 'cut-to-length'].includes(c.system) || !number(c.transportGrossTonnes, 1, 200) ||
        !text(c.note) || !keys(c.stagesM3PerHour, ['falling', 'extraction', 'processing', 'loading'], true) ||
        !Object.values(c.stagesM3PerHour).every(n => number(n, .01, 1000))) fail(`crew ${id}`);
  }
  for (const [id, t] of Object.entries(p.trucks))
    if (!t || !number(t.tareTonnes, 1, 100) || !number(t.maximumGrossTonnes, t.tareTonnes + .001, 200) || !text(t.note)) fail(`truck ${id}`);
  for (const [id, r] of Object.entries(p.roads))
    if (!r || !weather(r.allowedWeather) || !number(r.loadedSpeedFactor, .05, 1) ||
        !number(r.emptySpeedFactor, .05, 1) || !number(r.delayHours, 0, 24) || !text(r.note) ||
        (r.maximumGrossTonnes !== undefined && !number(r.maximumGrossTonnes, 1, 200))) fail(`road ${id}`);
  if (!Array.isArray(p.sources) || !p.sources.length || p.sources.length > 30 ||
      p.sources.some(s => !s || !text(s.title) || !text(s.note) || !text(s.url, 2000) ||
        !/^https:\/\/[^\s]+$/.test(s.url))) fail('sources');
}
export function validateFieldEvidence(game: ProfileGame): void {
  if (game.fieldEvidence === undefined) return;
  if (!game.region.operations || !Array.isArray(game.fieldEvidence) || game.fieldEvidence.length > 12000)
    throw Error('Invalid save: operating field evidence');
  const seen = new Set<string>();
  for (const entry of game.fieldEvidence) {
    const task = game.region.operations.stands[entry?.stand]?.fieldTasks.find(t => t.id === entry?.task);
    const state = game.stands.find(s => s.id === entry?.stand);
    const key = JSON.stringify([entry?.stand, entry?.task]);
    if (!task || task.responsibleParty !== 'operator' || !state?.owned || !(state.harvested > 0) ||
        !Number.isInteger(entry.recordedTurn) || entry.recordedTurn < 1 || entry.recordedTurn > game.week ||
        entry.status !== 'recorded-in-exercise' || typeof entry.note !== 'string' ||
        entry.note.trim().length < 8 || entry.note.length > 1000 || seen.has(key))
      throw Error('Invalid save: operating field evidence record');
    seen.add(key);
  }
}
