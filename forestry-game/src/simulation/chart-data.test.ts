import {describe,it,expect} from 'vitest';
import {createGame,draftPlan,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {millPeriod,cumulativeDeliveries,stockComposition} from './chart-data';
import {rollingForecast} from './harvest-planning';
describe('operating chart accounting',()=>{
 it('uses recorded deliveries and resets cumulative totals each period',()=>{
 let g=draftPlan(createGame(quebec));for(let i=0;i<5;i++)g=advance(g);
 const points=cumulativeDeliveries(g,'all','all');
 const total=(week:number)=>Object.values(g.history[week-1].millDeliveries).flatMap(s=>Object.values(s)).reduce((a,b)=>a+b,0);
 expect(points[3].actual).toBeCloseTo([1,2,3,4].reduce((n,w)=>n+total(w),0));expect(points[4].actual).toBeCloseTo(total(5));expect(points[5].actual).toBeNull();
 const period=millPeriod(g,0);expect(period.rows.flatMap(r=>r.products).reduce((n,p)=>n+p.delivered,0)).toBeCloseTo(points[3].actual!);
 });
 it('filters mill and product and rehearses without mutating saved data',()=>{
 const g=advance(draftPlan(createGame(quebec))),before=JSON.stringify(g),m=g.region.mills[0].id,p=g.region.products[0].id;
 const points=cumulativeDeliveries(g,m,p,rollingForecast(g,4).reports);
 expect(points[0].actual).toBe(g.history[0].millDeliveries[m]?.[p]??0);expect(points[1].forecast).not.toBeNull();expect(JSON.stringify(g)).toBe(before);
 });
 it('does not count unowned timber as secured supply',()=>{
 const g=createGame(quebec);g.stands.forEach(s=>{s.owned=false;s.stock=[]});expect(stockComposition(g).every(s=>s.standing===0&&s.roadside===0)).toBe(true);
 });
});
