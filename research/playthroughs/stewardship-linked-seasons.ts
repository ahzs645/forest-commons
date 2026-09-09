import {writeFileSync} from 'node:fs';
import {quebec} from '../../forestry-game/src/scenarios/quebec.ts';
import {createGame,draftPlan,advance} from '../../forestry-game/src/simulation/engine.ts';
import {illustrativeCalendar,beginLinkedSeason,settleLinkedSeason} from '../../forestry-game/src/simulation/season-calendar.ts';
import {parseGame} from '../../forestry-game/src/simulation/validation.ts';
import {serializeGame} from '../../forestry-game/src/simulation/save-format.ts';
const highBudget=process.argv.includes("--high-budget");const r=structuredClone(quebec);if(highBudget)r.economy.startingCash=3000000;r.seasonCalendar=illustrativeCalendar(r);let game=createGame(r);const reports=[];
for(const start of [13,40,52]){
 try { game=beginLinkedSeason(game,start);game=parseGame(serializeGame(game));
 const accessible=game.stands.filter(s=>s.owned).length;
 while(game.week<=12){game=advance(draftPlan(game,{treatment:'thinning'}));game=parseGame(serializeGame(game));}
 game=settleLinkedSeason(game);game=parseGame(serializeGame(game));
 reports.push({packedUtf16Bytes:serializeGame(game).length*2,accessible,rights:game.stewardship!.stands.filter(s=>s.managed).length,cash:game.stewardship!.cash,...game.stewardship!.history.at(-1)}); } catch(error) { reports.push({stopped:String(error),managementYear:game.stewardship?.year,week:game.week,cash:game.cash,packedUtf16Bytes:serializeGame(game).length*2}); break; }
}
writeFileSync(`../research/playthroughs/stewardship-linked-results${highBudget?'-high-budget':''}.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
