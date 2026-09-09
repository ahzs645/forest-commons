import {it,expect} from 'vitest';
import {princeGeorge} from '../scenarios/prince-george';
import {withIllustrativeFacilityTransfer} from './facility-transfers';
import {validateRegion,parseGame} from './validation';
import {createGame,advance} from './engine';
import {serializeGame} from './save-format';
function setup(){const r=structuredClone(princeGeorge);r.mills=r.mills.map(m=>({...m,processing:{inputs:Object.keys(m.prices),capacityM3:1000,costM3:18,outputs:[{id:'lumber',name:'Lumber equivalent',yield:.55,price:180,weeklyDemand:400},{id:'chips',name:'Chip by-product equivalent',yield:.35,price:60,weeklyDemand:250}]}}));return r;}
it('enables BC by-product setup without new harvested timber charges or input mutation',()=>{
 const input=setup(),before=JSON.stringify(input),r=withIllustrativeFacilityTransfer(input);expect(()=>validateRegion(r)).not.toThrow();expect(JSON.stringify(input)).toBe(before);
 for(const [id,d] of Object.entries(r.bcTenure!.stands)){expect(d.stumpage.rates['transferred-chips']).toBe(0);for(const [p,rate] of Object.entries(input.bcTenure!.stands[id].stumpage.rates))expect(d.stumpage.rates[p]).toBe(rate);}
 expect(()=>parseGame(serializeGame(createGame(r)))).not.toThrow();
});
it('carries actual BC processing by-products through transfer, secondary processing and save',()=>{
 const r=withIllustrativeFacilityTransfer(setup()),link=r.facilityTransfers![0];let g=createGame(r);
 const stand=g.stands.find(s=>s.owned&&g.region.stands.find(d=>d.id===s.id)!.mix['soft-saw']>0)!;
 for(const state of Object.values(g.bcTenure!.roads)){state.status='approved';state.approvedWeek=1;delete state.submittedWeek;}
 g.bcTenure!.harvest[stand.id]={status:'approved',approvedWeek:1};
 g.plan.crews[r.crews[0].id]=[{stand:stand.id,hours:40}];g=advance(g);
 expect(g.stands.find(s=>s.id===stand.id)!.stock.length).toBeGreaterThan(0);
 g.plan.crews=Object.fromEntries(r.crews.map(c=>[c.id,[]]));
 const truck=r.trucks[0];g.plan.trucks[truck.id]=[{stand:stand.id,mill:link.source,product:'soft-saw',loads:2,process:true}];g.plan.processing={[link.source]:{volume:1000,sell:false}};
 g=advance(g);expect(g.processing![link.source].output[link.output]).toBeGreaterThan(0);
 g.plan.trucks=Object.fromEntries(r.trucks.map(t=>[t.id,[]]));g.plan.facilityTransfers=[{link:link.id,truck:truck.id,loads:1}];g.plan.processing={[link.target]:{volume:1000,sell:true}};
 g=advance(g);expect(g.history[2].facilityTransfers?.[0].volume).toBeGreaterThan(0);expect(g.processing![link.target].processed).toBeGreaterThan(0);expect(g.processing![link.target].sold['fibre-product']).toBeGreaterThan(0);expect(()=>parseGame(serializeGame(g))).not.toThrow();
});
it('preserves an existing authored fibre product and its tenure rates',()=>{
 const r=setup();r.products.push({id:'transferred-chips',name:'Authored fibre',color:'#123456',maxFreshWeeks:5});for(const d of Object.values(r.bcTenure!.stands))d.stumpage.rates['transferred-chips']=7;
 const result=withIllustrativeFacilityTransfer(r);expect(result.products.find(p=>p.id==='transferred-chips')!.name).toBe('Authored fibre');expect(Object.values(result.bcTenure!.stands).every(d=>d.stumpage.rates['transferred-chips']===7)).toBe(true);
});
