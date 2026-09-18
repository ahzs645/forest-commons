import { useMemo, useState } from 'react';
import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';
import { siteReadiness, type ReadinessSelection } from '../simulation/operational-readiness';
import { chainBottleneck, recordFieldEvidence } from '../simulation/operations-profile';

export interface StandReadinessProps {
  game: Game;
  standId: string;
  selection?: ReadinessSelection;
  onNavigate?: (page: string) => void;
  /** Supply only from the standalone campaign. Classroom needs a server command. */
  onChange?: (game: Game) => void;
}
const destinations = { permits: 'Forest & timber', production: 'Production', transport: 'Transport', commitments: 'Commitments', evidence: 'Scenario studio' };
export default function StandReadiness({ game, standId, selection = {}, onNavigate, onChange }: StandReadinessProps) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const checks = useMemo(() => siteReadiness(game, standId, selection),
    [game, standId, selection.crew, selection.treatment, selection.truck, selection.mill, selection.product]);
  const dossier = game.region.operations?.stands[standId];
  const [note, setNote] = useState('');
  const [taskChoice, setTaskChoice] = useState('');
  const [notice, setNotice] = useState('');
  const evidence = (game.fieldEvidence ?? []).filter(e => e.stand === standId);
  const availableTasks = dossier?.fieldTasks.filter(task => task.responsibleParty === 'operator' && !evidence.some(e => e.task === task.id)) ?? [];
  const taskId = availableTasks.some(task => task.id === taskChoice) ? taskChoice : availableTasks[0]?.id ?? '';
  const state = game.stands.find(s => s.id === standId);
  const bottleneck = selection.crew ? chainBottleneck(game.region, selection.crew, standId) : null;
  const number = (n: number) => n.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 1 });
  return <section className="operating-readiness" aria-label={text('Site readiness', 'État de préparation du site')}>
    <header><div><span className="eyebrow">{text('OPERATING READINESS', 'PRÉPARATION DES OPÉRATIONS')}</span><h3>{standId}</h3></div>
      {game.region.operations && <span className="operating-badge">{text('Authored case', 'Cas pédagogique')}</span>}
    </header>
    <div className="operating-scope-status">
      {(['harvest', 'haul'] as const).map(scope => {
        const list = checks.filter(c => c.scope === scope);
        const blocked = list.filter(c => c.level === 'blocked').length;
        return <span key={scope} data-level={blocked ? 'blocked' : 'ready'}>
          {scope === 'harvest' ? text('Harvest', 'Récolte') : text('Haul', 'Transport')}:
          {' '}{!list.length ? text('Closed season', 'Saison terminée') : blocked ? `${blocked} ${text('checks need attention', 'vérifications à résoudre')}` : text('Checks passed · rehearse', 'Vérifications réussies · simuler')}
        </span>;
      })}
    </div>
    <details className="operating-checks">
      <summary>{text('What can happen here now?', 'Que peut-on faire ici maintenant?')}</summary>
      <p className="muted">{text('Forecast conditions, not authorization to operate. Route readiness does not reserve stock, truck time or mill capacity.',
        'Conditions prévues, et non autorisation réelle. Un itinéraire disponible ne réserve ni bois, ni heures de camion, ni capacité de réception.')}</p>
      <dl>{checks.map(check => <div key={`${check.scope}:${check.code}`} data-level={check.level}>
        <dt><span className="operating-status-word">{check.level === 'blocked' ? text('Blocked', 'Bloqué') : check.level === 'warning' ? text('Review', 'À vérifier') : text('Ready', 'Prêt')}</span> {t(check.label)}</dt>
        <dd>{t(check.message)}{check.level !== 'ready' && check.action && onNavigate &&
          <button type="button" onClick={() => onNavigate(destinations[check.action!])}>{text('Review details', 'Voir les détails')}</button>}</dd>
      </div>)}</dl>
    </details>
    {dossier && <details className="stand-dossier">
      <summary>{text('Stand dossier · assumptions & exclusions', 'Fiche du peuplement · hypothèses et exclusions')}</summary>
      <p>{dossier.rationale}</p>
      <p className="operating-source-note">{text('Inventory geometry is sourced; all attributes below are authored. No treatment or exclusion boundary is mapped.',
        'La géométrie d’inventaire provient des sources; les attributs ci-dessous sont pédagogiques. Aucune limite de traitement ou d’exclusion n’est cartographiée.')}</p>
      <dl className="dossier-facts">
        <dt>{text('Inventory reference', 'Référence d’inventaire')}</dt><dd>{dossier.inventoryReference}</dd>
        <dt>{text('Inventory area', 'Superficie d’inventaire')}</dt><dd>{number(dossier.inventoryAreaHa)} ha</dd>
        <dt>{text('Modelled treatment area', 'Superficie de traitement simulée')}</dt><dd>{number(dossier.netTreatmentAreaHa)} ha</dd>
        <dt>{text('Numerical exclusions', 'Exclusions numériques')}</dt><dd>{number(dossier.excludedAreaHa)} ha</dd>
        <dt>{text('Authored age', 'Âge pédagogique')}</dt><dd>{dossier.ageYears} {text('years', 'ans')}</dd>
        <dt>{text('Volume input range', 'Plage de volume')}</dt><dd>{number(dossier.merchantableM3PerHa.low)}–{number(dossier.merchantableM3PerHa.high)} m³/ha; {text('central', 'valeur centrale')} {number(dossier.merchantableM3PerHa.central)}</dd>
        <dt>{text('Retention floor', 'Seuil de rétention')}</dt><dd>{number(dossier.minimumRetention * 100)}%</dd>
        <dt>{text('Systems', 'Systèmes')}</dt><dd>{dossier.systems.join(' / ')}</dd>
        <dt>{text('Eligible treatments', 'Traitements admissibles')}</dt><dd>{dossier.treatments.map(id => game.region.treatments?.[id]?.name ?? t('Final harvest')).join(' / ')}</dd>
      </dl>
      <h4>{text('Authored species composition', 'Composition en essences pédagogique')}</h4>
      <p>{Object.entries(dossier.species).map(([species, fraction]) => `${species}: ${number(fraction * 100)}%`).join(' · ')}</p>
      <p>{dossier.slopeDescription}</p>
      {bottleneck && <p><strong>{text('Selected chain bottleneck:', 'Goulot de la chaîne choisie :')}</strong> {bottleneck.stage} · {number(bottleneck.rateM3PerHour)} m³/h {text('before weather adjustment. No intermediate machine inventories are simulated.', 'avant ajustement météo. Les stocks intermédiaires des machines ne sont pas simulés.')}</p>}
      {dossier.planningAssumptions.map((assumption, i) => <p className="muted" key={i}>{assumption}</p>)}
    </details>}
    {dossier && <details className="field-evidence">
      <summary>{text('Post-harvest evidence ≠ financial settlement', 'Preuve après récolte ≠ règlement financier')}</summary>
      <p>{text('Notes document this exercise only. Paying a reserve does not prove that field work occurred; recording a note does not issue a certificate.',
        'Les notes documentent cet exercice seulement. Une réserve payée ne prouve pas des travaux; une note ne constitue pas un certificat.')}</p>
      {dossier.fieldTasks.map(task => <article key={task.id}>
        <strong>{task.label}</strong><p>{text('Responsible party:', 'Responsable :')} {task.responsibleParty}</p>
        <p>{evidence.find(e => e.task === task.id)?.note ?? task.note}</p>
        <span>{evidence.some(e => e.task === task.id) ? text('Recorded in exercise', 'Consigné dans l’exercice') : text('No exercise evidence recorded', 'Aucune preuve pédagogique consignée')}</span>
      </article>)}
      {onChange && taskId && <form onSubmit={event => {
        event.preventDefault();
        try { onChange(recordFieldEvidence(game, standId, taskId, note)); setNote(''); setNotice(text('Evidence note recorded. Financial reserves are unchanged.', 'Note consignée. Les réserves financières restent inchangées.')); }
        catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
      }}>
        <label>{text('Operator task', 'Tâche de l’exploitant')}<select value={taskId} onChange={e => setTaskChoice(e.target.value)}>{availableTasks.map(task => <option key={task.id} value={task.id}>{task.label}</option>)}</select></label>
        <label>{text('Exercise evidence note', 'Note de preuve pédagogique')}<textarea value={note} minLength={8} maxLength={1000} required rows={3} onChange={e => setNote(e.target.value)} /></label>
        <button disabled={!state?.owned || !(state.harvested > 0) || note.trim().length < 8}>{text('Record note', 'Consigner la note')}</button>
      </form>}
      {!onChange && <p>{text('Read-only here. Field evidence writes require an authorized campaign action.', 'Lecture seule ici. La consignation exige une action de campagne autorisée.')}</p>}
      {notice && <p role="status">{notice}</p>}
    </details>}
  </section>;
}
