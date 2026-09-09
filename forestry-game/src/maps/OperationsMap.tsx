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
} from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Game, Position } from "../simulation/types";
import { route, weatherAt, canAccess } from "../simulation/routing";
import { stockAt, sum } from "../simulation/engine";
export default function OperationsMap({
  game,
  selected,
  onSelect,
  replay,
  visibleStandIds,
  onInspect,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  replay?: number;
  visibleStandIds?: string[];
  onInspect?: (kind: "mill" | "crew" | "truck" | "road", id: string) => void;
}) {
  const {t:tr,language}=useLanguage();
  const camera=useRef<{region:string;center:Position;zoom:number;bearing:number;pitch:number}|null>(null);
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
      useDevicePixels: true,
      layers: [],
    });
    overlay.current = deck;
    m.addControl(deck);
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.addControl(new maplibregl.ScaleControl(), "bottom-left");
    m.on("load", () => setReady(true));
    m.on("error", () =>
      setError(
        "Some basemap tiles could not load. Game roads and operations remain available.",
      ),
    );
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(container.current);
    return () => {
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
          onClick: info => { if (info.object) onInspect?.("road", info.object.id); },
        }),
        new PolygonLayer({
          id: "stands",
          data: layers.stands
            ? r.stands.filter(s=>!visibleStandIds || visibleStandIds.includes(s.id)).map((s) => ({
                ...s,
                tooltip: `${s.id} · ${s.name}\n${Math.round(view.stands.find((t) => t.id === s.id)!.remaining).toLocaleString()} m³ standing · ${Math.round(sum(stockAt(view, s.id)))} m³ roadside\n${s.zone} · ${s.supply}`,
              }))
            : [],
          getPolygon: (d) => d.polygon,
          getFillColor: (d) =>
            d.id === selected
              ? [232, 174, 51, 220]
              : d.supply === "protected"
                ? [136, 93, 160, 150]
                : view.stands.find((s) => s.id === d.id)?.owned
                  ? [34, 124, 79, 185]
                  : [205, 149, 89, 165],
          getLineColor: (d) =>
            d.id === selected ? [255, 242, 159] : [255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          stroked: true,
          pickable: true,
          onClick: (info) => {
            if (info.object) onSelect(info.object.id);
          },
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
          getSize: 36,
          sizeUnits: "pixels",
          pickable: true,
          onClick: (info) => {
            if (info.object) onInspect?.("mill", info.object.id);
          },
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
          getSize: 32,
          sizeUnits: "pixels",
          getPixelOffset: (d) => {
            const positions = d.kind === "crew" ? view.crewPositions : view.truckPositions;
            const group = Object.keys(positions).filter(id=>positions[id]===positions[d.id]).sort();
            return [(group.indexOf(d.id)-(group.length-1)/2)*40,d.kind === "crew" ? -36 : 36];
          },
          pickable: true,
          onClick: (info) => {
            if (info.object) onInspect?.(info.object.kind, info.object.id);
          },
        }),
        new TextLayer({
          id: "fleet-status",
          characterSet: "auto",
          data: layers.fleet&&!historical ? [...r.crews.map(c=>({id:c.id,kind:'crew' as const})),...r.trucks.map(t=>({id:t.id,kind:'truck' as const}))] : [],
          getPosition:d=>r.roads.nodes.find(n=>n.id===(d.kind==='crew'?view.crewPositions:view.truckPositions)[d.id])!.position,
          getText:d=>`${equipmentStatus(game,d.kind,d.id)==='Unavailable'?'⊘':equipmentStatus(game,d.kind,d.id)==='Scheduled'?'▣':equipmentStatus(game,d.kind,d.id)==='Season complete'?'✓':'○'} ${d.id}`,
          getPixelOffset:d=>{const positions=d.kind==='crew'?view.crewPositions:view.truckPositions;const group=Object.keys(positions).filter(id=>positions[id]===positions[d.id]).sort();return [(group.indexOf(d.id)-(group.length-1)/2)*40,d.kind==='crew'?-15:57];},
          getSize:11,getColor:[25,50,40],background:true,getBackgroundColor:[255,255,255,230],backgroundPadding:[3,2],pickable:true,
          onClick:info=>{if(info.object)onInspect?.(info.object.kind,info.object.id);},
        }),
        new TextLayer({
          id: "labels",
          characterSet: "auto",
          data: layers.labels ? r.stands.filter(s=>!visibleStandIds || visibleStandIds.includes(s.id)) : [],
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
          onClick: (info) => {
            if (info.object) onSelect(info.object.id);
          },
        }),
      ],
    });
  }, [language,game, selected, onSelect, onInspect, layers, ready, replay, visibleStandIds]);
  const fit = (planOnly = false) => {
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
  return (
    <div className="geo-map">
      <div
        ref={container}
        className="map-canvas"
        aria-label={`${tr("Interactive map of")} ${game.region.name}`}
      />
      <div className="geo-tools">
        <details className="map-legend"><summary>{tr("Map legend")}</summary><div>
          <p>{tr("Green area: secured timber · ochre: unsecured supply · purple: protected · gold: selected.")}</p>
          <p>{tr("Roads: olive = modelled open; red = seasonal, authorization or closure restriction; blue = upgraded; gray = historical access not recorded.")}</p>
          <p>{tr("Routes: amber = crew relocation; blue = truck movement. Stand labels show area IDs.")}</p>
          <p style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><img src={`${import.meta.env.BASE_URL}icons/harvester.svg`} width="28" height="28" alt={tr("Harvester")}/> {tr("Harvest crew")} <img src={`${import.meta.env.BASE_URL}icons/log-truck.svg`} width="28" height="28" alt={tr("Log truck")}/> {tr("Truck")} <img src={`${import.meta.env.BASE_URL}icons/mill.svg`} width="28" height="28" alt={tr("Mill")}/> {tr("Receiving / processing mill")}</p>
          <p>{tr("Fleet icons are slightly offset from their shared road-node locations for readability. Select an icon to inspect orders and capacity; tooltips describe scheduled or unavailable resources.")}</p>
          <p>{tr("Fleet states: ○ Idle · ▣ Scheduled · ⊘ Unavailable · ✓ Season complete. These describe orders and known disruptions, not guaranteed fulfillment.")}</p>
          <div>{game.region.products.map(p=><p key={p.id}><ProductSymbol product={p}/></p>)}</div>
          <p>{tr("Select a feature or search by its name or ID to inspect it.")}</p>
        </div></details>
        <button onClick={() => fit()}>{tr("Fit district")}</button>
        <button onClick={() => fit(true)}>{tr("Fit plan")}</button>
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
        <details className="map-layer-menu" onKeyDown={event => {
          if (event.key === "Escape" && event.currentTarget.open) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}><summary>{language==='fr'?'Couches':'Layers'}</summary><div className="map-layer-options">        <button onClick={() => setStyle(style === "light" ? "dark" : "light")}>
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
