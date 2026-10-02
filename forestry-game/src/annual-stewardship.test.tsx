import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import StewardshipLab from './StewardshipLab';
import AnnualActionMap from './AnnualActionMap';
import {createGame} from './simulation/engine';
import {startStewardship,stewardshipYear} from './simulation/stewardship';
import {quebec} from './scenarios/quebec';
it('places annual editing/review and advance before the full forest and historical explorer',()=>{
 const g=createGame(quebec);g.stewardship=stewardshipYear(g.region,startStewardship(g),{Q01:'final'});const before=structuredClone(g);
 const html=renderToStaticMarkup(<StewardshipLab game={g} onChange={()=>{throw Error('render must not save');}}/>);
 expect(html.indexOf('Apply treatments and advance one year')).toBeLessThan(html.indexOf('Full current forest'));
 expect(html.indexOf('Apply treatments and advance one year')).toBeLessThan(html.indexOf('Recorded year explorer'));
 expect(html).toContain('Compare annual alternatives');expect(html).toContain('Illustrative treatment preview');expect(html).toContain('Rehearsal only');expect(g).toEqual(before);
});
it('shows recorded actions on identical map extents while keeping absent legacy stand observations unknown',()=>{
 const g=createGame(quebec);const s=stewardshipYear(g.region,startStewardship(g),{Q01:'final'});delete s.history[0].standSnapshots;
 const before=structuredClone(s);const html=renderToStaticMarkup(<AnnualActionMap state={s} region={g.region} year={1}/>);
 expect(html).toContain('Q01 · final');expect(html).toContain('Historical stand observations unavailable in this older record.');expect(html).not.toContain('4,600');expect(s).toEqual(before);
});
