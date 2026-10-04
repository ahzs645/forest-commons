import type { Game } from './types';
import { stockAt, sum } from './engine';
import { siteReadiness } from './operational-readiness';
import { harvestAuthorizationProblem } from './tenure';

/** Evidence for a learning checklist, never a settlement authorization. */
export function firstDeliveryProgress(game: Game, standId: string, rehearsed = false) {
  const stand = game.region.stands.find(s => s.id === standId);
  const state = game.stands.find(s => s.id === standId);
  const selected = !!stand && !!state;
  const secured = !!state?.owned && !state.refused && stand?.supply !== 'protected';
  const authorizationProblem = selected ? harvestAuthorizationProblem(game, standId) : null;
  const authorized = selected && secured && !authorizationProblem;
  const roadsideM3 = selected ? sum(stockAt(game, standId)) : 0;
  const crewOrders = Object.entries(game.plan.crews).flatMap(([crew, orders]) => orders
    .filter(o => o.stand === standId && o.hours > 0).map(order => ({ crew, order })));
  const truckOrders = Object.entries(game.plan.trucks).flatMap(([truck, orders]) => orders
    .filter(o => o.stand === standId && o.loads > 0 && !o.partnerJob).map(order => ({ truck, order })));
  const crewReady = crewOrders.some(({ crew, order }) =>
    !siteReadiness(game, standId, { crew, treatment: order.treatment }).some(c => c.scope === 'harvest' && c.level === 'blocked'));
  const truckReady = truckOrders.some(({ truck, order }) => {
    const alternate = order.offtake || order.spot || order.process;
    return !siteReadiness(game, standId, { truck, mill: order.mill, product: order.product })
      .some(c => c.scope === 'haul' && c.level === 'blocked' && !(alternate && ['route', 'outlet'].includes(c.code)));
  });
  const deliveredM3 = game.history.reduce((n, report) => n + sum(report.delivered), 0);
  const selectedDeliveredM3 = game.history.reduce((n, report) => n + (report.shipments ?? [])
    .filter(s => s.stand === standId).reduce((v, s) => v + s.volume, 0), 0);
  // A missing origin record is unknown evidence, not proof of zero site delivery.
  const shipmentOriginsComplete = game.history.every(report => sum(report.delivered) <= 0
    || (!!report.shipments && report.shipments.reduce((v, shipment) => v + shipment.volume, 0) >= sum(report.delivered) - 1e-6));
  return {
    selected, secured, authorized, authorizationProblem, roadsideM3,
    crewScheduled: crewOrders.length > 0, crewReady,
    truckScheduled: truckOrders.length > 0, truckReady,
    deliveredM3, selectedDeliveredM3, shipmentOriginsComplete,
    // A delivery is recorded evidence; forecasts and harvested volume never complete this step.
    steps: [selected, authorized, crewReady || roadsideM3 > 0, truckReady,
      rehearsed, deliveredM3 > 0],
  };
}

/** Include all settlement inputs so even a road/authorization edit invalidates review. */
export const firstDeliveryRehearsalKey = (game: Game) => JSON.stringify(game);

export interface FirstDeliveryGuideSession {
  scope: string;
  minimized: boolean;
  standId: string;
  reviewedKey: string;
  rehearsalOpen: boolean;
}

/** UI evidence survives page changes, but never a new campaign or changed plan. */
export function reconcileGuideSession(session: FirstDeliveryGuideSession | null, game: Game, scope: string): FirstDeliveryGuideSession {
  if (!session || session.scope !== scope) return {
    scope, minimized: readGuideMinimized(scope), standId: readGuideSite(scope, game), reviewedKey: '', rehearsalOpen: false,
  };
  if (session.reviewedKey && session.reviewedKey !== firstDeliveryRehearsalKey(game)) {
    return { ...session, reviewedKey: '', rehearsalOpen: false };
  }
  return session;
}

export function firstDeliveryStorageKey(game: Game, campaignKey?: string) {
  return `forest-first-delivery:${campaignKey ?? `${game.region.id}:${game.seed}:${game.weatherId}:${game.stewardship?.year ?? 0}`}`;
}

export function readGuideMinimized(key: string): boolean {
  try { return localStorage.getItem(key) === 'minimized'; } catch { return false; }
}
export function saveGuideMinimized(key: string, minimized: boolean): void {
  try { localStorage.setItem(key, minimized ? 'minimized' : 'expanded'); } catch { /* Guide works without device storage. */ }
}

export function readGuideSite(key: string, game: Game): string {
  try {
    const saved = localStorage.getItem(`${key}:site`);
    return game.region.stands.some(s => s.id === saved && s.supply !== 'protected') ? saved! : '';
  } catch { return ''; }
}
export function saveGuideSite(key: string, standId: string): void {
  try { localStorage.setItem(`${key}:site`, standId); } catch { /* Selection remains usable in memory. */ }
}
