import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {quebec} from '../../forestry-game/src/scenarios/quebec.ts';
import {createGame,draftPlan,advance,sum} from '../../forestry-game/src/simulation/engine.ts';
import {serializeGame} from '../../forestry-game/src/simulation/save-format.ts';
import {parseGame} from '../../forestry-game/src/simulation/validation.ts';
import {forecastOutcome} from '../../forestry-game/src/simulation/planning.ts';
import {startStewardship,stewardshipYear,validateStewardship} from '../../forestry-game/src/simulation/stewardship.ts';
const rows:any[]=[];let g=createGame(quebec);g.plan.retention=.65;
while(g.week<=g.region.weeks){
 g=draftPlan(g);
 for(const orders of Object.values(g.plan.crews))for(const o of orders)o.treatment='thinning';
 const forecast=forecastOutcome(g); assert.equal(forecast.problems.length,0);
 g=advance(g);const r=g.history.at(-1)!;
 for(const s of g.stands){const d=g.region.stands.find(d=>d.id===s.id)!;assert(s.remaining>=d.volume*.65-.001);}
 rows.push({week:r.week,harvest:r.harvested,delivered:r.delivered,cash:r.cash,messages:r.messages,forecastHarvest:forecast.report?.harvested});
 g=parseGame(serializeGame(g));
}
let s=startStewardship(g);const managed=s.stands.filter(x=>x.managed);const finalId=managed[0].id;const thinIds=managed.slice(1,4).map(s=>s.id);
const checks:any[]=[];const reject=(label:string,fn:()=>any)=>{assert.throws(fn);checks.push(label)};
for(let year=1;year<=30;year++){
 const actions:any={};
 if(year===1)actions[finalId]='final';
 if(year===2)actions[finalId]='plant';
 if([1,6,11,16,21,26].includes(year))for(const id of thinIds)actions[id]='thin';
 if(year===2)reject('unaffordable planting rejected',()=>stewardshipYear(g.region,{...s,cash:0},{[finalId]:'plant'}));
 if(year===2)reject('early repeat harvest rejected',()=>stewardshipYear(g.region,s,{[thinIds[0]]:'thin'}));
 if(year===3)reject('repeat planting rejected',()=>stewardshipYear(g.region,s,{[finalId]:'plant'}));
 if(year===1){const protectedId=g.region.stands.find(x=>x.supply==='protected')!.id;reject('protected harvest rejected',()=>stewardshipYear(g.region,s,{[protectedId]:'final'}));}
 s=stewardshipYear(g.region,s,actions);s=JSON.parse(JSON.stringify(s));validateStewardship(g.region,s);
}
reject('year 31 rejected',()=>stewardshipYear(g.region,s,{}));
const result={strategy:'Forecast draft with 65% retained volume and thinning; no speculative procurement or disruption repair. Annual exercise: final harvest one owned stand then plant, thin three other owned stands every five years; rest others.',season:{cash:g.cash,harvest:g.history.reduce((n,r)=>n+sum(r.harvested),0),delivered:g.history.reduce((n,r)=>n+sum(r.delivered),0),weeks:rows},annual:{cash:s.cash,harvest:s.history.reduce((n,r)=>n+r.harvest,0),years:s.history,stands:s.stands},checks};
writeFileSync('../research/playthroughs/stewardship-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({season:{cash:g.cash,harvest:result.season.harvest,delivered:result.season.delivered},annual:{cash:s.cash,harvest:result.annual.harvest,habitat:s.history.at(-1)!.habitat},checks},null,2));
