import {it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,draftPlan} from './engine';
import {rollingOptimize,applyRollingCandidate,forecastPlanningGame} from './rolling-optimizer';
function tiny(){const r=structuredClone(quebec);r.crews=r.crews.slice(0,1);r.trucks=r.trucks.slice(0,1);return createGame(r);}
it('compares bounded forecast candidates and applies only a current plan',async()=>{
 const g=tiny(),snapshot=structuredClone(g),result=await rollingOptimize(g,2);expect(result.candidates.length).toBeLessThanOrEqual(13);expect(result.best).not.toBeNull();expect(g).toEqual(snapshot);const next=applyRollingCandidate(g,result,result.best!);expect(next.week).toBe(g.week);expect(next.cash).toBe(g.cash);expect(next.stands).toEqual(g.stands);expect(next.history).toEqual(g.history);expect(next.region).toEqual(g.region);const stale=structuredClone(g);stale.plan.retention+=.01;expect(()=>applyRollingCandidate(stale,result,result.best!)).toThrow('stale');
},30000);
it('ignores hidden weather, events and the campaign seed',async()=>{
 const g=tiny(),other=structuredClone(g);other.seed=987654;for(const s of Object.values(other.region.weather))for(const z of other.region.zones)s.actual[z.id]=s.actual[z.id].map(()=> 'thaw');other.region.disruptions??=[];other.region.disruptions.push({id:'secret',kind:'truck',target:other.region.trucks[0].id,week:2,endWeek:4,revealWeek:2,title:'Hidden',description:'Unrevealed',repairCost:10,repairWeeks:1});const a=await rollingOptimize(g,2),b=await rollingOptimize(other,2);expect(a).toEqual(b);
},30000);
it('preserves explicit processing intake and module plans for every successful candidate',async()=>{
 const g=tiny(),m=g.region.mills[0],p=Object.keys(m.prices)[0],s=g.region.stands.find(s=>s.supply==='guaranteed')!;m.processing={inputs:[p],capacityM3:50,costM3:1,outputs:[{id:'x',name:'x',yield:1,price:1,weeklyDemand:0}]};g.plan.processing={[m.id]:{volume:40,sell:false}};g.plan.facilityTransfers=[];g.plan.trucks[g.region.trucks[0].id]=[{stand:s.id,mill:m.id,product:p,loads:1,process:true}];const result=await rollingOptimize(g,2);for(const c of result.candidates.filter(c=>!c.problem)){expect(c.plan.processing).toEqual(g.plan.processing);expect(c.plan.facilityTransfers).toEqual([]);expect(c.plan.trucks[g.region.trucks[0].id][0]).toEqual(g.plan.trucks[g.region.trucks[0].id][0]);}
},30000);
it('jointly compares purchases and applies actual acquisition without simulated future state',async()=>{
 const g=tiny(),lot=g.region.stands.find(s=>s.supply==='private')!;const result=await rollingOptimize(g,2,undefined,[lot.id]);expect(result.candidates.length).toBeLessThanOrEqual(26);const buy=result.candidates.find(c=>c.purchases.includes(lot.id)&&!c.problem)!;expect(buy).toBeTruthy();const next=applyRollingCandidate(g,result,buy.id);expect(next.week).toBe(g.week);expect(next.history).toEqual(g.history);expect(next.cash).toBeCloseTo(g.cash-lot.askingPrice);expect(next.stands.find(s=>s.id===lot.id)?.owned).toBe(true);expect(g.stands.find(s=>s.id===lot.id)?.owned).toBe(false);expect(next.stands.find(s=>s.id===lot.id)?.remaining).toBe(lot.volume);
},30000);
it('respects funds reserved by bids when evaluating acquisitions',async()=>{
 const g=tiny(),lot=g.region.stands.find(s=>s.supply==='private')!,auction=g.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek===1)!;g.cash=lot.askingPrice;g.plan.bids[auction.id]=1;const result=await rollingOptimize(g,2,undefined,[lot.id]);expect(result.candidates.filter(c=>c.purchases.length).every(c=>!!c.problem)).toBe(true);
},30000);
it('can compare the entire remaining horizon and includes the final turn',async()=>{
 const g=tiny();g.week=g.region.weeks-4;
 const result=await rollingOptimize(g,5);
 expect(result.horizon).toBe(5);
 expect(result.candidates.some(c=>!c.problem)).toBe(true);
 expect(g.history).toHaveLength(0);
 await expect(rollingOptimize(g,6)).rejects.toThrow('remaining');
},30000);
it('honours explicitly scheduled rest weeks after adaptive drafting',async()=>{
 const g=tiny(),crew=g.region.crews[0];g.scheduledCrews={2:{[crew.id]:[]}};
 const result=await rollingOptimize(g,2),candidate=result.candidates.find(c=>c.id==='none:final-margin-false')!;
 let expected=forecastPlanningGame(g);expected=advance(draftPlan(expected,{treatment:'final',salesPolicy:'margin',commitmentAware:false}));expected=draftPlan(expected,{treatment:'final',salesPolicy:'margin',commitmentAware:false});expected.plan.crews[crew.id]=[];expected=advance(expected);
 expect(candidate.problem).toBeUndefined();expect(candidate.cashChange).toBeCloseTo(expected.cash-g.cash,6);
},60000);

it('reports accepted own-mill requirements left by a forecast policy',async()=>{
 const {authorReciprocal,acceptReciprocal}=await import('./reciprocal');
 let g=authorReciprocal(tiny(),{name:'Service',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:100,ownReserveM3:0,opens:1,deadline:1,minimumOwnA:100,minimumOwnB:50});
 const id=g.region.reciprocalPairs!.at(-1)!.id;g=acceptReciprocal(acceptReciprocal(g,id,'A','equal'),id,'B','equal');
 const result=await rollingOptimize(g,1);expect(result.candidates.find(c=>c.id==='none:current')?.ownServiceRemaining).toBe(150);
 expect(result.candidates.find(c=>c.id==='none:current')?.ownServiceOverdue).toBe(150);
 g.region.reciprocalPairs!.at(-1)!.deadline=2;g.reciprocal![id].terms.deadline=2;
 const later=await rollingOptimize(g,1);expect(later.candidates.find(c=>c.id==='none:current')).toMatchObject({ownServiceRemaining:150,ownServiceOverdue:0});
 expect(g.week).toBe(1);expect(g.history).toHaveLength(0);
},30000);

it('retains explicit accepted partner deliveries in adaptive candidates',async()=>{
 const {teachingOfftakeOffers,acceptOfftake}=await import('./offtake');
 let g=tiny();g.region.offtakeOffers=teachingOfftakeOffers(g.region);const offer=g.region.offtakeOffers[0];g=acceptOfftake(g,offer.id);
 const truck=g.region.trucks[0].id,stand=g.stands.find(s=>s.owned)!.id;
 const order={stand,mill:offer.mill,product:offer.product,loads:1,offtake:offer.id};g.plan.trucks[truck]=[order];
 const result=await rollingOptimize(g,1);const valid=result.candidates.filter(c=>!c.problem);expect(valid.length).toBeGreaterThan(1);
 for(const candidate of valid)expect(candidate.plan.trucks[truck][0]).toEqual(order);
},30000);

it('applies adaptive partner advice and settles real contract stock and revenue once',async()=>{
 const {teachingOfftakeOffers,acceptOfftake}=await import('./offtake');
 let g=tiny();g.region.crews=[];g.plan.crews={};g.region.offtakeOffers=teachingOfftakeOffers(g.region);
 const offer=g.region.offtakeOffers[0];offer.volume=20;offer.deadline=1;offer.acceptBy=1;
 const stand=g.stands.find(s=>s.owned)!,definition=g.region.stands.find(s=>s.id===stand.id)!;
 stand.remaining-=50;stand.harvested+=50;stand.stock=[{product:offer.product,volume:50,week:1,quality:1}];
 g.region.mills.find(m=>m.id===offer.mill)!.node=definition.node;
 const truck=g.region.trucks[0].id;g.truckPositions[truck]=definition.node;
 g=acceptOfftake(g,offer.id);g.plan.trucks[truck]=[{stand:stand.id,mill:offer.mill,product:offer.product,loads:1,offtake:offer.id}];
 const result=await rollingOptimize(g,1),candidate=result.candidates.find(c=>c.id!=='none:current'&&!c.problem)!;
 expect(candidate).toBeTruthy();const applied=applyRollingCandidate(g,result,candidate.id);
 expect(applied.cash).toBe(g.cash);expect(applied.history).toEqual(g.history);
 const settled=advance(applied),report=settled.history[0];
 expect(settled.offtake![offer.id].delivered).toBe(20);
 expect(report.ledger.filter(e=>e.category==='offtake-sales').reduce((n,e)=>n+e.amount,0)).toBeCloseTo(20*offer.priceM3);
 expect(report.shipments!.filter(s=>s.market==='offtake').reduce((n,s)=>n+s.volume,0)).toBe(20);
 expect(settled.cash).toBeCloseTo(g.cash+report.ledger.reduce((n,e)=>n+e.amount,0));
 expect(g.offtake![offer.id].delivered).toBe(0);
},30000);
