import {csvParse} from 'd3';
import {operatingWorksheetCSV} from './operating-worksheet';
import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,draftPlan} from './engine';
import {authorReciprocal,acceptReciprocal,queueReciprocal,reciprocalServiceProgress} from './reciprocal';
import {parseGame} from './validation';
import {teamResult,parseCohort,cohortPacket} from './classroom-learning';

it.each([['fixed','paid'],['flexible','paid'],['flexible','no-cash']] as const)('completes twelve Québec turns with %s service / %s settlement and preserves final results',async (routing,settlement)=>{
 const region=structuredClone(quebec);region.trucks.find(t=>t.id==='T1')!.costKm*=1.5; // Explicit asymmetric-cost teaching fixture, retaining real Québec geography.
 let game=authorReciprocal(createGame(region),{name:'Campaign service',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:300,ownReserveM3:0,opens:1,deadline:4,routing,minimumOwnA:40,minimumOwnB:40,settlement});
 const id=game.region.reciprocalPairs!.at(-1)!.id;game=acceptReciprocal(acceptReciprocal(game,id,'A','equal'),id,'B','equal');
 for(let turn=1;turn<=12;turn++){
  game=draftPlan(game);
  if(turn===1){game.plan.crews.C1=[{stand:'Q01',hours:40}];game.plan.crews.C2=[{stand:'Q02',hours:40}];game.plan.trucks.T1=[{stand:'Q01',mill:'M1',product:'soft-saw',loads:1}];game.plan.trucks.T2=[{stand:'Q02',mill:'M2',product:'soft-saw',loads:1}];}
  if(routing==='flexible'&&turn===1){game.plan.reservations=[{id:'cross-reserved',stand:'Q01',mill:'M2',product:'soft-saw',volume:10,market:'ordinary'}];game=queueReciprocal(game,id,'T1','T2',1);}
  game=advance(game);game=parseGame(JSON.stringify(game));
 }
 expect(game.week).toBe(13);expect(game.history).toHaveLength(12);
 expect(game.history[0].shipments!.filter(s=>s.market==='ordinary'&&['Q01','Q02'].includes(s.stand)).reduce((n,s)=>n+s.volume,0)).toBeGreaterThanOrEqual(80);
 const service=reciprocalServiceProgress(game,id);expect(service.status).toBe('fulfilled');expect(service.A.delivered).toBeGreaterThanOrEqual(service.A.required);expect(service.B.delivered).toBeGreaterThanOrEqual(service.B.required);
 if(routing==='fixed')expect(game.reciprocal![id].movedM3).toBe(0);else expect(game.reciprocal![id].movedM3).toBeGreaterThan(0);
 if(routing==='flexible')expect(game.history[0].reservationFulfillment?.['cross-reserved']).toBe(10);
 const agreement=game.reciprocal![id];expect(agreement.shareA+agreement.shareB).toBeCloseTo(agreement.savings,8);
 if(routing==='flexible'&&settlement==='paid')expect(agreement.shareA).toBeCloseTo(agreement.shareB,8);
 if(routing==='flexible'&&settlement==='no-cash'){expect(agreement.transferToA).toBe(0);expect(Math.abs(agreement.shareA-agreement.shareB)).toBeGreaterThan(0.01);}
 expect(game.history.flatMap(h=>h.reciprocal??[]).reduce((n,e)=>n+e.volumeEach,0)).toBeCloseTo(agreement.movedM3,8);
 expect(game.history.filter(h=>h.week>4).flatMap(h=>h.reciprocal??[])).toEqual([]);
 for(const language of ['en','fr'] as const){
  const rows=csvParse(operatingWorksheetCSV(game,language));
  expect(rows).toHaveLength(12);expect(rows.columns).toHaveLength(22);
  const fields=language==='fr'?['reservations_demandees_m3','reservations_realisees_m3','reservations_non_realisees_m3']:['reservation_requested_m3','reservation_fulfilled_m3','reservation_unmet_m3'];
  rows.forEach((record,index)=>{
   const h=game.history[index],requested=(h.plan.reservations??[]).reduce((n,r)=>n+r.volume,0),actual=Object.values(h.reservationFulfillment??{}).reduce((n,v)=>n+v,0);
   expect(Number(record[fields[0]])).toBeCloseTo(requested,8);
   expect(Number(record[fields[1]])).toBeCloseTo(actual,8);
   expect(Number(record[fields[2]])).toBeCloseTo(Math.max(0,requested-actual),8);
   expect(actual).toBeLessThanOrEqual(Object.values(h.delivered).reduce((n,v)=>n+v,0)+1e-6);
  });
 }
 const row=await teamResult('Full campaign',game);expect(parseCohort(cohortPacket([row]))[0]).toEqual(row);
 expect(row.metrics!.reciprocalOutcomes![0].service.status).toBe('fulfilled');
},60000);
