import { describe, expect, it } from 'vitest';
import { createGame, advance } from './engine';
import { quebec } from '../scenarios/quebec';
import { forecastOutcome } from './planning';
import { respondToDisruption } from './disruptions';
import { assessPlanIntent, hasScheduledActivity, idleTurnLabel } from './plan-intent';

const fresh = () => createGame(quebec);
const closure = () => {
  const game = fresh();
  game.region.disruptions = [{ id: 'closure', title: 'Closure', description: 'Temporary closure',
    kind: 'road', target: game.region.roads.edges[0].id, week: 1, endWeek: 3,
    revealWeek: 1, repairCost: 500, repairWeeks: 1 }];
  return game;
};

describe('planning intention is separate from validity', () => {
  it('warns about a valid empty plan and reports its net cash decrease without mutation', () => {
    const game = fresh(), before = JSON.stringify(game), report = forecastOutcome(game).report!;
    expect(report).not.toBeNull();
    expect(assessPlanIntent(game, report)).toMatchObject({ status: 'idle', cashChange: report.cash - game.cash });
    expect(assessPlanIntent(game, report).cashChange).toBeLessThan(0);
    expect(idleTurnLabel(game, 'en')).toBe('Run idle turn');
    expect(idleTurnLabel(game, 'fr')).toBe('Exécuter un tour sans travaux');
    expect(JSON.stringify(game)).toBe(before);
    expect(() => advance(game)).not.toThrow();
  });

  it('recognizes crew-only production even with no deliveries', () => {
    const game = fresh();
    game.plan.crews.C1 = [{ stand: 'Q02', hours: 80 }];
    const report = forecastOutcome(game).report!;
    expect(Object.values(report.harvested).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(assessPlanIntent(game, report).status).toBe('productive');
  });

  it('warns about truck work without stock without claiming the queue is empty', () => {
    const game = fresh();
    const mill = game.region.mills[0], product = Object.keys(mill.prices)[0];
    game.plan.trucks[game.region.trucks[0].id] = [{ stand: 'Q02', mill: mill.id, product, loads: 1 }];
    expect(assessPlanIntent(game, forecastOutcome(game).report).status).toBe('no-output');
    expect(idleTurnLabel(game, 'en')).toBe('Run operations');
  });

  it('recognizes truck-only delivery as productive', () => {
    const game = fresh();
    game.plan.crews.C1 = [{ stand: 'Q02', hours: 80 }];
    const harvested = advance(game);
    for (const id of Object.keys(harvested.plan.crews)) harvested.plan.crews[id] = [];
    const stocked = harvested.stands.find(stand => stand.stock.some(batch => batch.volume > 0))!;
    const product = stocked.stock.find(batch => batch.volume > 0)!.product;
    const mill = harvested.region.mills.find(item => item.prices[product] !== undefined)!;
    harvested.plan.trucks[harvested.region.trucks[0].id] = [{ stand: stocked.id, mill: mill.id, product, loads: 1 }];
    expect(assessPlanIntent(harvested, forecastOutcome(harvested).report).status).toBe('productive');
  });

  it('distinguishes recorded waiting and pending recovery from accidental emptiness', () => {
    const game = closure();
    expect(assessPlanIntent(game).status).toBe('idle');
    const waiting = respondToDisruption(game, 'closure', 'wait');
    expect(assessPlanIntent(waiting).status).toBe('waiting');
    expect(idleTurnLabel(waiting, 'en')).toBe('Run waiting turn');
    expect(assessPlanIntent(respondToDisruption(game, 'closure', 'repair')).status).toBe('waiting');
    waiting.week = 4;
    expect(assessPlanIntent(waiting).status).toBe('idle');
  });

  it('keeps auction-only procurement distinct because awards are excluded from the rehearsal', () => {
    const game = fresh();
    const lot = game.region.stands.find(stand => stand.supply === 'auction' && stand.auctionWeek === 1)!;
    game.plan.bids[lot.id] = lot.askingPrice;
    expect(assessPlanIntent(game, forecastOutcome(game).report).status).toBe('procurement');
  });

  it('recognizes nonstandard plans, including selling existing processed inventory', () => {
    for (const edit of [
      (game: ReturnType<typeof fresh>) => { game.plan.processing = { facility: { volume: 10, sell: false } }; },
      (game: ReturnType<typeof fresh>) => { game.plan.processing = { facility: { volume: 0, sell: true } }; },
      (game: ReturnType<typeof fresh>) => { game.plan.facilityTransfers = [{ link: 'transfer', truck: 'T1', loads: 1 }]; },
      (game: ReturnType<typeof fresh>) => { game.plan.reciprocal = [{ pair: 'pair', truckA: 'T1', truckB: 'T2', loads: 1 }]; },
    ]) {
      const game = fresh(); edit(game);
      expect(hasScheduledActivity(game)).toBe(true);
      expect(assessPlanIntent(game).status).toBe('unavailable');
      expect(idleTurnLabel(game, 'fr')).toBe('Exécuter les opérations');
    }
  });

  it('recognizes processing and transfers as output even when forest deliveries are zero', () => {
    const game = fresh();
    game.plan.processing = { facility: { volume: 10, sell: false } };
    const report = forecastOutcome(fresh()).report!;
    report.processing = { facility: { received: 0, processed: 10, sold: {}, residue: 1 } };
    expect(assessPlanIntent(game, report).status).toBe('productive');
    report.processing = undefined;
    report.facilityTransfers = [{ link: 'link', truck: 'T1', volume: 10 }];
    expect(assessPlanIntent(game, report).status).toBe('productive');
  });

  it('does not treat passive commitments, ready flags or future queues as current work', () => {
    const game = fresh();
    game.plan.ready = { purchase: true, production: true, transport: true };
    game.scheduledCrews = { 2: { C1: [{ stand: 'Q02', hours: 80 }] } };
    expect(hasScheduledActivity(game)).toBe(false);
    expect(assessPlanIntent(game, null).cashChange).toBeNull();
    expect(assessPlanIntent(game, null).status).toBe('idle');
  });

  it('does not leak hidden disruption information into the waiting assessment', () => {
    const game = closure();
    game.region.disruptions![0].revealWeek = 2;
    game.eventResponses = [{ event: 'closure', action: 'wait', week: 1, restoredWeek: 4 }];
    expect(assessPlanIntent(game).status).toBe('idle');
  });
});
