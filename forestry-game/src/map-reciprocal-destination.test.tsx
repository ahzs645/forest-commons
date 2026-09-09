import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from './i18n';
import MapRolePanel from './MapRolePanel';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {authorReciprocal,acceptReciprocal} from './simulation/reciprocal';
import type {Game} from './simulation/types';
afterEach(()=>vi.unstubAllGlobals());
function fixture(routing:'fixed'|'flexible'){
 let g=authorReciprocal(createGame(quebec),{name:'Map agreement',routing,minimumOwnA:100,minimumOwnB:100,standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:200,ownReserveM3:10,opens:1,deadline:4});
 const id=g.region.reciprocalPairs!.at(-1)!.id;
 g=acceptReciprocal(acceptReciprocal(g,id,'A','equal'),id,'B','equal');
 for(const state of g.stands.filter(s=>['Q01','Q02'].includes(s.id))){state.remaining-=100;state.harvested+=100;state.stock=[{product:'soft-saw',volume:100,week:1,quality:1}];}
 g.region.roads.edges.forEach(e=>e.bearing=1);g.region.disruptions=[];
 return g;
}
function render(g:Game,selected='Q02'){
 return renderToStaticMarkup(<LanguageProvider><MapRolePanel game={g} role="transport" setRole={()=>{}} product="soft-saw" setProduct={()=>{}} zone="" setZone={()=>{}} selected={selected} select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/></LanguageProvider>);
}
it('blocks fixed cross destinations and explains the own destination in EN and FR',()=>{
 const g=fixture('fixed');
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});const html=render(g);
  expect(html).toContain(language==='en'?'Choose that mill to append a haul.':'Choisissez cette usine pour ajouter un transport.');
  expect(html).toMatch(language==='en'?/<button disabled="">Append haul<\/button>/:/<button disabled="">Ajouter un transport<\/button>/);
 }
});
it('keeps fixed own-mill deliveries available',()=>{
 const html=render(fixture('fixed'),'Q01');expect(html).toContain('<button>Append haul</button>');expect(html).not.toContain('Choose that mill to append a haul.');
});
it('warns about flexible protected stock without preventing a queue that can release stock earlier',()=>{
 const html=render(fixture('flexible'));expect(html).toContain('An own-mill delivery earlier in the same turn can release stock');expect(html).toContain('<button>Append haul</button>');
});
