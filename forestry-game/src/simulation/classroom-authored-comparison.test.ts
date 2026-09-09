import { expect, it } from 'vitest';
import { createGame } from './engine';
import { quebec } from '../scenarios/quebec';
import { authorReciprocal, acceptReciprocal, renewReciprocal, validateReciprocal } from './reciprocal';
import { startingFingerprint } from './classroom-learning';
import { parseGame } from './validation';
import { filterAuctionObservation } from '../../server/auction-disclosure';
function terms(){const product=quebec.products.find(p=>quebec.mills.filter(m=>p.id in m.prices).length>=2)!.id;const mills=quebec.mills.filter(m=>product in m.prices);return {name:'Managed exchange',standA:quebec.stands[0].id,standB:quebec.stands[1].id,millA:mills[0].id,millB:mills[1].id,product,limitM3:100,ownReserveM3:10,opens:1,deadline:2};}
it('preserves absent, empty and populated original agreement baselines through authoring and renewal',async()=>{
 for(const mode of ['absent','empty','template']){
  const region=structuredClone(quebec);delete region.reciprocalPairs;
  if(mode==='empty')region.reciprocalPairs=[];
  if(mode==='template')region.reciprocalPairs=[{...terms(),id:'template'}];
  const initial=createGame(region),fingerprint=await startingFingerprint(initial);
  let game=authorReciprocal(initial,terms());game=authorReciprocal(game,{...terms(),name:'Another exchange'});
  const id=game.authoredReciprocal!.ids[0];game=acceptReciprocal(game,id,'A','equal');game=acceptReciprocal(game,id,'B','equal');game=renewReciprocal(game,id,{opens:3,deadline:4});
  expect(await startingFingerprint(game)).toBe(fingerprint);
  expect(await startingFingerprint(parseGame(JSON.stringify(game)))).toBe(fingerprint);
  const fresh=createGame(game.region);expect(fresh.authoredReciprocal).toBeUndefined();expect(await startingFingerprint(fresh)).not.toBe(fingerprint);
  if(mode==='template'){const changed=structuredClone(game);changed.region.reciprocalPairs![0].limitM3++;expect(await startingFingerprint(changed)).not.toBe(fingerprint);}
 }
});
it('rejects malformed provenance and removes hidden IDs from classroom observations',()=>{
 const game=authorReciprocal(createGame(quebec),terms());
 for(const ids of [[],['missing'],[game.authoredReciprocal!.ids[0],game.authoredReciprocal!.ids[0]]]){
  const bad=structuredClone(game);bad.authoredReciprocal!.ids=ids;expect(()=>validateReciprocal(bad)).toThrow('provenance');
 }
 const observed=structuredClone(game);observed.region.auctionDisclosure={mode:"release-week",volumeMultiplier:[.8,1.2],priceMultiplier:[.8,1.2]};
 const hidden=observed.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek>1)!;
 observed.region.reciprocalPairs!.at(-1)!.standA=hidden.id;
 const withheldId=observed.authoredReciprocal!.ids[0];filterAuctionObservation(observed);
 expect(observed.authoredReciprocal).toBeUndefined();expect(observed.region.reciprocalPairs!.some(p=>p.id===withheldId)).toBe(false);
});
