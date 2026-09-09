import {it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RoomStore} from './rooms';
import {quebec} from '../src/scenarios/quebec';
import {withIllustrativeFacilityTransfer} from '../src/simulation/facility-transfers';

it('settles role-owned production, intake and by-product sales with private plans after room restart',()=>{
 const directory=mkdtempSync(join(tmpdir(),'forest-processing-settlement-'));
 try {
  let region=structuredClone(quebec);
  // Authored all-weather teaching fixture isolates processing from randomized classroom access.
  region.stands.forEach(s=>s.terrain=1);region.roads.edges.forEach(r=>r.bearing=1);
  region.mills.forEach(m=>m.processing={inputs:Object.keys(m.prices),capacityM3:1000,costM3:18,outputs:[{id:'chips',name:'Chips',yield:.35,price:60,weeklyDemand:250}]});
  region=withIllustrativeFacilityTransfer(region);
  let store=new RoomStore(directory);const owner=store.create(region);
  const run=(token:string,action:string,payload:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,payload);
  const purchase=run(owner.token,'invite',{role:'purchase'}).credential!;
  const production=run(owner.token,'invite',{role:'production'}).credential!;
  const transport=run(owner.token,'invite',{role:'transport'}).credential!;
  const tokens=[purchase,production,transport],link=region.facilityTransfers![0];
  const stand=region.stands.find(s=>s.supply==='guaranteed'&&s.mix['soft-saw']>0)!;
  const crew=region.crews[0].id,truck=region.trucks[0].id;
  run(production,'plan',{crews:{...store.view(owner.id,production).game.plan.crews,[crew]:[{stand:stand.id,hours:80}]},processing:{[link.source]:{volume:100,sell:false}}});
  run(transport,'plan',{trucks:{...store.view(owner.id,transport).game.plan.trucks,[truck]:[{stand:stand.id,mill:link.source,product:'soft-saw',loads:2,process:true}]}});
  for(const token of tokens)run(token,'ready',{ready:true});run(owner.token,'advance');
  const first=store.view(owner.id,owner.token).game;
  expect(first.processing![link.source].output.chips).toBeGreaterThan(0);
  run(production,'plan',{crews:Object.fromEntries(region.crews.map(c=>[c.id,[]])),processing:{[link.target]:{volume:100,sell:true}}});
  run(transport,'plan',{trucks:Object.fromEntries(region.trucks.map(t=>[t.id,[]])),facilityTransfers:[{link:link.id,truck,loads:1}]});
  for(const token of tokens)run(token,'ready',{ready:true});run(owner.token,'advance');
  store=new RoomStore(directory);
  const actual=store.view(owner.id,owner.token).game;
  const transferred=actual.history[1].facilityTransfers![0].volume;
  expect(transferred).toBeGreaterThan(0);
  expect(actual.processing![link.target].sold['fibre-product']).toBeCloseTo(transferred*.9);
  for(const token of tokens){
   const view=store.view(owner.id,token).game;
   expect(view.processing).toEqual(actual.processing);
   expect(view.history[1].facilityTransfers).toEqual(actual.history[1].facilityTransfers);
   if(token!==production)expect(view.history[1].plan.processing).toBeUndefined();
   if(token!==transport)expect(view.history[1].plan.facilityTransfers).toBeUndefined();
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
},30000);
