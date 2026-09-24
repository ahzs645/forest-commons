"""Extract VRI attributes for the Prince George pilot stands from the cached snapshot. No remote requests.

Reads the stand list in src/data/prince-george.json (built by build-prince-george.py) and the cached
VRI 2025 Rank 1 snapshot, and writes src/data/prince-george-vri.json. Values are copied as published;
the game's species-to-product mapping and merchantability threshold live in src/scenarios/prince-george.ts.
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
snapshot = BASE / 'research/bc-inputs/fsr-7695-inventory'
game = json.loads((BASE / 'forestry-game/src/data/prince-george.json').read_text())
features = json.loads((snapshot / 'inventory-rank1.geojson').read_text())['features']
manifest = json.loads((snapshot / 'manifest.json').read_text())
by_id = {str(f['properties']['FEATURE_ID']): f['properties'] for f in features}

stands = {}
for stand in game['stands']:
    p = by_id[stand['sourceId'].split('.')[-1]]
    species = [[p[f'SPECIES_CD_{i}'], p[f'SPECIES_PCT_{i}']] for i in range(1, 7) if p.get(f'SPECIES_CD_{i}')]
    stands[stand['id']] = {
        'featureId': str(p['FEATURE_ID']),
        # Projected live and dead stand volume at 17.5 cm utilization, m³/ha, as published.
        'liveM3PerHa175': round(p.get('LIVE_STAND_VOLUME_175') or 0, 1),
        'deadM3PerHa175': round(p.get('DEAD_STAND_VOLUME_175') or 0, 1),
        'ageYears': p.get('PROJ_AGE_1'),
        'bclcsLevel4': p.get('BCLCS_LEVEL_4'),
        'species': species,
    }

out = {
    'source': 'BC VRI 2025 Rank 1 (Open Government Licence – British Columbia), cached snapshot research/bc-inputs/fsr-7695-inventory',
    'collected': manifest.get('collectedAt') or manifest.get('collected') or manifest.get('retrieved'),
    'fields': 'LIVE_STAND_VOLUME_175, DEAD_STAND_VOLUME_175, PROJ_AGE_1, BCLCS_LEVEL_4, SPECIES_CD_1..6 / SPECIES_PCT_1..6',
    'note': 'Published inventory projections, not a cruise, appraisal or net merchantable volume after decay, waste and breakage.',
    'stands': stands,
}
(BASE / 'forestry-game/src/data/prince-george-vri.json').write_text(json.dumps(out, indent=1) + '\n')
print(f"wrote {len(stands)} stands")
