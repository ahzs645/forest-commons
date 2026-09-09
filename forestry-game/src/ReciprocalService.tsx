import {useLanguage} from './i18n';
import type {Game} from './simulation/types';
import {reciprocalServiceProgress,type ReciprocalPair} from './simulation/reciprocal';
export default function ReciprocalService({game,pair}:{game:Game;pair:ReciprocalPair}){
 const {t,language}=useLanguage();
 const progress=reciprocalServiceProgress(game,pair.id);
 const number=(n:number)=>n.toLocaleString(language==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:1});
 return <div className="soft-card">
  {pair.routing!=='fixed'&&<p>{t('Disruption rule: if either leg cannot run, neither leg of that load pair is sent. Unshipped timber remains in stock and continues normal aging. Closures do not extend the deadline or waive own-mill requirements. Any renewal requires fresh acceptance by both companies.')}</p>}
  <p>{t(pair.routing==='fixed'?'Fixed routing: covered timber stays with its own mill.':'Flexible routing: outside deliveries protect outstanding own-mill requirements.')}</p>
  {!!((pair.minimumOwnA??0)+(pair.minimumOwnB??0))&&<>
   <p>{t('Own-mill requirements are due at closing turn')} {pair.deadline}. {t('Only actual ordinary deliveries from the assigned source to its own mill after both companies accept count. Roadside reserves are not deliveries.')}</p>
   {progress&&<><p>{t('Service status')}: {t(progress.status==='unaccepted'?'Closed without agreement':`Service ${progress.status}`)}</p><dl>{(['A','B'] as const).map(company=><div key={company}><dt>{t('Company')} {company} · {company==='A'?pair.standA:pair.standB} → {company==='A'?pair.millA:pair.millB}</dt><dd>{number(progress[company].delivered)} / {number(progress[company].required)} m³ · {number(progress[company].outstanding)} {t('m³ outstanding')}</dd></div>)}</dl></>}
   <p>{t('Shortfalls are reported for debriefing; this agreement adds no cash penalty. The stock floor is the larger of the roadside reserve and the outstanding own-mill requirement.')}</p>
  </>}
 </div>;
}
