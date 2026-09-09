import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {quebec} from '../../forestry-game/src/scenarios/quebec.ts';
import {createGame,draftPlan,advance,purchase,sum,planProblems} from '../../forestry-game/src/simulation/engine.ts';
import {forecastOutcome,learningProgress} from '../../forestry-game/src/simulation/planning.ts';
import {activeDisruptions,respondToDisruption} from '../../forestry-game/src/simulation/disruptions.ts';
import {appraise,procurementWindows} from '../../forestry-game/src/simulation/appraisal.ts';
import {serializeGame} from '../../forestry-game/src/simulation/save-format.ts';
import {parseGame} from '../../forestry-game/src/simulation/validation.ts';
import {rollingForecast} from '../../forestry-game/src/simulation/harvest-planning.ts';
let g=createGame(quebec);const log:any[]=[];
// Policy observes current state, published forecast, current auction listings only.
// No actual weather or seed is read by decision code. Simulator resolves actuals.
for(let week=1;week<=12;week++){
 const decisions:string[]=[];
 if(week===1){
  const candidate=g.region.stands.filter(s=>s.supply==='private'&&s.askingPrice<g.cash*.2&&procurementWindows(g,s.id).some(w=>w.terrain&&w.destinations.length)).sort((a,b)=>appraise(g,b.id).max-appraise(g,a.id).max)[0];
  g=purchase(g,candidate.id);decisions.push(`Buy ${candidate.id} for ${candidate.askingPrice}, positive forecast access and best appraised upside under 20% cash.`);
 }
 for(const e of activeDisruptions(g)){
  const action=e.kind==='truck'?'repair':'wait';
  g=respondToDisruption(g,e.id,action);decisions.push(`${action} ${e.id}`);
 }
 g=draftPlan(g);
 // Commitments are calibrated only at start of month to a published forecast rehearsal.
 if((week-1)%4===0){
  const reports=rollingForecast(g,4).reports;
  for(const m of g.region.mills)for(const p of g.region.products){
   const forecast=reports.reduce((n,r)=>n+(r.millDeliveries[m.id]?.[p.id]??0),0);
   g.plan.targets[m.id][p.id]=Math.min(m.demand[Math.floor((week-1)/4)][p.id]??0,Math.round(forecast/10)*10);
  }
  decisions.push('Set monthly targets from four-week forecast rehearsal, rounded to 10 m³.');
 }
 // Compare reverse priority on each truck using forecast service first, delivery second.
 const score=(r:any)=>r?Object.entries(g.plan.targets).reduce((n,[mid,stock])=>n+Object.entries(stock as any).reduce((v,[p,t])=>v+Math.min(Math.max(0,(t as number)-(g.deliveries[mid]?.[p]??0)),r.millDeliveries[mid]?.[p]??0),0),0)*100+sum(r.delivered):-Infinity;
 for(const t of g.region.trucks){if(g.plan.trucks[t.id].length>1){const alt=structuredClone(g);alt.plan.trucks[t.id].reverse();if(score(forecastOutcome(alt).report)>score(forecastOutcome(g).report)){g=alt;decisions.push(`Reverse ${t.id} queue to prioritize forecast commitments.`);}}}
 if(week<=6){const lot=g.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek===week&&appraise(g,s.id).max>s.askingPrice*2);if(lot){const bid=Math.round(lot.askingPrice*1.05);if(bid<g.cash*.12){g.plan.bids[lot.id]=bid;decisions.push(`Bid ${bid} for ${lot.id}; 5% above asking, no rival information.`);}}}
 const preview=forecastOutcome(g);assert.equal(preview.problems.length,0);assert.equal(planProblems(g).length,0);
 const before=serializeGame(g);g=parseGame(before);assert.equal(serializeGame(g),before);
 g=advance(g);const r=g.history.at(-1)!;
 log.push({week,decisions,forecastDelivery:sum(preview.report!.delivered),harvested:sum(r.harvested),delivered:sum(r.delivered),waste:r.waste,cash:r.cash,hits:r.targetHits,checks:r.targetChecks,messages:r.messages,targets:r.plan.targets});
 const packed=serializeGame(g);g=parseGame(packed);assert.equal(serializeGame(g),packed);
}
const result={kind:'Programmatic simulation API playthrough, not browser playtesting',strategy:'Adaptive service, forecast-only decisions, monthly targets from four-week rehearsal',weekly:log,objectives:learningProgress(g),final:{cash:g.cash,delivered:g.history.reduce((n,w)=>n+sum(w.delivered),0),harvested:g.history.reduce((n,w)=>n+sum(w.harvested),0),waste:g.history.reduce((n,w)=>n+w.waste,0),hits:g.history.reduce((n,w)=>n+w.targetHits,0),checks:g.history.reduce((n,w)=>n+w.targetChecks,0)}};
writeFileSync(new URL('./operations-adaptive-results.json',import.meta.url),JSON.stringify(result,null,2));
writeFileSync(new URL('./operations-adaptive-save.json',import.meta.url),serializeGame(g));
console.log(JSON.stringify({final:result.final,objectives:result.objectives,weekly:log.map(({week,delivered,hits,checks,decisions})=>({week,delivered,hits,checks,decisions}))},null,2));
