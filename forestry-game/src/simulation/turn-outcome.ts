import type { Game } from './types';
import { sum } from './engine';

/** Only settled evidence: current plans, forecasts and subsequent purchases are excluded. */
export function turnOutcome(game: Game, index = game.history.length - 1) {
  const report = game.history[index];
  if (!report) return null;
  return {
    report, index, harvested: sum(report.harvested), delivered: sum(report.delivered),
    ledgerNet: report.ledger.reduce((total, entry) => total + entry.amount, 0),
    cash: report.cash, waste: report.waste, degraded: report.degraded,
    commitments: report.targetChecks ? { met: report.targetHits, evaluated: report.targetChecks } : null,
  };
}
