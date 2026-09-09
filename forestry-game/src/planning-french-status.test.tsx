import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider,translate} from './i18n';
import DisruptionDesk from './DisruptionDesk';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
afterEach(()=>vi.unstubAllGlobals());
it('translates the bundled challenge prose and preserves unknown authored prose',()=>{
 for(const objective of quebec.objectives!){
  expect(translate(objective.title,'fr')).not.toBe(objective.title);
  expect(translate(objective.description,'fr')).not.toBe(objective.description);
  expect(translate(objective.description,'en')).toBe(objective.description);
 }
 const custom='Our local harvest challenge: deliver 19 m³ to Jane’s yard.';
 expect(translate(custom,'fr')).toBe(custom);
 expect(translate('Error: Pre-season positioning is closed.','fr')).toBe('Le positionnement avant saison est fermé.');
});
it('renders upcoming, active and restored disruption status in French',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'fr'});
 const g=createGame(quebec);
 const render=()=>renderToStaticMarkup(<LanguageProvider><DisruptionDesk game={g} onRespond={()=>{}}/></LanguageProvider>);
 g.week=4;expect(render()).toContain('Fermeture à venir');expect(render()).not.toContain('Upcoming closure');
 g.week=5;expect(render()).toContain('disponible immédiatement');
 g.week=7;expect(render()).toContain('disponible dans 1 tour(s)');
 g.week=9;expect(render()).toContain('Service normal rétabli');
});
