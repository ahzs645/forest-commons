import {afterEach,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import NetworkDispatchLab from './NetworkDispatchLab';
import {LanguageProvider} from './i18n';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
afterEach(()=>vi.unstubAllGlobals());
it('renders recovery rather than crashing on malformed saved results in both languages',()=>{
 const damaged=JSON.stringify({version:1,editor:'{}',run:{},offer:null});
 for(const language of ['en','fr']){
  const setItem=vi.fn();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='forest-language'?language:damaged,setItem});
  const html=renderToStaticMarkup(<LanguageProvider><NetworkDispatchLab game={createGame(quebec)}/></LanguageProvider>);
  expect(html).toContain('role="alert"');
  expect(html).toContain(language==='en'?'The original save is retained':'La sauvegarde originale est conservée');
  expect(html).toMatch(/<button class="primary" disabled="">/);
  expect(html).toContain(language==='en'?'New regional teaching case':'Nouveau cas pédagogique régional');
  expect(setItem).not.toHaveBeenCalled();
 }
});
