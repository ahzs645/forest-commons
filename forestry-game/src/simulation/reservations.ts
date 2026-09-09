import type {Game,HaulOrder} from './types';
export interface DestinationReservation {id:string;stand:string;product:string;mill:string;volume:number;market:'ordinary'|'spot'|'processing'|'offtake';offtake?:string}
const market=(o:HaulOrder)=>o.offtake?'offtake':o.process?'processing':o.spot?'spot':'ordinary';
const matches=(r:DestinationReservation,o:HaulOrder)=>r.stand===o.stand&&r.product===o.product&&r.mill===o.mill&&r.market===market(o)&&r.offtake===o.offtake;
/** Earlier reservations receive scarce available stock first; the remainder is unreserved. */
export function dispatchableStock(g:Game,o:HaulOrder,stock:number):number {
 let unassigned=stock,matching=0;
 for(const r of g.plan.reservations??[])if(r.stand===o.stand&&r.product===o.product){const n=Math.min(unassigned,r.volume);unassigned-=n;if(matches(r,o))matching+=n;}
 return unassigned+matching;
}
export function consumeReservation(g:Game,o:HaulOrder,volume:number){const consumed:Record<string,number>={};let left=volume;for(const r of g.plan.reservations??[])if(matches(r,o)){const n=Math.min(left,r.volume);r.volume-=n;left-=n;if(n>0)consumed[r.id]=(consumed[r.id]??0)+n;}
 g.plan.reservations=g.plan.reservations?.filter(r=>r.volume>1e-7);return consumed;
}
export function reservationProblems(g:Game):string[]{
 const rows=g.plan.reservations;if(rows===undefined)return [];
 if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(r=>r.id)).size!==rows.length)return ['Invalid destination reservations.'];
 const issues:string[]=[];
 for(const r of rows){const s=g.stands.find(s=>s.id===r.stand),m=g.region.mills.find(m=>m.id===r.mill);
  const offer=g.region.offtakeOffers?.find(o=>o.id===r.offtake);
  if(!r.id||typeof r.id!=='string'||!s?.owned||!m||!(r.product in m.prices)||!Number.isFinite(r.volume)||r.volume<=0||!['ordinary','spot','processing','offtake'].includes(r.market)
   ||(r.market==='spot'&&m.spotPrices?.[r.product]===undefined)||(r.market==='processing'&&!m.processing?.inputs.includes(r.product))
   ||(r.market==='offtake'&&(!offer||offer.mill!==r.mill||offer.product!==r.product||!g.offtake?.[offer.id]||g.offtake[offer.id].settled||g.week>offer.deadline))
   ||(r.market!=='offtake'&&r.offtake!==undefined))issues.push(`Invalid reservation ${r.id}.`);
 }
 return issues;
}
export function addReservation(input:Game,row:Omit<DestinationReservation,'id'>):Game {
 const g=structuredClone(input);if(g.week>g.region.weeks)throw Error('Campaign complete.');
 g.plan.reservations??=[];let n=1;while(g.plan.reservations.some(r=>r.id===`reservation-${n}`))n++;
 g.plan.reservations.push({...row,id:`reservation-${n}`});const errors=reservationProblems(g);if(errors.length)throw Error(errors.join(' '));
 g.plan.ready={purchase:false,production:false,transport:false};return g;
}
