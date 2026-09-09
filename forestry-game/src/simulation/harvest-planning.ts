import type { Game, WeekResult } from "./types";
import { advance, sum } from "./engine";
import { route, weatherAt, canAccess } from "./routing";
import { activeDisruptions, operatingRegion } from "./disruptions";
export function siteCandidates(
  game: Game,
  crewId: string,
  product: string,
  millId: string,
  horizon: 2 | 4,
) {
  const crew = game.region.crews.find((c) => c.id === crewId);
  if (!crew) throw Error("Unknown crew");
  const w = weatherAt(game, true),
    r = operatingRegion(game),
    mill = r.mills.find((m) => m.id === millId);
  return r.stands
    .map((s) => {
      const state = game.stands.find((t) => t.id === s.id)!,
        eligible = Math.max(
          0,
          state.remaining -
            s.volume *
              Math.max(game.plan.retention, r.treatments?.final.retention ?? 0),
        );
      const path = route(
        r,
        game.crewPositions[crewId],
        s.node,
        w,
        game.improvedRoads,
      );
      const rate =
        s.productivity *
        crew.productivityFactor *
        (w[s.zone] === "wet" ? 0.8 : w[s.zone] === "thaw" ? 0.65 : 1) *
        (r.treatments?.final.productivity ?? 1);
      const terrain = canAccess(s.terrain, w[s.zone]),
        millOpen =
          !mill ||
          !activeDisruptions(game).some(
            (e) => e.kind === "mill" && e.target === mill.id,
          );
      const haul =
        mill && millOpen
          ? route(r, s.node, mill.node, w, game.improvedRoads)
          : null;
      const windows = Array.from(
        { length: Math.max(0, Math.min(horizon, r.weeks - game.week + 1)) },
        (_, i) => game.week + i,
      ).map((week) => {
        const wr = operatingRegion(game, true, week),
          weather = weatherAt(game, true, week);
        return {
          week,
          open:
            (wr.crews.find(c=>c.id===crewId)?.hours??0)>0 &&
            canAccess(s.terrain, weather[s.zone]) &&
            !!route(
              wr,
              game.crewPositions[crewId],
              s.node,
              weather,
              game.improvedRoads,
            ),
          weather: weather[s.zone],
        };
      });
      return {
        stand: s,
        owned: state.owned && !state.refused,
        eligible,
        share: s.mix[product] ?? 0,
        rate,
        terrain,
        relocationKm: path?.km ?? null,
        relocationHours: path ? path.km / crew.relocationSpeed : null,
        haulKm: haul?.km ?? null,
        millCompatible:
          !mill || (mill.prices[product] !== undefined &&
            (mill.demand[Math.min(Math.floor((game.week-1)/r.weeksPerMonth),mill.demand.length-1)][product]??0) > (game.deliveries[mill.id]?.[product]??0) && millOpen && !!haul),
        windows,
      };
    })
    .sort(
      (a, b) => (a.relocationKm ?? Infinity) - (b.relocationKm ?? Infinity),
    );
}
export function queueCandidate(
  game: Game,
  crewId: string,
  standId: string,
): Game {
  const g = structuredClone(game),
    c = operatingRegion(g).crews.find((c) => c.id === crewId),
    s = g.stands.find((s) => s.id === standId);
  if (g.week > g.region.weeks || !c || !s?.owned || s.refused)
    throw Error("Choose an owned stand and an available crew.");
  const remaining =
    c.hours - (g.plan.crews[crewId] ?? []).reduce((n, o) => n + o.hours, 0);
  if (remaining <= 0.001)
    throw Error("This crew has no unassigned hours. Edit its queue first.");
  g.plan.crews[crewId] ??= [];
  g.plan.crews[crewId].push({
    stand: standId,
    hours: remaining,
    treatment: "final",
  });
  g.plan.ready = { purchase: false, production: false, transport: false };
  return g;
}
export function rollingForecast(game: Game, horizon: 2 | 4) {
  let g = structuredClone(game);
  g.roleMode = false;
  g.region.disruptions = g.region.disruptions?.filter(
    (e) => e.revealWeek <= game.week,
  );
  const schedule = g.region.weather[g.weatherId];
  for (const z of g.region.zones)
    schedule.actual[z.id] = [...schedule.forecast[z.id]];
  const reports: WeekResult[] = [];
  let problem = "";
  for (let i = 0; i < horizon && g.week <= g.region.weeks; i++) {
    g.plan.bids = {};
    try {
      g = advance(g);
      reports.push(g.history.at(-1)!);
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
      break;
    }
  }
  return { reports, problem };
}
export function productionEfficiency(game: Game) {
  return game.history.map((h) => {
    const produced = sum(h.harvested),
      relocation = h.movements
        .filter((m) => m.kind === "crew")
        .reduce((n, m) => n + m.km, 0),
      capacity = operatingRegion(game, false, h.week).crews.reduce(
        (n, c) => n + c.hours,
        0,
      ),
      used = Object.values(h.crewHours).reduce((a, b) => a + b, 0);
    return {
      week: h.week,
      produced,
      relocation,
      kmPerThousand: produced > 0 ? (relocation / produced) * 1000 : null,
      utilization: capacity > 0 ? (used / capacity) * 100 : null,
      disturbancePerThousand:
        produced > 0 ? (h.disturbance / produced) * 1000 : null,
    };
  });
}
