import {reservationForecast} from './reservation-forecast';
import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,draftPlan} from './engine';
import {acceptReciprocal,queueReciprocal,validateReciprocal,validateReciprocalRegion} from './reciprocal';
import {halfWeekScenario} from './turn-duration';
function fixture(){const r=structuredClone(quebec),p=r.products[0].id;r.stands=r.stands.slice(0,2).map((s,i)=>({...s,node:i?'sb':'sa',supply:'guaranteed',mix:{[p]:1},terrain:1}));r.mills=r.mills.slice(0,2).map((m,i)=>({...m,node:i?'mb':'ma',prices:{[p]:10},demand:m.demand.map(()=>({[p]:10000})),processing:undefined}));r.crews=r.crews.map(c=>({...c,node:'sa'}));r.trucks=r.trucks.slice(0,2).map((t,i)=>({...t,node:i?'sb':'sa',hours:20,payload:20,loadingHours:.1,unloadingHours:.1,costKm:1}));r.roads={nodes:['sa','mb','ma','sb'].map((id,i)=>({id,position:[i,49]})),edges:[['sa','mb',1],['mb','ma',8],['ma','sb',1]].map(([from,to,km],i)=>({id:`edge${i}`,from:String(from),to:String(to),km:Number(km),speed:20,bearing:1,zone:r.zones[0].id,geometry:[],name:'Test road'}))};r.disruptions=[];r.partnerJobs=[];r.offtakeOffers=[];r.facilityTransfers=[];delete r.mobilization;r.reciprocalPairs=[{id:'pair',name:'Paired teaching delivery',standA:r.stands[0].id,standB:r.stands[1].id,millA:r.mills[0].id,millB:r.mills[1].id,product:p,limitM3:50,ownReserveM3:10,opens:1,deadline:2}];let g=createGame(r);for(const s of g.stands){s.remaining-=100;s.harvested=100;s.stock=[{product:p,volume:100,week:1,quality:1}];}g=acceptReciprocal(g,'pair','A','equal');g=acceptReciprocal(g,'pair','B','equal');g=queueReciprocal(g,'pair',r.trucks[0].id,r.trucks[1].id,1);return {g,p};}
describe('balanced managed-network reciprocal dispatch',()=>{
 it('moves equal volumes atomically and records cost savings without inventing network cash',()=>{const {g,p}=fixture(),next=advance(g),h=next.history[0];expect(h.reciprocal).toHaveLength(1);expect(h.reciprocal![0]).toMatchObject({volumeEach:20,savings:16,shareA:8,shareB:8});expect(h.delivered[p]).toBe(40);expect(next.stands.map(s=>s.stock.reduce((n,b)=>n+b.volume,0))).toEqual([80,80]);expect(h.ledger.filter(e=>e.category==='sales').reduce((n,e)=>n+e.amount,0)).toBe(400);expect(h.ledger.filter(e=>e.category==='reciprocal-haul').reduce((n,e)=>n+e.amount,0)).toBe(-2);expect(h.movements.filter(m=>m.kind==='truck')).toHaveLength(2);expect(()=>validateReciprocal(next)).not.toThrow();});
 it('protects destination reservations and own reserves, consuming only matching reservations',()=>{const {g,p}=fixture(),pair=g.region.reciprocalPairs![0];g.plan.reservations=[{id:'blocked',stand:pair.standA,product:p,mill:pair.millA,volume:95,market:'ordinary'},{id:'match',stand:pair.standB,product:p,mill:pair.millA,volume:20,market:'ordinary'}];const next=advance(g);expect(next.history[0].reciprocal![0].volumeEach).toBe(5);expect(next.plan.reservations!.find(r=>r.id==='blocked')!.volume).toBe(95);expect(next.plan.reservations!.find(r=>r.id==='match')!.volume).toBe(15);expect(next.history[0].reservationFulfillment).toEqual({match:5});});
 it('forecasts both reserved exchange legs and reports an atomic failure without mutating the plan',()=>{
  const {g,p}=fixture(),pair=g.region.reciprocalPairs![0];
  g.plan.reservations=[
   {id:'to-b',stand:pair.standA,product:p,mill:pair.millB,volume:20,market:'ordinary'},
   {id:'to-a',stand:pair.standB,product:p,mill:pair.millA,volume:20,market:'ordinary'},
  ];
  const before=JSON.stringify(g),forecast=reservationForecast(g);
  expect(forecast.problems).toEqual([]);
  expect(forecast.rows.map(r=>[r.fulfilled,r.outstanding])).toEqual([[20,0],[20,0]]);
  expect(JSON.stringify(g)).toBe(before);
  const actual=advance(g);expect(actual.history[0].reservationFulfillment).toEqual({'to-b':20,'to-a':20});
  g.region.trucks[1].hours=.1;
  const blocked=reservationForecast(g);
  expect(blocked.rows.map(r=>[r.fulfilled,r.outstanding])).toEqual([[0,20],[0,20]]);
 });
 it('sends neither leg when one truck cannot complete its trip',()=>{const {g,p}=fixture();g.region.trucks[1].hours=.1;const next=advance(g);expect(next.history[0].reciprocal??[]).toEqual([]);expect(next.history[0].delivered[p]??0).toBe(0);expect(next.stands.map(s=>s.stock[0].volume)).toEqual([100,100]);});
 it('enforces deadline, bilateral acceptance and frozen authored terms',()=>{const {g}=fixture();expect(()=>acceptReciprocal(g,'pair','A','cost-weighted')).toThrow();const changed=structuredClone(g);changed.region.reciprocalPairs![0].limitM3=70;expect(()=>validateReciprocal(changed)).toThrow();const late=structuredClone(g);late.week=3;expect(()=>queueReciprocal(late,'pair',late.region.trucks[0].id,late.region.trucks[1].id,1)).toThrow();const single=structuredClone(g);single.reciprocal!.pair.accepted=['A'];expect(advance(single).history[0].reciprocal??[]).toEqual([]);});
 it('shares a single truck time budget and conserves the pair limit over multiple turns',()=>{let {g}=fixture();g.plan.reciprocal![0].truckB=g.plan.reciprocal![0].truckA;g.plan.reciprocal![0].loads=5;const next=advance(g);expect(next.reciprocal!.pair.movedM3).toBe(50);expect(next.history[0].truckHours[g.region.trucks[0].id]).toBeLessThanOrEqual(g.region.trucks[0].hours);expect(advance(next).reciprocal!.pair.movedM3).toBe(50);});
 it('scales agreement windows for half-week scenarios and rejects invalid authored terms',()=>{const {g}=fixture();expect(halfWeekScenario(g.region).reciprocalPairs![0]).toMatchObject({opens:1,deadline:4});g.region.reciprocalPairs![0].ownReserveM3=-1;expect(()=>validateReciprocalRegion(g.region)).toThrow();});
});

import {renewReciprocal,authorReciprocal} from './reciprocal';
import {parseGame} from './validation';
it('renews separately with frozen terms, fresh consent and preserved settled quantities',()=>{
 let {g}=fixture();g=advance(advance(g));const original=structuredClone(g.reciprocal!.pair);
 g=renewReciprocal(g,'pair',{opens:3,deadline:4});const child=g.region.reciprocalPairs!.at(-1)!;
 expect(child.renews).toBe('pair');expect(g.reciprocal![child.id]).toMatchObject({method:'equal',accepted:[],movedM3:0,savings:0});
 expect(g.reciprocal!.pair).toEqual(original);expect(()=>validateReciprocal(JSON.parse(JSON.stringify(g)))).not.toThrow();
 expect(()=>queueReciprocal(g,child.id,g.region.trucks[0].id,g.region.trucks[1].id,1)).toThrow('Both');
 g=acceptReciprocal(g,child.id,'A','equal');expect(()=>acceptReciprocal(g,child.id,'B','cost-weighted')).toThrow('frozen');
 g=acceptReciprocal(g,child.id,'B','equal');g=queueReciprocal(g,child.id,g.region.trucks[0].id,g.region.trucks[1].id,5);
 const next=advance(g);expect(next.reciprocal!.pair).toEqual(original);expect(next.reciprocal![child.id].movedM3).toBe(50);
 expect(next.stands.map(s=>s.stock.reduce((n,b)=>n+b.volume,0))).toEqual([10,10]);
 expect(()=>validateReciprocal(JSON.parse(JSON.stringify(next)))).not.toThrow();
});
it('rejects duplicate/overlapping renewal and imported edits to its frozen terms or sharing',()=>{
 const {g}=fixture();expect(()=>renewReciprocal(g,'pair',{opens:2,deadline:3})).toThrow('nonoverlapping');
 const next=renewReciprocal(g,'pair',{opens:3,deadline:4}),id=next.region.reciprocalPairs!.at(-1)!.id;
 expect(()=>renewReciprocal(next,'pair',{opens:5,deadline:6})).toThrow('already');
 const terms=structuredClone(next);terms.region.reciprocalPairs!.at(-1)!.limitM3++;terms.reciprocal![id].terms.limitM3++;
 expect(()=>validateReciprocal(terms)).toThrow('renewal');
 const method=structuredClone(next);method.reciprocal![id].method='cost-weighted';expect(()=>validateReciprocal(method)).toThrow('renewal');
 const missing=structuredClone(next);delete missing.reciprocal![id];expect(()=>validateReciprocal(missing)).toThrow('Missing');
 const unsigned=structuredClone(g);unsigned.reciprocal!.pair.accepted=['A'];expect(()=>renewReciprocal(unsigned,'pair',{opens:3,deadline:4})).toThrow('Both');
 expect(()=>authorReciprocal(g,{...g.region.reciprocalPairs![0],renews:'pair'} as never)).toThrow('renewal action');
});

it('roundtrips a renewed agreement through the complete campaign save parser',()=>{
 let g=createGame(quebec);const product=g.region.products.find(p=>g.region.mills.filter(m=>p.id in m.prices).length>=2)!.id;const mills=g.region.mills.filter(m=>product in m.prices);
 g=authorReciprocal(g,{name:'Renewal',standA:g.region.stands[0].id,standB:g.region.stands[1].id,millA:mills[0].id,millB:mills[1].id,product,limitM3:100,ownReserveM3:10,opens:1,deadline:2});
 const id=g.region.reciprocalPairs!.at(-1)!.id;
 g=acceptReciprocal(g,id,'A','equal');g=acceptReciprocal(g,id,'B','equal');g=renewReciprocal(g,id,{opens:3,deadline:4});
 expect(parseGame(JSON.stringify(g)).reciprocal).toEqual(g.reciprocal);
});

it('settles no-cash exchanges without balancing transfers and freezes that rule',()=>{
 const {g}=fixture();
 g.region.trucks[0].costKm=2;
 const paid=advance(g);
 g.region.reciprocalPairs![0].settlement='no-cash';
 g.reciprocal!.pair.terms.settlement='no-cash';
 const noCash=advance(g);
 expect(paid.reciprocal!.pair.transferToA).not.toBe(0);
 expect(noCash.reciprocal!.pair).toMatchObject({savings:24,shareA:16,shareB:8,transferToA:0,movedM3:20});
 expect(noCash.cash).toBe(paid.cash);
 expect(noCash.history[0].delivered).toEqual(paid.history[0].delivered);
 expect(()=>validateReciprocal(noCash)).not.toThrow();
 const renewal=renewReciprocal(noCash,'pair',{opens:3,deadline:4});
 expect(renewal.region.reciprocalPairs!.at(-1)!.settlement).toBe('no-cash');
 const changed=structuredClone(noCash);changed.region.reciprocalPairs![0].settlement='paid';
 expect(()=>validateReciprocal(changed)).toThrow();
});

it('keeps each company’s actual transport loss in no-cash settlement',()=>{
 const {g}=fixture(),pair=g.region.reciprocalPairs![0];
 [pair.millA,pair.millB]=[pair.millB,pair.millA];pair.settlement='no-cash';
 g.reciprocal!.pair.terms=structuredClone(pair);g.region.trucks[0].costKm=2;
 const settled=advance(g);
 expect(settled.reciprocal!.pair).toMatchObject({savings:-24,shareA:-16,shareB:-8,transferToA:0});
 expect(()=>validateReciprocal(settled)).not.toThrow();
 const forged=structuredClone(settled);forged.reciprocal!.pair.transferToA=1;forged.history[0].reciprocal![0].transferToA=1;
 expect(()=>validateReciprocal(forged)).toThrow('Invalid reciprocal balance');
});

it('roundtrips an authored no-cash agreement and rejects an unsupported settlement rule',()=>{
 let game=authorReciprocal(createGame(quebec),{name:'No cash',settlement:'no-cash',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:10,opens:1,deadline:2});
 const id=game.region.reciprocalPairs!.at(-1)!.id;
 game=acceptReciprocal(game,id,'A','equal');game=acceptReciprocal(game,id,'B','equal');
 expect(parseGame(JSON.stringify(game)).reciprocal![id].terms.settlement).toBe('no-cash');
 const invalid=JSON.parse(JSON.stringify(game));invalid.region.reciprocalPairs[0].settlement='barter-credit';invalid.reciprocal[id].terms.settlement='barter-credit';
 expect(()=>parseGame(JSON.stringify(invalid))).toThrow();
});

it('protects dated own service from cross orders and counts actual own-first shipments in the same turn',()=>{
 let {g,p}=fixture();g.plan.reciprocal=[];delete g.reciprocal;
 g.region.reciprocalPairs![0].minimumOwnA=90;g.region.reciprocalPairs![0].minimumOwnB=90;g.region.reciprocalPairs![0].routing='flexible';
 g=acceptReciprocal(acceptReciprocal(g,'pair','A','equal'),'pair','B','equal');
 const pair=g.region.reciprocalPairs![0],t=g.region.trucks[0].id;
 g.plan.trucks[t]=[{stand:pair.standA,mill:pair.millA,product:p,loads:1},{stand:pair.standA,mill:pair.millB,product:p,loads:5}];
 const next=advance(g);expect(next.history[0].shipments?.filter(s=>s.stand===pair.standA).map(s=>[s.mill,s.volume])).toEqual([[pair.millA,20],[pair.millB,10]]);
 expect(next.history[0].messages.some(m=>m.includes('protects 70.0 m³'))).toBe(true);expect(reciprocalServiceProgress(next,'pair').A).toEqual({required:90,delivered:20,outstanding:70});
 next.plan.trucks={};const expired=advance(next);expect(reciprocalServiceProgress(expired,'pair').status).toBe('shortfall');
 const child=renewReciprocal(expired,'pair',{opens:3,deadline:4});const id=child.region.reciprocalPairs!.at(-1)!.id;const accepted=acceptReciprocal(acceptReciprocal(child,id,'A','equal'),id,'B','equal');expect(reciprocalServiceProgress(accepted,id).A.delivered).toBe(0);
});
it('fixed routing rejects paired dispatch and blocks ordinary cross-haul bypass',()=>{
 let {g,p}=fixture();g.plan.reciprocal=[];delete g.reciprocal;g.region.reciprocalPairs![0].routing='fixed';g=acceptReciprocal(acceptReciprocal(g,'pair','A','equal'),'pair','B','equal');const pair=g.region.reciprocalPairs![0];
 expect(()=>queueReciprocal(g,'pair',g.region.trucks[0].id,g.region.trucks[1].id,1)).toThrow('Fixed');const drafted=draftPlan(g);expect(Object.values(drafted.plan.trucks).flat().every(o=>o.mill===(o.stand===pair.standA?pair.millA:pair.millB))).toBe(true);g.plan.trucks[g.region.trucks[0].id]=[{stand:pair.standA,mill:pair.millB,product:p,loads:1}];const blocked=advance(g).history[0];expect(blocked.shipments).toEqual([]);expect(blocked.messages.some(m=>m.includes('agreement pair fixes'))).toBe(true);expect(blocked.messages.some(m=>m.includes('check stock, demand and time'))).toBe(false);
 expect(reciprocalDispatchableStock(g,{stand:pair.standA,mill:pair.millA,product:p,spot:'spot'},100)).toBe(0);
 const missing=structuredClone(g);delete missing.reciprocal!.pair.acceptedWeek;expect(()=>validateReciprocal(missing)).toThrow('provenance');
 const overlap=structuredClone(g.region);overlap.reciprocalPairs!.push({...pair,id:'overlap'});expect(()=>validateReciprocalRegion(overlap)).toThrow('Overlapping');
});
import {reciprocalServiceProgress,reciprocalDispatchableStock} from './reciprocal';
it('roundtrips service consent, rejects invalid terms and protects all alternative markets',()=>{
 let g=createGame(quebec);const product=g.region.products.find(p=>g.region.mills.filter(m=>p.id in m.prices).length>=2)!.id;const mills=g.region.mills.filter(m=>product in m.prices);
 g=authorReciprocal(g,{name:'Own service',standA:g.region.stands[0].id,standB:g.region.stands[1].id,millA:mills[0].id,millB:mills[1].id,product,limitM3:100,ownReserveM3:10,opens:1,deadline:2,routing:'flexible',minimumOwnA:90,minimumOwnB:80});
 const id=g.region.reciprocalPairs!.at(-1)!.id;g=acceptReciprocal(acceptReciprocal(g,id,'A','equal'),id,'B','equal');expect(parseGame(JSON.stringify(g)).reciprocal).toEqual(g.reciprocal);
 const stand=g.stands[0];stand.stock=[{product,volume:100,week:1,quality:1}];
 for(const market of [{spot:'spot'},{process:true},{offtake:'contract'},{}])expect(reciprocalDispatchableStock(g,{stand:stand.id,mill:mills[1].id,product,...market},100)).toBe(10);
 const invalid=structuredClone(g.region);invalid.reciprocalPairs!.at(-1)!.minimumOwnA=-1;expect(()=>validateReciprocalRegion(invalid)).toThrow('terms');
 const changed=structuredClone(g);changed.region.reciprocalPairs!.at(-1)!.minimumOwnA=40;expect(()=>validateReciprocal(changed)).toThrow('balance');
});
it('explains an actual paired service hold but does not mislabel empty stock as service protection',()=>{
 let {g}=fixture();g.plan.reciprocal=[];delete g.reciprocal;g.region.reciprocalPairs![0].minimumOwnA=100;
 g=acceptReciprocal(acceptReciprocal(g,'pair','A','equal'),'pair','B','equal');g=queueReciprocal(g,'pair',g.region.trucks[0].id,g.region.trucks[1].id,1);
 const blocked=advance(g).history[0];expect(blocked.shipments).toEqual([]);expect(blocked.messages.some(m=>m.includes('protects 100.0 m³'))).toBe(true);
 const empty=structuredClone(g);empty.stands[0].stock=[];const report=advance(empty).history[0];expect(report.shipments).toEqual([]);expect(report.messages.some(m=>m.includes('protects 100.0 m³'))).toBe(false);expect(report.messages.some(m=>m.includes('no balanced pair dispatched'))).toBe(true);
});
it.each(['road','truck','mill'] as const)('pauses both reciprocal legs for a %s disruption, then resumes without extending consent or deadline',kind=>{
 let {g}=fixture();const pair=g.region.reciprocalPairs![0],target=kind==='road'?'edge0':kind==='truck'?g.region.trucks[0].id:pair.millA;
 g.region.disruptions=[{id:'closure',title:'Closure',description:'Teaching closure',kind,target,week:1,endWeek:1,revealWeek:1,repairCost:0,repairWeeks:1}];
 const acceptedWeek=g.reciprocal!.pair.acceptedWeek;
 g=advance(g);expect(g.history[0].shipments).toEqual([]);expect(g.reciprocal!.pair.movedM3).toBe(0);expect(g.stands.map(s=>s.stock.reduce((n,b)=>n+b.volume,0))).toEqual([100,100]);expect(g.region.reciprocalPairs![0].deadline).toBe(2);
 g=advance(g);
 expect(g.history[1].shipments).toHaveLength(2);expect(g.reciprocal!.pair.movedM3).toBe(20);expect(g.reciprocal!.pair.acceptedWeek).toBe(acceptedWeek);expect(g.region.reciprocalPairs![0].deadline).toBe(2);
 expect(()=>queueReciprocal(g,'pair',g.region.trucks[0].id,g.region.trucks[1].id,1)).toThrow('active');
});

it('closes unsigned expired terms without treating them as accepted service shortfalls',()=>{
 let g=authorReciprocal(createGame(quebec),{name:'Unsigned',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:1,minimumOwnA:100});
 const id=g.region.reciprocalPairs!.at(-1)!.id;
 g=acceptReciprocal(g,id,'A','equal');expect(reciprocalServiceProgress(g,id).status).toBe('pending');
 g=advance(g);expect(reciprocalServiceProgress(g,id).status).toBe('unaccepted');
 expect(g.reciprocal![id].accepted).toEqual(['A']);expect(()=>acceptReciprocal(g,id,'B','equal')).toThrow();
});
