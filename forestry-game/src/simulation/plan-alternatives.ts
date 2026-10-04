import type { Game, Plan } from './types';
import { planProblems } from './engine';
import { forecastOutcome } from './planning';

/** Operational orders only. Purchases, bids, commitments and reservations never travel with a draft. */
export type AlternativeOrders = Pick<Plan, 'crews' | 'trucks' | 'retention' | 'processing' | 'reciprocal' | 'facilityTransfers'>;
export interface PlanAlternative { version: 1; name: string; context: string; orders: AlternativeOrders }
export type AlternativePair = [PlanAlternative | null, PlanAlternative | null];
export class AlternativeError extends Error {
  constructor(public readonly kind: 'invalid' | 'stale', public readonly problems: string[] = []) { super(kind); }
}

// A canonical signature avoids differences caused solely by object key insertion order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function alternativeContext(game: Game): string {
  const { crews: _crews, trucks: _trucks, retention: _retention, processing: _processing,
    reciprocal: _reciprocal, facilityTransfers: _transfers, ready: _ready, ...protectedPlan } = game.plan;
  const source = canonical({ ...game, plan: protectedPlan });
  // Two independent 32-bit signatures keep the saved draft small, including for large map datasets.
  let a = 2166136261, b = 5381;
  for (let i = 0; i < source.length; i++) {
    a = Math.imul(a ^ source.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ source.charCodeAt(i);
  }
  return `${game.region.id}:${game.seed}:${game.week}:${source.length}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}`;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const allowed = (row: Record<string, unknown>, keys: string[]) => Object.keys(row).every(k => keys.includes(k));
const optionalText = (value: unknown) => value === undefined || text(value);
const optionalBoolean = (value: unknown) => value === undefined || typeof value === 'boolean';
function ordersShape(value: unknown): value is AlternativeOrders {
  if (!record(value) || !allowed(value, ['crews', 'trucks', 'retention', 'processing', 'reciprocal', 'facilityTransfers']) || !finite(value.retention)) return false;
  const queues = (v: unknown, valid: (row: Record<string, unknown>) => boolean) => record(v) && Object.entries(v).length <= 200 && Object.entries(v).every(([id, rows]) =>
    text(id) && !['__proto__', 'constructor', 'prototype'].includes(id) && Array.isArray(rows) && rows.length <= 1000 && rows.every(row => record(row) && valid(row)));
  if (!queues(value.crews, row => allowed(row, ['stand', 'hours', 'bucking', 'treatment']) && text(row.stand) && finite(row.hours) && optionalText(row.bucking) && optionalText(row.treatment))) return false;
  if (!queues(value.trucks, row => allowed(row, ['stand', 'mill', 'product', 'loads', 'offtake', 'spot', 'process', 'partnerJob']) && text(row.stand) && text(row.mill) && text(row.product) && finite(row.loads) && optionalText(row.offtake) && optionalText(row.partnerJob) && optionalBoolean(row.spot) && optionalBoolean(row.process))) return false;
  if (value.processing !== undefined && (!record(value.processing) || Object.entries(value.processing).length > 200 || !Object.entries(value.processing).every(([id, row]) => text(id) && record(row) && allowed(row, ['volume', 'sell']) && finite(row.volume) && typeof row.sell === 'boolean'))) return false;
  if (value.reciprocal !== undefined && (!Array.isArray(value.reciprocal) || value.reciprocal.length > 1000 || !value.reciprocal.every(row => record(row) && allowed(row, ['pair', 'truckA', 'truckB', 'loads']) && text(row.pair) && text(row.truckA) && text(row.truckB) && finite(row.loads)))) return false;
  if (value.facilityTransfers !== undefined && (!Array.isArray(value.facilityTransfers) || value.facilityTransfers.length > 1000 || !value.facilityTransfers.every(row => record(row) && allowed(row, ['link', 'truck', 'loads']) && text(row.link) && text(row.truck) && finite(row.loads)))) return false;
  return true;
}
function alternativeShape(value: unknown): value is PlanAlternative {
  return record(value) && allowed(value, ['version', 'name', 'context', 'orders']) && value.version === 1 && text(value.name) && value.name.length <= 80 && text(value.context) && ordersShape(value.orders);
}
export function parseAlternatives(raw: string): AlternativePair {
  if (raw.length > 256_000) throw new AlternativeError('invalid');
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || !allowed(value, ['version', 'alternatives']) || value.version !== 1 || !Array.isArray(value.alternatives) || value.alternatives.length !== 2 || !value.alternatives.every(row => row === null || alternativeShape(row))) throw new AlternativeError('invalid');
    return structuredClone(value.alternatives) as AlternativePair;
  } catch { throw new AlternativeError('invalid'); }
}
export function serializeAlternatives(pair: AlternativePair): string {
  const raw = JSON.stringify({ version: 1, alternatives: pair });
  parseAlternatives(raw);
  return raw;
}

function withOrders(game: Game, orders: AlternativeOrders): Game {
  const candidate = structuredClone(game);
  for (const key of ['processing', 'reciprocal', 'facilityTransfers'] as const) delete candidate.plan[key];
  Object.assign(candidate.plan, structuredClone(orders));
  candidate.plan.ready = { purchase: false, production: false, transport: false };
  return candidate;
}
function validateOrders(game: Game, orders: AlternativeOrders) {
  if (!ordersShape(orders) || Object.keys(orders.crews).some(id => !game.region.crews.some(c => c.id === id)) || Object.keys(orders.trucks).some(id => !game.region.trucks.some(t => t.id === id)) ||
    game.region.crews.some(c => !Array.isArray(orders.crews[c.id])) || game.region.trucks.some(t => !Array.isArray(orders.trucks[t.id]))) throw new AlternativeError('invalid');
  const candidate = withOrders(game, orders), check = structuredClone(candidate);
  check.roleMode = false; // Applying a draft always asks each role to review again.
  const problems = planProblems(check);
  if (problems.length) throw new AlternativeError('invalid', problems);
  return candidate;
}
export function captureAlternative(game: Game, name: string): PlanAlternative {
  const { crews, trucks, retention, processing, reciprocal, facilityTransfers } = game.plan;
  const orders = structuredClone({ crews, trucks, retention,
    ...(processing === undefined ? {} : { processing }), ...(reciprocal === undefined ? {} : { reciprocal }),
    ...(facilityTransfers === undefined ? {} : { facilityTransfers }) });
  validateOrders(game, orders);
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) throw new AlternativeError('invalid');
  return { version: 1, name: cleanName, context: alternativeContext(game), orders };
}
export function applyAlternative(game: Game, saved: PlanAlternative): Game {
  if (!alternativeShape(saved)) throw new AlternativeError('invalid');
  if (saved.context !== alternativeContext(game)) throw new AlternativeError('stale');
  return validateOrders(game, saved.orders);
}
export function forecastAlternative(game: Game, saved: PlanAlternative) {
  return forecastOutcome(applyAlternative(game, saved));
}
export function alternativesStorageKey(game: Game, campaignKey: string) {
  return `forest-plan-alternatives-v1:${encodeURIComponent(campaignKey)}:${encodeURIComponent(game.region.id)}:${game.seed}:${game.week}`;
}
