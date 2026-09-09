import { expect, it } from 'vitest';
import { princeGeorge } from '../scenarios/prince-george';
import { advance, createGame, draftPlan } from './engine';
import { beginLinkedSeason, illustrativeCalendar, settleLinkedSeason, validateLinkedSeason } from './season-calendar';
import { parseGame } from './validation';
import { serializeGame } from './save-format';
import { startStewardship, stewardshipYear, validateStewardship } from './stewardship';

it('plays BC linked operations, settles actual harvest and resumes without Québec entity references', () => {
 const region=structuredClone(princeGeorge);region.seasonCalendar=illustrativeCalendar(region);
 let game=beginLinkedSeason(createGame(region),20);
 while(game.week<=game.region.weeks)game=advance(draftPlan(game,{treatment:'thinning'}));
 const harvest=game.stands.reduce((n,s)=>n+s.harvested,0);
 expect(harvest).toBeGreaterThan(0);
 game=settleLinkedSeason(game);validateLinkedSeason(game);
 expect(game.stewardship!.history[0].harvest).toBeCloseTo(harvest);
 game=parseGame(serializeGame(game));
 expect(game.cash).toBeGreaterThan(0);
 game=beginLinkedSeason(game,20);expect(game.region.id).toBe(princeGeorge.id);expect(()=>parseGame(serializeGame(game))).not.toThrow();
 for(const stand of game.region.stands.filter(s=>s.id in game.stewardship!.history[0].actions))expect(stand.supply).toBe('protected');
},300000); // Full geographic linked campaign on a busy host.

it('plays thirty BC annual years with harvesting, cooldown, planting and balanced inventory',()=>{
 const game=createGame(princeGeorge);let state=startStewardship(game);
 const id=state.stands.find(s=>s.managed)!.id;
 for(let year=1;year<=30;year++){
  const action=year===1||year===11||year===21?'final':year===2||year===12||year===22?'plant':'rest';
  state=stewardshipYear(game.region,state,{[id]:action});validateStewardship(game.region,state);
 }
 expect(state.year).toBe(31);expect(state.history.filter(h=>h.harvest>0)).toHaveLength(3);
 expect(()=>stewardshipYear(game.region,state,{})).toThrow('complete');
});
