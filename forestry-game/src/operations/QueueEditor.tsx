import { useEffect, useId, useState } from 'react';
import { useLanguage } from '../i18n';
import { BuckingSelect } from '../BuckingDesk';
import type { Game } from '../simulation/types';
import { editQueue, parseQueueAmount, type QueueKind } from './queue-editing';
import './queue-editor.css';

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

export default function QueueEditor({ game, kind, resourceId, selected, onSelect, onChange }: {
  game: Game; kind: QueueKind; resourceId: string; selected: string;
  onSelect: (id: string) => void; onChange: (game: Game) => void;
}) {
  const { language, t: tr } = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const resource = (kind === 'crew' ? game.region.crews : game.region.trucks).find(item => item.id === resourceId);
  const queue = (kind === 'crew' ? game.plan.crews : game.plan.trucks)[resourceId] ?? [];
  const done = game.week > game.region.weeks;
  return <div className="map-queue-editor">
    {!queue.length && <p className="muted">{text('No stand orders. Select this resource, then a site to add a stop.', 'Aucun ordre de chantier. Choisissez cette ressource, puis un chantier pour ajouter un arrêt.')}</p>}
    <ol aria-label={text(`${resource?.name ?? resourceId} queue`, `File de ${resource?.name ?? resourceId}`)}>
      {queue.map((order, index) => {
        const description = `${resource?.name ?? resourceId}, ${text('stop', 'arrêt')} ${index + 1}, ${order.stand}`;
        const maxHours = kind === 'crew' ? (resource?.hours ?? 0) - game.plan.crews[resourceId].reduce((n, item, i) => n + (i === index ? 0 : item.hours), 0) : 1000;
        return <li key={`${index}-${order.stand}`}>
          <div className="map-queue-stop"><span className="map-queue-number" aria-hidden="true">{index + 1}</span>
            <button aria-pressed={selected === order.stand} onClick={() => onSelect(order.stand)}>{order.stand}{'mill' in order ? ` → ${order.mill}` : ''}</button>
          </div>
          {'product' in order && <small>{tr(game.region.products.find(product => product.id === order.product)?.name ?? order.product)}</small>}
          <label>{'hours' in order ? text('Hours', 'Heures') : text('Loads', 'Chargements')}
            <QueueAmountInput label={`${description}: ${'hours' in order ? text('hours', 'heures') : text('loads', 'chargements')}`}
              value={'hours' in order ? order.hours : order.loads} maximum={maxHours} kind={kind} disabled={done}
              onCommit={amount => onChange(editQueue(game, kind, resourceId, index, amount))} />
          </label>
          {kind === 'crew' && <BuckingSelect game={game} crew={resourceId} index={index} onChange={onChange} />}
          <div className="map-queue-actions">
            <button disabled={done || index === 0} aria-label={text(`Move ${description} earlier`, `Avancer ${description}`)} onClick={() => onChange(editQueue(game, kind, resourceId, index, 'earlier'))}>↑ <span>{text('Earlier', 'Avant')}</span></button>
            <button disabled={done || index === queue.length - 1} aria-label={text(`Move ${description} later`, `Reculer ${description}`)} onClick={() => onChange(editQueue(game, kind, resourceId, index, 'later'))}>↓ <span>{text('Later', 'Après')}</span></button>
            <button disabled={done} aria-label={text(`Remove ${description}`, `Retirer ${description}`)} onClick={() => onChange(editQueue(game, kind, resourceId, index, 'remove'))}>{text('Remove', 'Retirer')}</button>
          </div>
        </li>;
      })}
    </ol>
    {!!queue.length && <><p className="muted">{text('Stop order includes travel. Forecast results update as you edit; rehearse before running the turn.', 'L’ordre des arrêts inclut les déplacements. Les prévisions suivent vos modifications; répétez le plan avant d’exécuter le tour.')}</p>
      <p className="muted">{text('Press Enter or leave the number field to apply it. Escape restores its saved value.', 'Appuyez sur Entrée ou quittez le champ numérique pour l’appliquer. Échap rétablit la valeur enregistrée.')}</p></>}
  </div>;
}
