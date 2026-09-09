import type { NetworkCase, NetworkOffer, NetworkSolution } from './simulation/network-dispatch';
export type NetworkRun={independent:NetworkSolution;pooled:NetworkSolution;network:NetworkCase;context:string};
export type NetworkLabSave={version:1;editor:string;run:NetworkRun|null;offer:NetworkOffer|null};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const numbers=(v:unknown):v is Record<string,number>=>object(v)&&Object.values(v).every(finite);
/** Rendering-shape check, not certification of saved optimization results. */
export function parseNetworkLabSave(raw:string):NetworkLabSave {
 const v=JSON.parse(raw);
 if(!object(v)||v.version!==1||typeof v.editor!=='string')throw Error('Invalid network lab save.');
 if(v.run!==null){
  const r=v.run;
  if(!object(r)||typeof r.context!=='string'||!object(r.network))throw Error('Invalid network lab result.');
  const n=r.network;
  if(typeof n.note!=='string'||!Array.isArray(n.companies)||!n.companies.every(c=>object(c)&&typeof c.id==='string'&&typeof c.name==='string')||!Array.isArray(n.cargo)||!n.cargo.every(c=>object(c)&&['id','company','from','to'].every(k=>typeof c[k]==='string')&&['volume','release','deadline'].every(k=>finite(c[k]))))throw Error('Invalid network lab manifest.');
  for(const mode of ['independent','pooled']){
   const s=r[mode];
   if(!object(s)||s.mode!==mode||s.status!=='optimal-bounded-policy'||!['cost','fixedCost','columns'].every(k=>finite(s[k]))||!numbers(s.companyCosts)||!n.companies.every(c=>finite((s.companyCosts as Record<string,unknown>)[c.id]))||!strings(s.outsourced)||!Array.isArray(s.itineraries)||!s.itineraries.every(i=>object(i)&&typeof i.vehicle==='string'&&typeof i.company==='string'&&Array.isArray(i.legs)&&i.legs.every(l=>object(l)&&['from','to'].every(k=>typeof l[k]==='string')&&(l.job===null||typeof l.job==='string')&&['week','emptyKm','loadedKm','returnKm','hours','cost'].every(k=>finite(l[k])))))throw Error('Invalid network lab schedule.');
  }
 }
 if(v.offer!==null){
  const o=v.offer;
  if(!v.run||!object(o)||typeof o.signature!=='string'||!numbers(o.costs)||!numbers(o.savings)||!strings(o.accepted)||!strings(o.rejected)||!['proposed','agreed','rejected'].includes(String(o.status)))throw Error('Invalid network lab offer.');
  for(const c of (v.run as NetworkRun).network.companies)if(!finite(o.costs[c.id])||!finite(o.savings[c.id]))throw Error('Incomplete network lab allocation.');
 }
 return v as unknown as NetworkLabSave;
}
