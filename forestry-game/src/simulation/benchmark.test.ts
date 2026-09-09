import {it,expect} from 'vitest';
import {createGame,draftPlan} from './engine';
import {quebec} from '../scenarios/quebec';
import {dispatchBenchmark} from './benchmark';
it('produces a reproducible feasible full-load reference without hindsight',()=>{
 const g=draftPlan(createGame(quebec)),before=JSON.stringify(g),a=dispatchBenchmark(g);
 expect(JSON.stringify(g)).toBe(before);expect(a.report).not.toBeNull();expect(a.candidates).toBeLessThanOrEqual(g.region.trucks.length*4);
 for(const t of g.region.trucks){expect(a.game.plan.trucks[t.id].length).toBeLessThanOrEqual(1);expect(a.report!.truckHours[t.id]).toBeLessThanOrEqual(t.hours+.0001);}
 for(const w of Object.values(g.region.weather))for(const z of g.region.zones)w.actual[z.id].fill('thaw');g.seed=99999;
 expect(dispatchBenchmark(g).game.plan.trucks).toEqual(a.game.plan.trucks);
},10000);
