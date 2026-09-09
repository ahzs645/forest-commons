# Regional calibration evidence workflow

The new Scenario Studio evidence component reviews twelve input groups spanning geography, timber/products, access/trucking, tenure, growth/ecology and economics. Each entry stores source URL, licence/use terms, source edition/evidence date, units/conversion, reviewer, status, notes and a fingerprint of covered regional values.

An entry is not reviewed merely because it has a link. The reviewer must supply complete metadata and explicitly record a review of the current input snapshot. Changed regional values appear as stale; missing entries and missing metadata remain visible. The fingerprint is a change detector, not a cryptographic signature or verification of professional authority. No overall “BC calibrated” flag is created.

Manifests can be imported/exported separately and are included as optional `RegionDefinition.calibration` in normal region JSON. Imported/replaced evidence shows a comparison before saving. Existing regions without a manifest remain supported. Four tests verify incomplete BC starting points, review requirements/staleness, unsafe URLs/invalid dates/statuses and comparison/roundtrip behavior.

## Verified BC starting references

The following official pages were checked on 2026-09-07. They are discovery/reference pointers, not evidence that a particular game's numerical inputs are applicable. No dataset licence was inferred from a government URL.

- [Data Distribution Services](https://www2.gov.bc.ca/gov/content/data/finding-and-sharing/data-distribution-services): entry point for BC Geographic Warehouse and catalogue data.
- [VRI Data Standards](https://www2.gov.bc.ca/gov/content/industry/forestry/managing-our-forest-resources/forest-inventory/data-management-and-access/vri-data-standards): inventory attributes and standards.
- [Resource Road Engineering Manual](https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/engineering-standards-guidelines/engineering-manual): road administration/design/maintenance guidance; does not by itself provide the game's truck payload or seasonal operating parameters.
- [Forest Tenures](https://www2.gov.bc.ca/gov/content/industry/forestry/forest-tenures): tenure and harvesting-authority reference.
- [TIPSY](https://www2.gov.bc.ca/gov/content/industry/forestry/managing-our-forest-resources/forest-inventory/growth-and-yield-modelling/table-interpolation-program-for-stand-yields-tipsy): managed stand yield model information.
- [VDYP growth relationships and components](https://www2.gov.bc.ca/gov/content/industry/forestry/managing-our-forest-resources/forest-inventory/growth-and-yield-modelling/variable-density-yield-projection-vdyp/growth-relationships-and-model-components): natural-stand growth model context; not a substitute for habitat/emissions validation.
- [Timber Pricing](https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing): appraisal and stumpage reference; not a source of game mill sale prices or all operating costs.

Local dataset selection, lawful use, tenure applicability, product recovery, operating productivity, economics, growth and ecological review remain required. The workflow does not rename Québec parameters into an asserted BC preset.
