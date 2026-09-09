import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance} from './engine';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
function stocked(){
 const r=structuredClone(quebec),a=r.mills[0],b=r.mills[1],d=r.stands.find(s=>s.supply==='guaranteed')!,p=Object.keys(a.prices)[0],q=Object.keys(b.prices)[0];
 d.terrain=1;d.mix={[p]:1};a.node=d.node;b.node=d.node;
 a.processing={inputs:[p],capacityM3:100,costM3:1,outputs:[{id:'chips',name:'Chips',yield:1,price:10,weeklyDemand:0}]};b.processing={inputs:[q],capacityM3:100,costM3:1,outputs:[{id:'board',name:'Board',yield:.8,price:20,weeklyDemand:100}]};
 r.facilityTransfers=[{id:'chips-to-board',source:a.id,output:'chips',target:b.id,input:q,inputEquivalentRatio:1}];
 let g=createGame(r);const c=r.crews[0],t=r.trucks[0];g.crewPositions[c.id]=d.node;g.truckPositions[t.id]=d.node;g.plan.crews[c.id]=[{stand:d.id,hours:20}];g.plan.trucks[t.id]=[{stand:d.id,mill:a.id,product:p,loads:10,process:true}];g.plan.processing={[a.id]:{volume:100,sell:false}};g=advance(g);g.plan.crews=Object.fromEntries(r.crews.map(c=>[c.id,[]]));g.plan.trucks=Object.fromEntries(r.trucks.map(t=>[t.id,[]]));g.plan.processing={[b.id]:{volume:100,sell:false}};g.plan.facilityTransfers=[{link:'chips-to-board',truck:t.id,loads:1}];return {g,a,b,t,q};
}
it('audit rejects a transferred load whose receiving inventory and receipt report were removed',()=>{
 const {g,b}=stocked(),next=advance(g);
 expect(()=>parseGame(serializeGame(next))).not.toThrow();
 expect(next.history.at(-1)!.facilityTransfers!.length).toBeGreaterThan(0);
 delete next.processing![b.id];delete next.history.at(-1)!.processing![b.id];
 expect(()=>parseGame(serializeGame(next))).toThrow();
});
