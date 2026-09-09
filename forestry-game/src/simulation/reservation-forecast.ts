import type {Game} from './types';
import {forecastOutcome} from './planning';
export function reservationForecast(game:Game,completePlan=true){
 const forecast=completePlan?forecastOutcome(game):{report:null,problems:[]};
 return {problems:forecast.problems,rows:(game.plan.reservations??[]).map(row=>{
  const fulfilled=forecast.report?forecast.report.reservationFulfillment?.[row.id]??0:null;
  const contract=game.region.offtakeOffers?.find(o=>o.id===row.offtake);
  const target=row.market==='ordinary'?Math.max(0,(game.plan.targets[row.mill]?.[row.product]??0)-(game.deliveries[row.mill]?.[row.product]??0)):row.market==='offtake'&&contract?Math.max(0,contract.volume-(game.offtake?.[contract.id]?.delivered??0)):null;
  return {...row,fulfilled,outstanding:fulfilled===null?null:Math.max(0,row.volume-fulfilled),target};
 })};
}
