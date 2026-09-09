import type { RegionDefinition } from './types';
export type CalibrationStatus='unknown'|'source-identified'|'review-needed'|'reviewed'|'rejected';
export interface CalibrationEntry {sourceUrl:string;license:string;sourceDate:string;units:string;reviewer:string;status:CalibrationStatus;notes:string;reviewedFingerprint:string}
export interface CalibrationManifest {version:1;targetRegion:string;entries:Record<string,CalibrationEntry>}
const bc='https://www2.gov.bc.ca/gov/content/';
export const calibrationInputs: {id:string;group:string;title:string;units:string;sourceUrl:string;value:(r:RegionDefinition)=>unknown}[]=[
 {id:'geography',group:'Geography',title:'Road graph and mill/stand locations',units:'WGS84 longitude/latitude; km',sourceUrl:bc+'data/finding-and-sharing/data-distribution-services',value:r=>({roads:r.roads,mills:r.mills.map(m=>[m.id,m.position,m.node]),stands:r.stands.map(s=>[s.id,s.position,s.polygon,s.node])})},
 {id:'inventory',group:'Timber/products',title:'Stand area and standing volume',units:'ha; m³',sourceUrl:bc+'industry/forestry/managing-our-forest-resources/forest-inventory/data-management-and-access/vri-data-standards',value:r=>r.stands.map(s=>[s.id,s.hectares,s.volume])},
 {id:'products',group:'Timber/products',title:'Assortment recovery and freshness',units:'product IDs; fraction; weeks',sourceUrl:bc+'industry/forestry/managing-our-forest-resources/forest-inventory/data-management-and-access/vri-data-standards',value:r=>({products:r.products,mixes:r.stands.map(s=>[s.id,s.mix]),buckingProfiles:r.buckingProfiles})},
 {id:'access',group:'Access/trucking',title:'Terrain, road restrictions, seasonal access and events',units:'model access classes; km/h; weeks',sourceUrl:bc+'industry/natural-resource-use/resource-roads/engineering-standards-guidelines/engineering-manual',value:r=>({stands:r.stands.map(s=>[s.id,s.terrain,s.zone]),roads:r.roads.edges.map(e=>[e.id,e.bearing,e.speed,e.zone]),weather:r.weather,events:r.disruptions})},
 {id:'fleet',group:'Access/trucking',title:'Truck payload, travel and handling capacity',units:'m³/load; hours/week; hours/load',sourceUrl:bc+'industry/natural-resource-use/resource-roads/engineering-standards-guidelines/engineering-manual',value:r=>r.trucks},
 {id:'crews',group:'Access/trucking',title:'Crew productivity and relocation',units:'m³/hour; hours/week; km/hour',sourceUrl:'',value:r=>({crews:r.crews,stands:r.stands.map(s=>[s.id,s.productivity])})},
 {id:'tenure',group:'Tenure',title:'Ownership, supply access and auction rules',units:'supply categories; weeks; contract terms',sourceUrl:bc+'industry/forestry/forest-tenures',value:r=>({stands:r.stands.map(s=>[s.id,s.supply,s.auctionWeek]),refusal:r.economy.refusalPercent,bcTenure:r.bcTenure})},
 {id:'growth',group:'Growth/ecology',title:'Annual growth, regeneration and yield limits',units:'m³/ha/year; years; m³/ha',sourceUrl:bc+'industry/forestry/managing-our-forest-resources/forest-inventory/growth-and-yield-modelling/table-interpolation-program-for-stand-yields-tipsy',value:r=>r.stewardship??null},
 {id:'ecology',group:'Growth/ecology',title:'Treatments, retention, habitat and emissions',units:'fractions; model indices; kg CO₂',sourceUrl:bc+'industry/forestry/managing-our-forest-resources/forest-inventory/growth-and-yield-modelling/variable-density-yield-projection-vdyp/growth-relationships-and-model-components',value:r=>({ecology:r.ecology,treatments:r.treatments,objectives:r.objectives})},
 {id:'prices',group:'Economics',title:'Mill prices, assortment demand and service terms',units:'currency/m³; m³/month',sourceUrl:bc+'industry/forestry/competitive-forest-industry/timber-pricing',value:r=>({currency:r.currency,mills:r.mills.map(m=>[m.id,m.prices,m.demand,m.spotPrices,m.processing]),offtakeOffers:r.offtakeOffers,bonus:r.economy.bonusPerM3,shortfall:r.economy.shortfallPerM3,tolerance:r.economy.tolerance})},
 {id:'acquisition',group:'Economics',title:'Timber asking prices and procurement expenses',units:'currency/lot; currency/m³',sourceUrl:bc+'industry/forestry/competitive-forest-industry/timber-pricing',value:r=>({currency:r.currency,stands:r.stands.map(s=>[s.id,s.askingPrice,s.harvestCost])})},
 {id:'operating',group:'Economics',title:'Fleet, labour, storage and terminal costs',units:'currency/km; currency/hour; currency/m³',sourceUrl:'',value:r=>({economy:r.economy,bcMarket:r.bcMarket,mobilization:r.mobilization,turnDurationWeeks:r.turnDurationWeeks,crews:r.crews.map(c=>[c.id,c.hourlyCost,c.relocationCostKm]),trucks:r.trucks.map(t=>[t.id,t.costKm,t.fixedWeekly])})},
];
/** A change detector only, not a digital signature or evidence of professional approval. */
export function calibrationFingerprint(region:RegionDefinition,id:string):string {
 const input=calibrationInputs.find(d=>d.id===id);if(!input)throw Error('Unknown calibration input.');
 const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
 const json=JSON.stringify(canonical(input.value(region)))??'null';let hash=2166136261;for(let i=0;i<json.length;i++){hash^=json.charCodeAt(i);hash=Math.imul(hash,16777619);}return `fnv1a-${(hash>>>0).toString(16)}-${json.length}`;
}
export function emptyCalibration(region:RegionDefinition,bcSources=false):CalibrationManifest {
 return {version:1,targetRegion:bcSources?'British Columbia — review workspace':region.name,entries:Object.fromEntries(calibrationInputs.map(d=>[d.id,{sourceUrl:bcSources?d.sourceUrl:'',license:'',sourceDate:'',units:d.units,reviewer:'',status:bcSources&&d.sourceUrl?'source-identified':'unknown',notes:bcSources?'Official source starting point checked 2026-09-07. Dataset selection, applicability, licence and numerical calibration remain unreviewed. This link does not validate the existing regional values.':'',reviewedFingerprint:''}]))};
}
export function calibrationMissing(e:CalibrationEntry):string[]{return (['sourceUrl','license','sourceDate','units','reviewer','notes'] as const).filter(k=>!e[k]?.trim());}
export function validateCalibration(value:unknown):asserts value is CalibrationManifest|undefined {
 if(value===undefined)return;
 const m=value as CalibrationManifest;
 if(!m||m.version!==1||typeof m.targetRegion!=='string'||!m.targetRegion.trim()||m.targetRegion.length>300||!m.entries||typeof m.entries!=='object'||Array.isArray(m.entries)||Object.keys(m.entries).length>calibrationInputs.length)throw Error('Invalid regional calibration manifest.');
 for(const [id,e] of Object.entries(m.entries)){
  if(!calibrationInputs.some(d=>d.id===id)||!e||!['unknown','source-identified','review-needed','reviewed','rejected'].includes(e.status))throw Error('Invalid calibration input/status.');
  for(const k of ['sourceUrl','license','sourceDate','units','reviewer','notes','reviewedFingerprint'] as const)if(typeof e[k]!=='string'||e[k].length>8000)throw Error('Invalid calibration evidence text.');
  if(e.sourceUrl){try{const u=new URL(e.sourceUrl);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();}catch{throw Error('Calibration source must be an HTTP(S) URL without credentials.');}}
  if(e.sourceDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(e.sourceDate)||Number.isNaN(Date.parse(e.sourceDate))||new Date(e.sourceDate).toISOString().slice(0,10)!==e.sourceDate))throw Error('Calibration date must be a valid YYYY-MM-DD date.');
  if(e.status==='reviewed'&&(calibrationMissing(e).length||!/^fnv1a-[0-9a-f]+-\d+$/.test(e.reviewedFingerprint)))throw Error('Reviewed inputs need complete source, licence, date, units, reviewer, notes and value fingerprint.');
 }
}
export function auditCalibration(region:RegionDefinition,manifest=region.calibration){
 return calibrationInputs.map(input=>{const e=manifest?.entries[input.id],missing=e?calibrationMissing(e):['entry'],stale=e?.status==='reviewed'&&e.reviewedFingerprint!==calibrationFingerprint(region,input.id);return {...input,entry:e,missing,stale,reviewed:!!e&&e.status==='reviewed'&&!stale&&!missing.length};});
}
export function compareCalibration(a:CalibrationManifest,b:CalibrationManifest){return calibrationInputs.map(d=>({id:d.id,title:d.title,before:a.entries[d.id]?.status??'missing',after:b.entries[d.id]?.status??'missing',changed:JSON.stringify(a.entries[d.id])!==JSON.stringify(b.entries[d.id])})).filter(d=>d.changed);}
export function recordCalibrationReview(region:RegionDefinition,manifest:CalibrationManifest,id:string):CalibrationManifest {
 const next=structuredClone(manifest),e=next.entries[id];if(!e)throw Error('Add this evidence entry first.');e.status='reviewed';e.reviewedFingerprint=calibrationFingerprint(region,id);validateCalibration(next);return next;
}
