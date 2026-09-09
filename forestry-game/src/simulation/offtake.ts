import type {Game, RegionDefinition, OfftakeOffer, HaulOrder} from './types';
export function teachingOfftakeOffers(r: RegionDefinition): OfftakeOffer[] {
 return r.mills.map((m,i)=>{
  const product=Object.keys(m.prices)[0];
  return {id:`offtake-${m.id}`,company:`Teaching partner ${i+1}`,mill:m.id,product,
   volume:Math.max(1,Math.round(m.demand.reduce((n,d)=>n+(d[product]??0),0)*.1)),
   opens:1,acceptBy:Math.min(3,r.weeks),deadline:r.weeks,priceM3:m.prices[product]*1.05,shortfallM3:12};
 });
}
/** Illustrative periodic obligations, not a calibrated commercial agreement. All legs bind at once. */
export function teachingRepeatedOfftakeOffers(r:RegionDefinition):OfftakeOffer[]{
 return teachingOfftakeOffers(r).flatMap(offer=>{
  const periods=Math.ceil(r.weeks/r.weeksPerMonth);
  return Array.from({length:periods},(_,i)=>({...offer,id:`${offer.id}-period-${i+1}`,agreement:`agreement-${offer.mill}`,volume:Math.max(1,Math.round(offer.volume/periods)),acceptBy:Math.min(3,r.weeksPerMonth,r.weeks),deadline:Math.min((i+1)*r.weeksPerMonth,r.weeks)}));
 });
}
export function acceptAgreement(input:Game,id:string):Game {
 const legs=input.region.offtakeOffers?.filter(o=>o.agreement===id)??[];
 if(!legs.length || legs.some(o=>input.week<o.opens || input.week>o.acceptBy || input.offtake?.[o.id]))throw Error('Every agreement leg must be available and unaccepted. No terms were accepted.');
 validateOfftakeRegion(input.region);
 const g=structuredClone(input);g.offtake??={};
 for(const leg of legs)g.offtake[leg.id]={acceptedWeek:g.week,delivered:0,settled:false};
 g.plan.ready={purchase:false,production:false,transport:false};return g;
}
export function acceptOfftake(input:Game,id:string):Game {
 const offer=input.region.offtakeOffers?.find(o=>o.id===id);
 if(offer?.agreement)throw Error('Accept the complete repeated agreement, not a single leg.');
 if(!offer || input.week<offer.opens || input.week>offer.acceptBy || input.offtake?.[id]) throw Error('This offer is not available for acceptance.');
 const g=structuredClone(input);g.offtake??={};g.offtake[id]={acceptedWeek:g.week,delivered:0,settled:false};
 g.plan.ready={purchase:false,production:false,transport:false};return g;
}
export function validOfftakeOrder(g:Game,o:HaulOrder):boolean {
 if(o.process!==undefined && typeof o.process!=="boolean")return false;
 if(o.process && (o.spot || o.offtake || !g.region.mills.find(m=>m.id===o.mill)?.processing?.inputs.includes(o.product)))return false;
 if(o.spot!==undefined && typeof o.spot!=="boolean")return false;
 if(o.spot && (o.offtake || g.region.mills.find(m=>m.id===o.mill)?.spotPrices?.[o.product]===undefined))return false;
 if(o.offtake===undefined)return true;
 const offer=g.region.offtakeOffers?.find(c=>c.id===o.offtake),state=g.offtake?.[o.offtake];
 return !!offer && !!state && !state.settled && g.week<=offer.deadline && offer.mill===o.mill && offer.product===o.product;
}
export function validateOfftakeRegion(r:RegionDefinition) {
 if(r.offtakeOffers===undefined)return;
 if(!Array.isArray(r.offtakeOffers) || new Set(r.offtakeOffers.map(o=>o?.id)).size!==r.offtakeOffers.length)throw Error('Invalid offtake offers');
 for(const o of r.offtakeOffers){
  if(!o)throw Error('Invalid offtake terms');
  const mill=r.mills.find(m=>m.id===o.mill);
  if(o.agreement!==undefined && (typeof o.agreement!=='string'||!o.agreement.trim()||o.agreement.length>200))throw Error('Invalid agreement identifier');
  if(!o.id || typeof o.id!=='string' || o.id in Object.prototype || !o.company || typeof o.company!=='string' || !mill || !(o.product in mill.prices)
   || ![o.volume,o.priceM3,o.shortfallM3].every(n=>Number.isFinite(n)&&n>=0) || o.volume<=0
   || ![o.opens,o.acceptBy,o.deadline].every(Number.isInteger) || o.opens<1 || o.acceptBy<o.opens || o.deadline<o.acceptBy || o.deadline>r.weeks)throw Error('Invalid offtake terms');
  if(o.agreement && r.offtakeOffers.some(other=>other.agreement===o.agreement && (other.company!==o.company || other.opens!==o.opens || other.acceptBy!==o.acceptBy)))throw Error('Agreement legs must share a company and acceptance window.');
 }
}
export function validateOfftakeState(g:Game) {
 if(g.offtake===undefined){if(g.history.some(h=>Object.keys(h.offtakeDeliveries??{}).length))throw Error("Missing offtake state");return;}
 if(!g.offtake || typeof g.offtake!=='object' || Array.isArray(g.offtake))throw Error('Invalid offtake state');
 for(const [id,s] of Object.entries(g.offtake)){
  const agreement=g.region.offtakeOffers?.find(o=>o.id===id)?.agreement;
  if(agreement && g.region.offtakeOffers!.some(o=>o.agreement===agreement && g.offtake?.[o.id]?.acceptedWeek!==s.acceptedWeek))throw Error('Agreement legs must be accepted together.');
  const o=g.region.offtakeOffers?.find(o=>o.id===id);
  const recorded=g.history.reduce((n,h)=>n+(h.offtakeDeliveries?.[id]??0),0);
  if(!o || !Number.isInteger(s.acceptedWeek) || s.acceptedWeek<o.opens || s.acceptedWeek>o.acceptBy || s.acceptedWeek>g.week
   || !Number.isFinite(s.delivered) || s.delivered<0 || s.delivered>o.volume+1e-6 || Math.abs(recorded-s.delivered)>1e-5
   || typeof s.settled!=='boolean' || s.settled!==(g.week>o.deadline))throw Error('Inconsistent offtake state');
 }
 for(const h of g.history)for(const [id,n] of Object.entries(h.offtakeDeliveries??{})){
  const o=g.region.offtakeOffers?.find(o=>o.id===id),s=g.offtake[id];
  if(!o || !s || h.week<s.acceptedWeek || h.week>o.deadline || !Number.isFinite(n) || n<0)throw Error('Invalid offtake delivery record');
 }
}
