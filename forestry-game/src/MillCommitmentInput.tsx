import {useLanguage} from './i18n';
import {effectiveMarketRegion} from './simulation/bc-market';
import {month} from './simulation/engine';
import type {Game} from './simulation/types';
/** Reads published caps but only emits a target scalar, never a transformed region. */
export default function MillCommitmentInput({game,millId,product,value,onChange}:{game:Game;millId:string;product:string;value:number;onChange:(value:number)=>void}){
 const {t:tr}=useLanguage();
 const region=effectiveMarketRegion(game),mill=region.mills.find(m=>m.id===millId)!;
 const cap=mill.demand[month(game)]?.[product]??0;
 return <input aria-label={`${mill.name} ${product} ${tr('commitment')}`} type="number" min="0" max={cap} disabled={game.week>region.weeks||(game.week-1)%region.weeksPerMonth!==0} value={value} onChange={e=>onChange(Number(e.target.value))}/>;
}
