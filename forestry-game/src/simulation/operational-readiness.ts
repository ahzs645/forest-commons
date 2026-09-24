import type { Game } from './types';
import { month, planProblems, stockAt, sum } from './engine';
import { operatingRegion, activeDisruptions } from './disruptions';
import { canAccess, route, weatherAt } from './routing';
import { harvestAuthorizationProblem } from './tenure';
import { retainedFraction } from './treatments';
import { operatingPayload, standWorkProblems, type OperatingFinding } from './operations-profile';

export interface ReadinessCheck extends OperatingFinding {
  scope: 'harvest' | 'haul' | 'context';
  label: string;
}
export interface ReadinessSelection {
  crew?: string;
  treatment?: string;
  truck?: string;
  mill?: string;
  product?: string;
}
/**
 * Forecast-only adapter: never consults actual future weather, unrevealed
 * disruptions, future bids or another classroom role's private economics.
 * A green route does not promise time, shared stock or dispatch fulfillment.
 */
export function siteReadiness(game: Game, standId: string, selection: ReadinessSelection = {}): ReadinessCheck[] {
  const def = game.region.stands.find(s => s.id === standId);
  const state = game.stands.find(s => s.id === standId);
  const checks: ReadinessCheck[] = [];
  const add = (scope: ReadinessCheck['scope'], code: string, label: string,
    level: ReadinessCheck['level'], message: string, action?: ReadinessCheck['action']) =>
    checks.push({ scope, code, label, level, subject: standId, message, action });
  if (!def || !state) {
    add('context', 'unknown', 'Site', 'blocked', 'The selected site is not in this campaign.');
    return checks;
  }
  if (game.week > game.region.weeks) {
    add('context', 'complete', 'Campaign', 'warning', 'Season complete. The dossier and recorded results remain available.');
    return checks;
  }
  const region = operatingRegion(game), weather = weatherAt(game, true);
  const protectedSite = def.supply === 'protected';
  const owned = state.owned && !state.refused && !protectedSite;
  add('harvest', 'rights', 'Timber rights', owned ? 'ready' : 'blocked',
    owned ? 'Timber is secured in this exercise.' : protectedSite ? 'Harvesting is prohibited in this teaching area.' : 'Secure eligible timber before scheduling harvest.', 'permits');
  const authorization = harvestAuthorizationProblem(game, standId);
  add('harvest', 'authorization', 'Harvest authorization', authorization ? 'blocked' : 'ready',
    authorization ?? 'No outstanding harvest authorization in this simulation.', 'permits');
  const crew = selection.crew ? region.crews.find(c => c.id === selection.crew) :
    region.crews.find(c => !standWorkProblems(game, standId, c.id, selection.treatment, weather[def.zone]).length && c.hours > 0);
  const eligible = crew ? standWorkProblems(game, standId, crew.id, selection.treatment, weather[def.zone]) : [];
  const volume = Math.max(0, state.remaining - def.volume * retainedFraction(game,
    { stand: standId, hours: 1, treatment: selection.treatment }));
  add('harvest', 'volume', 'Recoverable standing stock', volume > .001 ? 'ready' : 'blocked',
    `${Math.round(volume).toLocaleString('en-CA')} m³ available above the treatment retention floor.`, 'production');
  add('harvest', 'terrain', 'Forecast site access', canAccess(def.terrain, weather[def.zone]) ? 'ready' : 'blocked',
    `Forecast: ${weather[def.zone]}. Terrain access does not establish road access.`, 'production');
  if (!crew || crew.hours <= 0)
    add('harvest', 'crew', 'Eligible equipment', 'blocked', 'No available selected/eligible crew. Choose a compatible system and treatment.', 'production');
  else {
    add('harvest', 'crew', 'Eligible equipment', eligible.length ? 'blocked' : 'ready',
      eligible.length ? eligible.map(e => e.message).join(' ') : `${crew.name}: system and authored prerequisites match.`, 'production');
    const connection = route(region, game.crewPositions[crew.id], def.node, weather,
      game.improvedRoads, { kind: 'crew', id: crew.id });
    add('harvest', 'relocation', 'Authorized relocation route', connection ? 'ready' : 'blocked',
      connection ? `${connection.km.toFixed(1)} km; check assigned hours in the rehearsal.` :
        'No eligible route for this equipment. Check permission, closures and crossing limits.', 'transport');
  }
  const products = selection.product ? [selection.product] :
    game.region.products.filter(p => (def.mix[p.id] ?? 0) > 0).map(p => p.id);
  const mills = region.mills.filter(m => !selection.mill || m.id === selection.mill);
  const trucks = region.trucks.filter(t => (!selection.truck || t.id === selection.truck) && t.hours > 0);
  const stock = stockAt(game, standId);
  add('haul', 'secured', 'Shipment rights', owned ? 'ready' : 'blocked',
    owned ? 'Timber is secured in the exercise.' : 'This timber is not available for ordinary dispatch.', 'permits');
  // Empty roadside stock is expected when this turn's crew plan cuts the site
  // first; flagging every such haul hides the orders that really have no timber.
  const stocked = products.some(p => (stock[p] ?? 0) > 0);
  const harvestedThisTurn = Object.values(game.plan.crews).some(orders => orders.some(o => o.stand === standId && o.hours > 0));
  const now = Math.round(products.reduce((n, p) => n + (stock[p] ?? 0), 0)).toLocaleString('en-CA');
  add('haul', 'stock', 'Roadside stock now', stocked || harvestedThisTurn ? 'ready' : 'warning',
    stocked || !harvestedThisTurn ? `${now} m³ now. Same-turn harvest may add stock; rehearsal checks fulfillment.`
      : `${now} m³ now; this turn’s crew plan harvests here first. Rehearsal checks fulfillment.`, 'production');
  const millClosed = (id: string) => activeDisruptions(game).some(d => d.kind === 'mill' && d.target === id);
  const marketOpen = (m: typeof mills[number], p: string) => p in m.prices && !millClosed(m.id) &&
    (m.demand[month(game)][p] ?? 0) > (game.deliveries[m.id]?.[p] ?? 0);
  const accepted = products.filter(p => mills.some(m => marketOpen(m, p)));
  add('haul', 'outlet', 'Ordinary receiving capacity', accepted.length ? 'ready' : 'blocked',
    accepted.length ? 'At least one selected assortment has remaining ordinary intake. Spot and contract outlets are checked separately in rehearsal.' :
      'No remaining ordinary intake for this selection. Change the outlet/product or review a contract/processing order.', 'commitments');
  const missing = products.filter(p => !mills.some(m => p in m.prices));
  if (missing.length) add('context', 'recovery-outlets', 'Whole-site recovery', 'warning',
    `No selected outlet for: ${missing.join(', ')}. Consider the full recovery mix, not only the most valuable logs.`, 'commitments');
  let haul: { km: number; hours: number; payload: number; truck: string; mill: string } | undefined;
  outer: for (const truck of trucks) for (const mill of mills) for (const product of products) {
    if (!marketOpen(mill, product)) continue;
    const payload = operatingPayload(region, truck.id, product);
    if (!(payload > 0)) continue;
    const empty = route(region, game.truckPositions[truck.id], def.node, weather, game.improvedRoads,
      { kind: 'truck', id: truck.id, product, payloadM3: 0 });
    const loaded = route(region, def.node, mill.node, weather, game.improvedRoads,
      { kind: 'truck', id: truck.id, product, payloadM3: payload });
    if (empty && loaded) {
      haul = { km: empty.km + loaded.km, hours: empty.hours + loaded.hours + truck.loadingHours + truck.unloadingHours,
        payload, truck: truck.id, mill: mill.id };
      break outer;
    }
  }
  add('haul', 'route', 'Authorized truck route', haul ? 'ready' : 'blocked',
    haul ? `${haul.truck} → ${haul.mill}: ${haul.km.toFixed(1)} km, ${haul.hours.toFixed(1)} h first cycle, at most ${haul.payload.toFixed(1)} m³/load. This is not a dispatch guarantee.` :
      'No eligible ordinary receiving route for this fleet/selection. Check permissions, seasonal access, vehicle mass and destination.', 'transport');
  return checks;
}

/**
 * Wood cut this turn that the published forecast gives no way to move before
 * it loses value. Roadside sawlogs become pulp after their fresh window and
 * pulp becomes waste after its own (see advance), so a stand is flagged when
 * no loaded route to any buyer is forecast open in time. Access only: truck
 * hours and demand can still leave stock behind in an open week.
 */
export function haulWindowFindings(game: Game): OperatingFinding[] {
  const region = operatingRegion(game), schedule = region.weather[game.weatherId];
  const product = (id: string) => region.products.find(p => p.id === id)!;
  // Turns from harvest until a product becomes waste, including any downgraded window.
  const life = (id: string): number => { const p = product(id); return p.maxFreshWeeks + (p.downgradeTo ? life(p.downgradeTo) : 0); };
  const findings: OperatingFinding[] = [];
  const cut = new Set(Object.values(game.plan.crews).flat().map(o => o.stand));
  for (const id of cut) {
    const def = region.stands.find(s => s.id === id);
    if (!def) continue;
    const products = Object.entries(def.mix).filter(([, share]) => share > 0).map(([p]) => p);
    const open = (turn: number) => {
      const weather = Object.fromEntries(region.zones.map(z => [z.id, schedule.forecast[z.id][turn - 1]]));
      return region.mills.some(m => products.some(p => p in m.prices && region.trucks.some(t => route(region, def.node, m.node, weather,
        game.improvedRoads, { kind: 'truck', id: t.id, product: p, payloadM3: operatingPayload(region, t.id, p) }))));
    };
    let next: number | undefined;
    for (let turn = game.week; turn <= region.weeks && next === undefined; turn++) if (open(turn)) next = turn;
    const wait = next === undefined ? Infinity : next - game.week;
    const nextText = next === undefined ? 'none this season' : String(next);
    const wasted = products.filter(p => wait >= life(p));
    if (wasted.length === products.length)
      findings.push({ code: 'haul-window', subject: id, level: 'warning', action: 'transport',
        message: `${id}: no haul route to a buyer is forecast open before wood cut this turn spoils (next open turn: ${nextText}). Unhauled wood becomes waste.` });
    else if (wasted.length)
      findings.push({ code: 'haul-window', subject: id, level: 'warning', action: 'transport',
        message: `${id}: no haul route to a buyer is forecast open until turn ${nextText}. Pulp cut this turn becomes waste first, and sawlogs become pulp.` });
    else if (products.some(p => product(p).downgradeTo && wait >= product(p).maxFreshWeeks))
      findings.push({ code: 'haul-window', subject: id, level: 'warning', action: 'transport',
        message: `${id}: sawlogs cut this turn are forecast to become pulp before a haul route opens (next open turn: ${nextText}).` });
  }
  return findings;
}

export function planExceptions(game: Game): OperatingFinding[] {
  const findings: OperatingFinding[] = planProblems({ ...game, roleMode: false })
    .map((message, i) => ({ code: `plan-${i}`, subject: 'plan', level: 'blocked', message }));
  findings.push(...haulWindowFindings(game));
  for (const [crew, orders] of Object.entries(game.plan.crews)) for (const order of orders)
    findings.push(...siteReadiness(game, order.stand, { crew, treatment: order.treatment })
      .filter(x => x.scope === 'harvest' && x.level !== 'ready'));
  for (const [truck, orders] of Object.entries(game.plan.trucks)) for (const order of orders) {
    // Alternate sales modes have distinct capacity rules in the authoritative
    // rehearsal. Do not label their ordinary-market check as a hard rejection.
    const alternate = order.spot || order.offtake || order.process;
    findings.push(...siteReadiness(game, order.stand, { truck, mill: order.mill, product: order.product })
      .filter(x => x.scope === 'haul' && x.level !== 'ready')
      .map(x => alternate && ['outlet', 'route'].includes(x.code) ? { ...x, level: 'warning' as const } : x));
  }
  const unique = new Map<string, OperatingFinding>();
  for (const item of findings) unique.set(JSON.stringify([item.subject, item.code, item.message]), item);
  return [...unique.values()].sort((a, b) => Number(b.level === 'blocked') - Number(a.level === 'blocked'));
}
export function outstandingOperatorProvisions(game: Game): number {
  return Object.entries(game.region.bcTenure?.stands ?? {}).reduce((n, [stand, d]) => n +
    d.obligations.filter(o => o.responsibleParty === 'operator').reduce((v, o) => {
      const balance = game.bcTenure?.obligations[`${stand}:${o.id}`];
      return v + Math.max(0, (balance?.accrued ?? 0) - (balance?.settled ?? 0));
    }, 0), 0);
}
export function decisionEvidence(game: Game) {
  const report = game.history.at(-1);
  if (!report) return null;
  const direct = report.ledger.filter(e => e.standId);
  const lots = game.region.stands.map(stand => ({
    id: stand.id,
    producedM3: report.production?.filter(p => p.stand === stand.id).reduce((n, p) => n + sum(p.products), 0) ?? 0,
    shippedM3: report.shipments?.filter(s => s.stand === stand.id).reduce((n, s) => n + s.volume, 0) ?? 0,
    attributedCash: direct.filter(e => e.standId === stand.id).reduce((n, e) => n + e.amount, 0),
    evidence: report.messages.filter(m => m.split(/[^a-zA-Z0-9_-]+/).includes(stand.id)),
  })).filter(l => l.producedM3 || l.shippedM3 || l.attributedCash || l.evidence.length);
  return { report, lots, sharedCash: report.ledger.filter(e => !e.standId).reduce((n, e) => n + e.amount, 0) };
}
