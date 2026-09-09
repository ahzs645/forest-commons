import type {Game,RegionDefinition} from './types';
import {operatingRegion,activeDisruptions} from './disruptions';
import {route,weatherAt} from './routing';
export function mobilizationQuote(game:Game,kind:'crew'|'truck',id:string,to:string){
 const policy=game.region.mobilization;
 if(!policy||game.week!==1||game.history.length||game.mobilization?.locked)throw Error('Pre-season positioning is closed.');
 if(!policy.allowedNodes.includes(to))throw Error('Choose an allowed staging node.');
 const resource=(kind==='crew'?game.region.crews:game.region.trucks).find(x=>x.id===id);
 if(!resource||resource.hours<=0||activeDisruptions(game).some(e=>e.kind===kind&&e.target===id))throw Error('Resource unavailable.');
 const from=(kind==='crew'?game.crewPositions:game.truckPositions)[id];
 if(from===to)throw Error('Resource is already at this node.');
 const path=route(operatingRegion(game),from,to,weatherAt(game,true),game.improvedRoads);
 if(!path)throw Error('No forecast-accessible staging route.');
 const crew=kind==='crew'?game.region.crews.find(c=>c.id===id):undefined;
 const hours=crew?path.km/crew.relocationSpeed:path.hours;
 const prior=(game.mobilization?.moves??[]).filter(m=>m.kind===kind&&m.resource===id).reduce((n,m)=>n+m.hours,0);
 if(prior+hours>policy.maxHoursPerResource+1e-8)throw Error('Pre-season mobilization time allowance exceeded.');
 const cost=policy.feePerMove+(crew?path.km*crew.relocationCostKm+hours*crew.hourlyCost:path.km*game.region.trucks.find(t=>t.id===id)!.costKm);
 return {kind,resource:id,from,to,km:path.km,hours,cost};
}
export function mobilize(game:Game,kind:'crew'|'truck',id:string,to:string):Game{
 const move=mobilizationQuote(game,kind,id,to),reserved=Object.values(game.plan.bids).reduce((a,b)=>a+b,0);
 if(game.cash-reserved<move.cost)throw Error('Insufficient uncommitted cash for mobilization.');
 const next=structuredClone(game);next.mobilization??={locked:false,moves:[]};next.mobilization.moves.push(move);
 (kind==='crew'?next.crewPositions:next.truckPositions)[id]=to;
 next.cash-=move.cost;next.instantLedger.push({category:'mobilization',description:`${kind} ${id}: ${move.from} → ${to}, ${move.km.toFixed(1)} km, ${move.hours.toFixed(1)} h`,amount:-move.cost});
 next.plan.ready={purchase:false,production:false,transport:false};return next;
}
export function validateMobilizationRegion(r:RegionDefinition){const p=r.mobilization;if(!p)return;if(!Array.isArray(p.allowedNodes)||!p.allowedNodes.length||new Set(p.allowedNodes).size!==p.allowedNodes.length||p.allowedNodes.some(id=>!r.roads.nodes.some(n=>n.id===id))||!Number.isFinite(p.maxHoursPerResource)||p.maxHoursPerResource<=0||!Number.isFinite(p.feePerMove)||p.feePerMove<0)throw Error('Invalid mobilization policy.');}
export function validateMobilization(game:Game){const m=game.mobilization;if(!m)return;const p=game.region.mobilization;if(!p||typeof m.locked!=='boolean'||!Array.isArray(m.moves)||m.moves.length>1000||(game.week>1&&!m.locked))throw Error('Invalid mobilization state.');const totals:Record<string,number>={};for(const x of m.moves){if(!x||!['crew','truck'].includes(x.kind)||!(x.kind==='crew'?game.region.crews:game.region.trucks).some(r=>r.id===x.resource)||!game.region.roads.nodes.some(n=>n.id===x.from)||!p.allowedNodes.includes(x.to)||[x.km,x.hours,x.cost].some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid mobilization record.');const key=x.kind+':'+x.resource;totals[key]=(totals[key]??0)+x.hours;if(totals[key]>p.maxHoursPerResource+1e-8)throw Error('Mobilization hours exceeded.');}}
