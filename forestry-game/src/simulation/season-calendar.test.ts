import {expect,it} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {advance,createGame,draftPlan,purchase} from './engine';
import {illustrativeCalendar,seasonWindow,beginLinkedSeason,settleLinkedSeason,validateLinkedSeason,validateSeasonCalendar} from './season-calendar';
import {validateStewardship} from './stewardship';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
const regional=()=>{const r=structuredClone(quebec);r.seasonCalendar=illustrativeCalendar(r);return r;};
it('slices a wrapping calendar and combines demand shares at source-period boundaries',()=>{
 const r=regional(),c=r.seasonCalendar!;
 c.weather.normal.forecast.north[51]='wet';c.weather.normal.forecast.north[0]='frozen';
 for(let i=0;i<13;i++)c.demand.M1[i]=Object.fromEntries(r.products.map(p=>[p.id,(i+1)*400]));
 const w=seasonWindow(r,52);
 expect(w.weather.normal.forecast.north.slice(0,2)).toEqual(['wet','frozen']);
 expect(w.mills.find(m=>m.id==='M1')!.demand[0][Object.keys(r.mills.find(m=>m.id==='M1')!.prices)[0]]).toBe(1600);
 expect(w.weeks).toBe(12);expect(()=>seasonWindow(r,53)).toThrow();
 c.weather.normal.actual.north.pop();expect(()=>validateSeasonCalendar(r)).toThrow();
});
it('clips overlapping events and keeps out-of-window events out',()=>{
 const r=regional(),event=r.seasonCalendar!.events[0];event.week=10;event.endWeek=15;event.revealWeek=9;
 const w=seasonWindow(r,13);expect(w.disruptions!.find(e=>e.id===event.id)).toMatchObject({week:1,endWeek:3,revealWeek:1});
 expect(seasonWindow(r,30).disruptions!.some(e=>e.id===event.id)).toBe(false);
});
it('carries a full operating year once, preserves rights and cash, and round-trips the next season',()=>{
 let g=beginLinkedSeason(createGame(regional()),13);const opening=g.linkedSeason!.opening;
 expect(g.cash).toBe(opening.cash);expect(()=>beginLinkedSeason(g,13)).toThrow();
 const altered=structuredClone(g);altered.stewardship!.cash+=100;expect(()=>validateLinkedSeason(altered)).toThrow();
 const granted=structuredClone(g);granted.region.stands[0].volume+=100;expect(()=>validateLinkedSeason(granted)).toThrow();
 while(g.week<=12)g=advance(draftPlan(g,{treatment:'thinning'}));
 const cash=g.cash,harvest=g.stands.reduce((n,s)=>n+s.harvested,0);g=settleLinkedSeason(g);
 expect(g.stewardship!.cash).toBe(cash);expect(g.stewardship!.year).toBe(2);
 expect(g.stewardship!.history[0].harvest).toBeCloseTo(harvest);
 expect(g.stewardship!.history[0].opening+g.stewardship!.history[0].growth-harvest).toBeCloseTo(g.stewardship!.history[0].closing);
 validateLinkedSeason(g);validateStewardship(g.linkedSeason!.baseRegion,g.stewardship!);
 expect(()=>settleLinkedSeason(g)).toThrow();
 g=parseGame(serializeGame(g));
 const annual=structuredClone(g.stewardship!);g=beginLinkedSeason(g,40);
 expect(g.cash).toBe(cash);expect(g.stewardship!.year).toBe(2);
 for(const s of g.stands)expect(s.remaining).toBe(annual.stands.find(t=>t.id===s.id)!.volume);
 expect(g.stands.filter(s=>s.owned).length).toBeLessThan(annual.stands.filter(s=>s.managed).length);
 expect(()=>parseGame(serializeGame(g))).not.toThrow();
},60000);

it('settles negative operating equity without imaginary planting and blocks an unfunded next season',()=>{
 let g=beginLinkedSeason(createGame(regional()),13);
 // Isolated zero-production low-budget fixture exercises normal ledger transitions.
 g.region.economy.startingCash=1;g.cash=1;g.linkedSeason!.opening.cash=1;g.linkedSeason!.opening.openingBudget=1;g.stewardship!.cash=1;g.stewardship!.openingBudget=1;
 while(g.week<=12)g=advance(g);
 expect(g.cash).toBeLessThan(0);g=settleLinkedSeason(g);
 expect(g.stewardship!.cash).toBe(g.cash);expect(()=>parseGame(serializeGame(g))).not.toThrow();expect(()=>beginLinkedSeason(g,13)).toThrow('nonnegative');
});

it('preserves purchased royalty basis through linking and charges actual linked harvest',()=>{
 const r=regional();r.economy.timberPayment='harvest-royalty';
 const lot=r.stands.find(s=>s.supply==='private')!;lot.terrain=1;
 let g=purchase(createGame(r),lot.id);const rate=lot.askingPrice/lot.volume;
 g=beginLinkedSeason(g,20);g=parseGame(serializeGame(g));
 expect(g.stands.find(s=>s.id===lot.id)).toMatchObject({owned:true,royaltyM3:rate});
 const crew=g.region.crews[0];g.crewPositions[crew.id]=lot.node;g.plan.crews[crew.id]=[{stand:lot.id,hours:1}];
 g=advance(g);const harvested=g.stands.find(s=>s.id===lot.id)!.harvested;expect(harvested).toBeGreaterThan(0);
 expect(g.history[0].ledger.filter(e=>e.category==='royalty'&&e.standId===lot.id).reduce((n,e)=>n+e.amount,0)).toBeCloseTo(-harvested*rate);
});

it('retains the original royalty rate after annual growth and a second operating window',()=>{
 const r=regional();r.economy.timberPayment='harvest-royalty';
 // Fund an idle first window so this isolates royalty carry rather than insolvency.
 r.economy.startingCash=1e7;
 const lot=r.stands.find(s=>s.supply==='private')!;lot.terrain=1;
 const rate=lot.askingPrice/lot.volume;
 let game=beginLinkedSeason(purchase(createGame(r),lot.id),20);
 while(game.week<=game.region.weeks)game=advance(game);
 const operatingCash=game.cash;
 game=settleLinkedSeason(game);
 expect(game.stewardship!.cash).toBe(operatingCash);
 const grown=game.stewardship!.stands.find(s=>s.id===lot.id)!.volume;
 expect(grown).toBeGreaterThan(lot.volume);
 game=beginLinkedSeason(parseGame(serializeGame(game)),40);
 expect(game.cash).toBe(operatingCash);
 expect(game.stands.find(s=>s.id===lot.id)).toMatchObject({owned:true,royaltyM3:rate,remaining:grown});
 const crew=game.region.crews[0];game.crewPositions[crew.id]=lot.node;
 game.plan.crews[crew.id]=[{stand:lot.id,hours:1}];
 game=advance(game);
 const harvested=game.stands.find(s=>s.id===lot.id)!.harvested;
 expect(harvested).toBeGreaterThan(0);
 const royalties=game.history[0].ledger.filter(e=>e.category==='royalty'&&e.standId===lot.id);
 expect(royalties.reduce((n,e)=>n+e.amount,0)).toBeCloseTo(-harvested*rate);
 expect(()=>parseGame(serializeGame(game))).not.toThrow();
});
