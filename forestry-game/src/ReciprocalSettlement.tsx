import {useLanguage} from './i18n';
import type {ReciprocalAgreement} from './simulation/reciprocal';
/** Actual recorded settlement, with the pre-transfer cost difference recovered from its identity. */
export default function ReciprocalSettlement({agreement,currency,company}:{agreement:ReciprocalAgreement;currency:string;company?:'A'|'B'}){
 const {t,language}=useLanguage();
 const number=(n:number)=>(Math.abs(n)<0.005?0:n).toLocaleString(language==='fr'?'fr-CA':'en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
 const ownA=agreement.shareA-agreement.transferToA,ownB=agreement.shareB+agreement.transferToA;
 return <div className="table-wrap" tabIndex={0} role="region" aria-label={language==='fr'?'Tableau défilant des économies et transferts':'Scrollable savings and transfers table'}><table><caption>{t('Recorded transport savings and transfers')} · {currency}</caption><thead><tr><th>{t('Company')}</th><th>{t('Before transfer')}</th><th>{t('Internal transfer received')}</th><th>{t('After transfer')}</th></tr></thead><tbody>{[{company:'A',own:ownA,transfer:agreement.transferToA,share:agreement.shareA},{company:'B',own:ownB,transfer:-agreement.transferToA,share:agreement.shareB}].filter(row=>!company||row.company===company).map(row=><tr key={row.company}><th>{row.company}</th><td>{number(row.own)}</td><td>{number(row.transfer)}</td><td>{number(row.share)}</td></tr>)}</tbody></table><p>{t('Before transfer compares actual cross-haul travel costs with direct delivery from the same opening truck positions. Negative values are losses. No-cash settlement leaves each company with this amount. This comparison does not change the game or prove the direct schedule was feasible.')}</p></div>;
}
