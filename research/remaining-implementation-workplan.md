# Remaining-mechanism implementation pass

## Dispatch scale continuation

The network lab now supports five companies, five vehicles and ten indivisible shipments over three weeks, with a two-/three-/four-/five-company case selector. Exact subset dynamic programming selects one feasible itinerary per vehicle and pays outside-service quotes for uncovered cargo. It preserves the existing two-shipments-per-vehicle-per-week policy, capacities, dates, position continuity and final depot returns; this is still a finite teaching exercise, not unlimited fleet routing or campaign inventory dispatch.

The five-company fixture matches the previous integer solver: CAD 10,934.0936 independent and CAD 9,967.0468 pooled, with all ten shipments served and no outsourcing. Eight focused network checks pass, including expanded exact coverage, hours and bounds. Production build passes. Browser controls generated and solved the expanded case, showed CAD 967.05 savings, and cancelled a repeat solve while retaining the previous result. Campaign week five, cash CAD 1,719,349 and delivered volume 23,872 m³ remained unchanged. No browser console errors were reported. The full regression suite passes: **100 tests across 21 files**, `npm test -- --maxWorkers=1`, 81.32 seconds on Node 26.7.0.

## Prior verified status

The follow-up run clears the earlier verification blockers: **98 tests across 21 files pass** (`npm test -- --maxWorkers=1`, 23.94 seconds), including linked-season regressions. Production build and server TypeScript pass. Both Docker images build and the localhost container integration test passes frontend delivery, API proxying, headers, controlled creation, authentication, origin rejection, and room persistence after replacing the backend container. Public TLS issuance still requires a deployment hostname.

Network solving now runs in a cancellable background worker, retaining the prior solution on cancellation/failure and terminating when its screen unmounts. Browser execution reproduces CAD 6,285.22 independent / 5,842.61 pooled / 442.61 saved, with no console errors. Campaign week five and cash remain unchanged.

Reproduce packaging checks with the commands in `forestry-game/deploy/README.md`. The notes below retain the earlier investigation history; their test-runner and Docker-unavailable limitations are superseded by this successful follow-up.

User scope: seasonal window builder, staged negotiation, procurement uncertainty, cooperative network scheduling, linked long-term management, classroom deployment/recovery and regional calibration preparation; independent agent playthroughs plus integrated checks.

In implementation:
- Seasonal 52-week categorical authoring/window selection with commercial demand/event alignment.
- Connected annual/operating forest, cash, rights and single growth clock.
- Server-private staged information experiment with actual offers and authenticated decisions.
- Full-engine paired procurement strategy trials with independent future samples and worker cancellation.
- Multi-company, multiweek constrained network scheduling, frozen allocation and decisions.
- Deployment packaging, controlled creation, invitations, recovery and backup/restore.
- Evidence manifest and staleness checks for regional calibration; official BC source references.

External boundary: no public hosting destination has yet been supplied. Reviewed BC geography/forestry/tenure/economic inputs have not been supplied by a qualified regional reviewer. Packages and review tooling cannot certify those missing inputs. Do not label an illustrative preset as calibrated.

## Implemented and exercised

All seven software workstreams above are now integrated. The regional evidence worksheet is in Scenario studio; seasonal selection and the annual bridge are in Stewardship; the network scheduling exercise is in Collaboration; paired uncertainty experiments are in Forest & timber. Classroom adds controlled creation, staged disclosures and recovery.

Independent programmatic agent playthroughs (not separate browser users):
- Operations: six shipments over three weeks, no outsourcing; CAD 6,285.22 independent versus 5,842.61 pooled; all three companies accepted CAD 442.61 measured savings.
- Classroom: three of five companies shared economics; one rejected offer, then unanimous agreement realizing 1,688 exercise units. Private unshared costs stayed hidden. Backup/restore and recovery rotation were exercised.
- Stewardship: three linked high-budget years with weekly save/reload, rights preserved, growth applied once per year, and a maximum packed save of 2,582,952 UTF16 bytes. Ordinary-budget play became insolvent after year two and correctly refused another season.

The playthroughs found zero-spend checks incorrectly blocking negative-cash outcomes. Operating advancement and annual settlement now allow those reports to finish; unfunded purchases and a negative-budget next season remain blocked.

Browser checks against the existing week-five campaign verified evidence and stewardship screens, solved the network case with the same CAD 442.61 saving, and completed eight procurement simulations (two paired futures × four policies) with zero failures. The D3 cash-distribution chart was visually inspected. The campaign week and cash were preserved.

Production build and server TypeScript check passed. Compose configuration validates; local API health returns 200. Docker daemon was unavailable, so image builds and public TLS issuance remain unverified. Public hosting requires a destination. BC inputs remain explicitly unreviewed; source pointers and review fingerprints do not substitute for local calibration.

The network exercise is exact only within its stated three-vehicle/six-shipment/three-week policy and remains separate from campaign inventory. The private disclosure experiment uses generated exercise economics, separate from the public handout coalition game. The 52-week access cycles and annual ecology are labelled teaching assumptions.

Verification environment note: the initial consolidated Node 26 run completed all three geographic campaigns' conservation checks but exceeded their 60-second per-case deadlines (107, 84 and 194 seconds), then stalled while loading additional test workers. Those runs are not counted as passing. Full-season tests now allow five minutes on a busy shared host. A Node 24 rerun is used to match the deployment runtime. Focused agent checks and browser experiments are reported separately from the consolidated suite.

Final integrated verification limitation: both Node 26 and Node 24 consolidated runs stalled or timed out at worker startup/termination. The final focused rerun also stalled and was stopped. There is no passing consolidated test count for this pass. Independent agents reported their focused tests passing before final integration; the production build, final application TypeScript check, server TypeScript check, local API health, Compose configuration and the browser exercises above completed successfully. A clean full-suite run and container/TLS exercise remain outstanding verification work.

The final focused runner did return partial results while stopping: **17 tests passed across five files**, with **one unhandled worker-start timeout for season-calendar.test.ts**. This is partial verification, not a green run. The linked-season mechanism has separate agent playthrough evidence, but its final integrated regression file still needs a successful runner execution.
