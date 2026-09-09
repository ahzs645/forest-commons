import {writeFileSync} from 'node:fs';
import {quebec} from '../../forestry-game/src/scenarios/quebec.ts';
import {createGame,draftPlan,advance,sum} from '../../forestry-game/src/simulation/engine.ts';
import {parseGame} from '../../forestry-game/src/simulation/validation.ts';
import {serializeGame} from '../../forestry-game/src/simulation/save-format.ts';
const results=[];
for(const weather of Object.keys(quebec.weather))for(const commitmentAware of [false,true]){
 let game=createGame(quebec,weather,2026);
 while(game.week<=game.region.weeks){game=advance(draftPlan(game,{commitmentAware}));game=parseGame(serializeGame(game));}
 results.push({weather,commitmentAware,harvest:game.history.reduce((n,h)=>n+sum(h.harvested),0),delivered:game.history.reduce((n,h)=>n+sum(h.delivered),0),cash:game.cash,targetChecks:game.history.reduce((n,h)=>n+h.targetChecks,0),targetHits:game.history.reduce((n,h)=>n+h.targetHits,0),waste:game.history.reduce((n,h)=>n+h.waste,0)});
}
writeFileSync('../research/playthroughs/stewardship-draft-comparison.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
