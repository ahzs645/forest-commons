import {createGame,draftPlan,advance,purchase,sum} from '../src/simulation/engine';
import {princeGeorge} from '../src/scenarios/prince-george';
// Paired teaching demonstration, not an optimizer: identical defaults; only
// opening private acquisition differs. No future weather or seed is inspected.
const results=[];
for(const acquire of [false,true])for(const salesPolicy of [undefined,'margin','contract-first','penalty-aware'] as const)for(const commitmentAware of (salesPolicy?[false,true]:[false])){
 let g=createGame(princeGeorge);const purchases:string[]=[],unaffordable:string[]=[];
 if(acquire)for(const s of g.region.stands.filter(s=>s.supply==='private').sort((a,b)=>a.askingPrice/a.volume-b.askingPrice/b.volume)){
  if(s.askingPrice>g.cash){unaffordable.push(s.id);continue;}
  g=purchase(g,s.id);purchases.push(s.id);
 }
 while(g.week<=g.region.weeks)g=advance(draftPlan(g,{salesPolicy,commitmentAware}));
 results.push({salesPolicy:salesPolicy??'toolbar-default',commitmentAware,policy:acquire?'Buy affordable private lots by asking price per standing m³, then draft':'Draft existing rights only',purchases,unaffordable,delivered:g.history.reduce((n,h)=>n+sum(h.delivered),0),harvest:g.history.reduce((n,h)=>n+sum(h.harvested),0),waste:g.history.reduce((n,h)=>n+h.waste,0),cash:g.cash,serviceChecks:g.history.reduce((n,h)=>n+h.targetChecks,0),serviceHits:g.history.reduce((n,h)=>n+h.targetHits,0)});
}
console.log(JSON.stringify({region:princeGeorge.id,assumptions:'Default weekly scenario; explicit dispatch settings are recorded for each case. Uses visible opening price and volume only. Buys only upfront-affordable private lots; no auctions or recovery actions. Not an optimal policy or calibrated operational forecast.',results},null,2));
