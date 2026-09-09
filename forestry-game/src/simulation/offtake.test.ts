import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,sum} from './engine';
import {acceptOfftake,teachingOfftakeOffers} from './offtake';
import {parseGame,validateRegion} from './validation';
import {serializeGame} from './save-format';
function fixture(){
 const r=structuredClone(quebec);r.offtakeOffers=teachingOfftakeOffers(r);
 r.offtakeOffers[0].volume=20;r.offtakeOffers[0].deadline=2;r.offtakeOffers[0].acceptBy=1;
 const g=createGame(r),o=r.offtakeOffers[0],s=g.stands.find(s=>s.owned)!;
 const d=r.stands.find(d=>d.id===s.id)!;
 // A colocated receiving yard isolates accounting from network accessibility.
 r.mills.find(m=>m.id===o.mill)!.node=d.node;g.region=r;
 g.truckPositions[r.trucks[0].id]=d.node;
 s.remaining-=50;s.harvested+=50;s.stock=[{product:o.product,volume:50,week:1,quality:1}];
 return {g,o,s,truck:r.trucks[0].id};
}
describe('Campaign partner offtake',()=>{
 it('uses actual stock and one sales ledger, capped at contract volume',()=>{
  const {g,o,s,truck}=fixture();let next=acceptOfftake(g,o.id);
  next.plan.trucks[truck]=[{stand:s.id,mill:o.mill,product:o.product,loads:10,offtake:o.id}];
  next=advance(next);const h=next.history[0];
  expect(next.offtake![o.id].delivered).toBe(20);expect(sum(h.delivered)).toBe(20);
  expect(next.stands.find(x=>x.id===s.id)!.stock.reduce((n,b)=>n+b.volume,0)).toBe(30);
  expect(h.ledger.filter(e=>e.category==='sales')).toHaveLength(0);
  expect(h.ledger.find(e=>e.category==='offtake-sales')!.amount).toBeCloseTo(o.priceM3*20);
  expect(next.deliveries[o.mill]?.[o.product]??0).toBe(0);
 });
 it('settles shortfall once and survives normal save/reload',()=>{
  const r=structuredClone(quebec);r.offtakeOffers=teachingOfftakeOffers(r);const o=r.offtakeOffers[0];o.deadline=2;o.acceptBy=1;
  let g=acceptOfftake(createGame(r),o.id);g=advance(g);g=parseGame(serializeGame(g));g=advance(g);
  expect(g.history[1].ledger.find(e=>e.category==='offtake-shortfall')!.amount).toBe(-o.volume*o.shortfallM3);
  g=parseGame(serializeGame(g));g=advance(g);expect(g.history[2].ledger.some(e=>e.category==='offtake-shortfall')).toBe(false);
 });
 it('rejects duplicate acceptance, unaccepted orders and invalid terms',()=>{
  const {g,o,s,truck}=fixture();const accepted=acceptOfftake(g,o.id);expect(()=>acceptOfftake(accepted,o.id)).toThrow();
  g.plan.trucks[truck]=[{stand:s.id,mill:o.mill,product:o.product,loads:1,offtake:o.id}];expect(()=>advance(g)).toThrow();
  g.region.offtakeOffers![0].deadline=0;expect(()=>validateRegion(g.region)).toThrow();
 });
});

it('spot sales exceed finite demand without creating commitment credit or duplicate revenue',()=>{
 const {g,o,s,truck}=fixture();const mill=g.region.mills.find(m=>m.id===o.mill)!;
 mill.demand[0][o.product]=0;g.plan.targets[mill.id][o.product]=0;mill.spotPrices={[o.product]:25};
 g.plan.trucks[truck]=[{stand:s.id,mill:o.mill,product:o.product,loads:10,spot:true}];
 const result=advance(g),h=result.history[0];
 expect(sum(h.delivered)).toBe(50);expect(h.ledger.filter(e=>e.category==='spot-sales').reduce((n,e)=>n+e.amount,0)).toBe(1250);
 expect(result.deliveries[o.mill]?.[o.product]??0).toBe(0);
 expect(h.ledger.filter(e=>e.category==='sales')).toHaveLength(0);
});
