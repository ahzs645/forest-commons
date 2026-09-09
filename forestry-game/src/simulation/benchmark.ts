import solver from "javascript-lp-solver";
import type { Game } from "./types";
import { advance, month, stockAt } from "./engine";
import { weatherAt, route } from "./routing";
import { operatingRegion, activeDisruptions } from "./disruptions";
import { forecastOutcome } from "./planning";
export function dispatchBenchmark(game: Game) {
  if (game.week > game.region.weeks) throw Error("The campaign is complete.");
  const preview = structuredClone(game);
  preview.roleMode = false;
  preview.plan.bids = {};
  preview.region.disruptions = preview.region.disruptions?.filter(
    (e) => e.revealWeek <= game.week,
  );
  const w = weatherAt(preview, true);
  for (const z of preview.region.zones)
    preview.region.weather[preview.weatherId].actual[z.id][preview.week - 1] =
      w[z.id];
  preview.plan.trucks = Object.fromEntries(
    preview.region.trucks.map((t) => [t.id, []]),
  );
  const produced = advance(preview),
    r = operatingRegion(preview, true);
  const lanes: {
    id: string;
    truck: string;
    stand: string;
    mill: string;
    product: string;
    payload: number;
    hours: number;
    offsetHours: number;
    margin: number;
    offsetCost: number;
    max: number;
  }[] = [];
  for (const t of r.trucks) {
    const candidates: typeof lanes = [];
    if (t.hours <= 0) continue;
    for (const s of r.stands) {
      const stock = stockAt(produced, s.id);
      if (!game.stands.find((x) => x.id === s.id)?.owned) continue;
      const empty = route(
        r,
        game.truckPositions[t.id],
        s.node,
        w,
        game.improvedRoads,
      );
      if (!empty) continue;
      for (const m of r.mills) {
        if (
          activeDisruptions(preview).some(
            (e) => e.kind === "mill" && e.target === m.id,
          )
        )
          continue;
        const loaded = route(r, s.node, m.node, w, game.improvedRoads);
        if (!loaded) continue;
        for (const p of r.products) {
          const demand = Math.max(
              0,
              (m.demand[month(game)][p.id] ?? 0) -
                (game.deliveries[m.id]?.[p.id] ?? 0),
            ),
            available = stock[p.id] ?? 0;
          const hours = loaded.hours * 2 + t.loadingHours + t.unloadingHours,
            offsetHours = empty.hours - loaded.hours,
            max = Math.max(
              0,
              Math.min(
                Math.floor(available / t.payload),
                Math.floor(demand / t.payload),
                Math.floor((t.hours - offsetHours) / hours),
              ),
            );
          if (!max) continue;
          const batches = produced.stands
              .find((x) => x.id === s.id)!
              .stock.filter((b) => b.product === p.id),
            quality = Math.min(...batches.map((b) => b.quality));
          candidates.push({
            id: "",
            truck: t.id,
            stand: s.id,
            mill: m.id,
            product: p.id,
            payload: t.payload,
            hours,
            offsetHours,
            margin:
              t.payload * m.prices[p.id] * quality - 2 * loaded.km * t.costKm,
            offsetCost: (empty.km - loaded.km) * t.costKm,
            max,
          });
        }
      }
    }
    candidates.sort(
      (a, b) =>
        b.margin * b.max - b.offsetCost - (a.margin * a.max - a.offsetCost),
    );
    lanes.push(...candidates.slice(0, 4));
  }
  const constraints: Record<string, { max?: number; min?: number }> = {},
    variables: Record<string, Record<string, number>> = {},
    binaries: Record<string, 1> = {};
  for (const [i, l] of lanes.entries()) {
    l.id = `l${i}`;
    const stock = `stock-${l.stand}-${l.product}`,
      demand = `demand-${l.mill}-${l.product}`;
    constraints[`truck-${l.truck}`] = { max: 1 };
    constraints[stock] = { max: stockAt(produced, l.stand)[l.product] ?? 0 };
    constraints[demand] = {
      max: Math.max(
        0,
        (r.mills.find((m) => m.id === l.mill)!.demand[month(game)][l.product] ??
          0) - (game.deliveries[l.mill]?.[l.product] ?? 0),
      ),
    };
    variables[l.id] = {
      value: l.margin * l.max - l.offsetCost,
      [stock]: l.payload * l.max,
      [demand]: l.payload * l.max,
      [`truck-${l.truck}`]: 1,
    };
    binaries[l.id] = 1;
  }
  const next = structuredClone(game);
  next.plan.trucks = Object.fromEntries(r.trucks.map((t) => [t.id, []]));
  next.cooperation.pooling = false;
  if (lanes.length) {
    const result = solver.Solve({
      optimize: "value",
      opType: "max",
      constraints,
      variables,
      binaries,
      timeout: 2000,
    }) as { feasible: boolean; [key: string]: number | boolean };
    if (!result.feasible)
      throw Error("No feasible dispatch reference was found.");
    for (const l of lanes) {
      const loads = Number(result[l.id] ?? 0) > 0.5 ? l.max : 0;
      if (loads > 0)
        next.plan.trucks[l.truck] = [
          { stand: l.stand, mill: l.mill, product: l.product, loads },
        ];
    }
  }
  next.plan.ready = { purchase: false, production: false, transport: false };
  return {
    game: next,
    report: forecastOutcome(next).report,
    candidates: lanes.length,
  };
}
