import { describe, it, expect } from 'vitest';
import { princeGeorge } from '../scenarios/prince-george';
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
   expect(stand.volume).toBe(Math.round(stand.hectares*120));
   expect(stand.polygon.length).toBeGreaterThan(5);
   expect(route(r,r.mills[0].node,stand.node,weatherAt(g))).not.toBeNull();
  }
  expect(quebec.roads.nodes.some(n=>n.id.startsWith('bc-'))).toBe(false);
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
