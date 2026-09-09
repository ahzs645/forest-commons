import {describe,it,expect} from 'vitest';
import {quebec} from '../scenarios/quebec';
import {createGame,advance,planProblems} from './engine';
import {studyFuture,runProcurementStudy,summarizeStudy,type StudySettings,type StudyOutcome} from './procurement-study';
const settings:StudySettings={samples:2,seed:17,deliveryGoal:1000,forecastReliability:.65,demandSpread:.2,riskWeight:.5};
function small(){const r=structuredClone(quebec);r.weeks=2;r.weeksPerMonth=2;r.crews=r.crews.slice(0,1);r.trucks=r.trucks.slice(0,1);r.stands=r.stands.slice(0,2);r.stands[1].supply='auction';r.stands[1].auctionWeek=1;r.mills=r.mills.slice(0,1).map(m=>({...m,demand:m.demand.slice(0,1)}));for(const w of Object.values(r.weather))for(const type of [w.actual,w.forecast])for(const z of r.zones)type[z.id]=type[z.id].slice(0,2);r.disruptions=[];r.partnerJobs=[];return createGame(r);}
describe('Paired stochastic procurement experiments',()=>{
 it('lets an insolvent no-bid campaign reach its final report while rejecting unfunded bids',()=>{let g=small();g.cash=-1;expect(planProblems(g)).not.toContain('Auction commitments exceed available cash and procurement credit.');g.plan.bids={Q02:1};expect(planProblems(g)).toContain('Auction commitments exceed available cash and procurement credit.');g.plan.bids={};g=advance(g);g=advance(g);expect(g.week).toBe(3);expect(g.cash).toBeLessThan(0);});
 it('samples solely from public forecasts and independent experiment seed',()=>{const a=createGame(quebec),b=structuredClone(a);b.seed=99;for(const w of Object.values(b.region.weather))for(const z of b.region.zones)w.actual[z.id]=w.actual[z.id].map(()=> 'thaw');expect(studyFuture(a,settings,0)).toEqual(studyFuture(b,settings,0));const perfect=studyFuture(a,{...settings,forecastReliability:1},0);for(const w of Object.values(perfect.region.weather))expect(w.actual).toEqual(w.forecast);expect(perfect.region.mills[0].demand[0]).toEqual(a.region.mills[0].demand[0]);expect(perfect.region.mills[0].demand[1]).not.toEqual(a.region.mills[0].demand[1]);});
 it('runs every strategy on paired futures without changing the real campaign',async()=>{const g=small(),before=JSON.stringify(g);const result=await runProcurementStudy(g,settings);expect(result.results).toHaveLength(8);expect(result.results.every(r=>!r.problem)).toBe(true);expect(result.summaries.find(s=>s.id==='no-bids')!.incremental).toBe(0);expect(JSON.stringify(g)).toBe(before);expect(result.results.filter(r=>r.strategy==='no-bids').every(r=>r.acquisitions===0)).toBe(true);},30000);
 it('reports failures separately and computes loss/shortfall on successful samples',()=>{const r:StudyOutcome={sample:0,strategy:'asking',cashChange:-100,delivered:0,waste:0,hits:0,checks:1,acquisitions:0};const rows=[r,{...r,sample:1,cashChange:100,delivered:2000},{...r,sample:2,problem:'invalid plan'}];const s=summarizeStudy(rows,settings).find(s=>s.id==='asking')!;expect(s.failed).toBe(1);expect(s.loss).toBe(.5);expect(s.shortfall).toBe(.5);expect(s.mean).toBe(0);expect(s.lossInterval[0]).toBeLessThan(.5);expect(s.lossInterval[1]).toBeGreaterThan(.5);});
 it('rejects invalid sample count before starting',async()=>{await expect(runProcurementStudy(small(),{...settings,samples:0})).rejects.toThrow('settings');});
});

it('does not invent paired gain when baseline trials failed or are missing',()=>{
 const row:StudyOutcome={sample:0,strategy:'asking',cashChange:100,delivered:10,waste:0,hits:0,checks:1,acquisitions:0};
 const missing=summarizeStudy([row,{...row,strategy:'no-bids',problem:'failed'}],settings).find(s=>s.id==='asking')!;
 expect(missing.incremental).toBeNull();expect(missing.pairedSamples).toBe(0);
 const paired=summarizeStudy([row,{...row,strategy:'no-bids',cashChange:40}],settings).find(s=>s.id==='asking')!;
 expect(paired.incremental).toBe(60);expect(paired.pairedSamples).toBe(1);
});
