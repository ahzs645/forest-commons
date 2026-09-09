import type {Game} from './types';
import {sum} from './engine';
/** One row per settled turn. Empty ratios mean not evaluated, never zero performance. */
export function operatingWorksheetCSV(game:Game,language:'en'|'fr'='en'):string{
 const headers=language==='fr'
 ?['tour','semaines_par_tour','semaines_ecoulees','devise','recolte_m3','livraison_m3','tresorerie_cloture','cibles_evaluees','cibles_atteintes','reussite_pct','emissions_kg_CO2','emissions_par_m3_livre','stock_expire_m3','relocalisation_equipes_km','economies_partenaire','economies_reciproques','region','scenario','graine','reservations_demandees_m3','reservations_realisees_m3','reservations_non_realisees_m3']
 :['turn','weeks_per_turn','elapsed_weeks','currency','harvest_m3','delivery_m3','closing_cash','targets_evaluated','targets_achieved','service_pct','emissions_kg_CO2','emissions_per_delivered_m3','expired_stock_m3','crew_relocation_km','partner_savings','reciprocal_savings','region','scenario','seed','reservation_requested_m3','reservation_fulfilled_m3','reservation_unmet_m3'];
 const duration=game.region.turnDurationWeeks??1;
 const rows:unknown[][]=[headers,...game.history.map((h,index)=>{
  const delivered=sum(h.delivered);
  const requested=(h.plan.reservations??[]).reduce((n,row)=>n+row.volume,0);
  const fulfilled=h.reservationFulfillment===undefined?null:sum(h.reservationFulfillment);
  return [h.week,duration,(index+1)*duration,game.region.currency,sum(h.harvested),delivered,h.cash,h.targetChecks,h.targetHits,h.targetChecks?h.targetHits/h.targetChecks*100:'',h.emissions,delivered?h.emissions/delivered:'',h.waste,h.movements.filter(m=>m.kind==='crew').reduce((n,m)=>n+m.km,0),h.partnerSavings??0,(h.reciprocal??[]).reduce((n,r)=>n+r.savings,0),game.region.id,game.weatherId,game.seed,requested,fulfilled??'',fulfilled===null?'':Math.max(0,requested-fulfilled)];
 })];
 return rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
}
