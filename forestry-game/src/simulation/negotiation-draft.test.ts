import { describe, expect, it } from 'vitest';
import { assessNegotiationDraft, compareNegotiationDraft } from './negotiation-draft';
import { createGame } from './engine';
import { quebec } from '../scenarios/quebec';
import { propose, respond } from './negotiation';
import type { Method } from '../coalition';

describe('the draft that will be frozen', () => {
  for (const count of [4, 5] as const) for (const method of ['equal', 'shapley', 'proportional', 'epm', 'nucleolus', 'volume'] as Method[]) for (const grouped of [false, true]) it(`${count} companies, ${method}, ${grouped ? 'partition' : 'grand coalition'}: preview and engine agree`, () => {
    const game = createGame(quebec);
    Object.assign(game.negotiation, { count, method, groups: grouped ? [1, 1, 2, 2, 3] : [1, 1, 1, 1, 1], custom: {}, phase: 'open' });
    const before = structuredClone(game);
    const draft = assessNegotiationDraft(game.negotiation);
    expect(game).toEqual(before);
    if (draft.canPublish) {
      const offer = propose(game).negotiation.offers!.at(-1)!;
      expect(offer.shares).toEqual(draft.shares);
      expect(offer.groups).toEqual(game.negotiation.groups);
      expect(offer.count).toBe(count);
    } else expect(() => propose(game)).toThrow(draft.issues[0].message);
  });
  it('freezes balanced manual overrides exactly as previewed', () => {
    const game = createGame(quebec);
    Object.assign(game.negotiation, { count: 4, method: 'equal', groups: [1, 1, 1, 1, 1], custom: { '1': 400, '2': 570 } });
    const draft = assessNegotiationDraft(game.negotiation);
    expect(draft.canPublish).toBe(true);
    expect(propose(game).negotiation.offers![0].shares).toEqual({ '1': 400, '2': 570, '3': 485, '4': 485 });
    expect(draft.shares).toEqual(propose(game).negotiation.offers![0].shares);
  });
  it('uses exact, unrounded balances and the engine’s 0.01 budget tolerance', () => {
    const game = createGame(quebec);
    Object.assign(game.negotiation, { count: 4, groups: [1, 2, 3, 4, 5], method: 'equal', custom: { '1': 0.01 } });
    expect(assessNegotiationDraft(game.negotiation).canPublish).toBe(true);
    expect(propose(game).negotiation.offers![0].shares['1']).toBe(0.01);
    game.negotiation.custom['1'] = 0.010001;
    const draft = assessNegotiationDraft(game.negotiation);
    expect(draft.issues[0].kind).toBe('balance');
    expect(() => propose(game)).toThrow(draft.issues[0].message);
  });
  it.each([-1, NaN, Infinity])('rejects negative or non-finite custom shares (%s)', amount => {
    const game = createGame(quebec);
    game.negotiation.custom['1'] = amount;
    expect(assessNegotiationDraft(game.negotiation).issues.some(issue => issue.kind === 'nonnegative')).toBe(true);
    expect(() => propose(game)).toThrow('Every company must receive nonnegative savings.');
  });
  it('shows pair-round restrictions without replacing existing accepted offers', () => {
    let game = respond(propose(createGame(quebec)), 1, '1', true);
    const offer = structuredClone(game.negotiation.offers![0]);
    game.negotiation.phase = 'pairs';
    const draft = assessNegotiationDraft(game.negotiation);
    expect(draft.issues[0].kind).toBe('round');
    expect(() => propose(game)).toThrow('Round A allows only pairs and single companies.');
    expect(game.negotiation.offers![0]).toEqual(offer);
  });
  it('describes a changed live draft while retaining frozen shares and responses', () => {
    const game = respond(propose(createGame(quebec)), 1, '1', true);
    const offer = structuredClone(game.negotiation.offers![0]);
    expect(compareNegotiationDraft(game.negotiation, assessNegotiationDraft(game.negotiation), offer).unchanged).toBe(true);
    game.negotiation.count = 4;
    game.negotiation.method = 'equal';
    const draft = assessNegotiationDraft(game.negotiation);
    const changes = compareNegotiationDraft(game.negotiation, draft, offer);
    expect(changes.datasetChanged).toBe(true);
    expect(changes.unchanged).toBe(false);
    const revised = propose(game);
    expect(revised.negotiation.offers![0].shares).toEqual(offer.shares);
    expect(revised.negotiation.offers![0].accepted).toEqual(['1']);
    expect(revised.negotiation.offers![0].status).toBe('superseded');
    expect(revised.negotiation.offers![1].accepted).toEqual([]);
  });
  it('allows valid economic tradeoffs without predicting or requiring acceptance', () => {
    const game = createGame(quebec);
    game.negotiation.method = 'equal';
    const draft = assessNegotiationDraft(game.negotiation);
    expect(draft.canPublish).toBe(true);
    expect(draft.blocking.length).toBeGreaterThan(0);
    expect(propose(game).negotiation.offers![0].status).toBe('proposed');
  });
});
