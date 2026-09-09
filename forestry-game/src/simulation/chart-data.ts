import type {Game,Stock,WeekResult} from './types';
import {operatingRegion} from './disruptions';
import {sum} from './engine';
const pick=(s:Stock,product:string)=>product==='all'?sum(s):(s[product]??0);
export function millPeriod(game:Game,period:number){
 const r=game.region,start=period*r.weeksPerMonth+1,end=Math.min(r.weeks,start+r.weeksPerMonth-1),history=game.history.filter(h=>h.week>=start&&h.week<=end);
 const current=Math.floor((Math.min(game.week,r.weeks)-1)/r.weeksPerMonth)===period;
 const targets=history[0]?.plan.targets??(current?game.plan.targets:Object.fromEntries(r.mills.map(m=>[m.id,m.demand[period]??{}])));
 return {start,end,assumed:!history.length&&!current,rows:r.mills.map(m=>({mill:m,products:r.products.map(p=>({product:p,target:targets[m.id]?.[p.id]??0,delivered:history.reduce((n,h)=>n+(h.millDeliveries[m.id]?.[p.id]??0),0)}))}))};
}
export function cumulativeDeliveries(game:Game,mill:string,product:string,forecast:WeekResult[]=[]){
 const r=game.region,points:{week:number;period:number;target:number;actual:number|null;forecast:number|null}[]=[];
 for(let period=0;period<Math.ceil(r.weeks/r.weeksPerMonth);period++){
  const p=millPeriod(game,period),target=p.rows.filter(row=>mill==='all'||row.mill.id===mill).reduce((n,row)=>n+row.products.filter(x=>product==='all'||x.product.id===product).reduce((v,x)=>v+x.target,0),0);
  let actual=0,projected=0;
  for(let week=p.start;week<=p.end;week++){
   const h=game.history.find(h=>h.week===week),f=forecast.find(h=>h.week===week),volume=(h:WeekResult)=>Object.entries(h.millDeliveries).filter(([id])=>mill==='all'||id===mill).reduce((n,[,s])=>n+pick(s,product),0);
   if(h){actual+=volume(h);projected=actual;}else if(f)projected+=volume(f);
   points.push({week,period,target:target*(week-p.start+1)/(p.end-p.start+1),actual:h?actual:null,forecast:f?projected:null});
  }
 }
 return points;
}
export function fleetUtilization(game:Game,report:WeekResult){
 const r=operatingRegion(game,false,report.week);
 return [...r.crews.map(c=>{const used=report.crewHours[c.id]??0,travel=report.movements.filter(m=>m.kind==='crew'&&m.resource===c.id).reduce((n,m)=>n+m.hours,0);return {id:c.id,name:c.name,kind:'crew',capacity:c.hours,used,travel,work:Math.max(0,used-travel)};}),...r.trucks.map(t=>({id:t.id,name:t.name,kind:'truck',capacity:t.hours,used:report.truckHours[t.id]??0,travel:report.truckActivity?.[t.id]?.travel??null,work:report.truckActivity?.[t.id]?.handling??report.truckHours[t.id]??0}))];
}
export function stockComposition(game:Game){return game.region.products.map(p=>({product:p,standing:game.region.stands.reduce((n,d)=>{const s=game.stands.find(s=>s.id===d.id)!;return n+(s.owned?Math.max(0,s.remaining-d.volume*Math.max(game.plan.retention,game.region.treatments?.final.retention??0))*(d.mix[p.id]??0):0);},0),roadside:game.stands.reduce((n,s)=>n+s.stock.filter(b=>b.product===p.id).reduce((v,b)=>v+b.volume,0),0)}));}
