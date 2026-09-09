import { describe,it,expect } from 'vitest';
import { createGame,advance } from './engine';
import { quebec } from '../scenarios/quebec';
import { scheduleCrew } from './scheduling';
import { parseGame } from './validation';
import { serializeGame } from './save-format';
import { rollingForecast } from './harvest-planning';
describe('Future crew schedule',()=>{
 it('persists sparse overrides, activates once and supports explicit rest',()=>{
  let g=createGame(quebec);g.plan.crews.C2=[{stand:'Q02',hours:40}];
  g=scheduleCrew(g,2,'C1',[{stand:'Q01',hours:80,treatment:'final'}]);g=scheduleCrew(g,3,'C1',[]);
  g=parseGame(serializeGame(g));g=advance(g);
  expect(g.plan.crews.C1).toEqual([{stand:'Q01',hours:80,treatment:'final'}]);expect(g.plan.crews.C2).toHaveLength(1);expect(g.scheduledCrews?.[2]).toBeUndefined();
  g=advance(g);expect(g.plan.crews.C1).toEqual([]);expect(g.history[1].plan.crews.C1[0].hours).toBe(80);expect(()=>parseGame(serializeGame(g))).not.toThrow();
 });
 it('rejects invalid future weeks, capacity, protected stands and crew references',()=>{
  const g=createGame(quebec),order={stand:'Q01',hours:80};
  for(const week of [0,1,13,2.5])expect(()=>scheduleCrew(g,week,'C1',[order])).toThrow();
  expect(()=>scheduleCrew(g,2,'missing',[order])).toThrow();expect(()=>scheduleCrew(g,2,'C1',[{...order,hours:161}])).toThrow();expect(()=>scheduleCrew(g,2,'C1',[order,order,order])).toThrow();
  const protectedStand=quebec.stands.find(s=>s.supply==='protected')!;expect(()=>scheduleCrew(g,2,'C1',[{...order,stand:protectedStand.id}])).toThrow();
  for(const malformed of [[],null,{'02':{C1:[order]}},{'2':{C1:[null]}}])expect(()=>parseGame(JSON.stringify({...g,scheduledCrews:malformed}))).toThrow();
 });
 it('removal restores carry behavior and forecast consumes appointments without mutation',()=>{
  let g=scheduleCrew(createGame(quebec),2,'C1',[{stand:'Q01',hours:40}]);
  const before=serializeGame(g),forecast=rollingForecast(g,2);
  expect(forecast.problem).toBe('');expect(forecast.reports[1].plan.crews.C1).toEqual([{stand:'Q01',hours:40}]);expect(serializeGame(g)).toBe(before);
  g=scheduleCrew(g,2,'C1',null);expect(g.scheduledCrews?.[2]).toBeUndefined();
 });
});
