import {it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RoomStore} from './rooms';
import {quebec} from '../src/scenarios/quebec';
import {parseGame} from '../src/simulation/validation';
it('settles and refuses an auction once while preserving instructor evidence and role privacy',()=>{
 const dir=mkdtempSync(join(tmpdir(),'forest-auction-refusal-'));
 try {
  let store=new RoomStore(dir);const owner=store.create(quebec);
  const act=(token:string,action:string,p:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,p);
  const tokens=Object.fromEntries(['purchase','production','transport'].map(role=>[role,act(owner.token,'invite',{role}).credential!]));
  const bids={Q21:60000,Q26:1},bidComposition={Q21:{bid:60000,contributions:{'soft-saw':60000}}};
  act(tokens.purchase,'plan',{bids,bidComposition});
  expect(()=>act(tokens.production,'plan',{bids})).toThrow();
  for(const token of Object.values(tokens))act(token,'ready',{ready:true});
  act(owner.token,'advance');
  const before=store.view(owner.id,owner.token),h=before.game.history[0];
  expect(before.game.stands.find(s=>s.id==='Q21')?.owned).toBe(true);
  expect(before.game.stands.find(s=>s.id==='Q26')?.owned).toBe(false);
  expect(h.plan.bidComposition).toEqual(bidComposition);
  expect(()=>act(tokens.transport,'refuse',{id:'Q21'})).toThrow();
  expect(store.view(owner.id,owner.token).revision).toBe(before.revision);
  act(tokens.purchase,'refuse',{id:'Q21'});
  const after=store.view(owner.id,owner.token);
  expect(after.game.cash-before.game.cash).toBeCloseTo(60000*(1-quebec.economy.refusalPercent));
  expect(()=>act(tokens.purchase,'refuse',{id:'Q21'})).toThrow();
  expect(store.view(owner.id,owner.token).revision).toBe(after.revision);
  store=new RoomStore(dir);
  expect(store.view(owner.id,owner.token).game.history[0].plan.bidComposition).toEqual(bidComposition);
  for(const token of Object.values(tokens)){
   const game=store.view(owner.id,token).game;
   expect(game.cash).toBe(after.game.cash);
   expect(game.stands.find(s=>s.id==='Q21')).toMatchObject({owned:false,refused:true});
   expect(game.history[0].plan.bids).toEqual({});
   expect(game.history[0].plan.bidComposition).toBeUndefined();
   expect(()=>parseGame(JSON.stringify(game))).not.toThrow();
  }
 } finally {rmSync(dir,{recursive:true,force:true});}
});
