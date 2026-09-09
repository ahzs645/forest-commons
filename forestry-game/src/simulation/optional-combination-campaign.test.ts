import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {princeGeorge} from '../scenarios/prince-george';
import {createGame,advance,purchase,sum,stockAt} from './engine';
import {halfWeekScenario} from './turn-duration';
import {acceptReciprocal} from './reciprocal';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
import {lotProfitability} from './lot-profitability';
import type {RegionDefinition} from './types';
function overlay(source:RegionDefinition){
 const r=structuredClone(source),stands=r.stands.filter(s=>s.supply==='guaranteed').slice(0,2),[a,b]=r.mills,p=r.products[0].id;
 if(stands.length<2||r.trucks.length<4)throw Error('Combination test needs two managed stands and four trucks.');
 // Controlled authored overlays isolate interaction correctness on each regional graph.
 // This overlay tests legacy royalties; explicit BC tenure is covered separately.
 delete r.bcTenure;
 delete r.bcMarket;
 for(const s of stands){s.supply='private';s.mix={[p]:1};s.terrain=1;}
 for(const edge of r.roads.edges)edge.bearing=1;
 r.disruptions=[];r.partnerJobs=[];r.offtakeOffers=[];delete r.mobilization;
 r.crews[0].node=stands[0].node;r.crews[1].node=stands[1].node;
 r.trucks[0].node=stands[0].node;r.trucks[1].node=stands[1].node;r.trucks[2].node=stands[0].node;r.trucks[3].node=stands[1].node;
 a.node=stands[1].node;b.node=stands[0].node;
 for(const m of [a,b]){m.prices[p]=10;for(const d of m.demand)d[p]=100000;}
 a.processing={inputs:[p],capacityM3:100,costM3:1,outputs:[{id:'chips',name:'Chips',yield:.3,price:15,weeklyDemand:100},{id:'boards',name:'Boards',yield:.6,price:30,weeklyDemand:100}]};
 b.processing={inputs:[p],capacityM3:100,costM3:1,outputs:[{id:'fibre',name:'Fibre product',yield:.8,price:40,weeklyDemand:100}]};
 r.facilityTransfers=[{id:'byproduct',source:a.id,output:'chips',target:b.id,input:p,inputEquivalentRatio:1}];
 r.reciprocalPairs=[{id:'pair',name:'Combined modules test',standA:stands[0].id,standB:stands[1].id,millA:a.id,millB:b.id,product:p,limitM3:5000,ownReserveM3:10,opens:1,deadline:r.weeks}];
 r.economy.timberPayment='harvest-royalty';r.economy.annualDebtRate=.1;
 return {r:halfWeekScenario(r),standIds:stands.map(s=>s.id),p};
}
describe('complete optional-mechanic campaigns on regional graphs',()=>{
 it.each([['Québec',quebec],['Prince George',princeGeorge]] as const)('%s: half-week royalties, reciprocal loads, processing and byproduct transfers survive every reload',(_name,source)=>{
  const {r,standIds,p}=overlay(source);let g=createGame(r);for(const id of standIds)g=purchase(g,id);g=acceptReciprocal(g,'pair','A','equal');g=acceptReciprocal(g,'pair','B','equal');
  const original=r.stands.reduce((n,s)=>n+s.volume,0);
  while(g.week<=r.weeks){
   g.plan.crews=Object.fromEntries(r.crews.map(c=>[c.id,[]]));g.plan.trucks=Object.fromEntries(r.trucks.map(t=>[t.id,[]]));
   for(let i=0;i<2;i++)g.plan.crews[r.crews[i].id]=[{stand:standIds[i],hours:Math.min(20,r.crews[i].hours)}];
   g.plan.trucks[r.trucks[2].id]=[{stand:standIds[0],mill:r.mills[0].id,product:p,loads:1,process:true}];
   g.plan.reciprocal=[{pair:'pair',truckA:r.trucks[0].id,truckB:r.trucks[1].id,loads:1}];
   g.plan.processing={[r.mills[0].id]:{volume:r.mills[0].processing!.capacityM3,sell:g.week===r.weeks},[r.mills[1].id]:{volume:r.mills[1].processing!.capacityM3,sell:true}};
   g.plan.facilityTransfers=[{link:'byproduct',truck:r.trucks[3].id,loads:1}];
   g=advance(g);
   const retained=g.stands.reduce((n,s)=>n+s.remaining+sum(stockAt(g,s.id)),0),departed=g.history.reduce((n,h)=>n+sum(h.delivered)+h.waste,0);
   expect(retained+departed).toBeCloseTo(original,3);
   expect(lotProfitability(g).reconciliationDifference).toBeCloseTo(0,3);
   for(const truck of r.trucks)expect(g.history.at(-1)!.truckHours[truck.id]).toBeLessThanOrEqual(truck.hours+1e-6);
   const loaded=parseGame(serializeGame(g));expect(loaded.reciprocal).toEqual(g.reciprocal);expect(loaded.processing).toEqual(g.processing);g=loaded;
  }
  expect(g.history).toHaveLength(source.weeks*2);expect(g.reciprocal!.pair.movedM3,JSON.stringify(g.history[0].messages)+' '+JSON.stringify(g.history[0].harvested)).toBeGreaterThan(0);expect(g.history.flatMap(h=>h.facilityTransfers??[]).length).toBeGreaterThan(0);expect(g.history.flatMap(h=>h.ledger).some(e=>e.category==='royalty'&&e.amount<0)).toBe(true);expect(g.history.flatMap(h=>h.ledger).some(e=>e.category==='finished-sales'&&e.amount>0)).toBe(true);
 },120000);
});
