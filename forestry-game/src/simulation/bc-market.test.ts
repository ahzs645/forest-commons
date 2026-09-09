import {describe,it,expect} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {createGame,advance} from './engine';
import {effectiveMarketRegion,marketSnapshot,lockAwardStumpage,type BCMarketDefinition} from './bc-market';
import {operatingRegion} from './disruptions';
import {parseGame,validateRegion} from './validation';

const policy:BCMarketDefinition={note:'Authored test indices, not observed prices.',initial:{fuel:1,lumber:1,demand:1},events:[{id:'fuel',week:3,revealWeek:3,label:'Fuel rises',indices:{fuel:1.5,lumber:1,demand:1}},{id:'slump',week:5,revealWeek:5,label:'Lumber weakens',indices:{fuel:1.5,lumber:.8,demand:.75}},{id:'recovery',week:9,revealWeek:9,label:'Recovery',indices:{fuel:1,lumber:1.1,demand:1.1}}],harvestFuelShare:.3,haulFuelShare:.5,bidFuelSensitivity:.2,stumpage:{firstResetWeek:7,resetEveryWeeks:13,lagWeeks:2,lumberWeight:.5,bidWeight:.2,fuelWeight:.1,minMultiplier:.2,maxMultiplier:2}};
function game(){const r=structuredClone(princeGeorge);r.bcMarket=structuredClone(policy);for(const d of Object.values(r.bcTenure!.stands))if(d.stumpage.basis!=='none')d.stumpage.ratePolicy=d.type==='bcts-timber-sale'?'fixed-at-award':'adjustable';return createGame(r);}
describe('authored BC market timing',()=>{
 it('applies fuel and lumber signals without altering base region or advertised sale premium',()=>{
  const g=game();g.week=5;const effective=operatingRegion(g,false),base=g.region;
  expect(effective.stands[0].harvestCost).toBeCloseTo(base.stands[0].harvestCost*1.15);
  expect(effective.trucks[0].costKm).toBeCloseTo(base.trucks[0].costKm*1.25);
  expect(effective.mills[0].prices['soft-saw']).toBeCloseTo(base.mills[0].prices['soft-saw']*.8);
  expect(effective.stands.map(s=>s.askingPrice)).toEqual(base.stands.map(s=>s.askingPrice));
  expect(base.bcTenure!.stands[base.stands[0].id].stumpage.rates['soft-saw']).toBe(12);
  expect(marketSnapshot(g).bidIndex).toBeCloseTo(.5);
 });
 it('resets adjustable rates only at the physical boundary using lagged signals',()=>{
  const g=game();g.week=6;expect(marketSnapshot(g).stumpageMultiplier).toBe(1);
  g.week=7;const snapshot=marketSnapshot(g);expect(snapshot.lastResetWeek).toBe(7);expect(snapshot.rateSignalWeek).toBe(5);expect(snapshot.nextResetWeek).toBe(20);expect(snapshot.stumpageMultiplier).toBeCloseTo(.75);
  const id=g.region.stands[0].id;expect(effectiveMarketRegion(g).bcTenure!.stands[id].stumpage.rates['soft-saw']).toBeCloseTo(9);
  g.week=9;expect(marketSnapshot(g).stumpageMultiplier).toBeCloseTo(.75);
  g.region.turnDurationWeeks=.25;g.week=24;expect(marketSnapshot(g).stumpageMultiplier).toBe(1);g.week=25;expect(marketSnapshot(g).stumpageMultiplier).toBeCloseTo(.75);
 });
 it('holds awarded fixed rates across later reset and roundtrips lock state',()=>{
  const g=game(),id=g.region.stands.find(s=>s.supply==='auction')!.id;
  lockAwardStumpage(g,id,effectiveMarketRegion(g));
  expect(g.bcMarket!.lockedRates[id]['soft-saw']).toBe(12);
  g.week=7;expect(effectiveMarketRegion(g).bcTenure!.stands[id].stumpage.rates['soft-saw']).toBe(12);
  g.week=1;expect(parseGame(JSON.stringify(g)).bcMarket!.lockedRates[id]['soft-saw']).toBe(12);
 });
 it('keeps forecasts at published conditions and uses period-opening demand caps',()=>{
  const g=game();
  expect(marketSnapshot(g,7,true).fuel).toBe(1);expect(marketSnapshot(g,7,true).stumpageMultiplier).toBe(1);
  expect(marketSnapshot(g,7,false).fuel).toBe(1.5);
  g.week=4;const month0=g.region.mills[0].demand[0];expect(effectiveMarketRegion(g).mills[0].demand[0]).toEqual(month0);
  g.week=5;expect(effectiveMarketRegion(g).mills[0].demand[0]).toEqual(month0);
  const periodIndex=1;expect(effectiveMarketRegion(g).mills[0].demand[periodIndex]['soft-saw']).toBeCloseTo(g.region.mills[0].demand[periodIndex]['soft-saw']*.75);
 });
 it('records actual snapshots and rejects invalid indices',()=>{
  const g=advance(game());expect(g.history[0].market?.fuel).toBe(1);expect(parseGame(JSON.stringify(g)).history[0].market?.fuel).toBe(1);
  const r=structuredClone(g.region);r.bcMarket!.events[0].indices.fuel=-1;expect(()=>validateRegion(r)).toThrow('BC market');
  g.history[0].market!.fuel=NaN;expect(()=>parseGame(JSON.stringify(g))).toThrow('BC market');
 });
 it('crosses demand boundaries with valid default targets and initializes non-unit demand',()=>{
  let g=game();while(g.week<=g.region.weeks)g=advance(g);expect(g.week).toBe(13);expect(parseGame(JSON.stringify(g)).cash).toBe(g.cash);
  const r=structuredClone(g.region);r.bcMarket!.initial.demand=.8;const initial=createGame(r);expect(initial.plan.targets[r.mills[0].id]['soft-saw']).toBeCloseTo(r.mills[0].demand[0]['soft-saw']*.8);expect(()=>advance(initial)).not.toThrow();
 });
 it('uses lower market bid willingness at auction while preserving the published premium',()=>{
  let g=game();g.cash=1e8;g.region.economy.startingCash=1e8;while(g.week<5)g=advance(g);
  const d=g.region.stands.find(s=>s.supply==='auction')!;d.auctionWeek=5;g.plan.bids[d.id]=d.askingPrice*.7;
  const next=advance(g);expect(next.stands.find(s=>s.id===d.id)!.owned).toBe(true);expect(next.bcMarket!.lockedRates[d.id]['soft-saw']).toBe(12);
 });
});
