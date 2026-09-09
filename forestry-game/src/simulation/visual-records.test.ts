import {describe,it,expect} from 'vitest';
import {createGame,draftPlan,advance,sum} from './engine';
import {validateRegion,parseGame} from './validation';
import {serializeGame} from './save-format';
import {quebec} from '../scenarios/quebec';
import {productionSeries} from '../ProductionCharts';
describe('Source-aware production and weather charts',()=>{
 it('records ordered elapsed intervals and conserves assortment production',()=>{
 const g=advance(draftPlan(createGame(quebec))),h=g.history[0];
 expect(h.production!.length).toBeGreaterThan(0);
 for(const [id,a] of Object.entries(h.truckActivity!))expect(a.travel+a.handling).toBeCloseTo(h.truckHours[id]);
 expect(h.production!.reduce((n,p)=>n+sum(p.products),0)).toBeCloseTo(sum(h.harvested));
 for(const c of g.region.crews){const slots=h.production!.filter(p=>p.crew===c.id);expect(slots.reduce((n,p)=>n+p.endHour-p.startHour,0)).toBeCloseTo(h.crewHours[c.id]);}
 expect(h.production!.every(p=>p.roadClass==='forest')).toBe(true);
 expect(productionSeries(g,'all')[0].forest).toBeCloseTo(sum(h.harvested));
 expect(()=>parseGame(serializeGame(g))).not.toThrow();
 h.production![0].products['soft-pulp']+=10;expect(()=>parseGame(serializeGame(g))).toThrow('mass balance');
 });
 it('keeps legacy production unknown instead of fabricating source classes',()=>{
 const g=advance(draftPlan(createGame(quebec)));delete g.history[0].production;
 expect(productionSeries(g,'all')[0].unknown).toBeCloseTo(sum(g.history[0].harvested));expect(()=>parseGame(serializeGame(g))).not.toThrow();
 });
 it('validates optional numerical weather data and prevents unsupported multi-year aliasing',()=>{
 const r=structuredClone(quebec);expect(()=>validateRegion(r)).not.toThrow();r.weatherCharts!.scenarios[Object.keys(r.weather)[0]].forecast.north[0].snowCm=-1;expect(()=>validateRegion(r)).toThrow('weather chart values');
 const legacy=structuredClone(quebec);delete legacy.weatherCharts;expect(()=>validateRegion(legacy)).not.toThrow();
 });
 it('rejects malformed future overrides on direct simulation calls without changing input',()=>{
 const g=draftPlan(createGame(quebec));g.scheduledCrews={2:{C1:[{stand:'Q01',hours:999}]}};const before=JSON.stringify(g);expect(()=>advance(g)).toThrow('scheduled');expect(JSON.stringify(g)).toBe(before);
 });
});
