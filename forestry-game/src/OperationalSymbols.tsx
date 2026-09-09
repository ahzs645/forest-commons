import {useLanguage} from "./i18n";
import type { Game, Product } from './simulation/types';
import { activeDisruptions } from './simulation/disruptions';
export function equipmentStatus(game:Game,kind:'crew'|'truck',id:string) {
  const resource=(kind==='crew'?game.region.crews:game.region.trucks).find(x=>x.id===id);
  if(game.week>game.region.weeks)return 'Season complete';
  if(!resource?.hours||activeDisruptions(game).some(e=>e.kind===kind&&e.target===id))return 'Unavailable';
  const planned=kind==='crew'?game.plan.crews[id]?.length:game.plan.trucks[id]?.length||game.plan.facilityTransfers?.some(o=>o.truck===id)||game.plan.reciprocal?.some(o=>o.truckA===id||o.truckB===id);
  return planned?'Scheduled':'Idle';
}
export function EquipmentStatus({game,kind,id}:{game:Game;kind:'crew'|'truck';id:string}) {
  const {t:tr}=useLanguage();
  const status=equipmentStatus(game,kind,id);
  return <span className="equipment-status" data-status={status}><span aria-hidden="true">{status==='Unavailable'?'⊘':status==='Scheduled'?'▣':status==='Idle'?'○':'✓'}</span> {tr(status)}</span>;
}
export function ProductSymbol({product}:{product:Product}) {
  const {t:tr}=useLanguage();
  // Explicit legacy assortment registry keeps older saves readable; new regions can author symbols.
  const symbol=product.symbol??({'soft-pulp':'pulp','hard-pulp':'pulp','soft-saw':'boards','hard-saw':'boards','poplar':'logs'} as Record<string,string>)[product.id]??'logs';
  const shape=symbol==='boards'?<><path d="M3 5h18v4H3zM3 11h18v4H3zM3 17h18v4H3z"/></>:symbol==='pulp'?<><circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="12" cy="16" r="4"/></>:symbol==='chips'?<><path d="m3 16 4-5 4 6Zm8-10 4-3 3 6Zm2 12 5-6 4 8Z"/></>:<><path d="M8 4h10v16H8"/><ellipse cx="8" cy="12" rx="5" ry="8"/><ellipse cx="8" cy="12" rx="2" ry="4"/></>;
  return <span className="product-symbol"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style={{color:product.color}} fill="none" stroke="currentColor" strokeWidth="1.5">{shape}</svg><span>{tr(product.name)}</span></span>;
}
