# Full-season draft comparison

Programmatic comparison using real engine APIs and real save serialization/validation every week. Identical Québec seed 2026, three weather scenarios, no purchases or repairs, final-harvest drafts every week. Decisions use forecasts only. The optional commitment cap is compared with default drafting; this is an evaluation, not a claim of superiority.

This final comparison follows two bounded fixes: both modes rank price per cycle, and both project the same single stock aging/downgrade pass performed before dispatch. The cap only limits whole-load reservations to remaining commitments.

| Weather | Mode | Delivered m³ | Closing CAD | Commitment hits / 30 | Waste m³ |
|---|---|---:|---:|---:|---:|
| normal | Default | 48,892.95 | 2,757,479.41 | 6 | 4,417.78 |
| normal | Commitment cap | 48,700.79 | 2,742,904.94 | 6 | 4,593.18 |
| long-thaw | Default | 48,789.46 | 2,683,524.93 | 6 | 4,190.83 |
| long-thaw | Commitment cap | 48,802.58 | 2,682,457.31 | 6 | 4,190.87 |
| dry | Default | 48,418.14 | 2,795,367.21 | 9 | 5,101.62 |
| dry | Commitment cap | 48,431.25 | 2,790,495.28 | 9 | 5,071.50 |

The cap now ties default commitment hits in all three scenarios. Small volume changes depend on route allocation; closing cash remains slightly lower with the cap. The cap is a planning preference, not an optimizer or assured service improvement.

An earlier candidate ranked remaining service share instead of price per cycle. It reduced hits from 6 to 2 (normal), 7 to 4 (long thaw), and 7 to 2 (dry), and was replaced. Its result motivated retaining the original ranking rather than claiming an unverified optimization benefit.

A separate targeted test confirms expired saw timber is projected as its downgrade assortment, already-expired pulp disappears, downgrade is applied once, and saved batches are unchanged. The full-season comparison itself parsed every saved weekly transition successfully.

Reproduction: `./node_modules/.bin/tsx ../research/playthroughs/stewardship-draft-comparison.ts` from `forestry-game`. Full numerical output is in `stewardship-draft-comparison.json`.
