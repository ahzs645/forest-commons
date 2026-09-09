import {validateProcessingRegion} from './processing';
import {expect,it} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance} from './engine';
import {parseGame} from './validation';
import {serializeGame} from './save-format';
import {illustrativeCalendar,beginLinkedSeason} from './season-calendar';
function campaign(){
 const r=structuredClone(quebec),m=r.mills[0],d=r.stands.find(s=>s.supply==='guaranteed')!,p=Object.keys(m.prices)[0];
 d.terrain=1;d.mix={[p]:1};m.node=d.node;
 m.processing={inputs:[p],capacityM3:50,costM3:10,outputs:[{id:'lumber',name:'Lumber',yield:.6,price:100,weeklyDemand:10}]};
 r.economy.startingCash=100000000;r.seasonCalendar=illustrativeCalendar(r);
 let g=createGame(r);g.crewPositions[r.crews[0].id]=d.node;g.truckPositions[r.trucks[0].id]=d.node;
 g.plan.crews[r.crews[0].id]=[{stand:d.id,hours:20}];g.plan.trucks[r.trucks[0].id]=[{stand:d.id,mill:m.id,product:p,loads:10,process:true}];
 g.plan.processing={[m.id]:{volume:50,sell:false}};g=advance(g);
 return {g,m,p};
}
it('audit rejects removal of a processing mill with recorded receipts and unsold inventory',()=>{
 const {g,m}=campaign();expect(g.processing![m.id].received).toBeGreaterThan(0);
 expect(()=>parseGame(serializeGame(g))).not.toThrow();
 delete g.processing![m.id];expect(()=>parseGame(serializeGame(g))).toThrow();
});
it('audit rejects removal of carried processing inventory at linked season opening',()=>{
 let {g,m}=campaign();g.plan.crews=Object.fromEntries(g.region.crews.map(c=>[c.id,[]]));g.plan.trucks=Object.fromEntries(g.region.trucks.map(t=>[t.id,[]]));g.plan.processing={};
 while(g.week<=g.region.weeks)g=advance(g);
 const next=beginLinkedSeason(g,13);expect(next.processingOpening![m.id].received).toBeGreaterThan(0);
 expect(()=>parseGame(serializeGame(next))).not.toThrow();delete next.processing![m.id];
 expect(()=>parseGame(serializeGame(next))).toThrow();
});
it('audit rejects unknown product keys in carried processing opening stock',()=>{
 let {g,m}=campaign();g.plan.crews=Object.fromEntries(g.region.crews.map(c=>[c.id,[]]));g.plan.trucks=Object.fromEntries(g.region.trucks.map(t=>[t.id,[]]));g.plan.processing={};
 while(g.week<=g.region.weeks)g=advance(g);
 const next=beginLinkedSeason(g,13),opening=next.processingOpening![m.id];
 const input=Object.keys(opening.input)[0];opening.input['nonexistent-product']=opening.input[input];delete opening.input[input];
 expect(()=>parseGame(serializeGame(next))).toThrow();
});

it.each(['__proto__','constructor','toString','valueOf'])('rejects processing output ID %s before it can corrupt stock dictionaries',(id)=>{
 const r=structuredClone(quebec);
 r.mills[0].processing={inputs:[r.products[0].id],capacityM3:10,costM3:1,outputs:[{id,name:'Teaching output',yield:.5,price:10,weeklyDemand:10}]};
 expect(()=>validateProcessingRegion(r)).toThrow('Invalid mill processing recipe');
});


it.each([false,true])('reports malformed recipe before checking dependent transfers (%s)',withTransfer=>{
 const r=structuredClone(quebec);
 r.mills[0].processing={inputs:[r.products[0].id],capacityM3:10,costM3:1,outputs:JSON.parse('[null]')};
 if(withTransfer)r.facilityTransfers=[{id:'test-link',source:r.mills[0].id,target:r.mills[1].id,output:'chips',input:r.products[0].id,inputEquivalentRatio:1}];
 expect(()=>validateProcessingRegion(r)).toThrow('Invalid mill processing recipe');
});
