# Draft route-cache audit

The audit script `forestry-game/scripts/draft-performance-audit.ts` captured eight pre-change input games and exact output plans in `/tmp/forest-draft-baseline.json` before the engine edit. The baseline process imported the old engine before the parent changed it.

Cases cover untouched Québec and BC daily scenarios at turns 1, 7, 28 and 57. Each checkpoint applies its draft and advances; intervening turns advance without new orders. These sample forecast/position/inventory states, not a fully adaptive daily campaign. The same explicit settings apply throughout: commitment-aware dispatch and penalty-aware sales ranking.

Pre-change wall-clock draft timings in milliseconds:

| Region | Turn 1 | Turn 7 | Turn 28 | Turn 57 |
| --- | ---: | ---: | ---: | ---: |
| Québec | 94.0 | 141.3 | 150.8 | 258.7 |
| BC | 109.4 | 334.3 | 288.6 | 291.6 |

The comparison command is `npx tsx scripts/draft-performance-audit.ts --compare`. It must match every canonical plan exactly and records new timings in `/tmp/forest-draft-comparison.json`. This is a single-process sample, not a controlled statistical benchmark; no timing threshold is asserted.

Exact canonical output-plan parity passed all eight cases after the cache edit. The first direct timing comparison was discarded: its baseline used runtime object sharing, while raw JSON snapshots duplicate history geometry references, and another suite was running. Those numbers do not establish a regression or speedup.

A fairer paired comparison reconstructed only the uncached journey helper in a temporary module, used identical parsed snapshot inputs in the same process, alternated old/new call order between cases, and ran after the full routine suite ended. The temporary module was deleted. Both outputs also matched the original captured plans exactly. Command: `npx tsx scripts/draft-performance-audit.ts --paired`.

| Region / turn | Uncached ms | Cached ms | Ratio |
| --- | ---: | ---: | ---: |
| quebec-lac-saint-jean / 1 | 88.8 | 10.5 | 8.46× |
| quebec-lac-saint-jean / 7 | 164.7 | 67.3 | 2.45× |
| quebec-lac-saint-jean / 28 | 251.5 | 171.4 | 1.47× |
| quebec-lac-saint-jean / 57 | 309.3 | 223.7 | 1.38× |
| bc-prince-george-fsr-teaching / 1 | 107.1 | 22.9 | 4.68× |
| bc-prince-george-fsr-teaching / 7 | 389.6 | 134.5 | 2.90× |
| bc-prince-george-fsr-teaching / 28 | 688.5 | 612.4 | 1.12× |
| bc-prince-george-fsr-teaching / 57 | 844.0 | 909.0 | 0.93× |

The eight measured calls total 2843.5 ms uncached and 2151.7 ms cached (1.32×). This is one observation per case: late BC is slightly slower in this sample, and clone/history costs remain outside the route-cache improvement. It is not a statistical estimate or promise of universal speedup.

The full corrected daily integration baseline was **235.98 seconds**. The route-cache-only version passed the same two untouched 84-turn campaigns in **232.61 seconds** (232.05 seconds in tests), roughly 1.4% less elapsed time. This single observation does not establish a meaningful end-to-end speedup; the audit includes every-turn serialization, parsing and complete-history comparison, plus operations outside drafting.

After that run started, the private reservation projection was changed to copy only reservations, while retaining the complete clone for the returned game. A final comparison of this combined version passed all eight original canonical baseline plans exactly. The 232.61-second run held the earlier route-cache-only module and must not be attributed to the later projection change. The parent ran focused reservation checks and the routine suite separately; no final combined-version full daily timing is claimed here.

The `--paired` reconstruction removes only route caching from whatever source version is current. Running it after the projection change retains that change in both alternatives and measures only the route-cache difference. Temporary modules use exclusive creation (`wx`) and are deleted after use. The `--compare` output marks runtime-versus-JSON-snapshot timings as not directly comparable.



## Combined optimization sample

After the final routine suite/build ended, `npx tsx scripts/draft-performance-audit.ts --paired --combined` restored both the original uncached route helper and full reservation-projection clone in a temporary baseline module. Old/new versions used identical parsed snapshots in one process, alternating call order. Both matched all eight captured original plans exactly; the temporary module was removed.

| Region / turn | Original draft ms | Combined draft ms | Ratio |
| --- | ---: | ---: | ---: |
| quebec-lac-saint-jean / 1 | 80.3 | 9.1 | 8.83× |
| quebec-lac-saint-jean / 7 | 174.3 | 34.1 | 5.11× |
| quebec-lac-saint-jean / 28 | 245.1 | 63.3 | 3.87× |
| quebec-lac-saint-jean / 57 | 342.4 | 93.7 | 3.65× |
| bc-prince-george-fsr-teaching / 1 | 117.9 | 15.8 | 7.44× |
| bc-prince-george-fsr-teaching / 7 | 407.3 | 51.4 | 7.92× |
| bc-prince-george-fsr-teaching / 28 | 687.3 | 192.6 | 3.57× |
| bc-prince-george-fsr-teaching / 57 | 1072.0 | 297.9 | 3.60× |

The eight calls total **3126.7 ms original versus 758.0 ms combined**, or **4.13×** in this sample. Individual observations range from 3.57× to 8.83×. This measures the whole draft call on these snapshot inputs, not the entire campaign, and remains a single observational sample rather than a statistical performance guarantee. Final routine validation reported 255 passing tests across 66 files, two slow tests skipped, and a successful build.
