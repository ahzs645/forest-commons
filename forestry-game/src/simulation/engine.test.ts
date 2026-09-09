import { describe, it, expect } from "vitest";
import { quebec } from "../scenarios/quebec";
import {
  advance,
  createGame,
  draftPlan,
  improveRoad,
  purchase,
  refuse,
  sum,
  stockAt,
  planProblems,
} from "./engine";
import { route, weatherAt } from "./routing";
import { parseGame, validateRegion } from "./validation";
import type { Game } from "./types";
const mass = (g: Game) => {
  const original = g.region.stands.reduce((n, s) => n + s.volume, 0),
    standing = g.stands.reduce((n, s) => n + s.remaining, 0),
    roadside = g.stands.reduce((n, s) => n + sum(stockAt(g, s.id)), 0),
    delivered = g.history.reduce((n, h) => n + sum(h.delivered), 0),
    waste = g.history.reduce((n, h) => n + h.waste, 0);
  expect(standing + roadside + delivered + waste).toBeCloseTo(original, 5);
  expect(g.cash).toBeCloseTo(
    g.region.economy.startingCash +
      g.history.flatMap((h) => h.ledger).reduce((n, e) => n + e.amount, 0) +
      g.instantLedger.reduce((n, e) => n + e.amount, 0),
    5,
  );
};
describe("Regional simulation", () => {
  it("validates the Quebec region with five assortments and real connected roads", () => {
    expect(validateRegion(quebec).products).toHaveLength(5);
    expect(quebec.stands).toHaveLength(32);
    const g = createGame(quebec),
      p = route(quebec, "t0", "t4", weatherAt(g))!;
    expect(p.km).toBeGreaterThan(80);
    expect(p.path.length).toBeGreaterThan(100);
  });
  it.each(Object.keys(quebec.weather))(
    "finishes a balanced campaign through %s with stock and money conserved",
    (weather) => {
      let g = createGame(quebec, weather, 47);
      for (let i = 0; i < 12; i++) {
        g = advance(draftPlan(g));
        mass(g);
        expect(
          g.history
            .at(-1)!
            .movements.every((m) => Number.isFinite(m.hours) && m.hours >= 0),
        ).toBe(true);
        g = parseGame(JSON.stringify(g));
      }
      expect(g.week).toBe(13);
      expect(
        g.history.reduce((n, h) => n + sum(h.delivered), 0),
      ).toBeGreaterThan(10000);
      expect(() => advance(g)).toThrow("complete");
      console.log(weather, {
        cash: Math.round(g.cash),
        delivered: Math.round(
          g.history.reduce((n, h) => n + sum(h.delivered), 0),
        ),
        waste: Math.round(g.history.reduce((n, h) => n + h.waste, 0)),
      });
    },
    300000, // Full geographic save/reload campaigns can be slow on a busy shared host.
  );
  it("supports a renamed region with a different assortment and a shorter calendar without place-specific rules", () => {
    const r = structuredClone(quebec);
    r.id = "test-region";
    const oldProduct = "soft-saw",
      newProduct = "regional-log";
    r.products.find((p) => p.id === oldProduct)!.id = newProduct;
    const renameProduct = (stock: Record<string, number>) => {
      if (oldProduct in stock) {
        stock[newProduct] = stock[oldProduct];
        delete stock[oldProduct];
      }
    };
    // Region-authored recovery rules use the same portable product IDs.
    Object.values(r.buckingProfiles ?? {}).forEach(profile => {
      if (profile.recovery[oldProduct]) {
        profile.recovery[newProduct] = profile.recovery[oldProduct];
        delete profile.recovery[oldProduct];
      }
      Object.values(profile.recovery).forEach(renameProduct);
    });
    r.stands.forEach((s) => renameProduct(s.mix));
    r.mills.forEach((m) => {
      renameProduct(m.prices);
      m.demand.forEach(renameProduct);
    });

    r.name = "Portable region";
    r.weeks = 4;
    r.disruptions = (r.disruptions ?? []).filter(e => e.week <= r.weeks).map(e => ({...e, endWeek: Math.min(e.endWeek, r.weeks)}));
    r.partnerJobs = (r.partnerJobs ?? []).map(j => ({...j, product: j.product === oldProduct ? newProduct : j.product, deadline: Math.min(j.deadline, r.weeks)}));
    r.stands.forEach((s) => (s.auctionWeek = Math.min(4, s.auctionWeek)));
    r.mills.forEach((m) => (m.demand = m.demand.slice(0, 1)));
    Object.values(r.weather).forEach((w) => {
      for (const z of r.zones) {
        w.actual[z.id] = w.actual[z.id].slice(0, 4);
        w.forecast[z.id] = w.forecast[z.id].slice(0, 4);
      }
    });
    let g = createGame(validateRegion(r));
    for (let i = 0; i < 4; i++) g = advance(draftPlan(g));
    expect(g.week).toBe(5);
    expect(g.history.some((h) => (h.delivered[newProduct] ?? 0) > 0)).toBe(
      true,
    );
    mass(g);
  }, 60000); // Four geographic weeks can exceed the default five seconds on a busy host.
  it("runs identical seeded plans reproducibly", () => {
    const g = draftPlan(createGame(quebec));
    expect(advance(g)).toEqual(advance(g));
  });
  it("settles private purchases immediately and records the cash only once", () => {
    let g = createGame(quebec);
    const lot = quebec.stands.find((s) => s.supply === "private")!;
    g = purchase(g, lot.id);
    expect(g.stands.find((s) => s.id === lot.id)?.owned).toBe(true);
    expect(g.cash).toBe(quebec.economy.startingCash - lot.askingPrice);
    g = advance(g);
    mass(g);
  });
  it("awards auction timber after production, then permits one-week refusal with guarantee", () => {
    let g = createGame(quebec);
    const lot = quebec.stands.find(
      (s) => s.supply === "auction" && s.auctionWeek === 1,
    )!;
    g.plan.bids[lot.id] = lot.askingPrice * 1.5;
    g.plan.crews.C1 = [{ stand: lot.id, hours: 160 }];
    g = advance(g);
    const won = g.stands.find((s) => s.id === lot.id)!;
    expect(won.owned).toBe(true);
    expect(won.harvested).toBe(0);
    const before = g.cash;
    g = refuse(g, lot.id);
    expect(g.cash - before).toBeCloseTo(won.purchasePaid * 0.9);
    expect(() => refuse(g, lot.id)).toThrow();
    mass(g);
  });
  it("does not charge losing bids and respects budget commitments", () => {
    let g = createGame(quebec);
    const lot = quebec.stands.find(
      (s) => s.supply === "auction" && s.auctionWeek === 1,
    )!;
    g.plan.bids[lot.id] = 1;
    g = advance(g);
    expect(g.history[0].ledger.some((e) => e.category === "auction")).toBe(
      false,
    );
    g = createGame(quebec);
    g.plan.bids[lot.id] = g.cash + 1;
    expect(() => advance(g)).toThrow("commitments");
  });
  it("routes closure and upgrades independently from terrain bearing", () => {
    const g = createGame(quebec),
      edge = quebec.roads.edges.find((e) => e.bearing === 3)!;
    const w = { north: "thaw", south: "thaw" } as const;
    expect(route(quebec, edge.from, edge.to, w)).toBeNull();
    const improved = improveRoad(g, edge.id);
    expect(
      route(quebec, edge.from, edge.to, w, improved.improvedRoads),
    ).not.toBeNull();
    expect(() => improveRoad(improved, edge.id)).toThrow();
    mass(improved);
  });
  it("shares finite standing stock between crews and never crosses retention", () => {
    let g = createGame(quebec);
    const s = g.stands[1],
      d = quebec.stands[1];
    s.remaining = d.volume * 0.1 + 50;
    s.harvested = d.volume - s.remaining;
    s.stock = [
      { product: "soft-pulp", volume: s.harvested, week: 1, quality: 1 },
    ];
    for (const c of quebec.crews)
      g.plan.crews[c.id] = [{ stand: s.id, hours: 160 }];
    g = advance(g);
    expect(g.stands[1].remaining).toBeCloseTo(d.volume * 0.1);
    expect(sum(g.history[0].harvested)).toBeCloseTo(50);
    mass(g);
  });
  it("limits truck shipments to shared stock, hours, payload and remaining demand", () => {
    let g = createGame(quebec);
    const s = g.stands[1];
    s.remaining -= 70;
    s.harvested = 70;
    s.stock = [{ product: "soft-saw", volume: 70, week: 1, quality: 1 }];
    for (const t of quebec.trucks)
      g.plan.trucks[t.id] = [
        { stand: s.id, mill: "M1", product: "soft-saw", loads: 100 },
      ];
    g = advance(g);
    expect(sum(g.history[0].delivered)).toBeCloseTo(70);
    for (const t of quebec.trucks)
      expect(g.history[0].truckHours[t.id]).toBeLessThanOrEqual(t.hours);
    mass(g);
  });
  it("ages sawlogs into pulp then explicit waste with mass conserved", () => {
    let g = createGame(quebec);
    const s = g.stands[1];
    s.remaining -= 100;
    s.harvested = 100;
    s.stock = [{ product: "soft-saw", volume: 100, week: 1, quality: 1 }];
    for (let i = 0; i < 8; i++) g = advance(g);
    expect(g.history.reduce((n, h) => n + h.degraded, 0)).toBe(100);
    expect(g.history.reduce((n, h) => n + h.waste, 0)).toBe(100);
    mass(g);
  });
  it("does not pay cooperation credit without an explicit freight job", () => {
    const g = draftPlan(createGame(quebec)),
      solo = advance(g);
    g.cooperation.pooling = true;
    const pooled = advance(g);
    expect(pooled.history[0].movements).toEqual(solo.history[0].movements);
    expect(pooled.history[0].emissions).toBe(solo.history[0].emissions);
    expect(pooled.cash).toBe(solo.cash);
    mass(pooled);
  });
  it("requires role readiness and rejects invalid orders", () => {
    const g = createGame(quebec);
    g.roleMode = true;
    expect(() => advance(g)).toThrow("roles");
    g.plan.ready = { purchase: true, production: true, transport: true };
    expect(planProblems(g)).toEqual([]);
    g.plan.crews.C1 = [{ stand: "Q01", hours: 161 }];
    expect(() => advance(g)).toThrow("capacity");
  });
  it("rejects malformed regions, disconnected graphs, degradation cycles and corrupt saves", () => {
    const r = structuredClone(quebec);
    r.roads.edges = [];
    expect(() => validateRegion(r)).toThrow();
    const cycle = structuredClone(quebec);
    cycle.products[0].downgradeTo = cycle.products[0].id;
    expect(() => validateRegion(cycle)).toThrow("circular");
    const g = createGame(quebec);
    g.stands[0].remaining = -1;
    expect(() => parseGame(JSON.stringify(g))).toThrow("Invalid save");
    expect(() => parseGame('{"version":1}')).toThrow("cannot be migrated");
  });
});

describe("Commitment settlement and persisted negotiation", () => {
  it("locks commitments during the month and opens the next month", () => {
    let g = advance(createGame(quebec));
    g.plan.targets.M1["soft-saw"] = 0;
    expect(() => advance(g)).toThrow("locked");
    g = createGame(quebec);
    for (let i = 0; i < 4; i++) g = advance(g);
    g.plan.targets.M1["soft-saw"] = 0;
    expect(planProblems(g)).toEqual([]);
  });
  it("settles bonuses at the tolerance boundary and shortfall penalties only at month end", () => {
    let g = createGame(quebec);
    for (let i = 0; i < 3; i++) {
      g = advance(g);
      expect(
        g.history.at(-1)!.ledger.some((e) => e.category === "target"),
      ).toBe(false);
    }
    g.deliveries.M1 = { "soft-saw": 3150 };
    g = advance(g);
    expect(
      g.history
        .at(-1)!
        .ledger.some(
          (e) => e.category === "target" && e.description.includes("M1"),
        ),
    ).toBe(false);
    expect(
      g.history
        .at(-1)!
        .ledger.some((e) => e.category === "target" && e.amount === 9450),
    ).toBe(true);
    expect(
      g.history
        .at(-1)!
        .ledger.some((e) => e.category === "target" && e.amount < 0),
    ).toBe(true);
    expect(g.deliveries).toEqual({});
  });
  it("persists partition membership and negotiated allocations in campaign exports", () => {
    const g = createGame(quebec);
    g.negotiation.groups = [1, 1, 2, 2, 3];
    g.negotiation.custom = { "1": 100, "2": 200 };
    expect(parseGame(JSON.stringify(g)).negotiation).toEqual(g.negotiation);
  });
  it("rejects corrupted cash, historical metrics and unexpected entity keys", () => {
    let g = advance(createGame(quebec));
    g.cash += 100;
    expect(() => parseGame(JSON.stringify(g))).toThrow();
    g = advance(createGame(quebec));
    delete (g.history[0] as Partial<(typeof g.history)[0]>).waste;
    expect(() => parseGame(JSON.stringify(g))).toThrow();
    const r = structuredClone(quebec);
    r.products[0].id = "__proto__";
    expect(() => validateRegion(r)).toThrow();
  });
});

describe("Imported campaign editing", () => {
  it("rejects missing mill targets and duplicate historical stands", () => {
    const missing = createGame(quebec);
    delete missing.plan.targets.M1;
    expect(() => parseGame(JSON.stringify(missing))).toThrow("Invalid save");
    const duplicate = advance(createGame(quebec));
    duplicate.history[0].snapshot!.stands[1] = structuredClone(
      duplicate.history[0].snapshot!.stands[0],
    );
    expect(() => parseGame(JSON.stringify(duplicate))).toThrow("Invalid save");
  });
  it("keeps equal commitments locked by value regardless of JSON key order", () => {
    const g = advance(createGame(quebec));
    g.plan.targets = Object.fromEntries(
      Object.entries(g.plan.targets)
        .reverse()
        .map(([id, stock]) => [
          id,
          Object.fromEntries(Object.entries(stock).reverse()),
        ]),
    );
    expect(planProblems(g)).toEqual([]);
    g.plan.targets.M1["soft-saw"] -= 1;
    expect(planProblems(g)).toContain(
      "Monthly commitments are locked until the next month.",
    );
  });
});
