# UI/UX overhaul proposal: build on Hearth, do not replace it

Author: Claude worker, 12 November 2026. Base: `origin/main` 1daa2d0 merged with `origin/integration/2026-11-11` c729b56. Branch `claude/uiux-proposal-2026-11-12`.

## BLUF

- **Keep the Hearth shell.** The frame (top bar, left rail, dock, selection card, minimap, full screens) is right. The problems are scale, wording, one overloaded card and two buried feature surfaces, not the layout. A rework would throw away ~1,250 lines of working UI and the tests around it.
- **Three things fix most of what Boris is seeing:** a hard size floor (text 16 px, icons 24 px, taps 48 px), icons and numbers instead of sentences, and one selection card with the same anatomy for every thing you can click. All three are shipped on this branch, behind the existing theme switch (`hearth` default; `field` and `classic` untouched).
- **The commander and hull commands already exist and were buried** three levels deep in a 12 px Tailwind sheet. They now have Hearth panels (Command tab on the card). Port work, commissioning, weapon families and society proposals need small additions listed below.
- **Next biggest lever is glanceable state**: supply meters in the top bar, a priority notification stack, and map overlays (influence, territory, resources). Then in-world pins and a radial/hotbar. Each is optional and independent.
- **Decisions needed from Boris** are at the bottom (seven, all short).

## What the complaints are, and what the screens show

Complaints on record: icons and text too small; too wordy ("AI slop"); glossy mobile look rejected; wants Dawn of Man / Civ 7 clarity, tactile materials, minimal white controls.

Audit method: the real `HudHearth` mounted over a live `Game` in the render harness (`tools/render-preview/ui-hud-shot.mjs`), measured with DOM queries, screenshots in `docs/renders/uiux/before/`. Terrain behind the HUD is a still from `docs/renders/map/`.

| Complaint | Evidence on origin/main | Where |
|---|---|---|
| Text too small | Smallest Hearth text 14 px (chips, dock labels, tooltips, cost lines). The legacy sheets inside "More orders" (Contact & orders, Equipment, Command, Inventory) are Tailwind `text-xs`: 12 px. | `before/army.jpg`, `before/building.jpg` |
| Icons too small | Hearth icons run 16 to 28 px; chip and cost icons 16 to 18 px; the legacy sheets use 12 px glyphs. Top-bar resources are 28 px next to 22 px numbers. | `before/worker.jpg` |
| Tap targets | Many controls are 44 px; phone dock labels are 13 px. | `before/phone-worker.jpg` |
| Wordy | A first-run sentence ("Looks and feel are yours to change: interface style, map style and world graphics live in Menu. The old look stays available."); a keyboard-tip banner ("C selects a gatherer, ] finds resources, R gives an order") in the notification stack; a "Needs attention" title above the icons that already say it; row labels "Formation" and "Guard" above icons with tooltips; "More orders" and "Build now" as words on buttons. | `before/start-hint.jpg`, `before/alerts.jpg`, `before/army.jpg` |
| Glossy | Wood panels use a vertical gradient plus a bright inset top edge; the active gold control is a gradient with a sheen. It reads as a mobile app skin. | all |
| Not Civ 7 / Dawn of Man clear | The selection card changes shape per kind: a worker gets chips plus a bar plus a 9-job grid; a military group gets a 5-row stack (matchup, three actions, formation, guard); a boat gets nothing of its own; commanders are three taps down in a text sheet. Alerts are parchment sentences in a stack on the right; nothing marks where the problem is on the map. Build tray scrolls sideways and hides costs. | `before/army.jpg`, `before/army-command.jpg`, `before/build-tray.jpg` |
| Features without a panel | `commander-order`, `naval-order`, `boat-stop`, `society-civic` and `terrainInfluence` all have read models or commands and no Hearth surface (commanders: only the text sheet; society: read-only tab; influence: no overlay). | AUTOPILOT: INC-COMMANDERS, AUD-UI-NAVAL-COMMANDER-CONTROLS, M4-08/09, INC-GEO-INFLUENCE |

What is already good and stays: the dock, the 52 px circular medals, one-gold-accent palette, the tooltip system, the full-screen Council/Village/Ages screens, the `useOwnerReadModels` plus typed `engine.dispatch` pattern (every new panel uses it; no rule lives in the UI).

## Principles (the rules the ranked changes follow)

1. **Floor, not guidance.** Text 16 px minimum, control icons 24 px minimum, taps 48 px minimum (44 px only in the dense phone speed row). Enforced by a test (`scripts/hearth-size-floor.test.mjs`).
2. **Icon plus number, words only when a number is ambiguous.** Anything longer than one word goes to the hover/long-press tooltip.
3. **One anatomy per card.** Medal, name with condition bar, up to four icon stats, one context row, one action row. Everything else behind one button.
4. **One gold control per surface.** The thing you most likely want next. Everything else is white/parchment-on-wood, flat.
5. **Tactile, not glossy.** Flat colour, faint wood grain, hard bottom edges on pressed controls. No sheens, no soft top highlights.
6. **The map explains itself.** Problems get a pin where they are; territory, influence and resources are overlays you toggle, not text.
7. **No new rules in the UI.** Panels read existing models and send existing typed commands; refusals are the engine's words.

## Ranked changes

Cost is files touched: small = 1 to 3, medium = 4 to 8, large = 9+ or a new system. "Shipped" means it is on this branch with a before/after render.

| # | Change | Value | Cost | Risk | Replaces | State |
|---|---|---|---|---|---|---|
| 1 | **Size floor**: text 16, icons 24/30/38, hit 52 as three tokens, applied to legacy sheets inside Hearth, plus a CSS test | Highest. Directly answers the top complaint, touches every panel at once | Small (`hearth.css`, one test) | Low. Layouts get ~10% wider; tray and selection card were re-fitted. Phone dock goes icon-only | The 12 to 14 px text and 16 to 18 px icons | **Shipped** |
| 2 | **One selection card** for person, crowd, building, tree/fish, boat, with context tabs (Work / Fight / Command) that appear only when more than one applies, condition as a bar, four icon stats, one action row | Highest. Ends the five card shapes; the army card drops from five stacked rows to one | Medium (`parts.tsx`, `kit.tsx`, css) | Medium. Players who learned the old layout see it move; the old text sheet is still one tap away | Per-kind card layouts, row labels, the 9-job grid always open | **Shipped** |
| 3 | **Wordless alerts**: keyboard-tip banners never enter the stack, "Needs attention" title removed (icon chips with tooltips remain), banners clamp to three lines, first-run hint cut to a few words | High. Removes the most "AI slop" sentences for almost no code | Small (`parts.tsx`, `StartupHint.tsx`) | Low. Tips now only live in tooltips and Menu; confirm Boris is fine losing them from the feed | Key-tip banners, long hint, alert title | **Shipped** (feed only; priority stack is #8) |
| 4 | **Commander and hull panels in Hearth**: commander card (rank, XP, members, slots, traits, aura count, appoint / assign / release / promote / replace) and hull card (crew, food stowed, resupply, board, stop) on `commander-order`, `naval-order`, `boat-stop` | High. Makes finished backend usable; the Command tab replaces a 12 px sheet | Medium (`commandPanels.tsx` new, `parts.tsx`, one prop on `Hud.tsx`) | Low to medium. Overlaps Codex's open commander/naval controls work in the legacy sheet; both use the same read model and commands, so they cannot disagree | The "Command" disclosure inside More orders (Hearth only) | **Shipped** (port work and commissioning not yet) |
| 5 | **Tactile materials**: flat wood with a faint horizontal grain, hard bottom edge on shadows, flat gold for the active control, no gradients | Medium to high. Answers "glossy" and "tactile" | Small (tokens in `hearth.css`) | Low. One CSS variable (`--hw-panel`) reverts it | Gradient panels, gold gradient, inset highlight | **Shipped** (grain is subtle; real 9-slice wood art is a later, optional step) |
| 6 | **Build tray wraps** into rows with full cost chips instead of scrolling sideways | Medium | Small (css) | Low | Horizontal scroller that hid "Timber bridge" costs | **Shipped** |
| 7 | **Top bar with supply meters**: 40 px glyph, 32 px number, a meter under each (days of supply, red under 3), trend arrow, sentence only in the tooltip | High. This is the glance row that Dawn of Man gets right | Medium (`ResourceBar`, a days-of-supply helper over existing food and water use, css) | Low. Needs consumption rate per resource; food and water exist in survival rules, wood and stone can show stock only | The bare number cells | Proposed. Mockup `uiux/topbar.jpg` |
| 8 | **Priority notification stack**: one sticky critical card with one button; warnings as icon chips; info as timed ghost cards that land in the chronicle | High. Calms the right side; makes raiders and starvation impossible to miss | Medium (`NotesStack`, `useAlerts`, chronicle hook, css) | Medium. Needs agreed priority ranks for existing alert kinds | The equal-weight parchment stack | Proposed. Mockup `uiux/alerts.jpg` |
| 9 | **Map overlays toggle**: territory, influence gradient (the real `terrainInfluence` field), known resources, water; same toggles on the minimap, key M cycles | High for Civ 7 clarity; the only way the influence system is visible | Medium if minimap-first (`WorldMinimap`, `minimapModel`, a toggle strip); large if drawn in the world (`world.ts` layer) | Medium. Influence field exists only for new games; resources must show only what is known (no hidden stock) | Nothing; new | Proposed. Mockup `uiux/overlays.jpg` |
| 10 | **World-anchored alert pins** with a dashed problem ring and edge arrows for off-screen threats (raiders at 140 m) | High, but the biggest single piece of new UI | Large (a projected-DOM layer fed by the same alert list, engine camera projection, tests) | Medium. Must not occlude clicks; cap at five pins | Text alerts for per-person problems (starving, store full) | Proposed. Mockup `uiux/alerts.jpg` |
| 11 | **Society and fleet dispatch**: accept / refuse a leader proposal, institution upkeep, and fleet strip with port work and commissioning | Medium to high once war and diplomacy are in play | Medium (one new typed command for proposals; reuse Codex's naval read model) | Low to medium. Needs a new command, which is a rules-adjacent change | Read-only Society tab; port work buried in dock legacy card | Proposed. Mockup `uiux/panels.jpg` |
| 12 | **Radial and hotbar command surface** (hold right mouse / long-press for a six-wedge radial; keys 1 to 0 for the same verbs by context) | Medium. Biggest feel upgrade for army and hull control, least needed until the unit count grows | Large (input routing in `engine.ts`, `RadialMenu`, keymap, tests) | Highest. Collides with existing right-click and number-key behaviour | The Military rows and Raid/Halt/Arm buttons | Proposed. Mockup `uiux/command.jpg` |

Weapon and armour loadout panel (mockup in `uiux/panels.jpg`) is held out of the ranking: armour (`armor-choice`, `equip-armor`) and `combat-doctrine` exist, but weapon families are not in this source (WQ-14 branch unmerged). It becomes a small panel once that lands.

## Mockups

All are real HTML/CSS rendered by `tools/render-preview/uiux-mockups.mjs` (sources in `docs/renders/uiux/mockups/src/`, built pages in `docs/renders/uiux/mockups/*.html`). Icons are the same lucide shapes the game uses.

| Mockup | File | Proposal |
|---|---|---|
| North-star HUD (everything together) | `renders/uiux/hud.jpg` | all |
| Icon-first top bar with supply meters | `renders/uiux/topbar.jpg` | 7 |
| One selection card: person, building, animal | `renders/uiux/selection.jpg` | 2 (extends to animals) |
| World pins and priority stack | `renders/uiux/alerts.jpg` | 8, 10 |
| Radial wheel and hotbar | `renders/uiux/command.jpg` | 12 |
| Map overlays | `renders/uiux/overlays.jpg` | 9 |
| Commander, fleet, loadout, council panels | `renders/uiux/panels.jpg` | 4, 11 |
| Size floor rule | `renders/uiux/sizes.jpg` | 1 |

Paths are relative to `docs/`.

## What shipped on this branch, with before and after

Every change below was rendered before and after in the same harness at 1440 x 900 and 390 x 844 (x2) and looked at. Before is the committed source; after is this branch.

| State | Before | After |
|---|---|---|
| Worker selected | `renders/uiux/before/worker.jpg` | `renders/uiux/after/worker.jpg` |
| Army selected | `renders/uiux/before/army.jpg` | `renders/uiux/after/army.jpg` |
| Commander (legacy sheet vs Command tab) | `renders/uiux/before/army-command.jpg` | `renders/uiux/after/army-command.jpg` |
| Building selected | `renders/uiux/before/building.jpg` | `renders/uiux/after/building.jpg` |
| Own hull selected | `renders/uiux/before/boat.jpg` | `renders/uiux/after/boat.jpg` |
| Alert stack | `renders/uiux/before/alerts.jpg` | `renders/uiux/after/alerts.jpg` |
| Build tray | `renders/uiux/before/build-tray.jpg` | `renders/uiux/after/build-tray.jpg` |
| First-run hint | `renders/uiux/before/start-hint.jpg` | `renders/uiux/after/start-hint.jpg` |
| Phone, worker | `renders/uiux/before/phone-worker.jpg` | `renders/uiux/after/phone-worker.jpg` |
| Phone, alerts | `renders/uiux/before/phone-alerts.jpg` | `renders/uiux/after/phone-alerts.jpg` |

Code: `src/ui/hearth/hearth.css` (floor block at the end), `kit.tsx` (new: `cx`, `IconBtn` with count badge, `Stat`), `commandPanels.tsx` (new: `CommanderStrip`, `BoatStrip`), `parts.tsx` (`SelectionCard`, `selectionStats`, `NotesStack`), `StartupHint.tsx`, and one prop (`hideCommand`) on `SelectionDetails` in `Hud.tsx`.

**Switchable.** `field` and `classic` themes still mount `Hud.tsx` and never load the Hearth stylesheet's scoped rules (`:root:not([data-hw-ui])`). The only shared change is `hideCommand?: boolean`, default off. The harness cannot render the classic HUD (it needs the Tailwind build), so classic is verified by compile and by the unchanged default path, not by screenshot.

Known leftovers seen in the renders, not fixed here: on a 390 px phone the PAUSED pill overlaps the speed row (it did before too); the minimap in the harness is a stub, so its content is not representative; the build tray scrolls vertically when a category has more than ten items.

## Phases (no time units; each is independently shippable and ends in a render check)

1. **Floor and card.** Changes 1 to 6. Done on this branch. Exit: before/after renders reviewed by Boris; size test green.
2. **Glanceable state.** Changes 7, 8 and the minimap half of 9. Exit: top bar meters and priority stack on a live native run; overlay toggles on the minimap.
3. **In the world.** Change 10 (pins) and the in-world half of 9. Exit: raiders edge arrow and starving pin on a native run; no click occlusion.
4. **Civic and command depth.** Changes 11, then 12 if Boris wants it. Exit: proposal accept/refuse round trip in a native save; radial behind a setting until proven.

## Tests and verification

- `scripts/hearth-size-floor.test.mjs` (new): 3/3 pass. Floor tokens, no literal text under 16 px in `hearth.css`, token blocks scoped away from the archived themes.
- `minimal-ui` 6/6 and `h-compact-ui` 5/5 pass, before and after.
- `council-ui` 9/13 pass before and after; the 4 failures are `Cannot find package 'lucide-react'` (not installed in this sandbox) on the capitulation, captive and captives screens, unrelated to this change.
- `compact-hud` fails to load before and after for the same reason (`lucide-react` imported by `Hud.tsx`).
- Type check: standalone `tsc` over `HudHearth`, `parts`, `commandPanels`, `kit` shows only the known sandbox noise (missing react types make JSX `key` props error); no real errors in the new files.
- Render harness needed one fix to run here: a stub for `three/examples/jsm/libs/fflate.module.js` (`tools/render-preview/shims/fflate.js`), because `three` is not installed.

## Decisions for Boris

1. **Default scale.** The floor (16 px text, 52 px taps) is now the default for Hearth. Want an "Interface size" setting (Standard / Large) or just one size? Recommend one size.
2. **Keyboard-tip banners** ("C selects a gatherer...") are gone from the feed. They stay in tooltips and Menu. OK, or move them into a one-time Help screen?
3. **Material.** Faint wood grain plus flat gold and hard edges. Keep, go flatter (no grain), or commission real wood/parchment art?
4. **Phone dock** is icon-only now (labels in tooltips). Acceptable?
5. **Phase 2 go-ahead:** supply meters, priority stack, minimap overlays.
6. **World pins (change 10)** are the largest piece. Do it, or stay with the icon-chip stack?
7. **Radial vs hotbar vs both** for army and hull control, and which existing keys may change.
