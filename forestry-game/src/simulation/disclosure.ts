export type DisclosurePhase = "private" | "sharing" | "debrief";
export interface DisclosureExperiment {
  offers?: {id:number;shares:Record<string,number>;accepted:string[];status:"proposed"|"agreed"|"rejected"|"superseded"}[];
  phase: DisclosurePhase;
  economics: Record<string, { standalone: number; pooled: number }>;
  shared: string[];
  estimates: Record<string, { before?: number; after?: number }>;
}
export interface DisclosureView extends Omit<DisclosureExperiment, "economics"> {
  economics: DisclosureExperiment["economics"];
}
export function disclosureView(experiment: DisclosureExperiment, role: string): DisclosureView {
  const own = role.startsWith("company") ? role.slice(7) : "";
  const visible = Object.fromEntries(Object.entries(experiment.economics).filter(([company]) => role === "instructor" || company === own || experiment.shared.includes(company)));
  const estimates = role === "instructor" || experiment.phase === "debrief" ? experiment.estimates : own && experiment.estimates[own] ? {[own]: experiment.estimates[own]} : {};
  return { offers: structuredClone(experiment.offers ?? []), phase: experiment.phase, economics: structuredClone(visible), shared: [...experiment.shared], estimates: structuredClone(estimates) };
}
export function disclosureAction(experiment: DisclosureExperiment, role: string, action: string, payload: Record<string, unknown>) {
  const e = structuredClone(experiment), own = role.startsWith("company") ? role.slice(7) : "";
  if (action === "disclosure-propose") {
    if (role !== "instructor" || e.phase !== "sharing") throw Error("The instructor can propose during sharing.");
    const shares = payload.shares as Record<string,number>;
    const total = Object.values(e.economics).reduce((sum,c)=>sum+c.standalone-c.pooled,0);
    if (!shares || typeof shares !== "object" || Object.keys(shares).length !== 5 || Object.keys(e.economics).some(c=>typeof shares[c] !== "number" || !Number.isFinite(shares[c]) || shares[c]<0 || shares[c]>e.economics[c].standalone) || Math.abs(Object.values(shares).reduce((a,b)=>a+b,0)-total)>.001) throw Error("Allocate the exact total savings with nonnegative savings and allocated costs for every company.");
    const offers=e.offers??=[];for(const o of offers)if(o.status==="proposed")o.status="superseded";
    offers.push({id:(offers.at(-1)?.id??0)+1,shares:structuredClone(shares),accepted:[],status:"proposed"});
    e.offers=offers.slice(-50);
  } else if (action === "disclosure-respond") {
    if (!e.economics[own] || e.phase !== "sharing") throw Error("Only a company can respond during sharing.");
    const offer=e.offers?.find(o=>o.id===payload.id);
    if (!offer || offer.status!=="proposed" || typeof payload.accept!=="boolean") throw Error("Choose an open offer and acceptance or rejection.");
    if (!payload.accept) offer.status="rejected";
    else {if(!offer.accepted.includes(own))offer.accepted.push(own);if(offer.accepted.length===5)offer.status="agreed";}
  } else if (action === "disclosure-phase") {
    if (role !== "instructor") throw Error("Only the instructor can reveal the next phase.");
    const next = e.phase === "private" ? "sharing" : e.phase === "sharing" ? "debrief" : null;
    if (!next || payload.phase !== next) throw Error("Disclosure phases advance one step at a time.");
    e.phase = next;
  } else if (action === "disclosure-share") {
    if (!e.economics[own] || e.phase !== "sharing" || payload.consent !== true) throw Error("A company must explicitly consent during the sharing phase.");
    if (!e.shared.includes(own)) e.shared.push(own);
  } else if (action === "disclosure-estimate") {
    if (!e.economics[own] || e.phase === "debrief" || typeof payload.savings !== "number" || !Number.isFinite(payload.savings) || Math.abs(payload.savings) > 1e9) throw Error("Enter a finite savings estimate during the private or sharing phase.");
    const key = e.phase === "private" ? "before" : "after";
    e.estimates[own] = {...e.estimates[own], [key]:payload.savings};
  } else throw Error("Unknown disclosure action.");
  return e;
}
