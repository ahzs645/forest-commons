import type {Game,RegionDefinition} from './types';
export function validateVisualRegion(r:RegionDefinition){
 if(r.roads.edges.some(e=>e.roadClass!==undefined&&!['public','forest'].includes(e.roadClass)))throw Error('Invalid scenario: road class');
 const c=r.weatherCharts;if(!c)return;
 if(r.weeks>52||(c.model!==undefined&&c.model!=="category-illustration")||!Number.isInteger(c.startCalendarWeek)||c.startCalendarWeek<1||c.startCalendarWeek>52||typeof c.provenance!=='string'||!c.provenance.length||c.provenance.length>5000||!c.scenarios||Object.keys(c.scenarios).some(id=>!r.weather[id]))throw Error('Invalid scenario: weather chart metadata');
 for(const id of Object.keys(r.weather))for(const kind of ['forecast','actual'] as const)for(const z of r.zones){
  const series=c.scenarios[id]?.[kind]?.[z.id];
  if(!Array.isArray(series)||series.length!==52||series.some(p=>!p||!Number.isFinite(p.temperatureC)||Math.abs(p.temperatureC)>100||!Number.isFinite(p.snowCm)||p.snowCm<0||p.snowCm>10000||!Number.isFinite(p.precipitationMm)||p.precipitationMm<0||p.precipitationMm>10000))throw Error('Invalid scenario: weekly weather chart values');
 }
}
export function validateProductionRecords(g:Game){
 for(const h of g.history){
 if(h.truckActivity!==undefined){
  if(!h.truckActivity||typeof h.truckActivity!=='object'||Array.isArray(h.truckActivity))throw Error('Invalid truck activity');
  for(const [id,a] of Object.entries(h.truckActivity))if(!g.region.trucks.some(t=>t.id===id)||!a||![a.travel,a.handling].every(n=>Number.isFinite(n)&&n>=0)||Math.abs(a.travel+a.handling-(h.truckHours[id]??0))>0.01)throw Error('Truck activity hours do not balance');
 }
 if(h.production===undefined)continue;
 if(!Array.isArray(h.production)||h.production.length>10000)throw Error('Invalid production records');
 const totals:Record<string,number>={},ends:Record<string,number>={};
 for(const p of h.production){
 const crew=g.region.crews.find(c=>c.id===p.crew);
 if(!crew||!g.region.stands.some(s=>s.id===p.stand)||!['public','forest','unknown'].includes(p.roadClass)||!['final','thinning',...Object.keys(g.region.treatments??{})].includes(p.treatment)||![p.startHour,p.endHour,p.relocationHours].every(n=>Number.isFinite(n)&&n>=0)||p.startHour<(ends[p.crew]??0)-1e-6||p.endHour<p.startHour||p.endHour>crew.hours+1e-6||p.relocationHours>p.endHour-p.startHour+1e-6||!p.products||typeof p.products!=='object'||Array.isArray(p.products))throw Error('Invalid production interval');
 ends[p.crew]=p.endHour;
 for(const [id,n]of Object.entries(p.products)){if(!g.region.products.some(p=>p.id===id)||!Number.isFinite(n)||n<0)throw Error('Invalid production volume');totals[id]=(totals[id]??0)+n;}
 }
 for(const p of g.region.products)if(Math.abs((totals[p.id]??0)-(h.harvested[p.id]??0))>0.01)throw Error('Production chart mass balance');
 }
}
