import {effectiveMarketRegion} from './bc-market';
import { authorizedOperatingRegion } from './tenure';
import type { Game, RegionDefinition, Disruption } from "./types";
export function activeDisruptions(
  g: Game,
  knownOnly = true,
  week = g.week,
): Disruption[] {
  return (g.region.disruptions ?? []).filter(
    (e) =>
      e.week <= week &&
      week <= e.endWeek &&
      (!knownOnly || e.revealWeek <= g.week) &&
      !(g.eventResponses ?? []).some(
        (a) =>
          a.event === e.id && a.action === "repair" && a.restoredWeek <= week,
      ),
  );
}
export function operatingRegion(
  g: Game,
  knownOnly = true,
  week = g.week,
): RegionDefinition {
  const closed = activeDisruptions(g, knownOnly, week);
  return authorizedOperatingRegion({...g,week}, effectiveMarketRegion(g, {
    ...g.region,
    roads: {
      ...g.region.roads,
      edges: g.region.roads.edges.filter(
        (e) => !closed.some((x) => x.kind === "road" && x.target === e.id),
      ),
    },
    crews: g.region.crews.map((c) =>
      closed.some((e) => e.kind === "crew" && e.target === c.id)
        ? { ...c, hours: 0 }
        : c,
    ),
    trucks: g.region.trucks.map((t) =>
      closed.some((e) => e.kind === "truck" && e.target === t.id)
        ? { ...t, hours: 0 }
        : t,
    ),
  }, week, knownOnly));
}
export function respondToDisruption(
  game: Game,
  id: string,
  action: "repair" | "wait",
): Game {
  const g = structuredClone(game),
    e = g.region.disruptions?.find((e) => e.id === id);
  if (
    !e ||
    !activeDisruptions(g).some((e) => e.id === id) ||
    g.week > g.region.weeks
  )
    throw Error("This disruption is not active and revealed.");
  g.eventResponses ??= [];
  if (g.eventResponses.some((a) => a.event === id && a.action === "repair"))
    throw Error("Recovery is already scheduled.");
  if (action === "repair") {
    const reserved = Object.values(g.plan.bids).reduce((a, b) => a + b, 0);
    if (g.cash - reserved < e.repairCost)
      throw Error("Insufficient uncommitted cash for recovery.");
    g.cash -= e.repairCost;
    g.instantLedger.push({
      category: "recovery",
      description: `${e.title}: paid recovery, available week ${g.week + e.repairWeeks}`,
      amount: -e.repairCost,
    });
  }
  if (
    action === "wait" &&
    g.eventResponses.some(
      (a) => a.event === id && a.action === "wait" && a.week === g.week,
    )
  )
    return g;
  g.eventResponses.push({
    event: id,
    action,
    week: g.week,
    restoredWeek: action === "repair" ? g.week + e.repairWeeks : e.endWeek + 1,
  });
  g.plan.ready = { purchase: false, production: false, transport: false };
  return g;
}
