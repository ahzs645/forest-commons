import { useLanguage } from "./i18n";
import { useId } from "react";
import { scaleLinear, scaleOrdinal, schemeTableau10 } from "d3";
import { cost } from "./coalition";
export default function CoalitionCharts({ count, groups, shares }: { count: 4 | 5; groups: number[]; shares: Record<string, number> }) {
 const {t: tr}=useLanguage();
  const id = useId(), members = Array.from({length:count},(_,i)=>String(i+1));
  const color = scaleOrdinal<number,string>().domain([...new Set(groups.slice(0,count))]).range(schemeTableau10);
  const nodes = members.map((company,i)=>({company, group:groups[i], x:220+130*Math.cos(-Math.PI/2+i*2*Math.PI/count),y:155+115*Math.sin(-Math.PI/2+i*2*Math.PI/count)}));
  const rows = members.map(company=>({company, standalone:cost([company],count), savings:shares[company] ?? 0, allocated:cost([company],count)-(shares[company]??0)}));
  const extent = [Math.min(0,...rows.flatMap(r=>[r.allocated,r.savings])),Math.max(1,...rows.flatMap(r=>[r.standalone,r.allocated,r.savings]))];
  const x = scaleLinear().domain(extent).nice().range([130,560]);
  return <section aria-labelledby={id}>
    <h3 id={id}>{tr("Partnership and allocation picture")}</h3>
    <svg role="img" aria-label={tr("Current coalition membership: lines join companies assigned to the same group; positions are schematic")} viewBox="0 0 440 315" style={{width:"100%",maxWidth:460}}>
      {nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>a.group===b.group).map(b=><line key={`${a.company}-${b.company}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color(a.group)} strokeWidth="3" opacity=".6"/>))}
      {nodes.map(n=><g key={n.company}><circle cx={n.x} cy={n.y} r="29" fill={color(n.group)}/><text x={n.x} y={n.y+4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{tr("Co.")}{" "}{n.company}</text><text x={n.x} y={n.y+46} textAnchor="middle" fontSize="12" fill="currentColor">{tr("Group")} {n.group}</text></g>)}
    </svg>
    <p className="muted">{tr("Lines show shared group membership, not freight routes or company geography. The circle layout is schematic. Membership does not imply that an offer has been accepted.")}</p>
    <svg role="img" aria-label={tr("Standalone cost, allocated cost and savings for each company in exercise kSEK; values also appear in the allocation table")} viewBox={`0 0 650 ${count*112+35}`} style={{width:"100%",maxWidth:850}}>
      <line x1={x(0)} x2={x(0)} y1="0" y2={count*112} stroke="currentColor" opacity=".4"/>
      {rows.map((r,i)=><g key={r.company} transform={`translate(0,${i*112})`}><text x="0" y="13" fill="currentColor" fontSize="13">{tr("Company")} {r.company}</text>{([{label:"Standalone",value:r.standalone,color:"#728394"},{label:"Allocated",value:r.allocated,color:"#167d72"},{label:"Savings",value:r.savings,color:r.savings<0?"#bd442d":"#b77b18"}]).map((b,j)=><g key={tr(b.label)} transform={`translate(0,${23+j*25})`}><text x="20" y="16" fontSize="10" fill="currentColor">{tr(b.label)}</text><rect x={Math.min(x(0),x(b.value))} width={Math.abs(x(b.value)-x(0))} height="18" fill={b.color}/><text x={x(b.value)+5} y="14" fontSize="10" fill="currentColor">{b.value.toFixed(1)}</text></g>)}</g>)}
      <text x="130" y={count*112+20} fontSize="12" fill="currentColor">{tr("Exercise kSEK · negative savings mean a loss")}</text>
    </svg>
    <p className="muted">{tr("Standalone costs come from the selected four- or five-company handout. Allocated cost equals standalone cost minus the current proposed savings, including custom edits. These teaching amounts are separate from campaign cash. The table below provides exact values and editable group membership.")}</p>
  </section>;
}
