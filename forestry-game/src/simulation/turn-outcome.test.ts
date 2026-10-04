import { expect, it } from 'vitest';
import { advance, createGame, draftPlan, purchase } from './engine';
import { quebec } from '../scenarios/quebec';
import { turnOutcome } from './turn-outcome';

it('does not present unrun turns as zero-output results', () => {
  expect(turnOutcome(createGame(quebec))).toBeNull();
});
it('uses recorded financial evidence even after later purchases and plan changes', () => {
  const settled = advance(draftPlan(createGame(quebec)));
  const result = turnOutcome(settled)!;
  const lot = settled.region.stands.find(s => s.supply === 'private')!;
  const changed = purchase(settled, lot.id);
  changed.plan.crews = Object.fromEntries(changed.region.crews.map(c => [c.id, []]));
  expect(turnOutcome(changed)).toEqual(result);
  expect(result.cash).not.toBe(changed.cash);
  expect(result.commitments).toBeNull();
});
it('selects historical turns and includes immediate payments in their ledger', () => {
  let game = createGame(quebec);
  const lot = game.region.stands.find(s => s.supply === 'private')!;
  game = advance(purchase(game, lot.id));
  const first = turnOutcome(game)!;
  expect(first.ledgerNet).toBeCloseTo(first.cash - quebec.economy.startingCash, 5);
  game = advance(game);
  expect(turnOutcome(game, 0)).toEqual(first);
  expect(turnOutcome(game, 9)).toBeNull();
});
