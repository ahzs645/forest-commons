import {useState} from 'react';
import {useLanguage} from './i18n';
import type {Game} from './simulation/types';
import type {ReciprocalPair} from './simulation/reciprocal';
export default function ReciprocalRenewal({game,pair,onRenew,pending=false}:{game:Game;pair:ReciprocalPair;onRenew:(opens:number,deadline:number)=>void;pending?:boolean}){
 const {t:tr}=useLanguage();
 const earliest=Math.max(game.week,pair.deadline+1);
 const [opens,setOpens]=useState(earliest),[deadline,setDeadline]=useState(Math.min(game.region.weeks,earliest+game.region.weeksPerMonth-1));
 const successor=game.region.reciprocalPairs?.find(p=>p.renews===pair.id);
 if(successor)return <p>{tr('Renewed as')} {successor.name} · {successor.id} · {successor.opens}–{successor.deadline}</p>;
 if(earliest>game.region.weeks||game.reciprocal?.[pair.id]?.accepted.length!==2)return null;
 return <details><summary>{tr('Renew agreement')} · {pair.name}</summary><p>{tr('Renewal retains the supplies, mills, volume limit, reserves and sharing method. Past settlements stay with the original agreement. Both companies must accept again when the new window opens.')}</p><fieldset disabled={pending}><label>{tr('Renewal opening turn')}<input type="number" min={earliest} max={game.region.weeks} value={opens} onChange={e=>setOpens(Number(e.target.value))}/></label><label>{tr('Renewal closing turn')}<input type="number" min={Math.max(earliest,opens)} max={game.region.weeks} value={deadline} onChange={e=>setDeadline(Number(e.target.value))}/></label><button onClick={()=>onRenew(opens,deadline)}>{tr('Propose linked renewal')}</button></fieldset></details>;
}
