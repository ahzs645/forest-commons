import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, draftPlan, advance, sum } from './engine';
import { bcOperatingLesson } from '../scenarios/bc-operating-lesson';
import { forecastOutcome } from './planning';
import { firstDeliveryProgress, firstDeliveryRehearsalKey, firstDeliveryStorageKey,
  readGuideMinimized, saveGuideMinimized, readGuideSite, saveGuideSite } from './first-delivery-progress';
import { reconcileGuideSession } from './first-delivery-progress';

afterEach(() => vi.unstubAllGlobals());

describe('first delivery evidence', () => {
  it('requires a selected site and distinguishes secured rights from required authorization', () => {
    const game = createGame(bcOperatingLesson);
    expect(firstDeliveryProgress(game, '').steps).toEqual([false, false, false, false, false, false]);
    game.region.bcTenure!.stands.BC02.harvest.initialStatus = 'required';
    game.bcTenure!.harvest.BC02 = { status: 'required' };
    const progress = firstDeliveryProgress(game, 'BC02');
    expect(progress.selected).toBe(true);
    expect(progress.secured).toBe(true);
    expect(progress.authorized).toBe(false);
    expect(progress.authorizationProblem).toContain('required');
    game.bcTenure!.harvest.BC02 = { status: 'pending', approvedWeek: 2 };
    expect(firstDeliveryProgress(game, 'BC02').authorized).toBe(false);
    game.week = 2;
    expect(firstDeliveryProgress(game, 'BC02').authorized).toBe(true);
  });

  it('does not mistake a scheduled incompatible crew for ready production', () => {
    const game = createGame(bcOperatingLesson);
    const crew = game.region.crews.find(c => game.region.operations!.crews[c.id].system === 'full-tree')!;
    game.plan.crews[crew.id] = [{ stand: 'BC15', treatment: 'thinning', hours: 8 }];
    const progress = firstDeliveryProgress(game, 'BC15');
    expect(progress.crewScheduled).toBe(true);
    expect(progress.crewReady).toBe(false);
    expect(progress.steps[2]).toBe(false);
  });

  it('allows existing roadside inventory to skip new production without inventing deliveries', () => {
    const game = createGame(bcOperatingLesson);
    game.stands.find(s => s.id === 'BC02')!.stock = [{ product: 'soft-saw', volume: 22, week: 1, quality: 1 }];
    const progress = firstDeliveryProgress(game, 'BC02');
    expect(progress.crewScheduled).toBe(false);
    expect(progress.roadsideM3).toBe(22);
    expect(progress.steps[2]).toBe(true);
    expect(progress.steps[5]).toBe(false);
  });

  it('uses settlement history for delivery completion, never production or forecast volume', () => {
    const game = draftPlan(createGame(bcOperatingLesson));
    const forecast = forecastOutcome(game).report!;
    expect(sum(forecast.delivered)).toBeGreaterThan(0);
    const stand = forecast.shipments![0].stand;
    const before = JSON.stringify(game);
    const progress = firstDeliveryProgress(game, stand, true);
    expect(progress.steps[4]).toBe(true);
    expect(progress.deliveredM3).toBe(0);
    expect(progress.steps[5]).toBe(false);
    expect(JSON.stringify(game)).toBe(before);
    const settled = advance(game);
    const after = firstDeliveryProgress(settled, stand);
    expect(after.deliveredM3).toBe(sum(settled.history[0].delivered));
    expect(after.selectedDeliveredM3).toBeGreaterThan(0);
    expect(after.steps[5]).toBe(true);
    const productionOnly = structuredClone(settled);
    productionOnly.history[0].delivered = {};
    productionOnly.history[0].shipments = [];
    expect(sum(productionOnly.history[0].harvested)).toBeGreaterThan(0);
    expect(firstDeliveryProgress(productionOnly, stand).steps[5]).toBe(false);
  });

  it('invalidates rehearsal when authorizations or roads change, not only queues', () => {
    const game = createGame(bcOperatingLesson);
    const key = firstDeliveryRehearsalKey(game);
    expect(firstDeliveryRehearsalKey(structuredClone(game))).toBe(key);
    game.improvedRoads.push('access-BC02');
    expect(firstDeliveryRehearsalKey(game)).not.toBe(key);
    const roadKey = firstDeliveryRehearsalKey(game);
    game.bcTenure!.harvest.BC02 = { status: 'required' };
    expect(firstDeliveryRehearsalKey(game)).not.toBe(roadKey);
  });

  it('separates campaign deliveries from site evidence and preserves unknown legacy origins', () => {
    const game = advance(draftPlan(createGame(bcOperatingLesson)));
    const shippedStand = game.history[0].shipments![0].stand;
    const otherStand = game.region.stands.find(stand => !game.history[0].shipments!.some(shipment => shipment.stand === stand.id))!.id;
    expect(firstDeliveryProgress(game, shippedStand).selectedDeliveredM3).toBeGreaterThan(0);
    const other = firstDeliveryProgress(game, otherStand);
    expect(other.deliveredM3).toBeGreaterThan(0);
    expect(other.selectedDeliveredM3).toBe(0);
    expect(other.shipmentOriginsComplete).toBe(true);
    delete game.history[0].shipments;
    expect(firstDeliveryProgress(game, otherStand).shipmentOriginsComplete).toBe(false);
    expect(firstDeliveryProgress(game, otherStand).steps[5]).toBe(true);
  });

  it('keeps reviewed state across page renders, resets changed inputs and isolates campaigns', () => {
    const game = createGame(bcOperatingLesson);
    const initial = reconcileGuideSession(null, game, 'one');
    const reviewed = { ...initial, standId: 'BC02', minimized: true, reviewedKey: firstDeliveryRehearsalKey(game), rehearsalOpen: true };
    expect(reconcileGuideSession(reviewed, structuredClone(game), 'one')).toBe(reviewed);
    const changed = structuredClone(game);
    changed.plan.crews[changed.region.crews[0].id] = [{ stand: 'BC02', hours: 8 }];
    const invalidated = reconcileGuideSession(reviewed, changed, 'one');
    expect(invalidated.reviewedKey).toBe('');
    expect(invalidated.rehearsalOpen).toBe(false);
    expect(invalidated.standId).toBe('BC02');
    expect(invalidated.minimized).toBe(true);
    const campaign = reconcileGuideSession(reviewed, game, 'two');
    expect(campaign.reviewedKey).toBe('');
    expect(campaign.rehearsalOpen).toBe(false);
    expect(campaign.standId).toBe('');
    expect(campaign.minimized).toBe(false);
  });

  it('isolates campaign minimization and works when localStorage is unavailable', () => {
    const game = createGame(bcOperatingLesson);
    const first = firstDeliveryStorageKey(game, 'campaign-one');
    const second = firstDeliveryStorageKey(game, 'campaign-two');
    expect(first).not.toBe(second);
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key), setItem: (key: string, value: string) => values.set(key, value) });
    saveGuideMinimized(first, true);
    expect(readGuideMinimized(first)).toBe(true);
    expect(readGuideMinimized(second)).toBe(false);
    saveGuideSite(first, 'BC02');
    expect(readGuideSite(first, game)).toBe('BC02');
    expect(readGuideSite(second, game)).toBe('');
    saveGuideSite(first, 'unknown-site');
    expect(readGuideSite(first, game)).toBe('');
    saveGuideSite(first, 'BC24');
    expect(readGuideSite(first, game)).toBe('');
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
    expect(readGuideMinimized(first)).toBe(false);
    expect(() => saveGuideMinimized(first, true)).not.toThrow();
    expect(readGuideSite(first, game)).toBe('');
    expect(() => saveGuideSite(first, 'BC02')).not.toThrow();
  });
});
