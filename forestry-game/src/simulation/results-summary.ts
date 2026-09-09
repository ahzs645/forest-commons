import type {Game} from './types';
import {sum} from './engine';

/** Recorded operating results only; unrun weeks must never be presented as zero output. */
export function resultsSummary(game: Game) {
  if (!game.history.length) return null;
  const harvested = game.history.reduce((n, h) => n + sum(h.harvested), 0);
  const delivered = game.history.reduce((n, h) => n + sum(h.delivered), 0);
  const checks = game.history.reduce((n, h) => n + h.targetChecks, 0);
  const hits = game.history.reduce((n, h) => n + h.targetHits, 0);
  const emissions = game.history.reduce((n, h) => n + h.emissions, 0);
  return {weeks: game.history.length, harvested, delivered, checks, hits,
    servicePercent: checks ? hits / checks * 100 : null,
    emissions, emissionsPerDelivered: delivered ? emissions / delivered : null,
    waste: game.history.reduce((n, h) => n + h.waste, 0),
    closingCash: game.history[game.history.length - 1].cash};
}
export function resultsExplanation(game: Game, language: "en" | "fr" = "en") {
  if(language === "fr") return [
    `Les résultats comprennent uniquement les tours terminés (${(game.region.turnDurationWeeks??1).toLocaleString("fr-CA",{maximumFractionDigits:3})} semaines physiques par tour). La récolte, la livraison et le stock expiré sont mesurés en m³. Les émissions modélisées sont en kg CO₂.`,
    `Le respect des engagements est le nombre de cibles positives usine/produit atteintes divisé par les cibles évaluées en fin de période. Les livraisons doivent rester dans une tolérance de ±${Math.round(game.region.economy.tolerance * 100)} %. Une livraison excessive peut aussi manquer un engagement. Ce résultat n’est pas le pourcentage du volume demandé livré.`,
    `L’intensité des émissions divise toutes les émissions opérationnelles enregistrées par le volume livré. Elle reste indisponible jusqu’à la première livraison. La trésorerie de clôture est le solde du dernier tour terminé, pas le bénéfice ni le solde actuel de planification.`,
    `Ces résultats décrivent un scénario pédagogique, sans constituer une référence opérationnelle. Comparez uniquement des campagnes de même région, scénario, graine, règles et durée écoulée. Les coefficients synthétiques ne certifient pas la performance forestière.`,
  ];
  return [
    `Results include completed turns only (${(game.region.turnDurationWeeks??1).toLocaleString("en-CA",{maximumFractionDigits:3})} physical weeks per turn). Harvest, delivery and expired inventory are measured in m³; emissions are modeled kg CO₂.`,
    `Commitment success counts achieved positive mill/product targets divided by evaluated targets at period boundaries. Deliveries must be within ±${Math.round(game.region.economy.tolerance * 100)}% of the target; excess delivery can also miss a commitment. It is not the percentage of demand volume delivered.`,
    `Emissions intensity divides all recorded operating emissions by delivered volume. It is unavailable until a delivery occurs. Closing cash is the last completed turn's balance, not profit or the current planning balance.`,
    `These are training scenario results, not an operational benchmark. Compare runs only with matching region, scenario, seed, rules and elapsed time; synthetic coefficients do not certify forestry performance.`,
  ];
}
