import {describe,it,expect} from 'vitest';
import {createGame,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {activeDisruptions,operatingRegion,respondToDisruption} from './disruptions';
import {forecastOutcome} from './planning';
import {parseGame,validateRegion} from './validation';
const fixture=()=>{const g=createGame(quebec);g.region.disruptions=[{id:'closure',title:'Test closure',description:'Temporary closure',kind:'road',target:g.region.roads.edges[0].id,week:1,endWeek:3,revealWeek:1,repairCost:500,repairWeeks:1}];return g;};
describe('Dated operational disruptions',()=>{
 it('closes the affected edge and restores it after the paid delay, preserving the region',()=>{
  const g=fixture(),before=JSON.stringify(g),repaired=respondToDisruption(g,'closure','repair');
  expect(JSON.stringify(g)).toBe(before);
  expect(repaired.cash).toBe(g.cash-500);
  expect(operatingRegion(repaired).roads.edges).toHaveLength(g.region.roads.edges.length-1);
  repaired.week=2;
  expect(operatingRegion(repaired).roads.edges).toHaveLength(g.region.roads.edges.length);
  expect(repaired.region.roads.edges).toHaveLength(g.region.roads.edges.length);
  expect(repaired.instantLedger.at(-1)?.amount).toBe(-500);
 });
 it('records waiting without charging and prevents duplicate repairs',()=>{
  const g=fixture(),wait=respondToDisruption(g,'closure','wait');
  expect(wait.cash).toBe(g.cash);
  expect(respondToDisruption(wait,'closure','wait').eventResponses).toHaveLength(1);
  const paid=respondToDisruption(wait,'closure','repair');
  expect(()=>respondToDisruption(paid,'closure','repair')).toThrow('already scheduled');
 });
 it('protects cash committed to bids',()=>{
  const g=fixture();g.plan.bids.Q21=g.cash;
  expect(()=>respondToDisruption(g,'closure','repair')).toThrow('uncommitted cash');
 });
 it('sets unavailable fleet capacity to zero and restores normal service automatically',()=>{
  const g=fixture();g.region.disruptions![0].kind='crew';g.region.disruptions![0].target='C1';
  g.plan.crews.C1=[{stand:'Q02',hours:160}];
  expect(advance(g).history[0].crewHours.C1).toBe(0);
  expect(activeDisruptions(g,true,4)).toHaveLength(0);
 });
 it('keeps unrevealed events out of forecast rehearsal',()=>{
  const g=fixture();g.region.disruptions![0].revealWeek=2;
  g.region.disruptions![0].kind='crew';g.region.disruptions![0].target='C1';
  g.plan.crews.C1=[{stand:'Q02',hours:160}];
  expect(forecastOutcome(g).report!.crewHours.C1).toBeGreaterThan(0);
  expect(advance(g).history[0].crewHours.C1).toBe(0);
 });
 it('validates event references and persisted response timing',()=>{
  const g=fixture();expect(()=>validateRegion(g.region)).not.toThrow();
  const paid=respondToDisruption(g,'closure','repair');
  expect(parseGame(JSON.stringify(paid)).eventResponses).toEqual(paid.eventResponses);
  paid.eventResponses![0].restoredWeek=1;
  expect(()=>parseGame(JSON.stringify(paid))).toThrow('event response');
  g.region.disruptions![0].target='missing';
  expect(()=>validateRegion(g.region)).toThrow('disruption');
 });
});
