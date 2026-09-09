import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance} from './engine';
import {parseGame,validateRegion} from './validation';
import {serializeGame} from './save-format';
import {illustrativeCalendar,beginLinkedSeason} from './season-calendar';
import {withIllustrativeFacilityTransfer} from './facility-transfers';
function stocked(){
 const r=structuredClone(quebec),a=r.mills[0],b=r.mills[1],d=r.stands.find(s=>s.supply==='guaranteed')!,p=Object.keys(a.prices)[0],q=Object.keys(b.prices)[0];
 d.terrain=1;d.mix={[p]:1};a.node=d.node;b.node=d.node;
 a.processing={inputs:[p],capacityM3:100,costM3:1,outputs:[{id:'chips',name:'Chips',yield:1,price:10,weeklyDemand:0}]};b.processing={inputs:[q],capacityM3:100,costM3:1,outputs:[{id:'board',name:'Board',yield:.8,price:20,weeklyDemand:100}]};
 r.facilityTransfers=[{id:'chips-to-board',source:a.id,output:'chips',target:b.id,input:q,inputEquivalentRatio:1}];
 r.economy.startingCash=100000000;r.seasonCalendar=illustrativeCalendar(r);
 let g=createGame(r);const c=r.crews[0],t=r.trucks[0];g.crewPositions[c.id]=d.node;g.truckPositions[t.id]=d.node;g.plan.crews[c.id]=[{stand:d.id,hours:20}];g.plan.trucks[t.id]=[{stand:d.id,mill:a.id,product:p,loads:10,process:true}];g.plan.processing={[a.id]:{volume:100,sell:false}};g=advance(g);g.plan.crews=Object.fromEntries(r.crews.map(c=>[c.id,[]]));g.plan.trucks=Object.fromEntries(r.trucks.map(t=>[t.id,[]]));g.plan.processing={[b.id]:{volume:100,sell:false}};g.plan.facilityTransfers=[{link:'chips-to-board',truck:t.id,loads:1}];return {g,a,b,t,q};
}
it('transfers real outputs without external delivery or sales and reconciles after reload',()=>{
 const {g,a,b,t,q}=stocked(),before=g.processing![a.id].output.chips,n=Math.min(before,t.payload),next=advance(g),h=next.history.at(-1)!;
 expect(next.processing![a.id].output.chips).toBeCloseTo(before-n);expect(next.processing![a.id].transferred!.chips).toBeCloseTo(n);expect(next.processing![b.id].processed).toBeCloseTo(n);expect(h.processing![b.id].received).toBeCloseTo(n);expect(h.millDeliveries[b.id]?.[q]??0).toBe(0);expect(h.ledger.filter(e=>e.category.endsWith('sales'))).toHaveLength(0);expect(h.truckHours[t.id]).toBe(t.loadingHours+t.unloadingHours);expect(parseGame(serializeGame(next)).processing).toEqual(next.processing);
});
it('does not transfer when normal dispatch exhausted time or destination is shut down',()=>{
 const {g,b,t}=stocked();g.region.trucks.find(v=>v.id===t.id)!.hours=0;expect(advance(g).history.at(-1)!.facilityTransfers??[]).toHaveLength(0);
 g.region.trucks.find(v=>v.id===t.id)!.hours=t.hours;g.region.disruptions=[{id:'off',kind:'mill',target:b.id,week:g.week,endWeek:g.week,revealWeek:g.week,title:'Shutdown',description:'Test',repairCost:0,repairWeeks:1}];expect(advance(g).history.at(-1)!.facilityTransfers??[]).toHaveLength(0);
});
it('rejects undeclared or mass creating mappings and deleted historical inventories',()=>{
 const {g,a}=stocked();const broken=structuredClone(g.region);broken.facilityTransfers![0].inputEquivalentRatio=2 as 1;expect(()=>validateRegion(broken)).toThrow();delete g.processing![a.id];expect(()=>parseGame(serializeGame(g))).toThrow();
});
it('charges road distance and shares hours; closed routes cannot move output',()=>{
 const {g,b,t}=stocked();g.region.disruptions=[];g.region.roads.edges.forEach(e=>e.bearing=1);g.region.mills.find(m=>m.id===b.id)!.node=quebec.mills[1].node;g.region.trucks.find(v=>v.id===t.id)!.hours=1000;
 const next=advance(g),h=next.history.at(-1)!;expect(h.facilityTransfers).toHaveLength(1);expect(h.ledger.find(e=>e.category==='facility-haul')!.amount).toBeLessThan(0);expect(h.truckHours[t.id]).toBeGreaterThan(t.loadingHours+t.unloadingHours);expect(h.movements.find(m=>m.resource===t.id)!.km).toBeGreaterThan(0);
 g.region.roads.edges=[];expect(advance(g).history.at(-1)!.facilityTransfers??[]).toHaveLength(0);
});

it('carries transfer balances into a linked season and validates the illustrative fibre mapping',()=>{
 const fixture=stocked();let g=advance(fixture.g);g.plan.facilityTransfers=[];g.plan.processing={};while(g.week<=g.region.weeks)g=advance(g);
 const next=beginLinkedSeason(g,13);expect(next.processingOpening![fixture.a.id].transferred!.chips).toBeGreaterThan(0);expect(parseGame(serializeGame(next)).processing).toEqual(next.processing);
 const region=withIllustrativeFacilityTransfer(fixture.g.region);expect(()=>validateRegion(region)).not.toThrow();expect(region.mills.find(m=>m.id===fixture.b.id)!.processing!.outputs.map(o=>o.id)).toEqual(['fibre-product']);
});
