import { useLanguage } from './i18n';
import type { Disruption, Game } from './simulation/types';
import { activeDisruptions } from './simulation/disruptions';
import './operations/plan-intent.css';

function targetName(game: Game, event: Disruption): string {
  const entities = event.kind === 'crew' ? game.region.crews
    : event.kind === 'truck' ? game.region.trucks : event.kind === 'mill' ? game.region.mills : [];
  return entities.find(entity => entity.id === event.target)?.name ?? event.target;
}

/** Only published events inform this briefing, including already-revealed future closures. */
export function CurrentTurnBriefing({ game, onReviewConditions }: {
  game: Game; onReviewConditions?: () => void;
}) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  if (game.week > game.region.weeks) return null;
  const active = activeDisruptions(game);
  const upcoming = (game.region.disruptions ?? []).filter(event => event.revealWeek <= game.week && event.week > game.week);
  if (!active.length && !upcoming.length) return null;
  return <aside className="turn-briefing" aria-label={text('Current turn briefing', 'Briefing du tour actuel')}>
    <h3>{text(`Turn ${game.week}: review changing conditions`, `Tour ${game.week} : examiner les nouvelles conditions`)}</h3>
    <ul>{active.map(event => <li key={event.id}><strong>{t(event.title)}</strong> · {targetName(game, event)} · {text('currently unavailable', 'actuellement indisponible')}</li>)}
      {upcoming.map(event => <li key={event.id}><strong>{t(event.title)}</strong> · {targetName(game, event)} · {text(`closure starts turn ${event.week}`, `fermeture à partir du tour ${event.week}`)}</li>)}
    </ul>
    <p>{text('Review affected queues and routes before committing. Check recovery decisions, change your plan, or wait for normal reopening.',
      'Vérifiez les files et les routes touchées avant de confirmer. Examinez les décisions de remise en service, modifiez votre plan ou attendez la réouverture normale.')}</p>
    {onReviewConditions && <button onClick={onReviewConditions}>{text('Review recovery choices', 'Examiner les choix de remise en service')}</button>}
  </aside>;
}

export default function DisruptionDesk({ game, onRespond, onNavigate }: {
  game: Game;
  onRespond: (id: string, action: 'repair' | 'wait') => void;
  onNavigate?: (page: 'Production' | 'Transport') => void;
}) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const events = (game.region.disruptions ?? []).filter(event => event.revealWeek <= game.week);
  if (!events.length) return null;
  const active = activeDisruptions(game);
  const uncommittedCash = game.cash - Object.values(game.plan.bids).reduce((total, bid) => total + bid, 0);
  const money = (amount: number) => `${game.region.currency} ${amount.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA')}`;
  return <section className="panel" id="disruption-desk" tabIndex={-1}>
    <span className="eyebrow">{text('OPERATING DISRUPTIONS', 'PERTURBATIONS DES OPÉRATIONS')}</span>
    <h2>{text('Respond to changing conditions', 'Réagir aux nouvelles conditions')}</h2>
    <p className="muted">{text('Closures affect routes and available capacity. Recovery payments are deducted immediately; waiting does not charge a recovery payment. Normal operating costs and other obligations still apply.',
      'Les fermetures affectent les routes et la capacité disponible. La remise en service est payée immédiatement; l’attente n’entraîne aucun paiement de réparation. Les coûts d’exploitation et les autres obligations continuent de s’appliquer.')}</p>
    <div className="disruption-decisions">{events.map(event => {
      const response = game.eventResponses?.find(item => item.event === event.id && item.action === 'repair');
      const open = active.some(item => item.id === event.id);
      const waiting = game.eventResponses?.some(item => item.event === event.id && item.action === 'wait');
      const recoveryTurn = Math.min(game.week + event.repairWeeks, event.endWeek + 1);
      const restoredTurn = response ? Math.min(response.restoredWeek, event.endWeek + 1) : event.endWeek + 1;
      const insufficient = uncommittedCash < event.repairCost;
      return <article className="disruption-decision" key={event.id}>
        <span className="disruption-status">{open ? response ? text('Recovery underway', 'Remise en service en cours') : waiting ? text('Waiting chosen', 'Attente choisie') : text('Decision available', 'Décision disponible')
          : game.week < event.week ? text('Published upcoming closure', 'Fermeture à venir annoncée') : text('Service restored', 'Service rétabli')}</span>
        <h3>{t(event.title)}</h3>
        <p>{t(event.description)}</p>
        <p>{text('Affected resource:', 'Ressource touchée :')} <strong>{targetName(game, event)}</strong> · {text('Closure turns', 'Tours de fermeture')} {event.week}–{event.endWeek}</p>
        {response ? <p>{text('Recovery paid:', 'Remise en service payée :')} {money(event.repairCost)} · {text('available from turn', 'disponible à partir du tour')} {restoredTurn}</p>
          : open ? <>
            <div className="disruption-choice">
              <strong>{text('Paid recovery', 'Remise en service payante')}</strong>
              <p>{money(event.repairCost)} · {recoveryTurn === game.week ? text('available immediately', 'disponible immédiatement')
                : text(`available in ${recoveryTurn - game.week} turn(s), from turn ${recoveryTurn}`,
                  `disponible dans ${recoveryTurn - game.week} tour(s), à partir du tour ${recoveryTurn}`)}</p>
              <button disabled={insufficient || game.week > game.region.weeks} onClick={() => onRespond(event.id, 'repair')}>{text('Pay for recovery', 'Payer la remise en service')}</button>
              {insufficient && <p>{text(`Uncommitted cash: ${money(uncommittedCash)}. Cash reserved for bids cannot fund recovery.`,
                `Trésorerie non engagée : ${money(uncommittedCash)}. Les fonds réservés aux offres ne peuvent pas financer la remise en service.`)}</p>}
            </div>
            <div className="disruption-choice">
              <strong>{text('Wait or work elsewhere', 'Attendre ou travailler ailleurs')}</strong>
              <p>{text(`No recovery payment. Normal reopening is turn ${event.endWeek + 1}; the affected resource remains unavailable until then.`,
                `Aucun paiement de remise en service. La réouverture normale est au tour ${event.endWeek + 1}; la ressource touchée reste indisponible jusque-là.`)}</p>
              <button disabled={game.week > game.region.weeks} onClick={() => onRespond(event.id, 'wait')}>{text('Wait for normal reopening', 'Attendre la réouverture normale')}</button>
              {waiting && <p>{text('Waiting recorded. You can still choose recovery.', 'Attente enregistrée. Vous pouvez encore choisir la remise en service.')}</p>}
            </div>
          </> : !response && <p>{game.week < event.week
            ? text(`Starts turn ${event.week}. Recovery choices become available when the closure begins.`, `Débute au tour ${event.week}. Les choix de remise en service deviennent disponibles au début de la fermeture.`)
            : text(`Normal service restored from turn ${event.endWeek + 1}.`, `Service normal rétabli à partir du tour ${event.endWeek + 1}.`)}</p>}
        {open && onNavigate && <button onClick={() => onNavigate(event.kind === 'crew' ? 'Production' : 'Transport')}>{text('Review affected plan', 'Examiner le plan touché')}</button>}
      </article>;
    })}</div>
  </section>;
}
