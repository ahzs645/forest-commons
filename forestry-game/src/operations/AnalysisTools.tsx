import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';
import PlanningDesk from '../PlanningDesk';
import RollingOptimizer from '../RollingOptimizer';
import PreSeasonDesk from '../PreSeasonDesk';
import DisruptionDesk from '../DisruptionDesk';
import TenureDesk from '../TenureDesk';
import BCMarketDesk from '../BCMarketDesk';
import LandscapeLesson from './LandscapeLesson';
import './analysis-tools.css';

export default function AnalysisTools({ game, onChange, onNavigate, onRespond, value, onSelectTask, standId }: {
  game: Game; onChange: (game: Game) => void; onNavigate: (page: string) => void;
  onRespond: (id: string, action: 'repair' | 'wait') => void; value: string; onSelectTask: (value: string) => void; standId: string;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const choices = [
    ...([
      ['supply', 'Supply gap', 'Écart d’approvisionnement'],
      ['forecast', 'Current plan forecast', 'Prévision du plan actuel'],
      ['deliverability', 'Can timber reach the mills?', 'Le bois peut-il atteindre les usines?'],
      ['season', 'Season supply outlook', 'Approvisionnement de la saison'],
      ['benchmark', 'Dispatch reference plan', 'Plan de référence du transport'],
      ['strategy', 'Harvest strategies', 'Stratégies de récolte'],
      ['objectives', 'Season challenges', 'Défis de la saison'],
    ] as const).map(([id, en, fr]) => ({ id, label: text(en, fr), content: <PlanningDesk game={game} view={id} onChange={onChange} onNavigate={onNavigate}/> })),
    { id: 'conditions', label: text('Disruptions & recovery', 'Perturbations et rétablissement'), content: (game.region.disruptions ?? []).some(event => event.revealWeek <= game.week)
      ? <DisruptionDesk game={game} onNavigate={onNavigate} onRespond={onRespond}/>
      : <section className="panel"><h2>{text('Disruptions & recovery', 'Perturbations et rétablissement')}</h2><p>{text('No disruptions have been published for this turn. Continue planning with the forecast conditions.', 'Aucune perturbation n’a été publiée pour ce tour. Continuer la planification selon les conditions prévues.')}</p></section> },
    { id: 'rolling', label: text('Rolling plan', 'Planification glissante'), content: <RollingOptimizer game={game} onChange={onChange}/> },
    { id: 'prepare', label: text('Prepare the season', 'Préparer la saison'), content: <PreSeasonDesk game={game} onChange={onChange}/> },
    ...(game.region.bcTenure ? [{ id: 'permits', label: text('Rights & permits', 'Droits et permis'), content: <TenureDesk game={game} onChange={onChange}/> }] : []),
    ...(game.region.bcMarket ? [{ id: 'market', label: text('Market assumptions', 'Hypothèses de marché'), content: <BCMarketDesk game={game}/> }] : []),
    { id: 'landscape', label: text('Landscape lesson', 'Leçon de paysage'), content: <LandscapeLesson game={game} standId={standId}/> },
  ];
  const selected = choices.find(choice => choice.id === value) ?? choices[0];
  return <section className="analysis-tools" aria-label={text('Analysis tools', 'Outils d’analyse')}>
    <div className="panel analysis-task-picker">
      <label>{text('Analysis task', 'Tâche d’analyse')}
        <select aria-label={text('Analysis task', 'Tâche d’analyse')} value={selected.id} onChange={event => onSelectTask(event.target.value)}>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select>
      </label>
      <p>{text('Choose one task. Your entered settings stay available when you switch tools. Forecasts do not advance the campaign.', 'Choisir une tâche. Les réglages saisis restent disponibles lors du changement d’outil. Les prévisions ne font pas avancer la campagne.')}</p>
    </div>
    {choices.map(choice => <div key={choice.id} className="analysis-task-panel" hidden={choice.id !== selected.id}>{choice.content}</div>)}
  </section>;
}
