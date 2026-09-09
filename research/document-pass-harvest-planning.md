# Document-backed additions: harvest planning and allocation

Source review used the existing extracted text alongside the source inventory. Original source documents remain unchanged.

| Source | Teaching requirement | Implemented behavior |
|---|---|---|
| IntroHarvestArena_3video_Photo-very-small.pptx, slides 13–15 and 23–24 | Find suitable contracts by volume, product mix, bearing capacity and productivity; compare nearby sites | Production site finder with crew, product, minimum product share, m³/h, eligible volume, destination demand, route/terrain access and relocation sorting. Map drill-down and append-to-queue action use real current game state. |
| Same slides, 25 | Two-week planning in uncertain seasons, up to four weeks in stable periods | User-selected two/four-week access view and rolling forecast. No claim that four weeks are reliable merely because selected. |
| Same slides, 26 | Reduce relocation km per 1,000 m³ by clustering suitable sites | Per-week relocation intensity alongside capacity utilization and authored disturbance intensity. Zero production yields no ratio instead of division by zero. |
| Same slides, 16–18 | Match production planning with mill/assortment requirements and revisit plans | Destination filter checks product acceptance, remaining current-month demand, known mill closure and open road route. Rehearsal shows future consequences; actual simulation remains separate. |
| d-amours-rönnqvist-2013-an-educational-game-in-collaborative-logistics.pdf, allocation discussion around equation 7 | Compare weighted cost allocations and core stability | Volume-weighted total coalition cost, converted back to individual savings for existing efficiency, rationality and core checks. This deliberately differs from dividing savings by volume. |
| Collaboration_4companiesEN.docx and Collaboration_5companiesEN.docx, Table 1 | Company volumes and average distances provide negotiation context | Dataset-specific company profiles and computed standalone SEK/m³. Four-company C1/C2 volumes are 77,300/301,300; five-company values are 77,360/301,660. |

## Model boundaries

Rates remain in m³/hour because the current engine uses hours; no daily shift length is invented to reproduce slide examples. Site travel is from the crew's current location, not an assumed future queue endpoint. Appending allocates remaining hours and does not erase prior stops. A chosen mill filters suitable supply; it does not silently bind or execute truck deliveries.

Rolling rehearsal assumes the published forecast occurs, repeats current queues as completed stops drop out, makes no new acquisitions and excludes all bids. It removes disruptions not yet revealed at the start of the rehearsal. Next-month commitments use the engine's existing full-demand defaults. Results are marked stale after a plan change and cleared when changing horizon.

The five-company volume rows sum to 795,190 m³, while the handout prints 795,200. Calculations use individual rows; sources are not altered. Weighted total costs can generate negative savings, which remain visible and fail proposal submission under the existing individual-rationality rule.

## Verification

Focused checks cover queue order/hours, ownership, known closures, forecast isolation from actual weather/seed, exclusion of auction payments, demand saturation, relocation ratios and the weighted-cost allocation's loss/core consequences. All 60 tests pass, including the demand-saturation regression. Production build and server type checks pass. Browser interaction verification for these new controls is blocked by the locked Mac; prior browser evidence does not cover this pass.

## Remaining source-supported work

- The VWSA abstract describes selecting a twelve-week window from four 52-week annual weather cycles. Current presets are twelve-week schedules; a calendar-window authoring workflow remains to be implemented with clearly labelled climate assumptions.
- The collaboration paper discusses staged disclosure and information sharing. Rooms have private roles/bids, but the instructional disclosure sequence is not yet a complete paper-equivalent experiment.
- A richer planning chart could retain distinct future weekly crew orders. The current rolling rehearsal repeats today's queues and does not claim to be that scheduling chart.
- The procurement thesis's research-equivalent stochastic optimal bidding model remains beyond the published-range risk comparison.
