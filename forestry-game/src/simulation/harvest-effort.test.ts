import {it,expect} from 'vitest';
import {createGame,draftPlan,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
it('pacing equals manual queue edits, retains dispatch, and survives settlement/reload',()=>{
 const g=createGame(quebec),before=JSON.stringify(g),full=draftPlan(g),half=draftPlan(g,{harvestFraction:.5});
 const manual=structuredClone(full);for(const queue of Object.values(manual.plan.crews))for(const order of queue)order.hours*=.5;
 expect(half).toEqual(manual);expect(half.plan.trucks).toEqual(full.plan.trucks);
 const settled=advance(half);expect(parseGame(serializeGame(settled)).cash).toBe(settled.cash);expect(JSON.stringify(g)).toBe(before);
 expect(draftPlan(g,{harvestFraction:1})).toEqual(full);
});
it('rejects invalid pacing before drafting',()=>{const g=createGame(quebec);for(const harvestFraction of [0,-1,1.1,NaN,Infinity])expect(()=>draftPlan(g,{harvestFraction})).toThrow('harvest effort');});
