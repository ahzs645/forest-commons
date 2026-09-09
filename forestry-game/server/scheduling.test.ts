import { it,expect } from 'vitest';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStore } from './rooms';
it('restricts saved crew appointments to production and persists them privately',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-schedule-'));
 try{
  const store=new RoomStore(dir),owner=store.create();
  const invite=(role:string)=>store.mutate(owner.id,owner.token,store.view(owner.id,owner.token).revision,'invite',{role}).credential!;
  const production=invite('production'),transport=invite('transport');
  const schedule={'2':{C1:[{stand:'Q01',hours:40}]}};
  expect(()=>store.mutate(owner.id,transport,store.view(owner.id,transport).revision,'plan',{scheduledCrews:schedule})).toThrow('another role');
  store.mutate(owner.id,production,store.view(owner.id,production).revision,'plan',{scheduledCrews:schedule});
  expect(store.view(owner.id,transport).game.scheduledCrews).toBeUndefined();
  expect(store.view(owner.id,owner.token).game.scheduledCrews).toEqual(schedule);
  expect(new RoomStore(dir).view(owner.id,production).game.scheduledCrews).toEqual(schedule);
  const before=store.view(owner.id,production).revision;
  expect(()=>store.mutate(owner.id,production,before,'plan',{scheduledCrews:{'1':schedule['2']}})).toThrow();
  expect(store.view(owner.id,production).revision).toBe(before);
  expect(store.view(owner.id,production).game.scheduledCrews).toEqual(schedule);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
