import type { Game, CrewOrder } from "./types";
export const standardTreatment = {
  name: "Final harvest",
  retention: 0,
  productivity: 1,
  cost: 1,
  disturbance: 1,
};
export function treatmentFor(game: Game, order: CrewOrder) {
  return (
    game.region.treatments?.[order.treatment ?? "final"] ?? standardTreatment
  );
}
export function retainedFraction(game: Game, order: CrewOrder) {
  return Math.max(game.plan.retention, treatmentFor(game, order).retention);
}
