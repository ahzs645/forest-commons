import { operatingRetention, standWorkProblems } from "./operations-profile";
import { operatingRegion } from "./disruptions";
import { harvestAuthorizationProblem } from "./tenure";
import type { Game } from "./types";
import { advance, month, planProblems, stockAt, sum } from "./engine";
import { canAccess, weatherAt } from "./routing";
export function forecastOutcome(game: Game) {
  if (game.week > game.region.weeks)
    return { report: null, problems: ["The campaign has ended."] };
  const preview = structuredClone(game);
  preview.roleMode = false;
  preview.region.disruptions=preview.region.disruptions?.filter(e=>e.revealWeek<=game.week);
 if(preview.region.bcMarket)preview.region.bcMarket.events=preview.region.bcMarket.events.filter(e=>e.revealWeek<=1+(game.week-1)*(game.region.turnDurationWeeks??1));
  preview.plan.bids = {};
  const issues = planProblems(preview);
  if (issues.length) return { report: null, problems: issues };
  const schedule = preview.region.weather[preview.weatherId];
  for (const zone of preview.region.zones)
    schedule.actual[zone.id][preview.week - 1] =
      schedule.forecast[zone.id][preview.week - 1];
  return { report: advance(preview).history.at(-1)!, problems: [] };
}
export function supplyBalance(game: Game) {
  const r = operatingRegion(game),
    w = weatherAt(game, true);
  return r.products.map((p) => {
    const target = r.mills.reduce(
      (n, m) =>
        n +
        Math.max(
          0,
          (game.plan.targets[m.id]?.[p.id] ?? 0) -
            (game.deliveries[m.id]?.[p.id] ?? 0),
        ),
      0,
    );
    const roadside = game.stands.reduce(
      (n, s) => n + (stockAt(game, s.id)[p.id] ?? 0),
      0,
    );
    const standing = r.stands.reduce((n, s) => {
      const state = game.stands.find((t) => t.id === s.id)!;
      return (
        n +
        (state.owned && !harvestAuthorizationProblem(game, s.id) && canAccess(s.terrain, w[s.zone]) &&
          (!r.operations || r.crews.some(c => (r.operations!.stands[s.id]?.treatments ?? ['final']).some(t =>
            !standWorkProblems(game, s.id, c.id, t, w[s.zone]).length)))
          ? Math.max(0, state.remaining - s.volume * operatingRetention(r, s.id, game.plan.retention)) *
            (s.mix[p.id] ?? 0)
          : 0)
      );
    }, 0);
    const demand = r.mills.reduce(
      (n, m) =>
        n +
        Math.max(
          0,
          (m.demand[month(game)][p.id] ?? 0) -
            (game.deliveries[m.id]?.[p.id] ?? 0),
        ),
      0,
    );
    return {
      product: p,
      target,
      roadside,
      standing,
      demand,
      gap: Math.max(0, target - roadside - standing),
    };
  });
}
/**
 * Rest-of-season balance by product: what buyers still want this month and in
 * later months, against roadside stock and the harvestable volume of secured
 * stands (above the retention floor), plus what is still offered for purchase
 * or auction. Access, crew and truck capacity and spoilage are not considered.
 */
export function seasonBalance(game: Game) {
  const r = operatingRegion(game), now = month(game);
  const harvestable = (s: (typeof r.stands)[number], state: Game["stands"][number]) =>
    Math.max(0, state.remaining - s.volume * operatingRetention(r, s.id, game.plan.retention));
  return r.products.map((p) => {
    const demand = r.mills.reduce((n, m) => n + m.demand.reduce((t, d, i) =>
      t + (i < now ? 0 : Math.max(0, (d[p.id] ?? 0) - (i === now ? game.deliveries[m.id]?.[p.id] ?? 0 : 0))), 0), 0);
    const roadside = game.stands.reduce((n, s) => n + (stockAt(game, s.id)[p.id] ?? 0), 0);
    let secured = 0, available = 0;
    for (const s of r.stands) {
      const state = game.stands.find((t) => t.id === s.id)!, volume = harvestable(s, state) * (s.mix[p.id] ?? 0);
      if (state.owned) secured += volume;
      else if (!state.refused && (s.supply === "private" || (s.supply === "auction" && (s.auctionWeek ?? 0) >= game.week))) available += volume;
    }
    return { product: p, demand, roadside, secured, available, balance: roadside + secured - demand };
  });
}
export function learningProgress(game: Game) {
  const h = game.history,
    harvest = h.reduce((n, w) => n + sum(w.harvested), 0),
    delivered = h.reduce((n, w) => n + sum(w.delivered), 0),
    checks = h.reduce((n, w) => n + w.targetChecks, 0),
    hits = h.reduce((n, w) => n + w.targetHits, 0);
  const values = {
    delivered,
    service: checks ? (100 * hits) / checks : null,
    waste: harvest
      ? (100 * h.reduce((n, w) => n + w.waste, 0)) / harvest
      : null,
    emissions: delivered
      ? h.reduce((n, w) => n + w.emissions, 0) / delivered
      : null,
    profit: game.cash - game.region.economy.startingCash,
  };
  return (game.region.objectives ?? []).map((o) => {
    const value = values[o.metric],
      met =
        value !== null &&
        (o.direction === "at-least" ? value >= o.target : value <= o.target);
    return { ...o, value, met, final: game.week > game.region.weeks };
  });
}
