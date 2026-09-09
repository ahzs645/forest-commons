import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {authorReciprocal,acceptReciprocal,renewReciprocal} from './simulation/reciprocal';
import ReciprocalRenewal from './ReciprocalRenewal';
import {LanguageProvider} from './i18n';
afterEach(()=>vi.unstubAllGlobals());
it('offers localized renewal only after bilateral consent and preserves successor identity',()=>{
 vi.stubGlobal('localStorage',{getItem:()=>null});
 let game=authorReciprocal(createGame(quebec),{name:'Teaching pair',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:10,opens:1,deadline:4});
 const pair=game.region.reciprocalPairs![0];
 const render=(g=game,pending=false)=>renderToStaticMarkup(<LanguageProvider><ReciprocalRenewal game={g} pair={pair} pending={pending} onRenew={()=>{}}/></LanguageProvider>);
 expect(render()).toBe('');
 game=acceptReciprocal(game,pair.id,'A','equal');expect(render()).toBe('');
 game=acceptReciprocal(game,pair.id,'B','equal');
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});
  const html=render();expect(html).toContain(language==='fr'?'Proposer un renouvellement lié':'Propose linked renewal');
  expect(html).toContain('min="5"');expect(render(game,true)).toContain('<fieldset disabled=""');
  const renewed=renewReciprocal(game,pair.id,{opens:5,deadline:8});
  expect(render(renewed)).toContain('renewed-pair-1');expect(render(renewed)).not.toContain('<button');
 }
 expect(render({...game,week:13})).toBe('');
});
