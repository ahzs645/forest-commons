import {expect,it} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance} from './engine';
import {authorReciprocal,acceptReciprocal,renewReciprocal,validateReciprocal} from './reciprocal';
import {subdividedScenario} from './turn-duration';
it('starts clean campaigns from played regions without orphaning renewal consent',()=>{
 let game=authorReciprocal(createGame(quebec),{name:'Reset audit',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:10,opens:1,deadline:4});
 const id=game.region.reciprocalPairs![0].id;
 game=acceptReciprocal(acceptReciprocal(game,id,'A','equal'),id,'B','equal');
 game=renewReciprocal(game,id,{opens:5,deadline:8});
 for(const region of [game.region,subdividedScenario(game.region,2)]){
  const fresh=createGame(region);
  expect(fresh.region.reciprocalPairs).toHaveLength(1);
  expect(fresh.reciprocal).toBeUndefined();
  expect(()=>validateReciprocal(fresh)).not.toThrow();
  expect(()=>advance(fresh)).not.toThrow();
 }
 expect(game.region.reciprocalPairs).toHaveLength(2);
 expect(game.reciprocal!['renewed-pair-1']).toBeDefined();
});
