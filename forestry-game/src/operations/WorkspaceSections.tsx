import { useLanguage } from '../i18n';
import './workspace-sections.css';

const sections: Record<string, readonly (readonly [string, string, string])[]> = {
  'Planning desk': [['review', 'This turn', 'Ce tour'], ['commitments', 'Mill commitments', 'Engagements des usines'], ['alternatives', 'Compare plans', 'Comparer les plans'], ['analysis', 'Analysis & tools', 'Analyse et outils']],
  Production: [['queues', 'Crew queues', 'Files des équipes'], ['calendar', 'Season calendar', 'Calendrier de saison'], ['tools', 'Site finder & tools', 'Sites et outils']],
  Transport: [['dispatch', 'Truck dispatch', 'Transport par camion'], ['tools', 'Contracts & tools', 'Contrats et outils']],
  Reports: [['summary', 'Outcome', 'Bilan'], ['replay', 'Routes & record', 'Trajets et registre'], ['charts', 'Charts', 'Graphiques'], ['compare', 'Forest changes', 'Évolution de la forêt'], ['reflection', 'Lessons', 'Leçons']],
  Stewardship: [['annual', 'Annual forest', 'Forêt annuelle'], ['seasons', 'Operating seasons', 'Saisons opérationnelles']],
  'Forest & timber': [['lot', 'Selected lot', 'Lot choisi'], ['inventory', 'Supply inventory', 'Inventaire'], ['appraisal', 'Appraisal & bids', 'Évaluation et offres'], ['experiments', 'Bidding experiment', 'Expérience d’enchères']],
  'Scenario studio': [['cases', 'Teaching cases', 'Cas pédagogiques'], ['custom', 'Custom scenario', 'Scénario personnalisé'], ['guide', 'Field guide & sources', 'Guide et sources']],
  Collaboration: [['negotiation', 'Negotiation board', 'Tableau de négociation'], ['allocation', 'Allocation lab', 'Laboratoire de répartition'], ['dispatch', 'Operating agreements', 'Accords opérationnels'], ['exercises', 'More exercises', 'Autres exercices']],
};

export function defaultWorkspaceSection(page: string) { return sections[page]?.[0][0] ?? ''; }

export default function WorkspaceSections({ page, value, onChange }: {
  page: string; value: string; onChange: (value: string) => void;
}) {
  const { language } = useLanguage();
  const choices = sections[page];
  if (!choices) return null;
  return <nav className="workspace-sections" aria-label={language === 'fr' ? 'Sections de cet espace' : 'Workspace sections'}>
    {choices.map(([id, en, fr]) => <button key={id} aria-current={value === id ? 'page' : undefined}
      onClick={() => onChange(id)}>{language === 'fr' ? fr : en}</button>)}
  </nav>;
}

export function ResourcePicker({ resources, selected, onSelect, kind, counts }: {
  resources: {id: string; name: string}[]; selected: string; onSelect: (id: string) => void;
  kind: 'crew' | 'truck'; counts: Record<string, number>;
}) {
  const { language } = useLanguage();
  const label = language === 'fr' ? (kind === 'crew' ? 'Équipe à modifier' : 'Camion à modifier') : (kind === 'crew' ? 'Crew to edit' : 'Truck to edit');
  return <div className="workspace-resource-picker">
    <label>{label}<select aria-label={label} value={selected} onChange={e => onSelect(e.target.value)}>
      {resources.map(r => <option key={r.id} value={r.id}>{r.name} · {counts[r.id] ?? 0} {language === 'fr' ? 'ordres' : 'orders'}</option>)}
    </select></label>
    <span>{language === 'fr' ? 'Choisir une ressource pour modifier sa file. La carte présente le plan complet.' : 'Choose one resource to edit its queue. The map shows the complete plan.'}</span>
  </div>;
}
