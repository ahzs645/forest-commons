import { expect, it } from 'vitest';
import { bcOperatingLesson } from '../scenarios/bc-operating-lesson';
import vri from '../data/prince-george-vri.json';
import { bcInventorySourceNote, dossierInventoryEvidence } from './lot-evidence';

it('keeps sourced species, age and live density distinct from authored net volume', () => {
  const stand = bcOperatingLesson.stands.find(s => s.id === 'BC01')!;
  const dossier = bcOperatingLesson.operations!.stands.BC01;
  expect(dossier.ageYears).toBe(vri.stands.BC01.ageYears);
  expect(dossier.merchantableM3PerHa.central).toBe(vri.stands.BC01.liveM3PerHa175);
  expect(stand.volume).toBe(Math.round(dossier.netTreatmentAreaHa * vri.stands.BC01.liveM3PerHa175));
  const evidence = dossierInventoryEvidence(bcOperatingLesson, 'BC01');
  expect(evidence).toMatchObject({ sourced: true, featureId: vri.stands.BC01.featureId, snapshotDate: '2026-09-08' });
  expect(bcOperatingLesson.sources.find(s => s.title === 'BC VRI 2025 Rank 1')!.note).not.toContain('not VRI values');
});

it('reads evidence from the embedded scenario, preserving unknown ages and older authored dossiers', () => {
  const region = structuredClone(bcOperatingLesson);
  const stand = region.stands.find(s => s.id === 'BC01')!;
  stand.sourceNote = bcInventorySourceNote({ featureId: '123', ageYears: null }, '2025-03-01T00:00:00Z');
  expect(dossierInventoryEvidence(region, 'BC01')).toMatchObject({ ageUnknown: true, featureId: '123', snapshotDate: '2025-03-01' });
  stand.sourceNote = 'Source polygon retained; all lesson attributes are authored.';
  expect(dossierInventoryEvidence(region, 'BC01')).toMatchObject({ sourced: false, ageUnknown: false });
});
