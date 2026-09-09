import {effectiveMarketRegion} from './simulation/bc-market';
import {useState} from 'react';
import {useLanguage} from './i18n';
import type {Game} from './simulation/types';
import {applyHarvestAuthorization,applyRoadAuthorization,harvestAuthorizationProblem,roadAuthorizationProblem,settlePostHarvestObligations} from './simulation/tenure';

const labels:Record<string,string>={
 'forest-licence':'Forest licence','bcts-timber-sale':'BCTS timber sale','private-land':'Private land','protected':'Protected area',
 'cutting-permit':'Cutting permit','timber-sale-licence':'Timber Sale Licence','owner-consent':'Owner consent','prohibited':'Harvest prohibited',
 'road-use-permit':'Road Use Permit','road-permit':'Road Permit','required':'Application required','pending':'Application pending','approved':'Approved in simulation',
 'operator':'Operating company','bcts':'BC Timber Sales','owner':'Landowner',
};
export interface TenureDeskProps {
 game:Game; onChange?:(game:Game)=>void; standId?:string; editable?:boolean;
 allowHarvest?:boolean; allowRoad?:boolean; allowSettlement?:boolean;
 onApplyHarvest?:(id:string)=>void; onApplyRoad?:(id:string)=>void; onSettle?:(id:string)=>void;
}
export default function TenureDesk({game,onChange,standId,editable=true,allowHarvest=true,allowRoad=true,allowSettlement=true,onApplyHarvest,onApplyRoad,onSettle}:TenureDeskProps){
 const {t:tr,language}=useLanguage();
 const [selection,setSelection]=useState('');
 const [error,setError]=useState('');
 const [showAllRoads,setShowAllRoads]=useState(false);
 const policy=effectiveMarketRegion(game).bcTenure;
 if(!policy)return null;
 const name=(value:string)=>tr(labels[value]??value);
 const money=(value:number)=>`${game.region.currency} ${value.toLocaleString(language==='fr'?'fr-CA':'en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 const id=standId??(policy.stands[selection]?selection:Object.keys(policy.stands)[0]);
 const definition=policy.stands[id];
 const stand=game.stands.find(s=>s.id===id);
 const auth=game.bcTenure?.harvest[id];
 const problem=harvestAuthorizationProblem(game,id);
 const outstanding=Object.entries(policy.stands).reduce((total,[standId,d])=>total+d.obligations.filter(o=>o.responsibleParty==='operator').reduce((subtotal,o)=>{const balance=game.bcTenure?.obligations[`${standId}:${o.id}`];return subtotal+Math.max(0,(balance?.accrued??0)-(balance?.settled??0));},0),0);
 const roads=Object.entries(policy.roads).filter(([edgeId])=>showAllRoads||!!roadAuthorizationProblem(game,edgeId));
 const active=editable&&game.week<=game.region.weeks;
 const act=(callback:(()=>void)|undefined,local:()=>Game)=>{try{setError('');if(callback)callback();else if(onChange)onChange(local());}catch(e){setError(e instanceof Error?e.message:String(e));}};
 return <section className="panel" aria-label={tr("BC tenure and authorizations")}>
  <h3>{tr('BC tenure and authorizations')}</h3>
  <p>{tr('BCTS is part of the Ministry of Forests. Its timber sales are one route to Crown harvesting rights; existing forest licences use their own authorization path.')}</p>
  <p className="muted">{tr('Teaching simulation: applications, approval delays, rates and obligations are authored assumptions. No actual permits are issued.')}</p>
  <details><summary>{tr('BC assumptions and sources')}</summary><p>{policy.note}</p></details>
  <p><strong>{tr('Total outstanding operator reserves')}: {money(outstanding)}</strong></p>
  {error&&<p role="alert">{tr(error)}</p>}
  {!standId&&<label>{tr('Stand')} <select aria-label={tr("Tenure stand")} value={id} onChange={e=>setSelection(e.target.value)}>{game.region.stands.filter(s=>policy.stands[s.id]).map(s=><option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></label>}
  {definition&&<>
   <h4>{id} · {name(definition.type)}</h4>
   <p><strong>{tr('Responsible authority')}: </strong>{definition.authority}</p>
   <p><strong>{tr('Harvesting authorization')}: </strong>{name(definition.harvest.kind)} · {name(auth?.status??definition.harvest.initialStatus)}</p>
   {problem&&<p>{tr(problem)}</p>}
   <p>{tr('Illustrative processing time')}: {definition.harvest.delayWeeks} {tr('weeks')}{definition.harvest.validForWeeks!==undefined&&<> · {tr('Validity')}: {definition.harvest.validForWeeks} {tr('weeks')}</>}{auth?.submittedWeek!==undefined&&<> · {tr('Submitted turn')}: {auth.submittedWeek}</>}</p>
   {definition.harvest.kind!=='prohibited'&&<button disabled={!active||!allowHarvest||!stand?.owned||auth?.status==='pending'||!problem||(!onChange&&!onApplyHarvest)} onClick={()=>act(onApplyHarvest?()=>onApplyHarvest(id):undefined,()=>applyHarvestAuthorization(game,id))}>{tr('Apply / renew harvesting authorization')}</button>}
   {!stand?.owned&&definition.harvest.kind!=='prohibited'&&<p>{tr('Acquire the timber right before applying for harvesting authorization.')}</p>}
   <h4>{tr('Stumpage basis')}</h4>
   {definition.stumpage.basis!=='none' && <p>{definition.stumpage.ratePolicy==='fixed-at-award' ? tr(game.bcMarket?.lockedRates[id] ? 'Fixed at award: the displayed rates are locked for this timber sale.' : 'Fixed at award: current prospective rates are shown; rates lock when this sale is won.') : tr(game.region.bcMarket ? 'Adjustable Crown rates: displayed rates reflect the current published teaching reset.' : 'Authored Crown stumpage rates.')}</p>}
   {definition.stumpage.basis==='none'?<p>{tr('No Crown stumpage in this teaching tenure. Acquisition and operating costs still apply where configured.')}</p>:<><p>{tr('Interior teaching rates charged on harvested volume by product. Upfront acquisition / sale premium is separate from stumpage. These are not official appraised rates.')}</p><div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Stumpage basis")}><table><thead><tr><th>{tr('Product')}</th><th>{tr('Stumpage per m³')}</th></tr></thead><tbody>{game.region.products.map(p=><tr key={p.id}><td>{tr(p.name)}</td><td>{money(definition.stumpage.rates[p.id]??0)}</td></tr>)}</tbody></table></div></>}
   <h4>{tr('Post-harvest obligations')}</h4>
   <p>{tr('Operator cost reserves accrue with harvest and can be funded now; remaining amounts settle at campaign close. Financial settlement does not mean field work is complete. BCTS and landowner responsibilities are shown separately.')}</p>
   <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Post-harvest obligations")}><table><thead><tr><th>{tr('Obligation')}</th><th>{tr('Responsible party')}</th><th>{tr('Cost per m³')}</th><th>{tr('Accrued')}</th><th>{tr('Settled')}</th></tr></thead><tbody>{definition.obligations.map(o=>{const balance=game.bcTenure?.obligations[`${id}:${o.id}`];return <tr key={o.id}><td>{o.label}</td><td>{name(o.responsibleParty)}</td><td>{money(o.costPerM3)}</td><td>{money(balance?.accrued??0)}</td><td>{money(balance?.settled??0)}</td></tr>;})}</tbody></table></div>
   <button disabled={!active||!allowSettlement||(!onChange&&!onSettle)||!definition.obligations.some(o=>o.responsibleParty==='operator'&&(game.bcTenure?.obligations[`${id}:${o.id}`]?.accrued??0)>(game.bcTenure?.obligations[`${id}:${o.id}`]?.settled??0))} onClick={()=>act(onSettle?()=>onSettle(id):undefined,()=>settlePostHarvestObligations(game,id))}>{tr('Settle operator obligations')}</button>
  </>}
  <details><summary>{tr('Road authorizations')} · {Object.keys(policy.roads).length}</summary><p>{tr('Road authority and physical access are separate checks. An approved authorization does not remove weather closures or repair a road.')}</p><label><input type="checkbox" checked={showAllRoads} onChange={e=>setShowAllRoads(e.target.checked)}/>{tr('Show all roads, including active authorizations')}</label>{!roads.length&&<p>{tr('No road authorizations need attention.')}</p>}<div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Road authorizations")}><table><thead><tr><th>{tr('Road')}</th><th>{tr('Authority and authorization')}</th><th>{tr('Status')}</th><th>{tr('Action')}</th></tr></thead><tbody>{roads.map(([edgeId,d])=>{const a=game.bcTenure?.roads[edgeId];const issue=roadAuthorizationProblem(game,edgeId);return <tr key={edgeId}><td>{game.region.roads.edges.find(e=>e.id===edgeId)?.name??edgeId}<br/><small>{edgeId}</small></td><td>{d.authority}<br/>{name(d.kind)}<br/>{d.delayWeeks} {tr('weeks')}</td><td>{name(a?.status??d.initialStatus)}{issue&&<p>{tr(issue)}</p>}</td><td><button disabled={!active||!allowRoad||a?.status==='pending'||!issue||(!onChange&&!onApplyRoad)} onClick={()=>act(onApplyRoad?()=>onApplyRoad(edgeId):undefined,()=>applyRoadAuthorization(game,edgeId))}>{tr('Apply / renew road authorization')}</button></td></tr>;})}</tbody></table></div></details>
 </section>;
}
