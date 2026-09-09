import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ReciprocalSettlement from './ReciprocalSettlement';
import {reciprocalDebrief} from './simulation/reciprocal-debrief';
import {authorReciprocal} from './simulation/reciprocal';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
it('explains an asymmetric paid settlement without changing its recorded totals',()=>{
 const terms={id:'pair',name:'Pair',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:4};
 const agreement={terms,method:'equal' as const,accepted:['A','B'],movedM3:20,savings:24,shareA:12,shareB:12,transferToA:-4};
 const exportedGame=createGame(quebec);exportedGame.region.reciprocalPairs=[terms];exportedGame.reciprocal={pair:agreement};
 expect(reciprocalDebrief(exportedGame,'en').join('\n')).toContain('| pair | A | 16.00 | -4.00 | 12.00 |');
 expect(reciprocalDebrief(exportedGame,'fr').join('\n')).toContain('| pair | B | 8,00 | 4,00 | 12,00 |');
 const before=JSON.stringify(agreement),html=renderToStaticMarkup(<ReciprocalSettlement agreement={agreement} currency="CAD"/>);
 expect(html).toContain('16.00');expect(html).toContain('8.00');expect(html).toContain('-4.00');expect(html).toContain('12.00');expect(html).toContain('does not change the game');expect(JSON.stringify(agreement)).toBe(before);
 const companyB=renderToStaticMarkup(<ReciprocalSettlement agreement={agreement} currency="CAD" company="B"/>);expect(companyB).toContain('<th>B</th>');expect(companyB).not.toContain('<th>A</th>');expect(companyB).toContain('8.00');expect(companyB).not.toContain('16.00');
});
it('exports own destinations for fixed routing in both languages',()=>{
 const game=authorReciprocal(createGame(quebec),{name:'Fixed',routing:'fixed',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:4});
 for(const language of ['en','fr'] as const){const report=reciprocalDebrief(game,language).join('\n');expect(report).toContain('Q01 → M1; Q02 → M2');expect(report).not.toContain('Q01 → M2; Q02 → M1');}
});
