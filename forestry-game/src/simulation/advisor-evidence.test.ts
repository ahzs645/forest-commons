import {expect,it} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,sum} from './engine';
import {forecastPlanningGame,rollingOptimize} from './rolling-optimizer';
it('retains real forecast report evidence without hidden events or future actual weather',async()=>{
 const g=createGame(quebec);g.region.crews=g.region.crews.slice(0,1);g.region.trucks=g.region.trucks.slice(0,1);
 const truck=g.region.trucks[0],stand=g.region.stands[0],mill=g.region.mills[0];
 g.plan.trucks[truck.id]=[{stand:stand.id,mill:mill.id,product:'soft-saw',loads:1}];
 g.region.disruptions=[{id:'secret',title:'SECRET CLOSURE',description:'Hidden',kind:'truck',target:truck.id,week:1,endWeek:2,revealWeek:2,repairCost:0,repairWeeks:0}];
 const expected=advance(forecastPlanningGame(g)).history.at(-1)!;
 const result=await rollingOptimize(g,1),candidate=result.candidates.find(c=>c.id==='none:current')!;
 expect(candidate.problem).toBeUndefined();expect(candidate.evidence).toHaveLength(1);
 expect(candidate.evidence![0]).toMatchObject({turn:1,delivered:sum(expected.delivered),waste:expected.waste});
 expect(candidate.evidence![0].messages.length).toBeLessThanOrEqual(12);
 for(const message of candidate.evidence![0].messages)expect(expected.messages).toContain(message);
 expect(candidate.evidence![0].messages.some(m=>m.includes('no delivery'))).toBe(true);
 expect(JSON.stringify(result.candidates.map(c=>c.evidence))).not.toContain('SECRET CLOSURE');
},30000);
