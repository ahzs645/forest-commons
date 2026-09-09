import {it,expect} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {createGame,advance} from './engine';
import {applyRoadAuthorization} from './tenure';
import {replayRoadIds} from './replay-roads';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
it('keeps old road access closed after later approval and roundtrips operational IDs',()=>{
 const r=structuredClone(princeGeorge);const id=Object.keys(r.bcTenure!.roads).find(id=>!id.startsWith('access-'))!;expect(id).toBeTruthy();
 r.bcTenure!.roads[id].initialStatus='required';r.bcTenure!.roads[id].delayWeeks=0;
 let g=advance(createGame(r));expect(replayRoadIds(g,g.history[0])!.has(id)).toBe(false);
 g=applyRoadAuthorization(g,id);expect(replayRoadIds(g)!.has(id)).toBe(true);expect(replayRoadIds(g,g.history[0])!.has(id)).toBe(false);
 g=parseGame(serializeGame(g));expect(replayRoadIds(g,g.history[0])!.has(id)).toBe(false);
 const legacy=structuredClone(g);delete legacy.history[0].snapshot!.operationalRoadIds;expect(replayRoadIds(parseGame(serializeGame(legacy)),legacy.history[0])).toBeNull();
 const invalid=structuredClone(g);invalid.history[0].snapshot!.operationalRoadIds!.push('missing-road');expect(()=>parseGame(serializeGame(invalid))).toThrow();
});
