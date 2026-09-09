import {expect,it} from 'vitest';
import {advance,createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {debriefMarkdown,diagnose} from './debrief';

it('exports French service diagnosis from an actual idle campaign without changing its evidence',()=>{
 let game=createGame(quebec);
 for(let turn=0;turn<4;turn++)game=advance(game);
 const before=JSON.stringify(game);
 expect(game.history.some((_,index)=>diagnose(game,index).some(f=>f.id==='service'))).toBe(true);
 const french=debriefMarkdown(game,'fr');
 expect(french).toContain('### Engagements manqués');
 expect(french).toContain('Examinez le registre par usine et les assortiments restants.');
 expect(french).toContain('engagements respectés sur');
 expect(JSON.stringify(game)).toBe(before);
});

it('exports every diagnostic category in French and retains original operating evidence',()=>{
 const game=advance(createGame(quebec));
 const report=game.history[0];
 report.messages=['Crew A: terrain closed at Q01 (thaw).','Crew B: relocation exceeds assigned hours for Q02.','Crew C: Q03 is not owned.'];
 report.degraded=20;report.waste=10;report.targetChecks=2;report.targetHits=1;
 const french=debriefMarkdown(game,'fr');
 for(const heading of ['Météo et accès','Capacité des ressources','Droits d’approvisionnement','Perte de valeur du stock','Engagements manqués'])expect(french).toContain(`### ${heading}`);
 expect(french).toContain('20 m³ déclassés; 10 m³ expirés.');
 for(const message of report.messages)expect(french).toContain(message);
 expect(french).not.toContain('### Weather and access');
});
