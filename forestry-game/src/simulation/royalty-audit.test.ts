import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,purchase,advance} from './engine';
import {illustrativeCalendar,beginLinkedSeason} from './season-calendar';
it('audit retains unpaid per-volume timber royalty after linking the next operating season',()=>{
 const r=structuredClone(quebec);r.economy.startingCash=100000000;r.economy.timberPayment='harvest-royalty';r.seasonCalendar=illustrativeCalendar(r);
 const lot=r.stands.find(s=>s.supply==='private')!;lot.terrain=1;
 let g=purchase(createGame(r),lot.id);
 while(g.week<=r.weeks)g=advance(g);
 g=beginLinkedSeason(g,13);
 g.crewPositions[r.crews[0].id]=lot.node;g.plan.crews[r.crews[0].id]=[{stand:lot.id,hours:1}];g=advance(g);
 const harvested=g.stands.find(s=>s.id===lot.id)!.harvested;expect(harvested).toBeGreaterThan(0);
 expect(g.history[0].ledger.filter(e=>e.category==='royalty').reduce((n,e)=>n+e.amount,0)).toBeCloseTo(-harvested*lot.askingPrice/lot.volume);
});
