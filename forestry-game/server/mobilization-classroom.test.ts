import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomStore } from "./rooms";
import { quebec } from "../src/scenarios/quebec";
import { mobilizationQuote } from "../src/simulation/mobilization";
it("enforces staging ownership and timing, persists positions and accepts validated bucking plans", () => {
  const dir = mkdtempSync(join(tmpdir(), "forest-staging-"));
  try {
    const region=structuredClone(quebec);
    region.mobilization={allowedNodes:region.roads.nodes.map(n=>n.id),maxHoursPerResource:1000,feePerMove:0};
    const store=new RoomStore(dir),owner=store.create(region);
    const act=(action:string,payload:unknown,token=owner.token)=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,payload);
    const prod=act("invite",{role:"production"}).credential!,transport=act("invite",{role:"transport"}).credential!;
    const game=store.view(owner.id,owner.token).game,crew=region.crews[0];
    const to=region.mobilization.allowedNodes.find(to=>{try{mobilizationQuote(game,"crew",crew.id,to);return true;}catch{return false;}})!;
    expect(to).toBeTruthy();
    expect(()=>act("mobilize",{kind:"crew",id:crew.id,to},transport)).toThrow("cannot perform");
    act("timer",{command:"start",minutes:1});act("timer",{command:"pause"});
    expect(()=>act("mobilize",{kind:"crew",id:crew.id,to},prod)).toThrow("paused");
    act("timer",{command:"disable"});act("mobilize",{kind:"crew",id:crew.id,to},prod);
    expect(new RoomStore(dir).view(owner.id,prod).game.crewPositions[crew.id]).toBe(to);
    const plan=structuredClone(store.view(owner.id,prod).game.plan);
    const stand=game.stands.find(s=>s.owned)!;
    plan.crews[crew.id]=[{stand:stand.id,hours:1,bucking:"standard"}];
    act("plan",{crews:plan.crews},prod);
    expect(store.view(owner.id,prod).game.plan.crews[crew.id][0].bucking).toBe("standard");
    plan.crews[crew.id][0].bucking="invented";
    expect(()=>act("plan",{crews:plan.crews},prod)).toThrow();
  } finally {rmSync(dir,{recursive:true,force:true});}
});
