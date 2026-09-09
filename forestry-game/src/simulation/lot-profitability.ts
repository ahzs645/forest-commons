import type {Game, LedgerEntry} from './types';

export interface LotCashRow {
  id:string; name:string; receipts:number; costs:number; net:number;
  categories:Record<string,number>; entries:number;
}
export interface LotCashEntry extends LedgerEntry {standId?:string}
/** No allocations from volume, current prices or inventory valuation: recorded cash only. */
export function lotProfitability(game:Game) {
  const lots:LotCashRow[]=game.region.stands.map(s=>({id:s.id,name:s.name,receipts:0,costs:0,net:0,categories:Object.create(null),entries:0}));
  const byId=new Map(lots.map(row=>[row.id,row]));
  const unallocated:Record<string,{receipts:number;costs:number;net:number;entries:number}>=Object.create(null);
  let ledgerNet=0;
  const entries:LotCashEntry[]=[...game.history.flatMap(h=>h.ledger),...game.instantLedger];
  for(const entry of entries){
    ledgerNet+=entry.amount;
    const row=entry.standId?byId.get(entry.standId):undefined;
    if(row){row.receipts+=Math.max(0,entry.amount);row.costs+=Math.max(0,-entry.amount);row.net+=entry.amount;row.entries++;row.categories[entry.category]=(row.categories[entry.category]??0)+entry.amount;}
    else {const bucket=unallocated[entry.category]??={receipts:0,costs:0,net:0,entries:0};bucket.receipts+=Math.max(0,entry.amount);bucket.costs+=Math.max(0,-entry.amount);bucket.net+=entry.amount;bucket.entries++;}
  }
  const attributedNet=lots.reduce((n,row)=>n+row.net,0),unallocatedNet=Object.values(unallocated).reduce((n,b)=>n+b.net,0);
  return {lots:lots.filter(row=>row.entries),unallocated,ledgerNet,attributedNet,unallocatedNet,entries:entries.length,
    cashChange:game.cash-game.region.economy.startingCash,
    reconciliationDifference:game.cash-game.region.economy.startingCash-ledgerNet};
}
export function lotProfitabilityCSV(game:Game){
 const result=lotProfitability(game),rows:unknown[][]=[['scope','lot_id','name_or_category','receipts','costs','net_cash','currency','recorded_entries']];
 for(const row of result.lots)rows.push(['attributed lot',row.id,row.name,row.receipts,row.costs,row.net,game.region.currency,row.entries]);
 for(const [category,row]of Object.entries(result.unallocated))rows.push(['unallocated','',category,row.receipts,row.costs,row.net,game.region.currency,row.entries]);
 rows.push(['ledger total','','', '', '',result.ledgerNet,game.region.currency,result.entries]);
 return rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
}
