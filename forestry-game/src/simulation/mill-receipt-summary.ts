import type {Game} from './types';
import {month} from './engine';
/** Current-period planning balances, or recorded campaign receipts after settlement ends. */
export function millReceiptSummary(game:Game,millId:string){
 const mill=game.region.mills.find(m=>m.id===millId);
 if(!mill)return [];
 const done=game.week>game.region.weeks;
 const demand:Record<string,number>={};
 for(const period of done?mill.demand:[mill.demand[month(game)]??{}])for(const [product,volume] of Object.entries(period))demand[product]=(demand[product]??0)+volume;
 return Object.entries(demand).map(([product,target])=>({product,target,received:done?game.history.reduce((n,h)=>n+(h.millDeliveries[millId]?.[product]??0),0):(game.deliveries[millId]?.[product]??0)}));
}
