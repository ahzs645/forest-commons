import { expect, it } from 'vitest';
import { createGame, advance, draftPlan } from './engine';
import {authorReciprocal,acceptReciprocal} from './reciprocal';
import { quebec } from '../scenarios/quebec';
import { cohortPacket, parseCohort, teamResult, comparable } from './classroom-learning';

it('retains a costly reciprocal outcome in the exported and reimported teaching results', async () => {
  const game = advance(draftPlan(createGame(quebec)));
  // A balanced exchange may travel farther than independent deliveries.
  game.history[0].partnerSavings = -83.6;
  const row = await teamResult('Costly exchange', game);
  expect(row.metrics!.partnerSavings).toBe(-83.6);
  expect(parseCohort(cohortPacket([row]))).toEqual([row]);
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(() => parseCohort(cohortPacket([{ ...row, metrics: { ...row.metrics!, partnerSavings: value } }]))).toThrow('metrics');
  }
  expect(() => parseCohort(cohortPacket([{ ...row, metrics: { ...row.metrics!, crewRelocationKm: -1 } }]))).toThrow('metrics');
});

it('preserves supported turn durations without inventing duration for older packets', async () => {
  for(const duration of [1,.5,.25,1/7]) {
    const game=advance(createGame({...quebec,turnDurationWeeks:duration}));
    const row=await teamResult('Duration audit',game);
    const [restored]=parseCohort(cohortPacket([row]));
    expect(restored.turnDurationWeeks).toBe(duration);
    expect(restored.weeks).toBe(1);
    expect(comparable(row,{...row,turnDurationWeeks:duration===1?.5:1})).toBe(false);
    const {turnDurationWeeks: _duration,...legacy}=row;
    expect(parseCohort(cohortPacket([legacy]))[0]).not.toHaveProperty('turnDurationWeeks');
    for(const invalid of [0,-1,2,null,'daily']) {
      expect(()=>parseCohort(JSON.stringify({format:'forest-classroom-results',version:1,rows:[{...row,turnDurationWeeks:invalid}]}))).toThrow();
    }
  }
});

it('keeps reciprocal trip outcomes separate from ordinary partner jobs',async()=>{
 let game=authorReciprocal(createGame(quebec),{name:'Fixture',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:2});
 const id=game.region.reciprocalPairs!.at(-1)!.id;
 game=advance(acceptReciprocal(acceptReciprocal(game,id,'A','equal'),id,'B','equal'));
 // This export fixture supplies both the trip report and reconciled agreement totals.
 game.history[0].partnerSavings=25;
 game.history[0].reciprocal=[{pair:id,volumeEach:40,savings:-83.6,shareA:-41.8,shareB:-41.8,transferToA:0}];
 Object.assign(game.reciprocal![id],{movedM3:40,savings:-83.6,shareA:-41.8,shareB:-41.8,transferToA:0});
 const row=await teamResult('Separate outcomes',game);
 expect(row.metrics).toMatchObject({partnerSavings:25,reciprocalSavings:-83.6});
 expect(parseCohort(cohortPacket([row]))).toEqual([row]);
 expect(()=>parseCohort(cohortPacket([{...row,metrics:{...row.metrics!,reciprocalOutcomes:[]}}]))).toThrow('totals mismatch');
 const {reciprocalSavings:_,...oldMetrics}=row.metrics!;
 expect(parseCohort(cohortPacket([{...row,metrics:oldMetrics}]))[0].metrics).not.toHaveProperty('reciprocalSavings');
 expect(()=>parseCohort(cohortPacket([{...row,metrics:{...row.metrics!,reciprocalSavings:Infinity}}]))).toThrow();
});
