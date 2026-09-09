import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from './i18n';
import ReciprocalService from './ReciprocalService';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {authorReciprocal} from './simulation/reciprocal';
afterEach(()=>vi.unstubAllGlobals());
it('shows frozen routing, own-mill requirements and consent status in both languages',()=>{
 const game=authorReciprocal(createGame(quebec),{name:'Own supply',routing:'fixed',minimumOwnA:100,minimumOwnB:50,standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:10,opens:1,deadline:4});
 const pair=game.region.reciprocalPairs!.at(-1)!,before=JSON.stringify(game);
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});
  const html=renderToStaticMarkup(<LanguageProvider><ReciprocalService game={game} pair={pair}/></LanguageProvider>);
  expect(html).toContain(language==='en'?'Fixed routing':'Acheminement fixe');
  expect(html).toContain(language==='en'?'Service pending':'En attente de consentement');
  expect(html).toContain('100');expect(html).toContain('50');
  expect(html).toContain(language==='en'?'no cash penalty':'aucune pénalité monétaire');
 }
 expect(JSON.stringify(game)).toBe(before);
});
