import BidCompositionRecord from './BidCompositionRecord';
import { useLanguage } from "./i18n";
import {useState} from 'react';
import type {Game,Stock} from './simulation/types';
import {applyBidComposition,compositionIsActive,compositionTotal} from './simulation/bid-composition';
export default function BidCompositionDesk({game,standId,onChange}:{game:Game;standId:string;onChange:(g:Game)=>void}){
 const {t: tr}=useLanguage();
 const lot=game.region.stands.find(s=>s.id===standId),state=game.stands.find(s=>s.id===standId);
 if(!lot||lot.supply!=='auction'||!state)return null;
 const history=game.history.filter(h=>h.plan.bidComposition?.[standId]);
 return <><CompositionEditor key={`${game.region.id}-${standId}-${game.week}`} game={game} standId={standId} onChange={onChange}/>{history.length>0&&<details><summary>{tr("Past bid breakdowns ·")}{" "}{history.length}{" "}{tr("recorded weeks")}</summary>{history.map(h=>{return <div key={h.week}><h4>{tr((game.region.turnDurationWeeks??1)<1?"Turn":"Week")} {h.week}</h4><BidCompositionRecord region={game.region} plan={h.plan} standId={standId}/></div>;})}</details>}</>;
}
function CompositionEditor({game,standId,onChange}:{game:Game;standId:string;onChange:(g:Game)=>void}){
 const {t: tr,language}=useLanguage();
 const lot=game.region.stands.find(s=>s.id===standId)!,state=game.stands.find(s=>s.id===standId)!;
 const saved=game.plan.bidComposition?.[standId];
 const [inputs,setInputs]=useState<Stock>(()=>({...saved?.contributions})),[message,setMessage]=useState('');
 const active=compositionIsActive(game.plan,standId),total=compositionTotal(inputs),open=game.week<=game.region.weeks&&lot.auctionWeek===game.week&&!state.owned&&!state.refused;
 const f=(n:number)=>n.toLocaleString(language==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:2});
 return <section className="soft-card"><h3>{tr("Build bid by product ·")}{" "}{standId}</h3><p>{tr("Assign a currency contribution to each standing product. Their sum becomes one sealed lot bid; the auction does not sell products separately. Contributions are your valuation rationale, not forecast revenue.")}</p>
 {saved&&<p>{active?tr("Saved breakdown matches the current bid."):tr("Saved breakdown is inactive: the current bid differs or was cleared.")}{" "}{tr("Snapshot total:")}{" "}{f(saved.bid)} {game.region.currency}.</p>}
 <fieldset disabled={!open}><legend>{tr("Product contributions (")}{game.region.currency})</legend>{game.region.products.filter(p=>(lot.mix[p.id]??0)>0).map(p=><label key={p.id} style={{display:'block',marginBottom:10}}>{tr(p.name)} · {f(lot.volume*lot.mix[p.id])}{" "}{tr("standing m³")}<input type="number" min="0" step="0.01" value={inputs[p.id]??0} onChange={e=>{setInputs({...inputs,[p.id]:Number(e.target.value)});setMessage('');}}/><small>{(lot.volume*lot.mix[p.id])>0?`${f((inputs[p.id]??0)/(lot.volume*lot.mix[p.id]))} ${game.region.currency}/${tr("standing m³")}`:''}</small></label>)}<p><strong>{tr("Calculated total:")}{" "}{Number.isFinite(total)?f(total):tr("Invalid")} {game.region.currency}</strong>{" "}{tr("· Current bid:")}{" "}{f(game.plan.bids[standId]??0)} {game.region.currency}</p><button disabled={!Number.isFinite(total)||total<=0||Object.values(inputs).some(n=>!Number.isFinite(n)||n<0)} onClick={()=>{try{onChange(applyBidComposition(game,standId,inputs));setMessage('Product breakdown saved and total applied to the sealed bid.');}catch(e){setMessage(e instanceof Error?e.message:String(e));}}}>{tr("Apply total and save breakdown")}</button>{saved&&<button onClick={()=>{setInputs({...saved.contributions});setMessage('Saved snapshot loaded into the calculator; apply to update the bid.');}}>{tr("Load saved breakdown")}</button>}</fieldset>
 {!open&&<p>{tr("This lot is not currently open for bidding. Its saved rationale remains available for review.")}</p>}{message&&<p role="status">{tr(message)}</p>}<p className="muted">{tr("The saved breakdown travels with the campaign and completed-week plan. A manual bid change makes a mismatched snapshot inactive; calculator edits have no effect until applied.")}</p></section>;
}
