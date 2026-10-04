import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Compass, ArrowRight, X } from 'lucide-react';
import type { Game } from '../simulation/types';
import { sum } from '../simulation/engine';
import { forecastOutcome } from '../simulation/planning';
import { firstDeliveryProgress, firstDeliveryRehearsalKey, firstDeliveryStorageKey,
  saveGuideMinimized, saveGuideSite } from '../simulation/first-delivery-progress';
import { reconcileGuideSession, type FirstDeliveryGuideSession } from '../simulation/first-delivery-progress';
import { useLanguage } from '../i18n';
import './first-delivery.css';

export interface FirstDeliveryGuideProps {
  game: Game;
  onNavigate: (page: string) => void;
  onSelect?: (id: string) => void;
  onDraft?: () => void;
  onReviewTurn?: () => void;
  /** Stable across turns, different for each new/imported campaign. */
  campaignKey?: string;
  /** Create once above page navigation to retain the reviewed plan and chosen site. */
  controller?: FirstDeliveryGuideController;
  compact?: boolean;
  /** Float over the map as a one-line step pill that opens into a card. */
  overlay?: boolean;
  /** Map selection, offered as the learning site while none is chosen. */
  selectedStandId?: string;
}

export interface FirstDeliveryGuideController extends FirstDeliveryGuideSession {
  chooseSite: (id: string) => void;
  toggleMinimized: () => void;
  rehearse: () => void;
}

export function useFirstDeliveryGuideController(game: Game, campaignKey?: string): FirstDeliveryGuideController {
  const scope = firstDeliveryStorageKey(game, campaignKey);
  const [stored, setStored] = useState<FirstDeliveryGuideSession>(() => reconcileGuideSession(null, game, scope));
  const session = useMemo(() => reconcileGuideSession(stored, game, scope), [stored, game, scope]);
  useEffect(() => { if (stored !== session) setStored(session); }, [stored, session]);
  return {
    ...session,
    chooseSite: id => {
      const valid = game.region.stands.some(stand => stand.id === id && stand.supply !== 'protected') ? id : '';
      saveGuideSite(scope, valid);
      setStored(current => ({ ...reconcileGuideSession(current, game, scope), standId: valid }));
    },
    toggleMinimized: () => setStored(current => {
      const next = reconcileGuideSession(current, game, scope);
      saveGuideMinimized(scope, !next.minimized);
      return { ...next, minimized: !next.minimized };
    }),
    rehearse: () => setStored(current => ({ ...reconcileGuideSession(current, game, scope),
      reviewedKey: firstDeliveryRehearsalKey(game), rehearsalOpen: true })),
  };
}

export function FirstDeliveryGuide(props: FirstDeliveryGuideProps) {
  const scope = firstDeliveryStorageKey(props.game, props.campaignKey);
  const fallback = useFirstDeliveryGuideController(props.game, props.campaignKey);
  const controller = props.controller?.scope === scope ? props.controller : fallback;
  // Remount inner state for a campaign change, including imported/new saves.
  return <CampaignGuide key={scope} {...props} controller={controller} />;
}

function CampaignGuide({ game, onNavigate, onSelect, onDraft, onReviewTurn, controller, compact, overlay, selectedStandId }: FirstDeliveryGuideProps & { controller: FirstDeliveryGuideController }) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  const { standId, reviewedKey, rehearsalOpen } = controller;
  // Over the map the pill is the minimized form, so the stored flag does not apply.
  const minimized = !overlay && controller.minimized;
  const [expanded, setExpanded] = useState(false);
  const small = compact && !expanded;
  const fingerprint = useMemo(() => firstDeliveryRehearsalKey(game), [game]);
  const rehearsal = useMemo(() => rehearsalOpen ? forecastOutcome(game) : null, [game, rehearsalOpen]);
  const progress = useMemo(() => firstDeliveryProgress(game, standId, reviewedKey === fingerprint && !!rehearsal?.report), [game, standId, reviewedKey, fingerprint, rehearsal]);
  const finished = progress.deliveredM3 > 0;
  const done = game.week > game.region.weeks;
  const toggle = controller.toggleMinimized;
  const steps = [text('Select a site', 'Choisir un site'), text('Rights & authorization', 'Droits et autorisation'),
    text('Schedule a crew', 'Planifier une équipe'), text('Schedule transport', 'Planifier le transport'),
    text('Rehearse', 'Simuler'), text('Run & review', 'Exécuter et examiner')];
  const current = finished ? 5 : Math.max(0, progress.steps.findIndex(complete => !complete));
  const navigate = (page: string) => { if (standId) onSelect?.(standId); onNavigate(page); };
  const choose = (id: string) => { controller.chooseSite(id); if (id) onSelect?.(id); };
  const runReview = () => onReviewTurn ? onReviewTurn() : navigate('Planning desk');
  const siteEvidence = standId && <p className="first-delivery-site-evidence">{standId} · {text('Learning-site delivery:', 'Livraison du site d’apprentissage :')} {' '}
    {progress.shipmentOriginsComplete ? `${number(progress.selectedDeliveredM3)} m³`
      : progress.selectedDeliveredM3 > 0 ? `${text('at least', 'au moins')} ${number(progress.selectedDeliveredM3)} m³ · ${text('some origins unrecorded', 'certaines origines non consignées')}`
      : text('Origin not fully recorded', 'Origine non entièrement consignée')}</p>;
  const compactAction = finished || done ? <button onClick={() => navigate('Reports')}>{text('Review recorded results', 'Examiner les résultats enregistrés')}</button>
    : current === 0 ? <button onClick={() => setExpanded(true)}>{text('Select a learning site', 'Choisir un site d’apprentissage')}</button>
    : current === 1 ? <button onClick={() => navigate('Forest & timber')}>{text('Review rights & permits', 'Examiner les droits et permis')}</button>
    : current === 2 ? <button onClick={() => navigate('Production')}>{text('Schedule production', 'Planifier la production')}</button>
    : current === 3 ? <button onClick={() => navigate('Transport')}>{text('Schedule transport', 'Planifier le transport')}</button>
    : current === 4 ? <button onClick={controller.rehearse}>{text('Rehearse this plan', 'Simuler ce plan')}</button>
    : <button className="primary" onClick={runReview}>{text('Review & run turn', 'Examiner et exécuter le tour')}</button>;

  const selectable = selectedStandId && game.region.stands.some(s => s.id === selectedStandId && s.supply !== 'protected') ? selectedStandId : '';
  if (overlay && !expanded) return <section className="first-delivery-guide map-guide-pill" aria-label={text('First delivery guide', 'Guide de la première livraison')}>
    <button className="map-guide-toggle" aria-expanded={false} onClick={() => setExpanded(true)}>
      <Compass size={16} aria-hidden="true" />
      <span>{finished ? text('First delivery recorded', 'Première livraison enregistrée')
        : `${text('Step', 'Étape')} ${current + 1}/6 · ${steps[current]}`}</span>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
  </section>;

  return <section className={`first-delivery-guide${overlay ? ' map-guide-card' : ''}${minimized ? ' is-minimized' : ''}${small ? ' is-compact' : ''}`} aria-label={text('First delivery guide', 'Guide de la première livraison')}>
    <div className="first-delivery-heading">
      <Compass size={20} aria-hidden="true" />
      <div><strong>{finished ? text('First delivery recorded', 'Première livraison enregistrée') : text('Your first delivery', 'Votre première livraison')}</strong>
        <span>{finished ? `${number(progress.deliveredM3)} m³ ${text('delivered across this campaign', 'livrés dans cette campagne')}` : small && standId
          ? `${standId} · ${text('Step', 'Étape')} ${current + 1}/6 · ${steps[current]}`
          : text('One site. One operating cycle. Learn by doing.', 'Un site. Un cycle opérationnel. Apprendre en pratiquant.')}</span></div>
      {overlay ? <button className="first-delivery-toggle" onClick={() => setExpanded(false)} aria-expanded aria-label={text('Hide guide', 'Masquer le guide')}>
        <X size={18} aria-hidden="true" />
      </button> : <button className="first-delivery-toggle" onClick={toggle} aria-expanded={!minimized}>
        {minimized ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
        {minimized ? text('Open guide', 'Ouvrir le guide') : text('Minimize', 'Réduire')}
      </button>}
    </div>
    {!minimized && small ? <div className="first-delivery-compact-content">
      <div>{finished && siteEvidence}{!finished && current === 3 && <p>{text('Production creates roadside stock. Transport records delivery.', 'La production crée du stock en bord de route. Le transport consigne la livraison.')}</p>}
        {rehearsal?.report && !finished && <p role="status">{text('Forecast only:', 'Prévision seulement :')} {number(sum(rehearsal.report.delivered))} m³ · {game.region.currency} {number(rehearsal.report.cash)}</p>}</div>
      <div className="button-row">{compactAction}<button onClick={() => setExpanded(true)}>{text('Expand guide', 'Développer le guide')}</button></div>
    </div> : !minimized && <>
      {compact && !overlay && <button className="first-delivery-collapse" onClick={() => setExpanded(false)}>{text('Compact guide', 'Guide compact')}</button>}
      {!finished && <ol className="first-delivery-steps">{steps.map((label, i) => <li key={label} data-complete={progress.steps[i]} aria-current={i === current ? 'step' : undefined}>
        <span>{progress.steps[i] ? <Check size={13} aria-label={text('Complete', 'Terminé')} /> : i + 1}</span>{label}
      </li>)}</ol>}
      <div className="first-delivery-content">
        {finished ? <>{siteEvidence}<p>{done ? text('Compare the recorded deliveries, costs and constraints with your expectations to prepare your next campaign.', 'Comparer les livraisons, les coûts et les contraintes enregistrés à vos attentes pour préparer votre prochaine campagne.')
          : text('Compare the recorded deliveries, costs and constraints with your expectations before planning the next turn.', 'Comparer les livraisons, les coûts et les contraintes enregistrés à vos attentes avant de planifier le prochain tour.')}</p>
          <button className="primary" onClick={() => navigate('Reports')}>{text('Review recorded results', 'Examiner les résultats enregistrés')} <ArrowRight size={15} aria-hidden="true" /></button></>
        : done ? <><p>{text('This campaign has ended. Review the recorded results or choose another teaching case.', 'Cette campagne est terminée. Examiner les résultats enregistrés ou choisir un autre cas pédagogique.')}</p><button onClick={() => navigate('Reports')}>{text('Review results', 'Examiner les résultats')}</button></>
        : <>
          <label className="first-delivery-site">{text('Learning site', 'Site d’apprentissage')}
            <select aria-label={text('Learning site', 'Site d’apprentissage')} value={standId} onChange={event => choose(event.target.value)}>
              <option value="">{text('Choose a site to follow…', 'Choisir un site à suivre…')}</option>
              {game.region.stands.filter(s => s.supply !== 'protected').map(s => <option key={s.id} value={s.id}>{s.id} · {t(s.name)}</option>)}
            </select>
          </label>
          {overlay && !standId && selectable && <button className="primary" onClick={() => choose(selectable)}>{text('Follow', 'Suivre')} {selectable}</button>}
          {current === 0 && <p>{text('Start on the map: inspect the inventory, terrain and product mix. Follow one site through the existing lesson rather than scheduling the whole fleet at once.', 'Commencer sur la carte : examiner l’inventaire, le terrain et les produits. Suivre un site dans la leçon existante avant de planifier toute la flotte.')}</p>}
          {current === 1 && <><p>{progress.secured
            ? text('Timber rights are secured. Harvest authorization still needs attention; ownership alone does not authorize harvest.', 'Les droits sur le bois sont acquis. L’autorisation de récolte nécessite une intervention; la propriété seule n’autorise pas la récolte.')
            : text('Secure this timber through its purchase or auction process, then check harvest and road authorizations. An auction bid is not an award.', 'Acquérir ce bois par achat ou enchère, puis vérifier les autorisations de récolte et de route. Une offre aux enchères n’est pas une adjudication.')}</p>
            {progress.authorizationProblem && <p className="first-delivery-note">{t(progress.authorizationProblem)}</p>}
            <button onClick={() => navigate('Forest & timber')}>{text('Review rights & permits', 'Examiner les droits et permis')}</button></>}
          {current === 2 && <><p>{progress.crewScheduled
            ? text('A crew stop is scheduled, but forecast readiness is blocked. Check compatible equipment, treatment, access and assigned hours.', 'Un arrêt d’équipe est planifié, mais la préparation prévisionnelle est bloquée. Vérifier l’équipement, le traitement, l’accès et les heures.')
            : text('Add this site to a compatible crew queue with positive hours. Production creates roadside stock; it is not a delivery.', 'Ajouter ce site à une file d’équipe compatible avec des heures positives. La production crée du stock en bord de route; ce n’est pas une livraison.')}</p>
            <button onClick={() => navigate('Production')}>{text('Schedule production', 'Planifier la production')}</button></>}
          {current === 3 && <><p>{progress.truckScheduled
            ? text('A haul stop is scheduled, but forecast readiness is blocked. Review the receiving product, route and timber rights.', 'Un arrêt de transport est planifié, mais la préparation prévisionnelle est bloquée. Examiner le produit reçu, la route et les droits sur le bois.')
            : text('Add a truck stop from this site to a mill that accepts the product. Check loads, route access and remaining intake.', 'Ajouter un arrêt de camion entre ce site et une usine qui accepte le produit. Vérifier les chargements, l’accès et la capacité restante.')}</p>
            {progress.roadsideM3 > 0 && <p className="first-delivery-note">{number(progress.roadsideM3)} m³ {text('already roadside; a new crew stop is optional.', 'déjà en bord de route; un nouvel arrêt d’équipe est facultatif.')}</p>}
            <button onClick={() => navigate('Transport')}>{text('Schedule transport', 'Planifier le transport')}</button></>}
          {current >= 4 && <><p>{text('Rehearse your current plan, inspect expected deliveries and cash, then review and run the turn from the Planning desk. Only recorded results confirm a delivery.', 'Simuler le plan actuel, examiner les livraisons et la trésorerie prévues, puis examiner et exécuter le tour depuis la planification. Seuls les résultats enregistrés confirment une livraison.')}</p>
            <div className="button-row"><button onClick={controller.rehearse}>{text('Rehearse this plan', 'Simuler ce plan')}</button>
              {progress.steps[4] && <button className="primary" onClick={runReview}>{text('Review & run turn', 'Examiner et exécuter le tour')}</button>}</div></>}
          {rehearsalOpen && rehearsal && <div className="first-delivery-rehearsal" role="status">{rehearsal.report
            ? <><strong>{text('Forecast only', 'Prévision seulement')}</strong><p>{number(sum(rehearsal.report.delivered))} m³ {text('expected deliveries', 'de livraisons prévues')} · {game.region.currency} {number(rehearsal.report.cash)} {text('closing cash', 'de trésorerie finale')}</p>
              {sum(rehearsal.report.delivered) <= 0 && <p>{text('This plan forecasts no deliveries. Review queues and engine messages before running it.', 'Ce plan ne prévoit aucune livraison. Examiner les files et les messages du moteur avant de l’exécuter.')}</p>}
              <p>{text('Published weather and revealed events are used; auction awards and actual outcomes remain uncertain.', 'La météo publiée et les événements révélés sont utilisés; les adjudications et les résultats réels restent incertains.')}</p></>
            : <p>{text('Rehearsal unavailable:', 'Simulation indisponible :')} {rehearsal.problems.map(t).join(' ')}</p>}</div>}
          {onDraft && <details className="first-delivery-help"><summary>{text('Need a starting plan?', 'Besoin d’un plan de départ?')}</summary>
            <p>{text('Review an automatic proposal, compare it with your current queues, and choose whether to apply it.', 'Examiner une proposition automatique, la comparer aux files actuelles et choisir de l’appliquer ou non.')}</p><button onClick={onDraft}>{text('Review a draft proposal', 'Examiner un brouillon')}</button></details>}
        </>}
      </div>
    </>}
  </section>;
}
