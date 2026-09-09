import {afterEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import Debrief from './Debrief';
import TeamComparison from './TeamComparison';
import {LanguageProvider} from './i18n';
import {createGame, advance} from './simulation/engine';
import {quebec} from './scenarios/quebec';
afterEach(()=>vi.unstubAllGlobals());
it('distinguishes completed turns from physical weeks in daily teaching results',()=>{
 const game=advance(createGame({...quebec,turnDurationWeeks:1/7,weeks:84}));
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='forest-language'?language:null});
  const html=renderToStaticMarkup(<LanguageProvider><Debrief game={game} onNavigate={()=>{}}/><TeamComparison game={game}/></LanguageProvider>);
  expect(html).not.toContain('0.142857');
  expect(html).toContain(language==='fr'?'0,143':'0.143');
  expect(html).toContain(language==='fr'?'Année / tours terminés':'Year / completed turns');
 }
});
