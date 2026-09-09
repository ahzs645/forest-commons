import { randomInt } from "node:crypto";
import type { Game, Plan, RegionDefinition } from "../src/simulation/types";
export function realizeAuctions(region: RegionDefinition) {
  const result = structuredClone(region), policy = result.auctionDisclosure;
  if (!policy) return result;
  const draw = ([low, high]: [number, number]) => low + (high - low) * randomInt(1, 1000000) / 1000000;
  for (const stand of result.stands.filter(s => s.supply === "auction")) {
    stand.volume = Math.round(stand.volume * draw(policy.volumeMultiplier) * 1000) / 1000;
    stand.askingPrice = Math.round(stand.askingPrice * draw(policy.priceMultiplier) * 100) / 100;
  }
  return result;
}
export function unreleasedAuctions(game: Game) {
  return game.region.auctionDisclosure ? game.region.stands.filter(s => s.supply === "auction" && s.auctionWeek > game.week).map(s => ({ id: s.id, releaseWeek: s.auctionWeek })) : [];
}
export function referencesWithheld(value: unknown, hidden: Set<string>): boolean {
  if (typeof value === "string") return hidden.has(value);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => hidden.has(key) || referencesWithheld(child, hidden));
}
/** Remove unreleased lots, never substitute zero for an unknown quantity. Input is an isolated response clone. */
export function filterAuctionObservation(game: Game) {
  const withheld = unreleasedAuctions(game), hidden = new Set(withheld.map(s => s.id));
  if (!hidden.size) return withheld;
  const withheldPairs = new Set((game.region.reciprocalPairs ?? []).filter(p => hidden.has(p.standA) || hidden.has(p.standB)).map(p => p.id));
  if (game.region.reciprocalPairs) game.region.reciprocalPairs = game.region.reciprocalPairs.filter(p => !withheldPairs.has(p.id));
  for (const id of withheldPairs) if (game.reciprocal) delete game.reciprocal[id];
  const cleanPlan = (plan: Plan) => {
    if (plan.reciprocal) plan.reciprocal = plan.reciprocal.filter(o => !withheldPairs.has(o.pair));
    if (plan.reservations) plan.reservations = plan.reservations.filter(r => !hidden.has(r.stand));
    for (const id of hidden) { delete plan.bids[id]; if (plan.bidComposition) delete plan.bidComposition[id]; }
    for (const orders of Object.values(plan.crews)) for (let i = orders.length - 1; i >= 0; i--) if (hidden.has(orders[i].stand)) orders.splice(i, 1);
    for (const orders of Object.values(plan.trucks)) for (let i = orders.length - 1; i >= 0; i--) if (hidden.has(orders[i].stand)) orders.splice(i, 1);
  };
  game.region.stands = game.region.stands.filter(s => !hidden.has(s.id));
  game.stands = game.stands.filter(s => !hidden.has(s.id));
  // Optional tenure data must not re-expose the lots removed above.
  for (const id of hidden) {
    if (game.bcMarket) delete game.bcMarket.lockedRates[id];
    if (game.region.bcTenure) delete game.region.bcTenure.stands[id];
    if (game.bcTenure) {
      delete game.bcTenure.harvest[id];
      for (const key of Object.keys(game.bcTenure.obligations)) if (key.startsWith(`${id}:`)) delete game.bcTenure.obligations[key];
    }
    const edgeId = `access-${id}`;
    if (game.region.bcTenure) delete game.region.bcTenure.roads[edgeId];
    if (game.bcTenure) delete game.bcTenure.roads[edgeId];
  }
  cleanPlan(game.plan);
  for (const crews of Object.values(game.scheduledCrews ?? {})) for (const [id, orders] of Object.entries(crews)) crews[id] = orders.filter(o => !hidden.has(o.stand));
  for (const h of game.history) {
    cleanPlan(h.plan);
    if(h.shipments)h.shipments=h.shipments.filter(s=>!hidden.has(s.stand));
    if (h.snapshot) h.snapshot.stands = h.snapshot.stands.filter(s => !hidden.has(s.id));
  }
  // These optional full-season models embed future stand quantities and are not used by classroom controls.
  delete game.authoredReciprocal;
  delete game.linkedSeason;
  delete game.stewardship;
  return withheld;
}
