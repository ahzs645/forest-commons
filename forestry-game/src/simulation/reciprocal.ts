import {dispatchableStock,consumeReservation} from './reservations';
import type {Game,RegionDefinition,WeekResult} from './types';
import {route,weatherAt} from './routing';
import {operatingRegion,activeDisruptions} from './disruptions';
export interface ReciprocalPair {routing?:'fixed'|'flexible';minimumOwnA?:number;minimumOwnB?:number;settlement?:'paid'|'no-cash';renews?:string;id:string;name:string;standA:string;standB:string;millA:string;millB:string;product:string;limitM3:number;ownReserveM3:number;opens:number;deadline:number}
const sameTerms=(a:ReciprocalPair|undefined,b:ReciprocalPair)=>!!a&&(['routing','minimumOwnA','minimumOwnB','settlement','renews','id','name','standA','standB','millA','millB','product','limitM3','ownReserveM3','opens','deadline'] as const).every(key=>a[key]===b[key]);
export interface ReciprocalAgreement {acceptedWeek?:number;terms:ReciprocalPair;method:'equal'|'cost-weighted';accepted:string[];movedM3:number;savings:number;shareA:number;shareB:number;transferToA:number}
export function acceptReciprocal(game:Game,id:string,company:'A'|'B',method:'equal'|'cost-weighted'):Game{
 const p=game.region.reciprocalPairs?.find(p=>p.id===id);if(!p||game.week>game.region.weeks||game.week<p.opens||game.week>p.deadline||!['A','B'].includes(company)||!['equal','cost-weighted'].includes(method))throw Error('Reciprocal agreement unavailable.');
 const g=structuredClone(game);g.reciprocal??={};const a=g.reciprocal[id];if(a&&(!sameTerms(a.terms,p)||a.method!==method))throw Error('Sharing method is frozen after the first acceptance. Start a new authored agreement to change terms.');
 const next=g.reciprocal[id]??={terms:structuredClone(p),method,accepted:[],movedM3:0,savings:0,shareA:0,shareB:0,transferToA:0};if(!next.accepted.includes(company))next.accepted.push(company);if(next.accepted.length===2&&next.acceptedWeek===undefined)next.acceptedWeek=g.week;g.plan.ready={purchase:false,production:false,transport:false};return g;
}
const stock=(g:Game,stand:string,product:string)=>g.stands.find(s=>s.id===stand)!.stock.filter(b=>b.product===product).reduce((n,b)=>n+b.volume,0);
function consume(g:Game,stand:string,product:string,n:number){let remaining=n,value=0;const s=g.stands.find(s=>s.id===stand)!;for(const b of [...s.stock].sort((a,b)=>a.week-b.week)){if(b.product!==product)continue;const used=Math.min(remaining,b.volume);remaining-=used;b.volume-=used;value+=used*b.quality;if(remaining<=1e-8)break;}s.stock=s.stock.filter(b=>b.volume>1e-8);return value;}
export function reciprocalProblems(g:Game):string[]{const orders=g.plan.reciprocal??[];if(!Array.isArray(orders)||orders.length>100)return ['Invalid reciprocal orders.'];return orders.some(o=>!o||!g.region.reciprocalPairs?.some(p=>p.id===o.pair)||!g.region.trucks.some(t=>t.id===o.truckA)||!g.region.trucks.some(t=>t.id===o.truckB)||!Number.isInteger(o.loads)||o.loads<1||o.loads>100)?['Invalid reciprocal haul order.']:[];}
export function runReciprocal(g:Game,h:WeekResult,post:(category:string,description:string,amount:number,standId?:string)=>void){
 validateReciprocal(g);
 const r=operatingRegion(g,false),w=weatherAt(g),closed=activeDisruptions(g,false),period=Math.min(Math.floor((g.week-1)/r.weeksPerMonth),Math.ceil(r.weeks/r.weeksPerMonth)-1);
 for(const order of g.plan.reciprocal??[]){const a=g.reciprocal?.[order.pair],p=a?.terms;if(!p||!a||!sameTerms(a.terms,p)||!['A','B'].every(c=>a.accepted.includes(c))||g.week<p.opens||g.week>p.deadline)continue;
 const sa=r.stands.find(s=>s.id===p.standA)!,sb=r.stands.find(s=>s.id===p.standB)!,ma=r.mills.find(m=>m.id===p.millA)!,mb=r.mills.find(m=>m.id===p.millB)!,ta=r.trucks.find(t=>t.id===order.truckA)!,tb=r.trucks.find(t=>t.id===order.truckB)!;
 if(!g.stands.find(s=>s.id===sa.id)?.owned||!g.stands.find(s=>s.id===sb.id)?.owned||closed.some(e=>e.kind==='mill'&&[ma.id,mb.id].includes(e.target))){h.messages.push(`${p.name}: paired shipments paused; both managed supplies and receiving mills must be available.`);continue;}
 function legs(swapped:boolean){const positions={...g.truckPositions},result=[];for(const [s,m,t] of [[sa,swapped?mb:ma,ta],[sb,swapped?ma:mb,tb]] as const){const empty=route(r,positions[t.id],s.node,w,g.improvedRoads),loaded=route(r,s.node,m.node,w,g.improvedRoads);if(!empty||!loaded)return null;result.push({s,m,t,empty,loaded,hours:empty.hours+loaded.hours+t.loadingHours+t.unloadingHours,cost:(empty.km+loaded.km)*t.costKm});positions[t.id]=m.node;}return result;}
 let moved=0,serviceHeld=false;
 for(let i=0;i<order.loads;i++){
  const orderA={stand:sa.id,mill:mb.id,product:p.product,loads:1},orderB={stand:sb.id,mill:ma.id,product:p.product,loads:1};
  const n=Math.min(reciprocalDispatchableStock(g,orderA,dispatchableStock(g,orderA,stock(g,sa.id,p.product)),h),reciprocalDispatchableStock(g,orderB,dispatchableStock(g,orderB,stock(g,sb.id,p.product)),h),ta.payload,tb.payload,p.limitM3-a.movedM3,Math.max(0,stock(g,sa.id,p.product)-p.ownReserveM3),Math.max(0,stock(g,sb.id,p.product)-p.ownReserveM3),Math.max(0,(ma.demand[period][p.product]??0)-(g.deliveries[ma.id]?.[p.product]??0)),Math.max(0,(mb.demand[period][p.product]??0)-(g.deliveries[mb.id]?.[p.product]??0)));
  if(n<=1e-8){
   for(const order of [orderA,orderB]){
    const available=dispatchableStock(g,order,stock(g,order.stand,p.product));
    // Empty stock is not evidence that the service agreement caused the hold.
    if(available<=1e-8||reciprocalDispatchableStock(g,order,available,h)>1e-8)continue;
    const restriction=reciprocalDispatchRestriction(g,order,available,h);if(!restriction)continue;
    serviceHeld=true;
    const message=restriction.reason==='fixed'
      ? `${p.name}: agreement ${restriction.pair} fixes ${order.stand} / ${p.product} to ordinary deliveries at ${restriction.ownMill} through turn ${restriction.deadline}.`
      : restriction.reason==='unknown'
        ? `${p.name}: agreement ${restriction.pair} has unverifiable own-mill service records; cross delivery is paused.`
        : `${p.name}: agreement ${restriction.pair} protects ${restriction.protectedM3.toFixed(1)} m³ at ${order.stand} for own-mill service or reserve through turn ${restriction.deadline}; deliver ordinary supply to ${restriction.ownMill} first.`;
    if(!h.messages.includes(message))h.messages.push(message);
   }
   break;
  }const actual=legs(true),baseline=legs(false);if(!actual||!baseline)break;
  const used={...h.truckHours};let fits=true;for(const leg of actual){used[leg.t.id]=(used[leg.t.id]??0)+leg.hours;if(used[leg.t.id]>leg.t.hours+1e-8)fits=false;}if(!fits)break;
  const rawA=baseline[0].cost-actual[0].cost,rawB=baseline[1].cost-actual[1].cost,saving=rawA+rawB,weight=a.method==='equal'?.5:baseline[0].cost+baseline[1].cost>0?baseline[0].cost/(baseline[0].cost+baseline[1].cost):.5,shareA=p.settlement==='no-cash'?rawA:saving*weight;
  a.movedM3+=n;a.savings+=saving;a.shareA+=shareA;a.shareB+=saving-shareA;a.transferToA+=shareA-rawA;
  for(const leg of actual){h.shipments??=[];h.shipments.push({stand:leg.s.id,mill:leg.m.id,product:p.product,volume:n,market:'reciprocal',reciprocalPair:p.id});for(const [id,volume] of Object.entries(consumeReservation(g,{stand:leg.s.id,mill:leg.m.id,product:p.product,loads:1},n))){h.reservationFulfillment??={};h.reservationFulfillment[id]=(h.reservationFulfillment[id]??0)+volume;}const qualityVolume=consume(g,leg.s.id,p.product,n);g.deliveries[leg.m.id]??={};g.deliveries[leg.m.id][p.product]=(g.deliveries[leg.m.id][p.product]??0)+n;h.delivered[p.product]=(h.delivered[p.product]??0)+n;h.millDeliveries[leg.m.id]??={};h.millDeliveries[leg.m.id][p.product]=(h.millDeliveries[leg.m.id][p.product]??0)+n;
   h.truckHours[leg.t.id]=used[leg.t.id];h.truckActivity??={};const activity=h.truckActivity[leg.t.id]??={travel:0,handling:0};activity.travel+=leg.empty.hours+leg.loaded.hours;activity.handling+=leg.t.loadingHours+leg.t.unloadingHours;g.truckPositions[leg.t.id]=leg.m.node;
   post('reciprocal-haul',`${p.id}: ${leg.s.id} → ${leg.m.id}`,-leg.cost,leg.s.id);post('sales',`${p.id}: ${leg.m.name} · ${n.toLocaleString('en-CA',{maximumFractionDigits:1})} m³`,qualityVolume*leg.m.prices[p.product],leg.s.id);const km=leg.empty.km+leg.loaded.km;h.emissions+=km*r.ecology.haulKgCO2Km;h.movements.push({resource:leg.t.id,kind:'truck',from:leg.empty.nodes[0],to:leg.m.node,path:[...leg.empty.path,...leg.loaded.path.slice(1)],km,hours:leg.hours,volume:n});
  }
  h.reciprocal??=[];h.reciprocal.push({pair:p.id,volumeEach:n,savings:saving,shareA,shareB:saving-shareA,transferToA:shareA-rawA});moved+=n;
 }
 if(!moved&&!serviceHeld)h.messages.push(`${p.name}: no balanced pair dispatched; check matching stock above reserves, both routes, demand and remaining truck hours. Neither leg was sent alone.`);
 }
}
export function validateReciprocalRegion(r:RegionDefinition){const pairs=r.reciprocalPairs;if(pairs===undefined)return;if(!Array.isArray(pairs)||new Set(pairs.map(p=>p.id)).size!==pairs.length)throw Error('Invalid reciprocal pairs.');for(const p of pairs)if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(p.id)||['__proto__','constructor','prototype'].includes(p.id)||(p.routing!==undefined&&!['fixed','flexible'].includes(p.routing))||[p.minimumOwnA,p.minimumOwnB].some(n=>n!==undefined&&(!Number.isFinite(n)||n<0))||(p.settlement!==undefined&&!['paid','no-cash'].includes(p.settlement))||typeof p.name!=='string'||!p.name||p.standA===p.standB||p.millA===p.millB||![p.standA,p.standB].every(id=>r.stands.some(s=>s.id===id))||![p.millA,p.millB].every(id=>r.mills.some(m=>m.id===id&&p.product in m.prices))||!r.products.some(x=>x.id===p.product)||![p.limitM3,p.ownReserveM3].every(n=>Number.isFinite(n)&&n>=0)||p.limitM3===0||!Number.isInteger(p.opens)||!Number.isInteger(p.deadline)||p.opens<1||p.deadline<p.opens||p.deadline>r.weeks)throw Error('Invalid reciprocal terms.');
 for(const p of pairs)for(const q of pairs)if(p.id!==q.id&&p.product===q.product&&p.opens<=q.deadline&&q.opens<=p.deadline&&[p.standA,p.standB].some(id=>[q.standA,q.standB].includes(id))&&(restricted(p)||restricted(q)))throw Error('Overlapping reciprocal service agreements.');
 for(const p of pairs)if(p.renews!==undefined){
  const parent=pairs.find(x=>x.id===p.renews);
  if(!parent||p.renews===p.id||p.opens<=parent.deadline||pairs.filter(x=>x.renews===p.renews).length!==1||!(['routing','minimumOwnA','minimumOwnB','settlement','name','standA','standB','millA','millB','product','limitM3','ownReserveM3'] as const).every(k=>p[k]===parent[k]))throw Error('Invalid reciprocal renewal.');
 }
}
export function validateReciprocal(g:Game){validateReciprocalRegion(g.region);if(g.authoredReciprocal!==undefined){const p=g.authoredReciprocal;if(!p||typeof p.originallyAbsent!=='boolean'||!Array.isArray(p.ids)||!p.ids.length||new Set(p.ids).size!==p.ids.length||p.ids.some(id=>typeof id!=='string'||!g.region.reciprocalPairs?.some(pair=>pair.id===id&&!pair.renews)))throw Error('Invalid authored reciprocal provenance.');if(p.originallyAbsent&&g.region.reciprocalPairs?.some(pair=>!pair.renews&&!p.ids.includes(pair.id)))throw Error('Invalid authored reciprocal baseline.');}if(reciprocalProblems(g).length)throw Error('Invalid reciprocal plan.');if(g.reciprocal!==undefined&&(!g.reciprocal||Array.isArray(g.reciprocal)||typeof g.reciprocal!=='object'))throw Error('Invalid reciprocal agreements.');for(const [id,a]of Object.entries(g.reciprocal??{})){const p=g.region.reciprocalPairs?.find(p=>p.id===id);if(!p||!a||!sameTerms(a.terms,p)||!['equal','cost-weighted'].includes(a.method)||!Array.isArray(a.accepted)||new Set(a.accepted).size!==a.accepted.length||a.accepted.some(c=>!['A','B'].includes(c))||![a.movedM3,a.savings,a.shareA,a.shareB,a.transferToA].every(Number.isFinite)||a.movedM3<0||(a.movedM3>0&&!['A','B'].every(c=>a.accepted.includes(c)))||a.movedM3>p.limitM3+1e-6||Math.abs(a.shareA+a.shareB-a.savings)>1e-6)throw Error('Invalid reciprocal balance.');if(a.acceptedWeek!==undefined&&(!Number.isInteger(a.acceptedWeek)||a.acceptedWeek<p.opens||a.acceptedWeek>p.deadline||a.acceptedWeek>g.week))throw Error('Invalid reciprocal consent date.');if(a.accepted.length===2&&restricted(p)&&a.acceptedWeek===undefined)throw Error('Missing reciprocal service consent provenance.');if(a.accepted.length===2&&restricted(p)&&g.history.some(h=>h.week>=a.acceptedWeek!&&h.week<=p.deadline&&!Array.isArray(h.shipments)))throw Error('Missing reciprocal shipment provenance.');if(p.renews){const parent=g.reciprocal?.[p.renews];if(!parent||!['A','B'].every(c=>parent.accepted.includes(c))||a.method!==parent.method)throw Error('Invalid reciprocal renewal consent or sharing method.');}if(p.settlement==='no-cash'&&Math.abs(a.transferToA)>1e-6)throw Error('Invalid reciprocal balance.');const entries=g.history.flatMap(h=>h.reciprocal??[]).filter(x=>x.pair===id);for(const field of ['savings','shareA','shareB','transferToA'] as const)if(Math.abs(entries.reduce((n,e)=>n+e[field],0)-a[field])>1e-5)throw Error('Reciprocal settlement mismatch.');if(Math.abs(entries.reduce((n,e)=>n+e.volumeEach,0)-a.movedM3)>1e-5)throw Error('Reciprocal volume mismatch.');}for(const h of g.history)for(const e of h.reciprocal??[])if(!g.reciprocal?.[e.pair]||h.week<g.reciprocal[e.pair].terms.opens||h.week>g.reciprocal[e.pair].terms.deadline||![e.volumeEach,e.savings,e.shareA,e.shareB,e.transferToA].every(Number.isFinite)||e.volumeEach<=0||Math.abs(e.shareA+e.shareB-e.savings)>1e-6)throw Error('Invalid reciprocal report.');
 for(const p of g.region.reciprocalPairs??[])if(p.renews&&!g.reciprocal?.[p.id])throw Error('Missing reciprocal renewal agreement.');
 for(const h of g.history){const delivered:Record<string,number>={};for(const e of h.reciprocal??[]){if(g.reciprocal![e.pair].terms.settlement==='no-cash'&&Math.abs(e.transferToA)>1e-6)throw Error('Invalid reciprocal report.');const product=g.reciprocal![e.pair].terms.product;delivered[product]=(delivered[product]??0)+2*e.volumeEach;}for(const [product,n]of Object.entries(delivered))if(n>(h.delivered[product]??0)+1e-6)throw Error('Reciprocal shipments exceed recorded deliveries.');}
}
export function authorReciprocal(game:Game,terms:Omit<ReciprocalPair,'id'|'renews'>):Game {
 if(game.week>game.region.weeks)throw Error('Campaign complete.');
 if('renews' in terms)throw Error('Use the renewal action to link an agreement.');
 const next=structuredClone(game);let i=1;while(next.region.reciprocalPairs?.some(p=>p.id===`managed-pair-${i}`))i++;
 next.authoredReciprocal??={ids:[],originallyAbsent:next.region.reciprocalPairs===undefined};next.authoredReciprocal.ids.push(`managed-pair-${i}`);
 next.region.reciprocalPairs??=[];next.region.reciprocalPairs.push({...terms,id:`managed-pair-${i}`});validateReciprocalRegion(next.region);next.plan.ready={purchase:false,production:false,transport:false};return next;
}
export function queueReciprocal(game:Game,pair:string,truckA:string,truckB:string,loads:number):Game {
 const agreement=game.reciprocal?.[pair];if(game.week>game.region.weeks||!agreement||!['A','B'].every(c=>agreement.accepted.includes(c))||game.week<agreement.terms.opens||game.week>agreement.terms.deadline)throw Error('Both companies must accept an active agreement before dispatch.');
 if(agreement.terms.routing==='fixed')throw Error('Fixed routing permits only own-mill deliveries.');
 const next=structuredClone(game);next.plan.reciprocal??=[];next.plan.reciprocal.push({pair,truckA,truckB,loads});validateReciprocal(next);next.plan.ready={purchase:false,production:false,transport:false};return next;
}

/** A renewal is a separate period with fresh consent, never an extension of settled totals. */
export function renewReciprocal(game:Game,predecessorId:string,window:{opens:number;deadline:number}):Game {
 validateReciprocal(game);
 const parent=game.reciprocal?.[predecessorId];
 if(game.week>game.region.weeks||!parent||!['A','B'].every(c=>parent.accepted.includes(c)))throw Error('Both companies must accept the original agreement before renewal.');
 if(game.region.reciprocalPairs?.some(p=>p.renews===predecessorId))throw Error('This agreement already has a renewal.');
 if(!Number.isInteger(window.opens)||!Number.isInteger(window.deadline)||window.opens<game.week||window.opens<=parent.terms.deadline||window.deadline<window.opens||window.deadline>game.region.weeks)throw Error('Renewal must use a future nonoverlapping campaign window.');
 const next=structuredClone(game);let i=1;while(next.region.reciprocalPairs?.some(p=>p.id===`renewed-pair-${i}`))i++;
 const terms:ReciprocalPair={...parent.terms,id:`renewed-pair-${i}`,renews:predecessorId,opens:window.opens,deadline:window.deadline};
 next.region.reciprocalPairs!.push(terms);
 next.reciprocal![terms.id]={terms:structuredClone(terms),method:parent.method,accepted:[],movedM3:0,savings:0,shareA:0,shareB:0,transferToA:0};
 next.plan.ready={purchase:false,production:false,transport:false};
 validateReciprocalRegion(next.region);validateReciprocal(next);return next;
}

const restricted=(p:ReciprocalPair)=>p.routing==='fixed'||(p.minimumOwnA??0)>0||(p.minimumOwnB??0)>0;
/** Derived only from actual ordinary shipments in this consent window. */
export function reciprocalServiceProgress(g:Game,id:string,current?:WeekResult){
 const a=g.reciprocal?.[id],p=a?.terms??g.region.reciprocalPairs?.find(p=>p.id===id);
 if(!p)throw Error('Reciprocal agreement unavailable.');
 const bilateral=a?.accepted.length===2;
 const rows=(bilateral?[...g.history,...(current?[current]:[])]:[]).filter(h=>h.week>=(a?.acceptedWeek??p.opens)&&h.week<=p.deadline);
 const unknown=!!bilateral&&(a?.acceptedWeek===undefined||rows.some(h=>!Array.isArray(h.shipments)));
 const side=(stand:string,mill:string,required:number)=>{const delivered=rows.reduce((n,h)=>n+(h.shipments??[]).filter(s=>s.market==='ordinary'&&s.stand===stand&&s.mill===mill&&s.product===p.product).reduce((n,s)=>n+s.volume,0),0);return {required,delivered,outstanding:Math.max(0,required-delivered)};};
 const A=side(p.standA,p.millA,p.minimumOwnA??0),B=side(p.standB,p.millB,p.minimumOwnB??0);
 const status:'pending'|'unaccepted'|'active'|'fulfilled'|'shortfall'|'unknown'=!bilateral?(g.week>p.deadline?'unaccepted':'pending'):unknown?'unknown':A.outstanding+B.outstanding<=1e-8?'fulfilled':g.week>p.deadline?'shortfall':'active';
 return {A,B,status};
}
/** Own service protection applies to every market, so cross-haul orders cannot bypass it. */
export function reciprocalDispatchableStock(g:Game,order:{stand:string;mill:string;product:string;spot?:unknown;process?:unknown;offtake?:unknown},available:number,current?:WeekResult){
 let allowed=available;
 for(const [id,a] of Object.entries(g.reciprocal??{})){
  const p=a.terms;if(!restricted(p)||a.accepted.length!==2||g.week<p.opens||g.week>p.deadline||p.product!==order.product||![p.standA,p.standB].includes(order.stand))continue;
  const own=order.stand===p.standA?p.millA:p.millB;
  if(order.mill===own&&!order.spot&&!order.process&&!order.offtake)continue;
  if(p.routing==='fixed')return 0;
  const progress=reciprocalServiceProgress(g,id,current);if(progress.status==='unknown')return 0;
  const side=order.stand===p.standA?progress.A:progress.B;
  allowed=Math.min(allowed,Math.max(0,stock(g,order.stand,order.product)-Math.max(p.ownReserveM3,side.outstanding)));
 }
 return allowed;
}

/** Explain the binding service restriction without treating a feasible later queue as invalid. */
export function reciprocalDispatchRestriction(g:Game,order:{stand:string;mill:string;product:string;spot?:unknown;process?:unknown;offtake?:unknown},available:number,current?:WeekResult){
 for(const [id,a] of Object.entries(g.reciprocal??{})){
  const p=a.terms;if(!restricted(p)||a.accepted.length!==2||g.week<p.opens||g.week>p.deadline||p.product!==order.product||![p.standA,p.standB].includes(order.stand))continue;
  const ownMill=order.stand===p.standA?p.millA:p.millB;
  if(order.mill===ownMill&&!order.spot&&!order.process&&!order.offtake)continue;
  if(p.routing==='fixed')return {pair:id,ownMill,deadline:p.deadline,reason:'fixed' as const,protectedM3:0};
  const progress=reciprocalServiceProgress(g,id,current),side=order.stand===p.standA?progress.A:progress.B;
  if(progress.status==='unknown')return {pair:id,ownMill,deadline:p.deadline,reason:'unknown' as const,protectedM3:side.outstanding};
  const protectedM3=Math.max(p.ownReserveM3,side.outstanding);
  if(Math.max(0,stock(g,order.stand,order.product)-protectedM3)<available-1e-8)return {pair:id,ownMill,deadline:p.deadline,reason:'reserve' as const,protectedM3};
 }
 return null;
}
