# iOS Safari mobile audit — 2026-09-08

Tested the current Vite app at http://127.0.0.1:5173/ in Safari on a dedicated iPhone 17 / iOS 26.5 Simulator named Forest Commons Safari QA. Simulator UDID: 7F3CA1D6-23FB-4E6E-9464-26B5E896676F. This is real Safari/WebKit in Simulator, not physical-device evidence.

## Defects fixed

- The language selector was inserted ahead of a two-column mobile toolbar and pushed the campaign context into a 36px column. Explicit grid areas now position navigation, campaign context, language and actions. The compact layout responds to workspace widths up to 900px, covering the crowded landscape layout as well as portrait.
- Focusing the crew-hours input triggered Safari automatic zoom and clipped the form horizontally. Touch-device text inputs, selects and textareas now use 16px text and at least 44px height. User zoom remains enabled. A fresh tab verified that focus keeps the form within the screen.
- Built-in zone names in forecast and related charts now use the existing translation catalog. French forecast columns show S2/S3 rather than W2/W3; subweekly columns use the translated turn initial.

## Observed workflows

- Geographic basemap, regional roads, stand/facility/fleet icons and planned routes rendered.
- Draft plan generated visible route overlays. Run-week review dialog opened and confirmed successfully.
- After week 1, header showed week 2/12, CAD 1,011,784 and 6,475 m³ delivered.
- Switching to French translated toolbar and map controls. Reload preserved language, week and reported totals.
- Mobile drawer opened; selecting Reports closed it and displayed populated cash, deliveries, roadside inventory and contribution-report content.
- Returning to the map worked. The selected-feature action scrolled to linked role controls; expanding the stand showed stock, remaining volume and crew assignment controls.
- Crew-hours focus after the fix remained at the normal page scale, with the entire input and action button visible.
- Landscape displayed the role/forecast table and, after the intermediate-width fix, the full campaign name and totals. Returning to portrait retained the usable map and toolbar.

## Evidence and validation

- `evidence/safari-portrait-2026-09-08.jpg`
- `evidence/safari-landscape-2026-09-08.jpg`
- `evidence/safari-crew-input-2026-09-08.jpg`
- Seven focused localization/map-workbench tests passed; final TypeScript/Vite production build passed. The previous full simulation suite remains 255 passing tests; this UI pass did not rerun the entire suite.

## Boundaries

This was a core Safari interaction pass, not every role/mode or a full Safari campaign. It did not verify physical-device performance, downloads/printing, every keyboard entry, VoiceOver, all map gestures or live classroom networking in Safari. Initial Simulator boot/open timeout and a mistyped automation URL were tooling issues; exact simulator URL opening loaded the game. The separate simulator is retained, shut down, for reproducible follow-up. No existing browser campaign or other simulator data was reset.
