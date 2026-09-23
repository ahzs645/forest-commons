import {expect,it} from 'vitest';
import {advance,createGame,draftPlan} from './engine';
import {quebec} from '../scenarios/quebec';
import {princeGeorge} from '../scenarios/prince-george';
import {debriefMarkdown,diagnose,securedSupply} from './debrief';
import {applyHarvestAuthorization,securedAwaitingAuthorization} from './tenure';
import {siteReadiness} from './operational-readiness';

it('explains an idle turn once secured timber is cut down to its retention floor',()=>{
 let game=createGame(quebec);
 game=advance(draftPlan(game));
 expect(diagnose(game).some(f=>f.id==='secured-supply')).toBe(false);
 for(const s of game.stands)if(s.owned)s.remaining=quebec.stands.find(d=>d.id===s.id)!.volume*game.plan.retention;
 game=advance(game);
 expect(securedSupply(game).harvestable).toBe(0);
 const finding=diagnose(game).find(f=>f.id==='secured-supply');
 expect(finding?.evidence[0]).toMatch(/^0 m³ harvestable on secured lots/);
 expect(debriefMarkdown(game,'fr')).toContain('### Bois sécurisé épuisé');
 // Earlier turns are not re-diagnosed against today's stock.
 expect(diagnose(game,0).some(f=>f.id==='secured-supply')).toBe(false);
});

it('lists secured BC lots that still need a harvest authorization until one is applied for',()=>{
 let game=createGame(princeGeorge);
 const waiting=securedAwaitingAuthorization(game).map(a=>a.id);
 expect(waiting.length).toBeGreaterThan(0);
 game=advance(game);
 expect(diagnose(game).find(f=>f.id==='authorization')?.evidence).toContain(`${waiting[0]}: authorization application required.`);
 expect(debriefMarkdown(game,'fr')).toContain(`${waiting[0]} : demande d’autorisation requise.`);
 game=applyHarvestAuthorization(game,waiting[0]);
 expect(securedAwaitingAuthorization(game).map(a=>a.id)).not.toContain(waiting[0]);
 expect(securedAwaitingAuthorization(createGame(quebec))).toEqual([]);
});

it('does not flag empty roadside stock when this turn’s crew plan cuts the site first',()=>{
 const game=draftPlan(createGame(quebec));
 const [crew,orders]=Object.entries(game.plan.crews).find(([,o])=>o.length)!;
 const stand=orders[0].stand;
 expect(siteReadiness(game,stand,{}).find(c=>c.code==='stock')?.level).toBe('ready');
 const idle=structuredClone(game);idle.plan.crews[crew]=[];
 for(const c of Object.keys(idle.plan.crews))idle.plan.crews[c]=idle.plan.crews[c].filter(o=>o.stand!==stand);
 expect(siteReadiness(idle,stand,{}).find(c=>c.code==='stock')?.level).toBe('warning');
});
