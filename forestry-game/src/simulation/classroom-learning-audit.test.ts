import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame} from './engine';
import {teamResult,parseCohort,cohortPacket,comparable} from './classroom-learning';
it('audit rejects cohort records with impossible annual calendar positions',async()=>{
 const row=await teamResult('a',createGame(quebec));
 expect(()=>parseCohort(cohortPacket([{...row,scope:'annual-season',startWeek:53}]))).toThrow();
 expect(()=>parseCohort(cohortPacket([{...row,scope:'campaign',startWeek:13}]))).toThrow();
});
it('audit does not label differently denominated results comparable',async()=>{
 const row=await teamResult('a',createGame(quebec));
 expect(comparable(row,{...row,currency:'USD'})).toBe(false);
});
