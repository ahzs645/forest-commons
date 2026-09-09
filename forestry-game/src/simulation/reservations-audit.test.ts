import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,draftPlan,advance} from './engine';
import {addReservation} from './reservations';
it('audit draft accounts for partial reserved loads and preserves stock for the next reserved destination',()=>{
 const r=structuredClone(quebec),a=r.mills[0],product=Object.keys(a.prices)[0],b=r.mills.find(m=>m.id!==a.id&&product in m.prices)!,d=r.stands.find(s=>s.supply==='guaranteed')!;
 for(const crew of r.crews)crew.hours=0;
 a.node=d.node;b.node=d.node;a.prices[product]=1000;b.prices[product]=100;
 let g=createGame(r),s=g.stands.find(s=>s.id===d.id)!;s.remaining-=100;s.harvested+=100;s.stock=[{product,volume:100,quality:1,week:1}];
 for(const truck of r.trucks)g.truckPositions[truck.id]=d.node;
 g=addReservation(g,{stand:d.id,product,mill:a.id,volume:10,market:'ordinary'});
 g=addReservation(g,{stand:d.id,product,mill:b.id,volume:90,market:'ordinary'});
 const before=structuredClone(g);
 const draft=draftPlan(g);
 // Planning must reserve projected stock without consuming the saved promises.
 expect(g).toEqual(before);
 expect(draft.plan.reservations).toEqual(before.plan.reservations);
 const next=advance(draft);
 expect(next.history[0].millDeliveries[a.id]?.[product]).toBe(10);
 expect(next.history[0].millDeliveries[b.id]?.[product]).toBe(90);
});
