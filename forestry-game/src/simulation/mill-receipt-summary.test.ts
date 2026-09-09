import {expect,it} from 'vitest';
import {createGame,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {millReceiptSummary} from './mill-receipt-summary';
it('uses live period receipts while playing and settled history after the final reset',()=>{
 let game=createGame(quebec);const mill=game.region.mills[0],product='soft-saw';
 game.stands[0].stock=[{product,volume:100,week:1,quality:1}];
 game.plan.trucks[game.region.trucks[0].id]=[{stand:game.stands[0].id,mill:mill.id,product,loads:1}];
 game=advance(game);
 expect(millReceiptSummary(game,mill.id).find(r=>r.product===product)?.received).toBeGreaterThan(0);
 while(game.week<=game.region.weeks)game=advance(game);
 const row=millReceiptSummary(game,mill.id).find(r=>r.product===product)!;
 expect(game.deliveries[mill.id]?.[product]??0).toBe(0);
 expect(row.received).toBeGreaterThan(0);
 expect(row.received).toBe(game.history.reduce((n,h)=>n+(h.millDeliveries[mill.id]?.[product]??0),0));
 expect(row.target).toBe(mill.demand.reduce((n,d)=>n+(d[product]??0),0));
 expect(millReceiptSummary(game,'missing')).toEqual([]);
});
