# Usability and playthrough review — 23 September 2026

Fresh-clone setup, browser playthroughs of every starting case at desktop (1440×900) and phone (390×844, touch) sizes, a local classroom round, and a cross-check of the game against the supplied reference material. Driven with headless Chromium (Playwright). Physical phones were not used.

## Setup

`npm ci`, `npm test`, `npm run build`, `npx tsc -p tsconfig.server.json` and the GitHub Pages build (`VITE_BASE_PATH=/forest-commons/ VITE_STANDALONE=1`) all succeed from a clean checkout. After this pass: 442 tests pass, 2 optional skips. The production build still reports the known large-chunk advisory.

The uploaded archives (`Archive.zip`, `Archive_2.zip`) match files already in the repository; only Unicode filename normalisation differs.

## Full-season playthroughs (draft plan every week, no purchases)

| Case | Weeks | Closing cash | Delivered | What a player sees |
|---|---|---|---|---|
| Lac-Saint-Jean, Québec | 12/12 | CAD 2,778,743 | 48,868 m³ | Secured lots are cut to the retention floor by week 10; weeks 11–12 harvest nothing and month 3 misses 10/10 commitments (CAD 374k shortfall charges). |
| Prince George FSR pilot | 12/12 | CAD 877,377 | 18,953 m³ | Weeks 6–12 are idle. BC09/BC10 still hold ~2,100 m³ each but need a cutting-permit application that the draft never makes. |
| Prince George guided lesson | 12/12 | CAD 160,545 | 4,369 m³ | Completes; thaw weeks idle as authored. BC09 also waits for an authorization. |

Buying a private lot, placing a sealed bid, losing to a rival, applying for a BC harvest authorization, and three weeks played entirely through the phone Plan tab all worked. The classroom server round (create room → issue purchase/production/transport credentials → three phone-sized players join → all ready → instructor advances → players see week 2) also worked.

The draft planner deliberately does not buy timber. Before this pass the results screen did not explain the resulting idle weeks; week 11 in Québec reported that no issues were detected.

## Fixed in this pass

- **Phone first visit:** the map workbench scrolled past "Choose your starting case" before a case was picked.
- **Phone map framing:** the map opened at the desktop zoom, so both Québec clusters sat off the edges of a 390 px frame. The first view now fits all stands and mills above the inspector sheet. It refits as the frame resizes (the case chooser collapses it) until the player pans, zooms or uses a fit button. It no longer waits for MapLibre's `load` event, which never fires while basemap tiles are unreachable.
- **Debrief — secured timber exhausted:** the latest turn now explains when secured lots have less harvestable volume than one average turn of harvest and the turn was idle or missed commitments. It points to buying or bidding and to lowering next month's commitments.
- **BC authorizations:** the overview callout now names the secured lots waiting for a harvest authorization, and its button selects the first one. The debrief lists the same lots. English and French are both covered.
- **Readiness noise:** every drafted haul was flagged "Review · 0 m³ now" because roadside stock is empty before same-turn harvest. The check is now ready when this turn's crew plan cuts the site, and still warns when no crew does. A typical draft review drops from 10 findings to 0.
- **Closed auctions:** a lost or un-bid auction lot kept showing a disabled bid field and "Successful lots available next week". It now shows the recorded outcome (for example "Auction closed · Q21: rival bid 51431 won.").
- **Classroom entry:** students had to scroll past the instructor group monitor and room-creation controls to reach "Join assigned role". Joining now comes first, and the instructor tools are grouped below it.
- **Collaboration page order:** the source-backed four/five-company laboratory now leads, and the generated eight-company round follows the campaign desks.
- **Small copy fixes:**
  - The pre-season positioning panel collapses once it is closed.
  - The toolbar reads "Season complete" instead of a disabled "Run week 12".
  - Supply types are capitalised in the tables.
  - The procurement budget is rounded to whole currency units.

## Reference-material check

Coalition costs (15 four-company and 31 five-company entries), distances and volumes match the handouts. Allocation methods reproduce the Frisk et al. (2010) three-player EPM (3, 5.25, 3.75) and nucleolus (3, 5.5, 3.5) results. The corrected five-company singleton sum 38,680 / savings 2,990 is right; `CollabEnglish-5companies.xlsx` prints 38,690 / 3,000. MaterialToPrint sheets map onto the in-app packets.

Corrected here:

- The field guide now says poplar downgrades as well as sawlogs.
- The collaboration lab's volume note now says that the French printed map sheet, like the four-company handout, uses 77,300 / 301,300 m³ for C1/C2.
- `forestry-game-review.md` no longer says volume weighting is unimplemented.

These follow the sources but are optional, not the Québec default:

- BidGame's per-m³ royalty payment exists as the `harvest-royalty` option; Québec defaults to upfront payment.
- Interest on a negative budget is set only in the BC lesson.

## Still open or not verified here

- Physical phone touch, native file pickers and printing. Headless rendering here was also unreliable once the basemap style failed to load through the proxy, so the phone map fit was verified from camera values rather than screenshots.
- **Classroom readiness races:** when two roles mark ready within the same refresh, the second is rejected as a stale revision ("Room refreshed… try again"). This is the intended revision check, but it will be common in a real class. Consider accepting a readiness-only change against an unchanged plan.
- Every phone planning screen opens with the same four KPI cards before its own content.

## Follow-up: message numbers and map interaction

**Message numbers.** Auction outcomes now read "Won Q21 for CAD 47,200" and "Q21: rival bid CAD 51,431 won". The ledger lines for royalties, partner cargo, processing, transfers and reciprocal sales now group thousands and use one decimal. French display reformats captured amounts, for example "51 431 CAD" and "1 234,5 m³". Messages in older saves still translate unchanged. Debrief headline totals are whole numbers.

**Map at different zooms and on touch.** Screenshots in this headless environment leave part of the WebGL canvas stale, so the map was checked from direct canvas captures.

Before this pass:

- Stands were drawn only as their outlines, a few pixels wide at district zoom, so on a phone only the 12 px text label could realistically be tapped.
- Every stand label was drawn, so labels overlapped heavily at the fitted phone zoom.
- Mill and fleet icons stayed 32–36 px at every zoom, so zooming out produced one blob.
- Each layer handled its own clicks, so the top layer won and overlapping features were unreachable.

Changes:

- Each stand has a dot marker in its supply colour; the selected stand's dot is larger and outlined.
- Taps use a 14 px touch radius, or 5 px with a mouse, and are resolved in one map handler. A tap that covers several stands, mills or vehicles lists them in the sheet ("2 features here · choose one"). A single hit opens that feature, and roads are chosen only when nothing else is under the finger.
- Phone sheet:
  - Tapping empty map lowers the sheet to a header-only peek, so the whole map is visible.
  - Tapping a feature, or the header, raises it to half height, scrolled to the top.
  - The header names the feature type and name, for example "Truck · Truck 1" or "Q01 · Mistassini 1".
- Stand labels are decluttered after every pan and zoom. The selected and planned stands are placed first, and labels that would overlap them are skipped.
- Below the region's authored zoom, equipment icons shrink to as little as half size, and the small status tags are hidden.
- The initial phone fit keeps icons clear of the sheet.
- Crew and truck locations name the mill or stand instead of a road-node ID.

Tested with touch taps: empty map → peek; stand cluster → chooser → chosen stand; truck icon → truck sheet. Desktop clicks, and zoom levels from 1.5 below to 3.5 above the fitted view, were also tested. Physical-device gestures remain unverified.
