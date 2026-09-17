import StandReadiness from "./operations/StandReadiness";
import { anchorWorkbench } from "./operations/OperationsShell";
import PlanDock from "./operations/PlanDock";
import { standWorkProblems } from "./simulation/operations-profile";
import {effectiveMarketRegion} from "./simulation/bc-market";
import {millReceiptSummary} from './simulation/mill-receipt-summary';
import {standSupportsProduct} from './simulation/intake-products';
import { useLanguage } from "./i18n";
import {BuckingSelect} from './BuckingDesk';
import BidCompositionDesk from './BidCompositionDesk';
import MapRolePanel, {type MapRole} from './MapRolePanel';
import {EquipmentStatus,ProductSymbol} from './OperationalSymbols';
import './map-workbench.css';
import ReservationDesk from "./ReservationDesk";
import { useEffect, useRef, useState } from "react";
import type { Game } from "./simulation/types";
import OperationsMap from "./maps/LazyMap";
import { purchase, stockAt, sum } from "./simulation/engine";
import { activeDisruptions } from "./simulation/disruptions";
import { weatherAt, canAccess } from "./simulation/routing";
export default function MapWorkspace({
  game,
  selected,
  onSelect,
  onChange,
  onNavigate,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  onChange: (g: Game) => void;
  onNavigate: (s: string) => void;
}) {
 const {t: tr,language}=useLanguage();
 const f=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
  const [inspect, setInspect] = useState<{
      kind: "stand" | "mill" | "crew" | "truck" | "road";
      id: string;
    }>({ kind: "stand", id: selected }),
    [search, setSearch] = useState(""),
    [crew, setCrew] = useState(game.region.crews[0].id),
    [hours, setHours] = useState(8),
    [accessibleOnly,setAccessibleOnly] = useState(false),
    [error, setError] = useState("");
  useEffect(()=>setError(''),[game.week]);
  const [role,setRole]=useState<MapRole>('purchase');
  const [workspaceView, setWorkspaceView] = useState<'map' | 'list'>('map');
  const [sheetSize, setSheetSize] = useState<'half' | 'full'>('half');
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
  const r = game.region,
    done = game.week > r.weeks;
  const select = (id: string) => {
    onSelect(id);
    setInspect({ kind: "stand", id });
    if(featureRef.current) featureRef.current.open=true;
    if (workspaceView === 'list') {
      requestAnimationFrame(() => featureRef.current?.scrollIntoView({ block: 'nearest' }));
    } else inspectorRef.current?.scrollTo({ top: 0, behavior: 'auto' });
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
  return (
    <>
    <div className={`map-workspace adaptive-map-workspace ${workspaceView === 'list' ? 'operations-list-mode' : ''}`} data-sheet={sheetSize}>
      <div className="mobile-workspace-controls" aria-label={language === 'fr' ? 'Affichage' : 'Workspace view'}>
        <button aria-pressed={workspaceView === 'map'} onClick={() => setWorkspaceView('map')}>{language === 'fr' ? 'Carte' : 'Map'}</button>
        <button aria-pressed={workspaceView === 'list'} onClick={() => setWorkspaceView('list')}>{language === 'fr' ? 'Liste' : 'List'}</button>
      </div>
      <div className="map-stage">
        <OperationsMap
          game={game}
          visibleStandIds={r.stands.filter(s=>(!zone||s.zone===zone)&&(!product||standSupportsProduct(game,s.id,product))&&(!accessibleOnly||(game.stands.find(t=>t.id===s.id)?.owned&&canAccess(s.terrain,weatherAt(game,true)[s.zone])))).map(s=>s.id)}
          selected={selected}
          onSelect={select}
          onInspect={(kind, id) => {setInspect({ kind, id });if(featureRef.current)featureRef.current.open=true;}}
        />
        <button className="map-inspector-jump" onClick={()=>{if(featureRef.current)featureRef.current.open=true;inspectorRef.current?.focus({preventScroll:true});inspectorRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}>{tr("View selected feature ↓")}</button>
      </div>
      <aside ref={inspectorRef} tabIndex={-1} className="map-inspector" aria-label={tr("Selected map feature")}>
        <div className="operating-sheet-controls">
          <strong>{inspect.id}</strong>
          <button aria-expanded={sheetSize === 'full'} onClick={() => setSheetSize(sheetSize === 'half' ? 'full' : 'half')}>
            {sheetSize === 'half' ? (language === 'fr' ? 'Développer' : 'Expand') : (language === 'fr' ? 'Réduire' : 'Collapse')}
          </button>
        </div>
        <div className="operating-role-tabs" aria-label={tr("Planning role")}>
          {(['purchase', 'production', 'transport'] as const).map(value => <button key={value}
            aria-pressed={role === value} onClick={() => setRole(value)}>
            {tr(value === 'purchase' ? 'Purchase' : value === 'production' ? 'Production' : 'Transport')}
          </button>)}
        </div>
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
                    setInspect({ kind: e.kind, id: e.id });
                    if (e.kind === "stand") onSelect(e.id);
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                >
                  {e.id} · {e.name}
                  <small>{e.kind}</small>
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
              {stand.zone} · {state.owned ? tr("Secured timber") : tr(stand.supply)} {tr("· forecast terrain")}{" "}
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
            {state.owned && !done && (
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
                    <option key={id} value={id}>{r.treatments?.[id]?.name ?? tr('Final harvest')}</option>)}
                </select></label>
                <label>{tr("Assignment hours")}<input type="number" min="1" max={r.crews.find(c=>c.id===crew)!.hours} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label>
                {!!assignmentIssues.length && <p role="status">{assignmentIssues.map(issue => issue.message).join(' ')}</p>}
                <button className="primary wide" disabled={assignmentIssues.length > 0} onClick={() => {
                  const queue = game.plan.crews[crew] ?? [];
                  const available = r.crews.find(c=>c.id===crew)!.hours - queue.reduce((n,o)=>n+o.hours,0);
                  if (!Number.isFinite(hours) || hours <= 0 || hours > available) {setError(`Choose between 1 and ${Math.max(0,available)} unassigned hours.`);return;}
                  const g = structuredClone(game);
                  g.plan.crews[crew] = [...queue, {stand:stand.id,hours,treatment:selectedTreatment}];
                  g.plan.ready = {purchase:false,production:false,transport:false};
                  onChange(g); setError(`${hours} hours at ${stand.id} appended. Travel and access are checked when the week runs.`);
                }}>{tr("Append to crew queue")}</button>
                <ol aria-label={tr("Selected crew assignments")}>{(game.plan.crews[crew]??[]).map((order,index)=><li key={index}>
                  <button onClick={()=>select(order.stand)}>{order.stand} · {order.hours} h</button>
                  <BuckingSelect game={game} crew={crew} index={index} onChange={onChange}/><button aria-label={`Move assignment ${index+1} earlier`} disabled={index===0} onClick={()=>{
                    const g=structuredClone(game),q=g.plan.crews[crew];[q[index-1],q[index]]=[q[index],q[index-1]];
                    g.plan.ready={purchase:false,production:false,transport:false};onChange(g);
                  }}>↑</button>
                  <button aria-label={`Remove assignment ${index+1}`} onClick={()=>{
                    const g=structuredClone(game);g.plan.crews[crew].splice(index,1);g.plan.ready={purchase:false,production:false,transport:false};onChange(g);
                  }}>{tr("Remove")}</button>
                </li>)}</ol>
                <p className="muted">{tr("Queue order includes relocation time. Open Production for treatment choices and a forecast rehearsal.")}</p>
              </>
            )}
            {!state.owned && !done && stand.supply === "private" && (
              <button
                className="primary wide"
                onClick={() => {
                  try {
                    onChange(purchase(game, stand.id));
                    setError("Lot secured.");
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
            <button className="wide" onClick={() => onNavigate("Production")}>
              {tr("Production queues →")}
            </button>
            <button className="wide" onClick={() => onNavigate("Transport")}>
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
              {inspect.kind} · {resource.id}
            </span>
            <h2>{resource.name}</h2><EquipmentStatus game={game} kind={inspect.kind} id={resource.id}/>
            <p>{resource.hours} {tr("operating hours per week.")}</p>
            <p>
              {tr("Current location:")}{" "}
              {inspect.kind === "crew"
                ? game.crewPositions[resource.id]
                : game.truckPositions[resource.id]}
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
            <button
              className="primary wide"
              onClick={() =>
                onNavigate(inspect.kind === "crew" ? "Production" : "Transport")
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
        <MapRolePanel accessibleOnly={accessibleOnly} setAccessibleOnly={setAccessibleOnly} game={game} role={role} setRole={setRole} product={product} setProduct={setProduct} zone={zone} setZone={setZone} selected={selected} select={select} onChange={onChange} onInspect={(kind,id)=>{setInspect({kind,id});if(featureRef.current)featureRef.current.open=true;}}/>
      </aside>
    </div>
    <PlanDock game={game} selected={selected} onSelect={select} onNavigate={onNavigate} />
    </>
  );
}
