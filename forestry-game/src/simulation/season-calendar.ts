import { operatingRegion } from "./disruptions";
import { harvestAuthorizationProblem } from "./tenure";
import type { AuthorizationDefinition, AuthorizationState } from "./tenure";
import type {Game,RegionDefinition,Weather} from './types';
import {createGame} from './engine';
import {startStewardship,stewardshipYear,validateStewardship,stewardshipHabitat} from './stewardship';
import type {StewardshipState} from './stewardship';
export interface SeasonCalendar {
 provenance:string;
 weather:RegionDefinition['weather'];
 /** Thirteen authored four-week commercial periods, not Gregorian months. */
 demand:Record<string,RegionDefinition['mills'][number]['demand']>;
 events:(NonNullable<RegionDefinition['disruptions']>[number])[];
}
export interface LinkedSeason {
 baseRegion:RegionDefinition;
 opening:StewardshipState;
 startCalendarWeek:number;
 settled:boolean;
 openingRoadsideWriteOff?:number;
}
export function illustrativeCalendar(region:RegionDefinition):SeasonCalendar {
 if((region.turnDurationWeeks??1)!==1)throw Error('Annual calendar linkage is unavailable for subweekly turns.');
 const categorical=(week:number,north:boolean):Weather=>week<=10||week>=46?'frozen':week<=17+(north?2:0)?'thaw':week>=36?'wet':'normal';
 return {provenance:'Authored teaching calendar, not observed climate or a locally calibrated access calendar. Winter weeks 1–10 and 46–52 are frozen; thaw extends through week 17 (19 north), autumn weeks 36–45 are wet. Existing 12-week scenarios override weeks 13–24. Thirteen four-week demand periods repeat the original commercial teaching cycle. Dated disruptions are anchored to the original week-13 campaign and recur only if included in the selected window. Auctions and partner jobs remain relative to the selected campaign. Authored BC market events repeat relative to each operating window; fixed-at-award stumpage rates carry forward. This is not a continuous multi-year market forecast.',weather:Object.fromEntries(Object.entries(region.weather).map(([id,w])=>[id,{name:w.name,forecast:Object.fromEntries(region.zones.map(z=>[z.id,Array.from({length:52},(_,i)=>w.forecast[z.id][i-12]??categorical(i+1,z.id==='north'))])),actual:Object.fromEntries(region.zones.map(z=>[z.id,Array.from({length:52},(_,i)=>w.actual[z.id][i-12]??categorical(i+1,z.id==='north'))]))}])),demand:Object.fromEntries(region.mills.map(m=>[m.id,Array.from({length:13},(_,i)=>structuredClone(m.demand[i%m.demand.length]))])),events:(region.disruptions??[]).map(e=>({...e,week:e.week+12,endWeek:e.endWeek+12,revealWeek:e.revealWeek+12}))};
}
export function validateSeasonCalendar(region:RegionDefinition) {
 const c=region.seasonCalendar;if(!c)return;
 if(!c.provenance||typeof c.provenance!=='string'||c.provenance.length>5000)throw Error('Invalid season calendar provenance.');
 for(const id of Object.keys(region.weather))for(const kind of ['forecast','actual'] as const)for(const z of region.zones){const values=c.weather?.[id]?.[kind]?.[z.id];if(!Array.isArray(values)||values.length!==52||values.some(w=>!['thaw','wet','normal','frozen'].includes(w)))throw Error('Season calendar requires 52 categorical weeks.');}
 for(const m of region.mills){const values=c.demand?.[m.id];if(!Array.isArray(values)||values.length!==13||values.some(v=>!v||region.products.some(p=>!Number.isFinite(v[p.id]??0)||(v[p.id]??0)<0)||Object.keys(v).some(id=>!region.products.some(p=>p.id===id))))throw Error('Season calendar requires thirteen commercial demand periods.');}
 if(!Array.isArray(c.events)||new Set(c.events.map(e=>e.id)).size!==c.events.length)throw Error('Invalid calendar events.');
 for(const e of c.events){const entities=e.kind==='road'?region.roads.edges:e.kind==='crew'?region.crews:e.kind==='truck'?region.trucks:e.kind==='mill'?region.mills:[];if(!entities.some(d=>d.id===e.target)||![e.week,e.endWeek,e.revealWeek,e.repairWeeks].every(Number.isInteger)||e.week<1||e.endWeek<e.week||e.endWeek>52||e.revealWeek<1||e.revealWeek>e.week||!Number.isFinite(e.repairCost)||e.repairCost<0||e.repairWeeks<0)throw Error('Invalid dated calendar event.');}
}
export function seasonWindow(base:RegionDefinition,start:number):RegionDefinition {
 if((base.turnDurationWeeks??1)!==1)throw Error('Annual calendar linkage is unavailable for subweekly turns.');
 if(!Number.isInteger(start)||start<1||start>52)throw Error('Choose a start week from 1 to 52.');
 validateSeasonCalendar(base);const c=base.seasonCalendar;if(!c)throw Error('This region needs an authored seasonal calendar.');
 const region=structuredClone(base);region.weeks=12;region.weeksPerMonth=4;
 region.weather=Object.fromEntries(Object.entries(c.weather).map(([id,w])=>[id,{name:w.name,forecast:Object.fromEntries(base.zones.map(z=>[z.id,Array.from({length:12},(_,i)=>w.forecast[z.id][(start-1+i)%52])])),actual:Object.fromEntries(base.zones.map(z=>[z.id,Array.from({length:12},(_,i)=>w.actual[z.id][(start-1+i)%52])]))}]));
 // Sum weekly shares into the selected four-week settlement periods. A period
 // crossing a source-period boundary therefore combines both authored demands.
 for(const m of region.mills)m.demand=Array.from({length:3},(_,period)=>Object.fromEntries(base.products.filter(p=>p.id in m.prices).map(p=>[p.id,Array.from({length:4},(_,i)=>c.demand[m.id][Math.floor(((start-1+period*4+i)%52)/4)][p.id]??0).reduce((n,v)=>n+v/4,0)])));
 region.disruptions=c.events.flatMap(e=>{const offset=(e.week-start+52)%52;if(offset>=12)return [];return [{...e,week:offset+1,endWeek:Math.min(12,offset+1+e.endWeek-e.week),revealWeek:Math.max(1,offset+1-(e.week-e.revealWeek))}];});
 // A calendar event already underway at window opening remains active.
 for(const e of c.events)if(e.week<start&&e.endWeek>=start&&!region.disruptions.some(x=>x.id===e.id))region.disruptions.push({...e,week:1,endWeek:Math.min(12,e.endWeek-start+1),revealWeek:1});
 if(region.weatherCharts)region.weatherCharts.startCalendarWeek=start;
 return region;
}
export function beginLinkedSeason(game:Game,start:number):Game {
 if(game.region.operations)throw Error('This operating-profile lesson is a single-season case. Use the original regional preset for linked annual stewardship; its field-evidence and yield lifecycle has not been coupled to this profile.');
 if((game.region.turnDurationWeeks??1)!==1)throw Error('Annual calendar linkage is unavailable for subweekly turns.');
 if(game.linkedSeason&&!game.linkedSeason.settled)throw Error('Finish and settle the active operating window first.');
 if(game.week>1&&game.week<=game.region.weeks)throw Error('Finish the current operating campaign before linking years.');
 const base=structuredClone(game.linkedSeason?.baseRegion??game.region);
 const opening=structuredClone(game.stewardship??startStewardship(game));
 if(!game.stewardship){opening.cash=game.cash;opening.openingBudget=game.cash;}
 opening.openingBudget ??= base.stewardship!.startingBudget;
 if(game.linkedSeason && 52*(opening.year-game.linkedSeason.opening.year)+start-game.linkedSeason.startCalendarWeek<12)throw Error('This window overlaps the previous operating season; choose a later start week or advance an annual rest year.');
 if(opening.year>(base.stewardship?.years??0))throw Error('The annual horizon is complete.');
 if(opening.cash<0)throw Error('The linked season needs a nonnegative opening budget.');
 const region=seasonWindow(base,start);region.economy.startingCash=opening.cash;
 for(const d of region.stands){const s=opening.stands.find(s=>s.id===d.id)!;d.volume=s.volume;
 // Temporarily withhold harvest access during annual cooldown without selling rights.
 const cooldown=s.yearsSinceTreatment<5&&opening.history.some(h=>['thin','final'].includes(h.actions[s.id]??''));
 d.supply=base.stands.find(x=>x.id===d.id)!.supply==='protected'||cooldown?'protected':s.managed?'guaranteed':d.supply;
 }
 const next=createGame(region,game.weatherId,game.seed);next.stewardship=opening;next.linkedSeason={baseRegion:base,opening:structuredClone(opening),startCalendarWeek:start,settled:false,openingRoadsideWriteOff:game.linkedSeason?.settled?0:game.stands.reduce((n,s)=>n+s.stock.reduce((n,b)=>n+b.volume,0),0)};
 for(const stand of next.stands){
  const previous=game.stands.find(s=>s.id===stand.id)!;
  const original=game.region.stands.find(s=>s.id===stand.id)!;
  const rate=previous.royaltyM3 ?? (game.region.economy.timberPayment==='harvest-royalty'&&original.volume>0 ? previous.purchasePaid/original.volume : 0);
  if(rate>0)stand.royaltyM3=rate;
 }
 if(game.bcMarket)next.bcMarket=structuredClone(game.bcMarket);
 if(game.bcTenure && next.region.bcTenure){
  next.bcTenure=structuredClone(game.bcTenure);
  // Approvals with no authored expiry survive. Finite permits must be renewed
  // between annual windows; this avoids resetting an expired permit to active.
  const rebase=(a:AuthorizationState,d:AuthorizationDefinition):AuthorizationState=>{
   if(game.week===1&&!game.linkedSeason)return structuredClone(a);
   if(a.status==='required')return {status:'required'};
   if(d.validForWeeks!==undefined)return {status:'required'};
   if((a.approvedWeek??Infinity)<=game.week)return {status:'approved',approvedWeek:1};
   const delay=(a.approvedWeek??game.week)-game.week;
   return {status:'pending',submittedWeek:1,approvedWeek:1+delay};
  };
  for(const [id,a] of Object.entries(next.bcTenure.harvest))next.bcTenure.harvest[id]=rebase(a,next.region.bcTenure.stands[id].harvest);
  for(const [id,a] of Object.entries(next.bcTenure.roads))next.bcTenure.roads[id]=rebase(a,next.region.bcTenure.roads[id]);
 }
 if(game.processing){next.processing=structuredClone(game.processing);next.processingOpening=structuredClone(game.processing);}
 next.improvedRoads=[...game.improvedRoads];next.crewPositions={...game.crewPositions};next.truckPositions={...game.truckPositions};
 return next;
}
export function settleLinkedSeason(game:Game):Game {
 const link=game.linkedSeason;if(!link||link.settled)throw Error('No unsettled linked season.');
 if(game.week<=game.region.weeks)throw Error('Complete all twelve operating weeks first.');
 const next=structuredClone(game),state=structuredClone(link.opening);
 const cashChange=game.cash-state.cash;state.cash=game.cash;
 const closingMarket=operatingRegion(game);
 let harvest=0;const actions:Record<string,'rest'|'thin'|'final'|'plant'>={};
 for(const s of state.stands){const end=game.stands.find(t=>t.id===s.id)!;const removed=s.volume-end.remaining;harvest+=removed;
 if(removed>1e-6){s.habitat*=s.volume?end.remaining/s.volume:1;s.yearsSinceTreatment=0;const treatments=game.history.flatMap(h=>h.production??[]).filter(p=>p.stand===s.id).map(p=>p.treatment);actions[s.id]=treatments.includes('final')?'final':'thin';if(actions[s.id]==='final'){s.regenerationAge=0;s.planted=false;}}
 s.volume=end.remaining;s.managed=s.managed||end.owned;
 if(game.region.bcTenure){s.harvestAuthorizationProblem=harvestAuthorizationProblem(game,s.id);s.stumpageRates=structuredClone(closingMarket.bcTenure!.stands[s.id].stumpage.rates);}
 }
 // Apply the year's growth/recovery once, after the 12-week operating window.
 // Operational removals have already happened, so rest avoids harvesting twice.
 const annual=stewardshipYear(link.baseRegion,state,{}),report=annual.history.at(-1)!;
 report.opening+=harvest;report.harvest+=harvest;report.cashChange+=cashChange;report.actions=actions;
 if(game.region.bcTenure){
  const ledger=game.history.flatMap(h=>h.ledger);
  report.stumpageCost=-ledger.filter(e=>e.category==='stumpage').reduce((n,e)=>n+e.amount,0);
  report.postHarvestCost=-ledger.filter(e=>e.category==='post-harvest').reduce((n,e)=>n+e.amount,0);
  report.postHarvestAccrued=game.stands.reduce((n,s)=>n+s.harvested*(game.region.bcTenure!.stands[s.id]?.obligations??[]).reduce((n,o)=>n+o.costPerM3,0),0);
 }
 report.operatingSeason={startCalendarWeek:link.startCalendarWeek,weeks:12,roadsideWriteOff:(link.openingRoadsideWriteOff??0)+game.stands.reduce((n,s)=>n+s.stock.reduce((n,b)=>n+b.volume,0),0)};
 // Harvested areas do not receive a rest-year habitat recovery bonus.
 for(const stand of annual.stands)if(actions[stand.id])stand.habitat=state.stands.find(s=>s.id===stand.id)!.habitat;
 const habitat=stewardshipHabitat(link.baseRegion,annual);report.habitat=habitat.landscape;report.managedHabitat=habitat.managed;
 next.stewardship=annual;next.linkedSeason!.settled=true;
 validateStewardship(link.baseRegion,annual);return next;
}
export function validateLinkedSeason(game:Game) {
 const link=game.linkedSeason;if(!link)return;
 if((game.region.turnDurationWeeks??1)!==1||(link.baseRegion.turnDurationWeeks??1)!==1)throw Error('Subweekly linked seasons are unsupported.');
 if((link.openingRoadsideWriteOff!==undefined&&(!Number.isFinite(link.openingRoadsideWriteOff)||link.openingRoadsideWriteOff<0))||typeof link.settled!=='boolean'||!Number.isInteger(link.startCalendarWeek)||link.startCalendarWeek<1||link.startCalendarWeek>52||!game.stewardship)throw Error('Invalid linked-season metadata.');
 validateSeasonCalendar(link.baseRegion);validateStewardship(link.baseRegion,link.opening);validateStewardship(link.baseRegion,game.stewardship);
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 const near=(a:number,b:number)=>Math.abs(a-b)<0.01;
 if(game.region.id!==link.baseRegion.id||game.region.weeks!==12||game.region.weeksPerMonth!==4||!near(game.region.economy.startingCash,link.opening.cash)||game.region.stands.length!==link.opening.stands.length||game.region.stands.some(d=>{const s=link.opening.stands.find(s=>s.id===d.id);return !s||!near(d.volume,s.volume);}))throw Error('Invalid linked-season opening resources.');
 if(!same(game.stewardship.history.slice(0,link.opening.history.length),link.opening.history))throw Error('Linked annual history was changed.');
 if(!link.settled&&!same(game.stewardship,link.opening))throw Error('Annual state must remain frozen during operations.');
 if(link.settled){
  const record=game.stewardship.history[link.opening.year-1];
  const removed=game.stands.reduce((n,s)=>n+s.harvested,0);
  const writeOff=(link.openingRoadsideWriteOff??0)+game.stands.reduce((n,s)=>n+s.stock.reduce((n,b)=>n+b.volume,0),0);
  if(!record?.operatingSeason||record.operatingSeason.startCalendarWeek!==link.startCalendarWeek||!near(record.harvest,removed)||!near(record.cashChange,game.cash-link.opening.cash)||!near(record.operatingSeason.roadsideWriteOff,writeOff))throw Error('Invalid linked-season settlement balance.');
 }

 if((link.settled ? game.stewardship.year<link.opening.year+1 : game.stewardship.year!==link.opening.year)||link.settled&&game.week<=game.region.weeks)throw Error('Invalid linked-year clock.');
}
