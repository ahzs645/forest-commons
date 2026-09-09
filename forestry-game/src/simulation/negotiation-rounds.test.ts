import {it,expect} from 'vitest';
import {createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {propose,respond} from './negotiation';
import {parseGame} from './validation';
import {teamResult,cohortPacket,parseCohort} from './classroom-learning';
it('retains paired then open unanimous outcomes and unknown legacy phases',async()=>{
 let g=createGame(quebec);g.negotiation.count=4;g.negotiation.phase='pairs';g.negotiation.groups=[1,1,2,2,5];g.negotiation.custom={};
 g=propose(g);for(const c of ['1','2','3','4'])g=respond(g,1,c,true);
 g.negotiation.phase='open';g.negotiation.groups=[1,1,1,1,5];g=propose(g);for(const c of ['1','2','3','4'])g=respond(g,2,c,true);
 g=parseGame(JSON.stringify(g));expect(g.negotiation.offers!.map(o=>o.phase)).toEqual(['pairs','open']);
 const row=await teamResult('Two rounds',g);expect(row.metrics!.negotiationRounds!.map(o=>o.phase)).toEqual(['pairs','open']);expect(parseCohort(cohortPacket([row]))[0]).toEqual(row);
 const tampered=structuredClone(row);tampered.metrics!.negotiationRounds![0].shares['1']+=1;expect(()=>parseCohort(cohortPacket([tampered]))).toThrow('allocation');
 const badSave=structuredClone(g);badSave.negotiation.offers![1].phase='pairs';expect(()=>parseGame(JSON.stringify(badSave))).toThrow();
 delete g.negotiation.offers![0].phase;const legacy=await teamResult('Legacy',parseGame(JSON.stringify(g)));expect(legacy.metrics!.negotiationRounds![0]).not.toHaveProperty('phase');expect(parseCohort(cohortPacket([legacy]))[0].metrics!.negotiationRounds![0]).not.toHaveProperty('phase');
});
