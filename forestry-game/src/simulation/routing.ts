import { roadTravelRule, travelGrossTonnes, type TravelRequest } from "./operations-profile";
import type { Game, RegionDefinition, Route, Weather } from "./types";
export const canAccess = (bearing: number, weather: Weather) =>
  bearing <= { thaw: 1, wet: 2, normal: 3, frozen: 4 }[weather];
export function weatherAt(
  game: Game,
  forecast = false,
  week = game.week,
): Record<string, Weather> {
  const scenario = game.region.weather[game.weatherId];
  return Object.fromEntries(
    game.region.zones.map((z) => [
      z.id,
      (forecast ? scenario.forecast : scenario.actual)[z.id][
        Math.min(week, game.region.weeks) - 1
      ],
    ]),
  );
}
export function route(
  region: RegionDefinition,
  from: string,
  to: string,
  weather: Record<string, Weather>,
  improved: string[] = [],
  request?: TravelRequest,
): Route | null {
  if (!Number.isFinite(travelGrossTonnes(region, request))) return null;
  if (from === to) {
    const node = region.roads.nodes.find((n) => n.id === from);
    return node
      ? { nodes: [from], edges: [], path: [node.position], km: 0, hours: 0 }
      : null;
  }
  const distances = new Map<string, number>([[from, 0]]),
    previous = new Map<
      string,
      { node: string; edge: (typeof region.roads.edges)[number] }
    >(),
    visited = new Set<string>();
  while (true) {
    let current: string | undefined,
      best = Infinity;
    for (const [id, n] of distances)
      if (!visited.has(id) && n < best) {
        best = n;
        current = id;
      }
    if (!current) return null;
    if (current === to) break;
    visited.add(current);
    for (const edge of region.roads.edges) {
      if (edge.from !== current && edge.to !== current) continue;
      const operating = roadTravelRule(region, edge.id, weather[edge.zone], request);
      if (!operating.allowed) continue;
      if (
        !improved.includes(edge.id) &&
        !canAccess(edge.bearing, weather[edge.zone])
      )
        continue;
      const next = edge.from === current ? edge.to : edge.from,
        value = best + edge.km / (edge.speed * operating.speedFactor) + operating.delayHours;
      if (value < (distances.get(next) ?? Infinity)) {
        distances.set(next, value);
        previous.set(next, { node: current, edge });
      }
    }
  }
  const nodes = [to],
    edges: typeof region.roads.edges = [];
  let cursor = to;
  while (cursor !== from) {
    const p = previous.get(cursor)!;
    edges.unshift(p.edge);
    nodes.unshift(p.node);
    cursor = p.node;
  }
  const path = edges.flatMap((e, i) => {
    const points = e.from === nodes[i] ? e.geometry : [...e.geometry].reverse();
    return i ? points.slice(1) : points;
  });
  return {
    nodes,
    edges: edges.map((e) => e.id),
    path,
    km: edges.reduce((n, e) => n + e.km, 0),
    hours: distances.get(to)!,
  };
}
