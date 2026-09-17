import { useMemo } from 'react';
import type { Game } from '../simulation/types';
import { decisionEvidence, outstandingOperatorProvisions } from '../simulation/operational-readiness';
import { useLanguage } from '../i18n';
export default function DecisionDebrief({ game, onSelect }: { game: Game; onSelect?: (id: string) => void }) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const result = useMemo(() => decisionEvidence(game), [game]);
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  if (!result) return <section className="panel"><h3>{text('Decide → rehearse → observe → adapt', 'Décider → simuler → observer → adapter')}</h3>
    <p>{text('After a turn, this view connects recorded production, shipments, attributed cash and engine messages. It does not invent explanations for missing legacy records.',
      'Après un tour, cette vue relie la production, les livraisons, la trésorerie attribuée et les messages enregistrés. Elle n’invente pas d’explications pour des données manquantes.')}</p></section>;
  const { report, lots, sharedCash } = result;
  return <section className="panel operating-debrief">
    <h3>{text('What happened in the last turn?', 'Que s’est-il passé au dernier tour?')} · {report.week}</h3>
    <p>{text('Observed conditions:', 'Conditions observées :')} {Object.entries(report.weather).map(([zone, value]) => `${zone}: ${t(value)}`).join(' · ')}</p>
    <div className="operating-result-cards">{lots.map(lot => <article key={lot.id}>
      <h4>{onSelect ? <button onClick={() => onSelect(lot.id)}>{lot.id}</button> : lot.id}</h4>
      <dl className="dossier-facts"><dt>{text('Produced', 'Produit')}</dt><dd>{report.production ? `${number(lot.producedM3)} m³` : text('Not recorded', 'Non consigné')}</dd>
        <dt>{text('Shipped', 'Expédié')}</dt><dd>{report.shipments ? `${number(lot.shippedM3)} m³` : text('Not recorded', 'Non consigné')}</dd>
        <dt>{text('Attributed cash movement', 'Mouvement de trésorerie attribué')}</dt><dd>{game.region.currency} {number(lot.attributedCash)}</dd></dl>
      {!!lot.evidence.length && <details><summary>{text('Recorded constraints and outcomes', 'Contraintes et résultats consignés')}</summary>{lot.evidence.map((message, i) => <p key={i}>{t(message)}</p>)}</details>}
    </article>)}</div>
    <p><strong>{text('Unallocated/shared cash movements:', 'Mouvements de trésorerie non attribués/partagés :')}</strong> {game.region.currency} {number(sharedCash)}</p>
    <p><strong>{text('Existing unfunded operator provisions:', 'Provisions existantes non financées de l’exploitant :')}</strong> {game.region.currency} {number(outstandingOperatorProvisions(game))}</p>
    <details><summary>{text('Reading the debrief', 'Lire le bilan')}</summary>
      <p className="muted">{text('Cash contributions are recorded ledger movements, not standalone block profit. Shared costs remain separate. Messages above are engine evidence, not inferred causation.',
        'Les contributions de trésorerie sont des écritures enregistrées, pas le bénéfice autonome d’un bloc. Les coûts partagés restent séparés. Les messages proviennent du moteur; ce ne sont pas des causalités déduites.')}</p>
      <p>{text('Which constraint changed the plan? What evidence supports that explanation? Was the limitation a right, an authorization, access, equipment, stock, time or a receiving outlet?',
        'Quelle contrainte a changé le plan? Quelle preuve appuie cette explication? S’agissait-il d’un droit, d’une autorisation, de l’accès, de l’équipement, du stock, du temps ou d’un débouché?')}</p>
      <p>{text('Would another feasible plan protect service or cash differently under the same revealed conditions? What assumption would need regional evidence before using this model for real operations?',
        'Un autre plan réalisable protégerait-il différemment le service ou la trésorerie dans les mêmes conditions révélées? Quelle hypothèse exige des données régionales avant un usage réel?')}</p>
    </details>
  </section>;
}
