import { useMemo } from 'react';
import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';
import { selectedLotStatus } from '../simulation/selected-lot-status';
import './selected-lot-status.css';

export default function SelectedLotStatus({ game, standId, onReviewPermits }: {
  game: Game; standId: string; onReviewPermits?: (standId: string) => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const status = useMemo(() => selectedLotStatus(game, standId), [game, standId]);
  if (!status) return null;
  const rights = {
    secured: text('Secured in this case', 'Acquis dans ce cas'),
    unsecured: text('Not secured', 'Non acquis'),
    refused: text('Declined in this case', 'Refusés dans ce cas'),
    protected: text('Protected teaching area', 'Zone pédagogique protégée'),
  }[status.rights];
  const harvest = {
    active: text('Active in this case', 'Active dans ce cas'),
    unmodelled: text('No separate permit model', 'Aucun modèle distinct de permis'),
    prohibited: text('Harvest prohibited', 'Récolte interdite'),
    required: text('Application required', 'Demande requise'),
    expired: text('Expired · renewal required', 'Expirée · renouvellement requis'),
    pending: text(`Pending until turn ${status.approvalTurn ?? '?'}`, `En attente jusqu’au tour ${status.approvalTurn ?? '?'}`),
  }[status.harvest];
  return <section className="selected-lot-status" aria-label={text(`Selected lot status · ${standId}`, `État du lot sélectionné · ${standId}`)}>
    <div className="selected-lot-status-heading"><strong>{standId} · {text('Rights, permits & access', 'Droits, permis et accès')}</strong>
      {game.region.bcTenure && onReviewPermits && <button type="button" onClick={() => onReviewPermits(standId)}>
        {text('Review this lot’s permits', 'Examiner les permis de ce lot')}
      </button>}</div>
    <dl>
      <div data-status={status.rights === 'secured' ? 'ready' : 'blocked'}><dt>{text('Timber rights', 'Droits sur le bois')}</dt><dd>{rights}</dd></div>
      <div data-status={status.harvest === 'active' ? 'ready' : status.harvest === 'unmodelled' ? 'context' : 'blocked'}><dt>{text('Harvest authorization', 'Autorisation de récolte')}</dt><dd>{harvest}</dd></div>
      {game.region.bcTenure && <div data-status={status.siteRoadAuthority === 'active' ? 'ready' : status.siteRoadAuthority === 'blocked' ? 'blocked' : 'context'}>
        <dt>{text('Site access-road authority', 'Autorisation de la route d’accès au site')}</dt><dd>{status.siteRoadAuthority === 'active'
          ? text('Active in this case', 'Active dans ce cas') : status.siteRoadAuthority === 'blocked'
            ? text('Permission needs attention', 'Autorisation à vérifier') : text('Not separately modelled here', 'Non modélisée séparément ici')}</dd>
      </div>}
      <div data-status={status.terrain === 'open' ? 'ready' : status.terrain === 'closed' ? 'blocked' : 'context'}><dt>{text('Forecast site access', 'Accès au site selon les prévisions')}</dt><dd>{status.terrain === 'complete'
        ? text('Season complete', 'Saison terminée') : status.terrain === 'open' ? text('Open operating window', 'Fenêtre opérationnelle ouverte') : text('Closed operating window', 'Fenêtre opérationnelle fermée')}</dd></div>
    </dl>
    <p>{text('Separate checks in a teaching simulation. Site-road permission does not establish a complete route. Rehearse to check equipment, closures, stock and receiving capacity.',
      'Vérifications distinctes dans une simulation pédagogique. L’autorisation de la route du site ne garantit pas un itinéraire complet. Simuler pour vérifier les équipements, les fermetures, les stocks et la capacité de réception.')}</p>
  </section>;
}
