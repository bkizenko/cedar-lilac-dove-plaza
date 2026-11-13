# CONCEPTS-ADULT-2: grass and ground colour, and masculine HUD directions

Prepared 2026-11-13 after Boris's note: "want to see other HUD views and the color of grass ... it feels like a cartoon. I want this game to feel more masculine." Follow-up from CONCEPTS-ADULT-1. Desktop only (Boris: no need to optimise for mobile), so every HUD board is 1440x900 and there are no phone renders.

## BLUF

- **The lime is mostly saturation, not hue.** The shipped meadow is H72 S37 L47 and the terrain shader then pushes it yellow-green (lush tint x1.09,1.02,.74), and the default tree set multiplies foliage by a vertex tint above 1 (x1.2,1.15,.82). Real grass and trees sit at S14-34 in nearly every real biome. Capping saturation and removing the push is what removes "cartoon" from the ground.
- **Recommended ground: the "Hearth ramp"** (olive-sage base, warm-dry variation, S cap 34%): spring H84 S30 L46, summer H76 S28 L42, autumn H38 S34 L44, winter H56 S10 L56, dry H46 S34 L56. Varies by province, geology and season as listed below.
- **Recommended HUD: D1 Forged iron and charcoal** (flat charcoal plates, 2px stroke and 1-2px radius, bronze as the only accent, tracked uppercase headers). Alternatives: D3 Carved slate (more austere), D4 War-room table (parchment cards on felt, the most distinctive).
- **Recommended pairing:** Hearth ramp + D1 + the masculine scene grade (`recommended-pairing.png`). Mean luminance 0.25 to 0.42 on every board, nothing near-black.
- **Still toy by shape:** the grass fix does not touch tree silhouettes (lobed lollipop crowns) or the cream-and-red huts. Those need a model pass; the post remap in the scene mockup is a mood test only.
- **Nothing is wired into the game.** Boris has not seen any of this.

## Six-line findings

1. Saturation cap is the main lever: the nine palettes stay at grass S 14-46 (cap 14-52 per palette) and read as real country; the shipped palette plus lush tint reads as lime (`grass-overview.png`, first row).
2. Trees were half the cartoon: the default `botanical` tree set bakes a >1 warm tint into foliage and uses leaf colours at S43+. Muting leaf colour and the tint (runtime override) made woodland read olive without changing any shape.
3. Removing the shader lush tint on its own was not visible on the already-desaturated Hearth ramp (`g9` vs `g9b` rows are near-identical). Its effect on the shipped palette alone was NOT tested.
4. Golden hour darkens every palette; the dark-pasture and boreal palettes (L 25-34) need the same exposure lift as the others to stay readable, so the ramp keeps grass at L42+ and relies on light, not paint, for drama.
5. HUD: all four directions keep the shipped layout and only change CSS tokens and structure (flat fills, hard strokes, one accent, serif or tracked caps). Pixel-sampled text contrast has a median of 7.7 to 8.7 on every screen set; the remaining low values are disabled buttons (45% opacity) and one D4 defect, listed below.
6. Floors: shipped HUD has 12 taps under 52px and 27 icons under 24px across the 13 screens; the directions bring taps to 2 and icons to 13-16. 6 text runs of 12px (first-contact dialog portrait caption, in `src/styles.css`/EncounterPortrait, not Hearth CSS) remain under 16px in every direction.

## What "masculine" means here (design rules)

1. **Mass.** Big flat plates and wide, low shapes; no floating pills. Panels read as slabs: 2px stroke, a 4px accent top edge on the main bars (D1).
2. **Weight.** Heavier strokes (2px), heavier type (700-800), tracked capitals for headers; numbers large and tabular.
3. **Angularity.** Radii 0-4px (D3 is 0). The shipped 16-22px radii and 999px pills are what read as toy.
4. **Restraint.** One accent (bronze, brass, ochre or bone depending on direction). No gold gradients, no gloss, no glow, no bright primaries. Danger red is used only where it is information.
5. **Material honesty.** Matte iron, leather, stone or felt; the material is stated by structure (stitch line, etched hairline, riveted-plate edge) and never by fake texture or bevel.
6. **Desaturated earth palette.** Ground S <= 34% (hard ceiling 45%), tree leaf S 18-28%, rock S <= 8%. Colour comes from hue and light, not chroma.
7. **High-contrast silhouettes.** Value separation (L difference >= 12 points) between roofs, walls, ground and trees, instead of hue separation.
8. **No cute.** No rounded caps, no soft icon discs, no emoji-like badges; icon chips become square plates.

These rules are applied to the scene mockup (terrain ramp, building tone, grade) and to the HUD in `masculine-scene.png`.

## (a) Grass and ground study

Board: `docs/concepts/grass-overview.png` (11 rows x mid-day | golden hour | swatches with HSL, caps, suited biome/season). Biome and season check, with the recommendation table: `grass-biomes.png`.

Scene: real game, seed 7, `river-valley` preset, worldgen v21 (`ground.mjs`): the start camp sits on a 30 m hill with an alpine rise to the east, dry scrub south, mixed woodland north and a river. The village is 6 buildings and 1 field (a 16-building village crashed the renderer page on this memory-starved machine). Every palette uses identical camera, light and exposure; only the ground, rock tone and tree colour change (runtime override of the real palette tables, no post grade). The harness does the override at bundle time (esbuild source patch) so `src/` is untouched.

| Palette | Season rendered | Suits | Grass S cap / used max | Summer (spring) HSL |
|---|---|---|---|---|
| g0 Shipped (no override) | summer | current | S37 meadow + lush tint | H72 S37 L47 |
| g1 Dry-season dun and straw | summer | steppe edge, dry-summer lowlands, Mediterranean hills | 36 / 32 | H44 S30 L52 (H62 S24 L46) |
| g2 Olive-grey meadow | summer | temperate river valley, lowland meadow, mixed woodland edge | 28 / 26 | H72 S20 L42 (H80 S24 L44) |
| g3 Cool blue-green boreal moss | summer | boreal conifer forest, taiga, wet northern uplands | 26 / 22 | H128 S16 L30 (H112 S22 L34) |
| g4 Heather and bracken browns | autumn | highland moor, upland heath | 46 / 38 | H30 S26 L34, autumn H24 S38 L34 |
| g5 Sun-bleached steppe | summer | continental steppe, dry plateau | 28 / 24 | H48 S22 L62 (H68 S22 L52) |
| g6 Wet dark pasture | summer | oceanic pasture, river bottoms, after rain | 32 / 29 | H100 S26 L25 (H96 S28 L28) |
| g7 Autumn rust and bracken | autumn | temperate deciduous October, upland bracken | 52 / 46 | autumn H24 S46 L36, rust drifts #8e4a2a |
| g8 Winter frost over dead grass | winter | any temperate/boreal biome in deep winter | 14 / 14 | winter H200 S8 L74 over dead straw H40 S18 L42 |
| **g9 Hearth ramp (recommended)** | summer | default for every biome (varied) | 34 / 34 | H76 S28 L42 (H84 S30 L46) |
| g9b Hearth ramp, lush tint removed | summer | test | 34 / 34 | same, shader tint 1,1,1 |

Real-colour anchors are in `ground_palettes.py` (field-photo and Munsell-style ranges, rounded). They are written from memory of typical vegetation colour, not measured by me from a dataset; treat the numbers as grounded estimates.

### Recommended base grass ramp and how it varies

Base (meadow row, HSL): spring H84 S30 L46, summer H76 S28 L42, autumn H38 S34 L44, winter H56 S10 L56, dry H46 S34 L56, litter H30 S28 L32, rock H36 S6 L50. Hard rules: grass S <= 34% (never above 45% anywhere), no L above 60 outside winter/steppe, shader lush tint 1,1,.9 (shipped 1.09,1.02,.74), broadleaf H86 S28 L32, conifer H145 S20 L22 (shipped broadleaf is S43).

- **By biome (province offset on the base):** woodland dH-6 L-6; conifer dH+14 L-13 S x.85; alpine L+4 S x.7; wetland dH+8 L-6; dry-scrub dH-16 L+6; arid dH-28 L+14 S x.8; warm coast dH-8 L+3. The sample biome check (`grass-biomes.png`) renders shipped | best-fit real palette | Hearth ramp for alpine, dry scrub, woodland and wetland.
- **By soil/geology (game `ROCK_PALETTE` soil under the grass):** sandstone/arid: warm red-ochre soil, grass drifts to the dry-scrub row; limestone: cream soil, olive-grey grass; basalt/shale: dark soil, wet-dark-pasture row; granite: grey-pink rock, heather/bracken row.
- **By season:** spring H84 S30 (the greenest allowed) -> summer H76 S28 -> late-summer drift toward dry H46 -> autumn H38 S34 with rust patches -> winter H56 S10 L56 straw with frost over it. Saturation falls through the year, luminance stays mid (L 42-56).

## (b) HUD directions

Real Hearth HUD (`src/ui/hearth`, shipped CSS untouched), one Game mounted once, 13 screens per direction: glance, build tray, building card, unit card, council/rulers, first-contact dialog, village overview, trade (village Trade tab), ages/knowledge, menu, test lab, alerts and priority stack (raiders, hunger, cold), minimap closed (open = glance). Boards: `hud-overview.png` (5 key screens x shipped + 4 directions), `hud-d1.png` .. `hud-d4.png` (all 13 screens each, with per-screen numbers).

| Direction | Concept | Type |
|---|---|---|
| D1 Forged iron and charcoal | charcoal plates, 1-2px radius, 2px #55595d stroke, bronze #b7803f only accent, 4px bronze top edge on bars | condensed uppercase (harness: TeX Gyre Heros Cn) for headers and numbers, Inter body |
| D2 Weathered leather, bone, sinew | matte oiled leather #352a20, dashed stitch line inset, bone #cdb98c accent, bone notes | Lora serif bold, Inter body |
| D3 Carved basalt and slate | zero radius, etched double line (inset hairline), ochre #c88f3b only on active/primary | tracked uppercase Lora, Inter body |
| D4 War-room map table | dark baize #1c2520, brass hairlines, parchment cards with ink text, wax-red only for danger | Lora small-caps headers, serif everywhere |

Floors and contrast, measured from the real renders by `hud-views.mjs` (text and icon sizes from the DOM, contrast from sampled pixels: background = median of the text box, foreground = most distant pixel; text clipped by scroll containers or covered by a modal is skipped; test lab excluded from the contrast columns):

| Set | p10 contrast (worst screen) | median contrast (worst screen) | min contrast | text < 16px | icons < 24px | taps < 52px |
|---|---|---|---|---|---|---|
| Shipped | 5.25 | 8.73 | 1.48 | 6 | 27 | 12 |
| D1 Forged iron | 5.52 | 8.44 | 2.44 | 6 | 16 | 2 |
| D2 Leather | 4.70 | 7.74 | 3.23 | 6 | 16 | 2 |
| D3 Slate | 6.07 | 7.96 | 2.71 | 6 | 16 | 2 |
| D4 War-room | 1.20 | 7.86 | 1.20 | 6 | 13 | 2 |

Known defects, not hidden:
- Disabled buttons (45% opacity: "Bronze not ready", "Collect water", disabled build tiles) are 1.5-3.9 contrast in every set including shipped; they are intentionally dim but still below 4.5.
- D4 menu: the "Save" button row reads 1.2 contrast (light button on a parchment card in the Menu "Save" section); needs a card-specific fix. D4 p10 reflects this one screen.
- D2/D4 alert count badge "3" is 4.07 (white on the shipped red badge), same as shipped.
- The 6 under-16px text runs and ~14px dialog icons come from the first-contact dialog (portrait caption at 12px); that dialog is styled by `src/styles.css`, not Hearth CSS, so my CSS did not reach it fully.
- Test lab: the Menu > Tools > Test lab screen renders almost empty in the harness (the engine is stubbed; the panel shows a bare "Test lab" box with unstyled controls). It was not assessed as a design.
- Trade (Village > Trade tab) renders only its tab bar: no trade partners exist in the harness world.
- The minimap canvas stays the shipped dark navy and is empty (harness stub) in every direction.
- Remaining 2 taps < 52px in the directions: the era chip and one dismiss control; see `*-measure.json` logic in `hud-views.mjs` (tap sample list).

## (c) Scene mockup and pairing

`masculine-scene.png` compares, with the same camera/light/exposure: the shipped scene + shipped HUD against the masculine scene (Hearth ramp + post building remap + restrained grade) + D1, for the scene alone, glance, building card and build tray. `recommended-pairing.png` is the pairing sheet (ramp swatches, D1 tokens, grade numbers, luminance). Single images: `scene-shipped.png`, `scene-masculine.png`.

Scene post steps (`scene_masc.py`; not game materials): hue 30-62 thatch to hue 34, saturation x.42, value x.82; saturation .90; S-curve .35; vignette .20; cool slate shadows, warm highlights.

Mean luminance (0-1; near-black threshold 0.12): grass-overview 0.274, grass-biomes 0.313, hud-overview 0.196, hud-d1..d4 0.159-0.197 (dark UI plus dimmed scrim, by design), masculine-scene 0.307, recommended-pairing 0.234; scene shipped 0.421, scene masculine 0.323. Every board passes. The individual grass renders are 0.17 to 0.49 (g3/g6 golden hour darkest).

## Recommended pairing

1. Ground: Hearth ramp, varied by province/geology/season as above.
2. HUD: D1 Forged iron and charcoal.
3. Scene: masculine grade (restrained saturation, warm highlights, cool shadows) on top of real material changes (ground, tree leaf colour and foliage tint).
4. Alternatives: D3 Carved slate if bronze feels too warm; D4 War-room table for a map/war-room mode or a distinct identity; D2 is the softest and least masculine of the four.

## To make it real (not done here)

- Ground: lower the PAINTER_PALETTE greens, remove or cap the shader lush tint, retune `autumn` drifts; per-province offsets already exist in the palette table.
- Trees: change `leaf` colours and top/bottom foliage tints in `botanicalSpecies.ts` (and `FOLIAGE` in `painterTrees.ts` for the legacy set); silhouettes need a separate model pass.
- HUD: tokens `--hw-*` plus radii and borders (the CSS in `ui_directions.py` is the full diff); add a condensed face to the allowed font list or stay on Inter/Lora; fix the first-contact dialog CSS and disabled-state contrast.

## Reproduce

```
export NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=/mnt/user-data/uploads/hearthwild.nosync/node_modules/three
sh tools/concepts/run-ground-study.sh                    # palette renders into /tmp/gout (one process per palette, retries on renderer crashes)
python3 tools/concepts/ui_directions.py /tmp/hud/css     # four direction CSS files + token contrast
sh tools/concepts/run-hud-views.sh /tmp/hud /tmp/gout/g9-hearth-ramp__hill-gold.png
python3 tools/concepts/scene_masc.py <hearth-ramp-render.png> scene-masculine.png
python3 tools/concepts/make_boards2.py /tmp/gout /tmp/hud docs/concepts <pair-dir> <scene-shipped.png> <scene-masculine.png>
python3 tools/concepts/lumcheck.py docs/concepts
```
Files: `tools/concepts/ground.mjs`, `ground-entry.ts`, `ground_palettes.py`, `mkground.py`, `run-ground.sh`, `hud-views.mjs`, `hud-views-entry.tsx`, `ui_directions.py`, `scene_masc.py`, `make_boards2.py`.

## Unverified / limits (honest list)

- All renders are headless SwiftShader. Colour and tone mapping on a real GPU/display may differ; no performance claim.
- The palette study used one world (seed 7, river-valley, worldgen v21) viewed from five cameras. Highland, steppe and lakeland presets crashed the renderer page while scouting (machine memory), so "steppe" is the dry-scrub province, "highland" the alpine province, "boreal" a woodland stand-in (this world has no conifer-forest province). The boreal and heather palettes were therefore judged on woodland/alpine, not on a real boreal forest.
- Real-colour anchors are my recollection of typical vegetation colour ranges, not a measured dataset.
- Grass changes are real material overrides (runtime palette tables); the building remap and the scene grade are post-processing on a PNG and shift any pixel in the hue band (some tree trunks and a pale tree also shifted). Real building materials would need a model/material pass.
- The tree override edits colours only; the lobed silhouettes read toy regardless. The lush-tint removal was only tested on the Hearth ramp.
- Exposure was raised equally for every palette (x1.3) so dark palettes are comparable; this is not the game's own tone mapping.
- HUD: one Game state (age 1, rulers v2, a raid and a first-contact stranger faked in the harness); the dialog stranger is a cloned unit; trade, test lab and the minimap content are stubs. The fonts are the harness machine's installed Inter, Lora and TeX Gyre Heros Cn (not in the repo list); Cormorant Garamond and Outfit (repo-allowed) were not installed, so they were not used.
- Contrast is sampled from pixels with a crude background/foreground estimate (median and most distant pixel); text over busy terrain, anti-aliased thin text and semi-transparent layers make it approximate; it also skips text clipped by scroll containers, so content below the fold was not measured.
- Desktop only; phone layouts were not rendered or checked (per Boris).
- Boris has not seen or approved any of this; nothing is wired into the game.
