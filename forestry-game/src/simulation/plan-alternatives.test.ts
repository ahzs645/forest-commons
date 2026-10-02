import { describe, expect, it } from 'vitest';
import { quebec } from '../scenarios/quebec';
import { advance, createGame, draftPlan, planProblems } from './engine';
import { forecastOutcome } from './planning';
import { AlternativeError, alternativeContext, alternativesStorageKey, applyAlternative, captureAlternative, forecastAlternative, parseAlternatives, serializeAlternatives } from './plan-alternatives';

describe('manual operating plan alternatives', () => {
  it('captures detached operating orders and applies them without restoring economic state or readiness', () => {
    const game = draftPlan(createGame(quebec));
    game.plan.ready = { purchase: true, production: true, transport: true };
    const saved = captureAlternative(game, '  Short haul  '), original = structuredClone(game);
    game.plan.crews[game.region.crews[0].id] = [];
    game.plan.retention = .3;
    const applied = applyAlternative(game, saved);
    expect(saved.name).toBe('Short haul');
    expect(applied.plan.crews).toEqual(original.plan.crews);
    expect(applied.plan.retention).toBe(original.plan.retention);
    expect(applied.plan.ready).toEqual({ purchase: false, production: false, transport: false });
    const { plan: _newPlan, ...newState } = applied, { plan: _oldPlan, ...oldState } = game;
    expect(newState).toEqual(oldState);
    expect(applied.plan.targets).toEqual(game.plan.targets);
    expect(applied.plan.bids).toEqual(game.plan.bids);
    expect(applied.plan.reservations).toEqual(game.plan.reservations);
    applied.plan.crews[game.region.crews[0].id].push({ stand: game.region.stands[0].id, hours: 1 });
    expect(saved.orders.crews).toEqual(original.plan.crews);
  });
  it('compares both alternatives against one immutable forecast state without advancing the campaign', () => {
    const game = createGame(quebec), before = structuredClone(game);
    const idle = captureAlternative(game, 'Wait');
    const activeGame = draftPlan(game);
    // Commitments are shared by both operating scenarios, not restored from a saved alternative.
    game.plan.targets = structuredClone(activeGame.plan.targets);
    const active = captureAlternative(activeGame, 'Dispatch');
    const waiting = captureAlternative(game, idle.name);
    const idleForecast = forecastAlternative(game, waiting), activeForecast = forecastAlternative(game, active);
    expect(idleForecast.report).toEqual(forecastOutcome(game).report);
    expect(activeForecast.report).toEqual(forecastOutcome(activeGame).report);
    expect(activeForecast.report?.delivered).not.toEqual(idleForecast.report?.delivered);
    expect(game.week).toBe(before.week);
    expect(game.cash).toBe(before.cash);
    expect(game.stands).toEqual(before.stands);
    expect(game.history).toEqual(before.history);
    expect(active.orders).toEqual(captureAlternative(activeGame, 'Again').orders);
  });
  it.each(['cash', 'ownership', 'stock', 'targets', 'reservations', 'future schedule', 'weather', 'week'])(
    'refuses an alternative after %s changes', (condition) => {
      const game = createGame(quebec), saved = captureAlternative(game, 'A');
      const changed = structuredClone(game);
      if (condition === 'cash') changed.cash -= 1;
      if (condition === 'ownership') changed.stands[0].owned = !changed.stands[0].owned;
      if (condition === 'stock') changed.stands[0].stock.push({ product: game.region.products[0].id, volume: 1, week: 1, quality: 1 });
      if (condition === 'targets') changed.plan.targets[game.region.mills[0].id][game.region.products[0].id] = 1;
      if (condition === 'reservations') changed.plan.reservations = [];
      if (condition === 'future schedule') changed.scheduledCrews = { 2: { [game.region.crews[0].id]: [] } };
      if (condition === 'weather') changed.weatherId = Object.keys(game.region.weather).find(id => id !== game.weatherId)!;
      if (condition === 'week') changed.week++;
      expect(() => applyAlternative(changed, saved)).toThrow(AlternativeError);
      try { applyAlternative(changed, saved); } catch (error) { expect((error as AlternativeError).kind).toBe('stale'); }
    });
  it('keeps an alternative current while operating queues and readiness change, with canonical object ordering', () => {
    const game = createGame(quebec), context = alternativeContext(game);
    game.plan.crews[game.region.crews[0].id] = [{ stand: game.region.stands[0].id, hours: 1 }];
    game.plan.ready.production = true;
    game.crewPositions = Object.fromEntries(Object.entries(game.crewPositions).reverse());
    expect(alternativeContext(game)).toBe(context);
  });
  it('rejects malformed storage and validates engine constraints before applying stored orders', () => {
    const game = createGame(quebec), saved = captureAlternative(game, 'A');
    expect(parseAlternatives(serializeAlternatives([saved, null]))).toEqual([saved, null]);
    for (const invalid of ['null', '{}', '[1,2]', '{', JSON.stringify({ version: 1, alternatives: [saved, null, null] }),
      JSON.stringify({ version: 1, alternatives: [{ ...saved, orders: { ...saved.orders, cash: 1000000 } }, null] }),
      JSON.stringify({ version: 1, alternatives: [{ ...saved, orders: { ...saved.orders, crews: { bad: [null] } } }, null] })]) {
      expect(() => parseAlternatives(invalid)).toThrow(AlternativeError);
    }
    const unknownCrew = structuredClone(saved); unknownCrew.orders.crews.unknown = [];
    expect(() => applyAlternative(game, unknownCrew)).toThrow(AlternativeError);
    const missingCrew = structuredClone(saved); delete missingCrew.orders.crews[game.region.crews[0].id];
    expect(() => applyAlternative(game, missingCrew)).toThrow(AlternativeError);
    const overCapacity = structuredClone(saved);
    overCapacity.orders.crews[game.region.crews[0].id] = [{ stand: game.region.stands[0].id, hours: 10000 }];
    expect(() => applyAlternative(game, overCapacity)).toThrow(AlternativeError);
    const invalidRetention = structuredClone(saved); invalidRetention.orders.retention = -1;
    expect(() => applyAlternative(game, invalidRetention)).toThrow(AlternativeError);
  });
  it('clears role signoffs and cannot resurrect an earlier week', () => {
    const game = createGame(quebec), saved = captureAlternative(game, 'A');
    game.roleMode = true;
    const roleDraft = captureAlternative(game, 'Roles'), applied = applyAlternative(game, roleDraft);
    expect(planProblems(applied)).toContain('Purchase, production and transport roles must mark their plans ready.');
    const next = advance({ ...game, roleMode: false });
    expect(() => applyAlternative(next, saved)).toThrow(AlternativeError);
    expect(alternativesStorageKey(game, 'campaign-a')).not.toBe(alternativesStorageKey(next, 'campaign-a'));
    expect(alternativesStorageKey(game, 'campaign-a')).not.toBe(alternativesStorageKey(game, 'campaign-b'));
  });
});
