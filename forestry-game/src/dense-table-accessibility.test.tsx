import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from './i18n';
import ReciprocalSettlement from './ReciprocalSettlement';
import TeamComparison from './TeamComparison';
import RollingOptimizer from './RollingOptimizer';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import type {ReciprocalAgreement} from './simulation/reciprocal';
afterEach(()=>vi.unstubAllGlobals());
it('exposes dense settlement and comparison tables as named keyboard scroll regions in both languages',()=>{
 const agreement={shareA:10,shareB:20,transferToA:5} as ReciprocalAgreement;
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='forest-language'?language:null});
  const html=renderToStaticMarkup(<LanguageProvider><ReciprocalSettlement agreement={agreement} currency="CAD"/><TeamComparison game={createGame(quebec)}/></LanguageProvider>);
  expect(html.match(/tabindex="0" role="region"/g)).toHaveLength(2);
  expect(html).toContain(language==='en'?'Scrollable savings and transfers table':'Tableau défilant des économies et transferts');
  expect(html).toContain(language==='en'?'Scrollable team comparison table':'Tableau défilant de comparaison des équipes');
 }
});
it('provides a full-label touch target for each available private acquisition',()=>{
 const game=createGame(quebec),count=game.region.stands.filter(s=>s.supply==='private'&&!game.stands.find(x=>x.id===s.id)?.owned).length;
 expect(count).toBeGreaterThan(0);
 const html=renderToStaticMarkup(<RollingOptimizer game={game} onChange={()=>{}}/>);
 expect(html.match(/class="advisor-acquisition-choice"/g)).toHaveLength(count);
});

it('names the company profiles, coalition and partner comparison scroll regions',async()=>{
 const {default:CollaborationLab}=await import('./CollaborationLab');
 const html=renderToStaticMarkup(<CollaborationLab game={createGame(quebec)} onChange={()=>{}}/>);
 expect(html).toContain('aria-label="Scrollable company profiles table"');
 expect(html).toContain('aria-label="Scrollable coalition allocation table"');
 expect(html).toContain('aria-label="Scrollable partner freight comparison table"');
});
