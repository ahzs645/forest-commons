import type {Game} from './types';
/** Existing stock or an authored assortment option; not a promise of current capacity or ownership. */
export function standSupportsProduct(game:Game,standId:string,product:string):boolean{
 const stand=game.region.stands.find(s=>s.id===standId);
 const state=game.stands.find(s=>s.id===standId);
 if(!stand||!state)return false;
 return state.stock.some(b=>b.product===product&&b.volume>0)||(stand.mix[product]??0)>0||Object.values(game.region.buckingProfiles??{}).some(profile=>Object.entries(stand.mix).some(([source,fraction])=>fraction>0&&(profile.recovery[source]?.[product]??0)>0));
}
/** Potential forest assortment, not a promise of stock, access or current capacity. */
export function forestIntakeProducts(game:Game,standId:string,inputs:string[]):string[]{
 if(!game.stands.find(s=>s.id===standId)?.owned)return [];
 return inputs.filter(product=>standSupportsProduct(game,standId,product));
}
