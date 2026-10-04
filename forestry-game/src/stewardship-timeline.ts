import type { StewardshipState } from './simulation/stewardship';
import type { RegionDefinition } from './simulation/types';

/** Use saved observations only; current stand volumes do not represent past years. */
export function stewardshipTimeline(state: StewardshipState, region: RegionDefinition) {
  let cash = state.openingBudget ?? region.stewardship?.startingBudget;
  return state.history.map(record => {
    if (cash !== undefined) cash += record.cashChange;
    return {
      year: record.year,
      opening: record.opening,
      standing: record.closing,
      growth: record.growth,
      harvest: record.harvest,
      cashChange: record.cashChange,
      closingCash: cash ?? null,
      landscapeHabitat: record.habitat,
      managedHabitat: record.managedHabitat ?? null,
      plantedStands: Object.entries(record.actions).filter(([, action]) => action === 'plant').map(([id]) => id),
      treatments: Object.entries(record.actions).filter(([, action]) => action !== 'rest'),
      connectedSeason: record.operatingSeason !== undefined,
      standSnapshots: record.standSnapshots ?? null,
    };
  });
}
