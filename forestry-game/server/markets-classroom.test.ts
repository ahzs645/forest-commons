import {it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {RoomStore} from './rooms';import {quebec} from '../src/scenarios/quebec';import {teachingOfftakeOffers} from '../src/simulation/offtake';
it('enforces new market and processing role ownership, privacy, readiness and restart persistence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-markets-'));try{
 const r=structuredClone(quebec);r.offtakeOffers=teachingOfftakeOffers(r);const m=r.mills[0];m.processing={inputs:Object.keys(m.prices),capacityM3:100,costM3:2,outputs:[{id:'chips',name:'Chips',yield:.8,price:20,weeklyDemand:100}]};m.spotPrices={...m.prices};
 const store=new RoomStore(dir),owner=store.create(r);
 const run=(token:string,action:string,p:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,p);
 const purchase=run(owner.token,'invite',{role:'purchase'}).credential!,production=run(owner.token,'invite',{role:'production'}).credential!,transport=run(owner.token,'invite',{role:'transport'}).credential!;
 expect(()=>run(transport,'accept-offtake',{id:r.offtakeOffers![0].id})).toThrow('cannot');
 for(const t of [purchase,production,transport])run(t,'ready',{ready:true});
 run(purchase,'accept-offtake',{id:r.offtakeOffers[0].id});
 expect(Object.values(store.view(owner.id,owner.token).game.plan.ready)).toEqual([false,false,false]);
 const processing={[m.id]:{volume:50,sell:true}};
 expect(()=>run(transport,'plan',{processing})).toThrow('another role');
 run(production,'plan',{processing});
 expect(store.view(owner.id,production).game.plan.processing).toEqual(processing);
 expect(store.view(owner.id,transport).game.plan.processing).toBeUndefined();
 expect(store.view(owner.id,purchase).game.plan.processing).toBeUndefined();
 const g=store.view(owner.id,transport).game,t=r.trucks[0],s=g.stands.find(s=>s.owned)!;
 run(transport,'plan',{trucks:{...g.plan.trucks,[t.id]:[{stand:s.id,mill:m.id,product:Object.keys(m.prices)[0],loads:1,offtake:r.offtakeOffers[0].id}]}});
 expect(()=>run(owner.token,'advance')).toThrow('ready');
 for(const token of [purchase,production,transport])run(token,'ready',{ready:true});
 run(owner.token,'advance');
 const restored=new RoomStore(dir).view(owner.id,owner.token);
 expect(restored.game.week).toBe(2);expect(restored.game.offtake?.[r.offtakeOffers[0].id]).toBeDefined();
 expect(restored.game.plan.processing).toEqual(processing);
 expect(store.view(owner.id,transport).game.history[0].plan.processing).toBeUndefined();
 }finally{rmSync(dir,{recursive:true,force:true});}
},30000);
