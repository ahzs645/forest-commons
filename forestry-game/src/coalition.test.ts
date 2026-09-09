import { describe, it, expect } from "vitest";
import { allocate, cost, savings, stability, companies } from "./coalition";
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

it('allocates total costs by handout volume and exposes companies that lose',()=>{
 const members=['1','2','3','4'],shares=allocate(members,'volume',4);
 expect(members.reduce((n,c)=>n+shares[c],0)).toBeCloseTo(savings(members,4));
 expect(cost(['3'],4)-shares['3']).toBeCloseTo(32000*232100/700000);
 expect(shares['3']).toBeLessThan(0);
 expect(stability(members,shares,4).some(p=>p.members.join('')==='3')).toBe(true);
});
