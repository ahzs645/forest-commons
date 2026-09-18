import { describe, it, expect } from 'vitest';
import { createGame, draftPlan, advance, sum, planProblems } from './engine';
import { validateRegion, parseGame } from './validation';
import { serializeGame } from './save-format';
import { princeGeorge } from '../scenarios/prince-george';
import { quebec } from '../scenarios/quebec';
import { buildBCOperatingLesson, bcOperatingLesson } from '../scenarios/bc-operating-lesson';
import { recordFieldEvidence } from './operations-profile';
import { siteReadiness, decisionEvidence } from './operational-readiness';
import { forecastOutcome } from './planning';
import { beginLinkedSeason } from './season-calendar';

describe('operating-profile application integration', () => {
  it('validates the new lesson and does not mutate either existing regional preset', () => {
    const before = JSON.stringify([princeGeorge, quebec]);
    const lesson = buildBCOperatingLesson();
    expect(validateRegion(lesson).stands).toHaveLength(10);
    expect(lesson.crews).toHaveLength(3); expect(lesson.trucks).toHaveLength(3);
    expect(lesson.mills).toHaveLength(3);
    expect(JSON.stringify([princeGeorge, quebec])).toBe(before);
    expect(princeGeorge.operations).toBeUndefined(); expect(quebec.operations).toBeUndefined();
  });

  it('roundtrips a new scenario, plan and dossier without changing the legacy save version', () => {
    const game = createGame(bcOperatingLesson);
    const restored = parseGame(serializeGame(game));
    expect(restored.version).toBe(2);
    expect(restored.region.operations).toEqual(game.region.operations);
    expect(restored.region.stands).toEqual(game.region.stands);
    expect(restored.plan).toEqual(game.plan);
  });

  it('continues to restore legacy embedded scenarios without injecting new rules', () => {
    for (const region of [quebec, princeGeorge]) {
      const game = createGame(region), restored = parseGame(serializeGame(game));
      expect(restored.region.operations).toBeUndefined();
      expect(restored.region.stands).toEqual(game.region.stands);
    }
  });

  it('rejects static incompatible equipment in the authoritative engine', () => {
    const game = createGame(bcOperatingLesson);
    const fullTree = game.region.crews.find(c => game.region.operations!.crews[c.id].system === 'full-tree')!;
    game.plan.crews[fullTree.id] = [{ stand: 'BC05', treatment: 'thinning', hours: 8 }];
    expect(planProblems(game).some(message => message.includes('eligible system'))).toBe(true);
    expect(() => advance(game)).toThrow(/eligible system/);
  });

  it('uses forecast data only for readiness and rehearsals', () => {
    const game = draftPlan(createGame(bcOperatingLesson));
    const before = siteReadiness(game, 'BC02');
    const changed = structuredClone(game);
    for (const zone of changed.region.zones) changed.region.weather[changed.weatherId].actual[zone.id].fill('thaw');
    expect(siteReadiness(changed, 'BC02')).toEqual(before);
    expect(forecastOutcome(changed).report?.harvested).toEqual(forecastOutcome(game).report?.harvested);
  });

  it('settles twelve turns with material and cash conservation, then reloads', () => {
    let game = createGame(bcOperatingLesson);
    const openingMaterial = game.region.stands.reduce((n, s) => n + s.volume, 0);
    while (game.week <= game.region.weeks) {
      game = advance(draftPlan(game));
      const standing = game.stands.reduce((n, s) => n + s.remaining, 0);
      const roadside = game.stands.reduce((n, s) => n + s.stock.reduce((v, b) => v + b.volume, 0), 0);
      const shipped = game.history.reduce((n, h) => n + sum(h.delivered), 0);
      const waste = game.history.reduce((n, h) => n + h.waste, 0);
      expect(standing + roadside + shipped + waste).toBeCloseTo(openingMaterial, 4);
      const ledgerCash = game.region.economy.startingCash + game.history.flatMap(h => h.ledger).reduce((n, e) => n + e.amount, 0);
      expect(game.cash).toBeCloseTo(ledgerCash, 5);
    }
    expect(game.history).toHaveLength(12);
    const restored = parseGame(serializeGame(game));
    expect(restored.cash).toBeCloseTo(game.cash, 6);
    expect(decisionEvidence(restored)?.lots).toEqual(decisionEvidence(game)?.lots);
    const harvested = game.stands.find(s => s.harvested > 0 && s.owned)!;
    expect(harvested).toBeDefined();
    const evidence = recordFieldEvidence(game, harvested.id, 'closeout-note', 'Observed in the fictional classroom exercise only.');
    expect(parseGame(serializeGame(evidence)).fieldEvidence).toEqual(evidence.fieldEvidence);
    expect(evidence.cash).toBe(game.cash);
  }, 30000);

  it('keeps uncoupled annual lifecycle explicit rather than losing evidence', () => {
    expect(() => beginLinkedSeason(createGame(bcOperatingLesson), 1)).toThrow(/single-season/);
  });
});
