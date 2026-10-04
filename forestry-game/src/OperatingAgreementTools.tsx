import { useLanguage } from './i18n';
import type { Game } from './simulation/types';
import PartnerComparison from './PartnerComparison';
import TransportObligationsLab from './TransportObligationsLab';
import './negotiation-workspace.css';
export default function OperatingAgreementTools({ game, onChange }: { game: Game; onChange: (game: Game) => void }) {
  const { t: tr } = useLanguage();
  const agreement = (cooperation: Game["cooperation"]) =>
    onChange({
      ...game,
      cooperation,
      plan: {
        ...game.plan,
        ready: { purchase: false, production: false, transport: false },
      },
    });
  return <div className="negotiation-operating-tools"><PartnerComparison game={game}/>
      <div className="panel">
        <h3>{tr("Partner freight contract")}</h3>
        <p>{tr("Select explicit partner jobs on truck haul orders. A shared journey must visit the partner origin and destination before collecting your own timber; both loads consume time and the partner's finite stock is tracked separately. Payment covers added travel plus your share of measured joint savings, within the freight quote. There is no automatic empty-leg credit.")}{" "}</p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={game.cooperation.pooling}
            disabled={game.week > game.region.weeks}
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
            disabled={game.week > game.region.weeks}
            value={game.cooperation.partnerShare}
            onChange={(e) =>
              agreement({
                ...game.cooperation,
                partnerShare: Number(e.target.value),
              })
            }
          />
        </label>
        <p className="muted">{tr("Each payment appears in the weekly ledger. The handout allocations remain separate from this regional freight contract.")}{" "}</p>
      </div>
<TransportObligationsLab/></div>;
}
