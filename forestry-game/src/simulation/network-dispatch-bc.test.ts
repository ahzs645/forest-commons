import { expect, it } from 'vitest';
import { princeGeorge } from '../scenarios/prince-george';
import { createGame } from './engine';
import { answerNetworkOffer, networkOffer, regionalNetworkCase, solveNetwork } from './network-dispatch';
it('solves and unanimously allocates the five-company BC FSR case without duplicating loads',()=>{
 const game=createGame(princeGeorge),n=regionalNetworkCase(game,5);
 const independent=solveNetwork(game,n,'independent'),pooled=solveNetwork(game,n,'pooled');
 expect(pooled.cost).toBeLessThanOrEqual(independent.cost+1e-6);
 const jobs=[...pooled.itineraries.flatMap(p=>p.jobs),...pooled.outsourced];
 expect(jobs.sort()).toEqual(n.cargo.map(c=>c.id).sort());
 let offer=networkOffer(n,independent,pooled,'proportional');
 for(const company of n.companies)offer=answerNetworkOffer(offer,company.id,true);
 expect(offer.status).toBe('agreed');
 expect(Object.values(offer.costs).reduce((n,v)=>n+v,0)).toBeCloseTo(pooled.cost);
 expect(pooled.itineraries.every(p=>p.legs.at(-1)!.to===n.vehicles.find(v=>v.id===p.vehicle)!.node)).toBe(true);
},30000);

it('rejects an unavailable regional case size instead of silently simulating fewer companies',()=>{
 const game=createGame(princeGeorge);game.region.mills=game.region.mills.slice(0,3);
 expect(()=>regionalNetworkCase(game,5)).toThrow('5 mills and trucks');
 expect(regionalNetworkCase(game,3).companies).toHaveLength(3);
});
