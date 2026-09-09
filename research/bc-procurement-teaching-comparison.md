# BC procurement and transport teaching comparison

Reproduce from `forestry-game` with `npx tsx scripts/bc-procurement-comparison.ts`. The two baseline campaigns below use the default weekly Prince George package and toolbar draft settings. The reproduction script also reports explicit dispatch-policy variants. The acquisition case buys opening private lots in ascending asking price per standing cubic metre, only if affordable in cash. Neither policy inspects future weather or auction seeds. Raw outcomes are in `playthroughs/bc-procurement-comparison.json`.

| Outcome | Existing rights only | Buy seven private lots, then draft |
|---|---:|---:|
| Delivered | 20,254 m³ | 26,546 m³ |
| Harvested | 23,455 m³ | 39,843 m³ |
| Waste | 3,201 m³ | 13,287 m³ |
| Closing cash | CAD 1,134,451 | CAD 1,035,889 |
| Commitment checks met | 7 / 30 | 12 / 30 |

The extra supply improves service but does not reach the 30,000 m³ delivery objective with this policy. Acquiring more timber does not itself ensure timely hauling or appropriate harvest pacing. Extra harvest can age into waste before transport can use it. This is a useful paired exercise: ask learners to compare selective acquisition, delayed harvest, product priorities and transport queues before interpreting cash alone as success.

These two runs do not establish the best policy, prove the delivery target feasible or infeasible, or calibrate BC costs. No regional coefficients or targets were changed to improve these results.

## Existing dispatch-policy comparison

The extended script runs 14 complete campaigns: the toolbar default and six explicit sales-priority/commitment-cap settings, each with and without opening private purchases. The toolbar default uses its legacy price-per-cycle ranking; selecting margin explicitly uses net transport margin. These are separate policies, not duplicate baselines.

Among this bounded set, private acquisition plus penalty-aware dispatch with the commitment cap delivered 28,779 m³, with 11,055 m³ waste and CAD 1,302,150 closing cash. It met 12/30 checks. None reached 30,000 m³. This does not prove the target infeasible; it identifies harvest pacing and allocation as unresolved strategy questions. All runs completed normally. Raw results: `playthroughs/bc-procurement-policy-comparison.json`.

## Harvest pacing: a feasible delivery-target example

Run `npx tsx scripts/bc-harvest-pacing.ts` from the app directory. All four cases buy the same affordable opening private lots and use penalty-aware dispatch with the commitment cap. After each draft, multiply all proposed crew hours by the stated factor, leaving truck orders unchanged. These edits are available to a player through crew queues; no future truth is consulted.

| Crew hours relative to draft | Delivered m³ | Waste m³ | Closing CAD | Checks met |
|---|---:|---:|---:|---:|
| 100% | 28,779 | 11,055 | 1,302,150 | 12/30 |
| 75% | 27,971 | 10,638 | 1,186,748 | 11/30 |
| 50% | 30,371 | 4,794 | 1,498,501 | 11/30 |
| 25% | 19,886 | 883 | 711,013 | 4/30 |

The 50% case demonstrates that the 30,000 m³ delivery objective is attainable in the default weather/seed scenario without modifying its coefficients. It improves total deliveries, waste and cash over 100% but meets one fewer commitment check. It is not an optimum, guarantee across weather scenarios, or evidence that all objectives can be met together. Raw results: `playthroughs/bc-harvest-pacing.json`. This supersedes the earlier unresolved feasibility question for this specific delivery target and scenario.
