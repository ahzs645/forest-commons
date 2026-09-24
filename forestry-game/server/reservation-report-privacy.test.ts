import {it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RoomStore} from './rooms';
import {quebec} from '../src/scenarios/quebec';
import {parseGame} from '../src/simulation/validation';
it('shares settled reservation results while keeping crew/truck orders private',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-reservation-privacy-'));
 try{
  const store=new RoomStore(dir),owner=store.create(accessibleRegion());
  const act=(token:string,action:string,p:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,p);
  const tokens=Object.fromEntries(['purchase','production','transport'].map(role=>[role,act(owner.token,'invite',{role}).credential!]));
  act(tokens.production,'plan',{crews:{...store.view(owner.id,tokens.production).game.plan.crews,C1:[{stand:'Q01',hours:40}]},reservations:[{id:'r1',stand:'Q01',product:'soft-saw',mill:'M1',volume:30,market:'ordinary'}]});
  act(tokens.transport,'plan',{trucks:{...store.view(owner.id,tokens.transport).game.plan.trucks,T1:[{stand:'Q01',mill:'M1',product:'soft-saw',loads:1}]}});
  for(const token of Object.values(tokens))act(token,'ready',{ready:true});act(owner.token,'advance');
  for(const token of Object.values(tokens)){
   const g=store.view(owner.id,token).game,h=g.history[0];
   expect(h.reservationFulfillment).toEqual({r1:30});expect(h.plan.crews).toEqual({});expect(h.plan.trucks).toEqual({});expect(()=>parseGame(JSON.stringify(g))).not.toThrow();
  }
  expect(store.view(owner.id,tokens.purchase).game.history[0].production).toBeUndefined();
  expect(store.view(owner.id,owner.token).game.history[0].plan.crews.C1).toHaveLength(1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

function accessibleRegion(){
 const region=structuredClone(quebec);
 // This test isolates role disclosure; random classroom weather must not close its route.
 // Weather still slows crews (a thaw week yields about 39 m³ of Q01 sawlog in 40 h), so the reservation stays at 30 m³.
 region.stands.forEach(stand=>stand.terrain=1);
 region.roads.edges.forEach(edge=>edge.bearing=1);
 return region;
}
