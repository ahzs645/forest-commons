import { useEffect, useId, useState, type ReactNode } from 'react';
import { useLanguage } from '../i18n';
import { BuckingSelect } from '../BuckingDesk';
import { setBucking } from '../simulation/bucking';
import { operatingRegion } from '../simulation/disruptions';
import { stockAt } from '../simulation/engine';
import { route, weatherAt } from '../simulation/routing';
import type { Game } from '../simulation/types';
import { appendQueueStop, editQueue, parseQueueAmount, setQueueField, type QueueKind } from './queue-editing';
import './queue-editor.css';

const fmt = (n: number) => Math.round(n).toLocaleString('en-CA');

export function QueueAmountInput({ value, maximum, kind, label, disabled, onCommit }: {
  value: number; maximum: number; kind: QueueKind; label: string; disabled: boolean; onCommit: (amount: number) => void;
}) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  const errorId = useId();
  useEffect(() => { setDraft(String(value)); setError(''); }, [value]);
  const commit = (raw: string) => {
    const amount = parseQueueAmount(raw, kind, maximum);
    if (amount === null) {
      setDraft(String(value));
      setError(language === 'fr' ? `Valeur non appliquée. Saisissez ${kind === 'truck' ? 'un nombre entier positif' : 'un nombre positif'} jusqu’à ${maximum}.`
        : `Value not applied. Enter a positive ${kind === 'truck' ? 'whole number' : 'number'} up to ${maximum}.`);
      return;
    }
    setError(''); setDraft(String(amount));
    if (amount !== value) onCommit(amount);
  };
  return <span className="map-queue-amount"><input aria-label={label} type="number" min="1" step={kind === 'crew' ? '0.5' : '1'} max={maximum}
    disabled={disabled} value={draft} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
    onChange={event => { setDraft(event.target.value); setError(''); }} onBlur={event => commit(event.target.value)}
    onKeyDown={event => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDraft(String(value)); setError(''); }
    }}/>{error && <small id={errorId} role="status">{error}</small>}</span>;
}

/** A labelled control in a desk row. On wide desks the caption moves to a
 * shared column header; it stays the control's accessible label. */
function Field({ area, label, children }: { area: string; label: string; children: ReactNode }) {
  return <label className={`queue-field queue-field-${area}`}><span className="queue-field-label">{label}</span>{children}</label>;
}

/**
 * The one crew/truck queue editor. `variant="map"` is the compact map side
 * panel (stops are picked on the map); `variant="desk"` is the Production /
 * Transport desk, which can also change each stop's site, treatment, mill,
 * assortment and partner freight, and append stops.
 */
export default function QueueEditor({ game, kind, resourceId, selected = '', onSelect, onChange, variant = 'map', addStand }: {
  game: Game; kind: QueueKind; resourceId: string; selected?: string;
  onSelect?: (id: string) => void; onChange: (game: Game) => void;
  variant?: 'map' | 'desk';
  /** Desk only: preferred site for “Add stop” (usually the selected site). */
  addStand?: string;
}) {
  const { language, t: tr } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const r = game.region;
  const resource = (kind === 'crew' ? r.crews : r.trucks).find(item => item.id === resourceId);
  const name = resource?.name ?? resourceId;
  const queue = (kind === 'crew' ? game.plan.crews : game.plan.trucks)[resourceId] ?? [];
  const done = game.week > r.weeks;
  const describe = (index: number, stand: string) => `${name}, ${text('stop', 'arrêt')} ${index + 1}, ${stand}`;
  const crewMax = (index: number) => (resource?.hours ?? 0) - (game.plan.crews[resourceId] ?? []).reduce((n, item, i) => n + (i === index ? 0 : item.hours), 0);
  const amountInput = (index: number, value: number, description: string) =>
    <QueueAmountInput label={`${description}: ${kind === 'crew' ? text('hours', 'heures') : text('loads', 'chargements')}`}
      value={value} maximum={kind === 'crew' ? crewMax(index) : 1000} kind={kind} disabled={done}
      onCommit={amount => onChange(editQueue(game, kind, resourceId, index, amount))} />;
  const actions = (index: number, description: string, compact: boolean) => <div className={compact ? 'queue-desk-actions' : 'map-queue-actions'}>
    <button disabled={done || index === 0} title={compact ? text('Earlier', 'Avant') : undefined} aria-label={text(`Move ${description} earlier`, `Avancer ${description}`)}
      onClick={() => onChange(editQueue(game, kind, resourceId, index, 'earlier'))}>{compact ? '↑' : <>↑ <span>{text('Earlier', 'Avant')}</span></>}</button>
    <button disabled={done || index === queue.length - 1} title={compact ? text('Later', 'Après') : undefined} aria-label={text(`Move ${description} later`, `Reculer ${description}`)}
      onClick={() => onChange(editQueue(game, kind, resourceId, index, 'later'))}>{compact ? '↓' : <>↓ <span>{text('Later', 'Après')}</span></>}</button>
    <button disabled={done} title={compact ? text('Remove', 'Retirer') : undefined} aria-label={text(`Remove ${description}`, `Retirer ${description}`)}
      onClick={() => onChange(editQueue(game, kind, resourceId, index, 'remove'))}>{compact ? '×' : text('Remove', 'Retirer')}</button>
  </div>;
  const amountHint = text('Press Enter or leave the number field to apply it. Escape restores its saved value.', 'Appuyez sur Entrée ou quittez le champ numérique pour l’appliquer. Échap rétablit la valeur enregistrée.');

  if (variant === 'map') return <div className="map-queue-editor">
    {!queue.length && <p className="muted">{text('No stand orders. Select this resource, then a site to add a stop.', 'Aucun ordre de chantier. Choisissez cette ressource, puis un chantier pour ajouter un arrêt.')}</p>}
    <ol aria-label={text(`${name} queue`, `File de ${name}`)}>
      {queue.map((order, index) => {
        const description = describe(index, order.stand);
        return <li key={`${index}-${order.stand}`}>
          <div className="map-queue-stop"><span className="map-queue-number" aria-hidden="true">{index + 1}</span>
            <button aria-pressed={selected === order.stand} onClick={() => onSelect?.(order.stand)}>{order.stand}{'mill' in order ? ` → ${order.mill}` : ''}</button>
          </div>
          {'product' in order && <small>{tr(r.products.find(product => product.id === order.product)?.name ?? order.product)}</small>}
          <label>{'hours' in order ? text('Hours', 'Heures') : text('Loads', 'Chargements')}
            {amountInput(index, 'hours' in order ? order.hours : order.loads, description)}
          </label>
          {kind === 'crew' && <BuckingSelect game={game} crew={resourceId} index={index} onChange={onChange} />}
          {actions(index, description, false)}
        </li>;
      })}
    </ol>
    {!!queue.length && <><p className="muted">{text('Stop order includes travel. Forecast results update as you edit; rehearse before running the turn.', 'L’ordre des arrêts inclut les déplacements. Les prévisions suivent vos modifications; répétez le plan avant d’exécuter le tour.')}</p>
      <p className="muted">{amountHint}</p></>}
  </div>;

  // Desk variant.
  const sites = r.stands.filter(s => game.stands.find(t => t.id === s.id)?.owned);
  const siteOptions = sites.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>);
  const forecast = kind === 'truck' ? weatherAt(game, true) : undefined;
  const network = kind === 'truck' ? operatingRegion(game) : undefined;
  const partnerJobs = r.partnerJobs ?? [];
  const siteLabel = tr(kind === 'crew' ? 'Area' : 'Source');
  const columns = kind === 'crew'
    ? [siteLabel, tr('Bucking recovery'), tr('Treatment'), tr('Hours')]
    : [siteLabel, tr('Mill'), tr('Assortment'), tr('Loads')];
  return <div className={`queue-desk queue-desk-${kind}`}>
    {!queue.length && <p className="muted">{kind === 'crew'
      ? text('No stops queued. Add a stop, or choose a site on the map.', 'Aucun arrêt planifié. Ajoutez un arrêt ou choisissez un chantier sur la carte.')
      : text('No haul orders queued. Add a haul order, or choose a site on the map.', 'Aucun ordre de transport. Ajoutez-en un ou choisissez un chantier sur la carte.')}</p>}
    {!!queue.length && <div className="queue-desk-grid queue-desk-head" aria-hidden="true">
      <span>#</span>{columns.map(column => <span key={column}>{column}</span>)}<span className="queue-desk-head-actions">{text('Order', 'Ordre')}</span>
    </div>}
    <ol aria-label={text(`${name} queue`, `File de ${name}`)}>
      {queue.map((order, index) => {
        const description = describe(index, order.stand);
        const number = <span className="map-queue-number" aria-hidden="true">{index + 1}</span>;
        const site = <Field area="site" label={siteLabel}>
          <select aria-label={`${description}: ${siteLabel}`} disabled={done} value={order.stand}
            onChange={e => onChange(kind === 'crew' ? setQueueField(game, 'crew', resourceId, index, { stand: e.target.value }) : setQueueField(game, 'truck', resourceId, index, { stand: e.target.value }))}>
            {!sites.some(s => s.id === order.stand) && <option value={order.stand}>{order.stand}</option>}
            {siteOptions}
          </select>
        </Field>;
        if ('hours' in order) {
          const treatments = Object.entries(r.treatments ?? { final: { name: 'Final harvest' } });
          return <li key={index} className="queue-desk-grid queue-desk-row">
            {number}{site}
            <Field area="a" label={tr('Bucking recovery')}>
              <select aria-label={`${resourceId} ${tr('Stop')} ${index + 1} ${tr('Bucking')}`} disabled={done} value={order.bucking ?? 'standard'}
                onChange={e => onChange(setBucking(game, resourceId, index, e.target.value))}>
                <option value="standard">{tr('Standard recovery')}</option>
                {Object.entries(r.buckingProfiles ?? {}).map(([id, profile]) => <option key={id} value={id}>{tr(profile.name)}</option>)}
              </select>
            </Field>
            <Field area="b" label={tr('Treatment')}>
              <select aria-label={`${name} ${tr('stop')} ${index + 1} ${tr('treatment')}`} disabled={done} value={order.treatment ?? 'final'}
                onChange={e => onChange(setQueueField(game, 'crew', resourceId, index, { treatment: e.target.value }))}>
                {treatments.map(([id, treatment]) => <option key={id} value={id}>{tr(treatment.name)}</option>)}
              </select>
            </Field>
            <Field area="amount" label={tr('Hours')}>{amountInput(index, order.hours, description)}</Field>
            {actions(index, description, true)}
          </li>;
        }
        const stand = r.stands.find(s => s.id === order.stand), mill = r.mills.find(m => m.id === order.mill);
        const path = stand && mill && network && forecast ? route(network, stand.node, mill.node, forecast, game.improvedRoads) : null;
        const fixed = !!order.offtake || !!order.spot || !!order.process;
        const showPartner = partnerJobs.length > 0 && (game.cooperation.pooling || !!order.partnerJob);
        return <li key={index} className={`queue-desk-grid queue-desk-row${showPartner ? ' has-partner' : ''}`}>
          {number}{site}
          <Field area="a" label={tr('Mill')}>
            <select aria-label={`${description}: ${tr('Mill')}`} disabled={done || fixed} value={order.mill}
              onChange={e => onChange(setQueueField(game, 'truck', resourceId, index, { mill: e.target.value }))}>
              {r.mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field area="b" label={tr('Assortment')}>
            <select aria-label={`${description}: ${tr('Assortment')}`} disabled={done || fixed} value={order.product}
              onChange={e => onChange(setQueueField(game, 'truck', resourceId, index, { product: e.target.value }))}>
              {r.products.filter(p => !mill || p.id in mill.prices).map(p => <option key={p.id} value={p.id}>{tr(p.name)}</option>)}
            </select>
          </Field>
          <Field area="amount" label={tr('Loads')}>{amountInput(index, order.loads, description)}</Field>
          {actions(index, description, true)}
          {showPartner && <Field area="partner" label={tr('Partner freight en route')}>
            <select aria-label={`${name} ${tr('haul')} ${index + 1} ${tr('partner job')}`} disabled={done || !game.cooperation.pooling} value={order.partnerJob ?? ''}
              onChange={e => onChange(setQueueField(game, 'truck', resourceId, index, { partnerJob: e.target.value || undefined }))}>
              <option value="">{tr('Own timber only')}</option>
              {partnerJobs.map(job => <option key={job.id} value={job.id}>{job.id} · {job.company} · {fmt(job.volume - (game.partnerDelivered?.[job.id] ?? 0))} {tr('m³ remaining')}</option>)}
            </select>
          </Field>}
          <small className="queue-desk-meta">
            {order.offtake && <strong>{tr('Partner contract ·')} {order.offtake}</strong>}
            {order.spot && <strong>{tr('Spot sale · no monthly commitment credit')}</strong>}
            {order.process && <strong>{tr('Mill inventory intake · no log sales revenue')}</strong>}
            <span>{path ? `${fmt(path.km)} ${tr('km loaded')} · ${path.hours.toFixed(1)} ${tr('h one way')}` : tr('No open forecast route')}{' '}
              {tr('· current stock')} {fmt(stockAt(game, order.stand)[order.product] ?? 0)} m³</span>
          </small>
        </li>;
      })}
    </ol>
    <div className="queue-desk-footer page-actions">
      <button disabled={done} onClick={() => onChange(appendQueueStop(game, kind, resourceId, addStand))}>{tr(kind === 'crew' ? '+ Add stop' : '+ Add haul order')}</button>
      {!!queue.length && <small className="muted">{amountHint}</small>}
    </div>
  </div>;
}
