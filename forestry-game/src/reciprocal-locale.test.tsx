import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider,translate} from './i18n';
import ReciprocalDesk from './ReciprocalDesk';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {authorReciprocal,acceptReciprocal} from './simulation/reciprocal';
afterEach(()=>vi.unstubAllGlobals());
it('formats signed agreement settlements in the selected display locale without changing saved numbers',()=>{
 let game=authorReciprocal(createGame(quebec),{name:'Teaching pair',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:10,opens:1,deadline:4});
 const pair=game.region.reciprocalPairs![0];
 game=acceptReciprocal(acceptReciprocal(game,pair.id,'A','equal'),pair.id,'B','equal');
 Object.assign(game.reciprocal![pair.id],{savings:-83.6,shareA:-41.8,shareB:-41.8,transferToA:0});
 const before=JSON.stringify(game);
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});
  const html=renderToStaticMarkup(<LanguageProvider><ReciprocalDesk game={game} onChange={()=>{}}/></LanguageProvider>);
  expect(html).toContain(language==='fr'?'-83,60':'-83.60');
  expect(html).toContain(language==='fr'?'-41,80':'-41.80');
 }
 expect(JSON.stringify(game)).toBe(before);
});
it('localizes the processing queue confirmation',()=>{
 expect(translate('Mill intake added to the dispatch queue.','fr')).toBe('Arrivage à l’usine ajouté à la file d’expédition.');
});
it('localizes own-service diagnostics through the normal operating-message translator',()=>{
 const fixed='Truck Élise: agreement pair-1 fixes Q01 / soft-saw to ordinary deliveries at M1 through turn 2.';
 expect(translate(fixed,'en')).toBe(fixed);
 expect(translate(fixed,'fr')).toBe('Truck Élise : l’accord pair-1 limite Q01 / soft-saw aux livraisons ordinaires à M1 jusqu’au tour 2.');
 const held='Truck Élise: agreement pair-1 protects 70.0 m³ at Q01 for own-mill service or reserve through turn 2; deliver ordinary supply to M1 first.';
 expect(translate(held,'fr')).toContain('protège 70,0 m³ à Q01');expect(translate(held,'fr')).toContain('livrez d’abord le bois ordinaire à M1');expect(translate(held,'en')).toBe(held);
 expect(translate('Truck Élise: agreement pair-1 has unverifiable own-mill service records; cross delivery is paused.','fr')).toContain('la livraison croisée est suspendue');
});
