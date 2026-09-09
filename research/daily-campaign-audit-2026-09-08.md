# Daily campaign integration audit

`src/simulation/daily-campaign.test.ts` exercises seven decisions per physical week over the full 84-turn Québec and Prince George horizons.

The routine suite includes two controlled overlays on the actual regional road graphs. Both require actual harvesting, delivery, reciprocal exchange, royalty expense, processing, finished-product sales and byproduct transfers. Every turn checks forest mass conservation, each mill's received/input/output/sold/transferred/residue mass identity, full cash-to-ledger reconciliation, truck-hour budgets and reload through the real compressed save format. Both pass. An idle full daily campaign additionally verifies JSON's expected normalization of negative-zero ledger amounts without changing cash.

The untouched regional scenarios use adaptive drafts every turn, published forecast planning and actual weather realization. These CPU-intensive audits are opt-in:

```sh
FOREST_SLOW_INTEGRATION=1 npx vitest run src/simulation/daily-campaign.test.ts -t 'unmodified regional'
```

The first slow run reached Québec turn 84 and BC turn 77 before strict deep equality of in-memory versus JSON-restored history failed. The values had no visual difference. A focused reproduction confirms that zero-valued terminal charges can be `-0`, while JSON represents them as `0`. This is not a cash or material discrepancy. The reload assertion now compares with the canonical JSON representation, while finite numeric data remain validated by `parseGame`. The corrected slow run passed both untouched regional campaigns: all 84 turns each, actual harvesting and delivery above 100 m³, forest mass and cash reconciliation, crew/truck hour bounds and canonical history reload equality every turn. Vitest elapsed time was **235.98 seconds** (235.36 seconds in tests). Each test permits 300,000 ms; the combined run is below even one test’s limit. The default reporter did not emit individual passing-test timings. The earlier failing audit measured Québec at 59.987 seconds and BC at 144.531 seconds, which motivated raising the prior 120-second timeout. No engine changes were made for the serialization distinction. The routine subset passes three tests in 9.29 seconds, with the two slow cases skipped unless explicitly enabled.

Limits: the controlled overlays isolate optional-mechanic interaction, rather than calibrating real operations. Passing conservation is not a claim that the draft is profitable or optimal. Daily travel still uses the declared per-turn hours and existing completed-trip policy; the test does not introduce multiday in-transit movements.
