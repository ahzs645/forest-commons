import { expect, it } from 'vitest';
import { princeGeorge } from '../scenarios/prince-george';
import { createGame } from './engine';
import { appraise } from './appraisal';
import { supplyBalance } from './planning';
import { startStewardship, stewardshipYear, validateStewardship } from './stewardship';

it('BC appraisals itemize Crown stumpage and operator provisions while private timber has no Crown charge', () => {
 const game=createGame(princeGeorge);
 const crown=game.region.stands.find(s=>s.supply==='guaranteed')!;
 const estimate=appraise(game,crown.id,0);
 const expected=Object.entries(crown.mix).reduce((n,[id,share])=>n+share*(game.region.bcTenure!.stands[crown.id].stumpage.rates[id]??0),0);
 expect(estimate.stumpage).toBeCloseTo(estimate.eligible*expected);
 expect(estimate.obligations).toBeGreaterThan(0);
 const privateStand=game.region.stands.find(s=>s.supply==='private')!;
 expect(appraise(game,privateStand.id).stumpage).toBe(0);
 const free=structuredClone(game);delete free.region.bcTenure;delete free.bcTenure;
 expect(appraise(free,crown.id,0).max-estimate.max).toBeCloseTo(estimate.stumpage+estimate.obligations);
});

it('BC annual harvesting separately charges stumpage and provision costs and preserves its cash balance', () => {
 const game=createGame(princeGeorge),opening=startStewardship(game);
 const stand=opening.stands.find(s=>s.managed&&!s.harvestAuthorizationProblem)!;
 const annual=stewardshipYear(game.region,opening,{[stand.id]:'thin'}),report=annual.history[0];
 expect(report.stumpageCost).toBeGreaterThan(0);
 expect(report.postHarvestCost).toBeGreaterThan(0);
 expect(report.cashChange).toBeCloseTo(report.harvest*game.region.stewardship!.thinningNetM3-report.stumpageCost!-report.postHarvestCost!);
 validateStewardship(game.region,annual);
});

it('annual treatments and available standing supply respect missing BC cutting authority', () => {
 const game=createGame(princeGeorge),state=startStewardship(game);
 const blocked=state.stands.find(s=>s.managed&&s.harvestAuthorizationProblem)!;
 expect(blocked).toBeDefined();
 expect(()=>stewardshipYear(game.region,state,{[blocked.id]:'thin'})).toThrow();
 const open=structuredClone(game);delete open.region.bcTenure;delete open.bcTenure;
 expect(supplyBalance(game).reduce((n,p)=>n+p.standing,0)).toBeLessThan(supplyBalance(open).reduce((n,p)=>n+p.standing,0));
});

it('linked BC windows preserve funded obligations and require renewal of finite permits without charging twice', async () => {
 const { advance }=await import('./engine');
 const { beginLinkedSeason,illustrativeCalendar,settleLinkedSeason,validateLinkedSeason }=await import('./season-calendar');
 const region=structuredClone(princeGeorge);region.economy.startingCash=100000000;region.stewardship!.startingBudget=100000000;region.seasonCalendar=illustrativeCalendar(region);
 let game=beginLinkedSeason(createGame(region),20);
 const stand=region.stands.find(s=>s.supply==='guaranteed'&&s.terrain===1)!;
 const crew=region.crews[0];game.crewPositions[crew.id]=stand.node;
 game.plan.crews[crew.id]=[{stand:stand.id,hours:1}];
 game=advance(game);game.plan.crews=Object.fromEntries(region.crews.map(c=>[c.id,[]]));
 while(game.week<=game.region.weeks)game=advance(game);
 const obligationState=structuredClone(game.bcTenure!.obligations),cash=game.cash;
 expect(Object.values(obligationState).some(o=>o.accrued>0&&o.settled===o.accrued)).toBe(true);
 game=settleLinkedSeason(game);validateLinkedSeason(game);
 expect(game.cash).toBe(cash);expect(game.stewardship!.cash).toBe(cash);
 expect(game.stewardship!.history[0].stumpageCost).toBeGreaterThan(0);
 game=beginLinkedSeason(game,20);
 expect(game.bcTenure!.obligations).toEqual(obligationState);
 const finite=Object.entries(region.bcTenure!.stands).find(([,s])=>s.harvest.validForWeeks)!;
 expect(game.bcTenure!.harvest[finite[0]].status).toBe('required');
 game=advance(game);
 expect(game.history[0].ledger.filter(e=>e.category==='post-harvest')).toHaveLength(0);
});

it('BC procurement experiments can acquire auction supply and process permit applications without invalid plans', async () => {
 const { simulateStudyStrategy,bidStrategies }=await import('./procurement-study');
 const region=structuredClone(princeGeorge);region.economy.startingCash=100000000;
 const result=simulateStudyStrategy(createGame(region),{samples:2,seed:41,deliveryGoal:0,forecastReliability:1,demandSpread:0,riskWeight:0},0,bidStrategies.find(s=>s.id==='premium')!);
 expect(result.problem).toBeUndefined();expect(result.acquisitions).toBeGreaterThan(0);
},60000);

it('appraisal follows published market resets while annual rates remain frozen at their opening snapshot', async () => {
 const { operatingRegion }=await import('./disruptions');
 const game=createGame(princeGeorge),id=game.region.stands.find(s=>s.supply==='guaranteed')!.id;
 const opening=appraise(game,id,0).stumpage;
 game.week=7;
 expect(appraise(game,id,0).stumpage).toBeLessThan(opening);
 const state=startStewardship(game),rates=structuredClone(state.stands.find(s=>s.id===id)!.stumpageRates!);
 expect(rates).toEqual(operatingRegion(game).bcTenure!.stands[id].stumpage.rates);
 // Changing the operating rate schedule does not rewrite a thirty-year exercise's opening assumptions.
 game.region.bcTenure!.stands[id].stumpage.rates=Object.fromEntries(game.region.products.map(p=>[p.id,999]));
 const year=stewardshipYear(game.region,state,{[id]:'thin'}),harvest=year.history[0].harvest;
 const mix=game.region.stands.find(s=>s.id===id)!.mix;
 expect(year.history[0].stumpageCost).toBeCloseTo(harvest*Object.entries(mix).reduce((n,[p,share])=>n+share*rates[p],0));
});

it('rolling and procurement futures exclude market shocks that have not been revealed', async () => {
 const { forecastPlanningGame }=await import('./rolling-optimizer');
 const { studyFuture }=await import('./procurement-study');
 const game=createGame(princeGeorge);
 expect(forecastPlanningGame(game).region.bcMarket!.events).toEqual([]);
 const settings={samples:2,seed:7,deliveryGoal:0,forecastReliability:1,demandSpread:0,riskWeight:0};
 expect(studyFuture(game,settings,0).region.bcMarket!.events).toEqual([]);
 game.week=5;
 expect(forecastPlanningGame(game).region.bcMarket!.events.map(e=>e.id)).toEqual(['fuel-rise','timber-slowdown']);
});
