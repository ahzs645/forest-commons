import { describe,it,expect } from 'vitest';
import { createGame } from './engine';
import { quebec } from '../scenarios/quebec';
import { solveNetwork,networkOffer,answerNetworkOffer,regionalNetworkCase,enumerateItineraries } from './network-dispatch';
import type { NetworkCase } from './network-dispatch';
function fixture(){const g=createGame(quebec);g.region.roads={nodes:[{id:'a',position:[0,0]},{id:'b',position:[1,0]}],edges:[{id:'ab',from:'a',to:'b',km:10,speed:10,bearing:1,zone:g.region.zones[0].id,geometry:[[0,0],[1,0]],name:'test'}]};g.region.disruptions=[];
 const n:NetworkCase={companies:[{id:'A',name:'A'},{id:'B',name:'B'}],vehicles:[{id:'va',company:'A',node:'a',payload:40,hours:8,costKm:1,handlingHours:1,fixedWeekly:5},{id:'vb',company:'B',node:'b',payload:40,hours:8,costKm:1,handlingHours:1,fixedWeekly:5}],cargo:[{id:'a1',company:'A',from:'b',to:'a',volume:40,release:1,deadline:1,outsideCost:100},{id:'b1',company:'B',from:'a',to:'b',volume:40,release:1,deadline:1,outsideCost:100}],start:1,weeks:2,note:'test'};return {g,n};}
describe('Bounded multi-company dispatch network',()=>{
 it('finds measured pooling savings with exact cover, continuous locations and terminal returns',()=>{const {g,n}=fixture(),ind=solveNetwork(g,n,'independent'),pool=solveNetwork(g,n,'pooled');expect(ind.cost).toBe(60);expect(pool.cost).toBe(40);expect(pool.outsourced).toEqual([]);expect(pool.itineraries.flatMap(p=>p.jobs).sort()).toEqual(['a1','b1']);for(const p of pool.itineraries){let at=n.vehicles.find(v=>v.id===p.vehicle)!.node;for(const l of p.legs){expect(l.from).toBe(at);at=l.to;}expect(at).toBe(n.vehicles.find(v=>v.id===p.vehicle)!.node);}expect(pool.cost).toBeCloseTo(pool.fixedCost+pool.itineraries.reduce((a,p)=>a+p.cost,0));});
 it('respects weekly combined capacity, release/deadline and indivisible payload with quoted outsourcing',()=>{const {g,n}=fixture();n.weeks=1;for(const v of n.vehicles)v.hours=2;const short=solveNetwork(g,n,'pooled');expect(short.outsourced).toHaveLength(2);expect(short.cost).toBe(210);n.vehicles[0].hours=8;n.vehicles[1].hours=8;n.cargo[0].volume=41;expect(solveNetwork(g,n,'pooled').outsourced).toContain('a1');});
 it('uses known road closures and forecast without reading actual weather',()=>{const {g,n}=fixture();g.region.disruptions=[{id:'close',title:'closed',description:'closed',kind:'road',target:'ab',week:1,endWeek:1,revealWeek:1,repairCost:1,repairWeeks:0}];expect(solveNetwork(g,n,'pooled').outsourced).toHaveLength(2);g.region.disruptions[0].revealWeek=2;const a=solveNetwork(g,n,'pooled');for(const w of Object.values(g.region.weather))for(const z of g.region.zones)w.actual[z.id].fill('thaw');expect(solveNetwork(g,n,'pooled').cost).toBe(a.cost);});
 it('freeze allocation sums to pooled cost, preserves nonnegative company gains and requires unanimity',()=>{const {g,n}=fixture(),ind=solveNetwork(g,n,'independent'),pool=solveNetwork(g,n,'pooled');let offer=networkOffer(n,ind,pool,'proportional');expect(Object.values(offer.costs).reduce((a,b)=>a+b,0)).toBe(pool.cost);offer=answerNetworkOffer(offer,'A',true);expect(offer.status).toBe('proposed');offer=answerNetworkOffer(offer,'B',true);expect(offer.status).toBe('agreed');expect(()=>answerNetworkOffer(offer,'A',false)).toThrow();});
 it('enumerates at most two jobs per week and detects horizon constraints',()=>{const {g,n}=fixture();n.weeks=1;const paths=enumerateItineraries(g,n,n.vehicles[0],true);expect(paths.some(p=>p.jobs.length===2)).toBe(true);expect(paths.every(p=>p.jobs.length<=2)).toBe(true);n.weeks=4;expect(()=>solveNetwork(g,n,'pooled')).toThrow('bounded');});
 it('solves the regional three-week case with no duplicate cargo',()=>{const g=createGame(quebec),n=regionalNetworkCase(g),ind=solveNetwork(g,n,'independent'),pooled=solveNetwork(g,n,'pooled');expect(pooled.cost).toBeLessThanOrEqual(ind.cost+.0001);expect(pooled.itineraries.flatMap(p=>p.jobs).length+pooled.outsourced.length).toBe(6);},20000);
 it('scales to five companies and ten shipments with the same exact optimum as the integer solver',()=>{
  const g=createGame(quebec),n=regionalNetworkCase(g,5);
  expect(n.companies).toHaveLength(5);expect(n.cargo).toHaveLength(10);
  const independent=solveNetwork(g,n,'independent'),pooled=solveNetwork(g,n,'pooled');
  // Independently recorded from the previous binary set-partition solver on this fixture.
  expect(independent.cost).toBeCloseTo(10934.0936,4);
  expect(pooled.cost).toBeCloseTo(9967.0468,4);
  expect(new Set(pooled.itineraries.flatMap(p=>p.jobs)).size).toBe(10);
  expect(pooled.outsourced).toEqual([]);
  for(const itinerary of pooled.itineraries){
   const vehicle=n.vehicles.find(v=>v.id===itinerary.vehicle)!;
   for(let week=n.start;week<n.start+n.weeks;week++){
    const legs=itinerary.legs.filter(l=>l.week===week);
    expect(legs.reduce((sum,l)=>sum+l.hours,0)).toBeLessThanOrEqual(vehicle.hours+1e-9);
    expect(legs.filter(l=>l.job).length).toBeLessThanOrEqual(2);
   }
   expect(itinerary.legs.at(-1)!.to).toBe(vehicle.node);
  }
 },20000);
 it('rejects cases outside the expanded exact search bounds',()=>{
  const g=createGame(quebec),n=regionalNetworkCase(g,5);
  n.cargo.push({...n.cargo[0],id:'extra'});
  expect(()=>solveNetwork(g,n,'pooled')).toThrow('bounded');
  expect(()=>regionalNetworkCase(g,6)).toThrow('two to five');
 });

});
