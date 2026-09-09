import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';import {createGame} from './engine';
import {addReservation,dispatchableStock,consumeReservation,reservationProblems} from './reservations';
it('allocates scarce stock in reservation order without double counting across destinations',()=>{
 const g=createGame(quebec),stand=g.stands.find(s=>s.owned)!.id,m=quebec.mills[0],product=Object.keys(m.prices)[0];
 const other=quebec.mills.find(t=>t.id!==m.id&&product in t.prices)!;
 let n=addReservation(g,{stand,product,mill:m.id,market:'ordinary',volume:30});n=addReservation(n,{stand,product,mill:other.id,market:'ordinary',volume:40});
 const a={stand,product,mill:m.id,loads:1},b={stand,product,mill:other.id,loads:1};
 expect(dispatchableStock(n,a,50)).toBe(30);expect(dispatchableStock(n,b,50)).toBe(20);
 consumeReservation(n,a,30);expect(dispatchableStock(n,b,20)).toBe(20);expect(n.plan.reservations).toHaveLength(1);
 expect(dispatchableStock(n,{...b,spot:true},20)).toBe(0);
});
it('rejects reservations for unavailable markets and keeps normal unreserved shipping unchanged',()=>{
 const g=createGame(quebec),stand=g.stands.find(s=>s.owned)!.id,m=quebec.mills[0],product=Object.keys(m.prices)[0];
 expect(()=>addReservation(g,{stand,product,mill:m.id,market:'spot',volume:1})).toThrow();
 expect(dispatchableStock(g,{stand,product,mill:m.id,loads:1},42)).toBe(42);
 expect(reservationProblems(g)).toEqual([]);
});
