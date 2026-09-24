import { harvestAuthorizationProblem, stumpageCost, obligationRateM3 } from "./tenure";
import {buckingProfile,recoveredMix} from './bucking';
import { operatingRegion, activeDisruptions } from "./disruptions";
import { weatherAt } from "./routing";
import type { Game, Weather } from "./types";
import { month } from "./engine";
import { route, canAccess } from "./routing";
export function appraise(game: Game, id: string, price?: number, bucking?:string) {
  const r = operatingRegion(game),
    stand = r.stands.find((s) => s.id === id)!;
  const profile=buckingProfile(r,bucking),mix=recoveredMix(r,stand.mix,bucking);
  const state = game.stands.find((s) => s.id === id)!;
  const eligible = Math.max(
      0,
      state.remaining - stand.volume * game.plan.retention,
    ),
    purchase = (price ?? stand.askingPrice) * (!r.bcTenure && r.economy.timberPayment === "harvest-royalty" ? eligible / Math.max(stand.volume,1e-9) : 1);
  const authorizationProblem = state.owned ? harvestAuthorizationProblem(game, id) : null;
  const stumpage = stumpageCost(r, id, Object.fromEntries(Object.entries(mix).map(([p, share]) => [p, share * eligible])));
  const obligations = obligationRateM3(game, id) * eligible;
  // Value the lot as if its own access road were authorized: a buyer applies
  // for it after acquiring the lot, so it is not usable before purchase.
  const access = game.region.roads.edges.find((e) => e.id === `access-${id}`);
  const operating = access && !r.roads.edges.some((e) => e.id === access.id) &&
    !activeDisruptions(game).some((x) => x.kind === "road" && x.target === access.id)
    ? { ...r, roads: { ...r.roads, edges: [...r.roads.edges, access] } } : r;
  const cases: Weather[] = ["frozen", "normal", "wet", "thaw"];
  const casesResult = cases.map((weather) => {
    const w = Object.fromEntries(r.zones.map((z) => [z.id, weather])),
      terrain = !authorizationProblem && canAccess(stand.terrain, weather),
      factor = weather === "wet" ? 0.8 : weather === "thaw" ? 0.65 : 1;
    const crewRate =
      r.crews.reduce((n, c) => n + c.hourlyCost / c.productivityFactor, 0) /
      r.crews.length;
    const costPerM3 =
      stand.harvestCost * profile.cost + crewRate / (stand.productivity * profile.productivity * factor) + (eligible ? (stumpage + obligations) / eligible : 0);
    const products = r.products.map((p) => {
      const volume = eligible * (mix[p.id] ?? 0);
      const offers = r.mills
        .filter((m) => p.id in m.prices)
        .flatMap((m) => {
          const path = route(operating, stand.node, m.node, w, game.improvedRoads);
          const haul = path
            ? r.trucks.reduce(
                (n, t) => n + (2 * path.km * t.costKm) / t.payload,
                0,
              ) / r.trucks.length
            : Infinity;
          const demand =
            m.demand
              .slice(month(game))
              .reduce((n, d) => n + (d[p.id] ?? 0), 0) -
            (game.deliveries[m.id]?.[p.id] ?? 0);
          const ordinary = {
            mill: m.id,
            margin: m.prices[p.id] - haul - costPerM3,
            demand: Math.max(0, demand),
            km: path?.km ?? null,
          };
          return [ordinary,
            ...(m.spotPrices?.[p.id]!==undefined?[{...ordinary,margin:m.spotPrices[p.id]-haul-costPerM3,demand:volume}]:[]),
            ...(r.offtakeOffers??[]).filter(o=>o.mill===m.id&&o.product===p.id&&game.offtake?.[o.id]&&!game.offtake[o.id].settled&&game.week<=o.deadline).map(o=>({...ordinary,margin:o.priceM3-haul-costPerM3,demand:Math.max(0,o.volume-game.offtake![o.id].delivered)}))];
        })
        .filter((o) => o.km !== null)
        .sort((a, b) => b.margin - a.margin);
      let left = volume,
        capped = 0,
        sold = 0;
      for (const o of offers) {
        if (o.margin <= 0) continue;
        const n = Math.min(left, o.demand);
        capped += n * o.margin;
        sold += n;
        left -= n;
      }
      return {
        id: p.id,
        name: p.name,
        volume,
        unlimited: offers.length ? volume * offers[0].margin : 0,
        capped: terrain ? capped : 0,
        sold: terrain ? sold : 0,
        offers,
      };
    });
    return {
      weather,
      terrain,
      products,
      unlimited: terrain
        ? products.reduce((n, p) => n + p.unlimited, 0) - purchase
        : -purchase,
      capped: products.reduce((n, p) => n + p.capped, 0) - purchase,
      unsold: eligible - products.reduce((n, p) => n + p.sold, 0),
    };
  });
  return {
    eligible,
    purchase,
    stumpage,
    obligations,
    authorizationProblem,
    cases: casesResult,
    min: Math.min(...casesResult.map((c) => c.capped)),
    max: Math.max(...casesResult.map((c) => c.capped)),
  };
}
export function bidRisk(
  game: Game,
  id: string,
  bid: number,
  weather: Weather,
  exposure: number,
) {
  const stand = game.region.stands.find((s) => s.id === id)!,
    estimate = appraise(game, id, bid).cases.find(
      (c) => c.weather === weather,
    )!;
  const samples = Array.from({ length: 101 }, (_, i) => {
    const rival = stand.askingPrice * (0.86 + (0.35 * i) / 100),
      wins = bid > rival;
    return {
      wins,
      profit: wins ? estimate.capped : 0,
      supply: wins ? estimate.products.reduce((n, p) => n + p.sold, 0) : 0,
    };
  });
  const mean = samples.reduce((n, s) => n + s.profit, 0) / samples.length,
    downside = Math.min(...samples.map((s) => s.profit));
  return {
    winPercent: (100 * samples.filter((s) => s.wins).length) / samples.length,
    mean,
    worst: downside,
    score: mean - exposure * Math.max(0, -downside),
    supply: samples.reduce((n, s) => n + s.supply, 0) / samples.length,
  };
}

// Published forecast windows only. Auction stock is unavailable until the week after settlement.
export function procurementWindows(game: Game, id: string) {
  const stand = game.region.stands.find((s) => s.id === id)!,
    state = game.stands.find((s) => s.id === id)!;
  if (
    stand.supply === "protected" ||
    state.refused ||
    (!state.owned &&
      stand.supply === "auction" &&
      stand.auctionWeek < game.week)
  )
    return [];
  const first =
    state.owned || stand.supply === "private"
      ? game.week
      : stand.supply === "auction"
        ? Math.max(game.week, stand.auctionWeek + 1)
        : game.week;
  return Array.from(
    { length: Math.max(0, game.region.weeks - first + 1) },
    (_, i) => first + i,
  ).map((week) => {
    const r = operatingRegion(game, true, week),
      weather = weatherAt(game, true, week),
      terrain = !(state.owned && harvestAuthorizationProblem({...game, week}, id)) && canAccess(stand.terrain, weather[stand.zone]);
    const destinations = r.mills
      .filter(
        (m) =>
          !activeDisruptions(game, true, week).some(
            (e) => e.kind === "mill" && e.target === m.id,
          ) &&
          r.products.some(
            (p) =>
              (stand.mix[p.id] ?? 0) > 0 &&
              (m.demand[Math.floor((week - 1) / r.weeksPerMonth)][p.id] ?? 0) >
                0,
          ) &&
          route(r, stand.node, m.node, weather, game.improvedRoads),
      )
      .map((m) => m.id);
    return { week, weather: weather[stand.zone], terrain, destinations };
  });
}
