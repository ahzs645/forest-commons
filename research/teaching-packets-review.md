# Teaching materials implementation and source review

Reviewed 8 September 2026.

## Source evidence

- Visually inspected the source images extracted from `IntroHarvestArena_3video_Photo-very-small.pptx`: slide 6 image 8 shows the real-map operating layout, coloured bearing classes, equipment movement distance labels, production targets and four-week cumulative delivery curves. Slide 24 image 18 shows terrain and assortment/productivity comparisons; slide 25 image 19 shows the regional access calendar; slide 28 image 25 shows equipment location among coloured operating sites. These are embedded slide images, not a full rendered deck review.
- Visually inspected all five Figure 1 company maps in `Collaboration_5companiesEN.docx`. Verified XML relationship order is C1 through C5, matching Figure 1. The first four images are byte-identical in the four-company handout.
- Green polygons depict supply and red circles receiving industries, per the figure caption. Qualitative geography descriptions do not infer unprovided routes, precise regional coordinates or live capacity from these pictures.
- Table 1 variants remain distinct: four-company C1/C2 volumes 77,300/301,300 m³; five-company 77,360/301,660 m³. Five-company individual volumes sum to 795,190 m³, versus printed 795,200. Cost arithmetic uses 38,680 kSEK standalone and 35,690 kSEK joint, yielding 2,990 kSEK savings.
- Source assignment: Round A permits pairs and singletons, Round B any coalition size. One company belongs to one coalition. Worksheets retain per-company savings and agreement records.

## Implemented

- `TeachingPackets.tsx` and `teaching-packets.ts`: self-contained downloadable HTML role cards, separate round worksheets, and debrief with selected-dataset recorded offers and acceptance status. Role cards embed the source-map images. Files can be printed or saved as PDF from a browser. No external scripts or image requests are needed.
- `company-explanations.ts`: qualitative map interpretation with explicit separation from the Québec/BC playable maps.
- `TeamComparison.tsx`: service hits/checks, actual crew movement kilometres, measured joint partner savings, and latest agreed company allocation. kSEK handout savings remain separate from campaign currency. Missing metrics in older packets display as unavailable, not zero.
- `classroom-learning.ts`: backward-compatible optional metrics with import validation. Fixed the results board showing linked annual year one as year two.

## Verification and limits

- Eight focused tests pass across packet generation and classroom records. Tests check variant figures, dataset filtering, HTML escaping, optional metric round trips, old packets and rejection of impossible service counts.
- Production build passed before the French addition and source images are lazy-split. Final French changes have focused tests and TypeScript checks; root runs the integrated production build.
- Isolated Chrome browser at port 5178: five source images loaded, English five-company roles and four-company worksheets downloaded, downloaded role file rendered, and French controls/role HTML verified. A 390px viewport exposed cramped two-column cards, fixed with an independent responsive grid; cards now measure 328px wide and document width equals scroll width (390px). TeamComparison shows current no-settlement status and its additional columns, with no page overflow at phone width. Actual paper/PDF pagination has not been visually checked. Source media remain supplied educational content, not newly licensed map data for unrestricted distribution.
- The original geographical screenshots are visual evidence only. Their underlying optimized routes and raw spatial datasets are not supplied; no claimed reconstruction of those exact routes.

## French exports

Packet language follows the selected UI locale. Full role, round and debrief instructions, profile descriptions, offer statuses, headings, captions and number formatting are authored in French. Original source filenames remain unchanged. Download filenames include the locale. Screen tables scroll within the packet at narrow widths, while print styles retain full tables.

## Full teaching interface French acceptance (2026-09-08)

Localized CollaborationLab, TeamComparison, StewardshipLab, Debrief, SeasonBuilder, DisclosureDesk, StewardshipCharts, CoalitionCharts, NegotiationOffers and PartnerComparison through the shared language provider. Added full authored French results explanations and exact translations of built-in Quebec/BC stewardship notes and teaching-calendar provenance; custom regional prose remains unchanged. Static audit found no unwrapped alphabetic JSX text in these ten components and no missing literal translation keys. The focused render/export/results suite passes 11 tests in three files.

An isolated Chrome session on port 5178 verified French collaboration costs, allocation explanations, negotiation and partner comparisons, then opened and started the annual stewardship exercise. Actual annual controls, regeneration statuses, budget and built-in model caveat rendered in French. The isolated shell was an earlier RegionalApp snapshot and is not evidence of current whole-app translation coverage. Earlier packet desktop/mobile and downloaded HTML checks above remain applicable. No user port 5173 interaction or campaign changes occurred. Print pagination was not verified.

## Populated debrief audit

Added a 50-offer history produced through the actual propose/respond functions, including agreed, rejected, superseded and partially accepted records, alternating a grand coalition with a three-group partition. The export test checks every offer ID, every company share, each coalition partition and the exact acceptance list in English and French, while preserving negotiation state. A concrete omission was fixed: debrief tables now include the offer's coalition partition, so allocation comparisons retain the grouping that generated the savings.

For print, table columns now use fixed layout and cells wrap long values anywhere; repeating table headers and row break avoidance remain in place. The table wrapper permits screen scrolling and removes scroll clipping in print. Long histories may span multiple pages. Actual PDF pagination and physical print output have not been verified; this check establishes complete exported records and reviewed overflow rules, not a guaranteed page count.

Follow-up PDF verification supersedes the preceding pagination limitation for this fixture: rendered the final 50-offer five-company packets in headless Chrome, English and French, with their authored A4 print rules. Each produced three pages. Visually inspected all six rendered pages: repeated column headers, complete unsplit offer rows and source footer, with no visible clipping or overlap. PDF table extraction confirmed offer IDs 1–50 exactly once and in order (12, 22 and 16 rows on pages 1–3). Character bounds remained within the 14 mm page margins. Results are recorded in `research/populated-packet-print-qa.json`; PDFs are in `output/pdf/populated-debrief-en.pdf` and `output/pdf/populated-debrief-fr.pdf`. Fixed column layout and arbitrary word wrapping are scoped only to debrief tables, preserving role/round pagination rules. Final focused suite: 4 packet tests passed; TypeScript build passed. Physical printers and non-Chromium pagination remain unverified.
