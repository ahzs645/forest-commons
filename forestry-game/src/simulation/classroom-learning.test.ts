import {allocate} from '../coalition';
import {describe,it,expect} from 'vitest';
import {createGame,advance,draftPlan} from './engine';
import {quebec} from '../scenarios/quebec';
import {cohortPacket,parseCohort,teamResult,startingFingerprint,comparable,persistLocal,notesPacket,parseNotes,lessons} from './classroom-learning';
import {startStewardship} from './stewardship';
describe('local classroom learning records',()=>{
 it('compares immutable baseline independently of live cash, stock and plan',async()=>{
  const g=createGame(quebec,'normal',42),other=advance(draftPlan(g));
  expect(await startingFingerprint(other)).toBe(await startingFingerprint(g));
  expect(comparable(await teamResult('a',g),await teamResult('b',other))).toBe(false);
  other.seed=43;expect(await startingFingerprint(other)).not.toBe(await startingFingerprint(g));
 });
 it('retains a linked-year original baseline despite legitimate opening resource changes',async()=>{
  const g=createGame(quebec,'normal',42);g.linkedSeason={baseRegion:structuredClone(quebec),opening:startStewardship(g),startCalendarWeek:13,settled:false};
  const h=structuredClone(g);h.region.economy.startingCash+=500;h.region.stands[0].volume-=10;h.linkedSeason!.opening.cash+=500;
  expect(comparable(await teamResult('a',g),await teamResult('b',h))).toBe(true);
  h.linkedSeason!.opening.year++;expect(comparable(await teamResult('a',g),await teamResult('b',h))).toBe(false);
 });
 it('round trips compact results and rejects malformed and non-finite values',async()=>{
  const row=await teamResult('class A',createGame(quebec));expect(parseCohort(cohortPacket([row]))).toEqual([row]);
  expect(()=>parseCohort(cohortPacket([{...row,cash:NaN}]))).toThrow();
  expect(()=>parseCohort(cohortPacket([{...row,delivered:-1}]))).toThrow();
  expect(()=>parseCohort(cohortPacket(Array(102).fill(row)))).toThrow();
  expect(cohortPacket([row]).length).toBeLessThan(1000);
 });
 it('keeps exportable data on quota failure and validates lesson notes',()=>{
  expect(persistLocal({setItem(){throw Error('quota');}},'x','data')).toMatch('export');
  const notes={step:4,notes:{pairs:'Outside option is cheaper.',open:'All partners accept.'}};
  expect(parseNotes(notesPacket(notes))).toEqual(notes);expect(lessons).toHaveLength(6);
  expect(()=>parseNotes(notesPacket({...notes,step:9}))).toThrow();
  expect(()=>parseNotes(notesPacket({...notes,notes:{invalid:'x'}}))).toThrow();
 });
});

it('exports actual service, relocation, partner savings and only agreed company allocations',async()=>{
 const g=advance(draftPlan(createGame(quebec)));const h=g.history[0];
 h.targetChecks=4;h.targetHits=3;h.partnerSavings=125;
 g.negotiation.offers=[{id:1,count:5,groups:[1,1,1,1,1],shares:allocate(['1','2','3','4','5'],'equal',5),accepted:['1','2','3','4','5'],status:'agreed'}];g.negotiation.count=5;
 const row=await teamResult('A',g);expect(row.metrics!.serviceHits).toBe(3);expect(row.metrics!.serviceChecks).toBe(4);expect(row.metrics!.partnerSavings).toBe(125);
 expect(row.metrics!.crewRelocationKm).toBeCloseTo(h.movements.filter(m=>m.kind==='crew').reduce((n,m)=>n+m.km,0));
 expect(row.metrics!.companySavings!.shares['5']).toBe(g.negotiation.offers![0].shares['5']);expect(parseCohort(cohortPacket([row]))).toEqual([row]);
 const legacy={...row};delete legacy.metrics;expect(parseCohort(cohortPacket([legacy]))[0].metrics).toBeUndefined();
 row.metrics!.serviceHits=5;expect(()=>parseCohort(cohortPacket([row]))).toThrow('metrics');
});

import {authorReciprocal,acceptReciprocal} from './reciprocal';
it('exports operational company identities and service separately from negotiation shares, accepting signed outcomes',async()=>{
 let g=authorReciprocal(createGame(quebec),{name:'Teaching pair',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:2,minimumOwnA:50,minimumOwnB:70,settlement:'no-cash'});
 const id=g.region.reciprocalPairs!.at(-1)!.id;g=acceptReciprocal(acceptReciprocal(g,id,'A','equal'),id,'B','equal');
 const row=await teamResult('Team',g);expect(row.metrics!.reciprocalOutcomes![0]).toMatchObject({id,standA:'Q01',standB:'Q02',settlement:'no-cash',service:{status:'active',A:{required:50,outstanding:50},B:{required:70,outstanding:70}}});
 expect(parseCohort(cohortPacket([row]))[0]).toEqual(row);
 const signed=structuredClone(row),outcome=signed.metrics!.reciprocalOutcomes![0];outcome.shareA=-10;outcome.shareB=4;signed.metrics!.reciprocalSavings=-6;
 expect(parseCohort(cohortPacket([signed]))[0].metrics!.reciprocalOutcomes![0].shareA).toBe(-10);
 outcome.transferToA=1;expect(()=>parseCohort(cohortPacket([signed]))).toThrow('outcome');outcome.transferToA=0;outcome.service.A.outstanding=0;expect(()=>parseCohort(cohortPacket([signed]))).toThrow('service');
 const legacy=structuredClone(row);delete legacy.metrics!.reciprocalOutcomes;expect(parseCohort(cohortPacket([legacy]))[0].metrics!.reciprocalOutcomes).toBeUndefined();
});
it('roundtrips an expired unsigned agreement as unaccepted rather than fulfilled or shortfall',async()=>{
 let game=authorReciprocal(createGame(quebec),{name:'Unsigned',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:1,minimumOwnA:50});
 const id=game.region.reciprocalPairs!.at(-1)!.id;game=acceptReciprocal(game,id,'A','equal');game=advance(game);
 const row=await teamResult('Unsigned',game);expect(row.metrics!.reciprocalOutcomes![0].service.status).toBe('unaccepted');expect(parseCohort(cohortPacket([row]))[0].metrics!.reciprocalOutcomes![0].service.status).toBe('unaccepted');
});
