import {expect,it} from 'vitest';
import {createGame,advance,draftPlan} from './engine';
import {quebec} from '../scenarios/quebec';
import {startStewardship,stewardshipYear,validateStewardship,captureStewardshipStands} from './stewardship';
import {captureAnnualAlternative,rehearseAnnualAlternative,rehearseAnnual} from './annual-alternatives';
import {beginLinkedSeason,illustrativeCalendar,settleLinkedSeason} from './season-calendar';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
const game=()=>{const g=createGame(quebec);g.stewardship=startStewardship(g);return g;};
it('rehearses different choices from the same forest without changing either campaign, budget or history',()=>{
 const g=game(),before=structuredClone(g),a=captureAnnualAlternative(g,{Q01:'final'}),b=captureAnnualAlternative(g,{Q01:'thin'});
 const final=rehearseAnnualAlternative(g,a),thin=rehearseAnnualAlternative(g,b);
 expect(final.history.at(-1)!.harvest).toBeGreaterThan(thin.history.at(-1)!.harvest);
 expect(final.cash).not.toBe(thin.cash);expect(final.history.at(-1)!.habitat).toBeLessThan(thin.history.at(-1)!.habitat);
 expect(g).toEqual(before);expect(final.history.at(-1)!.standSnapshots).toEqual(captureStewardshipStands(final.stands));
 a.actions.Q01='rest';expect(final.history.at(-1)!.actions.Q01).toBe('final');
});
it('invalidates drafts on changed opening state/parameters and enforces real annual constraints',()=>{
 const g=game(),draft=captureAnnualAlternative(g,{Q01:'final'}),changed=structuredClone(g);changed.stewardship=stewardshipYear(g.region,g.stewardship!,draft.actions);
 expect(()=>rehearseAnnualAlternative(changed,draft)).toThrow('changed');
 expect(()=>rehearseAnnual(changed,{Q01:'thin'})).toThrow('five years');
 expect(()=>captureAnnualAlternative(g,{Q01:'plant'})).toThrow('regeneration space');
 const revised=structuredClone(g);revised.region.stewardship!.finalRetention=.3;expect(()=>rehearseAnnualAlternative(revised,draft)).toThrow('changed');
});
it('blocks annual rehearsal throughout the connected operating window',()=>{
 const r=structuredClone(quebec);r.seasonCalendar=illustrativeCalendar(r);const linked=beginLinkedSeason(createGame(r),13),before=structuredClone(linked);
 expect(()=>captureAnnualAlternative(linked,{Q01:'final'})).toThrow('active operating window');expect(()=>rehearseAnnual(linked,{})).toThrow('active operating window');expect(linked).toEqual(before);
});
it('keeps old annual saves readable and validates prospective snapshot observations',()=>{
 const g=game();g.stewardship=stewardshipYear(g.region,g.stewardship!,{Q01:'final'});
 expect(parseGame(serializeGame(g)).stewardship!.history[0].standSnapshots).toEqual(captureStewardshipStands(g.stewardship.stands));
 const bad=structuredClone(g.stewardship);bad.history[0].standSnapshots![0].habitat=2;expect(()=>validateStewardship(g.region,bad)).toThrow('snapshot');
 const totals=structuredClone(g.stewardship);totals.history[0].standSnapshots![0].volume+=1;expect(()=>validateStewardship(g.region,totals)).toThrow('snapshot totals');
 const duplicate=structuredClone(g.stewardship);duplicate.history[0].standSnapshots![1].id='Q01';expect(()=>validateStewardship(g.region,duplicate)).toThrow('snapshot');
 delete g.stewardship.history[0].standSnapshots;expect(()=>parseGame(serializeGame(g))).not.toThrow();
});
it('captures linked year-end observations after harvest habitat corrections, without double harvesting',()=>{
 const r=structuredClone(quebec);r.seasonCalendar=illustrativeCalendar(r);let g=beginLinkedSeason(createGame(r),13);
 while(g.week<=12)g=advance(draftPlan(g,{treatment:'thinning'}));
 const harvested=g.stands.reduce((n,s)=>n+s.harvested,0);g=settleLinkedSeason(g);
 expect(g.stewardship!.history[0].harvest).toBeCloseTo(harvested);expect(g.stewardship!.history[0].standSnapshots).toEqual(captureStewardshipStands(g.stewardship!.stands));expect(()=>parseGame(serializeGame(g))).not.toThrow();
},60000);
