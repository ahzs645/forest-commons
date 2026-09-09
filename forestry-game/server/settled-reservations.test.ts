import {it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RoomStore} from './rooms';
import {quebec} from '../src/scenarios/quebec';
it.each([true,false])('preserves shared settled reservation evidence after reload (haul=%s)',(haul)=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-reservation-roles-'));
 try{
  let store=new RoomStore(dir);const owner=store.create(accessibleRegion());
  const act=(token:string,action:string,payload:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,payload);
  const tokens=Object.fromEntries(['purchase','production','transport'].map(role=>[role,act(owner.token,'invite',{role}).credential!]));
  act(tokens.production,'plan',{crews:{...store.view(owner.id,tokens.production).game.plan.crews,C1:[{stand:'Q01',hours:2}]},reservations:[{id:'reservation-1',stand:'Q01',mill:'M1',product:'soft-saw',volume:100,market:'ordinary'}]});
  if(haul)act(tokens.transport,'plan',{trucks:{...store.view(owner.id,tokens.transport).game.plan.trucks,T1:[{stand:'Q01',mill:'M1',product:'soft-saw',loads:1}]}});
  for(const token of Object.values(tokens))act(token,'ready',{ready:true});
  act(owner.token,'advance');
  const expected=store.view(owner.id,owner.token).game.history[0].reservationFulfillment;
  if(haul){
   expect(expected?.['reservation-1']).toBeGreaterThan(0);
   expect(expected?.['reservation-1']).toBeLessThan(100);
  }else expect(expected).toEqual({});
  store=new RoomStore(dir);
  for(const token of Object.values(tokens)){
   const h=store.view(owner.id,token).game.history[0];
   expect(h.reservationFulfillment).toEqual(expected);
   expect(h.plan.reservations?.[0]).toMatchObject({id:'reservation-1',volume:100});
   expect(h.plan.crews).toEqual({});expect(h.plan.trucks).toEqual({});expect(h.plan.bids).toEqual({});
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

function accessibleRegion(){
 const region=structuredClone(quebec);
 // This test isolates role disclosure; random classroom weather must not close its route.
 region.stands.forEach(stand=>stand.terrain=1);
 region.roads.edges.forEach(edge=>edge.bearing=1);
 return region;
}
