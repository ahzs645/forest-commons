import type { Game } from './types';
import { operatingRegion } from './disruptions';
import { route,weatherAt } from './routing';
export interface NetworkCompany {id:string;name:string}
export interface NetworkVehicle {id:string;company:string;node:string;payload:number;hours:number;costKm:number;handlingHours:number;fixedWeekly:number}
export interface NetworkCargo {id:string;company:string;from:string;to:string;volume:number;release:number;deadline:number;outsideCost:number}
export interface NetworkCase {companies:NetworkCompany[];vehicles:NetworkVehicle[];cargo:NetworkCargo[];start:number;weeks:number;note:string}
export interface NetworkLeg {week:number;job:string|null;from:string;to:string;emptyKm:number;loadedKm:number;hours:number;cost:number;returnKm:number}
export interface NetworkItinerary {vehicle:string;company:string;jobs:string[];legs:NetworkLeg[];cost:number}
export interface NetworkSolution {mode:'independent'|'pooled';status:'optimal-bounded-policy';cost:number;fixedCost:number;itineraries:NetworkItinerary[];outsourced:string[];companyCosts:Record<string,number>;columns:number}
export const NETWORK_LIMITS = { companies: 5, vehicles: 5, cargo: 10, weeks: 3 } as const;
/** Authored, finite teaching case. Does not withdraw stock or spend campaign cash. */
export function regionalNetworkCase(g:Game, companyCount = 3):NetworkCase {
 if(!Number.isInteger(companyCount)||companyCount<2||companyCount>NETWORK_LIMITS.companies)throw Error('Choose two to five network companies.');
 if(g.region.mills.length<companyCount||g.region.trucks.length<companyCount)throw Error(`This region needs ${companyCount} mills and trucks for the selected case size.`);
 const companies=g.region.mills.slice(0,companyCount).map((m,i)=>({id:`N${i+1}`,name:`Network company ${i+1} (${m.name})`}));
 if(companies.length<2||g.region.trucks.length<companies.length)throw Error('Network lab needs at least two mills and corresponding trucks.');
 const weeks=Math.min(3,g.region.weeks-g.week+1);if(weeks<1)throw Error('Start a campaign week to open a network case.');
 const vehicles=companies.map((c,i)=>{const t=g.region.trucks[i];return {id:t.id,company:c.id,node:g.region.mills[i].node,payload:t.payload,hours:t.hours,costKm:t.costKm,handlingHours:t.loadingHours+t.unloadingHours,fixedWeekly:t.fixedWeekly};});
 const cargo=companies.flatMap((c,i)=>Array.from({length:2},(_,j)=>({id:`L${i+1}-${j+1}`,company:c.id,from:g.region.mills[(i+1)%companies.length].node,to:g.region.mills[i].node,volume:Math.min(...vehicles.map(v=>v.payload)),release:g.week+Math.min(j,weeks-1),deadline:g.week+weeks-1,outsideCost:2500+j*100})));
 return {companies,vehicles,cargo,start:g.week,weeks,note:`Authored ownership and ${cargo.length} single-load transfer orders at regional mill nodes; CAD 2,500/2,600 outside-service quotes are teaching assumptions. Up to three campaign turns, at most two shipments per vehicle per turn, wait in place, and compulsory final depot return. Per-turn fixed costs apply to all available vehicles. Published forecast and revealed road closures are used; actual future weather is not read. Outside service is an exogenous guaranteed quote, not a simulated carrier. This finite lab does not alter campaign cargo, cash or consent.`};
}
export function validateNetworkCase(g:Game,n:NetworkCase){
 if(!n||!Array.isArray(n.companies)||!Array.isArray(n.vehicles)||!Array.isArray(n.cargo))throw Error('Case needs companies, vehicles and cargo arrays.');
 if(!Number.isInteger(n.start)||!Number.isInteger(n.weeks)||n.weeks<1||n.weeks>NETWORK_LIMITS.weeks||n.start<g.week||n.start+n.weeks-1>g.region.weeks||!n.vehicles.length||n.vehicles.length>NETWORK_LIMITS.vehicles||n.cargo.length>NETWORK_LIMITS.cargo||!n.companies.length||n.companies.length>NETWORK_LIMITS.companies)throw Error('Network case exceeds the bounded three-week, five-vehicle, ten-shipment policy.');
 const validId=(id:unknown)=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
 if(![...n.companies,...n.vehicles,...n.cargo].every(v=>v&&validId(v.id))||!n.companies.every(c=>typeof c.name==='string'&&c.name.length>0&&c.name.length<=500)||typeof n.note!=='string'||n.note.length>5000)throw Error('Invalid network identifiers or description.');
 const unique=(a:string[])=>new Set(a).size===a.length;
 if(!unique(n.companies.map(c=>c.id))||!unique(n.vehicles.map(c=>c.id))||!unique(n.cargo.map(c=>c.id)))throw Error('Duplicate network identifiers.');
 const company=(id:string)=>n.companies.some(c=>c.id===id),node=(id:string)=>g.region.roads.nodes.some(x=>x.id===id),positive=(v:number)=>Number.isFinite(v)&&v>0;
 if(!n.vehicles.every(v=>company(v.company)&&node(v.node)&&positive(v.payload)&&positive(v.hours)&&positive(v.costKm)&&positive(v.handlingHours)&&Number.isFinite(v.fixedWeekly)&&v.fixedWeekly>=0)||!n.cargo.every(c=>company(c.company)&&node(c.from)&&node(c.to)&&positive(c.volume)&&Number.isInteger(c.release)&&Number.isInteger(c.deadline)&&c.release>=n.start&&c.deadline>=c.release&&c.deadline<n.start+n.weeks&&positive(c.outsideCost)))throw Error('Invalid network fleet or cargo.');
}
export function enumerateItineraries(g:Game,n:NetworkCase,v:NetworkVehicle,pooled:boolean):NetworkItinerary[]{
 const all=new Map<string,NetworkItinerary>(),best=new Map<string,number>();
 const paths=new Map<string,ReturnType<typeof route>>();
 const path=(week:number,from:string,to:string)=>{const key=JSON.stringify([week,from,to]);if(!paths.has(key))paths.set(key,route(operatingRegion(g,true,week),from,to,weatherAt(g,true,week),g.improvedRoads));return paths.get(key)!;};
 function visit(index:number,position:string,jobs:string[],legs:NetworkLeg[],cost:number){
  const mask=JSON.stringify([...jobs].sort()),key=JSON.stringify([index,position,mask]);
  if((best.get(key)??Infinity)<=cost+1e-9)return;best.set(key,cost);
  if(index===n.weeks){const previous=all.get(mask);if(!previous||previous.cost>cost)all.set(mask,{vehicle:v.id,company:v.company,jobs:[...jobs],legs:structuredClone(legs),cost});return;}
  const week=n.start+index,last=index===n.weeks-1;
  const available=n.cargo.filter(c=>(pooled||c.company===v.company)&&!jobs.includes(c.id)&&c.release<=week&&c.deadline>=week&&c.volume<=v.payload);
  const choices:NetworkCargo[][]=[[],...available.map(c=>[c]),...available.flatMap(a=>available.filter(b=>b.id!==a.id).map(b=>[a,b]))];
  for(const deliveries of choices){
   let at=position,hours=0,charge=0,ok=true;const nextLegs:NetworkLeg[]=[];
   for(const cargo of deliveries){
    const empty=path(week,at,cargo.from),loaded=path(week,cargo.from,cargo.to);if(!empty||!loaded){ok=false;break;}
    const used=empty.hours+loaded.hours+v.handlingHours,cost=(empty.km+loaded.km)*v.costKm;
    nextLegs.push({week,job:cargo.id,from:at,to:cargo.to,emptyKm:empty.km,loadedKm:loaded.km,hours:used,cost,returnKm:0});hours+=used;charge+=cost;at=cargo.to;
   }
   if(!ok)continue;
   if(!nextLegs.length)nextLegs.push({week,job:null,from:at,to:at,emptyKm:0,loadedKm:0,hours:0,cost:0,returnKm:0});
   if(last){const back=path(week,at,v.node);if(!back)continue;const tail=nextLegs.at(-1)!;tail.returnKm=back.km;tail.hours+=back.hours;tail.cost+=back.km*v.costKm;tail.to=v.node;hours+=back.hours;charge+=back.km*v.costKm;at=v.node;}
   if(hours>v.hours+1e-9)continue;
   visit(index+1,at,[...jobs,...deliveries.map(c=>c.id)],[...legs,...nextLegs],cost+charge);
  }
 }
 visit(0,v.node,[],[],0);return [...all.values()];
}
export function solveNetwork(g:Game,n:NetworkCase,mode:'independent'|'pooled'):NetworkSolution {
 validateNetworkCase(g,n);
 const columns=n.vehicles.flatMap(v=>enumerateItineraries(g,n,v,mode==='pooled'));
 // Exact subset dynamic programming: one itinerary per vehicle, disjoint cargo.
 // A state retains the cheapest assignment for its delivered-shipment mask.
 // Uncovered shipments receive their quoted outside service at the terminal step.
 const cargoBits=new Map(n.cargo.map((c,i)=>[c.id,1<<i]));
 type Selection={cost:number;previous:Selection|null;itinerary:NetworkItinerary|null};
 let states=new Map<number,Selection>([[0,{cost:0,previous:null,itinerary:null}]]);
 for(const vehicle of n.vehicles){
  const options=columns.filter(c=>c.vehicle===vehicle.id).map(itinerary=>({itinerary,mask:itinerary.jobs.reduce((mask,id)=>mask|cargoBits.get(id)!,0)}));
  const next=new Map<number,Selection>();
  for(const [covered,selection] of states)for(const {itinerary,mask} of options){
   if(covered&mask)continue;
   const combined=covered|mask,cost=selection.cost+itinerary.cost;
   if(cost<(next.get(combined)?.cost??Infinity))next.set(combined,{cost,previous:selection,itinerary});
  }
  states=next;
 }
 let best:Selection|null=null,bestMask=0,bestCost=Infinity;
 for(const [mask,selection] of states){
  const total=selection.cost+n.cargo.reduce((sum,c,i)=>sum+((mask&(1<<i))?0:c.outsideCost),0);
  if(total<bestCost){bestCost=total;best=selection;bestMask=mask;}
 }
 if(!best)throw Error('No feasible bounded network schedule.');
 const itineraries:NetworkItinerary[]=[];
 for(let selected:Selection|null=best;selected?.itinerary;selected=selected.previous)itineraries.push(selected.itinerary);
 itineraries.reverse();
 const outsourced=n.cargo.filter((_,i)=>!(bestMask&(1<<i))).map(c=>c.id);
 const companyCosts=Object.fromEntries(n.companies.map(c=>[c.id,0]));let fixedCost=0;
 for(const v of n.vehicles){const fixed=v.fixedWeekly*n.weeks;fixedCost+=fixed;companyCosts[v.company]+=fixed;}
 for(const p of itineraries)companyCosts[p.company]+=p.cost;
 for(const id of outsourced){const c=n.cargo.find(c=>c.id===id)!;companyCosts[c.company]+=c.outsideCost;}
 // Independently verify integer selection and exact cover before reporting solver status.
 if(itineraries.length!==n.vehicles.length||n.vehicles.some(v=>itineraries.filter(p=>p.vehicle===v.id).length!==1)||n.cargo.some(c=>itineraries.filter(p=>p.jobs.includes(c.id)).length+Number(outsourced.includes(c.id))!==1))throw Error('Solver returned a nonintegral or incomplete network allocation.');
 return {mode,status:'optimal-bounded-policy',cost:Object.values(companyCosts).reduce((a,b)=>a+b,0),fixedCost,itineraries,outsourced,companyCosts,columns:columns.length};
}
export interface NetworkOffer {signature:string;costs:Record<string,number>;savings:Record<string,number>;accepted:string[];rejected:string[];status:'proposed'|'agreed'|'rejected'}
export function networkOffer(n:NetworkCase,independent:NetworkSolution,pooled:NetworkSolution,method:'equal'|'proportional'):NetworkOffer {
 const total=independent.cost-pooled.cost;if(total < -1e-5)throw Error('Pooling does not save money for this case.');
 const savings=Object.fromEntries(n.companies.map(c=>[c.id,Math.max(0,total)*(method==='equal'?1/n.companies.length:(independent.cost?independent.companyCosts[c.id]/independent.cost:1/n.companies.length))]));
 const costs=Object.fromEntries(n.companies.map(c=>[c.id,independent.companyCosts[c.id]-savings[c.id]]));
 if(Object.values(costs).some(v=>v<-.001))throw Error('Allocation assigns a negative company cost; choose proportional savings.');
 return {signature:JSON.stringify({n,independent,pooled}),costs,savings,accepted:[],rejected:[],status:'proposed'};
}
export function answerNetworkOffer(offer:NetworkOffer,company:string,accept:boolean):NetworkOffer {
 if(offer.status!=='proposed'||!(company in offer.costs))throw Error('Choose a company on an open network offer.');
 const next=structuredClone(offer);if(accept){if(!next.accepted.includes(company))next.accepted.push(company);if(next.accepted.length===Object.keys(next.costs).length)next.status='agreed';}else{next.rejected.push(company);next.status='rejected';}return next;
}
