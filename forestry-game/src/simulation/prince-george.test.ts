import { describe, it, expect } from 'vitest';
import { princeGeorge, pgMinimumM3PerHa, PG_RETENTION, PG_ASKING_M3 } from '../scenarios/prince-george';
import { estimatedWinningBid } from '../scenarios/interior-bid-equation';
import vri from '../data/prince-george-vri.json';
import { quebec } from '../scenarios/quebec';
import { validateRegion, parseGame } from './validation';
import { createGame, draftPlan, advance, sum, stockAt } from './engine';
import { serializeGame } from './save-format';
import { route, weatherAt } from './routing';

describe('Prince George FSR teaching scenario', () => {
 it('has a connected source FSR network, real polygons and explicitly fictional access/markets', () => {
  const r=validateRegion(princeGeorge);
  expect(r.id).not.toBe(quebec.id);expect(r.stands).toHaveLength(24);
  const fsr=r.roads.edges.filter(e=>e.id.startsWith('fsr-'));
  expect(fsr.reduce((n,e)=>n+e.km,0)).toBeCloseTo(83.2044,3);
  expect(fsr.every(e=>e.name.startsWith('FSR '))).toBe(true);
  expect(r.mills.every(m=>m.name.includes('fictional'))).toBe(true);
  const g=createGame(r);
  for(const stand of r.stands){
   // Volume is VRI projected live volume at 17.5 cm × area; stands below the TSA minimum are not offered.
   const inv=(vri.stands as unknown as Record<string,{liveM3PerHa175:number;species:[string,number][]}>)[stand.id];
   expect(stand.volume).toBe(Math.max(1,Math.round(inv.liveM3PerHa175*stand.hectares)));
   if(inv.liveM3PerHa175<pgMinimumM3PerHa(inv.species))expect(stand.supply).toBe('protected');
   expect(Object.values(stand.mix).reduce((a,b)=>a+b,0)).toBeCloseTo(1,9);
   expect(stand.polygon.length).toBeGreaterThan(5);
   expect(route(r,r.mills[0].node,stand.node,weatherAt(g))).not.toBeNull();
  }
  expect(quebec.roads.nodes.some(n=>n.id.startsWith('bc-'))).toBe(false);
  // Receiving businesses are off the stand spurs: every stand hauls at least 15 km to its nearest yard.
  for(const stand of r.stands.filter(s=>s.supply!=='protected'))
   expect(Math.min(...r.mills.map(m=>route(r,stand.node,m.node,weatherAt(g))?.km??Infinity))).toBeGreaterThan(15);
  // Season demand for each product stays within what the offered stands grow.
  for(const p of r.products){
   const supply=r.stands.filter(s=>s.supply!=='protected').reduce((n,s)=>n+s.volume*(s.mix[p.id]??0),0);
   const demand=r.mills.reduce((n,m)=>n+m.demand.reduce((t,month)=>t+(month[p.id]??0),0),0);
   expect(demand).toBeLessThanOrEqual(supply*.6);
  }
 });
 it('applies the TSA minimum volumes and prices lots from the 2010 bid equation', () => {
  // Plans must leave at least the TSA median retention standing.
  expect(princeGeorge.ecology.minimumRetention).toBe(PG_RETENTION);expect(createGame(princeGeorge).plan.retention).toBe(.121);
  // Pine-leading stands need 140 m³/ha, all others 182 m³/ha.
  expect(pgMinimumM3PerHa([['PLI',60],['SX',40]])).toBe(140);
  expect(pgMinimumM3PerHa([['SX',60],['PLI',40]])).toBe(182);
  const byId=Object.fromEntries(princeGeorge.stands.map(s=>[s.id,s]));
  // BC01 (110.6 m³/ha, aspen-leading) and BC04 (161.9) fall below 182.
  expect(byId.BC01.supply).toBe('protected');expect(byId.BC04.supply).toBe('protected');
  expect(byId.BC01.unavailableReason).toBe('Below 182 m³/ha (TSA minimum)');
  const offered=princeGeorge.stands.filter(s=>s.supply!=='protected');
  expect(offered.filter(s=>s.supply==='auction')).toHaveLength(5);
  expect(offered.filter(s=>s.supply==='private')).toHaveLength(8);
  expect(offered.filter(s=>s.supply==='guaranteed').map(s=>s.id)).toEqual(['BC02','BC03','BC06','BC07']);
  // Asking prices average the pilot's 9 $/m³ over offered volume but vary by lot.
  const perM3=offered.map(s=>s.askingPrice/s.volume);
  expect(offered.reduce((n,s)=>n+s.askingPrice,0)/offered.reduce((n,s)=>n+s.volume,0)).toBeCloseTo(PG_ASKING_M3,0);
  expect(Math.max(...perM3)-Math.min(...perM3)).toBeGreaterThan(4);
  // The small-tree, half-deciduous auction lot is priced well below the large-tree lot.
  expect(byId.BC21.askingPrice/byId.BC21.volume).toBeLessThan(.6*byId.BC23.askingPrice/byId.BC23.volume);
  // Each offered lot explains its price: BC21 is cheap mainly for its deciduous share, BC23 is capped.
  expect(offered.every(s=>s.priceBasis?.factors.length===6)).toBe(true);
  expect(byId.BC21.priceBasis!.factors[0]).toMatchObject({factor:'deciduous',value:.48});
  expect(byId.BC21.priceBasis!.factors[0].effect).toBeLessThan(0);
  expect(byId.BC23.priceBasis!.capped).toBe('upper');
  expect(byId.BC01.priceBasis).toBeUndefined();
  // Malformed price explanations are rejected.
  const bad=structuredClone(princeGeorge);bad.stands.find(s=>s.id==='BC21')!.priceBasis!.factors[0].factor='colour' as never;
  expect(()=>validateRegion(bad)).toThrow();
 });
 it('reproduces the 2010 bid equation terms', () => {
  // Every log term at 1 (zero), all fractions 0: the constant, the price and exchange terms, and the district term.
  const lot={coniferM3:1000,coniferM3PerHa:1,m3PerTree:1,hembal:0,cedar:0,decay:0,beetleAttack:0,slopePct:0,cycleHours:0,danb:0};
  expect(estimatedWinningBid(lot,{sellingPriceIndex:0,usdPerCad:0,cpi:109.3})).toBeCloseTo(32.85,6);
  expect(estimatedWinningBid({...lot,danb:3.6,cycleHours:2},{sellingPriceIndex:100,usdPerCad:.8,cpi:109.3})).toBeCloseTo(32.85+15.2-9.488+3.1356-2.02,6);
  // Real dollars scale by CPI ÷ 109.3, and the result never falls below 0.25.
  expect(estimatedWinningBid(lot,{sellingPriceIndex:0,usdPerCad:0,cpi:218.6})).toBeCloseTo(2*(32.85),6);
  expect(estimatedWinningBid({...lot,hembal:5},{sellingPriceIndex:0,usdPerCad:0,cpi:109.3})).toBe(.25);
 });
 it.each(Object.keys(princeGeorge.weather))('finishes %s with conserved stock/cash and regional save roundtrips', weather => {
  let g=createGame(princeGeorge,weather,47);
  const original=g.region.stands.reduce((n,s)=>n+s.volume,0);
  for(let week=1;week<=g.region.weeks;week++){
   g=advance(draftPlan(g));
   const standing=g.stands.reduce((n,s)=>n+s.remaining,0);
   const stock=g.stands.reduce((n,s)=>n+sum(stockAt(g,s.id)),0);
   const delivered=g.history.reduce((n,h)=>n+sum(h.delivered),0),waste=g.history.reduce((n,h)=>n+h.waste,0);
   expect(standing+stock+delivered+waste).toBeCloseTo(original,4);
   expect(g.cash).toBeCloseTo(g.region.economy.startingCash+g.instantLedger.reduce((n,l)=>n+l.amount,0)+g.history.flatMap(h=>h.ledger).reduce((n,l)=>n+l.amount,0),4);
   g=parseGame(serializeGame(g));expect(g.region.id).toBe(princeGeorge.id);
  }
  expect(g.week).toBe(13);
  expect(serializeGame(g).length * 2).toBeLessThan(3_000_000);
  expect(g.history.reduce((n,h)=>n+sum(h.delivered),0)).toBeGreaterThan(10000);
  expect(()=>advance(g)).toThrow('complete');
 },300000);
});
