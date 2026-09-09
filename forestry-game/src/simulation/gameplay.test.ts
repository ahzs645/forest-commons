import { describe, it, expect } from "vitest";
import { quebec } from "../scenarios/quebec";
import { advance, createGame, sum } from "./engine";
import { forecastOutcome, learningProgress } from "./planning";
import { propose, respond } from "./negotiation";
import { parseGame } from "./validation";
describe("Strategy and learning mechanics", () => {
  it("applies thinning productivity and a cumulative retention floor across crews and weeks", () => {
    let g = createGame(quebec);
    const d = quebec.stands[1];
    for (const c of quebec.crews)
      g.plan.crews[c.id] = [
        { stand: d.id, hours: c.hours, treatment: "thinning" },
      ];
    g = advance(g);
    expect(g.stands[1].remaining).toBeCloseTo(d.volume * 0.65);
    expect(sum(g.history[0].harvested)).toBeCloseTo(d.volume * 0.35);
    g.plan.crews.C1 = [{ stand: d.id, hours: 160, treatment: "thinning" }];
    g = advance(g);
    expect(sum(g.history[1].harvested)).toBe(0);
    g.plan.crews.C1 = [{ stand: d.id, hours: 160, treatment: "final" }];
    g = advance(g);
    expect(sum(g.history[2].harvested)).toBeGreaterThan(0);
    expect(g.stands[1].remaining).toBeGreaterThanOrEqual(d.volume * 0.1);
  });
  it("slows a thinning crew while reducing modelled disturbance", () => {
    const final = createGame(quebec);
    final.plan.crews.C1 = [{ stand: "Q02", hours: 160 }];
    const thin = structuredClone(final);
    thin.plan.crews.C1[0].treatment = "thinning";
    const f = advance(final).history[0],
      t = advance(thin).history[0];
    expect(sum(t.harvested) / sum(f.harvested)).toBeCloseTo(0.72);
    expect(t.disturbance).toBeLessThan(f.disturbance);
  });
  it("rehearses the forecast without altering campaign state or using actual weather", () => {
    const g = createGame(quebec);
    g.region.weather[g.weatherId].actual.north[0] = "thaw";
    g.region.weather[g.weatherId].forecast.north[0] = "frozen";
    g.plan.crews.C1 = [{ stand: "Q01", hours: 160 }];
    const before = JSON.stringify(g),
      preview = forecastOutcome(g);
    expect(preview.report!.weather.north).toBe("frozen");
    expect(sum(preview.report!.harvested)).toBeGreaterThan(0);
    expect(JSON.stringify(g)).toBe(before);
    expect(sum(advance(g).history[0].harvested)).toBe(0);
  });
  it("waits for settled data before evaluating service and waste objectives", () => {
    const g = createGame(quebec),
      progress = learningProgress(g);
    expect(progress.find((o) => o.metric === "service")!.value).toBeNull();
    expect(progress.find((o) => o.metric === "waste")!.met).toBe(false);
    expect(progress.every((o) => !o.final)).toBe(true);
  });
  it("freezes proposals and requires every company acceptance", () => {
    let g = propose(createGame(quebec));
    const shares = structuredClone(g.negotiation.offers![0].shares);
    g.negotiation.custom = { "1": -999 };
    for (let i = 1; i <= 4; i++) g = respond(g, 1, String(i), true);
    expect(g.negotiation.offers![0].status).toBe("proposed");
    g = respond(g, 1, "5", true);
    expect(g.negotiation.offers![0].status).toBe("agreed");
    expect(g.negotiation.offers![0].shares).toEqual(shares);
    expect(parseGame(JSON.stringify(g)).negotiation.offers).toEqual(
      g.negotiation.offers,
    );
    expect(() => respond(g, 1, "1", false)).toThrow();
  });
  it("rejects unbalanced offers and records rejections and superseded offers", () => {
    let g = createGame(quebec);
    g.negotiation.custom = { "1": 0 };
    expect(() => propose(g)).toThrow("exactly");
    g = propose(createGame(quebec));
    g = propose(g);
    expect(g.negotiation.offers![0].status).toBe("superseded");
    g = respond(g, 2, "2", false);
    expect(g.negotiation.offers![1].status).toBe("rejected");
  });
});
