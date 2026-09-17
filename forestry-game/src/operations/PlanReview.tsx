import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game } from '../simulation/types';
import { forecastOutcome } from '../simulation/planning';
import { sum } from '../simulation/engine';
import { planExceptions, outstandingOperatorProvisions } from '../simulation/operational-readiness';
import { useLanguage } from '../i18n';

export function TurnReview({ game }: { game: Game }) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const forecast = useMemo(() => forecastOutcome(game), [game]);
  const exceptions = useMemo(() => planExceptions(game), [game]);
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  return <section className="operating-turn-review" aria-label={text('Plan rehearsal', 'Simulation du plan')}>
    <h3>{text('What this plan is expected to do', 'Résultats attendus de ce plan')}</h3>
    {forecast.report ? <dl className="operating-preview-metrics">
      <div><dt>{text('Harvest', 'Récolte')}</dt><dd>{number(sum(forecast.report.harvested))} m³</dd></div>
      <div><dt>{text('Delivery', 'Livraison')}</dt><dd>{number(sum(forecast.report.delivered))} m³</dd></div>
      <div><dt>{text('Closing cash', 'Trésorerie finale')}</dt><dd>{game.region.currency} {number(forecast.report.cash)}</dd></div>
      <div><dt>{text('Waste', 'Rebuts')}</dt><dd>{number(forecast.report.waste)} m³</dd></div>
    </dl> : <p role="status">{text('Forecast unavailable:', 'Prévision indisponible :')} {forecast.problems.map(t).join(' ')}</p>}
    <p>{text('Unfunded operator provisions:', 'Provisions non financées de l’exploitant :')} <strong>{game.region.currency} {number(outstandingOperatorProvisions(game))}</strong></p>
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
    <details open={exceptions.length > 0}><summary>{exceptions.length} {text('readiness findings', 'constats de préparation')}</summary>
      {!exceptions.length && <p>{text('No readiness exceptions detected. Shared inventory, sequence, handling and available hours still determine fulfillment.', 'Aucune exception détectée. Le stock partagé, la séquence, la manutention et les heures disponibles déterminent les livraisons.')}</p>}
      <div className="operating-exceptions">{exceptions.map((finding, i) => <article key={i} data-level={finding.level}>
        <strong>{finding.subject} · {finding.level === 'blocked' ? text('Blocked under forecast', 'Bloqué selon la prévision') : text('Review', 'À vérifier')}</strong><p>{t(finding.message)}</p>
      </article>)}</div>
    </details>
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
