import {mapDetail, groupMapSites, type MapSiteGroup} from './map-detail';
import './map-detail.css';
import {mapFitPadding, mapSymbolScale, mapFocusOffset} from './map-viewport';
import {mapPickDepth, mapPickItems, mapScreenHits, type MapPick, type MapScreenMarker, type MapScreenRoad} from './map-picking';
export type {MapPick} from './map-picking';
import {mapStandValues, standLensColor, type MapLens, type MapColor} from './map-lenses';
import {MapLensLegend, MapLensSelect, MapLensValues, mapLensName} from './MapLensControls';
import {validMapCamera, type MapCamera} from './map-viewpoints';
import {replayRoadIds} from '../simulation/replay-roads';
import {recordedMovements, routeReplayFrame} from './route-replay';
import {useLanguage} from "../i18n";
import {equipmentStatus} from '../OperationalSymbols';
import { operatingRegion } from "../simulation/disruptions";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import {
  PolygonLayer,
  PathLayer,
  IconLayer,
  TextLayer,
  ScatterplotLayer,
} from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Game, Position } from "../simulation/types";
import { route, weatherAt, canAccess } from "../simulation/routing";
import { layoutSymbols } from "./symbol-layout";
export default function OperationsMap({
  game,
  selected,
  onSelect,
  replay,
  replayProgress,
  replayResource,
  replayMovementIndex,
  lens: suppliedLens,
  onLensChange,
  showLensControl = true,
  endStateOnly = false,
  reserveInspectorSpace = false,
  inspectorHeightPx,
  inspectorFeature,
  onFitRequest,
  cameraRequest,
  onCameraChange,
  followReplay = false,
  visibleStandIds,
  onInspect,
  onPick,
  onBackgroundTap,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  replay?: number;
  /** Normalized route distance, not elapsed operating time. */
  replayProgress?: number;
  replayResource?: string;
  replayMovementIndex?: number;
  lens?: MapLens;
  onLensChange?: (lens: MapLens) => void;
  showLensControl?: boolean;
  /** Captured end state without movement paths or current planned orders. */
  endStateOnly?: boolean;
  /** Only the operating workbench places a sheet over the bottom half. */
  reserveInspectorSpace?: boolean;
  /** Actual mobile sheet overlap; zero means a side-by-side desktop inspector. */
  inspectorHeightPx?: number;
  /** A user inspection request, used only to uncover an obscured feature. */
  inspectorFeature?: {kind: MapPick["kind"]; id: string; requestId: number};
  /** Let the workbench make room before opening tools or fitting the map. */
  onFitRequest?: () => void;
  cameraRequest?: {id: string; camera: MapCamera};
  onCameraChange?: (camera: MapCamera) => void;
  followReplay?: boolean;
  visibleStandIds?: string[];
  onInspect?: (kind: "mill" | "crew" | "truck" | "road", id: string) => void;
  /** Several features under one tap; without it the top feature is selected. */
  onPick?: (items: MapPick[]) => void;
  /** A tap that hit no feature. */
  onBackgroundTap?: () => void;
}) {
  const {t:tr,language}=useLanguage();
  const [localLens, setLocalLens] = useState<MapLens>('rights');
  const lens = suppliedLens ?? localLens;
  const changeLens = (next: MapLens) => {setLocalLens(next); onLensChange?.(next);};
  const lensRows = mapStandValues(game, replay === undefined ? undefined : game.history[replay]);
  const appliedCameraRequest = useRef<string | null>(null);
  const camera=useRef<{region:string;center:Position;zoom:number;bearing:number;pitch:number}|null>(null);
  // Region whose first view has been fitted; kept apart from the saved camera
  // because a development double mount saves the camera before the fit runs.
  const fitted=useRef<string|null>(null);
  const autoFit=useRef(false);
  const initialFit = useRef<(() => void) | null>(null);
  const inspectorInset = useRef(inspectorHeightPx);
  inspectorInset.current = inspectorHeightPx;
  const inspectionRequest = useRef<string | null>(null);
  const inspectionIdentity = useRef<string | null>(null);
  const inspectionGesture = useRef(false);
  const screenPicks = useRef<{markers: MapScreenMarker[]; roads: MapScreenRoad[]; groups: MapSiteGroup[]}>({markers: [], roads: [], groups: []});
  const [viewTick, setViewTick] = useState(0);
  const [frameHeight, setFrameHeight] = useState(535);
  // The map is created once per region, so its tap handler reads the latest
  // callbacks and names from this ref.
  const handlers = useRef({ onSelect, onInspect, onPick, onBackgroundTap, onCameraChange, pickDepth: mapPickDepth({stands: game.region.stands.length, mills: game.region.mills.length, crews: game.region.crews.length, trucks: game.region.trucks.length, roads: game.region.roads.edges.length}), name: (_kind: MapPick["kind"], id: string) => id });
  handlers.current = { onSelect, onInspect, onPick, onBackgroundTap, onCameraChange, pickDepth: mapPickDepth({stands: game.region.stands.length, mills: game.region.mills.length, crews: game.region.crews.length, trucks: game.region.trucks.length, roads: game.region.roads.edges.length}), name: (kind, id) => {
    const r = game.region;
    const entity = kind === "stand" ? r.stands.find(x => x.id === id) : kind === "mill" ? r.mills.find(x => x.id === id)
      : kind === "crew" ? r.crews.find(x => x.id === id) : kind === "truck" ? r.trucks.find(x => x.id === id) : r.roads.edges.find(x => x.id === id);
    return entity?.name ?? id;
  } };
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    overlay = useRef<MapboxOverlay | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [layers, setLayers] = useState({
      stands: true,
      roads: true,
      routes: true,
      labels: true,
      fleet: true,
    }),
    [style, setStyle] = useState("light");
  useEffect(() => {
    if (!container.current) return;
    setReady(false);
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: camera.current?.region===game.region.id?camera.current.center:game.region.center,
        zoom: camera.current?.region===game.region.id?camera.current.zoom:game.region.zoom,
        minZoom: 0,
        maxZoom: 22,
        bearing:camera.current?.region===game.region.id?camera.current.bearing:0,
        pitch:camera.current?.region===game.region.id?camera.current.pitch:0,
        locale: language==='fr'?{'Map.Title':'Carte','NavigationControl.ZoomIn':'Agrandir','NavigationControl.ZoomOut':'Réduire','NavigationControl.ResetBearing':'Faire pivoter; cliquer pour rétablir le nord','AttributionControl.ToggleAttribution':'Afficher les attributions','CooperativeGesturesHandler.WindowsHelpText':'Utilisez Ctrl et la molette pour zoomer','CooperativeGesturesHandler.MacHelpText':'Utilisez ⌘ et la molette pour zoomer','CooperativeGesturesHandler.MobileHelpText':'Utilisez deux doigts pour déplacer la carte'}:undefined,
        attributionControl: { compact: true },
        canvasContextAttributes: { antialias: true },
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        cooperativeGestures: !reserveInspectorSpace && window.matchMedia("(pointer: coarse)").matches,
      });
    } catch {
      setError(
        "WebGL map initialization failed. Supply tables and all game controls remain available.",
      );
      return;
    }
    map.current = m;
    const deck = new MapboxOverlay({
      interleaved: false,
      pickingRadius: window.matchMedia("(pointer: coarse)").matches ? 14 : 5,
      // Each renderer owns its canvas. This avoids shared-context projection drift on touch maps.
      // Both MapLibre and deck cap their drawing buffers at 2× device pixels.
      useDevicePixels: Math.min(window.devicePixelRatio || 1, 2),
      layers: [],
    });
    overlay.current = deck;
    m.addControl(deck);
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.addControl(new maplibregl.ScaleControl(), "bottom-left");
    const emitCamera = () => {
      const current: MapCamera = {center: m.getCenter().toArray() as Position, zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch()};
      if (validMapCamera(current)) handlers.current.onCameraChange?.(current);
    };
    m.on("load", () => {setReady(true); emitCamera();});
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // One handler resolves every tap: a finger covers several small features,
    // so everything within the touch radius is collected and the caller can
    // offer a choice instead of guessing the top layer.
    m.on("click", (e) => {
      autoFit.current = false;
      inspectionGesture.current = true;
      const h = handlers.current, picker = overlay.current;
      const exactMarker = screenPicks.current.markers.map(marker => {
        const p = m.project(marker.position), offset = marker.offset ?? [0, 0];
        return {marker, distance: Math.hypot(p.x + offset[0] - e.point.x, p.y + offset[1] - e.point.y)};
      }).filter(hit => hit.distance <= hit.marker.radius).sort((a, b) => a.distance - b.distance
        || Number(a.marker.kind === "stand") - Number(b.marker.kind === "stand"))[0]?.marker;
      if (exactMarker && (!exactMarker.members || exactMarker.members.length === 1)) {
        const kind = exactMarker.members?.[0].kind ?? exactMarker.kind, id = exactMarker.members?.[0].id ?? exactMarker.id;
        if (kind === "stand") h.onSelect(id); else h.onInspect?.(kind as "mill" | "crew" | "truck" | "road", id);
        return;
      }
      const hitGroup = screenPicks.current.groups.filter(g => g.members.length > 1).map(group => {
        const p = m.project(group.position);
        return {group, distance: Math.hypot(p.x - e.point.x, p.y - e.point.y)};
      }).filter(hit => hit.distance <= (coarse ? 28 : 20)).sort((a, b) => a.distance - b.distance)[0]?.group;
      if (hitGroup && m.getZoom() < m.getMaxZoom() - 0.5) {
        const bounds = new maplibregl.LngLatBounds();
        hitGroup.positions.forEach(p => bounds.extend(p));
        const frame = m.getContainer();
        m.fitBounds(bounds, {padding: mapFitPadding(frame.clientWidth, frame.clientHeight, inspectorInset.current, reserveInspectorSpace),
          maxZoom: Math.min(22, m.getZoom() + 2), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300});
        return;
      }
      if (!picker) return;
      let infos: { layer?: { id: string } | null; object?: unknown }[] = [];
      try { infos = picker.pickMultipleObjects({ x: e.point.x, y: e.point.y, radius: coarse ? 14 : 5, depth: h.pickDepth }); } catch { /* picking needs a drawn frame */ }
      const nearby = mapScreenHits(screenPicks.current.markers, screenPicks.current.roads, p => m.project(p), e.point, coarse ? 14 : 5);
      const allItems = mapPickItems([...infos, ...nearby], h.name);
      const pointItems = mapPickItems(nearby.filter(info => info.layer?.id !== "network"), h.name);
      const roadItems = mapPickItems(nearby.filter(info => info.layer?.id === "network"), h.name);
      // A marker takes priority over a road beneath it. An exposed road still
      // opens its dossier even when it lies inside a large stand polygon.
      const items = pointItems.length ? allItems.filter(item => item.kind !== "road") : roadItems.length ? roadItems : allItems;
      if (!items.length) { h.onBackgroundTap?.(); return; }
      if (items.length > 1 && h.onPick) { h.onPick(items); return; }
      const [f] = items;
      if (f.kind === "stand") h.onSelect(f.id); else h.onInspect?.(f.kind, f.id);
    });
    m.on("moveend", () => {setViewTick(t => t + 1); emitCamera();});
    // Recompute symbol collision and size while pinch-zooming, not only after
    // the gesture ends. Quarter-level steps keep route recalculation bounded.
    let layoutZoom = Math.round(m.getZoom() * 4);
    m.on("zoom", () => {
      const next = Math.round(m.getZoom() * 4);
      if (next !== layoutZoom) { layoutZoom = next; setViewTick(t => t + 1); }
    });
    // The authored centre/zoom suits a desktop frame. A phone frame is much
    // narrower and partly covered by the inspector sheet, so the first view of
    // a region is fitted to its stands and mills. The frame can still change
    // size after mounting (the phone case chooser collapses it), so the fit
    // follows resizes until the player moves the map. It does not wait for
    // "load", which never fires while basemap tiles are unreachable.
    autoFit.current = fitted.current !== game.region.id;
    const fitRegion = () => {
      const frame = container.current;
      if (!autoFit.current || !frame || map.current !== m) return;
      const { clientWidth: w, clientHeight: h } = frame;
      const bounds = new maplibregl.LngLatBounds();
      for (const s of game.region.stands) { bounds.extend(s.position); s.polygon.forEach(p => bounds.extend(p)); }
      if (bounds.isEmpty() || w <= 0 || h <= 0) return;
      fitted.current = game.region.id;
      try {
        m.fitBounds(bounds, { duration: 0, maxZoom: game.region.zoom + 1,
          padding: mapFitPadding(w, h, inspectorInset.current, reserveInspectorSpace) });
      } catch { /* keep the authored view if the frame is too small to fit */ }
    };
    initialFit.current = fitRegion;
    const stopAutoFit = (event: { originalEvent?: unknown }) => { if (event.originalEvent) {autoFit.current = false; inspectionGesture.current = true;} };
    m.on("dragstart", stopAutoFit);
    m.on("zoomstart", stopAutoFit);
    m.on("rotatestart", stopAutoFit);
    m.on("pitchstart", stopAutoFit);
    const fitFrame = requestAnimationFrame(() => { m.resize(); fitRegion(); });
    // Every failed tile raises an error event; announce it once per map as a
    // brief notice instead of re-covering the map after each dismissal.
    let tileNoticeShown = false;
    m.on("error", () => {
      if (tileNoticeShown) return;
      tileNoticeShown = true;
      setError("Some basemap tiles could not load. Game roads and operations remain available.");
    });
    const observer = new ResizeObserver(() => { setFrameHeight(container.current?.clientHeight ?? 535); m.resize(); fitRegion(); });
    observer.observe(container.current);
    return () => {
      cancelAnimationFrame(fitFrame);
      observer.disconnect();
      if (initialFit.current === fitRegion) initialFit.current = null;
      camera.current={region:game.region.id,center:m.getCenter().toArray() as Position,zoom:m.getZoom(),bearing:m.getBearing(),pitch:m.getPitch()};
      m.removeControl(deck);
      m.remove();
      map.current = null;
      overlay.current = null;
    };
    // Remount only for a different region; plan changes update overlay data below.
  }, [game.region.id,language]);
  useEffect(() => {
    // Initial portal/peek geometry is measured after the map mounts. Refit once
    // it arrives, while initial fitting is still active; user gestures stop it.
    const frame = requestAnimationFrame(() => {if (autoFit.current) initialFit.current?.();});
    return () => cancelAnimationFrame(frame);
  }, [inspectorHeightPx, game.region.id]);
  useEffect(() => {
    const requestKey = cameraRequest ? `${game.region.id}:${cameraRequest.id}` : '';
    if (!map.current || !cameraRequest || requestKey === appliedCameraRequest.current || !validMapCamera(cameraRequest.camera)) return;
    appliedCameraRequest.current = requestKey;
    autoFit.current = false;
    map.current.jumpTo({...cameraRequest.camera});
  }, [cameraRequest, ready, game.region.id]);
  useEffect(() => {
    if (!map.current || !followReplay || replay === undefined || replayProgress === undefined || !replayResource || endStateOnly) return;
    const frame = routeReplayFrame(game.history[replay]?.movements, replayResource, replayProgress, replayMovementIndex);
    if (!frame) return;
    autoFit.current = false;
    const center = map.current.getCenter();
    if (Math.abs(center.lng - frame.position[0]) + Math.abs(center.lat - frame.position[1]) > 1e-8) map.current.jumpTo({center: frame.position});
  }, [ready, followReplay, replay, replayResource, replayProgress, replayMovementIndex, endStateOnly]);
  useEffect(() => {
    if (!map.current || !inspectorFeature || inspectorFeature.requestId === 0) return;
    const identity = `${game.region.id}:${inspectorFeature.kind}:${inspectorFeature.id}:${inspectorFeature.requestId}`;
    if (inspectionIdentity.current !== identity) {inspectionIdentity.current = identity; inspectionGesture.current = false;}
    if (inspectionGesture.current) return;
    const key = `${identity}:${Math.round(inspectorHeightPx ?? 0)}`;
    if (inspectionRequest.current === key) return;
    const m = map.current;
    // Portal layout can report its inset after the first inspection render.
    // Treat the measured geometry as part of the request, so a late inset
    // retries the visibility check instead of consuming it against the peek.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (map.current !== m || inspectionGesture.current) return;
        inspectionRequest.current = key;
        const report = replay === undefined ? undefined : game.history[replay];
        const view = report?.snapshot ? {...game, ...report.snapshot} : game;
        const {kind, id} = inspectorFeature, r = view.region;
        let position: Position | undefined;
        if (kind === "stand") position = r.stands.find(s => s.id === id)?.position;
        else if (kind === "mill") position = r.mills.find(item => item.id === id)?.position;
        else if (kind === "road") { const path = r.roads.edges.find(item => item.id === id)?.geometry; position = path?.[Math.floor(path.length / 2)]; }
        else { const node = kind === "crew" ? view.crewPositions[id] : view.truckPositions[id]; position = r.roads.nodes.find(item => item.id === node)?.position; }
        if (!position) return;
        const frame = m.getContainer(), point = m.project(position);
        const offset = mapFocusOffset(point, {w: frame.clientWidth, h: frame.clientHeight}, inspectorInset.current ?? 0);
        if (!offset) return;
        autoFit.current = false;
        m.panBy(offset, {duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 250});
      });
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [inspectorFeature, inspectorHeightPx, ready, game.region.id]);
  useEffect(() => {
    if (!error.startsWith("Some basemap")) return;
    const timer = setTimeout(() => setError(e => e.startsWith("Some basemap") ? "" : e), 8000);
    return () => clearTimeout(timer);
  }, [error]);
  useEffect(() => {
    if (map.current && ready)
      map.current.setStyle(
        style === "dark"
          ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      );
  }, [style,ready]);
  useEffect(() => {
    if (!overlay.current) return;
    const historical = replay !== undefined ? game.history[replay] : undefined;
    const view: Game = historical?.snapshot
      ? { ...game, ...historical.snapshot }
      : game;
    const finished = !historical && game.week > game.region.weeks;
    const openRoads = finished ? null : replayRoadIds(game,historical);
    const replayFrame = !endStateOnly && historical && replayResource && replayProgress !== undefined
      ? routeReplayFrame(historical.movements, replayResource, replayProgress, replayMovementIndex) : null;
    const r = historical || finished ? view.region : operatingRegion(game, true),
      w = historical?.weather ?? weatherAt(game, true);
    const paths: {
      path: Position[];
      kind: string;
      resource: string;
      volume?: number;
    }[] = historical && !endStateOnly ? recordedMovements(historical.movements).map((m) => ({ ...m })) : [];
    if (!historical && !finished) {
      for (const c of r.crews) {
        let at = view.crewPositions[c.id];
        for (const o of game.plan.crews[c.id] ?? []) {
          const s = r.stands.find((s) => s.id === o.stand)!;
          const p = route(r, at, s.node, w, view.improvedRoads);
          if (p) paths.push({ path: p.path, kind: "crew", resource: c.id });
          at = s.node;
        }
      }
      for (const t of r.trucks) {
        let at = view.truckPositions[t.id];
        for (const o of game.plan.trucks[t.id] ?? []) {
          const s = r.stands.find((s) => s.id === o.stand)!,
            m = r.mills.find((m) => m.id === o.mill)!;
          const a = route(r, at, s.node, w, view.improvedRoads),
            b = route(r, s.node, m.node, w, view.improvedRoads);
          if (a && b)
            paths.push({
              path: [...a.path, ...b.path.slice(1)],
              kind: "truck",
              resource: t.id,
            });
          at = m.node;
        }
        for(const order of game.plan.reciprocal??[]){
          const pair=r.reciprocalPairs?.find(p=>p.id===order.pair);
          if(!pair)continue;
          for(const leg of [{truck:order.truckA,stand:pair.standA,mill:pair.millB},{truck:order.truckB,stand:pair.standB,mill:pair.millA}]){
            if(leg.truck!==t.id)continue;
            const from=r.stands.find(s=>s.id===leg.stand),to=r.mills.find(m=>m.id===leg.mill);
            if(!from||!to)continue;
            const empty=route(r,at,from.node,w,view.improvedRoads),loaded=route(r,from.node,to.node,w,view.improvedRoads);
            if(empty&&loaded)paths.push({path:[...empty.path,...loaded.path.slice(1)],kind:'truck',resource:`${t.id} · ${tr('Reciprocal delivery')} ${pair.id}`});
            at=to.node;
          }
        }
        for (const order of game.plan.facilityTransfers?.filter(o=>o.truck===t.id) ?? []) {
          const link = r.facilityTransfers?.find(l=>l.id===order.link);
          const from = r.mills.find(m=>m.id===link?.source), to = r.mills.find(m=>m.id===link?.target);
          if (!from || !to) continue;
          const empty = route(r,at,from.node,w,view.improvedRoads), loaded = route(r,from.node,to.node,w,view.improvedRoads);
          if (empty && loaded) paths.push({path:[...empty.path,...loaded.path.slice(1)],kind:"truck",resource:`${t.id} · facility transfer ${link!.id}`});
          at = to.node;
        }
      }
    }
    const values = new Map(mapStandValues(game, historical).map(row => [row.id, row]));
    const standColor = (d: {id: string}): MapColor => lens === 'rights' && d.id === selected ? [232, 174, 51, 220] : standLensColor(values.get(d.id)!, lens);
    const volume = (n: number | null) => n === null ? (language === 'fr' ? 'Non enregistré' : 'Not recorded') : `${n.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1})} m³`;
    const standData = layers.stands
      ? r.stands.filter(s=>!visibleStandIds || visibleStandIds.includes(s.id)).map((s) => {
          const value = values.get(s.id)!;
          const terrain = value.terrainOpen === null ? (language === 'fr' ? 'Accès inconnu' : 'Access unknown') : value.terrainOpen ? (language === 'fr' ? 'Terrain accessible' : 'Terrain accessible') : (language === 'fr' ? 'Terrain restreint' : 'Terrain restricted');
          return {...s, tooltip: `${s.id} · ${s.name}\n${language === 'fr' ? 'Sur pied' : 'Standing'}: ${volume(value.standing)} · ${language === 'fr' ? 'Bord de route' : 'Roadside'}: ${volume(value.roadside)}\n${terrain}`};
        })
      : [];
    const planned = new Set([selected, ...Object.values(game.plan.crews).flat().map(o => o.stand), ...Object.values(game.plan.trucks).flat().map(o => o.stand)]);

    // Equipment icons are fixed-pixel; below the region's authored zoom they
    // would pile into one blob over the stands, so they shrink with the view.
    const zoom = map.current?.getZoom() ?? game.region.zoom;
    const detail = mapDetail(zoom, game.region.zoom);
    const siteGroups = (map.current ? groupMapSites(standData, map.current, detail.clusterDistance) : []).map(group => ({...group,
      tooltip: group.members.length > 1
        ? language === "fr" ? `${group.members.length} emplacements proches · toucher pour agrandir` : `${group.members.length} nearby inventory locations · tap to zoom`
        : standData.find(s => s.id === group.id)?.tooltip,
    }));
    const pointRadius = (d: MapSiteGroup) => d.members.length > 1 ? 14 : d.id === selected ? 9 : 6;
    const pointColor = (d: MapSiteGroup): MapColor => d.members.length > 1 ? [42, 93, 69, 240] : standColor(d);
    const pointSelected = (d: MapSiteGroup) => d.members.some(member => member.id === selected);
    const polygonData = detail.polygons ? standData : standData.filter(s => s.id === selected && detail.band !== 'overview');
    const individualSiteIds = new Set(siteGroups.filter(group => group.members.length === 1).map(group => group.id));
    const labelStands = r.stands.filter(s => (!visibleStandIds || visibleStandIds.includes(s.id))
      && (detail.allLabels || (individualSiteIds.has(s.id) && (s.id === selected || (detail.band === 'district' && planned.has(s.id))))));
    const roadData = layers.roads ? view.region.roads.edges.filter(edge => detail.band !== 'overview' || edge.roadClass === 'public') : [];
    const iconScale = detail.individualFleet ? mapSymbolScale(zoom, game.region.zoom) : 0.65;
    const nodePosition = (node: string) => r.roads.nodes.find(n => n.id === node)?.position;
    // A legacy report has no recorded fleet snapshot: today's positions are
    // not evidence of where equipment finished a historical turn.
    const fleetMembers = layers.fleet && (!historical || historical.snapshot) ? [
      ...r.crews.map(c => ({ id: c.id, kind: "crew" as const, node: view.crewPositions[c.id], position: nodePosition(view.crewPositions[c.id]) })),
      ...r.trucks.map(t => ({ id: t.id, kind: "truck" as const, node: view.truckPositions[t.id], position: nodePosition(view.truckPositions[t.id]) })),
    ].filter((member): member is typeof member & {position: Position} =>
      !!member.position && (!replayFrame || member.id !== replayResource)
      && ((detail.individualFleet && !historical) || (inspectorFeature?.kind === member.kind && inspectorFeature.id === member.id))) : [];
    const replayMarker = layers.fleet && replayFrame ? [{
      id: replayFrame.movement.resource, kind: replayFrame.movement.kind,
      position: replayFrame.position,
      name: `${replayFrame.movement.resource} · ${language === "fr" ? "Progression du trajet" : "Route progression"} · ${replayFrame.movementIndex + 1}/${replayFrame.movementCount}`,
    }] : [];
    const container = map.current?.getContainer();
    const visibleMills = detail.band === "overview" ? r.mills.filter(mill => inspectorFeature?.kind === "mill" && inspectorFeature.id === mill.id) : r.mills;
    const symbols = map.current ? layoutSymbols({
      map: map.current, frame: { w: container?.clientWidth ?? 0, h: container?.clientHeight ?? 0 }, scale: iconScale,
      mills: visibleMills, fleet: fleetMembers, stands: layers.labels ? labelStands : [], priority: planned, keep: selected,
      showTags: !historical && detail.individualFleet,
    }) : { symbols: [...visibleMills.map(m => ({ kind: "mill" as const, id: m.id, position: m.position })), ...fleetMembers]
      .map(f => ({ kind: f.kind, members: [{ id: f.id, kind: f.kind }], position: f.position, offset: [0, 0] as [number, number] })), tags: [], labels: [] };
    const symbolName = (kind: "mill" | "crew" | "truck", id: string) => {
      if (kind === "mill") return r.mills.find(m => m.id === id)?.name ?? id;
      const resource = kind === "crew" ? r.crews.find(c => c.id === id) : r.trucks.find(t => t.id === id);
      return `${resource?.name ?? id} · ${historical ? tr("recorded location") : tr(equipmentStatus(game, kind, id))}`;
    };
    // One entry per drawn icon: a single feature, or a cluster whose tap lists every member.
    const symbolData = (kind: "mill" | "fleet") => symbols.symbols.filter(f => (f.kind === "mill") === (kind === "mill"))
      .map(f => ({ ...f, id: f.members[0].id, name: f.members.map(m => symbolName(m.kind, m.id)).join("\n") }));
    screenPicks.current = {
      markers: [
        ...siteGroups.map(s => ({...s, kind: "stand" as const, radius: pointRadius(s)})),
        ...symbolData("mill").map(s => ({...s, radius: 18 * iconScale})),
        ...symbolData("fleet").map(s => ({...s, radius: 16 * iconScale})),
        ...replayMarker.map(s => ({...s, radius: 18})),
      ],
      roads: roadData,
      groups: siteGroups,
    };
    overlay.current.setProps({
      getTooltip: ({ object }: { object?: Record<string, unknown> }) =>
        object
          ? {
              text: String(
                object.tooltip ?? object.name ?? object.resource ?? "Operation",
              ),
              style: {
                backgroundColor: "#173e32",
                color: "white",
                fontSize: "12px",
              },
            }
          : null,
      layers: [
        new PathLayer({
          id: "network",
          data: roadData,
          getPath: (d) => d.geometry,
          getColor: (d) =>
            openRoads===null?[145,145,145]:!openRoads.has(d.id)
              ? [198, 75, 57]
              : view.improvedRoads.includes(d.id)
              ? [55, 140, 174]
              : canAccess(d.bearing, w[d.zone])
                ? [116, 120, 94]
                : [198, 75, 57],
          getWidth: detail.roadWidth,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
          pickable: true,
        }),
        new PolygonLayer({
          id: "stands",
          data: polygonData,
          getPolygon: (d) => d.polygon,
          getFillColor: d => {const c = standColor(d); return [c[0], c[1], c[2], 115];},
          getLineColor: (d) =>
            d.id === selected ? [232, 174, 51] : [255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          stroked: true,
          pickable: true,
        }),
        // Outlines are a few pixels wide at district zoom; a marker keeps
        // every stand visible and large enough to tap.
        new ScatterplotLayer({
          id: "stand-points",
          data: siteGroups,
          getPosition: (d) => d.position,
          getRadius: pointRadius,
          radiusUnits: "pixels",
          getFillColor: pointColor,
          getLineColor: (d) => (pointSelected(d) ? [232, 174, 51] : [255, 255, 255]),
          getLineWidth: (d) => (pointSelected(d) ? 3 : 1.5),
          lineWidthUnits: "pixels",
          stroked: true,
          pickable: true,
        }),
        new TextLayer({
          id: "stand-group-count", data: siteGroups.filter(g => g.members.length > 1),
          getPosition: d => d.position, getText: d => String(d.members.length),
          getColor: [255, 255, 255], getSize: 12, fontWeight: 700, pickable: false,
        }),
        new PathLayer({
          id: "routes",
          data: layers.routes ? paths : [],
          getPath: (d) => d.path,
          getColor: (d) =>
            d.kind === "crew" ? [226, 148, 35, replayFrame ? 70 : 210] : [32, 117, 194, replayFrame ? 70 : 210],
          getWidth: 4,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
          pickable: true,
        }),
        new PathLayer({
          id: "replay-travelled",
          data: layers.routes && replayFrame ? replayFrame.travelled.filter(path => path.length > 1) : [],
          getPath: (path) => path,
          getColor: replayFrame?.movement.kind === "crew" ? [226, 148, 35, 255] : [32, 117, 194, 255],
          getWidth: 5, widthUnits: "pixels", jointRounded: true, capRounded: true,
        }),
        new IconLayer({
          id: "mills",
          data: symbolData("mill"),
          getPosition: (d) => d.position,
          getIcon: () => ({url:`${import.meta.env.BASE_URL}icons/mill.svg`,width:48,height:48,anchorY:24}),
          getSize: 36 * iconScale,
          sizeUnits: "pixels",
          pickable: true,
        }),
        new IconLayer({
          id: "fleet",
          data: symbolData("fleet"),
          getPosition: (d) => d.position,
          getIcon: (d) => ({url:`${import.meta.env.BASE_URL}icons/${d.kind === "crew" ? "harvester" : "log-truck"}.svg`,width:48,height:48,anchorY:24}),
          getSize: 32 * iconScale,
          sizeUnits: "pixels",
          getPixelOffset: (d) => d.offset,
          pickable: true,
        }),
        new ScatterplotLayer({
          id: "replay-marker-halo",
          data: replayMarker,
          getPosition: (d) => d.position,
          getRadius: 22, radiusUnits: "pixels",
          getFillColor: [255, 255, 255, 210],
          getLineColor: [23, 62, 50, 230],
          stroked: true, getLineWidth: 2, lineWidthUnits: "pixels",
        }),
        new IconLayer({
          id: "replay-fleet",
          data: replayMarker,
          getPosition: (d) => d.position,
          getIcon: (d) => ({url:`${import.meta.env.BASE_URL}icons/${d.kind === "crew" ? "harvester" : "log-truck"}.svg`,width:48,height:48,anchorY:24}),
          getSize: 36, sizeUnits: "pixels", pickable: true,
        }),
        new TextLayer({
          id: "fleet-count",
          characterSet: "auto",
          data: symbols.symbols.filter(f => f.members.length > 1).map(f => ({ ...f, id: f.members[0].id })),
          getPosition: (d) => d.position,
          getText: (d) => `×${d.members.length}`,
          // Matches the badge box used by layoutSymbols.
          getPixelOffset: (d) => [d.offset[0] + 14 * iconScale, d.offset[1] - 14 * iconScale],
          getSize: 11, getColor: [255, 255, 255], fontWeight: 700,
          background: true, getBackgroundColor: [23, 62, 50, 240], backgroundPadding: [4, 2],
          pickable: true,
        }),
        new TextLayer({
          id: "fleet-status",
          characterSet: "auto",
          data: symbols.tags,
          getPosition: (d) => d.position,
          getText:d=>`${equipmentStatus(game,d.kind,d.id)==='Unavailable'?'⊘':equipmentStatus(game,d.kind,d.id)==='Scheduled'?'▣':equipmentStatus(game,d.kind,d.id)==='Season complete'?'✓':'○'} ${d.id}`,
          getPixelOffset: (d) => d.offset,
          getSize:11,getColor:[25,50,40],background:true,getBackgroundColor:[255,255,255,230],backgroundPadding:[3,2],pickable:true,
        }),
        new TextLayer({
          id: "labels",
          characterSet: "auto",
          data: symbols.labels,
          getPosition: (d) => d.position,
          getText: (d) => d.id,
          getColor: [21, 44, 32],
          getSize: 12,
          getPixelOffset: (d) => d.offset,
          getTextAnchor: (d) => d.anchor,
          fontFamily: "system-ui",
          background: true,
          getBackgroundColor: [255, 255, 255, 220],
          backgroundPadding: [3, 2],
          pickable: true,
        }),
      ],
    });
  }, [language,game, selected, layers, lens, ready, replay, replayProgress, replayResource, replayMovementIndex, endStateOnly, visibleStandIds, inspectorFeature, viewTick]);
  const fit = (planOnly = false) => {
    const activeMap = map.current;
    if (!activeMap) return;
    closeDetails(container.current?.parentElement?.querySelector<HTMLDetailsElement>(".map-layer-menu") ?? null);
    onFitRequest?.();
    // The workbench may first reduce the sheet height. Fit its newly visible
    // viewport, with the updated inset from the sheet's ResizeObserver.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (map.current === activeMap) fitView(planOnly);
    }));
  };
  const fitView = (planOnly = false) => {
    autoFit.current = false;
    const bounds = new maplibregl.LngLatBounds();
    const frame = map.current?.getContainer();
    const fitOptions = {
      padding: mapFitPadding(frame?.clientWidth ?? 800, frame?.clientHeight ?? 600, inspectorInset.current, reserveInspectorSpace),
      maxZoom: Math.min(22, game.region.zoom + 2),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600,
    };
    if (replay !== undefined && planOnly) {
      const recorded = game.history[replay];
      for (const movement of recordedMovements(recorded?.movements))
        for (const position of movement.path) bounds.extend(position);
      if (!bounds.isEmpty()) map.current?.fitBounds(bounds, fitOptions);
      return;
    }
    const ids = new Set([
      ...Object.values(game.plan.crews)
        .flat()
        .map((o) => o.stand),
      ...Object.values(game.plan.trucks)
        .flat()
        .map((o) => o.stand),
    ]);
    const areas = game.region.stands.filter(
      (s) => !planOnly || (!ids.size && !game.plan.facilityTransfers?.length) || ids.has(s.id),
    );
    areas.forEach((s) => { bounds.extend(s.position); s.polygon.forEach(p => bounds.extend(p)); });
    if (planOnly)
      for (const o of Object.values(game.plan.trucks).flat()) {
        const m = game.region.mills.find((m) => m.id === o.mill);
        if (m) bounds.extend(m.position);
      }

    if (planOnly) for (const order of game.plan.facilityTransfers ?? []) {
      const link = game.region.facilityTransfers?.find(l=>l.id===order.link);
      for (const id of [link?.source,link?.target]) {
        const mill = game.region.mills.find(m=>m.id===id);
        if (mill) bounds.extend(mill.position);
      }
      const origin = game.region.roads.nodes.find(n=>n.id===game.truckPositions[order.truck]);
      if(origin) bounds.extend(origin.position);
    }
    if(planOnly)for(const order of game.plan.reciprocal??[]){
      const pair=game.region.reciprocalPairs?.find(p=>p.id===order.pair);if(!pair)continue;
      for(const id of [pair.standA,pair.standB]){const stand=game.region.stands.find(s=>s.id===id);if(stand)bounds.extend(stand.position);}
      for(const id of [pair.millA,pair.millB]){const mill=game.region.mills.find(m=>m.id===id);if(mill)bounds.extend(mill.position);}
    }
    if(bounds.isEmpty()) return;
    map.current?.fitBounds(bounds, fitOptions);
  };
  // Both map tool panels dismiss the same way. In the narrow sheet layout an
  // open panel covers its own summary, so it also needs an in-panel control.
  const closeDetails = (panel: HTMLDetailsElement | null) => {
    if (!panel) return;
    panel.open = false;
    panel.querySelector("summary")?.focus();
  };
  const closePanel = (event: React.MouseEvent<HTMLButtonElement>) =>
    closeDetails(event.currentTarget.closest("details"));
  const dismissOnEscape = (event: React.KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key !== "Escape" || !event.currentTarget.open) return;
    event.preventDefault();
    event.stopPropagation();
    closeDetails(event.currentTarget);
  };
  return (
    <div className="geo-map" data-map-ready={ready} style={{"--map-visible-height": `${Math.max(120, frameHeight - (inspectorHeightPx ?? 0))}px`} as React.CSSProperties}>
      <div
        ref={container}
        className="map-canvas"
        aria-label={`${tr("Interactive map of")} ${game.region.name}`}
      />
      <div className="geo-tools">
        <details className="map-layer-menu" onKeyDown={dismissOnEscape} onToggle={event => {if (event.target === event.currentTarget && event.currentTarget.open) onFitRequest?.();}}>
          <summary>{language === 'fr' ? 'Outils de carte' : 'Map tools'}</summary>
          <div className="map-layer-options">
            <button className="map-panel-close" onClick={closePanel}>{tr("Close")}</button>
            {showLensControl && <MapLensSelect value={lens} onChange={changeLens}/>}
            <button onClick={() => fit()}>{tr("Fit district")}</button>
            {!endStateOnly && <button onClick={() => fit(true)}>{replay === undefined ? tr("Fit plan") : language === "fr" ? "Cadrer les trajets enregistrés" : "Fit recorded routes"}</button>}
            <button onClick={() => setStyle(style === "light" ? "dark" : "light")}>{tr(style === "light" ? "Dark map" : "Light map")}</button>
            <details className="map-tool-legend">
              <summary>{tr("Map legend")}</summary>
              <MapLensLegend lens={lens}/>
              <p>{language === "fr" ? "Les groupes comptent les emplacements, pas les parcelles ni les valeurs de volume." : "Groups count inventory locations, rather than parcel boundaries or volume values."}</p>
              <p>{language === 'fr' ? 'Les nombres regroupent les emplacements proches. Touchez un nombre pour agrandir; les sites, les noms et les équipements apparaissent progressivement.' : 'Counts group nearby locations. Tap a count to zoom in; sites, names and equipment appear as you get closer.'}</p>
              <p>{tr("Roads: olive = modelled open; red = seasonal, authorization or closure restriction; blue = upgraded; gray = historical access not recorded.")}</p>
              <p>{tr("Routes: amber = crew relocation; blue = truck movement. Stand labels show area IDs.")}</p>
              <p>{tr("Fleet states: ○ Idle · ▣ Scheduled · ⊘ Unavailable · ✓ Season complete. These describe orders and known disruptions, not guaranteed fulfillment.")}</p>
            </details>
            <details><summary>{language === 'fr' ? 'Calques' : 'Layers'}</summary>
              {Object.entries(layers).map(([id, on]) => <label key={id}><input type="checkbox" checked={on} onChange={() => setLayers({...layers, [id]: !on})}/>{tr(id)}</label>)}
            </details>
            <details className="map-lens-details">
              <summary>{language === 'fr' ? 'Valeurs sans la carte' : 'Values without the map'}</summary>
              <MapLensValues rows={lensRows.filter(row => !visibleStandIds || visibleStandIds.includes(row.id))} lens={lens} selected={selected} onSelect={onSelect} recorded={replay !== undefined} finished={game.week > game.region.weeks}/>
            </details>
          </div>
        </details>
      </div>
      <div className="geo-caption">
        {replay===undefined?(game.week > game.region.weeks ? tr('Season complete') : tr("Forecast plan")):`${tr("Turn")} ${game.history[replay]?.week ?? replay+1} · ${endStateOnly ? (language === 'fr' ? 'état de fin' : 'end state') : tr("actual routes")}`} · {mapLensName(lens, language)} · {tr("Mapped roads / teaching operations")}
        {game.region.sources.some(s => s.note.includes("Open Government Licence")) && <span> {tr("· Data: Province of British Columbia (OGL–BC)")}</span>}
      </div>
      {error && (
        <button className={`map-error${error.startsWith("Some basemap") ? " map-notice" : ""}`} onClick={() => setError("")}>
          {tr(error)} ×
        </button>
      )}
    </div>
  );
}
