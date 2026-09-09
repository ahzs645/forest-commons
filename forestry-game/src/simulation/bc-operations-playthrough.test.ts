import { describe, expect, it } from 'vitest';
import { princeGeorge } from '../scenarios/prince-george';
import { advance, createGame, draftPlan, purchase, stockAt, sum } from './engine';
import { forecastOutcome } from './planning';

describe('BC operations player journeys', () => {
  it('drafts and delivers a half-full residual load instead of stranding accepted stock', () => {
    const game = createGame(princeGeorge);
    game.region.crews.forEach(c => { c.hours = 0; });
    const stand = game.region.stands[1], state = game.stands[1];
    const volume = game.region.trucks[0].payload * .75;
    state.remaining -= volume;
    state.harvested += volume;
    state.stock = [{ product: 'soft-saw', volume, week: 1, quality: 1 }];
    const planned = draftPlan(game);
    expect(Object.values(planned.plan.trucks).flat().some(o => o.stand === stand.id)).toBe(true);
    const settled = advance(planned);
    expect(sum(settled.history[0].delivered)).toBeCloseTo(volume);
    expect(sum(stockAt(settled, stand.id))).toBeCloseTo(0);
  });

  // Decisions only inspect current state, published prices and forecast rehearsal.
  it.each(Object.keys(princeGeorge.weather))('plays procurement and forecast commitments through %s', weather => {
    let game = createGame(princeGeorge, weather, 73);
    const privateLot = game.region.stands.filter(s => s.supply === 'private').sort((a,b) => a.askingPrice-b.askingPrice)[0];
    game = purchase(game, privateLot.id);
    const original = game.region.stands.reduce((n,s) => n+s.volume,0);
    while(game.week <= game.region.weeks) {
      game = draftPlan(game);
      if ((game.week-1) % game.region.weeksPerMonth === 0) {
        const forecast = forecastOutcome(game).report!;
        for (const mill of game.region.mills)
          for (const product of game.region.products)
            game.plan.targets[mill.id][product.id] = Math.floor(forecast.millDeliveries[mill.id]?.[product.id] ?? 0);
      }
      game = advance(game);
      const retained = game.stands.reduce((n,s)=>n+s.remaining+sum(stockAt(game,s.id)),0);
      const departed = game.history.reduce((n,h)=>n+sum(h.delivered)+h.waste,0);
      expect(retained+departed).toBeCloseTo(original,4);
      expect(game.cash).toBeCloseTo(game.region.economy.startingCash + game.instantLedger.reduce((n,l)=>n+l.amount,0)+game.history.flatMap(h=>h.ledger).reduce((n,l)=>n+l.amount,0),4);
    }
    expect(game.history).toHaveLength(12);
    expect(game.history.reduce((n,h)=>n+sum(h.delivered),0)).toBeGreaterThan(10000);
    expect(game.stands.find(s=>s.id===privateLot.id)!.purchasePaid).toBe(privateLot.askingPrice);
  }, 300000);
});
