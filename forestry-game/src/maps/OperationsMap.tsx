import {replayRoadIds} from '../simulation/replay-roads';
import {useLanguage} from "../i18n";
import {equipmentStatus,ProductSymbol} from '../OperationalSymbols';
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
import { stockAt, sum } from "../simulation/engine";
export type MapPick = { kind: "stand" | "mill" | "crew" | "truck" | "road"; id: string; name: string };
const pickKinds: Record<string, MapPick["kind"] | "fleet"> = { stands: "stand", "stand-points": "stand", labels: "stand", mills: "mill", fleet: "fleet", "fleet-status": "fleet", network: "road" };
/** Stand labels drawn at the current zoom: the selected and planned sites win, then any label that does not overlap one already placed. */
export function declutteredLabels(m: maplibregl.Map, stands: { id: string; position: Position }[], priority: Set<string>) {
  const { clientWidth: w, clientHeight: h } = m.getContainer();
  const placed: [number, number, number, number][] = [], shown = new Set<string>();
  for (const s of [...stands].sort((a, b) => Number(priority.has(b.id)) - Number(priority.has(a.id)))) {
    const p = m.project(s.position as [number, number]);
    if (p.x < -40 || p.y < -40 || p.x > w + 40 || p.y > h + 40) continue;
    const half = s.id.length * 3.8 + 5, box: [number, number, number, number] = [p.x - half, p.y - 30, p.x + half, p.y - 8];
    if (placed.some(o => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
    placed.push(box); shown.add(s.id);
  }
  return shown;
}
export default function OperationsMap({
  game,
  selected,
  onSelect,
  replay,
  visibleStandIds,
  onInspect,
  onPick,
  onBackgroundTap,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  replay?: number;
  visibleStandIds?: string[];
  onInspect?: (kind: "mill" | "crew" | "truck" | "road", id: string) => void;
  /** Several features under one tap; without it the top feature is selected. */
  onPick?: (items: MapPick[]) => void;
  /** A tap that hit no feature. */
  onBackgroundTap?: () => void;
}) {
  const {t:tr,language}=useLanguage();
  const camera=useRef<{region:string;center:Position;zoom:number;bearing:number;pitch:number}|null>(null);
  // Region whose first view has been fitted; kept apart from the saved camera
  // because a development double mount saves the camera before the fit runs.
  const fitted=useRef<string|null>(null);
  const autoFit=useRef(false);
  const [viewTick, setViewTick] = useState(0);
  // The map is created once per region, so its tap handler reads the latest
  // callbacks and names from this ref.
  const handlers = useRef({ onSelect, onInspect, onPick, onBackgroundTap, name: (_kind: MapPick["kind"], id: string) => id });
  handlers.current = { onSelect, onInspect, onPick, onBackgroundTap, name: (kind, id) => {
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
        bearing:camera.current?.region===game.region.id?camera.current.bearing:0,
        pitch:camera.current?.region===game.region.id?camera.current.pitch:0,
        locale: language==='fr'?{'Map.Title':'Carte','NavigationControl.ZoomIn':'Agrandir','NavigationControl.ZoomOut':'Réduire','NavigationControl.ResetBearing':'Faire pivoter; cliquer pour rétablir le nord','AttributionControl.ToggleAttribution':'Afficher les attributions','CooperativeGesturesHandler.WindowsHelpText':'Utilisez Ctrl et la molette pour zoomer','CooperativeGesturesHandler.MacHelpText':'Utilisez ⌘ et la molette pour zoomer','CooperativeGesturesHandler.MobileHelpText':'Utilisez deux doigts pour déplacer la carte'}:undefined,
        attributionControl: { compact: true },
        canvasContextAttributes: { antialias: true },
        pixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
      });
    } catch {
      setError(
        "WebGL map initialization failed. Supply tables and all game controls remain available.",
      );
      return;
    }
    map.current = m;
    const deck = new MapboxOverlay({
      interleaved: true,
      pickingRadius: window.matchMedia("(pointer: coarse)").matches ? 14 : 5,
      useDevicePixels: true,
      layers: [],
    });
    overlay.current = deck;
    m.addControl(deck);
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.addControl(new maplibregl.ScaleControl(), "bottom-left");
    m.on("load", () => setReady(true));
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    // One handler resolves every tap: a finger covers several small features,
    // so everything within the touch radius is collected and the caller can
    // offer a choice instead of guessing the top layer.
    m.on("click", (e) => {
      const h = handlers.current, picker = overlay.current;
      if (!picker) return;
      let infos: { layer?: { id: string } | null; object?: unknown }[] = [];
      try { infos = picker.pickMultipleObjects({ x: e.point.x, y: e.point.y, radius: coarse ? 14 : 5, depth: 12 }); } catch { /* picking needs a drawn frame */ }
      const seen = new Map<string, MapPick>();
      for (const info of infos) {
        const layerKind = pickKinds[info.layer?.id ?? ""], object = info.object as { id?: string; kind?: string } | undefined;
        if (!layerKind || !object?.id) continue;
        const kind = layerKind === "fleet" ? object.kind as "crew" | "truck" : layerKind;
        if (!seen.has(`${kind}:${object.id}`)) seen.set(`${kind}:${object.id}`, { kind, id: object.id, name: h.name(kind, object.id) });
      }
      const features = [...seen.values()], specific = features.filter(f => f.kind !== "road");
      const items = specific.length ? specific : features.slice(0, 1);
      if (!items.length) { h.onBackgroundTap?.(); return; }
      if (items.length > 1 && h.onPick) { h.onPick(items); return; }
      const [f] = items;
      if (f.kind === "stand") h.onSelect(f.id); else h.onInspect?.(f.kind, f.id);
    });
    m.on("moveend", () => setViewTick(t => t + 1));
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
      for (const s of game.region.stands) bounds.extend(s.position);
      for (const mill of game.region.mills) bounds.extend(mill.position);
      if (bounds.isEmpty() || w <= 0 || h <= 0) return;
      fitted.current = game.region.id;
      try {
        m.fitBounds(bounds, { duration: 0, maxZoom: game.region.zoom + 1, padding: w < 700
          ? { top: 64, left: 28, right: 28, bottom: Math.max(24, Math.min(h * 0.45 + 48, h - 160)) }
          : { top: 70, left: 45, right: 45, bottom: 45 } });
      } catch { /* keep the authored view if the frame is too small to fit */ }
    };
    const stopAutoFit = (event: { originalEvent?: unknown }) => { if (event.originalEvent) autoFit.current = false; };
    m.on("dragstart", stopAutoFit);
    m.on("zoomstart", stopAutoFit);
    m.on("rotatestart", stopAutoFit);
    m.on("pitchstart", stopAutoFit);
    const fitFrame = requestAnimationFrame(() => { m.resize(); fitRegion(); });
    m.on("error", () =>
      setError(
        "Some basemap tiles could not load. Game roads and operations remain available.",
      ),
    );
    const observer = new ResizeObserver(() => { m.resize(); fitRegion(); });
    observer.observe(container.current);
    return () => {
      cancelAnimationFrame(fitFrame);
      observer.disconnect();
      camera.current={region:game.region.id,center:m.getCenter().toArray() as Position,zoom:m.getZoom(),bearing:m.getBearing(),pitch:m.getPitch()};
      m.removeControl(deck);
      m.remove();
      map.current = null;
      overlay.current = null;
    };
    // Remount only for a different region; plan changes update overlay data below.
  }, [game.region.id,language]);
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
    const openRoads=replayRoadIds(game,historical);
    const r = historical?view.region:operatingRegion(game, true),
      w = historical?.weather ?? weatherAt(game, true);
    const paths: {
      path: Position[];
      kind: string;
      resource: string;
      volume?: number;
    }[] = historical ? historical.movements.map((m) => ({ ...m })) : [];
    if (!historical) {
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
    const standColor = (d: { id: string; supply: string }): [number, number, number, number] =>
      d.id === selected
        ? [232, 174, 51, 220]
        : d.supply === "protected"
          ? [136, 93, 160, 150]
          : view.stands.find((s) => s.id === d.id)?.owned
            ? [34, 124, 79, 185]
            : [205, 149, 89, 165];
    const standData = layers.stands
      ? r.stands.filter(s=>!visibleStandIds || visibleStandIds.includes(s.id)).map((s) => ({
          ...s,
          tooltip: `${s.id} · ${s.name}\n${Math.round(view.stands.find((t) => t.id === s.id)!.remaining).toLocaleString()} m³ standing · ${Math.round(sum(stockAt(view, s.id)))} m³ roadside\n${s.zone} · ${s.supply}`,
        }))
      : [];
    const planned = new Set([selected, ...Object.values(game.plan.crews).flat().map(o => o.stand), ...Object.values(game.plan.trucks).flat().map(o => o.stand)]);
    const labelStands = r.stands.filter(s=>!visibleStandIds || visibleStandIds.includes(s.id));
    const shownLabels = map.current ? declutteredLabels(map.current, labelStands, planned) : null;
    // Equipment icons are fixed-pixel; below the region's authored zoom they
    // would pile into one blob over the stands, so they shrink with the view.
    const zoom = map.current?.getZoom() ?? game.region.zoom;
    const iconScale = Math.min(1, Math.max(0.5, 1 - 0.3 * (game.region.zoom - zoom)));
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
          data: layers.roads ? view.region.roads.edges : [],
          getPath: (d) => d.geometry,
          getColor: (d) =>
            openRoads===null?[145,145,145]:!openRoads.has(d.id)
              ? [198, 75, 57]
              : view.improvedRoads.includes(d.id)
              ? [55, 140, 174]
              : canAccess(d.bearing, w[d.zone])
                ? [116, 120, 94]
                : [198, 75, 57],
          getWidth: 3,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
          pickable: true,
        }),
        new PolygonLayer({
          id: "stands",
          data: standData,
          getPolygon: (d) => d.polygon,
          getFillColor: standColor,
          getLineColor: (d) =>
            d.id === selected ? [255, 242, 159] : [255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          stroked: true,
          pickable: true,
        }),
        // Outlines are a few pixels wide at district zoom; a marker keeps
        // every stand visible and large enough to tap.
        new ScatterplotLayer({
          id: "stand-points",
          data: standData,
          getPosition: (d) => d.position,
          getRadius: (d) => (d.id === selected ? 8 : 5.5),
          radiusUnits: "pixels",
          getFillColor: standColor,
          getLineColor: (d) => (d.id === selected ? [255, 242, 159] : [255, 255, 255]),
          getLineWidth: (d) => (d.id === selected ? 2.5 : 1.5),
          lineWidthUnits: "pixels",
          stroked: true,
          pickable: true,
        }),
        new PathLayer({
          id: "routes",
          data: layers.routes ? paths : [],
          getPath: (d) => d.path,
          getColor: (d) =>
            d.kind === "crew" ? [226, 148, 35, 210] : [32, 117, 194, 210],
          getWidth: 4,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
          pickable: true,
        }),
        new IconLayer({
          id: "mills",
          data: r.mills,
          getPosition: (d) => d.position,
          getIcon: () => ({url:`${import.meta.env.BASE_URL}icons/mill.svg`,width:48,height:48,anchorY:24}),
          getSize: 36 * iconScale,
          sizeUnits: "pixels",
          pickable: true,
        }),
        new IconLayer({
          id: "fleet",
          data: layers.fleet
            ? [
                ...r.crews.map((c) => ({
                  id: c.id,
                  kind: "crew",
                  position: r.roads.nodes.find(
                    (n) => n.id === view.crewPositions[c.id],
                  )!.position,
                  name: `${c.name} · ${historical ? tr("recorded location") : tr(equipmentStatus(game,"crew",c.id))}`,
                })),
                ...r.trucks.map((t) => ({
                  id: t.id,
                  kind: "truck",
                  position: r.roads.nodes.find(
                    (n) => n.id === view.truckPositions[t.id],
                  )!.position,
                  name: `${t.name} · ${historical ? tr("recorded location") : tr(equipmentStatus(game,"truck",t.id))}`,
                })),
              ]
            : [],
          getPosition: (d) => d.position,
          getIcon: (d) => ({url:`${import.meta.env.BASE_URL}icons/${d.kind === "crew" ? "harvester" : "log-truck"}.svg`,width:48,height:48,anchorY:24}),
          getSize: 32 * iconScale,
          sizeUnits: "pixels",
          getPixelOffset: (d) => {
            const positions = d.kind === "crew" ? view.crewPositions : view.truckPositions;
            const group = Object.keys(positions).filter(id=>positions[id]===positions[d.id]).sort();
            return [(group.indexOf(d.id)-(group.length-1)/2)*40*iconScale,(d.kind === "crew" ? -36 : 36)*iconScale];
          },
          pickable: true,
        }),
        new TextLayer({
          id: "fleet-status",
          characterSet: "auto",
          data: layers.fleet&&!historical&&iconScale>0.7 ? [...r.crews.map(c=>({id:c.id,kind:'crew' as const})),...r.trucks.map(t=>({id:t.id,kind:'truck' as const}))] : [],
          getPosition:d=>r.roads.nodes.find(n=>n.id===(d.kind==='crew'?view.crewPositions:view.truckPositions)[d.id])!.position,
          getText:d=>`${equipmentStatus(game,d.kind,d.id)==='Unavailable'?'⊘':equipmentStatus(game,d.kind,d.id)==='Scheduled'?'▣':equipmentStatus(game,d.kind,d.id)==='Season complete'?'✓':'○'} ${d.id}`,
          getPixelOffset:d=>{const positions=d.kind==='crew'?view.crewPositions:view.truckPositions;const group=Object.keys(positions).filter(id=>positions[id]===positions[d.id]).sort();return [(group.indexOf(d.id)-(group.length-1)/2)*40*iconScale,(d.kind==='crew'?-15:57)*iconScale];},
          getSize:11,getColor:[25,50,40],background:true,getBackgroundColor:[255,255,255,230],backgroundPadding:[3,2],pickable:true,
        }),
        new TextLayer({
          id: "labels",
          characterSet: "auto",
          data: layers.labels ? labelStands.filter(s => !shownLabels || shownLabels.has(s.id)) : [],
          getPosition: (d) => d.position,
          getText: (d) => d.id,
          getColor: [21, 44, 32],
          getSize: 12,
          getPixelOffset: [0, -18],
          fontFamily: "system-ui",
          background: true,
          getBackgroundColor: [255, 255, 255, 220],
          backgroundPadding: [3, 2],
          pickable: true,
        }),
      ],
    });
  }, [language,game, selected, layers, ready, replay, visibleStandIds, viewTick]);
  const fit = (planOnly = false) => {
    autoFit.current = false;
    const bounds = new maplibregl.LngLatBounds();
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
    areas.forEach((s) => bounds.extend(s.position));
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
    map.current?.fitBounds(bounds, { padding: 45, duration: 600 });
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
    <div className="geo-map">
      <div
        ref={container}
        className="map-canvas"
        aria-label={`${tr("Interactive map of")} ${game.region.name}`}
      />
      <div className="geo-tools">
        <details className="map-legend" onKeyDown={dismissOnEscape}><summary>{tr("Map legend")}</summary><div>
          <button className="map-panel-close" onClick={closePanel}>{tr("Close")}</button>
          <p>{tr("Green area: secured timber · ochre: unsecured supply · purple: protected · gold: selected.")}</p>
          <p>{tr("Roads: olive = modelled open; red = seasonal, authorization or closure restriction; blue = upgraded; gray = historical access not recorded.")}</p>
          <p>{tr("Routes: amber = crew relocation; blue = truck movement. Stand labels show area IDs.")}</p>
          <p style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><img src={`${import.meta.env.BASE_URL}icons/harvester.svg`} width="28" height="28" alt={tr("Harvester")}/> {tr("Harvest crew")} <img src={`${import.meta.env.BASE_URL}icons/log-truck.svg`} width="28" height="28" alt={tr("Log truck")}/> {tr("Truck")} <img src={`${import.meta.env.BASE_URL}icons/mill.svg`} width="28" height="28" alt={tr("Mill")}/> {tr("Receiving / processing mill")}</p>
          <p>{tr("Fleet icons are slightly offset from their shared road-node locations for readability. Select an icon to inspect orders and capacity; tooltips describe scheduled or unavailable resources.")}</p>
          <p>{tr("Fleet states: ○ Idle · ▣ Scheduled · ⊘ Unavailable · ✓ Season complete. These describe orders and known disruptions, not guaranteed fulfillment.")}</p>
          <div>{game.region.products.map(p=><p key={p.id}><ProductSymbol product={p}/></p>)}</div>
          <p>{tr("Select a feature or search by its name or ID to inspect it.")}</p>
        </div></details>
        <button className="map-fit-control" onClick={() => fit()}>{tr("Fit district")}</button>
        <button className="map-fit-control" onClick={() => fit(true)}>{tr("Fit plan")}</button>
        <div className="map-layer-controls-desktop">        <button onClick={() => setStyle(style === "light" ? "dark" : "light")}>
          {tr(style === "light" ? "Dark map" : "Light map")}
        </button>
        {Object.entries(layers).map(([id, on]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => setLayers({ ...layers, [id]: !on })}
            />
            {tr(id)}
          </label>
        ))}</div>
        <details className="map-layer-menu" onKeyDown={dismissOnEscape}><summary>{language==='fr'?'Outils':'Map tools'}</summary><div className="map-layer-options">
        <button className="map-panel-close" onClick={closePanel}>{tr("Close")}</button>
        <button onClick={() => fit()}>{tr("Fit district")}</button>
        <button onClick={() => fit(true)}>{tr("Fit plan")}</button>
        <button onClick={() => setStyle(style === "light" ? "dark" : "light")}>
          {tr(style === "light" ? "Dark map" : "Light map")}
        </button>
        {Object.entries(layers).map(([id, on]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => setLayers({ ...layers, [id]: !on })}
            />
            {tr(id)}
          </label>
        ))}</div></details>
      </div>
      <div className="geo-caption">
        {replay===undefined?tr("Forecast plan"):`${tr("Turn")} ${replay+1} · ${tr("actual routes")}`} · {tr("Mapped roads / teaching operations")}
        {game.region.sources.some(s => s.note.includes("Open Government Licence")) && <span> {tr("· Data: Province of British Columbia (OGL–BC)")}</span>}
      </div>
      {error && (
        <button className="map-error" onClick={() => setError("")}>
          {tr(error)} ×
        </button>
      )}
    </div>
  );
}
