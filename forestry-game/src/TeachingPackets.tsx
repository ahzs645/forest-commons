import {useLanguage} from './i18n';
import {teachingFrench,companyExplanationsFr,geographyExplanationFr} from './teaching-french';
import { useState } from 'react';
import type { Negotiation } from './simulation/types';
import { teachingPacket, type TeachingPacketKind } from './teaching-packets';
import {companyExplanations,geographyExplanation} from './company-explanations';
const maps=import.meta.glob('./assets/teaching/*.jpeg',{eager:true,query:'?inline',import:'default'}) as Record<string,string>;
const images=Object.fromEntries(Array.from({length:5},(_,i)=>[String(i+1),maps[`./assets/teaching/company-5-image${i+1}.jpeg`]]));
export default function TeachingPackets({negotiation}:{negotiation:Negotiation}){
 const {language}=useLanguage();const tr=(text:string)=>language==='fr'?(teachingFrench[text]??text):text;
 const [kind,setKind]=useState<TeachingPacketKind>('roles');
 return <details><summary>{tr('Geography and printable teaching packets')}</summary><p>{language==='fr'?geographyExplanationFr:geographyExplanation}</p><div className="metric-grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 260px), 1fr))"}}>{Array.from({length:negotiation.count},(_,i)=>String(i+1)).map(c=><article key={c}><h3>{tr("Company")} {c}</h3><img src={images[c]} alt={language==='fr'?`Carte source de l’entreprise ${c} : approvisionnements verts et industries rouges`:`Handout map for company ${c}: green supply areas and red receiving industries`} style={{width:'100%',maxHeight:300,objectFit:'contain'}}/><p>{language==='fr'?companyExplanationsFr[c]:companyExplanations[c]}</p></article>)}</div><label>{tr('Packet contents')}<select value={kind} onChange={e=>setKind(e.target.value as TeachingPacketKind)}><option value="roles">{tr('Participant role cards')}</option><option value="rounds">{tr('Round A and B worksheets')}</option><option value="debrief">{tr('Debrief and recorded offers')}</option></select></label><button onClick={()=>{const url=URL.createObjectURL(new Blob([teachingPacket(negotiation.count,kind,negotiation,images,language)],{type:'text/html'}));const a=document.createElement('a');a.href=url;a.download=`forest-${negotiation.count}-company-${kind}-${language}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>{tr('Download printable')} {negotiation.count} {language==='fr'?'entreprises':'companies'}</button><p>{tr('Open the downloaded HTML in a browser, then print or save as PDF. Role cards include the source maps. Worksheets use the selected dataset; the debrief includes recorded offers and their acceptance status.')}</p></details>;
}
