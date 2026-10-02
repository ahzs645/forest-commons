import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game } from '../simulation/types';
import { sum } from '../simulation/engine';
import { forecastOutcome } from '../simulation/planning';
import { AlternativeError, alternativesStorageKey, applyAlternative, captureAlternative, forecastAlternative, parseAlternatives, serializeAlternatives } from '../simulation/plan-alternatives';
import type { AlternativePair } from '../simulation/plan-alternatives';
import { useLanguage } from '../i18n';
import './comparison.css';

interface Props { game: Game; onChange: (game: Game) => void; campaignKey?: string; saveKey?: string; blocked?: boolean }
export function PlanComparison(props: Props) {
  const storageKey = alternativesStorageKey(props.game, props.campaignKey ?? `${props.game.region.id}:${props.game.seed}`);
  return <ComparisonSession key={storageKey} {...props} storageKey={storageKey} />;
}
export default PlanComparison;

function ComparisonSession({ game, onChange, storageKey, saveKey = 'forest-commons-regional-v2', blocked = false }: Props & { storageKey: string }) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const [initial] = useState(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(storageKey); return { raw, pair: raw ? parseAlternatives(raw) : [null, null] as AlternativePair, warning: '' }; }
    catch { return { raw, pair: [null, null] as AlternativePair, warning: 'storage' }; }
  });
  const [pair, setPair] = useState(initial.pair);
  const [names, setNames] = useState([initial.pair[0]?.name ?? text('Plan A', 'Plan A'), initial.pair[1]?.name ?? text('Plan B', 'Plan B')]);
  const [notice, setNotice] = useState(initial.warning);
  const [sourceChanged, setSourceChanged] = useState(false);
  const sourceChangedRef = useRef(false);
  const rawRef = useRef(initial.raw);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === saveKey || event.key === null) { sourceChangedRef.current = true; setSourceChanged(true); }
      if (event.key === storageKey || event.key === null) {
        try {
          const raw = localStorage.getItem(storageKey), next = raw ? parseAlternatives(raw) : [null, null] as AlternativePair;
          rawRef.current = raw; setPair(next); setNames(next.map((row, i) => row?.name ?? `Plan ${i === 0 ? 'A' : 'B'}`)); setNotice('tab');
        } catch { setNotice('storage'); }
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [saveKey, storageKey]);
  const current = useMemo(() => forecastOutcome(game), [game]);
  const forecasts = useMemo(() => pair.map(saved => {
    if (!saved) return { report: null, problems: [] as string[], status: 'empty' };
    try { return { ...forecastAlternative(game, saved), status: 'saved' }; }
    catch (error) { return { report: null, problems: error instanceof AlternativeError ? error.problems : [], status: error instanceof AlternativeError ? error.kind : 'invalid' }; }
  }), [game, pair]);
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  function persist(next: AlternativePair) {
    if (blocked || sourceChangedRef.current) return;
    try {
      // An event may not yet have reached this tab. Refuse to overwrite another tab's drafts.
      const latest = localStorage.getItem(storageKey);
      if (latest !== rawRef.current) {
        const refreshed = latest ? parseAlternatives(latest) : [null, null] as AlternativePair;
        rawRef.current = latest; setPair(refreshed); setNames(refreshed.map((row, i) => row?.name ?? `Plan ${i === 0 ? 'A' : 'B'}`)); setNotice('tab'); return;
      }
      const raw = serializeAlternatives(next); localStorage.setItem(storageKey, raw); rawRef.current = raw;
      setPair(next); setNotice('');
    } catch { setPair(next); setNotice('storage'); }
  }
  const errorMessage = (status: string) => status === 'stale'
    ? text('Campaign conditions or commitments changed. Save this slot again before comparing or applying it.', 'Les conditions ou engagements de la campagne ont changé. Sauvegardez de nouveau ce plan avant de le comparer ou de l’appliquer.')
    : text('This plan contains invalid orders. Correct the queues before saving it.', 'Ce plan contient des ordres invalides. Corrigez les files avant de le sauvegarder.');
  return <section className="panel plan-comparison" aria-label={text('Compare manual plans', 'Comparer des plans manuels')}>
    <span className="eyebrow">{text('TRY TWO APPROACHES', 'ESSAYER DEUX APPROCHES')}</span>
    <h2>{text('Save and compare Plan A / Plan B', 'Sauvegarder et comparer les plans A et B')}</h2>
    <p>{text('Save your current operating orders in a slot, edit your queues, then save the other slot. Both rehearse against the same current campaign state.', 'Sauvegardez vos ordres actuels dans un emplacement, modifiez vos files, puis sauvegardez l’autre plan. Les deux simulations utilisent le même état actuel de la campagne.')}</p>
    {sourceChanged && <p role="alert">{text('The campaign save changed in another tab. Reload the latest campaign before saving or applying alternatives.', 'La sauvegarde de campagne a changé dans un autre onglet. Rechargez la campagne actuelle avant de sauvegarder ou d’appliquer des plans.')}</p>}
    {blocked && !sourceChanged && <p role="alert">{text('Campaign saving is paused. You can inspect forecasts; restore or reload the campaign before saving or applying alternatives.', 'La sauvegarde de campagne est suspendue. Vous pouvez examiner les prévisions; restaurez ou rechargez la campagne avant de sauvegarder ou d’appliquer des plans.')}</p>}
    {notice && <p role="status">{notice === 'storage'
      ? text('Browser storage could not restore or retain these plans. Drafts can be used here, but may be lost when you leave.', 'Le stockage du navigateur n’a pas pu restaurer ou conserver ces plans. Vous pouvez les utiliser ici, mais ils peuvent être perdus à votre départ.')
      : notice === 'tab' ? text('Saved plans changed in another tab. The latest drafts are now shown; review them before continuing.', 'Les plans sauvegardés ont changé dans un autre onglet. Les derniers brouillons sont affichés; examinez-les avant de continuer.')
      : notice === 'applied' ? text('Plan applied. Review the operating queues and mark each role ready again.', 'Plan appliqué. Examinez les files de travail et confirmez de nouveau la préparation de chaque rôle.')
      : errorMessage(notice)}</p>}
    <div className="plan-comparison-slots">{pair.map((saved, i) => {
      const forecast = forecasts[i];
      return <article className="plan-comparison-slot" key={i}>
        <label>{text('Plan name', 'Nom du plan')} {i === 0 ? 'A' : 'B'}<input maxLength={80} value={names[i]} onChange={event => setNames(names.map((name, j) => j === i ? event.target.value : name))} /></label>
        <p className="muted">{!saved ? text('No saved orders yet.', 'Aucun ordre sauvegardé.') : forecast.report ? text('Ready to compare and apply.', 'Prêt à comparer et à appliquer.') : errorMessage(forecast.status)}</p>
        {!!forecast.problems.length && <p>{forecast.problems.map(t).join(' ')}</p>}
        <div className="button-row">
          <button disabled={blocked || sourceChanged || !names[i].trim() || game.week > game.region.weeks} onClick={() => {
            try { const next = [...pair] as AlternativePair; next[i] = captureAlternative(game, names[i]); persist(next); }
            catch (error) { setNotice(error instanceof AlternativeError ? error.kind : 'invalid'); }
          }}>{saved ? text('Replace with current orders', 'Remplacer par les ordres actuels') : text('Save current orders', 'Sauvegarder les ordres actuels')}</button>
          {saved && <button disabled={blocked || sourceChanged || !names[i].trim()} onClick={() => { const next = [...pair] as AlternativePair; next[i] = { ...saved, name: names[i].trim() }; persist(next); }}>{text('Save name', 'Sauvegarder le nom')}</button>}
          <button className="primary" disabled={blocked || sourceChanged || !saved || !forecast.report} onClick={() => {
            if (blocked || !saved || sourceChangedRef.current) return;
            try { onChange(applyAlternative(game, saved)); setNotice('applied'); }
            catch (error) { setNotice(error instanceof AlternativeError ? error.kind : 'invalid'); }
          }}>{text('Apply', 'Appliquer')} {i === 0 ? 'A' : 'B'}</button>
        </div>
      </article>;
    })}</div>
    <div className="plan-comparison-table" tabIndex={0} role="region" aria-label={text('Forecast comparison table', 'Tableau comparatif des prévisions')}>
      <table><caption>{text('Current-turn forecast', 'Prévision du tour actuel')}</caption><thead><tr><th scope="col">{text('Outcome', 'Résultat')}</th><th scope="col">{text('Current', 'Actuel')}</th>{pair.map((saved, i) => <th scope="col" key={i}>{saved?.name ?? `Plan ${i === 0 ? 'A' : 'B'}`}</th>)}</tr></thead>
        <tbody>{[
          [text('Deliveries (m³)', 'Livraisons (m³)'), (r: NonNullable<typeof current.report>) => number(sum(r.delivered))],
          [text('Harvest (m³)', 'Récolte (m³)'), (r: NonNullable<typeof current.report>) => number(sum(r.harvested))],
          [text('Closing cash', 'Trésorerie finale'), (r: NonNullable<typeof current.report>) => `${game.region.currency} ${number(r.cash)}`],
          [text('Cash movement', 'Variation de trésorerie'), (r: NonNullable<typeof current.report>) => `${game.region.currency} ${number(r.cash - game.cash)}`],
          [text('Waste (m³)', 'Rebuts (m³)'), (r: NonNullable<typeof current.report>) => number(r.waste)],
          [text('Emissions (kg CO₂)', 'Émissions (kg CO₂)'), (r: NonNullable<typeof current.report>) => number(r.emissions)],
        ].map(([label, format]) => <tr key={label as string}><th scope="row">{label as string}</th>{[current, ...forecasts].map((forecast, i) => <td key={i}>{forecast.report ? (format as (r: NonNullable<typeof current.report>) => string)(forecast.report) : '—'}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <details><summary>{text('What is saved and forecast', 'Contenu sauvegardé et hypothèses')}</summary><p className="muted">{text('Saves current-turn crew and truck queues, retention and processing, reciprocal and facility-transfer orders. Applying keeps current cash, timber rights, inventory, bids, commitments, reservations and future crew schedules; all role readiness is reset. A change to campaign conditions invalidates older drafts.', 'Sauvegarde les files d’équipes et de camions du tour actuel, la rétention, ainsi que les ordres de transformation, d’échange réciproque et de transfert entre installations. L’application conserve la trésorerie, les droits forestiers, les stocks, les offres, les engagements, les réservations et les horaires futurs; la préparation des rôles est réinitialisée. Tout changement des conditions de campagne invalide les anciens brouillons.')}</p>
      <p className="muted">{text('Uses published forecast weather and revealed events; excludes auction awards and bid payments. Blocked work may be skipped. These manual scenarios are estimates, not an optimizer or guaranteed outcomes.', 'Utilise la météo prévue publiée et les événements révélés; exclut les adjudications et les paiements des offres. Les travaux bloqués peuvent être ignorés. Ces scénarios manuels sont des estimations, pas une optimisation ni une garantie.')}</p></details>
  </section>;
}
