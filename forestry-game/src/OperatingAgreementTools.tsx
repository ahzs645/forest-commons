import { useLanguage } from './i18n';
import type { Game } from './simulation/types';
import PartnerComparison from './PartnerComparison';
import TransportObligationsLab from './TransportObligationsLab';
import './negotiation-workspace.css';
import './teaching-interactive.css';
export default function OperatingAgreementTools({ game, onChange }: { game: Game; onChange: (game: Game) => void }) {
  const { t: tr, language } = useLanguage();
  const agreement = (cooperation: Game["cooperation"]) =>
    onChange({
      ...game,
      cooperation,
      plan: {
        ...game.plan,
        ready: { purchase: false, production: false, transport: false },
      },
    });
  const fr = language === 'fr';
  const closed = game.week > game.region.weeks;
  return <div className="negotiation-operating-tools">
      <section className="panel">
        <h2>{tr("Partner freight contract")}</h2>
        <p className="lab-scope" data-scope="campaign"><strong>{fr ? 'Modifie la campagne en cours' : 'Affects the current campaign'}</strong><span>{fr ? 'Ces conditions s’appliquent aux transports partenaires et au registre hebdomadaire; le plan de la semaine doit être reconfirmé.' : 'These terms apply to partner hauling and the weekly ledger; this week’s plan must be confirmed again.'}</span></p>
        <p className="lab-lead">{fr ? 'Décidez si vos camions peuvent transporter du bois partenaire et quelle part des économies de trajet mesurées vous conservez.' : 'Decide whether your trucks may carry partner freight and what share of the measured travel saving you keep.'}</p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={game.cooperation.pooling}
            disabled={closed}
            onChange={(e) =>
              agreement({ ...game.cooperation, pooling: e.target.checked })
            }
          />{" "}{" "}{tr("Enable partner freight dispatch")}{" "}</label>
        <label>{tr("Our share of measured travel savings:")}{" "}
          {Math.round(game.cooperation.partnerShare * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            disabled={closed}
            value={game.cooperation.partnerShare}
            onChange={(e) =>
              agreement({
                ...game.cooperation,
                partnerShare: Number(e.target.value),
              })
            }
          />
        </label>
        <details className="lab-more"><summary>{tr("Measure shared-route savings")}</summary><PartnerComparison game={game}/></details>
        <details className="lab-more"><summary>{fr ? 'Fonctionnement du contrat de transport partenaire' : 'How the partner freight contract works'}</summary>
          <p>{tr("Select explicit partner jobs on truck haul orders. A shared journey must visit the partner origin and destination before collecting your own timber; both loads consume time and the partner's finite stock is tracked separately. Payment covers added travel plus your share of measured joint savings, within the freight quote. There is no automatic empty-leg credit.")}{" "}</p>
          <p className="muted">{tr("Each payment appears in the weekly ledger. The handout allocations remain separate from this regional freight contract.")}{" "}</p>
        </details>
      </section>
      <TransportObligationsLab/></div>;
}
