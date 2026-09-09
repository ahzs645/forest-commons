import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomStore } from "./rooms";
import { quebec } from "../src/scenarios/quebec";
import { parseGame, validateRegion } from "../src/simulation/validation";
import { serializeGame } from "../src/simulation/save-format";
it("withholds future realized lots in valid student observations, persists secrets and releases at due week", () => {
 const dir=mkdtempSync(join(tmpdir(),"forest-auction-"));
 try {
  const region=structuredClone(quebec),lot=region.stands.find(s=>s.supply==='auction')!;lot.auctionWeek=2;
  region.auctionDisclosure={mode:'release-week',volumeMultiplier:[.8,1.2],priceMultiplier:[.8,1.2]};
  const store=new RoomStore(dir),owner=store.create(region);
  const act=(a:string,p:unknown,t=owner.token)=>store.mutate(owner.id,t,store.view(owner.id,t).revision,a,p);
  const tokens=Object.fromEntries(['purchase','production','transport','company1'].map(role=>[role,act('invite',{role}).credential!]));
  const original=store.view(owner.id,owner.token).game.region.stands.find(s=>s.id===lot.id)!;
  expect(original.volume).toBeGreaterThanOrEqual(lot.volume*.8);expect(original.volume).toBeLessThanOrEqual(lot.volume*1.2);
  for(const token of Object.values(tokens)) {
   const view=store.view(owner.id,token);
   expect(view.withheldAuctions).toContainEqual({id:lot.id,releaseWeek:2});
   expect(view.game.region.stands.some(s=>s.id===lot.id)).toBe(false);
   expect(view.game.stands.some(s=>s.id===lot.id)).toBe(false);
   expect(JSON.stringify(view.game)).not.toContain(`"volume":${original.volume}`);
   expect(()=>parseGame(serializeGame(view.game))).not.toThrow();
  }
  expect(()=>act('plan',{bids:{[lot.id]:original.askingPrice}},tokens.purchase)).toThrow('not been released');
  expect(new RoomStore(dir).view(owner.id,owner.token).game.region.stands.find(s=>s.id===lot.id)!.volume).toBe(original.volume);
  for(const role of ['purchase','production','transport'])act('ready',{ready:true},tokens[role]);
  act('advance',{});
  const view=store.view(owner.id,tokens.purchase);
  expect(view.game.region.stands.find(s=>s.id===lot.id)!.volume).toBe(original.volume);
  expect(view.withheldAuctions.some(s=>s.id===lot.id)).toBe(false);
  expect(()=>parseGame(serializeGame(view.game))).not.toThrow();
 } finally {rmSync(dir,{recursive:true,force:true});}
});
it('rejects malformed policies and scenarios without guaranteed or private supply',()=>{
 const r=structuredClone(quebec);r.auctionDisclosure={mode:'release-week',volumeMultiplier:[1,1],priceMultiplier:[.8,1.2]};expect(()=>validateRegion(r)).toThrow('disclosure');
 r.auctionDisclosure.volumeMultiplier=[.8,1.2];r.stands.forEach(s=>s.supply='auction');expect(()=>validateRegion(r)).toThrow('disclosure');
});
