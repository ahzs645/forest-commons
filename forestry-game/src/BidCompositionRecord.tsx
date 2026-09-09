import {useLanguage} from './i18n';
import type {Plan,RegionDefinition} from './simulation/types';
import {compositionIsActive} from './simulation/bid-composition';
export default function BidCompositionRecord({region,plan,standId}:{region:RegionDefinition;plan:Plan;standId:string}){
 const {t,language}=useLanguage(),fr=language==='fr',snapshot=plan.bidComposition?.[standId];
 if(!snapshot)return null;
 const active=compositionIsActive(plan,standId),number=(n:number)=>n.toLocaleString(fr?'fr-CA':'en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
 return <article className="soft-card"><h4>{standId} · {active?t('Matched submitted bid'):t('Inactive snapshot')}</h4><p>{t('Snapshot total')} {number(snapshot.bid)} {region.currency}; {fr?'mise soumise':'submitted bid'} {number(plan.bids[standId]??0)} {region.currency}.</p>{!active&&<p>{fr?'La mise soumise diffère de cette ventilation ou a été retirée. Ces contributions ne justifient donc pas la mise finale.':'The submitted bid differs from this breakdown or was cleared. These contributions therefore do not describe the final bid.'}</p>}<dl>{Object.entries(snapshot.contributions).map(([id,amount])=><div key={id}><dt>{t(region.products.find(p=>p.id===id)?.name??id)}</dt><dd>{number(amount)} {region.currency}</dd></div>)}</dl><p>{fr?'Ventilation de la valeur proposée, et non recettes réalisées.':'Proposed valuation breakdown, not realized revenue.'}</p></article>;
}
