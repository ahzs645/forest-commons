import { describe, expect, it } from 'vitest';
import { createGame, advance, purchase } from '../simulation/engine';
import { quebec } from '../scenarios/quebec';
import { appendQueueStop, editQueue, MapQueueHistory, parseQueueAmount, setQueueField } from './queue-editing';

const plannedGame = () => {
  const game = createGame(quebec);
  game.plan.crews.C1 = [{ stand: 'Q01', hours: 8, treatment: 'final', bucking: 'standard' }, { stand: 'Q02', hours: 4 }];
  const truck = game.region.trucks[0].id;
  game.plan.trucks[truck] = [{ stand: 'Q01', mill: 'M1', product: 'soft-saw', loads: 2, spot: true, partnerJob: 'kept' }];
  game.plan.ready = { purchase: true, production: true, transport: true };
  return game;
};

describe('numeric queue drafts', () => {
  it('rejects cleared, incomplete, nonfinite and out-of-range drafts without inventing a quantity', () => {
    for (const raw of ['', ' ', '-', '1e', 'NaN', 'Infinity', '0', '-2', '161'])
      expect(parseQueueAmount(raw, 'crew', 160)).toBeNull();
    expect(parseQueueAmount('16', 'crew', 160)).toBe(16);
    expect(parseQueueAmount('12.5', 'crew', 160)).toBe(12.5);
    expect(parseQueueAmount('6', 'truck', 1000)).toBe(6);
    expect(parseQueueAmount('6.5', 'truck', 1000)).toBeNull();
    expect(parseQueueAmount('1001', 'truck', 1000)).toBeNull();
  });
});

describe('map queue transformations', () => {
  it('reorders and removes stops immutably, preserving recovery and dispatch metadata', () => {
    const game = plannedGame(), before = JSON.stringify(game);
    const moved = editQueue(game, 'crew', 'C1', 0, 'later');
    expect(moved.plan.crews.C1.map(order => order.stand)).toEqual(['Q02', 'Q01']);
    expect(moved.plan.crews.C1[1]).toEqual(game.plan.crews.C1[0]);
    expect(moved.plan.ready).toEqual({ purchase: false, production: false, transport: false });
    const truck = game.region.trucks[0].id;
    const adjusted = editQueue(moved, 'truck', truck, 0, 3);
    expect(adjusted.plan.trucks[truck][0]).toEqual({ ...game.plan.trucks[truck][0], loads: 3 });
    const removed = editQueue(adjusted, 'crew', 'C1', 0, 'remove');
    expect(removed.plan.crews.C1).toEqual([game.plan.crews.C1[0]]);
    expect(JSON.stringify(game)).toBe(before);
  });

  it('rejects invalid indices, crew overbooking, fractional loads and completed campaign edits', () => {
    const game = plannedGame(), truck = game.region.trucks[0].id;
    for (const index of [-1, 2, 0.5]) expect(editQueue(game, 'crew', 'C1', index, 'remove')).toBe(game);
    expect(editQueue(game, 'crew', 'C1', 0, 'earlier')).toBe(game);
    expect(editQueue(game, 'crew', 'C1', 1, 'later')).toBe(game);
    for (const amount of [0, -1, NaN, Infinity, game.region.crews[0].hours]) expect(editQueue(game, 'crew', 'C1', 0, amount)).toBe(game);
    for (const amount of [1.5, 1001]) expect(editQueue(game, 'truck', truck, 0, amount)).toBe(game);
    const complete = { ...game, week: game.region.weeks + 1 };
    expect(editQueue(complete, 'crew', 'C1', 0, 'remove')).toBe(complete);
  });
});

describe('map queue undo boundary', () => {
  it('undoes only queue changes, preserving bids, commitments and economic state', () => {
    const game = plannedGame();
    game.plan.bids.Q05 = 10;
    const history = new MapQueueHistory(game);
    const moved = editQueue(game, 'crew', 'C1', 0, 'later'); history.record(game, moved);
    const truck = game.region.trucks[0].id;
    const adjusted = editQueue(moved, 'truck', truck, 0, 3); history.record(moved, adjusted);
    expect(history.count).toBe(2);
    const firstUndo = history.undo(adjusted);
    expect(firstUndo.plan.trucks).toEqual(game.plan.trucks);
    expect(firstUndo.plan.crews).toEqual(moved.plan.crews);
    const restored = history.undo(firstUndo);
    expect(restored.plan.crews).toEqual(game.plan.crews);
    expect(restored.plan.bids).toEqual(game.plan.bids);
    expect(restored.plan.targets).toEqual(game.plan.targets);
    expect(restored.cash).toBe(game.cash);
    expect(restored.stands).toBe(firstUndo.stands);
    expect(restored.plan.ready).toEqual({ purchase: false, production: false, transport: false });
    expect(history.count).toBe(0);
  });

  it('expires after external bids, private purchase, week execution and an identical restored save', () => {
    const game = plannedGame();
    const edited = editQueue(game, 'crew', 'C1', 0, 'later');
    const bid = structuredClone(edited); bid.plan.bids.Q05 = 1;
    const privateStand = game.region.stands.find(stand => stand.supply === 'private')!;
    const purchased = purchase(edited, privateStand.id);
    for (const external of [bid, purchased, advance(createGame(quebec)), structuredClone(edited)]) {
      const history = new MapQueueHistory(game); history.record(game, edited);
      expect(history.undo(external)).toBe(external);
      expect(history.count).toBe(0);
    }
  });

  it('never records a mixed edit or a purchase as an undoable plan', () => {
    const game = plannedGame(), history = new MapQueueHistory(game);
    const edited = editQueue(game, 'crew', 'C1', 0, 'later'); history.record(game, edited);
    const mixed = editQueue(edited, 'crew', 'C1', 0, 'remove'); mixed.plan.bids.Q05 = 1;
    history.record(edited, mixed);
    expect(history.count).toBe(0);
    expect(history.undo(mixed)).toBe(mixed);
    const privateStand = game.region.stands.find(stand => stand.supply === 'private')!;
    const purchased = purchase(mixed, privateStand.id); history.record(mixed, purchased);
    expect(history.count).toBe(0);
    expect(history.undo(purchased)).toBe(purchased);
  });
});

describe('desk stop fields and appending', () => {
  it('changes site, treatment, mill and partner freight, keeping metadata and clearing readiness', () => {
    const game = plannedGame(), truck = game.region.trucks[0].id;
    const crew = setQueueField(game, 'crew', 'C1', 0, { stand: 'Q03', treatment: 'thinning' });
    expect(crew.plan.crews.C1[0]).toEqual({ stand: 'Q03', hours: 8, treatment: 'thinning', bucking: 'standard' });
    expect(crew.plan.ready).toEqual({ purchase: false, production: false, transport: false });
    const sold = game.region.mills.find(m => !('hard-saw' in m.prices))!;
    const hard = structuredClone(game); hard.plan.trucks[truck][0].product = 'hard-saw';
    const moved = setQueueField(hard, 'truck', truck, 0, { mill: sold.id });
    expect(moved.plan.trucks[truck][0]).toMatchObject({ mill: sold.id, product: Object.keys(sold.prices)[0], spot: true, partnerJob: 'kept' });
    expect(setQueueField(game, 'truck', truck, 0, { partnerJob: undefined }).plan.trucks[truck][0].partnerJob).toBeUndefined();
    expect(setQueueField(game, 'crew', 'C1', 5, { stand: 'Q03' })).toBe(game);
    const finished = structuredClone(game); finished.week = finished.region.weeks + 1;
    expect(setQueueField(finished, 'crew', 'C1', 0, { stand: 'Q03' })).toBe(finished);
  });

  it('appends at the preferred owned site with unassigned crew hours or a default haul', () => {
    const game = plannedGame(), truck = game.region.trucks[0].id;
    const owned = game.stands.filter(s => s.owned).map(s => s.id);
    const capacity = game.region.crews.find(c => c.id === 'C1')!.hours;
    const crew = appendQueueStop(game, 'crew', 'C1', owned[1]);
    expect(crew.plan.crews.C1.at(-1)).toEqual({ stand: owned[1], hours: capacity - 12 });
    expect(crew.plan.ready.production).toBe(false);
    expect(appendQueueStop(game, 'crew', 'C1', 'missing').plan.crews.C1.at(-1)!.stand).toBe(owned[0]);
    const mill = game.region.mills[0];
    expect(appendQueueStop(game, 'truck', truck, owned[2]).plan.trucks[truck].at(-1))
      .toEqual({ stand: owned[2], mill: mill.id, product: Object.keys(mill.prices)[0], loads: 5 });
  });
});
