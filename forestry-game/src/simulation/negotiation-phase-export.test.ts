import {it,expect} from 'vitest';
import {createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {debriefMarkdown,worksheetCSV} from './debrief';
it('exports frozen paired/open phases and keeps legacy phase unknown',()=>{
 const g=createGame(quebec);
 g.negotiation.offers=[undefined,'pairs','open'].map((phase,i)=>({id:i+1,count:4,groups:[1,2,3,4,5],shares:{1:0,2:0,3:0,4:0},accepted:['1','2','3','4'],status:'agreed',...(phase?{phase:phase as 'pairs'|'open'}:{})}));
 const en=debriefMarkdown(g),fr=debriefMarkdown(g,'fr'),csv=worksheetCSV(g);
 expect(en).toContain('Phase not recorded');expect(en).toContain('Paired round');expect(en).toContain('Open round');
 expect(fr).toContain('| 1 | Non enregistrée |');expect(fr).toContain('| 2 | Par paires |');expect(fr).toContain('| 3 | Ouvert |');
 expect(csv).toContain('"proposal","status","phase","company"');expect(csv).toContain('"1","agreed","unknown"');expect(csv).toContain('"2","agreed","pairs"');expect(csv).toContain('"3","agreed","open"');
});
