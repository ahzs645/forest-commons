import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,draftPlan,advance,sum} from './engine';
import {startStewardship,stewardshipYear,stewardshipHabitat,validateStewardship} from './stewardship';
describe('Conservation strategy and visual evidence',()=>{
 it('drafts thinning before projecting transport and respects cumulative retention',()=>{
  const g=createGame(quebec);const thin=draftPlan(g,{treatment:'thinning'});
  expect(Object.values(thin.plan.crews).flat().every(o=>o.treatment==='thinning')).toBe(true);
  const done=advance(thin);
  expect(sum(done.history[0].harvested)).toBeLessThan(sum(advance(draftPlan(g)).history[0].harvested));
  for(const s of done.stands) expect(s.remaining).toBeGreaterThanOrEqual(quebec.stands.find(d=>d.id===s.id)!.volume*.65-.001);
  expect(()=>draftPlan(g,{treatment:'invented'})).toThrow('Unknown');
 }, 15000);
 it('reserves whole loads within remaining commitments across all trucks',()=>{
  const g=createGame(quebec);
  for(const m of g.region.mills)for(const p of g.region.products)g.plan.targets[m.id][p.id]=85;
  const d=draftPlan(g,{commitmentAware:true});const booked:Record<string,number>={};
  for(const t of d.region.trucks)for(const o of d.plan.trucks[t.id]) {const k=`${o.mill}/${o.product}`;booked[k]=(booked[k]??0)+o.loads*t.payload;}
  expect(Object.keys(booked).length).toBeGreaterThan(0);
  for(const volume of Object.values(booked))expect(volume).toBeLessThanOrEqual(85);
  for(const m of g.region.mills)for(const p of g.region.products)g.plan.targets[m.id][p.id]=0;
  expect(Object.values(draftPlan(g,{commitmentAware:true}).plan.trucks).flat()).toHaveLength(0);
 });
 it('distinguishes managed habitat from landscape and preserves old annual histories',()=>{
  const g=createGame(quebec),s=startStewardship(g);const id=s.stands.find(s=>s.managed)!.id;
  const next=stewardshipYear(g.region,s,{[id]:'final'});const metrics=stewardshipHabitat(g.region,next);
  expect(metrics.managed).toBeLessThan(metrics.landscape);expect(next.history[0].managedHabitat).toBe(metrics.managed);
  validateStewardship(g.region,next);delete next.history[0].managedHabitat;expect(()=>validateStewardship(g.region,next)).not.toThrow();
  next.history[0].managedHabitat=2;expect(()=>validateStewardship(g.region,next)).toThrow();
  for(const t of s.stands)t.managed=false;expect(stewardshipHabitat(g.region,s).managed).toBeNull();
 });
});

it('ages projected stock once before booking dispatch without changing stored batches',()=>{
 const g=createGame(quebec);
 for(const s of g.stands)s.remaining=0;
 const saw=g.region.products.find(p=>p.downgradeTo)!;
 const pulp=g.region.products.find(p=>p.id===saw.downgradeTo)!;
 const stand=g.stands.find(s=>s.owned)!;
 stand.stock=[{product:saw.id,volume:1000,week:g.week-saw.maxFreshWeeks,quality:1},{product:pulp.id,volume:1000,week:g.week-pulp.maxFreshWeeks,quality:1}];
 const before=JSON.stringify(stand.stock),d=draftPlan(g),orders=Object.values(d.plan.trucks).flat();
 expect(orders.length).toBeGreaterThan(0);
 expect(orders.every(o=>o.product===pulp.id)).toBe(true);
 expect(orders.reduce((n,o)=>n+o.loads*g.region.trucks[0].payload,0)).toBeLessThanOrEqual(1000);
 expect(JSON.stringify(g.stands.find(s=>s.id===stand.id)!.stock)).toBe(before);
 expect(JSON.stringify(d.stands.find(s=>s.id===stand.id)!.stock)).toBe(before);
});
