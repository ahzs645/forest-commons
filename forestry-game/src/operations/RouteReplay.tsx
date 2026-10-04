import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {useLanguage} from '../i18n';
import OperationsMap from '../maps/LazyMap';
import {recordedMovements, routeReplayFrame, routeReplaySegments} from '../maps/route-replay';
import {type MapCamera} from '../maps/map-viewpoints';
import MapViewpoints from './MapViewpoints';
import type {Game} from '../simulation/types';
import './route-replay.css';

export interface RouteReplayProps {
  game: Game;
  /** Defaults to the latest settled turn; negative indices also mean latest. */
  reportIndex?: number;
  onSelect?: (id: string) => void;
  campaignKey?: string;
}

export default function RouteReplay({game, reportIndex, onSelect, campaignKey}: RouteReplayProps) {
  const {language} = useLanguage();
  if (!game.history.length) return <p className="route-replay-empty">{language === 'fr'
    ? 'Exécutez un tour pour examiner les déplacements enregistrés.'
    : 'Run a turn to inspect recorded movements.'}</p>;
  const index = reportIndex === undefined || reportIndex < 0 || !Number.isFinite(reportIndex)
    ? game.history.length - 1 : Math.min(game.history.length - 1, Math.floor(reportIndex));
  // A keyed session prevents playback from continuing on a different report.
  return <ReplaySession key={`${campaignKey ?? game.seed}:${game.region.id}:${index}:${game.history[index].week}`} game={game} index={index} onSelect={onSelect} campaignKey={campaignKey}/>;
}

function ReplaySession({game, index, onSelect, campaignKey}: {game: Game; index: number; onSelect?: (id: string) => void; campaignKey?: string}) {
  const {language} = useLanguage();
  const text = (en: string, fr: string) => language === 'fr' ? fr : en;
  const report = game.history[index];
  const movements = useMemo(() => recordedMovements(report.movements), [report.movements]);
  const resources = useMemo(() => [...new Set(movements.map(movement => movement.resource))], [movements]);
  const [resource, setResource] = useState(resources[0] ?? '');
  const [selectedStand, setSelectedStand] = useState('');
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [inspectedMovement, setInspectedMovement] = useState<number | undefined>();
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [cameraRequest, setCameraRequest] = useState<{id: string; camera: MapCamera} | undefined>();
  const [follow, setFollow] = useState(false);
  const followStart = useRef<MapCamera | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const progressRef = useRef(progress);
  const id = useId();
  const frame = useMemo(() => routeReplayFrame(movements, resource, progress, inspectedMovement), [movements, resource, progress, inspectedMovement]);
  const tour = useMemo(() => routeReplaySegments(movements, resource), [movements, resource]);
  const stationaryOnly = tour.length > 0 && tour.every(segment => segment.stationary);
  const name = (resourceId: string) => game.region.crews.find(crew => crew.id === resourceId)?.name
    ?? game.region.trucks.find(truck => truck.id === resourceId)?.name ?? resourceId;
  const seek = (value: number) => {progressRef.current = value; setProgress(value);};
  const chooseResource = (value: string) => {setPlaying(false); setInspectedMovement(undefined); setResource(value); seek(0);};

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {setReducedMotion(preference.matches); if (preference.matches) {
      setPlaying(false); setFollow(false);
      if (followStart.current) {setCameraRequest({id: `${Date.now()}-${Math.random()}`, camera: followStart.current}); followStart.current = null;}
    }};
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!playing || !resource || !resources.includes(resource)) return;
    let animation = 0, previous: number | undefined;
    const advance = (timestamp: number) => {
      if (previous !== undefined) {
        // Avoid skipping an entire replay when a background tab becomes active.
        const elapsed = Math.min(timestamp - previous, 250);
        const next = Math.min(1, progressRef.current + elapsed * speed / 12000);
        progressRef.current = next;
        setProgress(next);
        if (next === 1) {setPlaying(false); return;}
      }
      previous = timestamp;
      animation = requestAnimationFrame(advance);
    };
    animation = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(animation);
  }, [playing, speed, resource, resources]);
  useEffect(() => {
    const pause = () => {if (document.hidden) setPlaying(false);};
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);

  const percent = Math.round(progress * 100);
  const nodeName = (node: string) => game.region.stands.find(item => item.node === node)?.name
    ?? game.region.mills.find(item => item.node === node)?.name ?? node;
  return <section className="route-replay" aria-labelledby={`${id}-title`}>
    <div className="route-replay-heading">
      <h3 id={`${id}-title`}>{text('Recorded route replay', 'Relecture des trajets enregistrés')} · {text('Turn', 'Tour')} {report.week}</h3>
      <p>{stationaryOnly ? text('Inspect one resource’s recorded movement order. Its recorded geometry is stationary; progression follows record order, not operating time.',
        'Examiner les déplacements enregistrés d’une ressource. Leur géométrie est stationnaire; la progression suit l’ordre des enregistrements, pas le temps d’exploitation.')
        : text('Follow one resource’s recorded movement order. Progress measures distance along its routes, not operating time or simultaneous arrivals.',
          'Suivez l’ordre des déplacements enregistrés d’une ressource. La progression mesure la distance sur ses trajets, pas le temps d’exploitation ni des arrivées simultanées.')}</p>
    </div>
    {!!resources.length && <div className="route-replay-controls">
      <label htmlFor={`${id}-resource`}>{text('Resource', 'Ressource')}
        <select id={`${id}-resource`} value={resource} onChange={event => chooseResource(event.target.value)}>
          {resources.map(resourceId => <option key={resourceId} value={resourceId}>{name(resourceId)} · {resourceId}</option>)}
        </select>
      </label>
      <div className="route-replay-actions">
        <button type="button" disabled={!frame} aria-pressed={playing} onClick={() => {
          setInspectedMovement(undefined);
          if (progressRef.current === 1) seek(0);
          setPlaying(current => !current);
        }}>{playing ? text('Pause', 'Pause') : text('Play', 'Lire')}</button>
        <button type="button" disabled={!frame} onClick={() => {setPlaying(false); setInspectedMovement(undefined); seek(0);}}>{text('Restart', 'Recommencer')}</button>
        <label htmlFor={`${id}-speed`}>{text('Playback speed', 'Vitesse de lecture')}
          <select id={`${id}-speed`} value={speed} onChange={event => setSpeed(Number(event.target.value))}>
            {[0.5, 1, 2, 4].map(value => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
      </div>
      <label className="route-replay-scrubber" htmlFor={`${id}-progress`}>
        <span>{stationaryOnly ? text('Recorded order', 'Ordre enregistré') : text('Route progression', 'Progression du trajet')} <output htmlFor={`${id}-progress`}>{percent}%</output></span>
        <input id={`${id}-progress`} type="range" min="0" max="100" step="0.1" value={progress * 100}
          disabled={!frame} aria-valuetext={`${percent}% · ${stationaryOnly ? text('recorded order', 'ordre enregistré') : text('route distance', 'distance du trajet')}`}
          onChange={event => {setPlaying(false); setInspectedMovement(undefined); seek(Number(event.target.value) / 100);}}/>
      </label>
    </div>}
    {!!tour.length && <section className="route-tour" aria-labelledby={`${id}-tour`}>
      <div className="route-tour-heading"><h4 id={`${id}-tour`}>{text('Recorded movements', 'Déplacements enregistrés')}</h4>
        <label className="route-follow" title={reducedMotion ? text('Camera follow is disabled with reduced motion.', 'Le suivi de caméra est désactivé lorsque les mouvements sont réduits.') : undefined}>
          <input type="checkbox" checked={follow} disabled={reducedMotion || !camera} onChange={event => {
            const enabled = event.target.checked;
            if (enabled) followStart.current = camera;
            else if (followStart.current) {setCameraRequest({id: `${Date.now()}-${Math.random()}`, camera: followStart.current}); followStart.current = null;}
            setFollow(enabled);
          }}/>
          {text('Follow marker', 'Suivre le repère')}</label></div>
      <p className="route-replay-note">{stationaryOnly ? text('The recorded geometry is stationary. The slider follows record order.', 'La géométrie enregistrée est stationnaire. Le curseur suit l’ordre des enregistrements.')
        : text('Choose a movement to pause and inspect its recorded route.', 'Choisir un déplacement pour arrêter la lecture et examiner son trajet enregistré.')}</p>
      <ol onKeyDown={event => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !(event.target instanceof HTMLButtonElement)) return;
        const buttons = [...event.currentTarget.querySelectorAll('button')], current = buttons.indexOf(event.target);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, current + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1)));
        event.preventDefault(); buttons[next]?.focus();
      }}>{tour.map(segment => <li key={segment.movementIndex}><button type="button" aria-current={frame?.movementIndex === segment.movementIndex ? 'step' : undefined}
        onClick={() => {setPlaying(false); seek(segment.startProgress); setInspectedMovement(segment.movementIndex);}}>
        <span><strong>{text('Movement', 'Déplacement')} {segment.movementIndex + 1}</strong> · {segment.movement.from === segment.movement.to
          ? `${text('Round trip', 'Aller-retour')} · ${nodeName(segment.movement.from)}` : `${nodeName(segment.movement.from)} → ${nodeName(segment.movement.to)}`}</span>
        <small>{segment.stationary ? text('Stationary geometry', 'Géométrie stationnaire') : `${segment.movement.km.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1})} km`}
          {segment.movement.kind === 'truck' && ` · ${segment.movement.volume.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1})} m³`}</small>
      </button></li>)}</ol>
    </section>}
    {reducedMotion && <p className="route-replay-note">{text('Reduced motion is enabled. Playback starts paused; use the slider or choose Play.',
      'Les mouvements réduits sont activés. La lecture commence en pause; utilisez le curseur ou choisissez Lire.')}</p>}
    {!resources.length && <p className="route-replay-empty">{text('This turn has no recorded route geometry to replay. Production or other activity may still appear in the report.',
      'Ce tour ne contient aucun trajet enregistré à relire. La production ou d’autres activités peuvent tout de même figurer dans le rapport.')}</p>}
    <OperationsMap game={game} selected={selectedStand} onSelect={stand => {setSelectedStand(stand); onSelect?.(stand);}}
      replay={index} replayResource={resource || undefined} replayProgress={frame ? progress : undefined} replayMovementIndex={inspectedMovement}
      onCameraChange={setCamera} cameraRequest={cameraRequest} followReplay={follow && !reducedMotion}
      onInspect={(kind, selected) => {if ((kind === 'crew' || kind === 'truck') && resources.includes(selected)) chooseResource(selected);}}/>
    <p className="route-replay-note">{frame ? text('The outlined marker follows the selected resource. Other fleet icons show recorded end-of-turn locations.',
      'Le marqueur cerclé suit la ressource sélectionnée. Les autres icônes indiquent les positions enregistrées en fin de tour.') : text('Fleet icons show recorded end-of-turn locations.', 'Les icônes indiquent les positions enregistrées en fin de tour.')}
      {!report.snapshot && ` ${text('This legacy report lacks a state snapshot: fleet end locations are hidden and timber context reflects the current state.',
        'Ce rapport ancien n’a pas d’état enregistré : les positions finales de la flotte sont masquées et le contexte du bois reflète l’état actuel.')}`}
      {!report.snapshot?.operationalRoadIds && ` ${text('Historical road access was not recorded; gray roads indicate unknown access.',
        'L’accès routier historique n’a pas été enregistré; les routes grises indiquent un accès inconnu.')}`}</p>
    {campaignKey && <details className="route-viewpoints"><summary>{text('Saved viewpoints', 'Points de vue enregistrés')}</summary>
      <MapViewpoints campaignKey={campaignKey} regionId={game.region.id} camera={camera} onRecall={view => {
        setPlaying(false); setFollow(false); followStart.current = null; setCameraRequest({id: `${Date.now()}-${Math.random()}`, camera: view});
      }}/></details>}
    {frame && <div className="route-replay-detail" aria-label={text('Recorded movement details', 'Détails du déplacement enregistré')}>
      <strong>{name(resource)} · {text('Movement', 'Déplacement')} {frame.movementIndex + 1}/{frame.movementCount}</strong>
      <span>{nodeName(frame.movement.from)} → {nodeName(frame.movement.to)}</span>
      <span>{frame.movement.km.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1})} km
        {frame.movement.kind === 'truck' && ` · ${frame.movement.volume.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1})} m³`}</span>
    </div>}
  </section>;
}
