import {useLanguage} from "./i18n";
import { useId } from "react";
import { scaleLinear } from "d3";
import type { Game } from "./simulation/types";
import { canAccess } from "./simulation/routing";
import { procurementWindows } from "./simulation/appraisal";

function Bars({ title, unit, rows }: { title: string; unit: string; rows: { label: string; value: number }[] }) {
  const {t:tr,language}=useLanguage();
  const id = useId();
  const x = scaleLinear().domain([0, Math.max(1, ...rows.map(r => r.value))]).range([0, 340]);
  return <figure style={{ margin: "1rem 0", minWidth: 0 }}>
    <figcaption id={id}><strong>{tr(title)}</strong></figcaption>
    <svg role="img" aria-labelledby={id} viewBox={`0 0 650 ${Math.max(55, rows.length * 35 + 15)}`} style={{ width: "100%", maxWidth: 760 }}>
      {rows.map((r, i) => <g key={r.label} transform={`translate(0,${i * 35 + 8})`}><text x="0" y="17" fontSize="13" fill="currentColor">{tr(r.label)}</text><rect x="210" width={x(r.value)} height="23" rx="3" fill="#187d72"/><text x={218 + x(r.value)} y="17" fontSize="12" fill="currentColor">{r.value.toLocaleString(language==='fr'?'fr-CA':'en-CA', { maximumFractionDigits: 1 })}</text></g>)}
    </svg>
    <details><summary>{tr("Chart values (")}{tr(unit)})</summary><table><thead><tr><th>{tr("Category")}</th><th>{tr(unit)}</th></tr></thead><tbody>{rows.map(r => <tr key={r.label}><td>{tr(r.label)}</td><td>{r.value.toLocaleString(language==='fr'?'fr-CA':'en-CA', { maximumFractionDigits: 2 })}</td></tr>)}</tbody></table></details>
  </figure>;
}

export default function ProcurementCharts({ game, standId }: { game: Game; standId: string }) {
  const {t:tr,language}=useLanguage();
  const r = game.region, stand = r.stands.find(s => s.id === standId)!, state = game.stands.find(s => s.id === standId)!;
  const final = r.treatments?.final ?? { retention: 0, productivity: 1 };
  const volume = Math.max(0, state.remaining - stand.volume * Math.max(game.plan.retention, final.retention));
  const meanCrew = r.crews.reduce((n, c) => n + c.productivityFactor, 0) / r.crews.length;
  const work = (["frozen", "normal", "wet", "thaw"] as const).map(weather => ({ weather, open: canAccess(stand.terrain, weather), days: volume / (8 * stand.productivity * meanCrew * final.productivity * (weather === "wet" ? .8 : weather === "thaw" ? .65 : 1)) }));
  const terrain = new Map<number, number>();
  for (const s of r.stands) {
    const v = game.stands.find(v => v.id === s.id)!;
    if (v.owned) terrain.set(s.terrain, (terrain.get(s.terrain) ?? 0) + Math.max(0, v.remaining - s.volume * Math.max(game.plan.retention, final.retention)));
  }
  const roads = new Map<number, number>();
  for (const edge of r.roads.edges) roads.set(edge.bearing, (roads.get(edge.bearing) ?? 0) + edge.km);
  const roadClasses = new Map<string, number>();
  for (const edge of r.roads.edges) roadClasses.set(edge.roadClass ?? "unspecified", (roadClasses.get(edge.roadClass ?? "unspecified") ?? 0) + edge.km);
  const windows = procurementWindows(game, standId);
  return <div>
    <h3>{tr("Workload and access composition")}</h3>
    <Bars title={`${stand.id}: ${tr("remaining final-harvest work")}`} unit="8-hour reference crew-days" rows={work.filter(w => w.open).map(w => ({ label: w.weather, value: w.days }))}/>
    <p className="muted">{tr("One reference day is eight productive crew-hours, not a calendar day or a whole fleet shift. Uses remaining eligible volume (")}{Math.round(volume).toLocaleString(language==='fr'?'fr-CA':'en-CA')}{" "}{tr("m³), the lot's")}{" "}{stand.productivity}{" "}{tr("m³/hour baseline, mean crew productivity factor")}{" "}{meanCrew.toFixed(2)}{tr(", final-treatment productivity")}{" "}{final.productivity}{tr(", and the engine's wet/thaw factors. Excludes travel, breakdowns, queues and haulage. Closed terrain:")}{" "}{work.filter(w => !w.open).map(w => tr(w.weather)).join(", ") || tr("none")}{tr(". Thinning assignments require their own treatment calculation.")}</p>
    <p>{windows.filter(w => w.terrain && w.destinations.length > 0).length}{" "}{tr("of")}{" "}{windows.length}{" "}{tr("remaining forecast weeks have both accessible terrain and a route to at least one destination with demand. This does not reserve capacity.")}</p>
    <Bars title="Owned eligible timber by terrain bearing class" unit="m³" rows={[...terrain].sort((a,b)=>a[0]-b[0]).map(([bearing,value])=>({label:`${tr("Terrain class")} ${bearing}`,value}))}/>
    <Bars title="Scenario road network by bearing class" unit="km of stored road edges" rows={[...roads].sort((a,b)=>a[0]-b[0]).map(([bearing,value])=>({label:`${tr("Road class")} ${bearing}`,value}))}/>
    <Bars title="Declared road composition" unit="km of stored road edges" rows={[...roadClasses].map(([label,value])=>({label,value}))}/>
    <p className="muted">{tr("Composition uses the current scenario's declared terrain classes and road lengths. Every stored road edge is counted once, including closures; this is network composition, not the selected lot's haul route. Bearing classes are model inputs, not surveyed soil categories or public-road classifications. Parcel and access-road assumptions remain educational; the map's trunk geography does not validate them.")}</p>
  </div>;
}
