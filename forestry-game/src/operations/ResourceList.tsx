import type { Game, RegionDefinition } from '../simulation/types';
import type { MapPick } from '../maps/OperationsMap';
import { useLanguage } from '../i18n';
import { EquipmentStatus } from '../OperationalSymbols';
import { millReceiptSummary } from '../simulation/mill-receipt-summary';
import { effectiveMarketRegion } from '../simulation/bc-market';
import './resource-list.css';

export type PanelMode = 'selected' | 'crews' | 'trucks' | 'mills';
export const panelModes: readonly (readonly [PanelMode, string, string])[] = [
  ['selected', 'Selected', 'Sélection'], ['crews', 'Crews', 'Équipes'], ['trucks', 'Trucks', 'Camions'], ['mills', 'Mills', 'Usines'],
];
export function modeTitle(mode: PanelMode, region: RegionDefinition, language: string) {
  const fr = language === 'fr';
  if (mode === 'crews') return `${region.crews.length} ${fr ? 'équipes de récolte' : 'harvest crews'}`;
  if (mode === 'trucks') return `${region.trucks.length} ${fr ? 'camions' : 'trucks'}`;
  return `${region.mills.length} ${fr ? 'usines' : 'mills'}`;
}

/** One row per crew, truck or mill; choosing a row inspects it on the map. */
export default function ResourceList({ game, mode, onInspect }: {
  game: Game; mode: Exclude<PanelMode, 'selected'>; onInspect: (kind: MapPick['kind'], id: string) => void;
}) {
  const { language, t } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const number = (n: number) => Math.round(n).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  const stops = (n: number) => n === 1 ? text('1 stop', '1 arrêt') : `${n} ${text('stops', 'arrêts')}`;
  const r = game.region;
  if (mode === 'crews') return <ul className="resource-list">{r.crews.map(crew => {
    const queue = game.plan.crews[crew.id] ?? [];
    const hours = queue.reduce((n, order) => n + order.hours, 0);
    return <li key={crew.id}><button onClick={() => onInspect('crew', crew.id)}>
      <span className="resource-list-name"><strong>{t(crew.name)}</strong><EquipmentStatus game={game} kind="crew" id={crew.id} /></span>
      <span>{stops(queue.length)}{queue.length ? ` · ${queue.map(order => order.stand).join(' → ')}` : ''}</span>
      <meter min={0} max={crew.hours} value={hours} aria-label={text('Hours assigned', 'Heures affectées')} />
      <small>{number(hours)} / {number(crew.hours)} h {text('assigned', 'affectées')}</small>
    </button></li>;
  })}</ul>;
  if (mode === 'trucks') return <ul className="resource-list">{r.trucks.map(truck => {
    const queue = game.plan.trucks[truck.id] ?? [];
    const loads = queue.reduce((n, order) => n + order.loads, 0);
    return <li key={truck.id}><button onClick={() => onInspect('truck', truck.id)}>
      <span className="resource-list-name"><strong>{t(truck.name)}</strong><EquipmentStatus game={game} kind="truck" id={truck.id} /></span>
      <span>{stops(queue.length)}{queue.length ? ` · ${queue.map(order => `${order.stand}→${order.mill}`).join(', ')}` : ''}</span>
      <small>{loads} {loads === 1 ? text('load', 'chargement') : text('loads', 'chargements')}</small>
    </button></li>;
  })}</ul>;
  const done = game.week > r.weeks;
  const market = { ...game, region: effectiveMarketRegion(game) };
  return <>
    <p className="resource-list-note">{done ? text('Recorded season receipts against season demand.', 'Réceptions de la saison par rapport à la demande.')
      : text('Receipts this period against period demand.', 'Réceptions de la période par rapport à la demande.')}</p>
    <ul className="resource-list">{r.mills.map(mill => {
      const rows = millReceiptSummary(market, mill.id);
      const target = rows.reduce((n, row) => n + row.target, 0), received = rows.reduce((n, row) => n + row.received, 0);
      return <li key={mill.id}><button onClick={() => onInspect('mill', mill.id)}>
        <span className="resource-list-name"><strong>{t(mill.name)}</strong></span>
        <meter min={0} max={Math.max(target, 1)} value={received} aria-label={text('Receipts', 'Réceptions')} />
        <small>{number(received)} / {number(target)} m³</small>
      </button></li>;
    })}</ul>
  </>;
}
