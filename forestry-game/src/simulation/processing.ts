import {validateFacilityTransfers,facilityTransferProblems} from "./facility-transfers";
import {activeDisruptions} from "./disruptions";
import type {Game, RegionDefinition, Stock, WeekResult} from './types';
const total=(s:Stock)=>Object.values(s).reduce((n,v)=>n+v,0);
export function processingState(g:Game,mill:string) {
 g.processing??={};return g.processing[mill]??={input:{},output:{},received:0,processed:0,sold:{},residue:0};
}
export function receiveProcessing(g:Game,report:WeekResult,mill:string,product:string,volume:number) {
 const s=processingState(g,mill);s.input[product]=(s.input[product]??0)+volume;s.received+=volume;
 report.processing??={};report.processing[mill]??={received:0,processed:0,sold:{},residue:0};report.processing[mill].received+=volume;
}
export function runProcessing(g:Game,report:WeekResult,post:(category:string,description:string,amount:number)=>void) {
 for(const m of g.region.mills){
  const p=m.processing,order=g.plan.processing?.[m.id];if(!p||!order)continue;
  if(activeDisruptions(g,false).some(e=>e.kind==="mill"&&e.target===m.id)){report.messages.push(`${m.name}: processing and output sales suspended during shutdown.`);continue;}
  const state=processingState(g,m.id),volume=Math.min(order.volume,p.capacityM3,total(state.input));
  let left=volume;for(const id of Object.keys(state.input).sort()){const n=Math.min(left,state.input[id]);state.input[id]-=n;left-=n;}
  state.processed+=volume;
  const residue=volume*(1-p.outputs.reduce((n,o)=>n+o.yield,0));state.residue+=residue;
  for(const o of p.outputs)state.output[o.id]=(state.output[o.id]??0)+volume*o.yield;
  if(volume>0)post('processing',`${m.name} · ${volume.toLocaleString("en-CA",{maximumFractionDigits:1})} m³ processed`,-volume*p.costM3);
  const sold:Stock={};
  if(order.sell)for(const o of p.outputs){const n=Math.min(state.output[o.id]??0,o.weeklyDemand);if(n<=0)continue;
   state.output[o.id]-=n;state.sold[o.id]=(state.sold[o.id]??0)+n;sold[o.id]=n;
   post('finished-sales',`${m.name} · ${o.name} · ${n.toLocaleString("en-CA",{maximumFractionDigits:1})} input-equivalent m³`,n*o.price);
  }
  report.processing??={};report.processing[m.id]={received:report.processing[m.id]?.received??0,processed:volume,sold,residue};
 }
}
export function validateProcessingRegion(r:RegionDefinition) {
 for(const m of r.mills){const p=m.processing;if(p===undefined)continue;
  if(!p || !Array.isArray(p.inputs)||!p.inputs.length || new Set(p.inputs).size!==p.inputs.length || p.inputs.some(id=>!(id in m.prices))
    || ![p.capacityM3,p.costM3].every(n=>Number.isFinite(n)&&n>=0) || !Array.isArray(p.outputs)||!p.outputs.length || new Set(p.outputs.map(o=>o?.id)).size!==p.outputs.length
    || p.outputs.some(o=>!o||!o.id||typeof o.id!=='string'||o.id in Object.prototype||!o.name||typeof o.name!=='string'||![o.yield,o.price,o.weeklyDemand].every(n=>Number.isFinite(n)&&n>=0))
    || p.outputs.reduce((n,o)=>n+o.yield,0)>1+1e-10)throw Error('Invalid mill processing recipe');
 }
 validateFacilityTransfers(r);
}
export function processingPlanProblems(g:Game):string[] {
 const orders=g.plan.processing;if(orders===undefined)return facilityTransferProblems(g);
 if(!orders||typeof orders!=='object'||Array.isArray(orders))return ['Invalid mill processing orders.'];
 const issues:string[]=facilityTransferProblems(g);for(const [id,o] of Object.entries(orders)){
  const p=g.region.mills.find(m=>m.id===id)?.processing;
  if(!p||!o||!Number.isFinite(o.volume)||o.volume<0||o.volume>p.capacityM3||typeof o.sell!=='boolean')issues.push('Invalid mill processing order.');
 }return issues;
}
export function validateProcessingState(g:Game) {
 for(const h of g.history) {
  if(h.facilityTransfers!==undefined && (!Array.isArray(h.facilityTransfers)||h.facilityTransfers.some(t=>!t||!g.region.facilityTransfers?.some(l=>l.id===t.link)||!g.region.trucks.some(v=>v.id===t.truck)||!Number.isFinite(t.volume)||t.volume<=0||t.volume>g.region.trucks.find(v=>v.id===t.truck)!.payload)))throw Error("Invalid facility transfer report");
  const incoming:Stock={};for(const t of h.facilityTransfers??[]){const target=g.region.facilityTransfers!.find(l=>l.id===t.link)!.target;incoming[target]=(incoming[target]??0)+t.volume;}
  for(const [id,volume] of Object.entries(incoming))if(!h.processing?.[id]||h.processing[id].received+1e-6<volume)throw Error('Missing facility transfer receipt');
  if(h.processing!==undefined && (!h.processing || typeof h.processing!=="object" || Array.isArray(h.processing)))throw Error('Invalid mill report');
  for(const [id,row] of Object.entries(h.processing??{})) {
   const p=g.region.mills.find(m=>m.id===id)?.processing;
   if(!p||!row||![row.received,row.processed,row.residue].every(n=>Number.isFinite(n)&&n>=-1e-7)||row.processed>p.capacityM3+1e-7||!row.sold||typeof row.sold!=="object"||Array.isArray(row.sold)||Object.entries(row.sold).some(([id,n])=>{const o=p.outputs.find(o=>o.id===id);return !o||!Number.isFinite(n)||n<0||n>o.weeklyDemand+1e-7;})||row.received>total(h.millDeliveries[id]??{})+(h.facilityTransfers??[]).filter(t=>g.region.facilityTransfers?.find(l=>l.id===t.link)?.target===id).reduce((n,t)=>n+t.volume,0)+1e-6)throw Error('Invalid mill processing report');
  }
 }
 if(processingPlanProblems(g).length)throw Error('Invalid processing plan');
 if(g.processingOpening!==undefined && (!g.linkedSeason || !g.processingOpening || typeof g.processingOpening!=='object' || Array.isArray(g.processingOpening)))throw Error('Invalid opening mill inventories');
 for(const [id,s] of Object.entries(g.processingOpening??{})){
  const p=g.region.mills.find(m=>m.id===id)?.processing;
  if(!p||!s||![s.received,s.processed,s.residue].every(n=>Number.isFinite(n)&&n>=0)||![s.input,s.output,s.sold,s.transferred??{}].every(stock=>stock&&typeof stock==='object'&&!Array.isArray(stock)&&Object.values(stock).every(n=>Number.isFinite(n)&&n>=0)) || Math.abs(s.received-total(s.input)-s.processed)>1e-5 || Math.abs(s.processed-total(s.output)-total(s.sold)-total(s.transferred??{})-s.residue)>1e-5)throw Error('Invalid opening mill balance');
  if(Object.keys(s.input).some(id=>!p.inputs.includes(id))||[s.output,s.sold,s.transferred??{}].some(stock=>Object.keys(stock).some(id=>!p.outputs.some(o=>o.id===id))))throw Error('Invalid opening mill stock keys');
 }
 if(g.processing===undefined){if(g.processingOpening)throw Error('Missing carried mill inventories');if(g.history.some(h=>h.processing&&Object.keys(h.processing).length))throw Error('Missing mill inventories');return;}
 if(!g.processing||typeof g.processing!=='object'||Array.isArray(g.processing))throw Error('Invalid mill inventories');
 for(const id of new Set([...Object.keys(g.processingOpening??{}),...g.history.flatMap(h=>Object.keys(h.processing??{}))]))if(!g.processing[id])throw Error('Missing mill inventories');
 for(const [id,s] of Object.entries(g.processing)){
  const p=g.region.mills.find(m=>m.id===id)?.processing;
  const stock=(v:Stock,ids:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([id,n])=>ids.includes(id)&&Number.isFinite(n)&&n>=-1e-7);
  if(!p||!s||!stock(s.input,p.inputs)||!stock(s.output,p.outputs.map(o=>o.id))||!stock(s.sold,p.outputs.map(o=>o.id))||!stock(s.transferred??{},p.outputs.map(o=>o.id))||![s.received,s.processed,s.residue].every(n=>Number.isFinite(n)&&n>=-1e-7)
   ||Math.abs(s.received-total(s.input)-s.processed)>1e-5||Math.abs(s.processed-total(s.output)-total(s.sold)-total(s.transferred??{})-s.residue)>1e-5)throw Error('Mill material balance does not reconcile');
  for(const o of p.outputs){
    const transferred=g.history.reduce((n,h)=>n+(h.facilityTransfers??[]).filter(t=>{const l=g.region.facilityTransfers?.find(l=>l.id===t.link);return l?.source===id&&l.output===o.id;}).reduce((sum,t)=>sum+t.volume,0),g.processingOpening?.[id]?.transferred?.[o.id]??0);
    if(Math.abs(transferred-(s.transferred?.[o.id]??0))>1e-5)throw Error("Mill transfers do not reconcile");
    const sold=g.history.reduce((n,h)=>n+(h.processing?.[id]?.sold[o.id]??0),g.processingOpening?.[id]?.sold[o.id]??0);
    if(Math.abs(sold-(s.sold[o.id]??0))>1e-5)throw Error('Mill sales do not reconcile');
  }
  const received=g.history.reduce((n,h)=>n+(h.processing?.[id]?.received??0),g.processingOpening?.[id]?.received??0),processed=g.history.reduce((n,h)=>n+(h.processing?.[id]?.processed??0),g.processingOpening?.[id]?.processed??0);
  if(Math.abs(received-s.received)>1e-5||Math.abs(processed-s.processed)>1e-5)throw Error('Mill history does not reconcile');
 }
}
