# BC tenure, authorizations and market exercise

The latest Prince George preset includes a BC-specific teaching policy. Start a new campaign from Scenario studio to use it. Existing saves retain their embedded region and do not silently acquire new obligations, costs or permissions.

## What the player controls

- BC01–BC10 represent an existing forest-licence case. Crown timber is subject to explicit stumpage even though the opening rights cost nothing to acquire. BC09 and BC10 require an application before harvest; BC08's initial authorization expires after six physical operating weeks and needs renewal.
- BC11–BC17 are fictional private-land purchase cases. They have owner-consent conditions and no Crown stumpage. Their real inventory polygon geometry does not establish private ownership.
- BC18–BC23 represent BCTS sale cases. An auction secures the teaching right; the player then requests the Timber Sale Licence authorization and associated access-road authorization. The model does not insert a second cutting-permit requirement for these sales.
- BC24 is protected and cannot be authorized for harvest.

The tenure desk is available in purchasing, planning, production, transport and reports. Harvest requests belong to the classroom purchase role; road requests to transport; operator obligation funding to production. The instructor may perform these actions. Applications reset planning readiness and survive server restart and campaign export/import.

Initial FSR use permissions are approved in this pilot; auction spurs require road permission. Permission and physical access are independent: an approved road can still be closed by weather or a washout. Shared operating routing applies the authorization filter to ordinary, cooperative and intermill transport, fleet positioning and network comparisons. Standalone freight exercises do not incur timber acquisition or stumpage costs because they do not harvest campaign timber.

Applications use authored delays in physical operating weeks, including daily/subweekly campaigns. These delays are not government service standards. Approval in the game does not represent a real decision, actual permit issuance, or completion of consultation. The playable areas assume upstream land-use and consultation prerequisites have been addressed in the fictional exercise.

## Timber costs and obligations

The baseline Crown teaching rates are CAD 12/m³ softwood sawlogs, 3 softwood pulp, 8 hardwood sawlogs, 2 hardwood pulp and 2 poplar. They apply to the actual harvested product mix. These are not official BC rates, a scaling table or a calibrated Interior appraisal.

Private purchases and auction sale premiums are paid upfront. The generic legacy harvest-royalty switch does not add a second royalty to a BC tenure campaign. The sale premium is a simplified exercise term; it is not a complete implementation of BCTS bonus bid/bonus offer payment rules.

Harvest creates separate post-harvest financial provisions. Regeneration surveys and establishment monitoring cost an illustrative CAD 2/m³; operator site close-out, road work and reporting cost 0.75/m³. BCTS is assigned reforestation/monitoring in the BCTS case; the owner carries private-land monitoring; the operator carries monitoring on the forest-licence case. Only operator provisions reduce the player's cash. Funding a provision does not certify that field work occurred. Remaining provisions are settled at campaign end so they cannot disappear from the score by delaying payment. Operator monitoring excludes planting, whose annual treatment cost remains separate.

Annual stewardship itemizes stumpage and operator provisions rather than hiding them in net teaching returns. Its independent thirty-year abstraction holds the opening authorization and published-rate snapshot; it does not forecast thirty years of permits or commodity prices. Linked operating windows preserve rights, fixed award rates and provision balances; they avoid charging already funded obligations twice. Finite permits require renewal between management years.

## Market flow and timing

The market module distinguishes three clocks:

1. Fuel and lumber market changes affect operating margins when revealed.
2. Adjustable Crown teaching stumpage resets at specified boundaries using lagged market information.
3. Harvest charges are paid in that operating turn. Separate scaling, invoice issuance and receivables delays are outside this exercise.

The default path starts at indices of 1. At physical week 3, delivered fuel rises to 1.35. At week 5, lumber falls to 0.85 and demand to 0.90 while fuel remains high. At week 9, fuel falls to 0.90, lumber recovers to 1.10 and demand to 1.05. Events become public at their effective week. Fuel affects 25% of direct harvest costs and 35% of per-km hauling costs. These fractions are scenario assumptions. Changes in demand apply at commercial-period boundaries.

The synthetic competing-bid index responds positively to lumber value and demand and negatively to fuel expense. Offered BCTS areas and physical timber volume remain authored and finite. The model does not assume oil prices automatically determine BCTS harvest output, or that one player's bid resets industry prices.

Adjustable teaching stumpage first resets at physical week 7, then every 13 weeks, using a two-week information lag. The twelve-week campaign is thus positioned across a reset boundary. The coefficient weights, lag and offset are illustrative; this is not the Ministry's Market Pricing System regression. BCTS teaching rates lock at award while adjustable forest-licence rates can change. Future unrevealed shocks are excluded from forecasts and strategy experiments.

## Official source basis and boundaries

Sources checked on 2026-09-08:

- [About BC Timber Sales](https://blog.gov.bc.ca/bctimbersales/about-bc-timber-sales/): BCTS is part of the Ministry of Forests; auctions inform the Market Pricing System, and BCTS has forestry and reforestation responsibilities.
- [Timber Sale Licences](https://www2.gov.bc.ca/gov/content/industry/forestry/bc-timber-sales/tsl): registration and sale opportunities.
- [Forest Act, Part 3](https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96157_03): distinct tenure and decision-maker roles, sale terms and waste-assessment obligations. The version inspected states current to September 1, 2026.
- [Cutting permit and road tenure administration](https://www2.gov.bc.ca/gov/content/industry/forestry/forest-tenures/timber-harvesting-rights/cutting-permit-road-tenure-administration): CP, RP and industrial FSR road-use permit distinctions.
- [Stumpage](https://www2.gov.bc.ca/gov/content/taxes/natural-resource-taxes/forestry/stumpage): reported volumes, species, grades and applicable rates determine charges.
- [Interior appraisal parameters](https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing/interior-appraisal-parameters): published monthly inputs include lumber market values, CPI, exchange rates, harvest volume and BCTS adjustment factors. Input publication frequency is not a universal rate-reset schedule.
- [Interior timber pricing](https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing): actual manuals, licence terms and applicable amendments govern fixed/adjustable rates and exceptions. No live manual coefficients were imported into this exercise.
- [Stumpage payment](https://www2.gov.bc.ca/gov/content/taxes/natural-resource-taxes/forestry/stumpage/pay): billed balances are due immediately; the game does not assume an interest-free provincial credit period.

Actual waste surveys, scale/cruise billing, species/grade schedules, official appraisals, deposits, consultation decisions, operating-plan approval, silviculture completion certificates and real permit conditions are not reproduced. The game now teaches explicit responsibilities and their operational/economic consequences, but it is not an operational authorization or compliance system.
