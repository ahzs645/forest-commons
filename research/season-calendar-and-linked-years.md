# Seasonal calendars and connected management years

This is an authored teaching workflow. Its Québec annual categories and commercial periods are not locally calibrated climate, access, yield or demand forecasts. British Columbia still needs licensed regional geography and local parameter review.

## Calendar semantics

A regional `seasonCalendar` holds 52 categorical forecast/actual access weeks per weather scenario and zone, thirteen four-week demand periods per mill, calendar-dated disruptions, and provenance. The Québec adoption action creates explicitly illustrative winter/thaw/summer/autumn categories, retains the original 12-week exercise categories at weeks 13–24, repeats the source commercial-demand exercise across thirteen periods, and anchors original disruptions to calendar week 13.

A player reviews a start week 1–52 and launches exactly twelve weeks. Access wraps modulo52. Four consecutive calendar-week demand shares are summed into each of the three operating settlement periods. Thus a settlement period crossing a source-period boundary combines both periods rather than mislabelling an entire month. Already active disruptions carry in; events starting inside the window carry in; end/reveal dates are clipped to the window. Auctions and partner offers remain campaign-relative fresh teaching offers. These are explicit instructional choices, not an attempt to forecast commercial timing.

## Linked clock, resources and money

A linked year owns one twelve-week operating window followed by one annual growth/recovery step. The following operating window belongs to the next management year. Windows may cross calendar year boundaries, but a subsequent start that would overlap the previous twelve-week interval is rejected; choose a later start or advance an annual rest year. The annual state is frozen while operations run. The season cannot launch twice, cannot settle early, and cannot settle twice.

The opening seasonal stand volumes come from annual standing volume. Previously secured rights remain secured; annual harvest cooldowns temporarily withhold operating access without extinguishing ownership. New rights secured during operations join the annual management set. Road improvements, resource locations and cash carry into the next window. The operating region's initial timber and cash are rebased to those actual balances so ordinary weekly save checks remain applicable.

Settlement records actual operational timber removals and the net operating cash movement, then runs annual growth exactly once. It does not pay annual harvest revenues for timber already sold during operations. Habitat removal effects and cooldown/regeneration resets follow actual treatments. Harvested areas do not receive a rest-year habitat recovery increment. Reported annual timber obeys opening + growth − harvest = closing.

Unshipped roadside stock does not become standing timber. It is explicitly recorded as off-season roadside write-off; no additional cash charge is invented beyond the settled campaign's terminal charges. Initial carry-in roadside stock from a pre-link campaign is likewise included in the first linked record. With the simplified long off-season, batches do not carry as marketable inventory into a new year. This assumption is disclosed before launch.

The annual teaching model still omits species, tree age classes, climate dynamics, mortality, spatial habitat, legal tenure rules and external capital/financing. Rest/plant/harvest annual actions outside an active window each advance one complete management year. Negative closing operating cash can be recorded in a linked annual ledger; launching another season requires a nonnegative opening budget.

## Validation and evidence

Focused tests exercise year wrapping, demand alignment, event clipping, prevention of duplicate/early transitions, a complete season, annual mass/cash balance, carried rights/cooldowns, and save/reload of the next operating year. Integration verification is recorded separately by the root task.


## Executed linked playthroughs

`research/playthroughs/stewardship-linked-seasons.ts` runs calendar starts13,40,52 with thinning in every forecast draft and real save/parse every week. With a separately labelled CAD3,000,000 opening-budget fixture, all three operating years completed. Closing cash was CAD3,124,453.68 / CAD2,026,093.68 / CAD919,930.68. All ten secured rights persisted; annual cooldowns closed all ten in years2–3. Growth was exactly2,640m³ once per annual settlement, not once per operating week. Maximum packed save footprint was2,582,952 UTF16 bytes, below the4,000,000 browser-budget check.

The ordinary starting-budget strategy becomes insolvent in year2 because it retains fleet/commitment costs while all owned harvest stands cool down. Negative cash is recorded through settlement, and the next operating window is refused until there is a nonnegative budget. This is a strategy failure, not an assertion that every linked conservation plan is financially feasible.

Two real boundary defects were found during these runs: zero auction commitments were incorrectly compared against negative operating cash, and zero planting cost was incorrectly compared against negative annual cash. Both gates now apply only to positive proposed spending; negative equity can reach its report without granting new credit or waiving actual costs.
