import type { RegionDefinition } from '../simulation/types';

export function bcTeachingMarket(): NonNullable<RegionDefinition['bcMarket']> {
  return {
    note: 'Illustrative market scenario, not observed oil prices, a BCTS supply forecast, or the official Market Pricing System. Fuel is a delivered-diesel proxy for oil exposure; local fuel prices need not track crude oil one-for-one. All indices start at 1. Fuel changes the fuel share of harvest and haul costs immediately; lumber changes ordinary mill prices and demand changes future commercial-period intake. The synthetic rival-bid signal responds to margins. Offered BCTS lots and physical timber remain finite and authored; oil does not create harvest rights or automatically determine BCTS output. Adjustable teaching stumpage changes at physical week 7, then every 13 weeks, using a two-week information lag. These offsets represent a campaign crossing a rate boundary, not BC administrative service standards. BCTS teaching rates are fixed at award. Actual licence terms and applicable appraisal manuals govern real rates. Charges settle with the harvest turn in this exercise; scaling, invoice issuance and actual payment processing delays are not separately simulated.',
    initial: { fuel: 1, lumber: 1, demand: 1 },
    events: [
      { id: 'fuel-rise', week: 3, revealWeek: 3, label: 'Delivered fuel becomes more expensive', indices: { fuel: 1.35, lumber: 1, demand: 1 } },
      { id: 'timber-slowdown', week: 5, revealWeek: 5, label: 'Lumber prices and mill intake weaken', indices: { fuel: 1.35, lumber: 0.85, demand: 0.9 } },
      { id: 'market-recovery', week: 9, revealWeek: 9, label: 'Fuel eases and timber demand recovers', indices: { fuel: 0.9, lumber: 1.1, demand: 1.05 } },
    ],
    harvestFuelShare: 0.25,
    haulFuelShare: 0.35,
    bidFuelSensitivity: 0.3,
    stumpage: { firstResetWeek: 7, resetEveryWeeks: 13, lagWeeks: 2, lumberWeight: 0.45, bidWeight: 0.45, fuelWeight: 0.1, minMultiplier: 0.25, maxMultiplier: 2 },
  };
}
