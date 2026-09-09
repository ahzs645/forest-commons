import type {Game,RegionDefinition,Stock} from './types';
export interface BCMarketIndices {fuel:number;lumber:number;demand:number}
export interface BCMarketDefinition {
  note:string;
  initial:BCMarketIndices;
  events:{id:string;week:number;revealWeek:number;label:string;indices:BCMarketIndices}[];
  harvestFuelShare:number;
  haulFuelShare:number;
  bidFuelSensitivity:number;
  stumpage:{firstResetWeek:number;resetEveryWeeks:number;lagWeeks:number;lumberWeight:number;bidWeight:number;fuelWeight:number;minMultiplier:number;maxMultiplier:number};
}
export interface BCMarketState {lockedRates:Record<string,Stock>}
export interface BCMarketSnapshot extends BCMarketIndices {
  physicalWeek:number;
  bidIndex:number;
  stumpageMultiplier:number;
  lastResetWeek:number;
  rateSignalWeek:number;
  nextResetWeek:number;
  events:string[];
}
export const physicalMarketWeek=(g:Game,week=g.week)=>1+(week-1)*(g.region.turnDurationWeeks??1);
function indicesAt(g:Game,physicalWeek:number,knownOnly:boolean):BCMarketIndices {
  const m=g.region.bcMarket;
  if(!m)return {fuel:1,lumber:1,demand:1};
  const event=m.events.filter(e=>e.week<=physicalWeek+1e-9&&(!knownOnly||e.revealWeek<=physicalMarketWeek(g)+1e-9)).sort((a,b)=>a.week-b.week).at(-1);
  return event?.indices??m.initial;
}
function bidIndex(indices:BCMarketIndices,m:BCMarketDefinition):number {
  return Math.max(.2,indices.lumber*indices.demand-m.bidFuelSensitivity*(indices.fuel-1));
}
export function marketSnapshot(g:Game,week=g.week,knownOnly=true):BCMarketSnapshot {
  const m=g.region.bcMarket,physicalWeek=physicalMarketWeek(g,week),indices=indicesAt(g,physicalWeek,knownOnly);
  if(!m)return {...indices,physicalWeek,bidIndex:1,stumpageMultiplier:1,lastResetWeek:1,rateSignalWeek:1,nextResetWeek:Infinity,events:[]};
  const p=m.stumpage;
  const hasReset=physicalWeek+1e-9>=p.firstResetWeek;
  const lastResetWeek=hasReset?p.firstResetWeek+Math.floor((physicalWeek-p.firstResetWeek+1e-9)/p.resetEveryWeeks)*p.resetEveryWeeks:1;
  const rateSignalWeek=hasReset?Math.max(1,lastResetWeek-p.lagWeeks):1;
  const signal=indicesAt(g,rateSignalWeek,knownOnly);
  const stumpageMultiplier=hasReset?Math.max(p.minMultiplier,Math.min(p.maxMultiplier,1+p.lumberWeight*(signal.lumber-1)+p.bidWeight*(bidIndex(signal,m)-1)-p.fuelWeight*(signal.fuel-1))):1;
  return {...indices,physicalWeek,bidIndex:bidIndex(indices,m),stumpageMultiplier,lastResetWeek,rateSignalWeek,nextResetWeek:hasReset?lastResetWeek+p.resetEveryWeeks:p.firstResetWeek,events:m.events.filter(e=>e.week<=physicalWeek+1e-9&&(!knownOnly||e.revealWeek<=physicalMarketWeek(g)+1e-9)).map(e=>e.label)};
}
/** Applies authored economic indices once to an unadjusted scenario copy. */
export function effectiveMarketRegion(g:Game,base:RegionDefinition=g.region,week=g.week,knownOnly=true):RegionDefinition {
  const m=g.region.bcMarket;if(!m)return base;
  const current=marketSnapshot(g,week,knownOnly);
  const scale=(stock:Stock,n:number)=>Object.fromEntries(Object.entries(stock).map(([id,v])=>[id,v*n]));
  return {...base,
    stands:base.stands.map(s=>({...s,harvestCost:s.harvestCost*(1+m.harvestFuelShare*(current.fuel-1))})),
    trucks:base.trucks.map(t=>({...t,costKm:t.costKm*(1+m.haulFuelShare*(current.fuel-1))})),
    mills:base.mills.map(mill=>({...mill,prices:scale(mill.prices,current.lumber),...(mill.spotPrices?{spotPrices:scale(mill.spotPrices,current.lumber)}:{}),
      demand:mill.demand.map((d,i)=>scale(d,indicesAt(g,1+i*base.weeksPerMonth*(base.turnDurationWeeks??1),knownOnly).demand))})),
    ...(base.bcTenure?{bcTenure:{...base.bcTenure,stands:Object.fromEntries(Object.entries(base.bcTenure.stands).map(([id,d])=>[id,{...d,stumpage:{...d.stumpage,rates:d.stumpage.ratePolicy==='fixed-at-award'&&g.bcMarket?.lockedRates[id]?{...g.bcMarket.lockedRates[id]}:scale(d.stumpage.rates,current.stumpageMultiplier)}}]))}}:{}),
  };
}
export function lockAwardStumpage(g:Game,id:string,effective:RegionDefinition) {
  if(!g.region.bcMarket || g.region.bcTenure?.stands[id]?.stumpage.ratePolicy!=='fixed-at-award')return;
  g.bcMarket??={lockedRates:{}};
  g.bcMarket.lockedRates[id]={...effective.bcTenure!.stands[id].stumpage.rates};
}
export function validateBCMarketRegion(r:RegionDefinition) {
  const m=r.bcMarket;if(m===undefined)return;
  const fail=()=>{throw Error('Invalid scenario: BC market model');};
  const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const indices=(v:BCMarketIndices)=>v&&[v.fuel,v.lumber,v.demand].every(n=>number(n)&&n>0&&n<=10);
  if(!m||!r.bcTenure||typeof m.note!=='string'||!m.note||!indices(m.initial)||!Array.isArray(m.events)||m.events.length>1000||![m.harvestFuelShare,m.haulFuelShare].every(n=>number(n)&&n<=1)||!number(m.bidFuelSensitivity))fail();
  if(new Set(m.events.map(e=>e?.id)).size!==m.events.length ||new Set(m.events.map(e=>e?.week)).size!==m.events.length)fail();
  for(const e of m.events)if(!e||typeof e.id!=='string'||!e.id||typeof e.label!=='string'||!e.label||!number(e.week)||e.week<1||!number(e.revealWeek)||e.revealWeek<1||e.revealWeek>e.week||!indices(e.indices))fail();
  const p=m.stumpage;
  if(!p||![p.firstResetWeek,p.resetEveryWeeks,p.lagWeeks,p.lumberWeight,p.bidWeight,p.fuelWeight,p.minMultiplier,p.maxMultiplier].every(number)||p.firstResetWeek<=1||p.resetEveryWeeks<=0||p.minMultiplier<=0||p.maxMultiplier<p.minMultiplier)fail();
}
export function validateBCMarketState(g:Game) {
  if(!g.region.bcMarket){if(g.bcMarket)throw Error('Invalid save: unexpected BC market state');return;}
  const fail=()=>{throw Error('Invalid save: BC market state');};
  if(!g.bcMarket?.lockedRates)fail();
  for(const [id,rates] of Object.entries(g.bcMarket!.lockedRates)){
    if(!g.stands.some(s=>s.id===id)||g.region.bcTenure?.stands[id]?.stumpage.ratePolicy!=='fixed-at-award'||!rates||Object.keys(rates).length!==g.region.products.length||Object.entries(rates).some(([p,v])=>!g.region.products.some(d=>d.id===p)||!Number.isFinite(v)||v<0))fail();
  }
  for(const s of g.stands)if(s.owned&&g.region.bcTenure?.stands[s.id]?.stumpage.ratePolicy==='fixed-at-award'&&!g.bcMarket!.lockedRates[s.id])fail();
  if(!Array.isArray(g.history))fail();
  for(const report of g.history){const s=report.market;if(s===undefined)continue;
    if(!s||![s.physicalWeek,s.fuel,s.lumber,s.demand,s.bidIndex,s.stumpageMultiplier,s.lastResetWeek,s.rateSignalWeek,s.nextResetWeek].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)||Math.abs(s.physicalWeek-physicalMarketWeek(g,report.week))>1e-6||s.lastResetWeek>s.physicalWeek+1e-9||s.rateSignalWeek>s.lastResetWeek||s.nextResetWeek<=s.lastResetWeek||!Array.isArray(s.events)||s.events.some(label=>typeof label!=='string'||!label||label.length>1000))fail();
  }
}
