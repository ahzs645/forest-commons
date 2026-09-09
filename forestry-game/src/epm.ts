import solver from "javascript-lp-solver";
export function equalProfit(
  members: string[],
  coalitionCost: (members: string[]) => number,
) {
  if (!members.length) return {};
  const base = Object.fromEntries(members.map((c) => [c, coalitionCost([c])])),
    savings = (s: string[]) =>
      s.reduce((n, c) => n + base[c], 0) - coalitionCost(s);
  const constraints: Record<
      string,
      { min?: number; max?: number; equal?: number }
    > = { efficient: { equal: savings(members) } },
    variables: Record<string, Record<string, number>> = {
      spread: { objective: 1 },
    };
  for (const c of members) {
    variables[c] = { efficient: 1 };
    constraints[`bound-${c}`] = { max: base[c] };
    variables[c][`bound-${c}`] = 1;
  }
  for (let mask = 1; mask < 2 ** members.length - 1; mask++) {
    const subset = members.filter((_, i) => mask & (1 << i)),
      id = `core-${mask}`;
    constraints[id] = { min: savings(subset) };
    for (const c of subset) variables[c][id] = 1;
  }
  for (const a of members)
    for (const b of members)
      if (a !== b) {
        const id = `gap-${a}-${b}`;
        constraints[id] = { max: 0 };
        variables[a][id] = 100 / base[a];
        variables[b][id] = -100 / base[b];
        variables.spread[id] = -1;
      }
  const result = solver.Solve({
    optimize: "objective",
    opType: "min",
    constraints,
    variables,
  }) as {
    feasible: boolean;
    bounded: boolean;
    [key: string]: number | boolean;
  };
  if (!result.feasible || !result.bounded)
    throw Error("No stable EPM allocation exists for this coalition.");
  return Object.fromEntries(members.map((c) => [c, Number(result[c] ?? 0)]));
}
