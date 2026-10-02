import {describe, expect, it} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {advance, createGame} from '../simulation/engine';
import {canAccess} from '../simulation/routing';
import {mapStandValues, snapshotComparison, standLensColor, UNKNOWN_COLOR, volumeColor} from './map-lenses';
describe('recorded operating map values', () => {
  it('uses actual captured stocks and rights independently of later campaign edits', () => {
    const game = advance(createGame(quebec)), report = game.history[0];
    report.snapshot!.stands[0].remaining = 123.5;
    report.snapshot!.stands[0].owned = false;
    game.stands[0].remaining = 90000; game.stands[0].owned = true;
    expect(mapStandValues(game, report)[0]).toMatchObject({standing: 123.5, owned: false, roadside: 0});
    expect(mapStandValues(game)[0]).toMatchObject({standing: 90000, owned: true});
  });
  it('withholds legacy volume and rights instead of filling them with current state', () => {
    const game = advance(createGame(quebec)); delete game.history[0].snapshot;
    const value = mapStandValues(game, game.history[0])[0];
    expect(value.standing).toBeNull(); expect(value.roadside).toBeNull(); expect(value.owned).toBeNull();
    expect(standLensColor(value, 'standing')).toEqual(UNKNOWN_COLOR);
    expect(standLensColor(value, 'rights')).toEqual(UNKNOWN_COLOR);
    expect(snapshotComparison(game, 0, 0)).toBeNull();
  });
  it('uses recorded weather for terrain access and never reads future actual weather', () => {
    const game = advance(createGame(quebec)), report = game.history[0];
    for (const zone of game.region.zones) report.weather[zone.id] = 'thaw';
    const values = mapStandValues(game, report);
    for (const stand of game.region.stands) expect(values.find(row => row.id === stand.id)!.terrainOpen).toBe(canAccess(stand.terrain, 'thaw'));
    game.week = game.region.weeks + 1;
    expect(mapStandValues(game).every(row => row.terrainOpen === null)).toBe(true);
  });
  it('compares two captured end states only, preserving zero and fractional values', () => {
    const game = advance(advance(createGame(quebec)));
    game.history[0].snapshot!.stands[0].remaining = 0;
    game.history[1].snapshot!.stands[0].remaining = 15.25;
    const comparison = snapshotComparison(game, 0, 1)!;
    expect(comparison[0]).toMatchObject({standingA: 0, standingB: 15.25, standingChange: 15.25, roadsideA: 0, roadsideB: 0});
    game.stands[0].remaining = 123456;
    expect(snapshotComparison(game, 0, 1)).toEqual(comparison);
    expect(snapshotComparison(game, -1, 1)).toBeNull();
  });
  it('keeps numeric colors in fixed bands for fair same-camera comparisons', () => {
    expect(volumeColor(999.9, 'standing')).not.toEqual(volumeColor(1000, 'standing'));
    expect(volumeColor(0, 'roadside')).not.toEqual(volumeColor(0.1, 'roadside'));
    expect(volumeColor(1000, 'standing')).toEqual(volumeColor(2999.9, 'standing'));
    expect(volumeColor(null, 'standing')).toEqual(UNKNOWN_COLOR);
    expect(volumeColor(NaN, 'standing')).toEqual(UNKNOWN_COLOR);
  });
});
