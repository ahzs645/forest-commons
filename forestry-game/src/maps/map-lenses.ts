import type {Game, WeekResult} from '../simulation/types';
import {stockAt, sum} from '../simulation/engine';
import {canAccess, weatherAt} from '../simulation/routing';

export type MapLens = 'rights' | 'standing' | 'roadside' | 'access';
export type MapColor = [number, number, number, number];
export const MAP_LENSES: readonly MapLens[] = ['rights', 'standing', 'roadside', 'access'];
export const UNKNOWN_COLOR: MapColor = [145, 145, 145, 170];
const VOLUME_COLORS: MapColor[] = [[235, 240, 232, 180], [201, 226, 190, 190], [133, 186, 127, 200], [65, 139, 86, 210], [18, 86, 59, 220]];
export const volumeBreaks = (lens: 'standing' | 'roadside') => lens === 'standing' ? [0, 1000, 3000, 6000] : [0, 250, 1000, 3000];
export function volumeColor(value: number | null, lens: 'standing' | 'roadside'): MapColor {
  if (value === null || !Number.isFinite(value) || value < 0) return UNKNOWN_COLOR;
  const breaks = volumeBreaks(lens);
  const index = value === 0 ? 0 : value < breaks[1] ? 1 : value < breaks[2] ? 2 : value < breaks[3] ? 3 : 4;
  return VOLUME_COLORS[index];
}
export const volumeLegendColors = VOLUME_COLORS;
export interface StandLensValue { id: string; name: string; standing: number | null; roadside: number | null; owned: boolean | null; protected: boolean; terrainOpen: boolean | null; }
/** Recorded end-state only. Missing legacy snapshots never borrow today's stocks or rights. */
export function mapStandValues(game: Game, report?: WeekResult): StandLensValue[] {
  const state = report ? report.snapshot?.stands : game.stands;
  const weather = report?.weather ?? (game.week > game.region.weeks ? null : weatherAt(game, true));
  const view = state ? {...game, stands: state} : null;
  return game.region.stands.map(stand => {
    const saved = state?.find(item => item.id === stand.id);
    return {id: stand.id, name: stand.name, standing: saved?.remaining ?? null,
      roadside: view && saved ? sum(stockAt(view, stand.id)) : null,
      owned: saved?.owned ?? null, protected: stand.supply === 'protected',
      terrainOpen: weather ? canAccess(stand.terrain, weather[stand.zone]) : null};
  });
}
export function standLensColor(value: StandLensValue, lens: MapLens): MapColor {
  if (lens === 'standing' || lens === 'roadside') return volumeColor(value[lens], lens);
  if (lens === 'access') return value.protected ? [136, 93, 160, 180] : value.terrainOpen === null ? UNKNOWN_COLOR : value.terrainOpen ? [34, 124, 79, 185] : [198, 75, 57, 195];
  return value.owned === null ? UNKNOWN_COLOR : value.protected ? [136, 93, 160, 150] : value.owned ? [34, 124, 79, 185] : [205, 149, 89, 165];
}
export function snapshotComparison(game: Game, first: number, second: number) {
  const a = game.history[first], b = game.history[second];
  if (!a?.snapshot || !b?.snapshot) return null;
  const earlier = mapStandValues(game, a), later = mapStandValues(game, b);
  return earlier.map(stand => {
    const next = later.find(item => item.id === stand.id)!;
    return {id: stand.id, name: stand.name, standingA: stand.standing!, standingB: next.standing!, roadsideA: stand.roadside!, roadsideB: next.roadside!,
      standingChange: next.standing! - stand.standing!, roadsideChange: next.roadside! - stand.roadside!};
  });
}
