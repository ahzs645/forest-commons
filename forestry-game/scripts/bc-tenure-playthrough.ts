import { princeGeorge } from '../src/scenarios/prince-george';
import { advance, createGame, draftPlan, purchase, sum } from '../src/simulation/engine';
import { applyHarvestAuthorization, applyRoadAuthorization, harvestAuthorizationProblem, roadAuthorizationProblem } from '../src/simulation/tenure';
import { parseGame } from '../src/simulation/validation';
import { serializeGame } from '../src/simulation/save-format';
import { lotProfitability } from '../src/simulation/lot-profitability';

// Reproducible player-accessible policy. It never reads future weather or market events.
function run(flatMarkets: boolean) {
  const region=structuredClone(princeGeorge);
  if(flatMarkets)region.bcMarket!.events=[];
  let game=createGame(region,'normal',2026),applications=0;
  for(const stand of region.stands.filter(s=>s.supply==='private').sort((a,b)=>a.askingPrice-b.askingPrice).slice(0,2))if(game.cash>=stand.askingPrice)game=purchase(game,stand.id);
  while(game.week<=region.weeks){
    for(const stand of game.stands.filter(s=>s.owned)){
      if(harvestAuthorizationProblem(game,stand.id)&&game.bcTenure!.harvest[stand.id]?.status!=='pending'){
        game=applyHarvestAuthorization(game,stand.id);applications++;
      }
      const edge=`access-${stand.id}`;
      if(roadAuthorizationProblem(game,edge)&&game.bcTenure!.roads[edge]?.status!=='pending'){
        game=applyRoadAuthorization(game,edge);applications++;
      }
    }
    game=draftPlan(game,{salesPolicy:'penalty-aware',commitmentAware:true,harvestFraction:.5});
    const lot=game.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek===game.week&&!game.stands.find(t=>t.id===s.id)!.owned);
    if(lot&&game.cash>lot.askingPrice*1.4)game.plan.bids[lot.id]=Math.round(lot.askingPrice*1.4);
    game=parseGame(serializeGame(advance(game)));
    if(Math.abs(lotProfitability(game).reconciliationDifference)>1e-5)throw Error('Cash failed to reconcile.');
  }
  const entries=game.history.flatMap(h=>h.ledger);
  const total=(category:string)=>-entries.filter(e=>e.category===category).reduce((n,e)=>n+e.amount,0);
  return {case:flatMarkets?'flat market comparator':'authored fuel and timber cycle',applications,
    delivered:game.history.reduce((n,h)=>n+sum(h.delivered),0),cash:game.cash,
    stumpage:total('stumpage'),postHarvest:total('post-harvest'),production:total('production'),haul:total('haul'),
    bctsAwards:game.stands.filter(s=>s.owned&&region.bcTenure!.stands[s.id].type==='bcts-timber-sale').map(s=>s.id),
    lockedRates:game.bcMarket!.lockedRates,
    outstandingProvisions:Object.values(game.bcTenure!.obligations).reduce((n,o)=>n+o.accrued-o.settled,0),
    weekly:game.history.map(h=>({week:h.week,cash:h.cash,delivered:sum(h.delivered),market:h.market})),
  };
}
console.log(JSON.stringify([run(true),run(false)],null,2));
