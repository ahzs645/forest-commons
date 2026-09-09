import { useLanguage } from "./i18n";
import {scaleBand} from 'd3';
import TimeSeries from './charts/TimeSeries';
import type {StewardshipState} from './simulation/stewardship';
import type {RegionDefinition} from './simulation/types';
const colors={rest:'#dbe9df',thin:'#dc9b39',final:'#be563f',plant:'#277b59'};
export default function StewardshipCharts({state,region}:{state:StewardshipState;region:RegionDefinition}) {
 const {t: tr}=useLanguage();
 const history=state.history;if(!history.length)return <p>{tr("Advance a year to see volume, habitat and treatment history.")}</p>;
 const managed=state.stands.filter(s=>s.managed),calendarWidth=Math.max(500,100+history.length*24),calendarHeight=35+managed.length*25;
 const cx=scaleBand<number>().domain(history.map(h=>h.year)).range([85,calendarWidth-10]).padding(.12);
 return <div><h3>{tr("Annual changes")}</h3><p>{tr("Growth and removals include all stands.")}</p><TimeSeries title={tr("Annual growth and harvest")} unit="m³" xLabel={tr("Year")} series={[{name:tr('Growth'),color:'#277b59',values:history.map(h=>({x:h.year,y:h.growth}))},{name:tr('Harvest'),color:'#c28523',values:history.map(h=>({x:h.year,y:h.harvest}))}]}/>
 <h3>{tr("Habitat recovery and treatment effects")}</h3><p>{tr("Landscape versus secured management area. Indices are teaching assumptions, not measured habitat quality. Older saved years without managed-area observations remain blank.")}</p><TimeSeries title={tr("Habitat history")} unit="%" maxY={100} xLabel={tr("Year")} series={[{name:tr('Landscape'),color:'#277b59',values:history.map(h=>({x:h.year,y:h.habitat*100}))},{name:tr('Managed area'),color:'#7954a1',values:history.map(h=>({x:h.year,y:h.managedHabitat==null?null:h.managedHabitat*100}))}]}/>
 <h3>{tr("Management calendar")}</h3><p>{Object.entries(colors).map(([action,color])=><span key={action} style={{marginRight:16}}><span aria-hidden="true" style={{display:'inline-block',width:12,height:12,background:color,marginRight:4}}/>{tr(action)}</span>)}</p><div style={{overflowX:'auto'}}><svg role="img" aria-label={tr("Annual actions by managed stand")} width={calendarWidth} height={calendarHeight}>{history.map(h=><text key={h.year} x={cx(h.year)!+cx.bandwidth()/2} y={16} textAnchor="middle" fontSize={11}>{h.year}</text>)}{managed.map((s,i)=><g key={s.id}><text x={75} y={39+i*25} textAnchor="end" fontSize={12}>{s.id}</text>{history.map(h=>{const a=h.actions[s.id]??'rest';return <rect key={h.year} x={cx(h.year)} y={24+i*25} width={cx.bandwidth()} height={20} rx={3} fill={colors[a]}><title>{s.id}{tr(", year")}{" "}{h.year}: {tr(a)}</title></rect>})}</g>)}</svg></div><details><summary>{tr("Accessible action history")}</summary>{history.map(h=><p key={h.year}>{tr("Year")} {h.year}: {Object.entries(h.actions).filter(([,a])=>a!=='rest').map(([id,a])=>`${id}: ${tr(a)}`).join('; ')||tr('All stands rest')}.</p>)}</details><p>{region.name}{tr(": management membership is fixed when the annual exercise begins.")}</p></div>;
}
