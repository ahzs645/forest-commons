import type { Game } from './types';
import { stewardshipYear, type StewardshipAction } from './stewardship';
export type AnnualActions = Record<string, StewardshipAction>;
export interface AnnualAlternative { context: string; actions: AnnualActions }
export function annualContext(game: Game): string {
  // Exact opening state and parameters, including connected-season lock/authorization.
  return JSON.stringify({ region: game.linkedSeason?.baseRegion ?? game.region, state: game.stewardship, locked: !!game.linkedSeason && !game.linkedSeason.settled });
}
export function rehearseAnnual(game: Game, actions: AnnualActions) {
  if (game.linkedSeason && !game.linkedSeason.settled) throw Error('The active operating window owns this year. Complete and settle it before applying annual actions.');
  if (!game.stewardship) throw Error('Start the annual exercise first.');
  return stewardshipYear(game.linkedSeason?.baseRegion ?? game.region, game.stewardship, actions);
}
export function captureAnnualAlternative(game: Game, actions: AnnualActions): AnnualAlternative {
  rehearseAnnual(game, actions);
  return { context: annualContext(game), actions: structuredClone(actions) };
}
export function rehearseAnnualAlternative(game: Game, draft: AnnualAlternative) {
  if (draft.context !== annualContext(game)) throw Error('The annual forest or budget changed. Save this alternative again.');
  return rehearseAnnual(game, draft.actions);
}
