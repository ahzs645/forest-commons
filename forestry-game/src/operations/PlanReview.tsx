import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game, WeekResult } from '../simulation/types';
import { forecastOutcome } from '../simulation/planning';
import { sum } from '../simulation/engine';
import { planExceptions, outstandingOperatorProvisions } from '../simulation/operational-readiness';
import { useLanguage } from '../i18n';
import { assessPlanIntent } from '../simulation/plan-intent';
import './plan-intent.css';

type PlanningDestination = 'Forest & timber' | 'Production' | 'Transport' | 'Overview';

export function PlanIntentNotice({ game, report, onNavigate }: {
  game: Game; report: WeekResult | null; onNavigate?: (page: PlanningDestination) => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const intent = assessPlanIntent(game, report);
  if (game.week > game.region.weeks) return null;
  if (intent.status === 'productive' || intent.status === 'unavailable') return null;
  const money = (amount: number) => `${game.region.currency} ${Math.round(amount).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA')}`;
  const idle = intent.status === 'idle' || intent.status === 'waiting';
  return <aside className="plan-intent-notice" aria-label={text('Plan activity', 'Activité du plan')}>
    <strong>{intent.status === 'waiting' ? text('Waiting turn: no work scheduled', 'Tour d’attente : aucun travail planifié')
      : intent.status === 'idle' ? text('No work scheduled', 'Aucun travail planifié')
      : intent.status === 'procurement' ? text('Bids scheduled; no operating output forecast', 'Offres planifiées; aucune production prévue')
      : text('Work scheduled, but no output forecast', 'Travaux planifiés, mais aucune production prévue')}</strong>
    <p>{idle ? text('This can be a deliberate choice. Running the turn still settles operating costs, inventory aging and any obligations due.',
      'Il peut s’agir d’un choix délibéré. Le tour règle tout de même les coûts d’exploitation, le vieillissement des stocks et les obligations échues.')
      : intent.status === 'procurement' ? text('Auction awards are excluded from this forecast. A successful award supplies a later turn; review your bid commitments before proceeding.',
        'Les adjudications sont exclues de cette prévision. Un lot remporté approvisionne un tour ultérieur; vérifiez vos engagements avant de poursuivre.')
      : text('The rehearsal predicts no harvest, delivery, processing, facility transfer or finished-product sale. Review access, inventory and available capacity before committing.',
        'La simulation ne prévoit aucune récolte, livraison, transformation, aucun transfert entre installations ni aucune vente de produits finis. Vérifiez l’accès, les stocks et la capacité disponible avant de confirmer.')}</p>
    {intent.cashChange !== null && <p>{intent.cashChange < 0
      ? text(`Forecast cash decrease from now: ${money(-intent.cashChange)}.`, `Baisse de trésorerie prévue à partir de maintenant : ${money(-intent.cashChange)}.`)
      : text(`Forecast cash change from now: +${money(intent.cashChange)}.`, `Variation de trésorerie prévue à partir de maintenant : +${money(intent.cashChange)}.`)}</p>}
    {idle && !report && <p>{text('Forecast unavailable. The cost of this waiting turn has not been estimated.', 'Prévision indisponible. Le coût de ce tour d’attente n’a pas été estimé.')}</p>}
    {onNavigate && <div className="button-row">
      <button onClick={() => onNavigate('Overview')}>{text('Plan crew work and deliveries on the map', 'Planifier les équipes et les livraisons sur la carte')}</button>
    </div>}
  </aside>;
}

export function TurnReview({ game, onNavigate }: { game: Game; onNavigate?: (page: PlanningDestination) => void }) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const forecast = useMemo(() => forecastOutcome(game), [game]);
  const exceptions = useMemo(() => planExceptions(game), [game]);
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  if (game.week > game.region.weeks) return <section className="operating-turn-review">
    <h3>{text('Season complete', 'Saison terminée')}</h3>
    <p>{text('All operating turns have been settled. Review the recorded results and season scorecard before starting another campaign.',
      'Tous les tours ont été réglés. Examiner les résultats enregistrés et le bilan de saison avant de commencer une autre campagne.')}</p>
  </section>;
  return <section className="operating-turn-review" aria-label={text('Plan rehearsal', 'Simulation du plan')}>
    <h3>{text('What this plan is expected to do', 'Résultats attendus de ce plan')}</h3>
    <PlanIntentNotice game={game} report={forecast.report} onNavigate={onNavigate} />
    {forecast.report ? <dl className="operating-preview-metrics">
      <div><dt>{text('Harvest', 'Récolte')}</dt><dd>{number(sum(forecast.report.harvested))} m³</dd></div>
      <div><dt>{text('Delivery', 'Livraison')}</dt><dd>{number(sum(forecast.report.delivered))} m³</dd></div>
      <div><dt>{text('Closing cash', 'Trésorerie finale')}</dt><dd>{game.region.currency} {number(forecast.report.cash)}</dd></div>
      <div><dt>{text('Waste', 'Rebuts')}</dt><dd>{number(forecast.report.waste)} m³</dd></div>
    </dl> : <p role="status">{text('Forecast unavailable:', 'Prévision indisponible :')} {forecast.problems.map(t).join(' ')}</p>}
    {outstandingOperatorProvisions(game) > 0 && <p>{text('Unfunded operator provisions:', 'Provisions non financées de l’exploitant :')} <strong>{game.region.currency} {number(outstandingOperatorProvisions(game))}</strong></p>}
    <details><summary>{text('About this forecast', 'À propos de cette prévision')}</summary>
      <p className="muted">{text('Uses the published forecast and revealed events. Excludes uncertain auction awards. Blocked work may be skipped by the engine; only invalid plans prevent settlement.',
        'Utilise les prévisions publiées et les événements révélés. Exclut les adjudications incertaines. Le moteur peut ignorer des travaux bloqués; seuls les plans invalides empêchent le règlement.')}</p>
      <p className="muted">{text('Provisions are obligations, not free cash. The forecast ledger applies configured settlement timing.', 'Les provisions sont des obligations, pas des liquidités libres. Le registre prévisionnel respecte les échéances configurées.')}</p>
      {game.region.operations && <>
        <h4>{text('Lesson steps and assumptions', 'Étapes et hypothèses de la leçon')}</h4>
        <ol>{game.region.operations.lessonSteps.map((step, i) => <li key={i}>{step}</li>)}</ol>
        <p>{game.region.operations.scopeNote}</p>
        {game.region.operations.planningContext.map((item, i) => <p key={i}>{item}</p>)}
      </>}
    </details>
    {!exceptions.length ? <p className="muted">{text('No readiness exceptions detected. This checks constraints, not whether work is scheduled or output is expected. Shared inventory, sequence, handling and available hours still determine fulfillment.', 'Aucune exception détectée. Cette vérification porte sur les contraintes, pas sur les travaux planifiés ou la production prévue. Le stock partagé, la séquence, la manutention et les heures disponibles déterminent les livraisons.')}</p> : <details open><summary>{exceptions.length === 1 ? text('1 readiness finding', '1 constat de préparation') : `${exceptions.length} ${text('readiness findings', 'constats de préparation')}`}</summary>
      <div className="operating-exceptions">{exceptions.map((finding, i) => <article key={i} data-level={finding.level}>
        <strong>{finding.subject} · {finding.level === 'blocked' ? text('Blocked under forecast', 'Bloqué selon la prévision') : text('Review', 'À vérifier')}</strong><p>{t(finding.message)}</p>
      </article>)}</div>
    </details>}
    {!!forecast.report?.messages.length && <details><summary>{text('Engine rehearsal messages', 'Messages de la simulation')}</summary>
      {forecast.report.messages.map((message, i) => <p key={i}>{t(message)}</p>)}
    </details>}
  </section>;
}

export function DraftReview({ game, buildDraft, onApply, onClose }: {
  game: Game; buildDraft: (game: Game) => Game; onApply: (game: Game) => void; onClose: () => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const capture = () => {
    try { return { source: game, candidate: buildDraft(game), error: '' }; }
    catch (error) { return { source: game, candidate: null, error: error instanceof Error ? error.message : String(error) }; }
  };
  const [review, setReview] = useState(capture);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = modal.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  const stale = game !== review.source;
  const counts = (kind: 'crews' | 'trucks') => Object.keys(game.plan[kind]).filter(id =>
    JSON.stringify(review.source.plan[kind][id]) !== JSON.stringify(review.candidate?.plan[kind][id])).length;
  return <dialog ref={modal} className="operating-draft-dialog" aria-labelledby="operating-draft-title" onCancel={onClose}>
    <div className="dialog-body">
      <h2 id="operating-draft-title">{text('Review the draft before applying it', 'Examiner le brouillon avant de l’appliquer')}</h2>
      <p>{text('Your saved plan has not changed. This is a forecast heuristic, not an optimal season strategy. Applying it replaces current crew and truck queues.',
        'Votre plan sauvegardé n’a pas changé. Il s’agit d’une heuristique prévisionnelle, pas d’une stratégie optimale. Son application remplace les files actuelles.')}</p>
      {stale && <p role="alert">{text('The campaign changed while this review was open. Rebuild the proposal before applying it.', 'La campagne a changé pendant l’examen. Recréez la proposition avant de l’appliquer.')}</p>}
      {review.error && <p role="alert">{review.error}</p>}
      {review.candidate && <><p>{counts('crews')} {text('crew queues', 'files d’équipes')} · {counts('trucks')} {text('truck queues changed', 'files de camions modifiées')}</p>
        <div className="operating-draft-comparison"><details><summary>{text('Current plan forecast', 'Prévision du plan actuel')}</summary><TurnReview game={review.source} /></details>
          <TurnReview game={review.candidate} /></div></>}
      <div className="button-row">
        <button onClick={onClose}>{text('Keep current plan', 'Conserver le plan actuel')}</button>
        <button onClick={() => setReview(capture())}>{text('Rebuild proposal', 'Recréer la proposition')}</button>
        <button className="primary" disabled={stale || !review.candidate} onClick={() => {
          if (game !== review.source || !review.candidate) return;
          onApply(review.candidate); onClose();
        }}>{text('Apply reviewed draft', 'Appliquer le brouillon examiné')}</button>
      </div>
    </div>
  </dialog>;
}
