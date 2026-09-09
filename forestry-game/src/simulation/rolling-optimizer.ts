import {reciprocalServiceProgress} from './reciprocal';
import type {Game,Plan} from './types';
import {advance,draftPlan,purchase,sum,type DraftPlanOptions} from './engine';
export interface CandidateEvidence {turn:number;delivered:number;waste:number;messages:string[];omittedMessages:number}
export interface RollingCandidate {evidence?:CandidateEvidence[];ownServiceRemaining?:number|null;ownServiceOverdue?:number|null;purchases:string[];id:string;name:string;plan:Plan;cashChange:number;delivered:number;processed:number;transferred:number;waste:number;problem?:string}
export interface RollingResult {fingerprint:string;week:number;horizon:number;candidates:RollingCandidate[];best:string|null;assumptions:string[]}
/** Remove inaccessible future truth before even generating candidate plans. */
export function forecastPlanningGame(input:Game):Game {
 const g=structuredClone(input);g.roleMode=false;g.seed=417;
 g.region.disruptions=g.region.disruptions?.filter(e=>e.revealWeek<=input.week);
 if(g.region.bcMarket)g.region.bcMarket.events=g.region.bcMarket.events.filter(e=>e.revealWeek<=1+(input.week-1)*(input.region.turnDurationWeeks??1));
 for(const scenario of Object.values(g.region.weather))for(const zone of g.region.zones)scenario.actual[zone.id]=[...scenario.forecast[zone.id]];
 // Auctions need a separate uncertainty experiment; this advisor never exploits
 // the campaign seed to select bids and does not simulate auction awards.
 g.plan.bids={};return g;
}
function fingerprint(g:Game){let hash=2166136261;for(const c of JSON.stringify({forecast:forecastPlanningGame(g),bidCommitments:g.plan.bids})){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return String(hash>>>0);}
function policyPlan(g:Game,settings:DraftPlanOptions|null):Game {
 if(!settings)return structuredClone(g);
 const next=draftPlan(g,settings);
 // Preserve explicit processing and partner-contract destinations; they consume actual truck time
 // before new auto-drafted external sales. All non-freight modules are retained.
 for(const t of g.region.trucks){const processing=(g.plan.trucks[t.id]??[]).filter(o=>o.process||o.offtake);next.plan.trucks[t.id]=[...structuredClone(processing),...(next.plan.trucks[t.id]??[])];}
 return next;
}
export async function rollingOptimize(input:Game,horizon:number,progress?:(done:number,total:number)=>void,acquisitionIds:string[]=[]):Promise<RollingResult>{
 if(!Number.isInteger(horizon)||horizon<1||horizon>input.region.weeks-input.week+1||input.week>input.region.weeks)throw Error('Choose a horizon within the remaining campaign turns.');
 const base=forecastPlanningGame(input),policies:{id:string;name:string;settings:DraftPlanOptions|null}[]=[{id:'current',name:'Keep current queues',settings:null}];
 // Bound the search independent of authored treatment count.
 for(const treatment of ['final',...Object.keys(input.region.treatments??{}).filter(t=>t!=='final').slice(0,1)])for(const salesPolicy of ['margin','contract-first','penalty-aware'] as const)for(const commitmentAware of [false,true])policies.push({id:`${treatment}-${salesPolicy}-${commitmentAware}`,name:`${input.region.treatments?.[treatment]?.name??treatment} / ${salesPolicy}${commitmentAware?' / commitment cap':''}`,settings:{treatment,salesPolicy,commitmentAware}});
 if(acquisitionIds.length>3||new Set(acquisitionIds).size!==acquisitionIds.length||acquisitionIds.some(id=>!input.region.stands.some(s=>s.id===id&&s.supply==='private'&&!input.stands.find(x=>x.id===id)?.owned)))throw Error('Choose at most three available private lots.');
 const baskets:string[][]=[[]];for(const id of acquisitionIds)baskets.push([id]);for(let i=0;i<acquisitionIds.length;i++)for(let j=i+1;j<acquisitionIds.length;j++)baskets.push([acquisitionIds[i],acquisitionIds[j]]);
 const candidates:RollingCandidate[]=[];
 for(const basket of baskets)for(const policy of policies){
  let g=structuredClone(base),first=structuredClone(input.plan);const row:RollingCandidate={purchases:basket,id:`${basket.join('+')||'none'}:${policy.id}`,evidence:[],name:`${basket.length?'Buy '+basket.join(' + ')+' / ':''}${policy.name}`,plan:first,cashChange:0,delivered:0,processed:0,transferred:0,waste:0};
  try{
   g.plan.bids=structuredClone(input.plan.bids);
   for(const id of basket)g=purchase(g,id);
   g.plan.bids={};
   for(let offset=0;offset<horizon&&g.week<=g.region.weeks;offset++){
    g=policyPlan(g,policy.settings);
    // advance consumes due schedule entries into the next plan. Adaptive
    // drafting must not silently replace those explicit future assignments.
    for(const [crew,orders] of Object.entries(input.scheduledCrews?.[g.week]??{}))g.plan.crews[crew]=structuredClone(orders);
    if(offset===0){first=structuredClone(g.plan);first.bids=structuredClone(input.plan.bids);row.plan=first;}
    g=advance(g);const h=g.history.at(-1)!;const constraint=/(closed|unavailable|no delivery|no balanced|paused|exceeds|insufficient|shortfall|protects|unverifiable|cannot|blocked)/i;const messages=[...new Set(h.messages)].sort((a,b)=>Number(constraint.test(b))-Number(constraint.test(a)));row.evidence!.push({turn:h.week,delivered:sum(h.delivered),waste:h.waste,messages:messages.slice(0,12),omittedMessages:Math.max(0,messages.length-12)});row.delivered+=sum(h.delivered);row.processed+=Object.values(h.processing??{}).reduce((n,s)=>n+s.processed,0);row.transferred+=(h.facilityTransfers??[]).reduce((n,t)=>n+t.volume,0);row.waste+=h.waste;
   }
   row.cashChange=g.cash-base.cash;
   const service=Object.entries(g.reciprocal??{}).filter(([,a])=>a.accepted.length===2&&((a.terms.minimumOwnA??0)+(a.terms.minimumOwnB??0)>0)).map(([id])=>reciprocalServiceProgress(g,id));
   row.ownServiceOverdue=service.some(s=>s.status==='unknown')?null:service.filter(s=>s.status==='shortfall').reduce((n,s)=>n+s.A.outstanding+s.B.outstanding,0);
   row.ownServiceRemaining=service.some(s=>s.status==='unknown')?null:service.reduce((n,s)=>n+s.A.outstanding+s.B.outstanding,0);
  }catch(e){row.problem=e instanceof Error?e.message:String(e);}
  candidates.push(row);progress?.(candidates.length,policies.length*baskets.length);await new Promise(resolve=>setTimeout(resolve,0));
 }
 const best=candidates.filter(c=>!c.problem).sort((a,b)=>b.cashChange-a.cashChange||b.delivered-a.delivered)[0]?.id??null;
 return {fingerprint:fingerprint(input),week:input.week,horizon:Math.min(horizon,input.region.weeks-input.week+1),candidates,best,assumptions:[
 'Best projected cash among up to13 operating policies crossed with no purchase, single purchases and pairs from at most3 selected private lots (at most91 candidates). This is not a global optimum or a guarantee.',
 'All future weather uses the published forecast. Only already revealed disruptions are included. No campaign seed or hidden future events influence the comparison.',
 'Selected private purchases occur once at the opening; purchase prices or harvest royalties and procurement credit use normal engine rules. Existing bids reserve funds but auction outcomes are excluded; use the procurement uncertainty experiment for auctions.',
 'Existing processing and partner-contract haul orders are retained ahead of newly drafted sales, together with processing decisions, destination reservations and facility transfers. Forest haul precedes transfers; all orders share fleet capacity.',
 'Future weeks repeat the chosen draft policy; the current-queue candidate carries existing queues forward. Explicit scheduled crew assignments and rest weeks override adaptive crew drafting when due. Freight is still only a candidate queue and executes against actual available stock.',
 'Cash includes operating costs and any penalties inside the horizon. No terminal stock valuation is invented; short horizons may favor cash over service or long-term stewardship. Review delivered volume, waste and all candidate failures.',
 'Applying a candidate executes its listed private purchases at current terms, then sets current queues. It never imports simulated future cash, inventory, weather or weeks. Review the purchase list and projected outcomes before applying.'
 ]};
}
export function applyRollingCandidate(game:Game,result:RollingResult,id:string):Game{
 if(game.week!==result.week||game.week>game.region.weeks||fingerprint(game)!==result.fingerprint)throw Error('Planning advice is stale.');const candidate=result.candidates.find(c=>c.id===id);if(!candidate||candidate.problem)throw Error('Choose a successful candidate.');
 let g=structuredClone(game);for(const id of candidate.purchases??[])g=purchase(g,id);g.plan=structuredClone(candidate.plan);g.plan.bids=structuredClone(game.plan.bids);g.plan.ready={purchase:false,production:false,transport:false};return g;
}
