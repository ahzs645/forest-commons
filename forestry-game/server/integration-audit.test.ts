import {it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {RoomStore} from './rooms';import {quebec} from '../src/scenarios/quebec';import {teachingRepeatedOfftakeOffers} from '../src/simulation/offtake';
it('audit protects transfer and repeated agreement role ownership, privacy and readiness',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-integration-audit-'));try{
 const r=structuredClone(quebec);r.offtakeOffers=teachingRepeatedOfftakeOffers(r);const a=r.mills[0],b=r.mills[1];
 for(const m of [a,b])m.processing={inputs:Object.keys(m.prices),capacityM3:100,costM3:2,outputs:[{id:'chips',name:'Chips',yield:1,price:20,weeklyDemand:100}]};
 r.facilityTransfers=[{id:'link',source:a.id,target:b.id,output:'chips',input:Object.keys(b.prices)[0],inputEquivalentRatio:1}];
 const store=new RoomStore(dir),owner=store.create(r),run=(token:string,action:string,p:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,p);
 const purchase=run(owner.token,'invite',{role:'purchase'}).credential!,production=run(owner.token,'invite',{role:'production'}).credential!,transport=run(owner.token,'invite',{role:'transport'}).credential!;
 const agreement=r.offtakeOffers[0].agreement;
 const facilityTransfers=[{link:'link',truck:r.trucks[0].id,loads:1}];
 expect(()=>run(production,'plan',{facilityTransfers})).toThrow('another role');run(transport,'plan',{facilityTransfers});
 expect(store.view(owner.id,production).game.plan.facilityTransfers).toBeUndefined();
 expect(new RoomStore(dir).view(owner.id,transport).game.plan.facilityTransfers).toEqual(facilityTransfers);
 expect(()=>run(transport,'accept-agreement',{id:agreement})).toThrow('cannot');
 run(purchase,'accept-agreement',{id:agreement});
 expect(Object.keys(store.view(owner.id,owner.token).game.offtake!)).toHaveLength(3);
 for(const role of [purchase,production,transport])run(role,'ready',{ready:true});
 run(production,'draft');
 expect(Object.values(store.view(owner.id,owner.token).game.plan.ready)).toEqual([false,false,false]);
 }finally{rmSync(dir,{recursive:true,force:true});}
},30000);
