import { useLanguage } from "./i18n";
import {useState} from 'react';
import type {Game,WeatherPoint} from './simulation/types';
import {teachingWeatherCharts, categoryWeatherPoint} from './scenarios/weather-charts';
import TimeSeries from './charts/TimeSeries';
export default function WeatherCharts({game}:{game:Game}){
 const {t: tr}=useLanguage();
 const [zone,setZone]=useState(game.region.zones[0].id),[campaignOnly,setCampaignOnly]=useState(true);
 // Old Québec saves predate the optional numerical display dataset. Derive its
 // labelled display-only equivalent without changing saves or operating outcomes.
 const config=(game.region.weatherCharts?.model==="category-illustration"?teachingWeatherCharts(game.region.weather,game.region.weatherCharts.startCalendarWeek):game.region.weatherCharts)??(game.region.id==='quebec-lac-saint-jean'?teachingWeatherCharts(game.region.weather,game.linkedSeason?.startCalendarWeek??13):undefined);
 if(!config)return <section className="panel"><h2>{tr("Seasonal weather curves")}</h2><p>{tr("This regional package has no numerical weather dataset. Add weatherCharts with provenance, 52 weekly forecast/actual values per zone and the first campaign calendar week. Access categories remain available below.")}</p></section>;
 const dataset=config.scenarios[game.weatherId], selectedZone=game.region.zones.some(z=>z.id===zone)?zone:game.region.zones[0].id;
 const metrics:{key:keyof WeatherPoint;label:string;unit:string;color:string}[]=[{key:'temperatureC',label:'Weekly mean temperature',unit:'°C',color:'#b9643d'},{key:'snowCm',label:'Indicative snow depth',unit:'cm',color:'#5082aa'},{key:'precipitationMm',label:'Weekly precipitation',unit:'mm',color:'#397b57'}];
 const weeks=Array.from({length:campaignOnly?game.region.weeks:52},(_,i)=>({x:i+1,calendar:campaignOnly?(config.startCalendarWeek-1+i)%52+1:i+1}));
 return <section className="panel"><h2>{tr("Seasonal weather curves")}</h2><p className="notice">{config.provenance} {tr("Campaign week 1 corresponds to calendar week")} {config.startCalendarWeek}.</p><div className="form-row"><label>{tr("Weather chart zone")}<select value={selectedZone} onChange={e=>setZone(e.target.value)}>{game.region.zones.map(z=><option key={z.id} value={z.id}>{tr(z.name)}</option>)}</select></label><label><input type="checkbox" checked={campaignOnly} onChange={e=>setCampaignOnly(e.target.checked)}/> {tr("Campaign window only")}</label></div>{metrics.map(m=><div key={m.key}><h3>{tr(m.label)}</h3><TimeSeries title={tr(m.label)} unit={m.unit} minY={m.key==='temperatureC'?-15:0} xLabel={tr(campaignOnly?"Campaign week":"Calendar week")} series={[{name:tr('Scenario forecast'),color:m.color,dashed:true,values:weeks.map(w=>({x:w.x,y:dataset.forecast[selectedZone][w.calendar-1][m.key]}))},{name:tr('Settled scenario'),color:'#283e33',values:weeks.map(w=>{const gw=(w.calendar-config.startCalendarWeek+52)%52+1;const settled=game.history.find(h=>h.week===gw);return {x:w.x,y:settled?(config.model==="category-illustration"?categoryWeatherPoint(settled.weather[selectedZone])[m.key]:dataset.actual[selectedZone][w.calendar-1][m.key]):null};})}]}/></div>)}</section>;
}
