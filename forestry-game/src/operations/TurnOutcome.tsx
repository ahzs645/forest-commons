import { type RefObject } from 'react';
import Sheet from './Sheet';
import type { Game } from '../simulation/types';
import { turnOutcome } from '../simulation/turn-outcome';
import { diagnose } from '../simulation/debrief';
import { useLanguage } from '../i18n';
import './turn-outcome.css';

export function TurnSummary({ game, reportIndex, onNavigate, onReplay }: {
  game: Game; reportIndex?: number; onNavigate: (page: string) => void; onReplay: () => void;
}) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const outcome = turnOutcome(game, reportIndex);
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  if (!outcome) return <section className="panel turn-summary">
    <h2>{text('Your first result starts with a plan', 'Votre premier résultat commence par un plan')}</h2>
    <p>{text('Assign a crew and a truck, rehearse the plan, then run a turn to see recorded results.', 'Affecter une équipe et un camion, simuler le plan, puis exécuter un tour pour obtenir les résultats enregistrés.')}</p>
    <button className="primary" onClick={() => onNavigate('Planning desk')}>{text('Build the first plan', 'Créer le premier plan')}</button>
  </section>;
  const { report } = outcome;
  const findings = diagnose(game, outcome.index);
  const period = t((game.region.turnDurationWeeks ?? 1) === 1 ? 'Week' : 'Turn');
  return <section className="panel turn-summary" aria-label={text('Completed turn summary', 'Bilan du tour terminé')}>
    <span className="eyebrow">{text('RECORDED RESULTS', 'RÉSULTATS ENREGISTRÉS')}</span>
    <h2>{period} {report.week} · {text('What changed?', 'Qu’est-ce qui a changé?')}</h2>
    <div className="turn-summary-metrics">
      <article><small>{text('Timber delivered', 'Bois livré')}</small><strong>{number(outcome.delivered)} m³</strong><span>{number(outcome.harvested)} m³ {text('harvested', 'récoltés')}</span></article>
      <article><small>{text('Turn ledger net', 'Solde du registre du tour')}</small><strong>{outcome.ledgerNet > 0 ? '+' : ''}{game.region.currency} {number(outcome.ledgerNet)}</strong><span>{text('Recorded receipts and payments', 'Recettes et paiements enregistrés')}</span></article>
      <article><small>{text('Closing cash', 'Trésorerie de clôture')}</small><strong>{game.region.currency} {number(outcome.cash)}</strong><span>{text('Settled balance, not profit', 'Solde réglé, pas le bénéfice')}</span></article>
      <article><small>{text('Inventory expired', 'Stock expiré')}</small><strong>{number(outcome.waste)} m³</strong><span>{number(outcome.degraded)} m³ {text('downgraded', 'déclassés')}</span></article>
    </div>
    <p className="turn-summary-service"><strong>{text('Commitments:', 'Engagements :')}</strong> {outcome.commitments
      ? `${outcome.commitments.met} / ${outcome.commitments.evaluated} ${text('achieved at this settlement', 'respectés à ce règlement')}`
      : text('Not evaluated this turn; checked at the period boundary.', 'Non évalués ce tour; vérifiés à la fin de la période.')}</p>
    {!!findings.length && <div className="turn-summary-findings"><h3>{game.week > game.region.weeks
      ? text('Lessons for your next campaign', 'Leçons pour votre prochaine campagne')
      : text('What needs attention next?', 'Que faut-il examiner ensuite?')}</h3>
      {findings.slice(0, 3).map(finding => <article key={finding.id}><strong>{t(finding.title)}</strong><p>{t(finding.action)}</p></article>)}
    </div>}
    {!!report.messages.length && <details><summary>{report.messages.length} {report.messages.length === 1
      ? text('recorded operating message', 'message opérationnel enregistré')
      : text('recorded operating messages', 'messages opérationnels enregistrés')}</summary>
      {report.messages.map((message, index) => <p key={index}>{t(message)}</p>)}
    </details>}
    <div className="button-row">
      <button onClick={onReplay}>{text('Replay recorded routes', 'Revoir les trajets enregistrés')}</button>
      <button className="primary" onClick={() => onNavigate(game.week > game.region.weeks ? 'Reports' : 'Planning desk')}>
        {game.week > game.region.weeks ? text('Explore season results', 'Explorer le bilan de saison') : text('Plan the next turn', 'Planifier le prochain tour')}</button>
    </div>
  </section>;
}

export default function TurnOutcomeDialog({ game, reportIndex, onClose, onNavigate, onReplay, returnFocus }: {
  game: Game; reportIndex: number; onClose: () => void; onNavigate: (page: string) => void; onReplay: () => void;
  returnFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const { language, t } = useLanguage();
  const report = game.history[reportIndex];
  if (!report) return null;
  return <Sheet className="turn-outcome-dialog" labelledBy="turn-outcome-title" onClose={onClose} returnFocus={returnFocus}>
    <div className="dialog-body"><div className="section-heading"><h2 id="turn-outcome-title">
      {t((game.region.turnDurationWeeks ?? 1) === 1 ? 'Week' : 'Turn')} {report.week} {language === 'fr'
        ? (game.region.turnDurationWeeks ?? 1) === 1 ? 'terminée' : 'terminé' : 'complete'}</h2>
      <button aria-label={language === 'fr' ? 'Fermer le bilan du tour' : 'Close turn summary'} onClick={onClose}>×</button></div>
      <TurnSummary game={game} reportIndex={reportIndex} onNavigate={page => { onClose(); onNavigate(page); }} onReplay={() => { onClose(); onReplay(); }}/>
      <div className="button-row sheet-actions"><button onClick={() => { onClose(); onNavigate('Reports'); }}>{language === 'fr' ? 'Examiner les résultats détaillés' : 'Review detailed results'}</button></div>
    </div>
  </Sheet>;
}
