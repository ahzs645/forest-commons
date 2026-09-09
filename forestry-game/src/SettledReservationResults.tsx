import {useLanguage} from './i18n';
import type {WeekResult,RegionDefinition} from './simulation/types';
export default function SettledReservationResults({report,region}:{report:WeekResult;region:RegionDefinition}){
 const {t,language}=useLanguage(),fr=language==='fr';
 const rows=report.plan.reservations??[];
 if(!rows.length)return null;
 const text=(en:string,french:string)=>fr?french:en;
 const number=(n:number)=>n.toLocaleString(fr?'fr-CA':'en-CA',{maximumFractionDigits:2});
 return <div className="table-wrap" tabIndex={0} role="region" aria-label={text('Scrollable settled reservation results','Tableau défilant des réservations réalisées')}><table><caption>{text('Settled destination reservations · turn','Réservations de destination réalisées · tour')} {report.week} · m³</caption><thead><tr>{[text('Reservation','Réservation'),text('Source → destination','Source → destination'),t('Product'),text('Requested','Demandé'),text('Actual fulfilled','Réalisation constatée'),text('Unmet this turn','Non réalisé ce tour')].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map(row=>{
 const actual=report.reservationFulfillment===undefined?null:report.reservationFulfillment[row.id]??0;
 return <tr key={row.id}><th scope="row">{row.id}</th><td>{row.stand} → {row.mill}</td><td>{t(region.products.find(p=>p.id===row.product)?.name??row.product)}</td><td>{number(row.volume)}</td><td>{actual===null?t('Not recorded'):number(actual)}</td><td>{actual===null?t('Not recorded'):number(Math.max(0,row.volume-actual))}</td></tr>;
 })}</tbody></table><p>{text('Actual fulfillment belongs to this settled turn. Missing historical evidence is not treated as zero.','La réalisation correspond à ce tour terminé. Une preuve historique manquante ne vaut pas zéro.')}</p></div>;
}
