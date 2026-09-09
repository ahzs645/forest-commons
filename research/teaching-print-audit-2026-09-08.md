# Teaching packet print audit — 2026-09-08

Rendered the application's `teachingPacket` HTML generator through installed Chromium's PDF print engine with its A4 print stylesheet and source company images. Covered both datasets (four/five companies), all three packet kinds (roles, rounds, debrief) and both languages: twelve variants. PDFs were QA intermediates; the application continues to export self-contained printable HTML.

## Defect and correction

The original five-company Round B worksheet left its final checks and source note alone on a nearly empty third page. The generator now keeps each round's agreement table, total checks, notes and source together in an unbreakable agreement block. Its heading identifies the round, so the separate page is understandable. Table headers repeat across page breaks, and headings avoid separation from the next content.

## Expected pagination after correction

| Dataset | Roles | Rounds A/B | Debrief without offers |
| --- | ---: | ---: | ---: |
| Four companies, English/French | 4 pages | 2 pages | 1 page |
| Five companies, English/French | 5 pages | 3 pages | 1 page |

The three-page five-company worksheet comprises Round A, the Round B coalition reference table, and the Round B agreement page. It does not discard any coalition to reduce page count. Role cards retain the source maps and distinct four/five-company numerical values. Printed source-table units remain kSEK, separate from game CAD.

Eight focused teaching/localization checks and the TypeScript/Vite build pass. A representative rendered agreement page is retained at `evidence/teaching-round-b-agreement-fr-2026-09-08.png`. `forestry-game/scripts/print-packet-audit.ts`, run from the game directory with tsx, regenerates the twelve HTML fixtures under the parent `tmp/pdfs` directory.

This checks standard Chromium A4 output, not a physical printer, alternate paper sizes, Safari PDF export, or arbitrarily long recorded-offer histories. Independent read-only review results follow below.

## Independent review result

A separate agent reviewed all twelve PDFs, totaling 32 pages. The word-bounding-box audit found zero words outside page boundaries. Text/page-boundary checks found the expected closing notes and source information. Visual inspection of five-company French Round B page 2, five-company French debrief page 1, and four-company English rounds page 2 found readable tables and no clipping, overlap or orphan content. The current debrief fixtures contain no saved offers; long populated histories remain outside this pass.
