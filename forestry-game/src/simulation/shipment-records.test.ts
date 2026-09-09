import {expect,it} from 'vitest';
import {advance,createGame} from './engine';
import {quebec} from '../scenarios/quebec';
import {validateShipmentRecords} from './shipment-records';
import {parseGame} from './validation';
it('records actual source and market without inventing source data for legacy history',()=>{
 const game=createGame(quebec),stand=game.stands[0],truck=game.region.trucks[0],mill=game.region.mills[0];
 stand.stock=[{product:'soft-saw',volume:100,week:1,quality:1}];
 game.plan.trucks[truck.id]=[{stand:stand.id,mill:mill.id,product:'soft-saw',loads:1}];
 const next=advance(game),h=next.history[0];
 expect(h.shipments).toEqual([{stand:stand.id,mill:mill.id,product:'soft-saw',volume:h.delivered['soft-saw'],market:'ordinary'}]);
 expect(()=>validateShipmentRecords(next)).not.toThrow();
 const bad=structuredClone(next);bad.history[0].shipments![0].volume++;
 expect(()=>validateShipmentRecords(bad)).toThrow('reconcile');
 delete h.shipments;expect(()=>validateShipmentRecords(next)).not.toThrow();
 expect(h.shipments).toBeUndefined();
});
it('roundtrips complete empty shipment records on a normally settled save',()=>{
 const game=advance(createGame(quebec));
 expect(parseGame(JSON.stringify(game)).history[0].shipments).toEqual([]);
});
