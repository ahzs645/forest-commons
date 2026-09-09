import type {Game,Stock,RegionDefinition,Plan} from './types';
export interface BidComposition {bid:number;contributions:Stock}
/** Contributions are currency amounts, not m³ or promised realized proceeds. */
export function compositionTotal(contributions:Stock){return Object.values(contributions).reduce((n,v)=>n+v,0);}
export function validateBidCompositions(region:RegionDefinition,value:unknown):boolean {
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 return Object.entries(value).every(([id,snapshot])=>{
  const lot=region.stands.find(s=>s.id===id);if(!lot||lot.supply!=='auction'||!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return false;
  const c=snapshot as BidComposition;
  if(!Number.isFinite(c.bid)||c.bid<=0||!c.contributions||typeof c.contributions!=='object'||Array.isArray(c.contributions))return false;
  return Object.entries(c.contributions).every(([p,amount])=>region.products.some(x=>x.id===p)&&(lot.mix[p]??0)>0&&Number.isFinite(amount)&&amount>=0)&&Number.isFinite(compositionTotal(c.contributions))&&Math.abs(compositionTotal(c.contributions)-c.bid)<.000001;
 });
}
export function compositionIsActive(plan:Plan,id:string){const snapshot=plan.bidComposition?.[id];return !!snapshot&&snapshot.bid===plan.bids[id];}
export function applyBidComposition(game:Game,id:string,contributions:Stock):Game {
 const definition=game.region.stands.find(s=>s.id===id),state=game.stands.find(s=>s.id===id),bid=compositionTotal(contributions);
 if(game.week>game.region.weeks||!definition||definition.supply!=='auction'||definition.auctionWeek!==game.week||!state||state.owned||state.refused)throw Error('This auction is not open for bids.');
 const snapshot={bid,contributions:structuredClone(contributions)};
 if(!validateBidCompositions(game.region,{[id]:snapshot}))throw Error('Enter nonnegative product contributions with a positive finite total.');
 const next=structuredClone(game);next.plan.bids[id]=bid;next.plan.bidComposition??={};next.plan.bidComposition[id]=snapshot;next.plan.ready={purchase:false,production:false,transport:false};return next;
}
