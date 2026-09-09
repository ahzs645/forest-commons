import {expect,it} from 'vitest';
import {createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {debriefMarkdown} from './debrief';
it('exports reciprocal losses and predecessor links in both languages without merging campaign cash',()=>{
 const g=createGame(quebec);
 g.reciprocal={child:{terms:{id:'child',renews:'parent',name:'Fixture',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:5,deadline:8},accepted:['A','B'],method:'equal',movedM3:40,savings:-83.6,shareA:-41.8,shareB:-41.8,transferToA:0}};
 for(const language of ['en','fr'] as const){
  const text=debriefMarkdown(g,language);
  expect(text).toContain('| child | parent | 5–8 |');
  expect(text).toContain(language==='en'?'-83.60':'-83,60');
  expect(text).toContain(language==='en'?'additional network cash':'trésorerie supplémentaire');
 }
 expect(debriefMarkdown(createGame(quebec))).toContain('No reciprocal agreement recorded.');
});
it('keeps unaccepted authored agreements visible with terms and no invented sharing rule',()=>{
 const g=createGame(quebec);
 g.region.reciprocalPairs=[{id:'pending',name:'Pending',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:500,ownReserveM3:50,opens:1,deadline:4}];
 g.reciprocal={};
 const en=debriefMarkdown(g),fr=debriefMarkdown(g,'fr');
 expect(en).toContain('| pending | — | 1–4 | 0.00 |');
 expect(en).toContain('| pending | Q01 → M2; Q02 → M1 | soft-saw | 500.00 | 50.00 | Not chosen yet | No company |');
 expect(fr).toContain('Pas encore choisie | Aucune entreprise');
 expect(en).not.toContain('No reciprocal agreement recorded.');
 expect(en).not.toMatch(/\|\n\n\|/);
 expect(fr).not.toMatch(/\|\n\n\|/);
});
it('distinguishes a frozen method from bilateral consent in the debrief',()=>{
 const g=createGame(quebec);
 g.reciprocal={one:{terms:{id:'one',name:'One',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:4},accepted:['A'],method:'cost-weighted',movedM3:0,savings:0,shareA:0,shareB:0,transferToA:0}};
 expect(debriefMarkdown(g)).toContain('Proportional to direct transport cost | A |');
 expect(debriefMarkdown(g,'fr')).toContain('Proportionnelle au coût du transport direct | A |');
});
