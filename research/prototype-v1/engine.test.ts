import { describe, it, expect } from "vitest";
import {
  accessible,
  blankPlan,
  crews,
  mills,
  newGame,
  parseSave,
  products,
  simulate,
  suggestPlan,
  total,
  upgradeRoad,
  validatePlan,
} from "./engine";
import { allocate, companies, cost, savings, stability } from "./coalition";

describe("forest operating simulation", () => {
  it("conserves every cubic metre through a full campaign", () => {
    let g = newGame();
    const initial = g.stands.reduce((n, s) => n + s.volume + total(s.stock), 0);
    for (let week = 1; week <= 12; week++) {
      g.plan = suggestPlan(g);
      g = simulate(g);
      const standing = g.stands.reduce((n, s) => n + s.volume, 0),
        stock = g.stands.reduce((n, s) => n + total(s.stock), 0),
        delivered = g.history.reduce((n, r) => n + r.delivered, 0);
      expect(standing + stock + delivered).toBeCloseTo(initial, 6);
      for (const s of g.stands) {
        expect(s.volume).toBeGreaterThanOrEqual(0);
        products.forEach((p) =>
          expect(s.stock[p]).toBeGreaterThanOrEqual(-1e-8),
        );
      }
      expect(g.history.at(-1)!.crewUse).toBeLessThanOrEqual(1);
      expect(g.history.at(-1)!.truckUse).toBeLessThanOrEqual(1);
    }
    expect(g.week).toBe(13);
    expect(() => simulate(g)).toThrow("complete");
  });
  it("allows harvest this week to enter this week’s truck loads", () => {
    const g = newGame();
    g.stands.forEach(
      (s) => (s.stock = { sawlogs: 0, pulpwood: 0, biomass: 0 }),
    );
    g.plan.crews.H01 = "S01";
    g.plan.trucks.T01 = { stand: "S01", mill: "pine" };
    const n = simulate(g);
    expect(n.history[0].delivered).toBeGreaterThan(0);
    expect(n.history[0].delivered).toBeLessThanOrEqual(n.history[0].harvested);
  });
  it("never double-counts stock shared by trucks", () => {
    const g = newGame();
    for (const t of ["T01", "T02", "T03", "T04"])
      g.plan.trucks[t] = { stand: "S01", mill: "pine" };
    const n = simulate(g);
    expect(n.history[0].delivered).toBeCloseTo(450);
    expect(n.stands[0].stock.sawlogs).toBe(0);
  });
  it("caps shared-stand crews at retention floor", () => {
    const g = newGame();
    for (const c of crews) g.plan.crews[c] = "S01";
    g.plan.retention = 30;
    const n = simulate(g);
    expect(n.stands[0].volume).toBeCloseTo(g.stands[0].initial * 0.3);
    expect(n.history[0].harvested).toBeCloseTo(880);
  });
  it("distinguishes road and terrain access", () => {
    let g = newGame("wet-spring");
    g.stands[1].owned = true;
    g.plan.crews.H01 = "S02";
    g.stands[1].stock.sawlogs = 500;
    g.plan.trucks.T01 = { stand: "S02", mill: "pine" };
    g = upgradeRoad(g, "S02");
    const n = simulate(g);
    expect(n.history[0].harvested).toBe(0);
    expect(n.history[0].delivered).toBeGreaterThan(0);
    expect(n.history[0].messages.join(" ")).toContain("terrain");
    expect(accessible(4, "thaw")).toBe(false);
  });
  it("settles auctions once and makes timber available next week", () => {
    const g = newGame();
    g.plan.bids.S02 = 30;
    const before = g.stands[1].volume;
    const n = simulate(g);
    expect(n.stands[1].owned).toBe(true);
    expect(n.stands[1].volume).toBe(before);
    expect(n.cash).toBe(400000 - before * 30 - 7500);
    expect(n.plan.bids).toEqual({});
    expect(g.stands[1].owned).toBe(false);
  });
  it("rejects protected stands and unaffordable bids", () => {
    const g = newGame();
    g.plan.crews.H01 = "S16";
    expect(validatePlan(g).join()).toContain("non-protected");
    g.plan = blankPlan();
    g.plan.bids.S02 = 10000;
    expect(() => simulate(g)).toThrow("exceed");
  });
  it("pays monthly bonuses and resets monthly deliveries", () => {
    const g = newGame();
    g.week = 4;
    for (const m of mills) g.delivered[m.id] = m.demand;
    const n = simulate(g);
    expect(n.history[0].goalHits).toBe(3);
    expect(n.history[0].revenue).toBe(24000);
    expect(Object.values(n.delivered)).toEqual([0, 0, 0]);
  });
  it("applies shortfall penalties at month-end only", () => {
    let g = newGame();
    g = simulate(g);
    expect(g.history[0].cost).toBe(7500);
    g.week = 4;
    g = simulate(g);
    expect(g.history.at(-1)!.cost).toBe(7500 + 8000 * 0.9 * 12);
  });
  it("roundtrips a complete save and rejects malformed saves", () => {
    let g = newGame();
    for (let i = 0; i < 12; i++) {
      g.plan = suggestPlan(g);
      g = simulate(g);
    }
    expect(parseSave(JSON.stringify(g))).toEqual(g);
    expect(() => parseSave("{}")).toThrow();
    const bad = structuredClone(g);
    bad.stands[0].volume = -1;
    expect(() => parseSave(JSON.stringify(bad))).toThrow("forest data");
    expect(() => parseSave("null")).toThrow();
  });
  it("reconciles cash including road improvements", () => {
    let g = upgradeRoad(newGame(), "S01");
    for (let i = 0; i < 4; i++) {
      g.plan = suggestPlan(g);
      g = simulate(g);
    }
    expect(g.cash).toBeCloseTo(
      400000 -
        g.upgrades +
        g.history.reduce((n, r) => n + r.revenue - r.cost, 0),
      6,
    );
  });
});
describe("coalition source data and allocation", () => {
  it("corrects the source grand-total arithmetic", () => {
    expect(companies.reduce((n, c) => n + cost([c]), 0)).toBe(38680);
    expect(cost(companies)).toBe(35690);
    expect(savings(companies)).toBe(2990);
  });
  it("allocates all savings exactly for every coalition and method", () => {
    for (const count of [4, 5] as const)
      for (let mask = 1; mask < 2 ** count; mask++) {
        const members = companies
          .slice(0, count)
          .filter((_, i) => mask & (1 << i));
        for (const method of ["equal", "proportional", "shapley"] as const) {
          const a = allocate(members, method, count);
          expect(Object.values(a).reduce((a, b) => a + b, 0)).toBeCloseTo(
            savings(members, count),
            6,
          );
        }
      }
  });
  it("identifies profitable breakaways rather than assuming fairness", () => {
    const equal = allocate(companies, "equal");
    const problems = stability(companies, equal);
    expect(problems.some((p) => p.members.join("") === "25")).toBe(false);
    expect(problems.length).toBeGreaterThan(0);
    for (const p of problems)
      expect(
        savings(p.members) - p.members.reduce((n, c) => n + equal[c], 0),
      ).toBeCloseTo(p.gap);
  });
});
