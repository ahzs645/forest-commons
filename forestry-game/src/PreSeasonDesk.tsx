import { useLanguage } from "./i18n";
import {useState} from 'react';
import type {Game} from './simulation/types';
import {mobilize,mobilizationQuote} from './simulation/mobilization';
export default function PreSeasonDesk({game,onChange,onMobilize,role}:{game:Game;onChange?:(g:Game)=>void;onMobilize?:(kind:'crew'|'truck',id:string,to:string)=>void;role?:string}){
 const {t: tr,language}=useLanguage();
 const [kind,setKind]=useState<'crew'|'truck'>(role==='transport'?'truck':'crew'),[index,setIndex]=useState(0),[target,setTarget]=useState(''),[error,setError]=useState('');
 const policy=game.region.mobilization,resources=kind==='crew'?game.region.crews:game.region.trucks,resource=resources[index]??resources[0],to=policy?.allowedNodes.includes(target)?target:policy?.allowedNodes[0]??'';
 if(!policy)return null;
 const allowed=!role||role==='instructor'||role===(kind==='crew'?'production':'transport');
 let quote:ReturnType<typeof mobilizationQuote>|undefined,reason='';try{quote=mobilizationQuote(game,kind,resource.id,to);}catch(e){reason=e instanceof Error?e.message:String(e);}
 const bidsVisible=!role||role==='instructor'||role==='purchase';
 const uncommitted=game.cash-Object.values(game.plan.bids).reduce((n,b)=>n+b,0),affordable=!quote||quote.cost<=uncommitted;
 const spent=(game.mobilization?.moves??[]).filter(m=>m.kind===kind&&m.resource===resource.id).reduce((n,m)=>n+m.hours,0);
 const f=(n:number)=>n.toLocaleString(language==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:2});
 const record=<details><summary>{tr("Positioning record ·")} {game.mobilization?.moves.length??0} {tr("moves")}</summary>{game.mobilization?.moves.map((m,i)=><p key={i}>{m.resource}: {m.from} → {m.to} · {m.hours.toFixed(1)}h · {game.region.currency} {m.cost.toFixed(2)}</p>)}</details>;
 // Once operations begin nothing here can change, so it collapses to its record
 // instead of opening every planning screen with the full explanation.
 if(game.week>1||game.mobilization?.locked)return <section className="panel preseason-desk preseason-closed"><h3>{tr("Pre-season fleet positioning")}</h3><p>{tr("Pre-season positioning is closed.")}</p>{record}</section>;
 return <section className="panel preseason-desk"><h3>{tr("Pre-season fleet positioning")}</h3><p>{tr("Move to a permitted staging node before week1 runs. Each move costs cash and counts against a separate")} {policy.maxHoursPerResource}{tr("h pre-season allowance per resource; it does not consume weekly production hours. Routing uses the opening forecast. Positioning locks when operations begin.")}</p>
 {game.week===1&&!game.mobilization?.locked&&<div className="form-row"><label>{tr("Fleet")}<select value={kind} onChange={e=>{setKind(e.target.value as 'crew'|'truck');setIndex(0);}}><option value="crew">{tr("Harvest crews")}</option><option value="truck">{tr("Trucks")}</option></select></label><label>{tr("Resource")}<select value={resource.id} onChange={e=>setIndex(resources.findIndex(r=>r.id===e.target.value))}>{resources.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>{tr("Staging node")}<select value={to} onChange={e=>setTarget(e.target.value)}>{policy.allowedNodes.map(n=><option key={n} value={n}>{game.region.mills.find(m=>m.node===n)?.name??n}</option>)}</select></label><button disabled={!quote||!affordable||!allowed||(!onChange&&!onMobilize)} onClick={()=>{try{if(onMobilize)onMobilize(kind,resource.id,to);else onChange?.(mobilize(game,kind,resource.id,to));setError('');}catch(e){setError(String(e));}}}>{tr("Move fleet resource")}</button></div>}
 {quote?<p>{quote.from} → {quote.to} · {quote.km.toFixed(1)}km · {quote.hours.toFixed(1)}h · {game.region.currency} {quote.cost.toFixed(2)} {tr("including")} {policy.feePerMove} {tr("per-move fee.")}</p>:<p>{tr(reason)}</p>}
 {game.week===1&&!game.mobilization?.locked&&<p>{language==='fr'?'Temps de positionnement restant':'Remaining positioning allowance'} · {resource.name}: {f(Math.max(0,policy.maxHoursPerResource-spent))} h. {bidsVisible?<>{language==='fr'?'Trésorerie non engagée après les mises':'Uncommitted cash after bids'}: {game.region.currency} {f(uncommitted)}.</>:<>{language==='fr'?'Les mises sont privées. Le serveur vérifiera les fonds disponibles lors du déplacement.':'Bids are private. The server checks available funds when you move.'}</>}</p>}
 {!affordable&&<p role="status">{language==='fr'?'Trésorerie non engagée insuffisante pour ce déplacement. Réduisez les mises réservées ou choisissez un trajet moins coûteux.':'Insufficient uncommitted cash for this move. Reduce reserved bids or choose a less costly route.'}</p>}
 {!allowed&&<p>{tr("Your role cannot reposition this fleet.")}</p>}{error&&<p role="alert">{tr(error)}</p>}
 {record}</section>;
}
