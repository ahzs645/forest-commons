import {describe,it,expect} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,draftPlan,purchase,improveRoad} from './engine';
import {applyHarvestAuthorization,applyRoadAuthorization,harvestAuthorizationProblem,roadAuthorizationProblem,stumpageCost,settlePostHarvestObligations} from './tenure';
import {parseGame,validateRegion} from './validation';
import {operatingRegion} from './disruptions';

describe('BC rights and financial obligations',()=>{
 it('charges Crown opening rights, overrides legacy royalty, conserves cash and settles operator provisions once',()=>{
  const r=structuredClone(princeGeorge);r.economy.timberPayment='harvest-royalty';
  let g=advance(draftPlan(createGame(r)));
  const h=g.history[0];expect(h.production!.length).toBeGreaterThan(0);
  const expected=h.production!.reduce((n,p)=>n+stumpageCost(r,p.stand,p.products),0);
  expect(-h.ledger.filter(e=>e.category==='stumpage').reduce((n,e)=>n+e.amount,0)).toBeCloseTo(expected);
  expect(h.ledger.some(e=>e.category==='royalty')).toBe(false);
  const id=h.production![0].stand;const before=g.cash;
  g=settlePostHarvestObligations(g,id);
  expect(g.cash).toBeLessThan(before);
  expect(settlePostHarvestObligations(g,id).cash).toBe(g.cash);
  expect(parseGame(JSON.stringify(g)).cash).toBe(g.cash);
 });
 it('uses elapsed weeks for applications and expiry, blocking harvest before approval',()=>{
  const r=structuredClone(princeGeorge);r.turnDurationWeeks=.25;
  const id=r.stands.find(s=>s.supply==='guaranteed')!.id;
  r.bcTenure!.stands[id].harvest={kind:'cutting-permit',initialStatus:'required',delayWeeks:1,validForWeeks:1};
  let g=applyHarvestAuthorization(createGame(r),id);
  expect(g.bcTenure!.harvest[id].approvedWeek).toBe(5);
  expect(()=>applyHarvestAuthorization(g,id)).toThrow('pending');
  g.plan.crews[r.crews[0].id]=[{stand:id,hours:10}];
  g=advance(g);expect(g.history[0].production).toHaveLength(0);
  g.week=5;expect(harvestAuthorizationProblem(g,id)).toBeNull();
  g.week=9;expect(harvestAuthorizationProblem(g,id)).toContain('expired');
 });
 it('blocks unauthorized roads from shared routing and road upgrades and protects eligibility',()=>{
  const g=createGame(princeGeorge),id=princeGeorge.stands.find(s=>s.supply==='auction')!.id,road=`access-${id}`;
  expect(roadAuthorizationProblem(g,road)).toBeTruthy();
  expect(operatingRegion(g).roads.edges.some(e=>e.id===road)).toBe(false);
  expect(()=>improveRoad(g,road)).toThrow('authorization');
  expect(()=>applyRoadAuthorization(g,road)).toThrow('Acquire');
  const protectedId=princeGeorge.stands.find(s=>s.supply==='protected')!.id;
  expect(()=>applyRoadAuthorization(g,`access-${protectedId}`)).toThrow('Acquire');
 });
 it('excludes private Crown stumpage and retains acquisition payment',()=>{
  const r=structuredClone(princeGeorge);r.economy.startingCash=1e8;r.economy.timberPayment='harvest-royalty';
  const d=r.stands.find(s=>s.supply==='private')!;const g=purchase(createGame(r),d.id);
  expect(g.cash).toBe(r.economy.startingCash-d.askingPrice);
  expect(stumpageCost(r,d.id,{'soft-saw':1000})).toBe(0);
 });
 it('settles partial-harvest provisions at terminal and never charges BCTS responsibilities',()=>{
  let g=createGame(princeGeorge);const id=g.region.stands.find(s=>s.supply==='guaranteed')!.id;
  g.region.bcTenure!.stands[id].obligations=[{id:'external',label:'BCTS provision',responsibleParty:'bcts',costPerM3:100}];
  g=advance(draftPlan(g));
  expect(g.bcTenure!.obligations[`${id}:external`]?.accrued).toBeGreaterThan(0);
  const cash=g.cash;g=settlePostHarvestObligations(g,id);expect(g.cash).toBe(cash);
  while(g.week<=g.region.weeks){g.plan.crews=Object.fromEntries(g.region.crews.map(c=>[c.id,[]]));g.plan.trucks=Object.fromEntries(g.region.trucks.map(t=>[t.id,[]]));g=advance(g);}
  expect(g.history.at(-1)!.ledger.some(e=>e.category==='post-harvest')).toBe(true);
  expect(Object.values(g.bcTenure!.obligations).every(s=>s.settled===s.accrued)).toBe(true);
  expect(parseGame(JSON.stringify(g)).cash).toBe(g.cash);
 });
 it('rejects malformed policies and state while preserving legacy saves',()=>{
  const r=structuredClone(princeGeorge);const id=r.stands[0].id;r.bcTenure!.stands[id].stumpage.rates['soft-saw']=-1;
  expect(()=>validateRegion(r)).toThrow('BC tenure');
  const g=createGame(princeGeorge);g.bcTenure!.harvest[id]={status:'approved',approvedWeek:999};
  expect(()=>parseGame(JSON.stringify(g))).toThrow('BC tenure');
  expect(parseGame(JSON.stringify(createGame(quebec))).bcTenure).toBeUndefined();
 });
});
