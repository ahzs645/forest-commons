import { useLanguage } from "./i18n";
import { useId } from "react";
import { scaleLinear, scaleOrdinal, schemeTableau10 } from "d3";
import type { Game } from "./simulation/types";

/** Project only existing batches, held without dispatch; downgrade clocks reset at transition. */
export function inventoryTimeline(game: Game) {
  return game.stands.flatMap(stand => stand.stock.filter(b => b.volume > 1e-7).map((batch, index) => {
    let product = game.region.products.find(p => p.id === batch.product)!;
    let started = batch.week, quality = batch.quality;
    const transitions: { week: number; from: string; to: string | null; quality: number }[] = [];
    const seen = new Set<string>();
    while (product && !seen.has(product.id)) {
      seen.add(product.id);
      const week = Math.max(game.week, started + product.maxFreshWeeks);
      const target = product.downgradeTo ?? null;
      quality = target ? quality * .9 : 0;
      transitions.push({week,from:product.id,to:target,quality});
      if (!target) break;
      started = week;
      product = game.region.products.find(p => p.id === target)!;
    }
    return { id: `${stand.id}-${index}`, stand: stand.id, product: batch.product, volume: batch.volume, age: Math.max(0,game.week-batch.week), quality:batch.quality, transitions };
  }));
}
export default function InventoryCharts({game}: {game:Game}) {
 const {t: tr}=useLanguage();
  const id = useId(), rows = inventoryTimeline(game);
  const last = Math.max(game.week+1,...rows.flatMap(r=>r.transitions.map(t=>t.week)));
  const x = scaleLinear().domain([game.week,last]).range([185,660]);
  const color = scaleOrdinal<string,string>().domain(game.region.products.map(p=>p.id)).range(schemeTableau10);
  const name = (id:string)=>game.region.products.find(p=>p.id===id)?.name ?? id;
  // Identical age/product/transition rows can share one timeline, while retaining lot detail in the table.
  const grouped = new Map<string, {label:string;volume:number;transitions:typeof rows[number]['transitions'];product:string}>();
  for(const r of rows){const key=JSON.stringify([r.product,r.transitions]);const old=grouped.get(key);if(old)old.volume+=r.volume;else grouped.set(key,{label:`${name(r.product)} · ${tr("Age (turns)")} ${r.age}`,volume:r.volume,transitions:r.transitions,product:r.product});}
  const lines=[...grouped.values()];
  return <section className="panel" aria-labelledby={id}>
    <h3 id={id}>{tr("Inventory ageing and expiry")}</h3>
    <p>{tr("Current roadside batches, assuming no dispatch or new harvest. Deterioration happens at the start of the labelled turn, before trucks load. Each downgrade resets the age clock and multiplies quality by 0.9. A product with no downgrade becomes waste.")}</p>
    {!rows.length ? <p>{tr("No roadside inventory is currently waiting.")}</p> : <>
      <div style={{overflowX:"auto"}}><svg role="img" aria-label={tr("Inventory transition turns; circles are downgrades and crosses are expiry; full values in table")} viewBox={`0 0 720 ${lines.length*42+50}`} style={{width:"100%",minWidth:550}}>
        {x.ticks(Math.min(10,last-game.week+1)).filter(Number.isInteger).map(w=><g key={w}><line x1={x(w)} x2={x(w)} y1="25" y2={lines.length*42+30} stroke="currentColor" opacity=".12"/><text x={x(w)} y="16" fontSize="11" textAnchor="middle" fill="currentColor">T{w}</text></g>)}
        {lines.map((r,i)=><g key={i} transform={`translate(0,${45+i*42})`}><text x="0" y="4" fill="currentColor" fontSize="11">{r.label}</text><text x="0" y="19" fill="currentColor" fontSize="10">{Math.round(r.volume).toLocaleString()} m³</text>{r.transitions.map((t,j)=><g key={j}><line x1={x(j?r.transitions[j-1].week:game.week)} x2={x(t.week)} y1="0" y2="0" stroke={color(t.from)} strokeWidth="6"/>{t.to?<circle cx={x(t.week)} cy="0" r="5" fill={color(t.to)}/>:<path d={`M${x(t.week)-5},-5l10,10m-10,0l10,-10`} stroke="#bb402d" strokeWidth="3"/>}</g>)}</g>)}
      </svg></div>
      <p className="muted">{tr("Turns beyond the")} {game.region.weeks}{tr("-turn season show the storage rule only; the campaign does not automatically advance beyond its final turn. Age counts turns since harvest or the last downgrade, not necessarily the original harvest age. Circles mark downgrades; crosses mark waste.")}</p>
      <details><summary>{tr("Batch ages, quality and full transition sequence")}</summary><div className="table-wrap"><table><thead><tr><th>{tr("Stand")}</th><th>{tr("Current product")}</th><th>m³</th><th>{tr("Age (turns)")}</th><th>{tr("Quality")}</th><th>{tr("If held: start-of-turn transitions")}</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.stand}</td><td>{name(r.product)}</td><td>{r.volume.toFixed(1)}</td><td>{r.age}</td><td>{r.quality.toFixed(3)}</td><td>{r.transitions.map(t=>`T${t.week}: ${t.to?`${name(t.to)} (${tr("Quality")} ${t.quality.toFixed(3)})`:tr("Waste")}`).join(" → ")}</td></tr>)}</tbody></table></div></details>
    </>}
  </section>;
}
