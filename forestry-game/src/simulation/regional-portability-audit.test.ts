import {expect,it} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {createGame} from './engine';
import {mobilize,validateMobilization} from './mobilization';
import {acceptAgreement,teachingRepeatedOfftakeOffers,validOfftakeOrder,validateOfftakeRegion} from './offtake';
import {addReservation,dispatchableStock,reservationProblems} from './reservations';

it('uses region-defined identifiers, fleet sizes, products and shortened contract periods',()=>{
 const region=structuredClone(princeGeorge);
 // One crew and one truck deliberately share an identifier: resource kind is the namespace.
 region.crews=[{...region.crews[0],id:'local-fleet'}];
 region.trucks=[{...region.trucks[0],id:'local-fleet'}];
 region.weeks=5;region.weeksPerMonth=2;
 const mill=region.mills[0];mill.id='custom-yard';
 mill.prices={'regional-product':90};mill.demand=Array.from({length:3},()=>({'regional-product':100}));
 region.mills=[mill];
 region.offtakeOffers=teachingRepeatedOfftakeOffers(region);
 validateOfftakeRegion(region);
 expect(region.offtakeOffers.map(o=>o.deadline)).toEqual([2,4,5]);
 expect(region.offtakeOffers.every(o=>o.product==='regional-product')).toBe(true);
 region.mobilization={allowedNodes:region.roads.nodes.map(n=>n.id),maxHoursPerResource:1000,feePerMove:5};
 let g=createGame(region);
 const destination=region.roads.nodes.find(n=>n.id!==region.crews[0].node)!;
 g=mobilize(g,'crew','local-fleet',destination.id);
 expect(g.truckPositions['local-fleet']).toBe(region.trucks[0].node);
 g=mobilize(g,'truck','local-fleet',destination.id);
 validateMobilization(g);
 expect(g.mobilization!.moves.map(m=>m.kind)).toEqual(['crew','truck']);
 g=acceptAgreement(g,region.offtakeOffers[0].agreement!);
 const offer=region.offtakeOffers[0],stand=g.stands.find(s=>s.owned)!.id;
 const order={stand,mill:mill.id,product:'regional-product',loads:1,offtake:offer.id};
 expect(validOfftakeOrder(g,order)).toBe(true);
 g=addReservation(g,{stand,mill:mill.id,product:'regional-product',volume:10,market:'offtake',offtake:offer.id});
 expect(reservationProblems(g)).toEqual([]);
 expect(dispatchableStock(g,order,15)).toBe(15);
 expect(dispatchableStock(g,{...order,offtake:undefined},15)).toBe(5);
});
