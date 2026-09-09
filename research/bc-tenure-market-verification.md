# BC tenure and market integration verification — 2026-09-08

Implementation and source boundaries: [BC-TENURE.md](../forestry-game/BC-TENURE.md).

## Reproducible campaign comparison

From `forestry-game`, run `npx tsx scripts/bc-tenure-playthrough.ts`. The policy buys the two cheapest affordable private lots, submits applications/renewals for secured rights and their access spurs, uses half-effort penalty-aware drafting with commitment caps, and bids 140% of asking on one affordable auction per turn. It reads current state and published information only. Each completed turn is serialized and parsed again, and cash must reconcile with its ledger.

| Twelve-week run | Flat markets | Authored fuel/lumber cycle |
|---|---:|---:|
| Delivered m³ | 29,965 | 29,505 |
| Closing CAD | 1,201,745 | 1,179,308 |
| Stumpage paid CAD | 258,954 | 243,629 |
| Operator post-harvest provisions funded CAD | 73,587 | 73,587 |
| Applications/renewals | 13 | 13 |
| BCTS teaching awards | 5 | 5 |
| Outstanding closing provisions CAD | 0 | 0 |

The market path raises direct fuel-sensitive costs before adjustable stumpage changes. At physical week 7 its adjustable rate multiplier becomes 0.7445 using week-5 market signals. Earlier BCTS awards retain baseline rates; awards at or after the reset lock lower rates. Week-9 market recovery does not instantly reverse adjustable stumpage. Different transport work means total haul expenditure need not move proportionally to the unit fuel-cost index. These are policy examples, not optima, forecasts, or calibrated BC outcomes.

Raw output: [bc-tenure-market-comparison.json](playthroughs/bc-tenure-market-comparison.json).

## Browser checks

In an isolated local browser campaign:

- Loaded latest Prince George preset and explicitly started a new campaign.
- BC09 initially displayed required cutting authority; application became pending until turn 2 and approved after one operating week.
- Ran the campaign to week 7 with draft plans. Market indices visibly changed at weeks 3 and 5; adjustable stumpage changed at week 7 using week-5 evidence.
- BC08 showed expired authority after six physical weeks and current softwood sawlog stumpage CAD 8.93/m³. Renewal remained pending until turn 8 after reloading the page.
- Operator provision totals accrued after harvesting.
- Final desktop layout had document client width equal to scroll width (1265 pixels); tables use the existing scroll container styling.
- The development session recorded transient hot-reload failures while agents were adding dependent modules. The completed application reloaded and operated successfully; production compilation passed.

## Automated checks

The integrated full suite passed 371 tests in 99 files, with two opt-in extended tests skipped. Later focused checks cover final UI commitment caps and classroom disclosure changes. Tests exercise legacy region compatibility, missing/expired authorization, protected access, subweekly timing, Crown versus private costs, fixed awards, lagged resets, demand boundaries, no future market leakage, annual snapshots, linked carry-over, and classroom role permissions. Production build passed with existing large-chunk advisories.
