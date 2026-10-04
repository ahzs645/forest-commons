import { useState } from 'react';
import type { StewardshipState, StewardshipAction } from './simulation/stewardship';
import type { RegionDefinition } from './simulation/types';
import { useAnnualLanguage } from './annual-language';
import './annual-stewardship.css';
const colors: Record<StewardshipAction,string>={rest:'#dbe9df',thin:'#dc9b39',final:'#be563f',plant:'#277b59'};
export default function AnnualActionMap({state,region,year}:{state:StewardshipState;region:RegionDefinition;year:number}){
 const {t,language}=useAnnualLanguage();const [compare,setCompare]=useState<number|null>(null),[selected,setSelected]=useState(region.stands[0]?.id??''),[focused,setFocused]=useState(true);
 const other=state.history.find(h=>h.year===compare)??state.history[0];const records=[state.history.find(h=>h.year===year)!,other];
 const positions=focused?(region.stands.find(d=>d.id===selected)?.polygon??region.stands[0].polygon):region.stands.flatMap(d=>d.polygon);if(!positions.length||!records[0])return null;
 const xs=positions.map(p=>p[0]),ys=positions.map(p=>p[1]);let minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);if(focused){const px=Math.max(.00001,maxX-minX)*.5,py=Math.max(.00001,maxY-minY)*.5;minX-=px;maxX+=px;minY-=py;maxY+=py;}
 const visible=region.stands.filter(d=>!focused||d.polygon.some(p=>p[0]>=minX&&p[0]<=maxX&&p[1]>=minY&&p[1]<=maxY));
 const midLat=(minY+maxY)/2*Math.PI/180,dx=Math.max(1e-8,(maxX-minX)*Math.cos(midLat)),dy=Math.max(1e-8,maxY-minY),scale=Math.min(650/dx,320/dy);
 const point=(p:number[])=>`${(700-dx*scale)/2+(p[0]-minX)*Math.cos(midLat)*scale},${(370-dy*scale)/2+(maxY-p[1])*scale}`;
 const number=(v:number)=>Math.round(v).toLocaleString(language==='fr'?'fr-CA':'en-CA');
 return <section className="annual-action-map" aria-label={t('Annual action map')}><p>{t('Authored stand boundaries; colours show recorded management actions. Both maps use the same extent.')}</p>
 <div className="annual-map-tools"><button onClick={()=>setFocused(!focused)}>{t(focused?'Show whole forest':'Focus selected stand')}</button><label>{t('Comparison year')}<select value={other.year} onChange={e=>setCompare(Number(e.target.value))}>{state.history.map(h=><option key={h.year} value={h.year}>{t('Year')} {h.year}</option>)}</select></label><label>{t('Selected stand')}<select value={selected} onChange={e=>setSelected(e.target.value)}>{region.stands.map(d=><option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}</select></label></div>
 <div className="annual-map-pair">{records.map((record,i)=>{const row=record.standSnapshots?.find(s=>s.id===selected);return <div key={i}><h4>{t('Year')} {record.year}</h4><svg viewBox="0 0 700 370" role="group" aria-label={`${t('Annual action map')} · ${t('Year')} ${record.year}`}>
 {visible.map(d=>{const action=record.actions[d.id]??'rest';return <g key={d.id} role="button" tabIndex={0} aria-label={`${d.id} · ${t(action)}`} aria-pressed={selected===d.id} onClick={()=>setSelected(d.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(d.id);}}}><polygon points={d.polygon.map(point).join(' ')} fill={colors[action]} stroke={selected===d.id?'#162e24':'#63776a'} strokeWidth={selected===d.id?4:1}/><title>{`${d.id} · ${d.name}: ${t(action)}`}</title></g>;})}</svg>
 <p><strong>{selected}</strong> · {t('Recorded action')}: {t(record.actions[selected]??'rest')}</p>{row?<dl className="annual-map-observations"><div><dt>{t('Standing timber')}</dt><dd>{number(row.volume)} m³</dd></div><div><dt>{t('Habitat index')}</dt><dd>{row.habitat.toFixed(2)}</dd></div><div><dt>{t('Regeneration age')}</dt><dd>{row.regenerationAge}</dd></div></dl>:<p className="muted">{t('Historical stand observations unavailable in this older record.')}</p>}</div>;})}</div>
 <p className="annual-map-legend">{Object.entries(colors).map(([a,c])=><span key={a}><i style={{background:c}}/>{t(a)}</span>)}</p><p className="muted">{t('Snapshot records the model forest at year end. Older records keep only totals and treatments.')}</p></section>;
}
