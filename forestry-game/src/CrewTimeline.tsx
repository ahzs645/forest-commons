import { useLanguage } from "./i18n";
import { useState } from 'react';
import { scaleBand, scaleLinear } from 'd3';
import type { CrewOrder, Game } from './simulation/types';
import { scheduleCrew } from './simulation/scheduling';
export default function CrewTimeline({game,onChange}:{game:Game;onChange?:(game:Game)=>void}) {
 const {t: tr}=useLanguage();
  const [selection,setSelection]=useState({crew:game.region.crews[0].id,week:Math.min(game.week+1,game.region.weeks)});
  const [stand,setStand]=useState(game.region.stands.find(s=>game.stands.find(x=>x.id===s.id)?.owned)?.id??game.region.stands[0].id);
  const [hours,setHours]=useState(Math.min(40,game.region.crews[0].hours)),[treatment,setTreatment]=useState('final'),[bucking,setBucking]=useState('standard'),[error,setError]=useState('');
  const crew=game.region.crews.find(c=>c.id===selection.crew)??game.region.crews[0];
  const future=selection.week>game.week;
  const scheduled=game.scheduledCrews?.[selection.week]?.[crew.id];
  const orders: CrewOrder[]=future?(scheduled??[]):selection.week===game.week?(game.plan.crews[crew.id]??[]):(game.history.find(h=>h.week===selection.week)?.plan.crews[crew.id]??[]);
  const weeks=Array.from({length:game.region.weeks},(_,i)=>i+1);
  const x=scaleBand<number>().domain(weeks).range([110,1070]).padding(.08);
  const y=scaleBand<string>().domain(game.region.crews.map(c=>c.id)).range([34,34+game.region.crews.length*35]).padding(.14);
  const save=(next:CrewOrder[]|null)=>{try{onChange?.(scheduleCrew(game,selection.week,crew.id,next));setError('');}catch(e){setError(String(e instanceof Error?e.message:e));}};
  return <section className="panel"><span className="eyebrow">{tr("PRODUCTION CALENDAR")}</span><h2>{tr("Crew assignments across the season")}</h2>
    <p>{tr("Choose a crew and future turn to save an ordered queue. A saved queue replaces that crew’s current queue when the turn begins. Empty queues reserve rest; unscheduled turns carry the previous queue after exhausted stands are removed. The forecast rehearsal follows saved assignments.")}</p>
    <div style={{overflowX:'auto'}}><svg viewBox={`0 0 1080 ${45+game.region.crews.length*35}`} style={{minWidth:700,width:'100%'}} role="group" aria-label={tr("Interactive crew schedule by turn. Filled blue cells are saved future queues, green cells are recorded or current queues, outlined cells repeat the preceding plan.")}>
      {weeks.map(w=><text key={w} x={x(w)!+x.bandwidth()/2} y={20} textAnchor="middle" fontSize={12}>{(game.region.turnDurationWeeks??1)===1?"W":"T"}{w}</text>)}
      {game.region.crews.map(c=><g key={c.id}><text x={0} y={y(c.id)!+20} fontSize={12}>{c.name}</text>{weeks.map(w=>{
        const q=w<game.week?game.history.find(h=>h.week===w)?.plan.crews[c.id]:w===game.week?game.plan.crews[c.id]:game.scheduledCrews?.[w]?.[c.id];
        const count=q?.reduce((n,o)=>n+o.hours,0)??0;
        const width=scaleLinear().domain([0,c.hours]).range([0,x.bandwidth()]).clamp(true)(count);
        return <g key={w} role="button" tabIndex={0} aria-pressed={selection.crew===c.id&&selection.week===w} aria-label={`${c.name}, ${tr("Turn")} ${w}: ${q===undefined?tr('carry previous queue'):count?`${count} ${tr("scheduled hours")}`:tr('rest')}`} onClick={()=>setSelection({crew:c.id,week:w})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelection({crew:c.id,week:w});}}} style={{cursor:'pointer'}}><title>{c.name}, {tr((game.region.turnDurationWeeks??1)===1?"Week":"Turn")} {w}: {q===undefined?tr('carry previous queue'):q.length?`${q.map(o=>`${o.stand}: ${o.hours}h`).join(', ')}`:tr('rest')}</title><rect x={x(w)} y={y(c.id)} width={x.bandwidth()} height={y.bandwidth()} rx={3} fill="#eef2f0" stroke={selection.crew===c.id&&selection.week===w?'#112e27':'#b7c8c0'} strokeWidth={selection.crew===c.id&&selection.week===w?2:1}/><rect x={x(w)} y={y(c.id)} width={width} height={y.bandwidth()} rx={3} fill={w>game.week?'#427da6':'#36886b'} opacity={.65}/><text x={x(w)!+x.bandwidth()/2} y={y(c.id)!+19} textAnchor="middle" fontSize={11}>{q===undefined?'↪':count?`${count}h`:tr('Rest')}</text></g>;
      })}</g>)}
    </svg></div>
    <div className="button-row"><label>{tr("Crew")} <select value={crew.id} onChange={e=>setSelection({...selection,crew:e.target.value})}>{game.region.crews.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>{tr((game.region.turnDurationWeeks??1)===1?"Week":"Turn")} <select value={selection.week} onChange={e=>setSelection({...selection,week:Number(e.target.value)})}>{weeks.map(w=><option key={w} value={w}>{w}{w<game.week?` · ${tr('recorded')}`:w===game.week?` · ${tr('current')}`:''}</option>)}</select></label></div>
    <p>{tr(future?(scheduled===undefined?'No saved override: this crew will carry its previous queue.':'Saved future override.'):'Recorded/current orders are shown below. Edit current orders in the production queue editor.')} {orders.reduce((n,o)=>n+o.hours,0)} / {crew.hours} {tr("scheduled hours.")}</p>
    {orders.length>0&&<ol>{orders.map((o,i)=><li key={i}>{o.stand} · {o.hours} h · {tr(game.region.treatments?.[o.treatment??'final']?.name??'Final harvest')} · {tr(o.bucking&&o.bucking!=='standard'?game.region.buckingProfiles?.[o.bucking]?.name??o.bucking:'Standard recovery')} {future&&onChange&&<><button aria-label={`${tr("Move scheduled order")} ${i+1} ${tr("up")}`} disabled={i===0} onClick={()=>{const q=[...orders];[q[i-1],q[i]]=[q[i],q[i-1]];save(q);}}>↑</button><button aria-label={`${tr("Remove scheduled order")} ${i+1}`} onClick={()=>save(orders.filter((_,j)=>j!==i))}>{tr("Remove")}</button></>}</li>)}</ol>}
    {future&&onChange&&<><div className="button-row"><label>{tr("Stand")} <select value={stand} onChange={e=>setStand(e.target.value)}>{game.region.stands.filter(s=>s.supply!=='protected').map(s=><option key={s.id} value={s.id}>{s.id} · {s.name}{game.stands.find(x=>x.id===s.id)?.owned?'':` · ${tr('not secured')}`}</option>)}</select></label><label>{tr("Hours")} <input type="number" min={1} max={crew.hours} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label><label>{tr("Treatment")} <select value={treatment} onChange={e=>setTreatment(e.target.value)}>{Object.entries(game.region.treatments??{final:{name:'Final harvest'}}).map(([id,t])=><option key={id} value={id}>{tr(t.name)}</option>)}</select></label><label>{tr("Bucking recovery")} <select value={bucking} onChange={e=>setBucking(e.target.value)}><option value="standard">{tr("Standard recovery")}</option>{Object.entries(game.region.buckingProfiles??{}).filter(([id])=>id!=="standard").map(([id,p])=><option key={id} value={id}>{tr(p.name)}</option>)}</select></label><button onClick={()=>save([...orders,{stand,hours,treatment,bucking}])}>{tr("Append assignment")}</button><button onClick={()=>save([])}>{tr("Schedule rest")}</button><button onClick={()=>save(null)}>{tr("Use carried queue")}</button></div><p className="muted">{tr("Reservations do not secure timber or guarantee access. Ownership, remaining volume, travel and actual weather are checked when work runs. Change an assignment if procurement fails.")}</p></>}
    {selection.week<game.week&&<ProductionIntervals game={game} week={selection.week} />}
    {error&&<p role="alert">{tr(error)}</p>}
  </section>;
}

function ProductionIntervals({game,week}:{game:Game;week:number}) {
 const {t: tr}=useLanguage();
  const report=game.history.find(h=>h.week===week);
  if(!report?.production)return <p className="muted">{tr("This saved week has no exact production intervals. Its recorded orders are shown above; actual timing is unavailable.")}</p>;
  const records=report.production;
  const width=960,left=110;
  const maxHours=Math.max(...game.region.crews.map(c=>c.hours),...records.map(p=>p.endHour));
  const x=scaleLinear().domain([0,maxHours]).range([left,width]);
  const y=scaleBand<string>().domain(game.region.crews.map(c=>c.id)).range([35,35+game.region.crews.length*29]).padding(.3);
  const hour=(n:number)=>n.toLocaleString('en-CA',{maximumFractionDigits:1});
  return <section aria-label={`${tr("Recorded production intervals for turn")} ${week}`}>
    <h3>{tr((game.region.turnDurationWeeks??1)===1?"Week":"Turn")} {week}{tr(": recorded travel and production")}</h3>
    <p>{tr("Amber shows relocation; green shows productive work. Blank time has no recorded production interval. Positions use elapsed hours in each crew’s week, including travel. The table provides the exact recorded values.")}</p>
    <div style={{overflowX:'auto'}}><svg role="img" aria-label={`${tr("Turn")} ${week}. ${tr("Actual relocation and production intervals; full values in the following table.")}`} viewBox={`0 0 ${width+12} ${45+game.region.crews.length*29}`} style={{width:'100%',minWidth:650}}>
      {x.ticks(8).map(t=><g key={t}><text x={x(t)} y={20} textAnchor="middle" fontSize={11}>{hour(t)} h</text><line x1={x(t)} x2={x(t)} y1={28} y2={35+game.region.crews.length*29} stroke="#d7e0db"/></g>)}
      {game.region.crews.map(c=><text key={c.id} x={0} y={y(c.id)!+15} fontSize={12}>{c.name}</text>)}
      {records.map((p,i)=><g key={i}><title>{p.crew} {tr("at")} {p.stand}{tr(": starts")} {hour(p.startHour)} {tr("h, relocation")} {hour(p.relocationHours)} {tr("h, ends")} {hour(p.endHour)} h</title><rect x={x(p.startHour)} y={y(p.crew)} width={Math.max(0,x(p.startHour+p.relocationHours)-x(p.startHour))} height={y.bandwidth()} fill="#c18b35"/><rect x={x(p.startHour+p.relocationHours)} y={y(p.crew)} width={Math.max(0,x(p.endHour)-x(p.startHour+p.relocationHours))} height={y.bandwidth()} fill="#36886b"/></g>)}
    </svg></div>
    {records.length===0?<p>{tr("No production intervals were recorded this turn.")}</p>:<div className="table-wrap"><table><caption>{tr("Recorded crew intervals — turn")} {week}{tr("; hours elapsed from turn start")}</caption><thead><tr><th scope="col">{tr("Crew")}</th><th scope="col">{tr("Stand")}</th><th scope="col">{tr("Treatment")}</th><th scope="col">{tr("Start h")}</th><th scope="col">{tr("Travel h")}</th><th scope="col">{tr("Work starts h")}</th><th scope="col">{tr("Ends h")}</th><th scope="col">{tr("Produced m³")}</th></tr></thead><tbody>{records.map((p,i)=><tr key={i}><th scope="row">{game.region.crews.find(c=>c.id===p.crew)?.name??p.crew}</th><td>{p.stand}</td><td>{game.region.treatments?.[p.treatment]?.name??p.treatment}</td><td>{hour(p.startHour)}</td><td>{hour(p.relocationHours)}</td><td>{hour(p.startHour+p.relocationHours)}</td><td>{hour(p.endHour)}</td><td>{hour(Object.values(p.products).reduce((n,v)=>n+v,0))}</td></tr>)}</tbody></table></div>}
  </section>;
}
