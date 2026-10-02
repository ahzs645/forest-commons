import {MapLensLegend, MapLensSelect, MapLensValues, mapLensName} from './maps/MapLensControls';
import {mapStandValues, type MapLens} from './maps/map-lenses';
import StandReadiness from "./operations/StandReadiness";
import { anchorWorkbench } from "./operations/OperationsShell";
import PlanDock from "./operations/PlanDock";
import { standWorkProblems } from "./simulation/operations-profile";
import {effectiveMarketRegion} from "./simulation/bc-market";
import {millReceiptSummary} from './simulation/mill-receipt-summary';
import {standSupportsProduct} from './simulation/intake-products';
import { useLanguage } from "./i18n";
import QueueEditor from './operations/QueueEditor';
import useMapQueueUndo from './operations/useMapQueueUndo';
import BidCompositionDesk from './BidCompositionDesk';
import MapRolePanel, {type MapRole} from './MapRolePanel';
import {EquipmentStatus,ProductSymbol} from './OperationalSymbols';
import './map-workbench.css';
import ReservationDesk from "./ReservationDesk";
import { useEffect, useRef, useState } from "react";
import type { Game } from "./simulation/types";
import OperationsMap from "./maps/LazyMap";
import type { MapPick } from "./maps/OperationsMap";
import { purchase, stockAt, sum } from "./simulation/engine";
import { activeDisruptions } from "./simulation/disruptions";
import { weatherAt, canAccess } from "./simulation/routing";
export default function MapWorkspace({
  game,
  selected,
  onSelect,
  onChange,
  onNavigate,
  onResourceNavigate,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  onChange: (g: Game) => void;
  onNavigate: (s: string) => void;
  onResourceNavigate?: (kind: 'crew' | 'truck', id: string) => void;
}) {
 const {t: tr,language}=useLanguage();
 const openResource = (kind: 'crew' | 'truck', id: string) => onResourceNavigate ? onResourceNavigate(kind, id) : onNavigate(kind === 'crew' ? 'Production' : 'Transport');
 const {changeQueue, undo, count: undoCount} = useMapQueueUndo(game, onChange);
 const f=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
  const [inspect, setInspect] = useState<{
      kind: "stand" | "mill" | "crew" | "truck" | "road";
      id: string;
    }>({ kind: "stand", id: selected }),
    [search, setSearch] = useState(""),
    [crewChoice, setCrew] = useState(game.region.crews[0]?.id ?? ''),
    [truckChoice, setTruck] = useState(game.region.trucks[0]?.id ?? ''),
    [hours, setHours] = useState(8),
    [accessibleOnly,setAccessibleOnly] = useState(false),
    [error, setError] = useState("");
  useEffect(()=>setError(''),[game.week]);
  const [role,setRole]=useState<MapRole>('purchase');
  const [workspaceView, setWorkspaceView] = useState<'map' | 'list'>('map');
  // Phone sheet: 'peek' leaves the map clear with only the header showing.
  const [sheetSize, setSheetSize] = useState<'peek' | 'half' | 'full'>('half');
  const [lens, setLens] = useState<MapLens>('rights');
  const [nearby, setNearby] = useState<MapPick[] | null>(null);
  const openSheet = () => setSheetSize(size => size === 'peek' ? 'half' : size);
  useEffect(() => {
    const frame = requestAnimationFrame(anchorWorkbench);
    return () => cancelAnimationFrame(frame);
  }, []);
  const [treatmentChoice, setTreatmentChoice] = useState('final');
  useEffect(() => {
    setInspect({ kind: 'stand', id: selected });
    if (featureRef.current) featureRef.current.open = true;
    setSheetSize('half');
  }, [selected]);
  const [product,setProduct]=useState('');
  const [zone,setZone]=useState('');
  const featureRef=useRef<HTMLDetailsElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorScrollRef = useRef<HTMLDivElement>(null);
  const r = game.region,
    crew = r.crews.some(c => c.id === crewChoice) ? crewChoice : r.crews[0]?.id ?? '',
    truck = r.trucks.some(t => t.id === truckChoice) ? truckChoice : r.trucks[0]?.id ?? '',
    done = game.week > r.weeks;
  const inspectFeature = (kind: MapPick["kind"], id: string) => {
    setNearby(null);
    setInspect({ kind, id });
    if (kind === 'crew') { setCrew(id); setRole('production'); }
    if (kind === 'truck') { setTruck(id); setRole('transport'); }
    if (featureRef.current) featureRef.current.open = true;
    openSheet();
    if (workspaceView === 'list') requestAnimationFrame(() => featureRef.current?.scrollIntoView({block: 'start'}));
    else inspectorScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };
  const select = (id: string) => {
    setNearby(null);
    openSheet();
    onSelect(id);
    setInspect({ kind: "stand", id });
    if(featureRef.current) featureRef.current.open=true;
    if (workspaceView === 'list') {
      requestAnimationFrame(() => featureRef.current?.scrollIntoView({ block: 'nearest' }));
    } else inspectorScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  };
  const entities = [
    ...r.roads.edges.map(e => ({ kind: "road", id: e.id, name: e.name })),
    ...r.stands.map((s) => ({ kind: "stand", id: s.id, name: s.name })),
    ...r.mills.map((m) => ({ kind: "mill", id: m.id, name: m.name })),
    ...r.crews.map((c) => ({ kind: "crew", id: c.id, name: c.name })),
    ...r.trucks.map((t) => ({ kind: "truck", id: t.id, name: t.name })),
  ] as { kind: typeof inspect.kind; id: string; name: string }[];
  const matchingEntities=entities.filter(e=>`${e.name} ${e.id}`.toLowerCase().includes(search.trim().toLowerCase()));
  const road = r.roads.edges.find(e => e.id === inspect.id);
  const closure = road && activeDisruptions(game).find(e => e.kind === "road" && e.target === road.id);
  const stand = r.stands.find((s) => s.id === inspect.id),
    state = game.stands.find((s) => s.id === inspect.id),
    mill = r.mills.find((m) => m.id === inspect.id),
    resource =
      inspect.kind === "crew"
        ? r.crews.find((c) => c.id === inspect.id)
        : r.trucks.find((t) => t.id === inspect.id);
  const treatments = stand && r.operations?.stands[stand.id]?.treatments;
  const selectedTreatment = treatments && !treatments.includes(treatmentChoice) ? treatments[0] : treatmentChoice;
  const assignmentIssues = stand ? standWorkProblems(game, stand.id, crew, selectedTreatment) : [];
  const kindLabel = (kind: MapPick["kind"]) => tr(({ stand: 'Stand', mill: 'Mill', crew: 'Crew', truck: 'Truck', road: 'Road' } as const)[kind]);
  const inspectName = mill?.name ?? resource?.name ?? road?.name ?? inspect.id;
  // Some regions already prefix stand names with their ID ("BC01 · VRI …").
  const standTitle = (id: string, name = '') => name.startsWith(id) ? name : `${id} · ${name}`;
  return (
    <>
    <div className={`map-workspace adaptive-map-workspace ${workspaceView === 'list' ? 'operations-list-mode' : ''}`} data-sheet={sheetSize}>
      <div className="map-stage">
        <OperationsMap
          game={game}
          visibleStandIds={r.stands.filter(s=>(!zone||s.zone===zone)&&(!product||standSupportsProduct(game,s.id,product))&&(!accessibleOnly||(game.stands.find(t=>t.id===s.id)?.owned&&canAccess(s.terrain,weatherAt(game,true)[s.zone])))).map(s=>s.id)}
          selected={selected}
          lens={lens} onLensChange={setLens} showLensControl={false} reserveInspectorSpace
          onSelect={select}
          onInspect={inspectFeature}
          onPick={(items) => { setNearby(items); openSheet(); inspectorScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }}
          onBackgroundTap={() => { setNearby(null); setSheetSize('peek'); inspectorScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }}
        />
        <button className="map-inspector-jump" onClick={()=>{if(featureRef.current)featureRef.current.open=true;inspectorRef.current?.focus({preventScroll:true});inspectorRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}>{tr("View selected feature ↓")}</button>
      </div>
      <aside ref={inspectorRef} tabIndex={-1} className="map-inspector" aria-label={tr("Selected map feature")}>
        <header className="map-inspector-header">
        <div className="operating-sheet-controls">
          <button className="operating-sheet-title" aria-expanded={sheetSize !== 'peek'} onClick={() => setSheetSize(sheetSize === 'peek' ? 'half' : 'peek')}>
            <small>{kindLabel(inspect.kind)}</small>
            <strong>{inspect.kind === 'stand' ? standTitle(inspect.id, stand?.name) : inspectName}</strong>
          </button>
          <div className="mobile-workspace-controls" aria-label={language === 'fr' ? 'Affichage' : 'Workspace view'}>
            <button aria-pressed={workspaceView === 'list'} onClick={() => {setWorkspaceView(workspaceView === 'list' ? 'map' : 'list'); inspectorScrollRef.current?.scrollTo({top: 0});}}>
              {workspaceView === 'list' ? (language === 'fr' ? 'Carte' : 'Map') : (language === 'fr' ? 'Liste' : 'List')}
            </button>
            <button className="operating-sheet-size" aria-expanded={sheetSize === 'full'} onClick={() => setSheetSize(sheetSize === 'full' ? 'half' : 'full')}>
              {sheetSize === 'full' ? (language === 'fr' ? 'Réduire' : 'Collapse') : (language === 'fr' ? 'Développer' : 'Expand')}
            </button>
          </div>
        </div>
        <p className="map-inspector-summary">{stand && state ? `${language === 'fr' ? 'Sur pied' : 'Standing'} ${f(state.remaining)} m³ · ${language === 'fr' ? 'bord de route' : 'roadside'} ${f(sum(stockAt(game, stand.id)))} m³` : resource ? `${resource.hours} h · ${inspect.kind === 'crew' ? (game.plan.crews[resource.id]?.length ?? 0) : (game.plan.trucks[resource.id]?.length ?? 0)} ${tr('queued orders')}` : road ? `${road.km.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 2})} km · ${tr('Game forecast access:')}` : mill ? tr('Current period receipts / period demand') : ''}</p>
        {nearby && nearby.length > 1 && <div className="map-nearby" role="group" aria-label={tr("Features at this spot")}>
          <p>{nearby.length} {tr("features here · choose one")}</p>
          {nearby.map(item => <button key={`${item.kind}-${item.id}`} onClick={() => item.kind === 'stand' ? select(item.id) : inspectFeature(item.kind, item.id)}>
            <small>{kindLabel(item.kind)}</small> {item.kind === 'stand' ? standTitle(item.id, item.name) : item.name}
          </button>)}
        </div>}
        <div className="operating-role-tabs" aria-label={tr("Planning role")}>
          {(['purchase', 'production', 'transport'] as const).map(value => <button key={value}
            aria-pressed={role === value} onClick={() => setRole(value)}>
            {tr(value === 'purchase' ? 'Purchase' : value === 'production' ? 'Production' : 'Transport')}
          </button>)}
        </div>
        </header>
        <div className="map-inspector-scroll" ref={inspectorScrollRef} tabIndex={0} role="region" aria-label={language === 'fr' ? 'Détails et commandes de la carte' : 'Map details and controls'}>
        <details className="map-lens-details map-lens-workbench" open={workspaceView === 'list' ? true : undefined}><summary>{language === 'fr' ? 'Lecture de la carte' : 'Map lens'} · {mapLensName(lens, language)}</summary>
          <MapLensSelect value={lens} onChange={setLens}/><MapLensLegend lens={lens}/>
          <MapLensValues rows={mapStandValues(game).filter(value => {const s = r.stands.find(stand => stand.id === value.id)!;return (!zone || s.zone === zone) && (!product || standSupportsProduct(game, s.id, product)) && (!accessibleOnly || (value.owned && value.terrainOpen));})} lens={lens} selected={selected} onSelect={select} finished={done}/>
        </details>
        <div className="map-queue-undo">
          <button disabled={!undoCount || done} onClick={undo}>{language === 'fr' ? 'Annuler la modification de file' : 'Undo queue edit'}{undoCount > 0 ? ` (${undoCount})` : ''}</button>
          <small>{language === 'fr' ? 'Files de ce plan seulement. Achat, mise, restauration et tour exécuté effacent l’historique.' : 'This plan’s queues only. Purchases, bids, restored saves and executed turns clear undo.'}</small>
        </div>
        {role !== 'purchase' && <p className="map-resource-guide" role="status">{language === 'fr'
          ? `1. Choisissez ${role === 'production' ? 'une équipe' : 'un camion'}. 2. Sélectionnez un chantier sur la carte ou dans la liste. 3. Ajoutez et ordonnez les arrêts. Les prévisions sont actualisées ci-dessous.`
          : `1. Choose ${role === 'production' ? 'a crew' : 'a truck'}. 2. Select a site on the map or in the list. 3. Add and order stops. Forecast results update below.`}</p>}
        <details ref={featureRef} className="selected-feature"><summary>{tr("Selected feature ·")} {inspect.id}</summary>
        
        <label>
          {tr("Find a stand, road, mill or fleet resource")}
          <input
            ref={searchRef}
            aria-label={tr("Search map entities")}
            placeholder={tr("Name or ID\u2026")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {search && (
          <div className="entity-results">
            {!matchingEntities.length&&<p role="status">{tr("No map features match your search.")}</p>}
            {matchingEntities
              .slice(0, 12)
              .map((e) => (
                <button
                  key={`${e.kind}-${e.id}`}
                  onClick={() => {
                    inspectFeature(e.kind, e.id);
                    if (e.kind === "stand") onSelect(e.id);
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                >
                  {e.id} · {e.name}
                  <small>{kindLabel(e.kind)}</small>
                </button>
              ))}
          </div>
        )}
        {inspect.kind === "stand" && stand && state && (
          <>
            <StandReadiness key={stand.id} game={game} standId={stand.id}
              selection={{ crew, treatment: selectedTreatment }} onChange={onChange} onNavigate={onNavigate} />
            <span className="eyebrow">{tr("SUPPLY AREA ·")} {stand.id}</span>
            <h2>{stand.name}</h2>
            {stand.sourceNote && <p className="muted">{stand.sourceNote}</p>}
            <p className="muted">
              {tr(r.zones.find(zone => zone.id === stand.zone)?.name ?? stand.zone)} · {state.owned ? tr("Secured timber") : tr(stand.supply)} {tr("· forecast terrain")}{" "}
              {canAccess(stand.terrain, weatherAt(game, true)[stand.zone])
                ? tr("Open terrain")
                : tr("Terrain closed")}
            </p>
            <dl className="facts">
              <dt>{tr("Standing volume")}</dt>
              <dd>{f(state.remaining)} m³</dd>
              <dt>{tr("Roadside inventory")}</dt>
              <dd>{f(sum(stockAt(game, stand.id)))} m³</dd>
              <dt>{tr("Base productivity")}</dt>
              <dd>{stand.productivity} m³/h</dd>
            </dl>
            {state.owned && <details><summary>{tr("Reserve a destination")}</summary><ReservationDesk game={game} standId={stand.id} onChange={onChange}/></details>}
            {state.owned && !done && role === 'production' && (
              <>
                <label>
                  {tr("Production crew")}
                  <select
                    value={crew}
                    onChange={(e) => setCrew(e.target.value)}
                  >
                    {r.crews.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>{tr("Treatment")}<select value={selectedTreatment} onChange={e => setTreatmentChoice(e.target.value)}>
                  {(treatments ?? ['final', ...Object.keys(r.treatments ?? {}).filter(id => id !== 'final')]).map(id =>
                    <option key={id} value={id}>{tr(r.treatments?.[id]?.name ?? 'Final harvest')}</option>)}
                </select></label>
                <label>{tr("Assignment hours")}<input type="number" min="1" max={r.crews.find(c=>c.id===crew)!.hours} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label>
                {!!assignmentIssues.length && <p role="status">{assignmentIssues.map(issue => tr(issue.message)).join(' ')}</p>}
                <button className="primary wide" disabled={assignmentIssues.length > 0} onClick={() => {
                  const queue = game.plan.crews[crew] ?? [];
                  const available = r.crews.find(c=>c.id===crew)!.hours - queue.reduce((n,o)=>n+o.hours,0);
                  if (!Number.isFinite(hours) || hours <= 0 || hours > available) {setError(language === 'fr' ? `Choisissez de 1 à ${Math.max(0,available)} heures non affectées.` : `Choose between 1 and ${Math.max(0,available)} unassigned hours.`);return;}
                  const g = structuredClone(game);
                  g.plan.crews[crew] = [...queue, {stand:stand.id,hours,treatment:selectedTreatment}];
                  g.plan.ready = {purchase:false,production:false,transport:false};
                  changeQueue(g); setError(language === 'fr' ? `${hours} heures à ${stand.id} ajoutées. Les déplacements et l’accès seront vérifiés à l’exécution du tour.` : `${hours} hours at ${stand.id} appended. Travel and access are checked when the week runs.`);
                }}>{tr("Append to crew queue")}</button>
                <QueueEditor game={game} kind="crew" resourceId={crew} selected={selected} onSelect={select} onChange={changeQueue}/>
                <p className="muted">{tr("Queue order includes relocation time. Open Production for treatment choices and a forecast rehearsal.")}</p>
              </>
            )}
            {!state.owned && !done && stand.supply === "private" && (
              <button
                className="primary wide"
                onClick={() => {
                  try {
                    onChange(purchase(game, stand.id));
                    setError(tr("Lot secured."));
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                {tr("Buy private timber ·")} {f(stand.askingPrice)}
              </button>
            )}
            {!state.owned&&stand.supply==='auction'&&stand.auctionWeek===game.week&&<BidCompositionDesk game={game} standId={stand.id} onChange={onChange}/>}
            {!state.owned&&!done&&stand.supply==='auction'&&stand.auctionWeek===game.week&&<label>{tr("Sealed lot bid (")}{r.currency})<input type="number" min="0" value={game.plan.bids[stand.id]??0} onChange={e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<0)return;const next=structuredClone(game);if(value)next.plan.bids[stand.id]=value;else delete next.plan.bids[stand.id];next.plan.ready={purchase:false,production:false,transport:false};onChange(next);}}/><small>{tr("Awards settle after this week’s operations.")}</small></label>}
            <button
              className="wide"
              onClick={() => onNavigate("Forest & timber")}
            >
              {tr("Lot details, bids & appraisal →")}
            </button>
            <button className="wide" onClick={() => openResource('crew', crew)}>
              {tr("Production queues →")}
            </button>
            <button className="wide" onClick={() => openResource('truck', truck)}>
              {tr("Dispatch timber →")}
            </button>
          </>
        )}
        {inspect.kind === "road" && road && <>
          <span className="eyebrow">{tr("ROAD SEGMENT ·")} {road.id}</span>
          <h2>{road.name}</h2>
          <p>{tr("Game forecast access:")} {done ? tr('Season complete') : closure ? `${tr('Closed')} · ${tr(closure.title)}` : canAccess(game.improvedRoads.includes(road.id) ? 1 : road.bearing, weatherAt(game,true)[road.zone]) ? tr('Open') : tr('Closed by seasonal bearing restriction')}.</p>
          <dl className="facts"><dt>{tr("Mapped/modelled segment length")}</dt><dd>{road.km.toLocaleString(language==='fr'?'fr-CA':'en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})} km</dd><dt>{tr("Teaching travel speed")}</dt><dd>{road.speed} km/h</dd><dt>{tr("Model bearing class")}</dt><dd>{game.improvedRoads.includes(road.id) ? 1 : road.bearing}</dd><dt>{tr("Connections")}</dt><dd>{road.from} → {road.to}</dd></dl>
          <p className="muted">{tr("Road names identify mapped roads and modelled spurs. Game access is a simulation; consult the responsible road manager for actual closures and bridge limits.")}</p>
          <button onClick={()=>onNavigate("Planning desk")}>{tr("Review disruptions and rehearse routes →")}</button>
          <button onClick={()=>onNavigate("Scenario studio")}>{tr("Road sources and scenario assumptions →")}</button>
        </>}
        {inspect.kind === "mill" && mill && (
          <>
            <span className="eyebrow">{tr("DESTINATION ·")} {mill.id}</span>
            <h2>{mill.name}</h2>
            <p>{tr(done?"Recorded campaign receipts / total campaign demand":"Current period receipts / period demand")}</p>
            {millReceiptSummary({...game,region:effectiveMarketRegion(game)},mill.id).map(({product:p,target:n,received}) => (
              <div className="soft-card" key={p}>
                {r.products.find(x=>x.id===p)&&<ProductSymbol product={r.products.find(x=>x.id===p)!}/>}
                <p>
                  {f(received)} / {f(n)} {tr("m³ received")}
                </p>
                <p>
                  {r.currency} {effectiveMarketRegion(game).mills.find(m=>m.id===mill.id)!.prices[p].toFixed(2)} / m³
                </p>
              </div>
            ))}
            <button
              className="primary wide"
              onClick={() => onNavigate("Commitments")}
            >
              {tr("Review mill commitments →")}
            </button>
            <button className="wide" onClick={() => onNavigate("Transport")}>
              {tr("Plan deliveries →")}
            </button>
          </>
        )}
        {(inspect.kind === "crew" || inspect.kind === "truck") && resource && (
          <>
            <span className="eyebrow">
              {kindLabel(inspect.kind)} · {resource.id}
            </span>
            <h2>{resource.name}</h2><EquipmentStatus game={game} kind={inspect.kind} id={resource.id}/>
            <p>{resource.hours} {tr("operating hours per week.")}</p>
            <p>
              {tr("Current location:")}{" "}
              {(() => {
                // Positions are road-node IDs; name the mill or stand at that node instead.
                const node = inspect.kind === "crew" ? game.crewPositions[resource.id] : game.truckPositions[resource.id];
                const place = r.mills.find(m => m.node === node) ?? r.stands.find(s => s.node === node);
                return place ? `${place.name} (${place.id})` : `${tr("road junction")} ${node}`;
              })()}
            </p>
            <p>
              {
                (inspect.kind === "crew"
                  ? game.plan.crews[resource.id]
                  : game.plan.trucks[resource.id]
                ).length
              }{" "}
              {tr("queued orders")}
            </p>
            <button className="wide" disabled={done} onClick={() => {
              if (inspect.kind === 'crew') { setCrew(resource.id); setRole('production'); }
              else { setTruck(resource.id); setRole('transport'); }
              select(selected);
            }}>{language === 'fr' ? 'Planifier au chantier sélectionné →' : 'Plan at selected site →'} {selected}</button>
            <QueueEditor game={game} kind={inspect.kind} resourceId={resource.id} selected={selected} onSelect={select} onChange={changeQueue}/>
            <button
              className="primary wide"
              onClick={() =>
                openResource(inspect.kind as 'crew' | 'truck', resource.id)
              }
            >
              {tr("Open")} {tr(inspect.kind === "crew" ? "crew queue" : "truck dispatch")} →
            </button>
          </>
        )}
        {error && (
          <p className="notice" role="status">
            {error}
          </p>
        )}
        <div className="map-drill-links">
          <button onClick={() => onNavigate("Planning desk")}>
            {tr("Rehearse plan")}
          </button>
          <button onClick={() => onNavigate("Collaboration")}>
            {tr("Collaborate")}
          </button>
          <button onClick={() => onNavigate("Reports")}>{tr("Review results")}</button>
        </div>
        <p className="muted">
          {tr("Select map features to drill into operations. Search provides the same access without needing to hit a map marker.")}
        </p>
        </details>
        <MapRolePanel accessibleOnly={accessibleOnly} setAccessibleOnly={setAccessibleOnly} game={game} role={role} setRole={setRole} product={product} setProduct={setProduct} zone={zone} setZone={setZone} selected={selected} select={select} onChange={onChange} onQueueChange={changeQueue} crewSelection={crew} truckSelection={truck} onTruckSelect={setTruck} onInspect={inspectFeature}/>
        </div>
      </aside>
    </div>
    <PlanDock game={game} selected={selected} onSelect={select} onNavigate={onNavigate} />
    </>
  );
}
