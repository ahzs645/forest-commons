import type { Game } from "./types";
import { allocate, savings } from "../coalition";
export function propose(game: Game): Game {
  const g = structuredClone(game),
    n = g.negotiation,
    members = Array.from({ length: n.count }, (_, i) => String(i + 1));
  const partition = [...new Set(n.groups.slice(0, n.count))].map((group) =>
    members.filter((_, i) => n.groups[i] === group),
  );
  if (n.phase === "pairs" && partition.some((p) => p.length > 2))
    throw Error("Round A allows only pairs and single companies.");
  const shares: Record<string, number> = {};
  for (const p of partition) {
    const preset = allocate(p, n.method, n.count);
    for (const c of p) shares[c] = n.custom[c] ?? preset[c];
    if (p.some((c) => !Number.isFinite(shares[c]) || shares[c] < 0))
      throw Error("Every company must receive nonnegative savings.");
    if (
      Math.abs(p.reduce((v, c) => v + shares[c], 0) - savings(p, n.count)) >
      0.01
    )
      throw Error(
        "Allocate each group’s savings exactly before making a proposal.",
      );
  }
  const offers = (n.offers ??= []);
  for (const o of offers) if (o.status === "proposed") o.status = "superseded";
  offers.push({
    id: (offers.at(-1)?.id ?? 0) + 1,
    count: n.count,
    phase: n.phase,
    groups: [...n.groups],
    shares,
    accepted: [],
    status: "proposed",
  });
  n.offers = offers.slice(-50);
  return g;
}
export function respond(
  game: Game,
  id: number,
  company: string,
  accept: boolean,
): Game {
  const g = structuredClone(game),
    offer = g.negotiation.offers?.find((o) => o.id === id);
  if (
    !offer ||
    offer.status !== "proposed" ||
    !Array.from({ length: offer.count }, (_, i) => String(i + 1)).includes(
      company,
    )
  )
    throw Error("This proposal is no longer open for this company.");
  if (!accept) {
    offer.status = "rejected";
    return g;
  }
  if (!offer.accepted.includes(company)) offer.accepted.push(company);
  if (offer.accepted.length === offer.count) offer.status = "agreed";
  return g;
}

export function validOfferAllocation(o:import('./types').NegotiationOffer):boolean {
 if(o.phase!==undefined&&!['pairs','open'].includes(o.phase))return false;
 const members=Array.from({length:o.count},(_,i)=>String(i+1)),groups=[...new Set(o.groups.slice(0,o.count))].map(group=>members.filter((_,i)=>o.groups[i]===group));
 return Object.keys(o.shares).length===o.count&&groups.every(group=>(o.phase!=='pairs'||group.length<=2)&&Math.abs(group.reduce((n,c)=>n+o.shares[c],0)-savings(group,o.count))<=.01);
}
