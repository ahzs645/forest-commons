import { harvestAuthorizationProblem } from "./tenure";
import type {Game} from './types';
import {stockAt,month} from './engine';
import {forecastOutcome} from './planning';
import {operatingRegion,activeDisruptions} from './disruptions';
import {weatherAt,canAccess,route} from './routing';
export function deliverability(game:Game){
 const region=operatingRegion(game),weather=weatherAt(game,true),closed=activeDisruptions(game),ended=game.week>region.weeks;
 const forecast=forecastOutcome(game);
 const mixedReceipts=Object.values(game.plan.trucks).flat().some(o=>o.process||o.spot||o.offtake);
 const products=region.products.map(product=>{
  const remaining=region.mills.reduce((n,m)=>n+Math.max(0,(game.plan.targets[m.id]?.[product.id]??0)-(game.deliveries[m.id]?.[product.id]??0)),0);
  const after=forecast.report&&!mixedReceipts?region.mills.reduce((n,m)=>n+Math.max(0,(game.plan.targets[m.id]?.[product.id]??0)-(game.deliveries[m.id]?.[product.id]??0)-(forecast.report!.millDeliveries[m.id]?.[product.id]??0)),0):null;
  return {product,remaining,forecastDelivery:forecast.report?(forecast.report.delivered[product.id]??0):null,remainingAfterForecast:after};
 });
 const sites=region.stands.map(stand=>{
  const state=game.stands.find(s=>s.id===stand.id)!,terrainOpen=canAccess(stand.terrain,weather[stand.zone]),roadside=stockAt(game,stand.id);
  const crews=region.crews.flatMap(crew=>{
   if(ended||!state.owned||state.refused||harvestAuthorizationProblem(game,stand.id)||!terrainOpen||state.remaining<=stand.volume*game.plan.retention||crew.hours<=0)return [];
   const travel=route(region,game.crewPositions[crew.id],stand.node,weather,game.improvedRoads);if(!travel)return [];
   const workHours=crew.hours-travel.km/crew.relocationSpeed;
   return workHours>0?[{id:crew.id,name:crew.name,workHours}]:[];
  });
  // Roadside pickup uses road bearing, not harvest terrain class, as in the engine.
  const connections=region.products.flatMap(product=>{
   const candidates=region.mills.filter(m=>m.prices[product.id]!==undefined&&!closed.some(e=>e.kind==='mill'&&e.target===m.id)&&Math.max(0,(m.demand[month(game)][product.id]??0)-(game.deliveries[m.id]?.[product.id]??0))>0);
   return candidates.flatMap(mill=>region.trucks.flatMap(truck=>{
    if(ended||!state.owned||truck.hours<=0)return [];
    const empty=route(region,game.truckPositions[truck.id],stand.node,weather,game.improvedRoads),loaded=route(region,stand.node,mill.node,weather,game.improvedRoads);
    if(!empty||!loaded)return [];
    const firstLoadHours=empty.hours+loaded.hours+truck.loadingHours+truck.unloadingHours;
    if(firstLoadHours>truck.hours)return [];
    return [{product:product.id,truck:truck.id,mill:mill.id,firstLoadHours,payload:truck.payload,remainingDemand:Math.max(0,(mill.demand[month(game)][product.id]??0)-(game.deliveries[mill.id]?.[product.id]??0))}];
   }));
  });
  const reasons:string[]=[];
  if(ended)reasons.push('Season complete.');
  else if(!state.owned||state.refused)reasons.push('Timber is not secured.');
  else {
   const authorizationProblem=harvestAuthorizationProblem(game,stand.id);if(authorizationProblem)reasons.push(authorizationProblem);
   if(!terrainOpen)reasons.push('Forecast terrain prevents harvesting; existing roadside stock may still be hauled over open roads.');
   if(terrainOpen&&!crews.length)reasons.push('No crew can arrive with working time left, or no harvestable standing volume remains.');
   if(!connections.length)reasons.push('No first-load connection to remaining regular mill demand: check open roads, receiving closures and truck time.');
   if(!Object.values(roadside).some(n=>n>0))reasons.push('No opening roadside stock; hauling depends on this week’s production.');
  }
  return {id:stand.id,name:stand.name,owned:state.owned&&!state.refused,terrainOpen,roadside,crews,connections,reasons};
 });
 return {products,sites,forecast,mixedReceipts,ended};
}
