import { describe, it, expect } from 'vitest';
import { princeGeorge, PG_MERCHANTABLE_M3_PER_HA } from '../scenarios/prince-george';
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
   // Volume is VRI projected live volume at 17.5 cm × area; stands below the merchantability threshold are not offered.
   const inv=(vri.stands as Record<string,{liveM3PerHa175:number}>)[stand.id];
   expect(stand.volume).toBe(Math.max(1,Math.round(inv.liveM3PerHa175*stand.hectares)));
   if(inv.liveM3PerHa175<PG_MERCHANTABLE_M3_PER_HA)expect(stand.supply).toBe('protected');
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
