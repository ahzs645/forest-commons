import {it,expect} from 'vitest';
import {createGame,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {operatingWorksheetCSV} from './operating-worksheet';
it('exports only settled turns and leaves unevaluated ratios empty',()=>{
 const initial=createGame(quebec);
 expect(operatingWorksheetCSV(initial).split('\n')).toHaveLength(1);
 const game=advance(initial),before=JSON.stringify(game);
 const cells=operatingWorksheetCSV(game).split('\n')[1].split(',').map(s=>s.slice(1,-1));
 expect(cells[0]).toBe('1');expect(cells[2]).toBe('1');expect(cells[6]).toBe(String(game.history[0].cash));
 expect(cells[9]).toBe('');expect(cells[11]).toBe('');
 expect(JSON.stringify(game)).toBe(before);
});
it('preserves signed savings and physical duration with French column labels',()=>{
 const game=advance(createGame(quebec));game.region.turnDurationWeeks=.5;
 game.history[0].partnerSavings=-12.5;
 const csv=operatingWorksheetCSV(game,'fr');
 expect(csv).toContain('"semaines_ecoulees"');
 expect(csv.split('\n')[1]).toContain('"1","0.5","0.5","CAD"');
 expect(csv).toContain('"-12.5"');
});

it('exports recorded reservation fulfillment without turning missing legacy evidence into zero',()=>{
 const game=advance(createGame(quebec));
 const h=game.history[0];h.plan.reservations=[{id:'r1',stand:'Q01',mill:'M1',product:'soft-saw',volume:40,market:'ordinary'}];
 h.reservationFulfillment={r1:15};
 expect(operatingWorksheetCSV(game).split('\n')[1]).toMatch(/,"40","15","25"$/);
 expect(operatingWorksheetCSV(game,'fr')).toContain('reservations_realisees_m3');
 h.reservationFulfillment={};
 expect(operatingWorksheetCSV(game).split('\n')[1]).toMatch(/,"40","0","40"$/);
 delete h.reservationFulfillment;
 expect(operatingWorksheetCSV(game).split('\n')[1]).toMatch(/,"40","",""$/);
});
