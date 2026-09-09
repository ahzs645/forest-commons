import { applyHarvestAuthorization, applyRoadAuthorization, harvestAuthorizationProblem, roadAuthorizationProblem } from "./tenure";
import type {Game,Weather} from './types';
import {advance,draftPlan,sum} from './engine';
export interface StudySettings {samples:number;seed:number;deliveryGoal:number;forecastReliability:number;demandSpread:number;riskWeight:number;standId?:string}
export interface StudyOutcome {sample:number;strategy:string;cashChange:number;delivered:number;waste:number;hits:number;checks:number;acquisitions:number;problem?:string}
export interface ProcurementStudy {settings:StudySettings;fromWeek:number;results:StudyOutcome[];summaries:ReturnType<typeof summarizeStudy>;assumptions:string[]}
export const bidStrategies=[{id:'no-bids',name:'No new bids',multiplier:0},{id:'discount',name:'Bid 90% of asking',multiplier:.9},{id:'asking',name:'Bid asking price',multiplier:1},{id:'premium',name:'Bid 120% of asking',multiplier:1.2}];
function rng(seed:number){let n=seed>>>0;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
export function validateStudy(g:Game,s:StudySettings){if(!Number.isInteger(s.samples)||s.samples<2||s.samples>64||!Number.isInteger(s.seed)||s.seed<0||s.seed>2147483647||!Number.isFinite(s.deliveryGoal)||s.deliveryGoal<0||!Number.isFinite(s.forecastReliability)||s.forecastReliability<0||s.forecastReliability>1||!Number.isFinite(s.demandSpread)||s.demandSpread<0||s.demandSpread>.8||!Number.isFinite(s.riskWeight)||s.riskWeight<0||s.riskWeight>5||s.standId&&!g.region.stands.some(d=>d.id===s.standId))throw Error('Invalid procurement experiment settings.');if(g.week>g.region.weeks)throw Error('Choose an unfinished operating season.');}
/** Independently sampled futures; original seed and actual future weather are never consulted. */
export function studyFuture(input:Game,settings:StudySettings,sample:number):Game{
 const g=structuredClone(input),random=rng(settings.seed+sample*7919),weathers:Weather[]=['thaw','wet','normal','frozen'];
 g.seed=Math.floor(random()*2147483647);g.roleMode=false;g.region.disruptions=g.region.disruptions?.filter(e=>e.revealWeek<=input.week);
 if(g.region.bcMarket)g.region.bcMarket.events=g.region.bcMarket.events.filter(e=>e.revealWeek<=1+(input.week-1)*(input.region.turnDurationWeeks??1));
 for(const scenario of Object.values(g.region.weather))for(const zone of g.region.zones){
  scenario.actual[zone.id]=[...scenario.forecast[zone.id]];
  for(let i=g.week-1;i<g.region.weeks;i++)scenario.actual[zone.id][i]=random()<settings.forecastReliability?scenario.forecast[zone.id][i]:weathers[Math.floor(random()*weathers.length)];
 }
 // Demand shocks apply only to future unsettled periods. Each trial's current
 // period stays as known; future demand is used only when its period begins.
 const current=Math.floor((g.week-1)/g.region.weeksPerMonth);
 for(const mill of g.region.mills)mill.demand=mill.demand.map((d,i)=>i<=current?d:Object.fromEntries(Object.entries(d).map(([p,n])=>[p,Math.round(n*(1-settings.demandSpread+random()*settings.demandSpread*2))])));
 return g;
}
export function simulateStudyStrategy(input:Game,s:StudySettings,sample:number,strategy:(typeof bidStrategies)[number]):StudyOutcome{
 let g=studyFuture(input,s,sample);const oldHistory=g.history.length,oldOwned=new Set(g.stands.filter(s=>s.owned).map(s=>s.id));let problem:string|undefined;
 try{while(g.week<=g.region.weeks){
  // Every strategy follows the same published application delays after acquisition.
  if(g.region.bcTenure){
   const owned=g.region.stands.filter(d=>g.stands.find(x=>x.id===d.id)?.owned&&d.supply!=='protected');
   for(const d of owned){const issue=harvestAuthorizationProblem(g,d.id);if(issue&&!issue.includes('pending'))g=applyHarvestAuthorization(g,d.id);}
   const nodes=new Set(owned.map(d=>d.node));
   for(const edge of g.region.roads.edges.filter(e=>nodes.has(e.from)||nodes.has(e.to))){const issue=roadAuthorizationProblem(g,edge.id);if(issue&&!issue.includes('pending'))g=applyRoadAuthorization(g,edge.id);}
  }
  g=draftPlan(g,{commitmentAware:true});g.plan.bids={};let funds=!g.region.bcTenure&&g.region.economy.timberPayment==='harvest-royalty'?Infinity:Math.max(0,g.cash+(g.region.economy.procurementCreditLimit??0));
  if(strategy.multiplier)for(const d of g.region.stands.filter(d=>d.supply==='auction'&&d.auctionWeek===g.week&&(!s.standId||s.standId===d.id)).sort((a,b)=>a.id.localeCompare(b.id))){const state=g.stands.find(x=>x.id===d.id)!;if(state.owned||state.refused)continue;const bid=Math.round(d.askingPrice*strategy.multiplier);if(bid<=funds){g.plan.bids[d.id]=bid;funds-=bid;}}
  g=advance(g);
 }}catch(e){problem=e instanceof Error?e.message:String(e);}
 const h=g.history.slice(oldHistory);return {sample,strategy:strategy.id,cashChange:g.cash-input.cash,delivered:h.reduce((n,h)=>n+sum(h.delivered),0),waste:h.reduce((n,h)=>n+h.waste,0),hits:h.reduce((n,h)=>n+h.targetHits,0),checks:h.reduce((n,h)=>n+h.targetChecks,0),acquisitions:g.stands.filter(s=>s.owned&&!oldOwned.has(s.id)).length,...(problem?{problem}:{})};
}
function quantile(v:number[],q:number){const sorted=[...v].sort((a,b)=>a-b);const i=(sorted.length-1)*q;return sorted[Math.floor(i)]+(sorted[Math.ceil(i)]-sorted[Math.floor(i)])*(i%1);}
function interval(hits:number,n:number){if(!n)return [0,1];const z=1.96,p=hits/n,d=1+z*z/n,mid=(p+z*z/(2*n))/d,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,mid-half),Math.min(1,mid+half)];}
export function summarizeStudy(results:StudyOutcome[],settings:StudySettings){return bidStrategies.map(strategy=>{const raw=results.filter(r=>r.strategy===strategy.id),rows=raw.filter(r=>!r.problem),n=rows.length;if(!n)return {id:strategy.id,name:strategy.name,n:0,failed:raw.length,mean:0,p05:0,loss:0,lossInterval:[0,1],shortfall:0,shortfallInterval:[0,1],delivered:0,incremental:null,pairedSamples:0,score:0};const cash=rows.map(r=>r.cashChange),mean=cash.reduce((a,b)=>a+b,0)/n,p05=quantile(cash,.05),loss=rows.filter(r=>r.cashChange<0).length,shortfall=rows.filter(r=>r.delivered<settings.deliveryGoal).length;const paired=rows.flatMap(r=>{const base=results.find(b=>b.sample===r.sample&&b.strategy==='no-bids'&&!b.problem);return base?[r.cashChange-base.cashChange]:[];});return {id:strategy.id,name:strategy.name,n,failed:raw.length-n,mean,p05,loss:loss/n,lossInterval:interval(loss,n),shortfall:shortfall/n,shortfallInterval:interval(shortfall,n),delivered:rows.reduce((n,r)=>n+r.delivered,0)/n,incremental:paired.length?paired.reduce((a,b)=>a+b,0)/paired.length:null,pairedSamples:paired.length,score:mean-settings.riskWeight*Math.max(0,-p05)};});}
export async function runProcurementStudy(g:Game,s:StudySettings,progress?:(completed:number,total:number)=>void):Promise<ProcurementStudy>{validateStudy(g,s);const results:StudyOutcome[]=[];for(let i=0;i<s.samples;i++)for(const strategy of bidStrategies){results.push(simulateStudyStrategy(g,s,i,strategy));progress?.(results.length,s.samples*bidStrategies.length);await new Promise(resolve=>setTimeout(resolve,0));}return {settings:structuredClone(s),fromWeek:g.week,results,summaries:summarizeStudy(results,s),assumptions:['BC policies submit required or expired authorizations for secured timber and its adjacent access roads, then wait the authored operating delays; acquisition does not imply immediate harvest access.', 'Four policies share identical sampled futures; only bidding differs. Existing bids are replaced within the experiment, never in the campaign.','Forecast reliability means probability of retaining the forecast; otherwise one of four categories is sampled uniformly. Independence is an authored teaching assumption.','Future-period demand is uniform within the chosen percentage range; current known demand remains unchanged. Unrevealed events are excluded.','Each policy uses the same forecast-based treatment/freight draft with a commitment cap; it does not optimize future crew queues or make private acquisitions. Saved future crew overrides may be activated but the adaptive draft replans at the next decision.','Auction rivals follow the engine’s synthetic 86–121% asking-price model and published BC market bid multiplier where configured, using an independent experiment seed. Unrevealed market events are excluded; results do not reveal actual rival bids.','Probability intervals are approximate 95% Wilson intervals; small sample counts are exploratory. Score = mean cash change − risk weight × negative fifth-percentile cash change. Cash includes remaining-season charges. Failed trials are reported, not silently treated as successes.']};}
