import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createGame} from '../../forestry-game/src/simulation/engine.ts';
import {quebec} from '../../forestry-game/src/scenarios/quebec.ts';
import {regionalNetworkCase,solveNetwork,networkOffer,answerNetworkOffer} from '../../forestry-game/src/simulation/network-dispatch.ts';
const game=createGame(quebec),network=regionalNetworkCase(game);
const independent=solveNetwork(game,network,'independent'),pooled=solveNetwork(game,network,'pooled');
let offer=networkOffer(network,independent,pooled,'proportional');
const decisions=[];
for(const c of network.companies){const accept=offer.costs[c.id]<=independent.companyCosts[c.id]+.0001;decisions.push({company:c.id,independentCost:independent.companyCosts[c.id],proposedCost:offer.costs[c.id],accept});offer=answerNetworkOffer(offer,c.id,accept);}
const positions=Object.fromEntries(network.vehicles.map(v=>[v.id,v.node])),delivered:string[]=[];let cashCost=pooled.fixedCost;
const weeks=[];
for(let week=network.start;week<network.start+network.weeks;week++){
 const actions=[];
 for(const itinerary of pooled.itineraries){let hours=0,stops=0;for(const leg of itinerary.legs.filter(l=>l.week===week)){
  assert.equal(positions[itinerary.vehicle],leg.from);positions[itinerary.vehicle]=leg.to;hours+=leg.hours;cashCost+=leg.cost;
  if(leg.job){const cargo=network.cargo.find(c=>c.id===leg.job)!;assert.ok(cargo.release<=week&&cargo.deadline>=week);assert.ok(!delivered.includes(leg.job));delivered.push(leg.job);stops++;}
  actions.push({vehicle:itinerary.vehicle,...leg});
 }assert.ok(hours<=network.vehicles.find(v=>v.id===itinerary.vehicle)!.hours+1e-8);assert.ok(stops<=2);}
 weeks.push({week,actions});
}
for(const c of network.cargo.filter(c=>pooled.outsourced.includes(c.id))){cashCost+=c.outsideCost;delivered.push(c.id);}
assert.equal(delivered.length,network.cargo.length);assert.ok(Math.abs(cashCost-pooled.cost)<1e-6);for(const v of network.vehicles)assert.equal(positions[v.id],v.node);
const output={kind:'Programmatic three-week separate network lab round; no browser interaction or campaign mutations',network,independent,pooled,savings:independent.cost-pooled.cost,decisions,offer,weeks,verified:{uniqueShipments:true,weeklyCapacity:true,locationContinuity:true,terminalDepotReturn:true,ledgerReconciles:true}};
writeFileSync(new URL('./operations-network-round.json',import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify({independent:independent.cost,pooled:pooled.cost,savings:output.savings,columns:pooled.columns,status:offer.status,outsourced:pooled.outsourced,decisions},null,2));
