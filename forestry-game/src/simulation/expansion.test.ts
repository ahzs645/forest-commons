import {describe,it,expect} from 'vitest';
import {equalProfit} from '../epm';
import {allocate,cost,stability} from '../coalition';
import {createGame,advance,draftPlan} from './engine';
import {quebec} from '../scenarios/quebec';
import {startStewardship,stewardshipYear,validateStewardship} from './stewardship';
import {appraise} from './appraisal';
import {partnerTrip,freightSettlement} from './partner';
import {weatherAt,route} from './routing';
import {parseGame} from './validation';
describe('Expanded teaching mechanisms',()=>{
 it('reproduces the published three-company EPM allocation',()=>{
  const c:Record<string,number>={'1':4,'2':7,'3':5,'12':10,'13':8,'23':10,'123':12};
  const s=equalProfit(['1','2','3'],m=>c[m.slice().sort().join('')]??0);
  expect(s['1']).toBeCloseTo(1);expect(s['2']).toBeCloseTo(1.75);expect(s['3']).toBeCloseTo(1.25);
 });
 it('satisfies every coalition constraint in both classroom datasets',()=>{
  for(const n of [4,5] as const)for(let mask=1;mask<2**n;mask++){
   const m=Array.from({length:n},(_,i)=>String(i+1)).filter((_,i)=>mask&(1<<i));
   const a=allocate(m,'epm',n);expect(stability(m,a,n)).toHaveLength(0);
   expect(m.reduce((v,c)=>v+cost([c],n)-a[c],0)).toBeCloseTo(cost(m,n),4);
  }
 });
 it('reports an empty core instead of returning proportional savings',()=>{
  expect(()=>equalProfit(['1','2','3'],m=>m.length===1?10:m.length===2?10:29)).toThrow('No stable');
 });
 it('does not read actual future weather or auction seeds in appraisals',()=>{
  const g=createGame(quebec),a=appraise(g,'Q21');g.seed=98765;for(const w of Object.values(g.region.weather))for(const z of g.region.zones)w.actual[z.id].fill('thaw');
  expect(appraise(g,'Q21')).toEqual(a);
 });
 it('records finite partner cargo with real extra handling and no duplicate stock',()=>{
  const g=draftPlan(createGame(quebec));g.region.disruptions=[];
  const t=g.region.trucks.find(t=>g.plan.trucks[t.id].length)!,o=g.plan.trucks[t.id][0],stand=g.region.stands.find(s=>s.id===o.stand)!;
  g.region.partnerJobs=[{id:'test',company:'Partner',from:g.truckPositions[t.id],to:stand.node,product:o.product,volume:10,week:1,deadline:1,paymentPerM3:20}];
  g.cooperation.pooling=true;g.cooperation.partnerShare=.5;o.partnerJob='test';
  const trip=partnerTrip(g,'test',g.truckPositions[t.id],stand.node,weatherAt(g),t.payload)!;
  const empty=route(g.region,g.truckPositions[t.id],stand.node,weatherAt(g),g.improvedRoads)!;
  const expected=freightSettlement(trip,empty.km,t.costKm,g.cooperation.partnerShare);
  const before=JSON.stringify(g),next=advance(g);
  expect(JSON.stringify(g)).toBe(before);expect(next.partnerDelivered?.test).toBe(10);
  expect(next.history[0].partnerDeliveries?.test).toBe(10);
  expect(next.history[0].ledger.filter(l=>l.category==='cooperation').reduce((n,l)=>n+l.amount,0)).toBeCloseTo(expected.payment);
  expect(parseGame(JSON.stringify(next)).partnerDelivered?.test).toBe(10);
  expect(partnerTrip(next,'test',t.node,stand.node,weatherAt(next),t.payload)).toBeNull();
 });
 it('conserves annual timber and isolates the annual budget from weekly operations',()=>{
  const g=createGame(quebec),before=JSON.stringify(g);let s=startStewardship(g);
  s=stewardshipYear(g.region,s,{Q02:'final'});
  expect(s.history[0].opening+s.history[0].growth-s.history[0].harvest).toBeCloseTo(s.history[0].closing);
  expect(()=>stewardshipYear(g.region,s,{Q02:'thin'})).toThrow('five years');
  for(let i=0;i<29;i++)s=stewardshipYear(g.region,s,{});
  expect(s.year).toBe(31);expect(()=>stewardshipYear(g.region,s,{})).toThrow('complete');
  expect(()=>validateStewardship(g.region,s)).not.toThrow();expect(JSON.stringify(g)).toBe(before);
 });
 it('enforces regeneration lag, planting budget and protected areas',()=>{
  const g=createGame(quebec),s=startStewardship(g),d=g.region.stands.find(d=>d.supply==='protected')!;
  expect(()=>stewardshipYear(g.region,s,{[d.id]:'final'})).toThrow('protected');
  s.stands.find(s=>s.id==='Q02')!.volume=0;
  const next=stewardshipYear(g.region,s,{Q02:'plant'});
  expect(next.stands.find(s=>s.id==='Q02')!.volume).toBe(0);
  expect(next.cash).toBeLessThan(s.cash);s.cash=0;
  expect(()=>stewardshipYear(g.region,s,{Q02:'plant'})).toThrow('budget');
 });
});
