import {describe, expect, it} from 'vitest';
import type {Movement, Position} from '../simulation/types';
import {recordedMovements, routeReplayFrame, routeReplaySegments} from './route-replay';
const movement = (path: Position[], resource = 'truck-1'): Movement => ({resource, kind: 'truck', path, from: 'a', to: 'b', km: 10, hours: 1, volume: 20});

describe('recorded route progression', () => {
  it('interpolates by geographic segment length instead of vertex count', () => {
    const result = routeReplayFrame([movement([[0, 0], [1, 0], [4, 0]])], 'truck-1', 0.5)!;
    expect(result.position[0]).toBeCloseTo(2);
    expect(result.travelled[0][1]).toEqual([1, 0]);
    expect(result.travelled[0].at(-1)![0]).toBeCloseTo(2);
  });
  it('preserves resource sequence and never joins disconnected records', () => {
    const records = [movement([[0, 0], [1, 0]]), movement([[30, 0], [40, 0]], 'other'), movement([[10, 0], [13, 0]])];
    const result = routeReplayFrame(records, 'truck-1', 0.5)!;
    expect(result.movementIndex).toBe(1);
    expect(result.movementCount).toBe(2);
    expect(result.position[0]).toBeCloseTo(11);
    expect(result.travelled[0]).toEqual([[0, 0], [1, 0]]);
    expect(result.travelled[1][0]).toEqual([10, 0]);
  });
  it('clamps scrubber endpoints, including nonfinite input', () => {
    const records = [movement([[-123, 54], [-122, 54]])];
    expect(routeReplayFrame(records, 'truck-1', -1)!.position).toEqual([-123, 54]);
    expect(routeReplayFrame(records, 'truck-1', NaN)!.position).toEqual([-123, 54]);
    expect(routeReplayFrame(records, 'truck-1', 2)!.position).toEqual([-122, 54]);
  });
  it('handles stationary/duplicate coordinates without division by zero', () => {
    const records = [movement([[1, 2], [1, 2]]), movement([[3, 4]])];
    expect(routeReplayFrame(records, 'truck-1', 0.25)!.position).toEqual([1, 2]);
    expect(routeReplayFrame(records, 'truck-1', 0.75)!.position).toEqual([3, 4]);
    expect(routeReplayFrame([movement([[0, 0], [0, 0], [2, 0]])], 'truck-1', 0.5)!.position[0]).toBeCloseTo(1);
  });
  it('does not invent geometry for empty or malformed legacy records', () => {
    const records = [movement([]), movement([[0, 0], [NaN, 0], [2, 0]]), movement([[181, 0]])];
    expect(recordedMovements(records)).toEqual([]);
    expect(routeReplayFrame(records, 'truck-1', 0.5)).toBeNull();
    expect(routeReplayFrame(undefined, 'truck-1', 0.5)).toBeNull();
  });
  it('preserves recorded data when playback positions are changed', () => {
    const records = [movement([[0, 0], [1, 0]])], original = structuredClone(records);
    const result = routeReplayFrame(records, 'truck-1', 1)!;
    result.position[0] = 99;
    result.travelled[0][0][0] = 99;
    expect(records).toEqual(original);
  });
  it('seeks tour records on the same geographic-distance boundaries as playback', () => {
    const records = [movement([[0, 0], [1, 0]]), movement([[10, 0], [13, 0]]), movement([[0, 0], [80, 0]], 'other')];
    const tour = routeReplaySegments(records, 'truck-1');
    expect(tour).toHaveLength(2);
    expect(tour[1].startProgress).toBeCloseTo(.25);
    expect(tour[1].endProgress).toBe(1);
    expect(routeReplayFrame(records, 'truck-1', tour[1].startProgress, tour[1].movementIndex)!.position).toEqual([10, 0]);
    expect(routeReplayFrame(records, 'truck-1', .5)!.position[0]).toBeCloseTo(11);
  });
  it('lets a paused tour inspect stationary records without adding travel distance', () => {
    const records = [movement([[0, 0], [1, 0]]), movement([[8, 2]]), movement([[10, 0], [13, 0]])];
    const tour = routeReplaySegments(records, 'truck-1');
    expect(tour[1].startProgress).toBe(tour[1].endProgress);
    expect(tour[1].stationary).toBe(true);
    const inspected = routeReplayFrame(records, 'truck-1', tour[1].startProgress, 1)!;
    expect(inspected.position).toEqual([8, 2]);
    expect(inspected.movementIndex).toBe(1);
    expect(routeReplayFrame(records, 'truck-1', tour[1].startProgress)!.movementIndex).toBe(2);
  });
  it('marks all-stationary record order and ignores invalid inspection indices', () => {
    const records = [movement([[1, 2]]), movement([[3, 4]])];
    const tour = routeReplaySegments(records, 'truck-1');
    expect(tour.map(row => [row.startProgress, row.endProgress, row.stationary])).toEqual([[0, .5, true], [.5, 1, true]]);
    expect(routeReplayFrame(records, 'truck-1', .75, NaN)!.movementIndex).toBe(1);
    expect(routeReplayFrame(records, 'truck-1', .75, 9)!.movementIndex).toBe(1);
    expect(routeReplaySegments(records, 'absent')).toEqual([]);
  });
});
