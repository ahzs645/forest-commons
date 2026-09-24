import { expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStore } from './rooms';
import { princeGeorge } from '../src/scenarios/prince-george';

it('enforces tenure role ownership, persists applications, and clears readiness', () => {
  const dir = mkdtempSync(join(tmpdir(), 'forest-tenure-'));
  try {
    const region = structuredClone(princeGeorge);
    region.bcTenure!.roads['access-BC07'].initialStatus = 'required';
    const store = new RoomStore(dir), owner = store.create(region);
    const act = (action: string, payload: unknown = {}, token = owner.token) => store.mutate(owner.id, token, store.view(owner.id, token).revision, action, payload);
    const purchase = act('invite', {role:'purchase'}).credential!;
    const transport = act('invite', {role:'transport'}).credential!;
    const production = act('invite', {role:'production'}).credential!;
    expect(() => act('tenure-harvest', {id:'BC07'}, transport)).toThrow('cannot perform');
    expect(() => act('tenure-road', {id:'access-BC07'}, purchase)).toThrow('cannot perform');
    expect(() => act('tenure-settle', {id:'BC01'}, purchase)).toThrow('cannot perform');
    act('ready', {ready:true}, production);
    act('tenure-harvest', {id:'BC07'}, purchase);
    act('tenure-road', {id:'access-BC07'}, transport);
    const loaded = new RoomStore(dir).view(owner.id, production).game;
    expect(loaded.bcTenure!.harvest.BC07.status).toBe('pending');
    expect(loaded.bcTenure!.roads['access-BC07'].status).toBe('pending');
    expect(loaded.plan.ready).toEqual({purchase:false,production:false,transport:false});
    expect(() => act('tenure-harvest', {id:'BC07'}, purchase)).toThrow('pending');
    for (const token of [purchase,transport,production]) act('ready', {ready:true}, token);
    act('advance');
    const after = store.view(owner.id, purchase).game;
    expect(after.bcTenure!.harvest.BC07.status).toBe('approved');
    expect(after.bcTenure!.roads['access-BC07'].status).toBe('approved');
  } finally { rmSync(dir, {recursive:true,force:true}); }
});

it('keeps unreleased auction tenure economics out of participant observations', () => {
  const dir = mkdtempSync(join(tmpdir(), 'forest-tenure-private-'));
  try {
    const region=structuredClone(princeGeorge);
    region.auctionDisclosure={mode:'release-week',volumeMultiplier:[0.99,1.01],priceMultiplier:[0.99,1.01]};
    const store=new RoomStore(dir),owner=store.create(region);
    const participant=store.mutate(owner.id,owner.token,store.view(owner.id,owner.token).revision,'invite',{role:'purchase'}).credential!;
    const view=store.view(owner.id,participant),hidden=region.stands.filter(s=>s.supply==='auction'&&s.auctionWeek>1);
    expect(view.game.region.bcMarket!.events).toEqual([]);
    expect(store.view(owner.id,owner.token).game.region.bcMarket!.events.length).toBeGreaterThan(0);
    expect(hidden.length).toBeGreaterThan(0);
    for(const stand of hidden){
      expect(view.game.region.bcTenure!.stands[stand.id]).toBeUndefined();
      expect(view.game.bcTenure!.harvest[stand.id]).toBeUndefined();
      expect(view.game.region.bcTenure!.roads[`access-${stand.id}`]).toBeUndefined();
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});
