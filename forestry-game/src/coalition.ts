import {nucleolus} from './nucleolus';
import { companyProfiles } from "./company-profiles";
import { equalProfit } from "./epm";
import data from "./coalition-data.json";
export type Method = "equal" | "proportional" | "shapley" | "epm" | "volume" | "nucleolus";
export const companies = ["1", "2", "3", "4", "5"];
export const key = (members: string[]) => [...members].sort().join("");
export function cost(members: string[], count: 4 | 5 = 5): number {
  if (!members.length) return 0;
  const table = data[String(count) as "4" | "5"] as Record<string, number>;
  const v = table[key(members)];
  if (v === undefined) throw new Error("Unknown coalition");
  return v;
}
export const savings = (members: string[], count: 4 | 5 = 5) =>
  members.reduce((n, c) => n + cost([c], count), 0) - cost(members, count);
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
export function allocate(
  members: string[],
  method: Method,
  count: 4 | 5 = 5,
): Record<string, number> {
  if (method === "nucleolus") return nucleolus(members, s=>savings(s,count));
  if (method === "epm") return equalProfit(members, (m) => cost(m, count));
  if (method === "volume") {
    const volume = members.reduce(
      (n, c) => n + companyProfiles[count][c].volume,
      0,
    );
    return Object.fromEntries(
      members.map((c) => [
        c,
        cost([c], count) -
          (cost(members, count) * companyProfiles[count][c].volume) / volume,
      ]),
    );
  }
  const total = savings(members, count),
    base = members.reduce((n, c) => n + cost([c], count), 0);
  return Object.fromEntries(
    members.map((c) => {
      if (method === "equal") return [c, total / members.length];
      if (method === "proportional")
        return [c, (total * cost([c], count)) / base];
      const others = members.filter((v) => v !== c);
      let share = 0;
      for (let mask = 0; mask < 2 ** others.length; mask++) {
        const subset = others.filter((_, i) => mask & (1 << i));
        const weight =
          (factorial(subset.length) *
            factorial(members.length - subset.length - 1)) /
          factorial(members.length);
        share +=
          weight * (savings([...subset, c], count) - savings(subset, count));
      }
      return [c, share];
    }),
  );
}
export function stability(
  members: string[],
  shares: Record<string, number>,
  count: 4 | 5 = 5,
) {
  const problems: { members: string[]; gap: number }[] = [];
  for (let mask = 1; mask < 2 ** members.length - 1; mask++) {
    const subset = members.filter((_, i) => mask & (1 << i)),
      received = subset.reduce((n, c) => n + shares[c], 0),
      gap = savings(subset, count) - received;
    if (gap > 1e-6) problems.push({ members: subset, gap });
  }
  return problems.sort((a, b) => b.gap - a.gap);
}
