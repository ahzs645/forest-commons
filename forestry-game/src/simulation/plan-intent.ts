import { activeDisruptions } from './disruptions';
import type { Game, WeekResult } from './types';

/** Intention is separate from validity: an empty, valid plan still settles costs. */
export function hasScheduledActivity(game: Game): boolean {
  const plan = game.plan;
  return Object.values(plan.crews).some(queue => queue.some(order => order.hours > 0))
    || Object.values(plan.trucks).some(queue => queue.some(order => order.loads > 0))
    || Object.values(plan.bids).some(bid => bid > 0)
    || (plan.reciprocal ?? []).some(order => order.loads > 0)
    || (plan.facilityTransfers ?? []).some(order => order.loads > 0)
    || Object.values(plan.processing ?? {}).some(order => order.volume > 0 || order.sell);
}

export function assessPlanIntent(game: Game, report: WeekResult | null = null) {
  const scheduled = hasScheduledActivity(game);
  const bids = Object.values(game.plan.bids).some(bid => bid > 0);
  const waiting = !scheduled && activeDisruptions(game).some(event =>
    game.eventResponses?.some(response => response.event === event.id
      && (response.action === 'wait' || response.restoredWeek > game.week)));
  const total = (values: Record<string, number>) => Object.values(values).reduce((a, b) => a + b, 0);
  const productive = !!report && (total(report.harvested) > 0 || total(report.delivered) > 0
    || (report.facilityTransfers ?? []).some(transfer => transfer.volume > 0)
    || Object.values(report.processing ?? {}).some(process => process.processed > 0 || total(process.sold) > 0));
  const status = !scheduled ? (waiting ? 'waiting' : 'idle')
    : !report ? 'unavailable' : productive ? 'productive' : bids ? 'procurement' : 'no-output';
  return { status, scheduled, waiting, bids, productive,
    cashChange: report ? report.cash - game.cash : null } as const;
}

/** Explicit settlement button copy, without changing the engine's waiting rules. */
export function idleTurnLabel(game: Game, language: 'en' | 'fr'): string {
  const { status } = assessPlanIntent(game);
  if (status === 'idle') return language === 'fr' ? 'Exécuter un tour sans travaux' : 'Run idle turn';
  if (status === 'waiting') return language === 'fr' ? 'Exécuter le tour d’attente' : 'Run waiting turn';
  return language === 'fr' ? 'Exécuter les opérations' : 'Run operations';
}
