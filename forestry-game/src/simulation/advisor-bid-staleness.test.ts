import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame} from './engine';
import {rollingOptimize,applyRollingCandidate,forecastPlanningGame} from './rolling-optimizer';
it('invalidates advice after bids increase or decrease while excluding awards from forecast simulation',async()=>{
 const g=createGame(quebec),lot=g.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek===1)!;g.plan.bids[lot.id]=100;
 const advice=await rollingOptimize(g,1),id=advice.candidates[0].id;
 expect(forecastPlanningGame(g).plan.bids).toEqual({});expect(()=>applyRollingCandidate(g,advice,id)).not.toThrow();
 for(const bid of [0,200]){const changed=structuredClone(g);changed.plan.bids[lot.id]=bid;expect(()=>applyRollingCandidate(changed,advice,id)).toThrow('stale');}
 const seed=structuredClone(g);seed.seed+=1;expect(forecastPlanningGame(seed)).toEqual(forecastPlanningGame(g));
 expect(applyRollingCandidate(g,advice,id).plan.bids).toEqual(g.plan.bids);
});
