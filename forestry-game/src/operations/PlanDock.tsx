import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';
export default function PlanDock({ game, selected, onSelect, onNavigate }: {
  game: Game; selected: string; onSelect: (id: string) => void; onNavigate: (page: string) => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const count = Object.values(game.plan.crews).reduce((n, q) => n + q.length, 0) +
    Object.values(game.plan.trucks).reduce((n, q) => n + q.length, 0);
  return <>
    <button className="operating-plan-link" onClick={() => onNavigate('Planning desk')}>
      {text('Current plan queue', 'File du plan actuel')} · {count} {text('orders', 'ordres')} →
    </button>
    <details className="operating-plan-dock">
    <summary>{text('Current plan queue', 'File du plan actuel')} · {count} {text('orders', 'ordres')}</summary>
    <p className="muted">{text('Queue order is not a simulated arrival time. Select a stop to inspect it; use the production calendar for scheduled weeks.',
      'L’ordre de la file n’est pas une heure d’arrivée simulée. Sélectionner un arrêt pour l’inspecter; utiliser le calendrier de production pour les semaines planifiées.')}</p>
    <div className="operating-dock-resources">
      {game.region.crews.map(crew => <article key={crew.id}><strong>{crew.name}</strong>
        <ol>{(game.plan.crews[crew.id] ?? []).map((order, i) => <li key={i}><button aria-pressed={selected === order.stand} onClick={() => onSelect(order.stand)}>
          {order.stand} · {order.hours.toFixed(1)} h · {order.treatment ?? 'final'}</button></li>)}</ol>
        {!game.plan.crews[crew.id]?.length && <span>{text('Unassigned', 'Non affecté')}</span>}
      </article>)}
      {game.region.trucks.map(truck => <article key={truck.id}><strong>{truck.name}</strong>
        <ol>{(game.plan.trucks[truck.id] ?? []).map((order, i) => <li key={i}><button aria-pressed={selected === order.stand} onClick={() => onSelect(order.stand)}>
          {order.stand} → {order.mill} · {order.loads} {text('loads', 'chargements')} · {order.product}</button></li>)}</ol>
        {!game.plan.trucks[truck.id]?.length && <span>{text('Unassigned', 'Non affecté')}</span>}
      </article>)}
    </div><button onClick={() => onNavigate('Production')}>{text('Open production calendar', 'Ouvrir le calendrier de production')}</button>
    <button onClick={() => onNavigate('Transport')}>{text('Edit dispatch', 'Modifier le transport')}</button>
  </details>
  </>;
}
