import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,sum} from './engine';
import {validateRegion,parseGame} from './validation';
import {serializeGame} from './save-format';
it('converts actual delivered stock, limits output sales and preserves mill mass through reload',()=>{
 const r=structuredClone(quebec),m=r.mills[0],d=r.stands.find(s=>s.supply==='guaranteed')!,p=Object.keys(m.prices)[0];
 d.terrain=1;d.mix={[p]:1};m.node=d.node;
 m.processing={inputs:[p],capacityM3:50,costM3:10,outputs:[{id:'lumber',name:'Lumber',yield:.6,price:100,weeklyDemand:10},{id:'chips',name:'Chips',yield:.3,price:25,weeklyDemand:20}]};
 let g=createGame(r);g.crewPositions[r.crews[0].id]=d.node;g.truckPositions[r.trucks[0].id]=d.node;
 g.plan.crews[r.crews[0].id]=[{stand:d.id,hours:20}];g.plan.trucks[r.trucks[0].id]=[{stand:d.id,mill:m.id,product:p,loads:10,process:true}];
 g.plan.processing={[m.id]:{volume:50,sell:true}};g=advance(g);const s=g.processing![m.id],h=g.history[0];
 expect(s.processed).toBe(50);expect(s.sold.lumber).toBe(10);expect(s.output.lumber).toBe(20);expect(s.sold.chips).toBe(15);
 expect(s.received).toBeCloseTo(sum(s.input)+sum(s.output)+sum(s.sold)+s.residue);
 expect(h.ledger.filter(e=>e.category==='sales')).toHaveLength(0);expect(h.ledger.filter(e=>e.category==='finished-sales').reduce((n,e)=>n+e.amount,0)).toBe(1375);
 expect(g.deliveries[m.id]?.[p]??0).toBe(0);expect(parseGame(serializeGame(g)).processing).toEqual(g.processing);
});
it('rejects recipes that manufacture volume and invalid processing orders',()=>{
 const r=structuredClone(quebec);r.mills[0].processing={inputs:Object.keys(r.mills[0].prices),capacityM3:10,costM3:0,outputs:[{id:'x',name:'x',yield:1.1,price:1,weeklyDemand:1}]};
 expect(()=>validateRegion(r)).toThrow();r.mills[0].processing.outputs[0].yield=.8;
 const g=createGame(r);g.plan.processing={[r.mills[0].id]:{volume:11,sell:true}};expect(()=>advance(g)).toThrow();
});
