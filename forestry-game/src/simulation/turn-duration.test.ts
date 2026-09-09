import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {halfWeekScenario,subdividedScenario,turnClock} from './turn-duration';
import {createGame,advance,refuse} from './engine';
import {validateRegion,parseGame} from './validation';
import {beginLinkedSeason} from './season-calendar';
describe('explicit half-week scenario clock',()=>{
 it('preserves physical horizon, demand periods and physical rates while scaling turn budgets',()=>{const r=halfWeekScenario(quebec);expect(validateRegion(r)).toEqual(r);expect(r.weeks*.5).toBe(quebec.weeks);expect(r.weeksPerMonth*.5).toBe(quebec.weeksPerMonth);expect(r.crews[0].hours*2).toBe(quebec.crews[0].hours);expect(r.trucks[0].loadingHours).toBe(quebec.trucks[0].loadingHours);expect(r.mills[0].demand).toEqual(quebec.mills[0].demand);expect(r.products[0].maxFreshWeeks*.5).toBe(quebec.products[0].maxFreshWeeks);expect(r.seasonCalendar).toBeUndefined();expect(quebec.turnDurationWeeks).toBeUndefined();});
 it('maps source opening/closing boundaries and repeats actual and forecast weather',()=>{const source=structuredClone(quebec);source.disruptions=[{id:'test',title:'Test',description:'Test',kind:'truck',target:source.trucks[0].id,week:2,endWeek:3,revealWeek:1,repairWeeks:1,repairCost:20}];const r=halfWeekScenario(source);expect(r.disruptions![0]).toMatchObject({week:3,endWeek:6,revealWeek:1,repairWeeks:2});for(const z of r.zones)expect(r.weather[Object.keys(r.weather)[0]].forecast[z.id].slice(0,2)).toEqual(Array(2).fill(source.weather[Object.keys(r.weather)[0]].forecast[z.id][0]));for(const lot of source.stands.filter(s=>s.supply==='auction'))expect(r.stands.find(s=>s.id===lot.id)!.auctionWeek).toBe(lot.auctionWeek*2);});
 it('charges equal idle recurring costs and annual interest over equal elapsed time',()=>{const source=structuredClone(quebec);source.economy.annualDebtRate=.2;source.economy.fixedWeekly=0;for(const t of source.trucks)t.fixedWeekly=0;const a=createGame(source),b=createGame(halfWeekScenario(source));a.cash=-100;b.cash=-100;const weekly=advance(a),half=advance(advance(b));expect(half.cash).toBeCloseTo(weekly.cash,7);expect(turnClock(half)).toMatchObject({label:'Turn',elapsedWeeks:1,duration:.5});const noInterest=structuredClone(quebec);noInterest.economy.annualDebtRate=0;expect(advance(advance(createGame(halfWeekScenario(noInterest)))).cash).toBeCloseTo(advance(createGame(noInterest)).cash,7);});
 it('keeps half-week save identity and disallows annual linkage or repeated conversion',()=>{const g=createGame(halfWeekScenario(quebec));expect(parseGame(JSON.stringify(g)).region.turnDurationWeeks).toBe(.5);expect(()=>halfWeekScenario(g.region)).toThrow();expect(()=>beginLinkedSeason(g,13)).toThrow('unavailable');});
 it('retains one physical week to refuse an unused won lot',()=>{let g=createGame(halfWeekScenario(quebec));const lot=g.region.stands.find(s=>s.supply==='auction')!,s=g.stands.find(s=>s.id===lot.id)!;s.owned=true;s.purchaseWeek=2;s.purchasePaid=100;g.week=4;expect(refuse(g,lot.id).stands.find(s=>s.id===lot.id)!.refused).toBe(true);g.week=5;expect(()=>refuse(g,lot.id)).toThrow();});
});

describe('quarter-week and daily scenario clocks',()=>{
 for(const divisions of [4,7] as const)it(`preserves physical rates and deadlines with ${divisions} turns per week`,()=>{
  const source=structuredClone(quebec),r=subdividedScenario(source,divisions);
  expect(validateRegion(r)).toEqual(r);expect(r.weeks/divisions).toBe(source.weeks);expect(r.weeksPerMonth/divisions).toBe(source.weeksPerMonth);
  expect(r.crews[0].hours*divisions).toBeCloseTo(source.crews[0].hours);expect(r.trucks[0].hours*divisions).toBeCloseTo(source.trucks[0].hours);expect(r.products[0].maxFreshWeeks/divisions).toBe(source.products[0].maxFreshWeeks);
  expect(r.mills[0].demand).toEqual(source.mills[0].demand);expect(r.weather[Object.keys(r.weather)[0]].forecast[r.zones[0].id].length).toBe(source.weeks*divisions);
  const noInterest=structuredClone(source);noInterest.economy.annualDebtRate=0;let g=createGame(subdividedScenario(noInterest,divisions));for(let i=0;i<divisions;i++)g=advance(g);expect(g.cash).toBeCloseTo(advance(createGame(noInterest)).cash,6);
  const debt=structuredClone(source);debt.economy.annualDebtRate=.2;debt.economy.fixedWeekly=0;debt.trucks.forEach(t=>t.fixedWeekly=0);let daily=createGame(subdividedScenario(debt,divisions));daily.cash=-100;const weekly=createGame(debt);weekly.cash=-100;for(let i=0;i<divisions;i++)daily=advance(daily);expect(daily.cash).toBeCloseTo(advance(weekly).cash,7);
  expect(parseGame(JSON.stringify(g)).region.turnDurationWeeks).toBe(1/divisions);expect(()=>beginLinkedSeason(g,13)).toThrow();expect(()=>subdividedScenario(r,divisions)).toThrow();
 });
});
