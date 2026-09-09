import type {Game} from './types';
export function validateShipmentRecords(game:Game){
 for(const h of game.history){
  if(h.shipments===undefined)continue;
  if(!Array.isArray(h.shipments))throw Error('Invalid shipment records.');
  const totals:Record<string,Record<string,number>>={};
  for(const s of h.shipments){
   if(!s||!game.region.stands.some(x=>x.id===s.stand)||!game.region.mills.some(x=>x.id===s.mill)||!game.region.products.some(x=>x.id===s.product)||!Number.isFinite(s.volume)||s.volume<=0||!['ordinary','spot','offtake','processing','reciprocal'].includes(s.market))throw Error('Invalid shipment record.');
   if(s.market==='reciprocal'){
    const pair=game.region.reciprocalPairs?.find(p=>p.id===s.reciprocalPair);
    if(!pair||pair.product!==s.product||!((s.stand===pair.standA&&s.mill===pair.millB)||(s.stand===pair.standB&&s.mill===pair.millA)))throw Error('Invalid reciprocal shipment record.');
   }else if(s.reciprocalPair!==undefined)throw Error('Invalid shipment agreement reference.');
   totals[s.mill]??={};totals[s.mill][s.product]=(totals[s.mill][s.product]??0)+s.volume;
  }
  for(const id of new Set([...Object.keys(totals),...Object.keys(h.millDeliveries)]))for(const product of new Set([...Object.keys(totals[id]??{}),...Object.keys(h.millDeliveries[id]??{})]))if(Math.abs((totals[id]?.[product]??0)-(h.millDeliveries[id]?.[product]??0))>1e-5)throw Error('Shipment receipt totals do not reconcile.');
 }
}
