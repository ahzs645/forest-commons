import type { RegionDefinition } from './types';

/** These notes travel with the scenario/save. Never infer an old campaign's
 * evidence from a newer, separately loaded inventory snapshot. */
export function bcInventorySourceNote(record: { featureId: string; ageYears: number | null }, collected: string) {
  return `VRI 2025 Rank 1 feature ${record.featureId}, snapshot ${collected.slice(0, 10)}: inventory outline, area, species, source age ${record.ageYears ?? 'unknown'} and projected live density (17.5 cm) come from the cached inventory. These are inventory projections, not a cruise. Modelled volume applies that density to an authored net treatment area. Exclusions, species-to-product mapping and the input volume range are teaching assumptions. No treatment/exclusion boundary has been surveyed or mapped.`;
}

export function dossierInventoryEvidence(region: RegionDefinition, standId: string) {
  const note = region.stands.find(s => s.id === standId)?.sourceNote ?? '';
  const sourced = /VRI 2025 Rank 1 feature \d+/.test(note) ||
    note.includes('Inventory outline, area, species, age and projected live volume (17.5 cm) come from VRI 2025');
  return {
    sourced,
    ageUnknown: sourced && /source age unknown/.test(note),
    featureId: sourced ? note.match(/VRI 2025 Rank 1 feature (\d+)/)?.[1] : undefined,
    snapshotDate: sourced ? note.match(/snapshot (\d{4}-\d{2}-\d{2})/)?.[1] : undefined,
  };
}
