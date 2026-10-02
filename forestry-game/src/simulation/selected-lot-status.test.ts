import { expect, it } from 'vitest';
import { createGame } from './engine';
import { bcOperatingLesson } from '../scenarios/bc-operating-lesson';
import { applyHarvestAuthorization, refreshAuthorizations } from './tenure';
import { selectedLotStatus } from './selected-lot-status';

it('keeps acquired rights and open physical terrain separate from missing harvest permission', () => {
  const game = createGame(bcOperatingLesson), before = JSON.stringify(game);
  expect(selectedLotStatus(game, 'BC09')).toMatchObject({ rights: 'secured', harvest: 'required', terrain: 'open' });
  expect(JSON.stringify(game)).toBe(before);
  const pending = applyHarvestAuthorization(game, 'BC09');
  expect(selectedLotStatus(pending, 'BC09')).toMatchObject({ harvest: 'pending', approvalTurn: 2 });
  pending.week = 2;
  refreshAuthorizations(pending);
  expect(selectedLotStatus(pending, 'BC09')!.harvest).toBe('active');
});

it('reports renewals, weather windows and road authority independently', () => {
  const game = createGame(bcOperatingLesson);
  game.week = 7;
  expect(selectedLotStatus(game, 'BC08')!.harvest).toBe('expired');
  expect(selectedLotStatus(game, 'BC01')).toMatchObject({ rights: 'secured', harvest: 'active', terrain: 'closed' });
  game.bcTenure!.roads['access-BC01'] = { status: 'required' };
  expect(selectedLotStatus(game, 'BC01')!.siteRoadAuthority).toBe('blocked');
  expect(selectedLotStatus(game, 'BC01')!.harvest).toBe('active');
  game.week = 13;
  expect(selectedLotStatus(game, 'BC01')).toMatchObject({ complete: true, terrain: 'complete', forecast: null });
});

it('does not imply ownership from an active permit and preserves protected areas', () => {
  const game = createGame(bcOperatingLesson);
  game.stands.find(s => s.id === 'BC01')!.owned = false;
  expect(selectedLotStatus(game, 'BC01')).toMatchObject({ rights: 'unsecured', harvest: 'active' });
  expect(selectedLotStatus(game, 'BC24')).toMatchObject({ rights: 'protected', harvest: 'prohibited' });
});
