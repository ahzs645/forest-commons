import { describe, expect, it } from 'vitest';
import { stewardshipTimeline } from './stewardship-timeline';
import { startStewardship } from './simulation/stewardship';
import { createGame } from './simulation/engine';
import { quebec } from './scenarios/quebec';

function recordedState() {
  const state = startStewardship(createGame(quebec));
  state.year = 3;
  state.history = [
    { year: 1, opening: 200, growth: 20, harvest: 60, closing: 160, cashChange: -100, habitat: .4, actions: { 'S1': 'plant', 'S2': 'rest' } },
    { year: 2, opening: 160, growth: 15, harvest: 25, closing: 150, cashChange: 250, habitat: .5, managedHabitat: .65, actions: { 'S1': 'thin', 'S2': 'plant', 'S3': 'plant' }, operatingSeason: { startCalendarWeek: 20, weeks: 12, roadsideWriteOff: 5 } },
  ];
  return state;
}

describe('recorded stewardship timeline', () => {
  it('uses recorded closing volumes, habitat and treatments instead of present stand observations', () => {
    const state = recordedState();
    state.stands.forEach(stand => { stand.volume = 9999; stand.habitat = .99; stand.planted = true; });
    const before = structuredClone(state);
    const rows = stewardshipTimeline(state, quebec);
    expect(rows.map(row => row.standing)).toEqual([160, 150]);
    expect(rows.map(row => row.landscapeHabitat)).toEqual([.4, .5]);
    expect(rows.map(row => row.managedHabitat)).toEqual([null, .65]);
    expect(rows.map(row => row.plantedStands)).toEqual([['S1'], ['S2', 'S3']]);
    expect(rows[0].treatments).toEqual([['S1', 'plant']]);
    expect(rows[1].connectedSeason).toBe(true);
    expect(state).toEqual(before);
  });

  it('uses the explicit opening budget and only cash movements up to each year', () => {
    const state = recordedState();
    state.openingBudget = 1000;
    state.cash = 1150;
    expect(stewardshipTimeline(state, quebec).map(row => row.closingCash)).toEqual([900, 1150]);
    // Present cash must not be substituted for the historical closing balances.
    state.cash = 8888;
    expect(stewardshipTimeline(state, quebec).map(row => row.closingCash)).toEqual([900, 1150]);
  });

  it('supports legacy annual records using the scenario opening budget and preserves unknown managed habitat', () => {
    const state = recordedState();
    const opening = quebec.stewardship!.startingBudget;
    expect(stewardshipTimeline(state, quebec).map(row => row.closingCash)).toEqual([opening - 100, opening + 150]);
    expect(stewardshipTimeline(state, { ...quebec, stewardship: undefined })[0].closingCash).toBeNull();
    state.history = [];
    expect(stewardshipTimeline(state, quebec)).toEqual([]);
  });
});
