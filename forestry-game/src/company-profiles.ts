// Table 1 in the supplied four- and five-company collaboration handouts.
// Preserve each dataset's distinct figures; the printed five-company total differs by 10 m³.
export const companyProfiles: Record<
  4 | 5,
  Record<string, { volume: number; distance: number }>
> = {
  4: {
    "1": { volume: 77300, distance: 70.3 },
    "2": { volume: 301300, distance: 56.8 },
    "3": { volume: 232100, distance: 68.5 },
    "4": { volume: 89300, distance: 68.5 },
  },
  5: {
    "1": { volume: 77360, distance: 70.3 },
    "2": { volume: 301660, distance: 56.8 },
    "3": { volume: 232100, distance: 68.5 },
    "4": { volume: 89300, distance: 68.5 },
    "5": { volume: 94770, distance: 49.7 },
  },
};
