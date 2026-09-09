import { it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStore } from './rooms';
import { quebec } from '../src/scenarios/quebec';
it.each(['paid','no-cash'] as const)('enforces %s settlement, company acceptance and transport ownership across persistence',(settlement)=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-reciprocal-'));
 try {
  const r=structuredClone(quebec),product=r.products.find(p=>r.mills.filter(m=>p.id in m.prices).length>=2)!.id,mills=r.mills.filter(m=>product in m.prices);
  r.reciprocalPairs=[{settlement,routing:'flexible',minimumOwnA:10,minimumOwnB:20,id:'pair',name:'Teaching pair',standA:r.stands[0].id,standB:r.stands[1].id,millA:mills[0].id,millB:mills[1].id,product,limitM3:100,ownReserveM3:0,opens:1,deadline:4}];
  const store=new RoomStore(dir),owner=store.create(r);
  const act=(a:string,p:unknown,t=owner.token)=>store.mutate(owner.id,t,store.view(owner.id,t).revision,a,p);
  const tokens=Object.fromEntries(['company1','company2','company3','transport','production','purchase'].map(role=>[role,act('invite',{role}).credential!]));
  expect(()=>act('accept-reciprocal',{id:'pair',company:'B',method:'equal'},tokens.company1)).toThrow('assigned company');
  expect(()=>act('accept-reciprocal',{id:'pair',company:'A',method:'equal'},tokens.company3)).toThrow('assigned company');
  act('accept-reciprocal',{id:'pair',company:'A',method:'equal'},tokens.company1);
  expect(()=>act('accept-reciprocal',{id:'pair',company:'B',method:'cost-weighted'},tokens.company2)).toThrow('frozen');
  act('accept-reciprocal',{id:'pair',company:'B',method:'equal'},tokens.company2);
  const reciprocal=[{pair:'pair',truckA:r.trucks[0].id,truckB:r.trucks[1].id,loads:1}];
  expect(()=>act('plan',{reciprocal},tokens.production)).toThrow('another role');
  act('plan',{reciprocal},tokens.transport);
  expect(store.view(owner.id,tokens.transport).game.plan.reciprocal).toHaveLength(1);
  expect(store.view(owner.id,tokens.company1).game.plan.reciprocal).toBeUndefined();
  expect(new RoomStore(dir).view(owner.id,owner.token).game.reciprocal?.pair.accepted).toEqual(['A','B']);
  expect(()=>act('renew-reciprocal',{id:'pair',opens:5,deadline:8},tokens.company1)).toThrow();
  const renewed=act('renew-reciprocal',{id:'pair',opens:5,deadline:8});
  const child=renewed.game.region.reciprocalPairs!.find(p=>p.renews==='pair')!;
  expect(child.settlement).toBe(settlement);
  expect(child.minimumOwnA).toBe(10);expect(child.minimumOwnB).toBe(20);
  expect(renewed.game.reciprocal!.pair.acceptedWeek).toBe(1);
  expect(renewed.game.reciprocal![child.id].acceptedWeek).toBeUndefined();
  expect(new RoomStore(dir).view(owner.id,owner.token).game.reciprocal!.pair.terms.settlement).toBe(settlement);
  expect(renewed.game.reciprocal![child.id]).toMatchObject({accepted:[],method:'equal',movedM3:0});
  expect(renewed.game.plan.ready).toEqual({purchase:false,production:false,transport:false});
  expect(()=>act('renew-reciprocal',{id:'pair',opens:9,deadline:12})).toThrow('already');
  expect(new RoomStore(dir).view(owner.id,owner.token).game.reciprocal![child.id].accepted).toEqual([]);
  expect(()=>act('accept-reciprocal',{id:child.id,method:'equal'},tokens.company1)).toThrow('unavailable');
  for(let turn=0;turn<4;turn++){
   for(const role of ['purchase','production','transport'])act('ready',{ready:true},tokens[role]);
   act('advance',{});
  }
  act('accept-reciprocal',{id:child.id,method:'equal'},tokens.company1);
  expect(store.view(owner.id,owner.token).game.reciprocal![child.id].accepted).toEqual(['A']);
  act('accept-reciprocal',{id:child.id,method:'equal'},tokens.company2);
  expect(new RoomStore(dir).view(owner.id,owner.token).game.reciprocal![child.id].accepted).toEqual(['A','B']);


 }finally{rmSync(dir,{recursive:true,force:true});}
});
