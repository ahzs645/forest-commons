import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame} from './engine';
import {validateRegion,parseGame} from './validation';
import {teachingOfftakeOffers,teachingRepeatedOfftakeOffers,acceptOfftake,acceptAgreement} from './offtake';
it.each(['constructor','__proto__','toString','valueOf'])('rejects unsafe single and repeated offer ID %s before acceptance',id=>{
 for(const repeat of [false,true]){
  const r=structuredClone(quebec);r.offtakeOffers=repeat?teachingRepeatedOfftakeOffers(r):teachingOfftakeOffers(r);r.offtakeOffers[1].id=id;
  expect(()=>validateRegion(r)).toThrow('Invalid offtake terms');
 }
});
it('preserves safe authored IDs and sequential acceptance, including grouping labels that are not dictionary keys',()=>{
 const r=structuredClone(quebec);r.offtakeOffers=teachingOfftakeOffers(r);r.offtakeOffers[0].id='authored:first';r.offtakeOffers[1].id='authored second';
 validateRegion(r);let g=acceptOfftake(createGame(r),'authored:first');g=acceptOfftake(g,'authored second');expect(parseGame(JSON.stringify(g)).offtake).toEqual(g.offtake);
 const repeated=structuredClone(quebec);repeated.offtakeOffers=teachingRepeatedOfftakeOffers(repeated);const group=repeated.offtakeOffers[0].agreement;for(const o of repeated.offtakeOffers)if(o.agreement===group)o.agreement='constructor';
 validateRegion(repeated);const accepted=acceptAgreement(createGame(repeated),'constructor');expect(Object.keys(accepted.offtake!).length).toBeGreaterThan(1);expect(()=>parseGame(JSON.stringify(accepted))).not.toThrow();
});
