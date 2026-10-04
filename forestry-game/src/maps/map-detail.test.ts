import {expect, it} from 'vitest';
import {groupMapSites, mapDetail} from './map-detail';
const map = {project: ([x, y]: [number, number]) => ({x, y})};
it('progressively reveals IDs, polygons and fleet rather than drawing all details at district fit', () => {
  expect(mapDetail(7.5, 8.7)).toMatchObject({band: 'overview', individualFleet: false, allLabels: false, polygons: false});
  expect(mapDetail(9, 8.7)).toMatchObject({band: 'district', individualFleet: false, allLabels: false});
  expect(mapDetail(10, 8.7)).toMatchObject({band: 'close', individualFleet: true, allLabels: true, polygons: true});
});
it('retains every group member for zooming without claiming combined parcel geometry', () => {
  const sites = [{id: 'S1', position: [100, 100] as [number, number]}, {id: 'S2', position: [120, 110] as [number, number]}, {id: 'S3', position: [260, 200] as [number, number]}];
  const groups = groupMapSites(sites, map, 44);
  expect(groups).toHaveLength(2);
  expect(groups[0]).toMatchObject({position: [110, 105], members: [{id: 'S1', kind: 'stand'}, {id: 'S2', kind: 'stand'}]});
  expect(groups[0].positions).toEqual([[100, 100], [120, 110]]);
  expect(groupMapSites(sites, map, 0)).toHaveLength(3);
});
