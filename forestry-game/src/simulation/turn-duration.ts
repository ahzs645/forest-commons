import type {RegionDefinition,Game} from './types';
export const turnDuration=(region:RegionDefinition)=>region.turnDurationWeeks??1;
export function turnClock(game:Game){const duration=turnDuration(game.region);return {label:duration===1?'Week':'Turn',index:Math.min(game.week,game.region.weeks),elapsedWeeks:game.history.length*duration,totalWeeks:game.region.weeks*duration,duration};}
/** Create a separate subweekly teaching scenario. Never transform an in-progress save. */
export function subdividedScenario(source:RegionDefinition, divisions:2|4|7):RegionDefinition {
 if(![2,4,7].includes(divisions))throw Error("Choose two, four or seven turns per week.");
 if(turnDuration(source)!==1)throw Error('This scenario already uses subweekly turns.');
 if(source.weeks*divisions>104)throw Error('This decision interval exceeds the 104-turn scenario limit.');
 const r=structuredClone(source),opening=(week:number)=>divisions*(week-1)+1,closing=(week:number)=>divisions*week;
 r.turnDurationWeeks=1/divisions;r.id=`${r.id}-${divisions}turns`;r.name=`${r.name} · ${divisions} turns/week`;
 r.description+=' This separate teaching scenario uses multiple equal turns per source week. Time budgets and recurring rates are rescaled; physical travel and hourly productivity are unchanged. Calendar linkage is unavailable. Auction random draws use the new turn indices; outcomes need not match a weekly run.';
 r.weeks*=divisions;r.weeksPerMonth*=divisions;
 for(const weather of Object.values(r.weather))for(const kind of ['actual','forecast'] as const)for(const z of r.zones)weather[kind][z.id]=weather[kind][z.id].flatMap(value=>Array.from({length:divisions},()=>value));
 for(const p of r.products)p.maxFreshWeeks*=divisions;
 for(const s of r.stands)if(s.supply==='auction')s.auctionWeek=closing(s.auctionWeek);
 for(const c of r.crews)c.hours/=divisions;
 for(const t of r.trucks){t.hours/=divisions;t.fixedWeekly/=divisions;}
 r.economy.fixedWeekly/=divisions;r.economy.storageCostM3/=divisions;
 for(const m of r.mills)if(m.processing){m.processing.capacityM3/=divisions;for(const o of m.processing.outputs)o.weeklyDemand/=divisions;}
 for(const event of r.disruptions??[]){event.week=opening(event.week);event.endWeek=closing(event.endWeek);event.revealWeek=opening(event.revealWeek);event.repairWeeks*=divisions;}
 for(const job of r.partnerJobs??[]){job.week=opening(job.week);job.deadline=closing(job.deadline);}
 for(const pair of r.reciprocalPairs??[]){pair.opens=opening(pair.opens);pair.deadline=closing(pair.deadline);}
 for(const offer of r.offtakeOffers??[]){offer.opens=opening(offer.opens);offer.acceptBy=closing(offer.acceptBy);offer.deadline=closing(offer.deadline);}
 // These modules have literal 52-week / 12-week mappings and cannot be silently rescaled.
 delete r.seasonCalendar;delete r.weatherCharts;delete r.calibration;
 return r;
}

export const halfWeekScenario=(source:RegionDefinition)=>subdividedScenario(source,2);
