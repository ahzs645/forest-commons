import {it,expect} from 'vitest';
import {parseNetworkLabSave} from './network-lab-save';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {regionalNetworkCase,solveNetwork,networkOffer} from './simulation/network-dispatch';
it('restores computed results and rejects damaged rendering fields',()=>{
 const game=createGame(quebec),network=regionalNetworkCase(game,2);
 const independent=solveNetwork(game,network,'independent'),pooled=solveNetwork(game,network,'pooled');
 const saved={version:1,editor:JSON.stringify(network),run:{network,independent,pooled,context:'audit'},offer:networkOffer(network,independent,pooled,'proportional')};
 expect(parseNetworkLabSave(JSON.stringify(saved))).toEqual(saved);
 for(const mutate of [(v:any)=>v.run={},(v:any)=>v.run.network.note=null,(v:any)=>v.run.pooled.itineraries[0].legs=null,(v:any)=>delete v.offer.costs.N1]){
  const damaged=structuredClone(saved);mutate(damaged);expect(()=>parseNetworkLabSave(JSON.stringify(damaged))).toThrow();
 }
 expect(parseNetworkLabSave(JSON.stringify({...saved,run:null,offer:null})).run).toBeNull();
});
