import {expect, it} from 'vitest';
import {mapFitPadding, mapFocusOffset, mapSymbolScale} from './map-viewport';
import {mapPickDepth, mapPickItems, mapScreenHits, type MapScreenMarker} from './map-picking';

it('keeps readable fixed-pixel fleet markers throughout the supported 0–22 zoom range', () => {
  for (let zoom = 0; zoom <= 22; zoom += 0.25) {
    const scale = mapSymbolScale(zoom, 10);
    expect(32 * scale).toBeGreaterThanOrEqual(24);
    expect(scale).toBeLessThanOrEqual(1);
  }
  expect(mapSymbolScale(10, 10)).toBe(1);
});

it('fits above the actual mobile sheet and leaves desktop maps unreserved', () => {
  expect(mapFitPadding(390, 600, 240)).toEqual({top: 64, left: 28, right: 28, bottom: 264});
  expect(mapFitPadding(1440, 800, 0)).toEqual({top: 70, left: 45, right: 45, bottom: 45});
  expect(mapFitPadding(390, 600, 580).bottom).toBe(440);
  expect(mapFitPadding(390, 600, undefined, true).bottom).toBe(342);
});

it('keeps every dense tap candidate, de-duplicates stand representations and includes roads under polygons', () => {
  const standHits = Array.from({length: 30}, (_, i) => ({layer: {id: 'stand-points'}, object: {id: `S${i}`}}));
  const items = mapPickItems([
    {layer: {id: 'network'}, object: {id: 'R1'}}, ...standHits,
    {layer: {id: 'stands'}, object: {id: 'S0'}},
    {layer: {id: 'labels'}, object: {id: 'S0'}},
    {layer: {id: 'fleet'}, object: {id: 'C1', members: [{id: 'C1', kind: 'crew'}, {id: 'T1', kind: 'truck'}, {id: 'M1', kind: 'mill'}]}},
  ], (kind, id) => `${kind} ${id}`);
  expect(items).toHaveLength(34);
  expect(items.filter(item => item.id === 'S0')).toHaveLength(1);
  expect(items.at(-1)).toEqual({kind: 'road', id: 'R1', name: 'road R1'});
  expect(items.slice(30, 33).map(item => item.kind)).toEqual(['crew', 'truck', 'mill']);
  expect(mapPickDepth({stands: 30, mills: 3, crews: 2, trucks: 4, roads: 40})).toBe(12);
});

it('ignores planned route and malformed fleet hits instead of opening invalid sheets', () => {
  expect(mapPickItems([
    {layer: {id: 'routes'}, object: {id: 'R1'}},
    {layer: {id: 'fleet'}, object: {id: 'unknown', kind: 'plane'}},
    {layer: {id: 'labels'}, object: {}},
  ], (_, id) => id)).toEqual([]);
});

it('uncovers tapped items without moving a feature already visible above the sheet', () => {
  const frame = {w: 390, h: 600};
  expect(mapFocusOffset({x: 195, y: 160}, frame, 300)).toBeNull();
  expect(mapFocusOffset({x: 195, y: 480}, frame, 300)).toEqual([0, 306]);
  expect(mapFocusOffset({x: -10, y: 174}, frame, 300)).toEqual([-205, 0]);
  expect(mapFocusOffset({x: 195, y: 400}, frame, 540)).toBeNull();
});

it('recovers every co-located stand, offset fleet cluster and road when GPU hits omit them', () => {
  const markers: MapScreenMarker[] = Array.from({length: 32}, (_, i) => ({id: `S${i}`, kind: 'stand', position: [100, 100], radius: 8}));
  markers.push({id: 'C1', kind: 'crew', position: [100, 130], offset: [0, -30], radius: 16, members: [{id: 'C1', kind: 'crew'}, {id: 'T1', kind: 'truck'}]});
  markers.push({id: 'outside', kind: 'mill', position: [250, 250], radius: 18});
  const roads = [{id: 'through', geometry: [[50, 100], [150, 100]] as [number, number][]}, {id: 'outside', geometry: [[250, 250], [270, 270]] as [number, number][]}];
  const project = ([x, y]: [number, number]) => ({x, y});
  const items = mapPickItems(mapScreenHits(markers, roads, project, {x: 100, y: 100}, 14), (_, id) => id);
  expect(items).toHaveLength(35);
  expect(items.map(item => item.id)).toContain('S0');
  expect(items.map(item => item.id)).toContain('T1');
  expect(items.at(-1)).toMatchObject({kind: 'road', id: 'through'});
  expect(items.some(item => item.id === 'outside')).toBe(false);
  // The caller supplies only currently drawn features: no hidden-layer picks.
  expect(mapScreenHits([], [], project, {x: 100, y: 100}, 14)).toEqual([]);
});

it('rechecks visibility against late portal geometry after a point was visible above the peek', () => {
  const point = {x: 195, y: 480}, frame = {w: 390, h: 600};
  expect(mapFocusOffset(point, frame, 60)).toBeNull();
  const offset = mapFocusOffset(point, frame, 397)!;
  const finalY = point.y - offset[1];
  expect(finalY).toBeGreaterThan(80);
  expect(finalY).toBeLessThan(frame.h - 397 - 16);
  expect(mapFocusOffset({x: point.x - offset[0], y: finalY}, frame, 397)).toBeNull();
});
