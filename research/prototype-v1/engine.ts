export type Product = "sawlogs" | "pulpwood" | "biomass";
export type Weather = "frozen" | "normal" | "wet" | "thaw";
export type Scenario = "balanced" | "wet-spring" | "dry-summer";
export type Stock = Record<Product, number>;
export interface Stand {
  id: string;
  name: string;
  x: number;
  y: number;
  region: "Highlands" | "Lowlands";
  bearing: number;
  road: number;
  volume: number;
  initial: number;
  mix: Stock;
  rate: number;
  cost: number;
  price: number;
  owned: boolean;
  reserve: boolean;
  stock: Stock;
  improved: boolean;
}
export interface Mill {
  id: string;
  name: string;
  x: number;
  y: number;
  product: Product;
  demand: number;
  price: number;
}
export interface Plan {
  crews: Record<string, string>;
  trucks: Record<string, { stand: string; mill: string }>;
  bids: Record<string, number>;
  retention: number;
}
export interface Result {
  week: number;
  weather: Weather;
  harvested: number;
  delivered: number;
  cost: number;
  revenue: number;
  cash: number;
  emissions: number;
  damage: number;
  crewUse: number;
  truckUse: number;
  messages: string[];
  deliveries: Record<string, number>;
  goalHits: number;
  goalChecks: number;
}
export interface Game {
  version: 1;
  scenario: Scenario;
  week: number;
  cash: number;
  stands: Stand[];
  delivered: Record<string, number>;
  history: Result[];
  plan: Plan;
  upgrades: number;
}
export const products: Product[] = ["sawlogs", "pulpwood", "biomass"];
export const productNames: Record<Product, string> = {
  sawlogs: "Sawlogs",
  pulpwood: "Pulpwood",
  biomass: "Biomass",
};
export const weatherNames: Record<Weather, string> = {
  frozen: "Frozen ground",
  normal: "Normal conditions",
  wet: "Heavy rain",
  thaw: "Spring thaw",
};
export const crews = ["H01", "H02", "H03", "H04"];
export const trucks = ["T01", "T02", "T03", "T04"];
export const mills: Mill[] = [
  {
    id: "pine",
    name: "Pinecrest Sawmill",
    x: 74,
    y: 73,
    product: "sawlogs",
    demand: 4000,
    price: 112,
  },
  {
    id: "river",
    name: "Riverbend Pulp",
    x: 39,
    y: 83,
    product: "pulpwood",
    demand: 2800,
    price: 76,
  },
  {
    id: "bio",
    name: "Valley Bioenergy",
    x: 84,
    y: 38,
    product: "biomass",
    demand: 1200,
    price: 40,
  },
];
const zero = (): Stock => ({ sawlogs: 0, pulpwood: 0, biomass: 0 });
export const total = (s: Stock) => products.reduce((n, p) => n + s[p], 0);
export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 1.6);
export const conditions: Record<Scenario, Weather[]> = {
  balanced: [
    "frozen",
    "frozen",
    "wet",
    "thaw",
    "thaw",
    "wet",
    "normal",
    "normal",
    "wet",
    "normal",
    "normal",
    "frozen",
  ],
  "wet-spring": [
    "wet",
    "thaw",
    "thaw",
    "wet",
    "thaw",
    "wet",
    "wet",
    "normal",
    "wet",
    "wet",
    "normal",
    "normal",
  ],
  "dry-summer": [
    "normal",
    "normal",
    "normal",
    "wet",
    "normal",
    "normal",
    "normal",
    "normal",
    "wet",
    "normal",
    "normal",
    "frozen",
  ],
};
// Synthetic teaching model. Forecasts intentionally differ from revealed conditions.
export function forecast(scenario: Scenario, week: number): Weather {
  const expected = conditions[scenario][Math.min(11, week - 1)];
  return week % 3 === 0 ? "normal" : expected;
}
export function accessible(bearing: number, weather: Weather) {
  return bearing <= { thaw: 1, wet: 2, normal: 3, frozen: 4 }[weather];
}
export function blankPlan(): Plan {
  return { crews: {}, trucks: {}, bids: {}, retention: 10 };
}
export function newGame(scenario: Scenario = "balanced"): Game {
  const names = [
    "Cedar Reach",
    "North Ridge",
    "Spruce Hollow",
    "Bear Creek",
    "Larch Basin",
    "Aspen Bench",
    "Granite Pass",
    "Willow Flats",
    "Pine Crossing",
    "Alder Grove",
    "Fox Hollow",
    "Birch Valley",
    "Eagle Ridge",
    "Elk Meadow",
    "Moss Creek",
    "Old Growth Refuge",
  ];
  const positions = [
    [24, 18],
    [49, 16],
    [69, 20],
    [21, 36],
    [42, 34],
    [66, 40],
    [83, 17],
    [16, 58],
    [36, 53],
    [56, 57],
    [77, 57],
    [25, 73],
    [55, 73],
    [88, 71],
    [47, 44],
    [9, 28],
  ];
  const stands: Stand[] = names.map((name, i) => ({
    id: `S${String(i + 1).padStart(2, "0")}`,
    name,
    x: positions[i][0],
    y: positions[i][1],
    region: i < 7 ? "Highlands" : "Lowlands",
    bearing: [2, 4, 3, 1, 3, 2, 4, 1, 2, 3, 4, 1, 3, 2, 2, 1][i],
    road: [2, 4, 2, 1, 3, 2, 4, 2, 1, 3, 3, 1, 2, 2, 2, 1][i],
    volume: 2400 + (i % 5) * 450,
    initial: 2400 + (i % 5) * 450,
    mix: {
      sawlogs: [0.55, 0.65, 0.4, 0.5][i % 4],
      pulpwood: [0.3, 0.25, 0.4, 0.35][i % 4],
      biomass: [0.15, 0.1, 0.2, 0.15][i % 4],
    },
    rate: 130 + (i % 4) * 20,
    cost: 21 + (i % 3) * 4,
    price: 12 + (i % 4) * 2,
    owned: [0, 2, 3, 7, 8, 11].includes(i),
    reserve: i === 15,
    stock: zero(),
    improved: false,
  }));
  stands[0].stock = { sawlogs: 450, pulpwood: 250, biomass: 100 };
  stands[0].volume -= 800;
  return {
    version: 1,
    scenario,
    week: 1,
    cash: 400000,
    stands,
    delivered: Object.fromEntries(mills.map((m) => [m.id, 0])),
    history: [],
    plan: blankPlan(),
    upgrades: 0,
  };
}
export function projectedStock(g: Game, s: Stand): Stock {
  const stock = { ...s.stock };
  if (!s.owned || s.reserve) return stock;
  const count = Object.values(g.plan.crews).filter((id) => id === s.id).length;
  const remaining = Math.max(
    0,
    s.volume - (s.initial * g.plan.retention) / 100,
  );
  const amount = Math.min(remaining, count * s.rate * 5);
  for (const p of products) stock[p] += amount * s.mix[p];
  return stock;
}
export function validatePlan(g: Game): string[] {
  const e: string[] = [];
  if (g.week > 12)
    e.push("This campaign is complete. Start a new scenario to play again.");
  if (
    !Number.isFinite(g.plan.retention) ||
    g.plan.retention < 0 ||
    g.plan.retention > 30
  )
    e.push("Retention must be between 0% and 30%.");
  for (const [crew, id] of Object.entries(g.plan.crews)) {
    const s = g.stands.find((s) => s.id === id);
    if (!crews.includes(crew) || !s?.owned || s.reserve)
      e.push(`${crew}: choose an owned, non-protected stand.`);
  }
  for (const [truck, a] of Object.entries(g.plan.trucks)) {
    const s = g.stands.find((s) => s.id === a.stand),
      m = mills.find((m) => m.id === a.mill);
    if (!trucks.includes(truck) || !s?.owned || s.reserve || !m)
      e.push(`${truck}: choose a valid stand and mill.`);
  }
  let bids = 0;
  for (const [id, price] of Object.entries(g.plan.bids)) {
    const s = g.stands.find((s) => s.id === id);
    if (!s || s.owned || s.reserve || !Number.isFinite(price) || price <= 0)
      e.push(`${id}: invalid bid.`);
    else bids += price * s.volume;
  }
  if (bids > g.cash)
    e.push(
      "Combined bids exceed available cash. Reduce your bids before advancing.",
    );
  return e;
}
export function simulate(g: Game): Game {
  const errors = validatePlan(g);
  if (errors.length) throw new Error(errors.join(" "));
  const next = structuredClone(g),
    week = g.week,
    weather = conditions[g.scenario][week - 1];
  const r: Result = {
    week,
    weather,
    harvested: 0,
    delivered: 0,
    cost: 0,
    revenue: 0,
    cash: 0,
    emissions: 0,
    damage: 0,
    crewUse: 0,
    truckUse: 0,
    messages: [],
    deliveries: Object.fromEntries(mills.map((m) => [m.id, 0])),
    goalHits: 0,
    goalChecks: 0,
  };
  // Harvest and transport resolve against this week's actual conditions; lots won below are available next week.
  for (const crew of crews) {
    const id = g.plan.crews[crew],
      s = next.stands.find((s) => s.id === id);
    if (!s) continue;
    if (!accessible(s.bearing, weather)) {
      r.messages.push(
        `${crew} idle: ${s.name} terrain is inaccessible in ${weatherNames[weather].toLowerCase()}.`,
      );
      continue;
    }
    const capacity = s.rate * 5,
      amount = Math.min(
        Math.max(0, s.volume - (s.initial * g.plan.retention) / 100),
        capacity,
      );
    s.volume -= amount;
    for (const p of products) s.stock[p] += amount * s.mix[p];
    r.harvested += amount;
    r.cost += amount * s.cost + (amount > 0 ? 900 : 0);
    r.emissions += amount * 2.4;
    r.crewUse += amount / capacity / crews.length;
    // Educational disturbance index, not a field-calibrated measurement.
    r.damage +=
      amount *
      (weather === "wet" ? 0.018 : weather === "thaw" ? 0.03 : 0.003) *
      (1 - g.plan.retention / 100);
  }
  for (const truck of trucks) {
    const a = g.plan.trucks[truck];
    if (!a) continue;
    const s = next.stands.find((s) => s.id === a.stand)!,
      m = mills.find((m) => m.id === a.mill)!;
    if (!accessible(s.improved ? 1 : s.road, weather)) {
      r.messages.push(`${truck} idle: the road from ${s.name} is closed.`);
      continue;
    }
    const km = distance(s, m),
      capacity = Math.floor(1500 / (1 + km / 100)),
      remaining = Math.max(0, m.demand * 1.1 - next.delivered[m.id]);
    const amount = Math.min(s.stock[m.product], capacity, remaining);
    s.stock[m.product] -= amount;
    next.delivered[m.id] += amount;
    r.deliveries[m.id] += amount;
    r.delivered += amount;
    r.cost += amount * (7 + km * 0.12);
    r.revenue += amount * m.price;
    r.emissions += amount * km * 0.045;
    r.truckUse += amount / capacity / trucks.length;
    if (amount === 0)
      r.messages.push(
        `${truck}: no eligible ${productNames[m.product].toLowerCase()} to deliver, or this month's mill capacity is full.`,
      );
  }
  for (const [id, bid] of Object.entries(g.plan.bids)) {
    const s = next.stands.find((s) => s.id === id)!,
      rival = s.price * (1 + ((Number(id.slice(1)) * 7 + week * 3) % 8) / 20);
    if (bid >= rival) {
      s.owned = true;
      r.cost += bid * s.volume;
      r.messages.push(
        `Won ${s.name} at $${bid.toFixed(2)}/m³. Harvesting can start next week.`,
      );
    } else
      r.messages.push(
        `Lost ${s.name}: the winning threshold was $${rival.toFixed(2)}/m³.`,
      );
  }
  r.cost += 7500; // Weekly fixed fleet and administration cost.
  if (week % 4 === 0) {
    for (const m of mills) {
      const ratio = next.delivered[m.id] / m.demand;
      r.goalChecks++;
      if (ratio >= 0.9 && ratio <= 1.1 + 1e-9) {
        const bonus = next.delivered[m.id] * 3;
        r.revenue += bonus;
        r.goalHits++;
        r.messages.push(
          `${m.name}: target achieved; $${Math.round(bonus).toLocaleString()} delivery bonus.`,
        );
      } else {
        const penalty = Math.max(0, m.demand * 0.9 - next.delivered[m.id]) * 12;
        r.cost += penalty;
        r.messages.push(
          `${m.name}: ${Math.round(ratio * 100)}% fulfilled; $${Math.round(penalty).toLocaleString()} shortfall penalty.`,
        );
      }
    }
  }
  next.cash += r.revenue - r.cost;
  r.cash = next.cash;
  if (next.cash < 0)
    r.messages.push(
      "Cash is below zero. This teaching scenario allows an overdraft; reduce costs and improve deliveries.",
    );
  next.history.push(r);
  next.week++;
  if (week % 4 === 0)
    next.delivered = Object.fromEntries(mills.map((m) => [m.id, 0]));
  next.plan = { ...blankPlan(), retention: g.plan.retention };
  return next;
}
export function suggestPlan(g: Game): Plan {
  const p = blankPlan();
  p.retention = g.plan.retention;
  const w = forecast(g.scenario, g.week);
  const options = g.stands
    .filter(
      (s) =>
        s.owned &&
        !s.reserve &&
        s.volume > (s.initial * p.retention) / 100 &&
        accessible(s.bearing, w),
    )
    .sort((a, b) => b.rate - a.rate);
  crews.forEach((c, i) => {
    if (options[i]) p.crews[c] = options[i].id;
  });
  const temp = { ...g, plan: p },
    stocks = Object.fromEntries(
      g.stands.map((s) => [s.id, projectedStock(temp, s)]),
    ),
    remaining = { ...g.delivered };
  for (const truck of trucks) {
    let best:
      | { stand: string; mill: string; score: number; amount: number }
      | undefined;
    for (const s of g.stands.filter(
      (s) => s.owned && !s.reserve && accessible(s.improved ? 1 : s.road, w),
    ))
      for (const m of mills) {
        const amount = Math.min(
          stocks[s.id][m.product],
          Math.floor(1500 / (1 + distance(s, m) / 100)),
          Math.max(0, m.demand - remaining[m.id]),
        );
        const score = amount * (m.price - 7 - distance(s, m) * 0.12);
        if (amount > 0 && (!best || score > best.score))
          best = { stand: s.id, mill: m.id, score, amount };
      }
    if (best) {
      p.trucks[truck] = { stand: best.stand, mill: best.mill };
      stocks[best.stand][mills.find((m) => m.id === best.mill)!.product] -=
        best.amount;
      remaining[best.mill] += best.amount;
    }
  }
  return p;
}
export function upgradeRoad(g: Game, id: string): Game {
  const s = g.stands.find((s) => s.id === id);
  if (g.week > 12 || !s?.owned || s.reserve || s.improved || g.cash < 15000)
    throw new Error("Road improvement is unavailable.");
  const n = structuredClone(g);
  n.stands.find((s) => s.id === id)!.improved = true;
  n.cash -= 15000;
  n.upgrades += 15000;
  return n;
}
export function parseSave(raw: string): Game {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object")
    throw new Error("Invalid save file.");
  const g = value as Game;
  const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  if (
    g.version !== 1 ||
    !Object.keys(conditions).includes(g.scenario) ||
    !Number.isInteger(g.week) ||
    g.week < 1 ||
    g.week > 13 ||
    !finite(g.cash) ||
    !finite(g.upgrades) ||
    !Array.isArray(g.stands) ||
    g.stands.length !== 16 ||
    !Array.isArray(g.history) ||
    g.history.length !== g.week - 1
  )
    throw new Error("This is not a valid Forest Commons save.");
  const initial = newGame(g.scenario);
  for (const [i, s] of g.stands.entries()) {
    const base = initial.stands[i];
    if (
      s.id !== base.id ||
      s.initial !== base.initial ||
      s.name !== base.name ||
      s.x !== base.x ||
      s.y !== base.y ||
      s.rate !== base.rate ||
      s.cost !== base.cost ||
      s.price !== base.price ||
      s.bearing !== base.bearing ||
      s.road !== base.road ||
      s.region !== base.region ||
      s.reserve !== base.reserve ||
      typeof s.owned !== "boolean" ||
      typeof s.improved !== "boolean" ||
      !finite(s.volume) ||
      s.volume < 0 ||
      s.volume > s.initial ||
      products.some(
        (p) =>
          s.mix?.[p] !== base.mix[p] || !finite(s.stock?.[p]) || s.stock[p] < 0,
      )
    )
      throw new Error("Save contains invalid forest data.");
  }
  if (
    !g.plan ||
    !g.plan.crews ||
    !g.plan.trucks ||
    !g.plan.bids ||
    !g.delivered ||
    mills.some((m) => !finite(g.delivered[m.id]) || g.delivered[m.id] < 0)
  )
    throw new Error("Save contains invalid planning data.");
  if (
    g.history.some(
      (r, i) =>
        r.week !== i + 1 ||
        !Object.keys(weatherNames).includes(r.weather) ||
        [
          "harvested",
          "delivered",
          "cost",
          "revenue",
          "cash",
          "emissions",
          "damage",
          "crewUse",
          "truckUse",
          "goalHits",
          "goalChecks",
        ].some((k) => !finite(r[k as keyof Result])) ||
        !Array.isArray(r.messages) ||
        r.messages.some((m) => typeof m !== "string") ||
        !r.deliveries ||
        mills.some((m) => !finite(r.deliveries[m.id])),
    )
  )
    throw new Error("Save contains invalid results.");
  if (
    validatePlan({ ...g, week: Math.min(12, g.week) }).filter(
      (e) => !e.startsWith("Combined bids"),
    ).length
  )
    throw new Error("Save contains an invalid plan.");
  return g;
}
