import { useEffect, useRef, useState } from 'react';
import type { RegionDefinition } from '../simulation/types';
import { useLanguage } from '../i18n';

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

/**
 * In the narrow layouts the inspector is a sheet anchored to the bottom of the
 * map frame, so the frame has to start at the top of the viewport before the
 * sheet is reachable: the page chrome above it is taller than a phone viewport.
 * Returns false when the wide layout is active and nothing needs anchoring.
 */
export function anchorWorkbench() {
  const workbench = document.querySelector('.adaptive-map-workspace');
  const controls = workbench?.querySelector('.mobile-workspace-controls');
  if (!workbench || !controls || getComputedStyle(controls).display === 'none') return false;
  workbench.scrollIntoView({ block: 'start' });
  return true;
}

export function MobileOperationsNav({ page, onNavigate, onMenu, menuOpen = false }: {
  page: string; onNavigate: (page: string) => void; onMenu: () => void; menuOpen?: boolean;
}) {
  const { language } = useLanguage();
  const active = page === 'Overview' ? 'map' : ['Planning desk', 'Production', 'Transport', 'Forest & timber'].includes(page) ? 'plan' : page === 'Reports' ? 'results' : 'more';
  return <nav className="mobile-operations-nav" aria-label={language === 'fr' ? 'Navigation des opérations' : 'Operations navigation'}>
    <button aria-current={active === 'map' ? 'page' : undefined} onClick={() => onNavigate('Overview')}>{language === 'fr' ? 'Carte' : 'Map'}</button>
    <button aria-current={active === 'plan' ? 'page' : undefined} onClick={() => onNavigate('Planning desk')}>Plan</button>
    <button aria-current={active === 'results' ? 'page' : undefined} onClick={() => onNavigate('Reports')}>{language === 'fr' ? 'Résultats' : 'Results'}</button>
    <button aria-current={active === 'more' ? 'page' : undefined} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={onMenu}>{language === 'fr' ? 'Plus' : 'More'}</button>
  </nav>;
}

export function LessonLauncher({ regions, onChoose, welcome = false, onDismiss, titleId }: {
  regions: RegionDefinition[]; onChoose: (region: RegionDefinition) => void; welcome?: boolean; onDismiss?: () => void; titleId?: string;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  return <section className="panel operating-lesson-launcher">
    <div className="section-heading"><h2 id={titleId}>{welcome ? text('Choose your starting case', 'Choisir un cas de départ') : text('Teaching cases', 'Cas pédagogiques')}</h2>
      {onDismiss && <button onClick={onDismiss}>{text('Continue current case', 'Continuer le cas actuel')}</button>}</div>
    <p>{text('Select a lesson or full regional scenario. You will review and confirm before the current campaign is replaced.',
      'Choisir une leçon ou un scénario régional complet. Un examen et une confirmation précèdent le remplacement de la campagne.')}</p>
    <div className="operating-lesson-cards">{regions.map(region => <article key={region.id} className={region.operations ? 'first-delivery-recommended' : undefined}>
      {region.operations && <span className="first-delivery-recommendation">{text('Recommended first case', 'Premier cas recommandé')}</span>}
      <h3>{region.name}</h3><p>{region.operations ? text('Learn one complete delivery cycle: inspect a site, verify rights and authorizations, schedule compatible equipment, then compare forecast and recorded results.',
        'Apprendre un cycle complet de livraison : examiner un site, vérifier les droits et autorisations, planifier un équipement compatible, puis comparer les prévisions aux résultats enregistrés.') : text('Full existing regional scenario, with its original mechanics and coefficients.',
        'Scénario régional complet existant, avec ses mécanismes et coefficients d’origine.')}</p>
      <p>{region.stands.length} {text('sites', 'sites')} · {region.crews.length} {text('crews', 'équipes')} · {region.trucks.length} {text('trucks', 'camions')}</p>
      <button onClick={() => onChoose(region)}>{text('Review this case', 'Examiner ce cas')}</button>
    </article>)}</div>
  </section>;
}

/** First-visit case chooser, shown over the map instead of pushing it down. */
export function LessonDialog({ regions, onChoose, onDismiss }: {
  regions: RegionDefinition[]; onChoose: (region: RegionDefinition) => void; onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal?.();
    return () => node?.close?.();
  }, []);
  return <dialog ref={dialog} className="operating-lesson-dialog" aria-labelledby="lesson-dialog-title"
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <LessonLauncher regions={regions} onChoose={onChoose} onDismiss={onDismiss} welcome titleId="lesson-dialog-title" />
  </dialog>;
}
