import {it,expect} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {createGame,draftPlan,advance,sum} from './engine';
import {acceptOfftake,teachingOfftakeOffers} from './offtake';
import {serializeGame} from './save-format';
import {parseGame} from './validation';
import {illustrativeCalendar,beginLinkedSeason} from './season-calendar';
it('completes and reloads a BC campaign with contracts, spot sales and processing, then carries mill inventories into a linked season',()=>{
 const r=structuredClone(princeGeorge);r.offtakeOffers=teachingOfftakeOffers(r);
 for(const m of r.mills)m.spotPrices=Object.fromEntries(Object.entries(m.prices).map(([id,n])=>[id,n*.8]));
 const mill=r.mills[0];mill.processing={inputs:Object.keys(mill.prices),capacityM3:500,costM3:18,outputs:[{id:'lumber',name:'Lumber equivalent',yield:.6,price:180,weeklyDemand:30},{id:'chips',name:'Chip equivalent',yield:.3,price:60,weeklyDemand:20}]};
 r.seasonCalendar=illustrativeCalendar(r);
 let g=acceptOfftake(createGame(r),r.offtakeOffers[0].id);
 for(let week=1;week<=12;week++){
  g=draftPlan(g,{salesPolicy:'contract-first'});
  if(week>=2&&week<=5){
   const truck=r.trucks.find(t=>g.plan.trucks[t.id].some(o=>mill.processing!.inputs.includes(o.product)));
   if(truck){const existing=g.plan.trucks[truck.id].find(o=>mill.processing!.inputs.includes(o.product))!;
    g.plan.trucks[truck.id]=[{stand:existing.stand,mill:mill.id,product:existing.product,loads:4,process:true}];}
   g.plan.processing={[mill.id]:{volume:500,sell:true}};
  }
  g=advance(g);g=parseGame(serializeGame(g));
  expect(g.cash).toBeCloseTo(r.economy.startingCash+g.history.flatMap(h=>h.ledger).reduce((n,e)=>n+e.amount,0),5);
 }
 expect(g.offtake![r.offtakeOffers[0].id].delivered).toBeGreaterThan(0);
 expect(g.processing![mill.id].processed).toBeGreaterThan(0);
 expect(g.stands.reduce((n,s)=>n+s.remaining+sum(Object.fromEntries(s.stock.map((b,i)=>[i,b.volume]))),0)+g.history.reduce((n,h)=>n+sum(h.delivered)+h.waste,0)).toBeCloseTo(r.stands.reduce((n,s)=>n+s.volume,0),4);
 const next=beginLinkedSeason(g,13);expect(next.processing).toEqual(g.processing);expect(parseGame(serializeGame(next)).processing).toEqual(g.processing);
},120000);
