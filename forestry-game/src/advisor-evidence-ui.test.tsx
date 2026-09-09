import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from './i18n';
import {CandidateExplanation} from './RollingOptimizer';
import type {RollingCandidate} from './simulation/rolling-optimizer';
afterEach(()=>vi.unstubAllGlobals());
it('explains candidate observations in both languages and labels truncation',()=>{
 const candidate={evidence:[{turn:2,delivered:12.5,waste:0,messages:['T1: no delivery for Q01 / soft-saw; check stock, demand and time.'],omittedMessages:3}]} as RollingCandidate;
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});
  const html=renderToStaticMarkup(<LanguageProvider><CandidateExplanation candidate={candidate}/></LanguageProvider>);
  expect(html).toContain(language==='fr'?'Éléments de la simulation':'Simulation evidence');
  expect(html).toContain(language==='fr'?'aucune livraison':'no delivery');
  expect(html).toContain(language==='fr'?'autres messages non affichés':'additional messages not shown');
 }
});
