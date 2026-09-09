import type {Game, RegionDefinition, WeekResult} from './types';
import {activeDisruptions, operatingRegion} from './disruptions';
import {route, weatherAt} from './routing';
import {processingState, receiveProcessing} from './processing';
export function validateFacilityTransfers(r:RegionDefinition) {
 const links=r.facilityTransfers;if(links===undefined)return;
 if(!Array.isArray(links)||new Set(links.map(l=>l?.id)).size!==links.length)throw Error('Invalid facility transfer links');
 for(const l of links)if(!l||typeof l.id!=='string'||!l.id||l.source===l.target||l.inputEquivalentRatio!==1||!r.mills.find(m=>m.id===l.source)?.processing?.outputs.some(o=>o.id===l.output)||!r.mills.find(m=>m.id===l.target)?.processing?.inputs.includes(l.input))throw Error('Invalid facility transfer mapping');
}
export function facilityTransferProblems(g:Game):string[] {
 const orders=g.plan.facilityTransfers;if(orders===undefined)return [];
 if(!Array.isArray(orders)||orders.length>100)return ['Invalid facility transfer orders.'];
 return orders.some(o=>!o||!g.region.facilityTransfers?.some(l=>l.id===o.link)||!g.region.trucks.some(t=>t.id===o.truck)||!Number.isInteger(o.loads)||o.loads<1||o.loads>100)?['Invalid facility transfer order.']:[];
}
// Normal forest dispatch has priority. Only opening output stock is available:
// processing happens after these transfers, preventing same-week circular conversion.
export function runFacilityTransfers(g:Game,h:WeekResult,post:(category:string,description:string,amount:number)=>void){
 const r=operatingRegion(g,false),w=weatherAt(g),closed=activeDisruptions(g,false);
 for(const order of g.plan.facilityTransfers??[]){
  const link=r.facilityTransfers!.find(l=>l.id===order.link)!,t=r.trucks.find(t=>t.id===order.truck)!,from=r.mills.find(m=>m.id===link.source)!,to=r.mills.find(m=>m.id===link.target)!;
  if(closed.some(e=>e.kind==='mill'&&(e.target===from.id||e.target===to.id))){h.messages.push(`${link.id}: transfer suspended during facility shutdown.`);continue;}
  let delivered=0;
  for(let i=0;i<order.loads;i++){
   const s=processingState(g,from.id),volume=Math.min(t.payload,s.output[link.output]??0);if(volume<=0)break;
   const empty=route(r,g.truckPositions[t.id],from.node,w,g.improvedRoads),loaded=route(r,from.node,to.node,w,g.improvedRoads);if(!empty||!loaded)break;
   const hours=empty.hours+loaded.hours+t.loadingHours+t.unloadingHours;if((h.truckHours[t.id]??0)+hours>t.hours+1e-8)break;
   s.output[link.output]-=volume;s.transferred??={};s.transferred[link.output]=(s.transferred[link.output]??0)+volume;
   receiveProcessing(g,h,to.id,link.input,volume);h.facilityTransfers??=[];h.facilityTransfers.push({link:link.id,truck:t.id,volume});
   h.truckHours[t.id]=(h.truckHours[t.id]??0)+hours;h.truckActivity??={};const activity=h.truckActivity[t.id]??={travel:0,handling:0};activity.travel+=empty.hours+loaded.hours;activity.handling+=t.loadingHours+t.unloadingHours;
   g.truckPositions[t.id]=to.node;const km=empty.km+loaded.km;post('facility-haul',`${t.name}: ${from.name} → ${to.name}, ${volume.toFixed(1)} input-equivalent m³`,-km*t.costKm);h.emissions+=km*r.ecology.haulKgCO2Km;
   h.movements.push({resource:t.id,kind:'truck',path:[...empty.path,...loaded.path.slice(1)],km,hours,volume,from:empty.nodes[0],to:to.node});delivered+=volume;
  }
  if(!delivered)h.messages.push(`${link.id}: no transfer; check opening output stock, road access and remaining truck hours.`);
 }
}
/** Explicit opt-in teaching mapping; quantities conserve input-equivalent volume. */
export function withIllustrativeFacilityTransfer(region:RegionDefinition):RegionDefinition{
 const r=structuredClone(region),source=r.mills.find(m=>m.processing?.outputs.length),target=r.mills.find(m=>m.id!==source?.id&&m.processing?.inputs.length);
 if(!source||!target)throw Error('Configure two processing mills first.');
 const output=source.processing!.outputs.find(o=>/chips/i.test(o.id))??source.processing!.outputs.at(-1)!,input='transferred-chips';r.facilityTransfers??=[];
 if(!r.products.some(p=>p.id===input)){r.products.push({id:input,name:'Transferred by-product fibre',color:'#b89859',maxFreshWeeks:12});
  // This new product is mill by-product input, not additional harvested Crown timber.
  for(const tenure of Object.values(r.bcTenure?.stands??{}))if(tenure.stumpage.rates[input]===undefined)tenure.stumpage.rates[input]=0;
 }
 target.prices[input]=0;
 // Explicit teaching conversion: by-product fibre becomes a fibre product,
 // never another sawlog or a new chips-producing loop. Values are illustrative.
 target.processing={...target.processing!,inputs:[...new Set([...target.processing!.inputs,input])],outputs:[{id:'fibre-product',name:'Fibre product (illustrative)',yield:.9,price:90,weeklyDemand:target.processing!.capacityM3}]};
 const id=`${source.id}-${output.id}-${target.id}`;
 if(!r.facilityTransfers.some(l=>l.id===id))r.facilityTransfers.push({id,source:source.id,output:output.id,target:target.id,input,inputEquivalentRatio:1});
 return r;
}
