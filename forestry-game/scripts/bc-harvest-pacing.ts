import {createGame,draftPlan,advance,purchase,sum} from '../src/simulation/engine';
import {princeGeorge} from '../src/scenarios/prince-george';
const results=[];
for(const scale of [1,.75,.5,.25]){
 let g=createGame(princeGeorge);
 for(const s of g.region.stands.filter(s=>s.supply==='private').sort((a,b)=>a.askingPrice/a.volume-b.askingPrice/b.volume))if(s.askingPrice<=g.cash)g=purchase(g,s.id);
 while(g.week<=g.region.weeks){
  g=draftPlan(g,{salesPolicy:'penalty-aware',commitmentAware:true});
  // A player can make this same reduction in the crew queues. Keep original
  // truck orders so the engine reveals stock/time constraints without clairvoyance.
  for(const orders of Object.values(g.plan.crews))for(const order of orders)order.hours*=scale;
  g=advance(g);
 }
 results.push({crewHourScale:scale,delivered:g.history.reduce((n,h)=>n+sum(h.delivered),0),harvest:g.history.reduce((n,h)=>n+sum(h.harvested),0),waste:g.history.reduce((n,h)=>n+h.waste,0),cash:g.cash,serviceHits:g.history.reduce((n,h)=>n+h.targetHits,0),serviceChecks:g.history.reduce((n,h)=>n+h.targetChecks,0)});
}
console.log(JSON.stringify({assumptions:'Same default BC weekly scenario and opening affordable private acquisitions. Penalty-aware capped dispatch. Uniform crew-hour scaling after drafting; no future truth used. Bounded policy demonstration, not optimization or calibration.',results},null,2));
