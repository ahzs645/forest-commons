import {describe, expect, it} from 'vitest';
import {MAX_MAP_VIEWPOINTS, mapViewpointScope, parseMapViewpoints, updateMapViewpoints, validMapCamera, viewpointsForScope, type MapCamera, type MapViewpoint} from './map-viewpoints';
const camera: MapCamera = {center: [-123, 54], zoom: 12, bearing: 30, pitch: 40};
const view = (id = 'view'): MapViewpoint => ({id, name: 'Mill', camera});

describe('campaign map viewpoints', () => {
  it('keeps repeated-seed campaigns and different regions separate', () => {
    const first = mapViewpointScope('campaign-a', 'bc'), second = mapViewpointScope('campaign-b', 'bc'), other = mapViewpointScope('campaign-a', 'qc');
    const store = updateMapViewpoints(parseMapViewpoints(null), first, [view()], 1);
    expect(viewpointsForScope(store, first)).toHaveLength(1);
    expect(viewpointsForScope(store, second)).toEqual([]);
    expect(viewpointsForScope(store, other)).toEqual([]);
  });
  it('bounds scope history and view count so campaigns cannot grow storage indefinitely', () => {
    let store = parseMapViewpoints(null);
    for (let i = 0; i < 8; i++) store = updateMapViewpoints(store, `scope-${i}`, [view()], i);
    expect(store.scopes).toHaveLength(6);
    expect(viewpointsForScope(store, 'scope-0')).toEqual([]);
    expect(viewpointsForScope(store, 'scope-7')).toHaveLength(1);
    expect(() => updateMapViewpoints(store, 'scope-7', Array.from({length: MAX_MAP_VIEWPOINTS + 1}, (_, i) => view(String(i))), 9)).toThrow();
  });
  it('rejects malformed and nonfinite cameras before map transforms can be requested', () => {
    for (const changed of [{pitch: 90}, {zoom: Infinity}, {bearing: NaN}, {center: [181, 54]}, {center: [-123, 90]}]) expect(validMapCamera({...camera, ...changed})).toBe(false);
    expect(validMapCamera(camera)).toBe(true);
    expect(() => parseMapViewpoints('{broken')).toThrow();
    expect(() => parseMapViewpoints(JSON.stringify({version: 1, scopes: [{key: 'one', updatedAt: 1, views: [{...view(), camera: {...camera, zoom: null}}]}]}))).toThrow();
  });
  it('rejects duplicate identifiers and oversized names instead of silently changing saved views', () => {
    expect(() => updateMapViewpoints(parseMapViewpoints(null), 'scope', [view(), view()], 1)).toThrow();
    expect(() => updateMapViewpoints(parseMapViewpoints(null), 'scope', [{...view(), name: 'x'.repeat(49)}], 1)).toThrow();
    expect(() => parseMapViewpoints('x'.repeat(64001))).toThrow();
  });
  it('round-trips views without aliasing the current camera and deletes empty scopes', () => {
    const original = structuredClone(camera), store = updateMapViewpoints(parseMapViewpoints(null), 'scope', [view()], 1);
    const decoded = parseMapViewpoints(JSON.stringify(store));
    expect(viewpointsForScope(decoded, 'scope')[0].camera).toEqual(original);
    decoded.scopes[0].views[0].camera.center[0] = 0;
    expect(camera).toEqual(original);
    expect(updateMapViewpoints(store, 'scope', [], 2).scopes).toEqual([]);
  });
});
