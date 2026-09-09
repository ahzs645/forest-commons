import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance} from './engine';
import {acceptAgreement,acceptOfftake,teachingRepeatedOfftakeOffers,validateOfftakeState,validateOfftakeRegion} from './offtake';
import {serializeGame} from './save-format';
import {parseGame} from './validation';
function fixture(){const r=structuredClone(quebec);r.offtakeOffers=teachingRepeatedOfftakeOffers(r);return createGame(r);}
describe('repeated partner agreements',()=>{
 it('accepts every dated leg atomically and rejects individual or duplicate acceptance',()=>{
  const g=fixture(),id=g.region.offtakeOffers![0].agreement!;
  const legs=g.region.offtakeOffers!.filter(o=>o.agreement===id),before=JSON.stringify(g);
  expect(()=>acceptOfftake(g,legs[0].id)).toThrow('complete');
  const accepted=acceptAgreement(g,id);expect(JSON.stringify(g)).toBe(before);
  expect(legs.every(o=>accepted.offtake![o.id].acceptedWeek===1)).toBe(true);
  expect(()=>acceptAgreement(accepted,id)).toThrow('No terms');
  const late=structuredClone(g);late.week=4;expect(()=>acceptAgreement(late,id)).toThrow();expect(late.offtake).toEqual(g.offtake);
 });
 it('rejects malformed group terms and partial imported acceptance',()=>{
  const g=fixture(),id=g.region.offtakeOffers![0].agreement!,legs=g.region.offtakeOffers!.filter(o=>o.agreement===id);
  const partial=acceptAgreement(g,id);delete partial.offtake![legs[1].id];expect(()=>validateOfftakeState(partial)).toThrow('together');
  g.region.offtakeOffers![1].acceptBy=2;expect(()=>validateOfftakeRegion(g.region)).toThrow('window');
  const before=JSON.stringify(g);expect(()=>acceptAgreement(g,id)).toThrow();expect(JSON.stringify(g)).toBe(before);
 });
 it('settles each leg once at its deadline, conserving cash through save/reload',()=>{
  let g=fixture();const id=g.region.offtakeOffers![0].agreement!,legs=g.region.offtakeOffers!.filter(o=>o.agreement===id);g=acceptAgreement(g,id);
  for(let week=1;week<=g.region.weeks;week++){
   g=advance(g);g=parseGame(serializeGame(g));
   for(const leg of legs)expect(g.offtake![leg.id].settled).toBe(week>=leg.deadline);
   const charges=g.history.at(-1)!.ledger.filter(e=>e.category==='offtake-shortfall');
   expect(charges.reduce((n,e)=>n+e.amount,0)).toBeCloseTo(-legs.filter(o=>o.deadline===week).reduce((n,o)=>n+o.volume*o.shortfallM3,0));
   expect(g.cash).toBeCloseTo(g.region.economy.startingCash+g.instantLedger.reduce((n,e)=>n+e.amount,0)+g.history.flatMap(h=>h.ledger).reduce((n,e)=>n+e.amount,0),5);
  }
  expect(g.history.flatMap(h=>h.ledger).filter(e=>e.category==='offtake-shortfall')).toHaveLength(legs.length);
 },30000);
});
