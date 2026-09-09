import { describe, it, expect } from "vitest";
import { createGame, draftPlan, advance } from "./engine";
import { quebec } from "../scenarios/quebec";
import {
  siteCandidates,
  queueCandidate,
  rollingForecast,
  productionEfficiency,
} from "./harvest-planning";
describe("Harvest Arena planning lessons", () => {
  it("appends only the remaining hours and preserves existing queue order", () => {
    const g = createGame(quebec);
    g.plan.crews.C1 = [{ stand: "Q01", hours: 40 }];
    const next = queueCandidate(g, "C1", "Q02");
    expect(next.plan.crews.C1.map((o) => o.hours)).toEqual([40, 120]);
    expect(g.plan.crews.C1).toHaveLength(1);
    expect(() => queueCandidate(next, "C1", "Q03")).toThrow("no unassigned");
    expect(() => queueCandidate(g, "C1", "Q11")).toThrow("owned");
  });
  it("filters forecast route information through known disruptions", () => {
    const g = createGame(quebec);
    g.region.disruptions = [
      {
        id: "test",
        title: "Closure",
        description: "Test road closure",
        kind: "road",
        target: "access-Q02",
        week: 1,
        endWeek: 2,
        revealWeek: 1,
        repairCost: 10,
        repairWeeks: 0,
      },
    ];
    const a = siteCandidates(g, "C1", "soft-saw", "M1", 4).find(
      (s) => s.stand.id === "Q02",
    )!;
    expect(a.relocationKm).toBeNull();
    expect(a.windows.slice(0, 2).every((w) => !w.open)).toBe(true);
  });
  it("runs a bounded rolling forecast without changing the campaign or consulting actual future weather", () => {
    const g = draftPlan(createGame(quebec)),
      before = JSON.stringify(g),
      a = rollingForecast(g, 2);
    expect(a.reports).toHaveLength(2);
    expect(a.problem).toBe("");
    expect(JSON.stringify(g)).toBe(before);
    for (const w of Object.values(g.region.weather))
      for (const z of g.region.zones) w.actual[z.id].fill("thaw");
    g.seed = 999;
    expect(rollingForecast(g, 2).reports).toEqual(a.reports);
  }, 20000);
  it("excludes uncertain auctions from every rehearsal week", () => {
    const g = createGame(quebec);
    g.plan.bids.Q21 = 100000;
    const a = rollingForecast(g, 2);
    expect(a.reports.every((h) => Object.keys(h.plan.bids).length === 0)).toBe(
      true,
    );
    expect(
      a.reports.flatMap((h) => h.ledger).some((l) => l.category === "auction"),
    ).toBe(false);
  });
  it("reports relocation intensity only when timber was produced", () => {
    const empty = advance(createGame(quebec));
    expect(productionEfficiency(empty)[0].kmPerThousand).toBeNull();
    const g = advance(draftPlan(createGame(quebec))),
      m = productionEfficiency(g)[0];
    expect(m.kmPerThousand).toBeCloseTo((m.relocation / m.produced) * 1000);
    expect(m.utilization).toBeLessThanOrEqual(100.0001);
  });
});

it('does not recommend a destination whose current assortment demand is already met',()=>{
 const g=createGame(quebec),m=g.region.mills.find(m=>(m.demand[0]['soft-saw']??0)>0)!;
 g.deliveries[m.id]={'soft-saw':m.demand[0]['soft-saw']};
 expect(siteCandidates(g,'C1','soft-saw',m.id,2).every(s=>!s.millCompatible)).toBe(true);
});

it('closes crew access during revealed shutdowns and reopens after repair without leaking hidden events',()=>{
 const g=createGame(quebec);
 const baseline=siteCandidates(g,'C1','soft-saw','',4);
 const site=baseline.find(s=>s.windows.slice(0,2).every(w=>w.open))!;
 expect(site).toBeDefined();
 g.region.disruptions=[{id:'crew-stop',kind:'crew',target:'C1',title:'Crew shutdown',description:'Test',week:1,endWeek:4,revealWeek:1,repairCost:0,repairWeeks:1}];
 let candidate=siteCandidates(g,'C1','soft-saw','',4).find(s=>s.stand.id===site.stand.id)!;
 expect(candidate.windows.every(w=>!w.open)).toBe(true);
 g.eventResponses=[{event:'crew-stop',action:'repair',week:1,restoredWeek:2}];
 candidate=siteCandidates(g,'C1','soft-saw','',4).find(s=>s.stand.id===site.stand.id)!;
 expect(candidate.windows[0].open).toBe(false);
 expect(candidate.windows[1].open).toBe(true);
 g.eventResponses=[];g.region.disruptions[0].revealWeek=2;
 expect(siteCandidates(g,'C1','soft-saw','',4).find(s=>s.stand.id===site.stand.id)!.windows).toEqual(site.windows);
});
