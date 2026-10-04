import { useMemo } from 'react';
import type { Game } from '../simulation/types';
import { useLanguage } from '../i18n';
import { planExceptions } from '../simulation/operational-readiness';
/** Floating plan summary on the map: queued orders, open findings and the way to the Planning desk. */
export default function PlanDock({ game, selected, onSelect, onNavigate }: {
  game: Game; selected: string; onSelect: (id: string) => void; onNavigate: (page: string) => void;
}) {
  const { language } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const done = game.week > game.region.weeks;
  const findings = useMemo(() => done ? [] : planExceptions(game), [game, done]);
  const firstFinding = findings.find(finding => game.region.stands.some(s => s.id === finding.subject));
  const count = Object.values(game.plan.crews).reduce((n, q) => n + q.length, 0) +
    Object.values(game.plan.trucks).reduce((n, q) => n + q.length, 0);
  const label = `${text('Plan', 'Plan')} · ${count} ${text('orders', 'ordres')}${findings.length ? ` · ${findings.length} ${text('to review', 'à examiner')}` : ''}`;
  if (done) return null;
  return <details className="operating-plan-dock">
    <summary>{label}</summary>
    <div className="operating-dock-body">
      {game.region.operations && <p className="operating-badge">{text('Illustrative · not calibrated', 'Pédagogique · non étalonné')}</p>}
      {count ? <div className="operating-dock-resources">
        {game.region.crews.filter(crew => game.plan.crews[crew.id]?.length).map(crew => <article key={crew.id}><strong>{crew.name}</strong>
          <ol>{game.plan.crews[crew.id].map((order, i) => <li key={i}><button aria-pressed={selected === order.stand} onClick={() => onSelect(order.stand)}>
            {order.stand} · {order.hours.toFixed(1)} h · {order.treatment ?? 'final'}</button></li>)}</ol>
        </article>)}
        {game.region.trucks.filter(truck => game.plan.trucks[truck.id]?.length).map(truck => <article key={truck.id}><strong>{truck.name}</strong>
          <ol>{game.plan.trucks[truck.id].map((order, i) => <li key={i}><button aria-pressed={selected === order.stand} onClick={() => onSelect(order.stand)}>
            {order.stand} → {order.mill} · {order.loads} {text('loads', 'chargements')} · {order.product}</button></li>)}</ol>
        </article>)}
      </div> : <p>{text('No crew or truck orders yet. Select a secured site and choose Plan harvest.', 'Aucun ordre d’équipe ou de camion. Choisir un site acquis, puis Planifier la récolte.')}</p>}
      <p className="muted">{text('Queue order is not a simulated arrival time.', 'L’ordre de la file n’est pas une heure d’arrivée simulée.')}</p>
      <div className="button-row">
        <button className="primary" onClick={() => onNavigate('Planning desk')}>{text('Review plan', 'Examiner le plan')}</button>
        {firstFinding && <button onClick={() => onSelect(firstFinding.subject)}>{text('Inspect', 'Inspecter')} {firstFinding.subject}</button>}
        <button onClick={() => onNavigate('Production')}>{text('Crews', 'Équipes')}</button>
        <button onClick={() => onNavigate('Transport')}>{text('Trucks', 'Camions')}</button>
      </div>
    </div>
  </details>;
}
