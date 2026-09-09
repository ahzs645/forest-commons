import {forestIntakeProducts} from './simulation/intake-products';
import { useLanguage } from "./i18n";
import {useState} from 'react';
import type {Game} from './simulation/types';
export default function MillProcessingDesk({game,onChange,allowIntake=true,allowProcessing=true}:{game:Game;onChange:(g:Game)=>void;allowIntake?:boolean;allowProcessing?:boolean}) {
 const {t: tr,language}=useLanguage();
 const quantity=(n:number)=>n.toLocaleString(language==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:2});
 const productName=(id:string)=>tr(game.region.products.find(p=>p.id===id)?.name??id);
 const [selectedTruck,setTruck]=useState(game.region.trucks[0].id),[selectedStand,setStand]=useState(game.stands.find(s=>s.owned)?.id??''),[loads,setLoads]=useState(1),[error,setError]=useState(''),[selectedMill,setSelectedMill]=useState(game.region.mills.find(m=>m.processing)?.id??'');
 const weekly=(game.region.turnDurationWeeks??1)===1;
 const mills=game.region.mills.filter(m=>m.processing),done=game.week>game.region.weeks;
 if(!mills.length)return null;
 const truck=game.region.trucks.some(t=>t.id===selectedTruck)?selectedTruck:game.region.trucks[0].id;
 const stand=game.stands.some(s=>s.id===selectedStand&&s.owned)?selectedStand:game.stands.find(s=>s.owned)?.id??'';
 const mill=mills.some(m=>m.id===selectedMill)?selectedMill:mills[0].id;
 function order(id:string,volume:number,sell:boolean){const g=structuredClone(game);g.plan.processing??={};g.plan.processing[id]={volume,sell};g.plan.ready={purchase:false,production:false,transport:false};onChange(g);}
 return <section className="panel processing-desk"><h2>{tr("Mill processing & downstream sales")}</h2><p>{tr("Choose deliveries into mill inventory, then schedule conversion and output sales. Log intake earns no sales revenue. Output quantities use input-equivalent m³ to make the material balance explicit; these are teaching yields, not calibrated lumber dimensions. Unsold output and unprocessed input remain in mill inventory.")}</p>
 <div className="form-grid"><label>{tr("Intake truck")}<select value={truck} onChange={e=>setTruck(e.target.value)}>{game.region.trucks.map(t=><option key={t.id} value={t.id}>{tr(t.name)}</option>)}</select></label><label>{tr("Intake source")}<select value={stand} onChange={e=>setStand(e.target.value)}>{game.stands.filter(s=>s.owned).map(s=><option key={s.id}>{s.id}</option>)}</select></label><label>{tr("Intake loads")}<input type="number" value={loads} min="1" max="1000" onChange={e=>setLoads(Number(e.target.value))}/></label></div>
 <label>{tr("Processing mill")}<select value={mill} onChange={e=>setSelectedMill(e.target.value)}>{mills.map(m=><option key={m.id} value={m.id}>{tr(m.name)}</option>)}</select></label>
 {mills.filter(m=>m.id===mill).map(m=>{const p=m.processing!,s=game.processing?.[m.id],o=game.plan.processing?.[m.id]??{volume:0,sell:false};return <article className="soft-card" key={m.id}><h3>{tr(m.name)}</h3><p>{tr("Capacity")} {p.capacityM3} {tr(weekly?"m³/week · processing cost":"m³/turn · processing cost")} {p.costM3}{tr("/m³. Received")} {quantity(s?.received??0)}{tr("; processed")} {quantity(s?.processed??0)}{tr("; residue")} {quantity(s?.residue??0)}.</p>
 <p>{tr("Input inventory:")} {Object.entries(s?.input??{}).map(([p,n])=>`${productName(p)}: ${quantity(n)} m³`).join(', ')||tr('empty')}</p>
 <p>{tr("Forest intake choices reflect the selected stand’s assortments, bucking alternatives and existing stock. Other inputs may arrive through mill transfers.")}</p>{!forestIntakeProducts(game,stand,p.inputs).length&&<p role="status">{language==='fr'?'Aucun assortiment forestier compatible pour cette source. Choisissez une autre parcelle acquise ou utilisez les transferts entre usines.':'No compatible forest assortment for this source. Choose another owned stand or use mill transfers.'}</p>}<div className="button-row">{forestIntakeProducts(game,stand,p.inputs).map(product=><button key={product} disabled={done||!allowIntake} onClick={()=>{
  if(!Number.isInteger(loads)||loads<1||loads>1000||!game.stands.find(s=>s.id===stand)?.owned){setError('Choose an owned source and 1–1000 whole loads.');return;}
  const g=structuredClone(game);g.plan.trucks[truck].push({stand,mill:m.id,product,loads,process:true});g.plan.ready={purchase:false,production:false,transport:false};onChange(g);setError('Mill intake added to the dispatch queue.');
 }}>{language==='fr'?`Ajouter une réception : ${productName(product)}`:`Queue ${productName(product)} intake`}</button>)}</div>
 {allowProcessing?<><label>{tr(weekly?"Process input m³ this week":"Process input m³ this turn")}<input type="number" disabled={done||!allowProcessing} min="0" max={p.capacityM3} value={o.volume} onChange={e=>order(m.id,Math.min(p.capacityM3,Math.max(0,Number(e.target.value))),o.sell)}/></label>
 <label><input type="checkbox" disabled={done||!allowProcessing} checked={o.sell} onChange={e=>order(m.id,o.volume,e.target.checked)}/> {tr(weekly?"Sell available outputs up to weekly demand":"Sell available outputs up to turn demand")}</label></>:<p role="note">{tr("Processing orders belong to the production role and are private. Settled inventory and sales below remain visible.")}</p>}
 <div className="table-wrap" tabIndex={0} role="region" aria-label={`${tr("Output")} · ${tr(m.name)}`}><table><thead><tr><th>{tr("Output")}</th><th>{tr("Yield")}</th><th>{tr("Price")}</th><th>{tr(weekly?"Weekly demand":"Turn demand")}</th><th>{tr("Inventory")}</th><th>{tr("Sold to date")}</th></tr></thead><tbody>{p.outputs.map(output=><tr key={output.id}><th>{tr(output.name)}</th><td>{(output.yield*100).toFixed(0)}%</td><td>{output.price}</td><td>{output.weeklyDemand}</td><td>{quantity(s?.output[output.id]??0)}</td><td>{quantity(s?.sold[output.id]??0)}</td></tr>)}</tbody></table></div>
 </article>;})}{error&&<p role="status">{tr(error)}</p>}</section>;
}
