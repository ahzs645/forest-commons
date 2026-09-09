import {it,expect} from 'vitest';
import {createGame,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {addReservation} from './reservations';
import {reservationForecast} from './reservation-forecast';
import {parseGame} from './validation';
it('forecasts competing reservations from actual production without double counting',()=>{
 let g=createGame(quebec);g.plan.crews.C1=[{stand:'Q01',hours:2}];
 g=addReservation(g,{stand:'Q01',product:'soft-saw',mill:'M1',market:'ordinary',volume:100});
 g=addReservation(g,{stand:'Q01',product:'soft-saw',mill:'M2',market:'ordinary',volume:100});
 g.plan.trucks.T1=[{stand:'Q01',product:'soft-saw',mill:'M1',loads:3},{stand:'Q01',product:'soft-saw',mill:'M2',loads:3}];
 const before=JSON.stringify(g),f=reservationForecast(g);expect(JSON.stringify(g)).toBe(before);
 const delivered=f.rows.reduce((n,r)=>n+(r.fulfilled??0),0);expect(delivered).toBeGreaterThan(0);expect(delivered).toBeLessThan(200);
 expect(f.rows[0].fulfilled).toBeGreaterThan(0);expect(f.rows[1].outstanding).toBe(100);expect(f.rows[0].target).toBe(g.plan.targets.M1['soft-saw']);
 const actual=advance(g);expect(()=>parseGame(JSON.stringify(actual))).not.toThrow();actual.history[0].reservationFulfillment!['reservation-1']=101;expect(()=>parseGame(JSON.stringify(actual))).toThrow();
});
it('keeps invalid-plan forecast quantities unknown rather than implying zero delivery',()=>{
 let g=addReservation(createGame(quebec),{stand:'Q01',product:'soft-saw',mill:'M1',market:'ordinary',volume:40});
 g.plan.crews.C1=[{stand:'Q01',hours:-1}];
 const f=reservationForecast(g);expect(f.problems.length).toBeGreaterThan(0);expect(f.rows[0].fulfilled).toBeNull();expect(f.rows[0].outstanding).toBeNull();
});

it('keeps requested quantities and targets but no fulfillment estimate for an incomplete role plan',()=>{
 const g=addReservation(createGame(quebec),{stand:'Q01',product:'soft-saw',mill:'M1',market:'ordinary',volume:40});
 const before=JSON.stringify(g),f=reservationForecast(g,false);
 expect(f.problems).toEqual([]);
 expect(f.rows[0]).toMatchObject({volume:40,fulfilled:null,outstanding:null,target:g.plan.targets.M1['soft-saw']});
 expect(JSON.stringify(g)).toBe(before);
});

it('records known zero fulfillment for a settled turn without transport',()=>{
 const g=addReservation(createGame(quebec),{stand:'Q01',product:'soft-saw',mill:'M1',market:'ordinary',volume:40});
 const settled=advance(g);
 expect(settled.history[0].reservationFulfillment).toEqual({});
 expect(parseGame(JSON.stringify(settled)).history[0].reservationFulfillment).toEqual({});
});
