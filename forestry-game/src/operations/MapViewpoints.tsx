import {useEffect, useId, useState} from 'react';
import {useLanguage} from '../i18n';
import {MAP_VIEWPOINT_STORAGE_KEY, MAX_MAP_VIEWPOINTS, mapViewpointScope, parseMapViewpoints, updateMapViewpoints, validMapCamera, viewpointsForScope, type MapCamera, type MapViewpoint} from '../maps/map-viewpoints';

export default function MapViewpoints({campaignKey, regionId, camera, onRecall}: {
  campaignKey: string; regionId: string; camera: MapCamera | null; onRecall: (camera: MapCamera) => void;
}) {
  const {language} = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const scope = mapViewpointScope(campaignKey, regionId), id = useId();
  const [views, setViews] = useState<MapViewpoint[]>([]), [name, setName] = useState('');
  const [notice, setNotice] = useState<'read' | 'save' | 'saved' | 'removed' | ''>('');
  useEffect(() => {
    const read = () => {
      try {setViews(viewpointsForScope(parseMapViewpoints(localStorage.getItem(MAP_VIEWPOINT_STORAGE_KEY)), scope)); setNotice('');}
      catch {setViews([]); setNotice('read');}
    };
    read(); setName('');
    const changed = (event: StorageEvent) => {if (event.key === MAP_VIEWPOINT_STORAGE_KEY || event.key === null) read();};
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [scope]);
  const persist = (change: (current: MapViewpoint[]) => MapViewpoint[], result: 'saved' | 'removed') => {
    try {
      let store;
      // A malformed view record can be replaced by an explicitly saved view.
      try {store = parseMapViewpoints(localStorage.getItem(MAP_VIEWPOINT_STORAGE_KEY));} catch {store = parseMapViewpoints(null);}
      const nextViews = change(viewpointsForScope(store, scope));
      const next = updateMapViewpoints(store, scope, nextViews, Date.now());
      localStorage.setItem(MAP_VIEWPOINT_STORAGE_KEY, JSON.stringify(next));
      setViews(viewpointsForScope(next, scope)); setNotice(result);
      if (result === 'saved') setName('');
    } catch {setNotice('save');}
  };
  const save = () => {
    if (!camera || !validMapCamera(camera) || !name.trim()) return;
    const view: MapViewpoint = {id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim().slice(0, 48), camera};
    persist(current => [...current, view], 'saved');
  };
  return <section className="map-viewpoints" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>{text('Saved map viewpoints', 'Points de vue enregistrés')}</h4>
    <p>{text('Return to a named view of this campaign’s region.', 'Revenir à un point de vue nommé de la région de cette campagne.')}</p>
    <form onSubmit={event => {event.preventDefault(); save();}} className="map-viewpoint-save">
      <label htmlFor={`${id}-name`}>{text('View name', 'Nom du point de vue')}
        <input id={`${id}-name`} maxLength={48} value={name} onChange={event => setName(event.target.value)} placeholder={text('Receiving mill', 'Usine de réception')}/>
      </label>
      <button type="submit" disabled={!camera || !validMapCamera(camera) || !name.trim() || views.length >= MAX_MAP_VIEWPOINTS}>
        {text('Save current view', 'Enregistrer la vue actuelle')}</button>
    </form>
    <p className="route-replay-note">{views.length} / {MAX_MAP_VIEWPOINTS} {text('views saved', 'vues enregistrées')}
      {views.length >= MAX_MAP_VIEWPOINTS && ` · ${text('Remove a view to save another.', 'Supprimer une vue pour en enregistrer une autre.')}`}</p>
    {!!views.length && <ul>{views.map(view => <li key={view.id}>
      <button type="button" className="map-viewpoint-open" onClick={() => onRecall(view.camera)}>{view.name}</button>
      <button type="button" aria-label={`${text('Remove view', 'Supprimer la vue')} ${view.name}`} onClick={() => persist(current => current.filter(item => item.id !== view.id), 'removed')}>×</button>
    </li>)}</ul>}
    <p role="status" className="route-replay-note">{notice === 'read' ? text('Saved viewpoints could not be read. Save a new view to begin again.', 'Les points de vue enregistrés sont illisibles. Enregistrer une nouvelle vue pour recommencer.')
      : notice === 'save' ? text('Views could not be saved in this browser. You can still explore the map.', 'Les vues ne peuvent pas être enregistrées dans ce navigateur. Vous pouvez toujours explorer la carte.')
      : notice === 'saved' ? text('View saved.', 'Vue enregistrée.') : notice === 'removed' ? text('View removed.', 'Vue supprimée.') : ''}</p>
  </section>;
}
