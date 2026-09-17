import { useEffect, useMemo, useState } from 'react';
import type { Game, RegionDefinition } from '../simulation/types';
import { useLanguage } from '../i18n';
import { planExceptions } from '../simulation/operational-readiness';

export function ConnectivityNotice() {
  const { language } = useLanguage();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (online) return null;
  return <div className="operating-connectivity" role="status">{language === 'fr'
    ? 'Le navigateur signale une déconnexion. Utilisez la liste et le plan déjà chargés; le fond de carte peut manquer. Les brouillons de classe ne sont pas nécessairement soumis.'
    : 'The browser reports no connection. Use the loaded list and plan; basemap imagery may be unavailable. A classroom draft is not necessarily submitted.'}</div>;
}

export function OperationsStatus({ game, onNavigate, onSelect }: {
  game: Game; onNavigate: (page: string) => void; onSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const findings = useMemo(() => planExceptions(game), [game]);
  return <section className="operating-status-strip" aria-label={text('Turn decisions', 'Décisions du tour')}>
    <div><strong>{game.region.operations ? text('BC operating lesson', 'Leçon d’opérations en C.-B.') : text('This turn', 'Ce tour')}</strong>
      <span>{findings.length ? `${findings.length} ${text('findings to review', 'constats à examiner')}` : text('Build a plan, then rehearse it', 'Créer un plan, puis le simuler')}</span></div>
    <button onClick={() => onNavigate('Planning desk')}>{text('Review plan', 'Examiner le plan')}</button>
    {findings[0] && game.region.stands.some(s => s.id === findings[0].subject) &&
      <button onClick={() => onSelect(findings[0].subject)}>{text('Inspect', 'Inspecter')} {findings[0].subject}</button>}
    {game.region.operations && <span className="operating-badge">{text('Illustrative · not calibrated', 'Pédagogique · non étalonné')}</span>}
  </section>;
}

export function MobileOperationsNav({ page, onNavigate, onMenu }: {
  page: string; onNavigate: (page: string) => void; onMenu: () => void;
}) {
  const { language } = useLanguage();
  const active = page === 'Overview' ? 'map' : ['Planning desk', 'Production', 'Transport', 'Commitments', 'Forest & timber'].includes(page) ? 'plan' : page === 'Reports' ? 'results' : 'more';
  return <nav className="mobile-operations-nav" aria-label={language === 'fr' ? 'Navigation des opérations' : 'Operations navigation'}>
    <button aria-current={active === 'map' ? 'page' : undefined} onClick={() => onNavigate('Overview')}>{language === 'fr' ? 'Carte' : 'Map'}</button>
    <button aria-current={active === 'plan' ? 'page' : undefined} onClick={() => onNavigate('Planning desk')}>Plan</button>
    <button aria-current={active === 'results' ? 'page' : undefined} onClick={() => onNavigate('Reports')}>{language === 'fr' ? 'Résultats' : 'Results'}</button>
    <button aria-current={active === 'more' ? 'page' : undefined} onClick={onMenu}>{language === 'fr' ? 'Plus' : 'More'}</button>
  </nav>;
}

export function LessonLauncher({ regions, onChoose, welcome = false, onDismiss }: {
  regions: RegionDefinition[]; onChoose: (region: RegionDefinition) => void; welcome?: boolean; onDismiss?: () => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  return <section className="panel operating-lesson-launcher">
    <div className="section-heading"><h2>{welcome ? text('Choose your starting case', 'Choisir un cas de départ') : text('Teaching cases', 'Cas pédagogiques')}</h2>
      {onDismiss && <button onClick={onDismiss}>{text('Continue current case', 'Continuer le cas actuel')}</button>}</div>
    <p>{text('Select a lesson or full regional scenario. You will review and confirm before the current campaign is replaced.',
      'Choisir une leçon ou un scénario régional complet. Un examen et une confirmation précèdent le remplacement de la campagne.')}</p>
    <div className="operating-lesson-cards">{regions.map(region => <article key={region.id}>
      <h3>{region.name}</h3><p>{region.operations ? text('Guided case: ten contrasting sites, compatible equipment, load constraints and a focused decision loop.',
        'Cas guidé : dix sites différents, équipement compatible, contraintes de chargement et décisions ciblées.') : text('Full existing regional scenario, with its original mechanics and coefficients.',
        'Scénario régional complet existant, avec ses mécanismes et coefficients d’origine.')}</p>
      <p>{region.stands.length} {text('sites', 'sites')} · {region.crews.length} {text('crews', 'équipes')} · {region.trucks.length} {text('trucks', 'camions')}</p>
      <button onClick={() => onChoose(region)}>{text('Review this case', 'Examiner ce cas')}</button>
    </article>)}</div>
  </section>;
}
