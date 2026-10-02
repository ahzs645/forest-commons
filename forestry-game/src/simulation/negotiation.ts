import type { Game } from "./types";
import { savings } from "../coalition";
import { assessNegotiationDraft } from "./negotiation-draft";
export function propose(game: Game): Game {
  const g = structuredClone(game), n = g.negotiation;
  const draft = assessNegotiationDraft(n);
  if (!draft.canPublish) throw Error(draft.issues[0].message);
  const shares = draft.shares;
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
