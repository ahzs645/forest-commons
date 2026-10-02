export type MapPick = { kind: "stand" | "mill" | "crew" | "truck" | "road"; id: string; name: string };
type PickInfo = {layer?: {id: string} | null; object?: unknown};
const pickKinds: Record<string, MapPick["kind"] | "fleet"> = {
  stands: "stand", "stand-points": "stand", labels: "stand", mills: "mill", fleet: "fleet",
  "fleet-count": "fleet", "fleet-status": "fleet", "replay-fleet": "fleet", network: "road",
};

/** A cluster tap lists all members; duplicate polygon, point and label hits collapse. */
export function mapPickItems(infos: PickInfo[], name: (kind: MapPick['kind'], id: string) => string): MapPick[] {
  const seen = new Map<string, MapPick>();
  for (const info of infos) {
    const layerKind = pickKinds[info.layer?.id ?? ""], object = info.object as {id?: string; kind?: string; members?: {id: string; kind: MapPick['kind']}[]} | undefined;
    if (!layerKind || !object?.id) continue;
    const entries = object.members ?? [{id: object.id, kind: layerKind === "fleet" ? object.kind as MapPick['kind'] : layerKind}];
    for (const {id, kind} of entries) {
      if (!['stand', 'mill', 'crew', 'truck', 'road'].includes(kind) || !id || seen.has(`${kind}:${id}`)) continue;
      seen.set(`${kind}:${id}`, {kind, id, name: name(kind, id)});
    }
  }
  // Road geometry often runs through a stand. Keep it in the chooser rather
  // than making that road impossible to inspect whenever a polygon is hit.
  return [...seen.values()].sort((a, b) => Number(a.kind === 'road') - Number(b.kind === 'road'));
}

/** Keep GPU work bounded; co-located features also use screen-space hit testing. */
export function mapPickDepth(counts: {stands: number; mills: number; crews: number; trucks: number; roads: number}) {
  return Math.min(12, Math.max(1, counts.stands + counts.mills + counts.crews + counts.trucks + counts.roads));
}

export interface MapScreenMarker {
  id: string; kind: MapPick['kind']; position: [number, number]; radius: number;
  offset?: [number, number]; members?: {id: string; kind: MapPick['kind']}[];
}
export interface MapScreenRoad {id: string; geometry: [number, number][]}
const segmentDistance = (point: {x: number; y: number}, a: {x: number; y: number}, b: {x: number; y: number}) => {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
};

/** GPU picking cannot separate arbitrarily many objects in the same pixel. */
export function mapScreenHits(markers: MapScreenMarker[], roads: MapScreenRoad[], project: (position: [number, number]) => {x: number; y: number}, point: {x: number; y: number}, radius: number): PickInfo[] {
  const hits: PickInfo[] = [];
  for (const marker of markers) {
    const p = project(marker.position), offset = marker.offset ?? [0, 0];
    if (Math.hypot(point.x - p.x - offset[0], point.y - p.y - offset[1]) > radius + marker.radius) continue;
    hits.push({layer: {id: marker.kind === 'stand' ? 'stand-points' : 'fleet'}, object: marker});
  }
  for (const road of roads) {
    const path = road.geometry.map(project);
    if (path.some((p, i) => i > 0 && segmentDistance(point, path[i - 1], p) <= radius + 1.5))
      hits.push({layer: {id: 'network'}, object: road});
  }
  return hits;
}
