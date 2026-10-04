import type {Position} from '../simulation/types';
import type {Projector} from './symbol-layout';

/** Detail grows with the geographic view, rather than filling a district with equipment. */
export function mapDetail(zoom: number, authoredZoom: number) {
  const band = zoom < authoredZoom - 0.5 ? 'overview' : zoom < authoredZoom + 1 ? 'district' : 'close';
  return {band, clusterDistance: band === 'overview' ? 44 : band === 'district' ? 28 : 0,
    individualFleet: band === 'close', allLabels: band === 'close', polygons: band === 'close',
    roadWidth: band === 'overview' ? 1.5 : band === 'district' ? 2 : 3,
  } as const;
}

export interface MapSiteGroup {id: string; position: Position; members: {id: string; kind: 'stand'}[]; positions: Position[]}
/** Counted markers represent nearby inventory locations, never merged parcel boundaries. */
export function groupMapSites(sites: {id: string; position: Position}[], map: Projector, distance: number): MapSiteGroup[] {
  const groups: MapSiteGroup[] = [];
  for (const site of sites) {
    const p = map.project(site.position);
    const group = distance > 0 ? groups.find(g => {
      const center = map.project(g.position);
      return Math.hypot(center.x - p.x, center.y - p.y) < distance;
    }) : undefined;
    if (!group) { groups.push({id: site.id, position: site.position, members: [{id: site.id, kind: 'stand'}], positions: [site.position]}); continue; }
    group.members.push({id: site.id, kind: 'stand'}); group.positions.push(site.position);
    group.position = [group.positions.reduce((n, pos) => n + pos[0], 0) / group.positions.length,
      group.positions.reduce((n, pos) => n + pos[1], 0) / group.positions.length];
  }
  return groups;
}
