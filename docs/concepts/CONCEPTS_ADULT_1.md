# CONCEPTS-ADULT-1: "Option H, grown up" and UI colour schemes

Prepared 2026-11-12 after Boris's playtest: Codex-era huts, world and trees looked better than the current Claude versions; the current look is too cartoony; the HUD is better but also cartoony; show the other UI colour concepts; go back to Option H but not wooden.

**Status: concept boards only. Nothing here is game code, nothing is wired into the game, nothing is an illustration.** Every image is a harness render: the real game scene (three.js, headless SwiftShader) or the real Hearth HUD, with an experimental light override and an experimental post grade from `tools/concepts/`. Do not present them as in-game screenshots.

## Boards (docs/concepts/)

| File | What |
|---|---|
| `compare-close.png`, `compare-mid.png`, `compare-vista.png` | Same village, seed, camera, summer: (a) current default, (b) Codex classic (`current` buildings + `?map=classic` + lobed trees), (c) Option H opt-in (carved honey grammar) |
| `h-grown-overview.png` | 4 variants x summer/winter, one sheet |
| `h-grown-v1-honey-stone-and-plaster.png` | V1 board: hero, close, winter, swatches, grade numbers |
| `h-grown-v2-earth-tones-honey-light.png` | V2 |
| `h-grown-v3-golden-hour-painterly-filmic.png` | V3 |
| `h-grown-v4-dusk-amber.png` | V4 |
| `ui-palettes-board.png` | 6 HUD palettes, desktop 1440x900 plus phone 390x844 each, contrast and measured text/icon floors |
| `recommended-pairing.png` | Recommended scene + HUD pairing and two alternatives |

## What reads better in Codex's version (observed in the compare sheets)

1. Proportions: the legacy/Option H forms are low, wide single masses with one big gable; each hut is one clear silhouette at mid distance. The current village grammar builds tall narrow two-storey boxes on stair plinths with finials; they read as dollhouses or little towers, not homes.
2. Roofs: legacy roofs are two big planes with a strong ridge and carry most of the volume. Current roofs are small hips on narrow bodies, and the roundhouse roof is the same olive as the grass, so it nearly vanishes.
3. Figure-ground: Codex buildings are warm tan/terracotta on cool ground, so they separate instantly. Current olive/ochre buildings sit on olive ground with fog blotches (low contrast, muddy).
4. Simplification: Codex uses few large faces with little trim. The current grammar adds many small parts (door tint, red bases, stairs, spikes) that turn to noise at mid zoom.
5. Trees: honest result, no clear win. At the start camp both tree sets (`botanical`, `lobed`) draw the same stacked-cube conifers in every style; I could not reproduce a tree advantage in these renders. The Codex-era in-game shots (`screenshots/big-island.png`) show taller, darker conical stands with varied heights, which is likely what Boris remembers. Needs a forest-scale comparison.
6. World: neither terrain has relief at this start camp (flat river plain). Codex classic is a bright, clean, minty gradient (cartoony in its own way); current painterly is muddy olive with blotches. Codex reads cleaner mainly because it is simpler, not because it is richer.

## What makes the current look cartoony

- Saturation: trees and grass sit near #2a8f2e-class greens; buildings are saturated ochre.
- Uniform, hard-edged flat shading with no contact shadow, AO or bounce (harness shadows are off by default, as in the game).
- Toy proportions: tall thin houses, stair plinths, spike finials, cube-stacked trees repeated at one size.
- No wear, staining, texture variation or seasonal weathering on walls and roofs.
- HUD: 16px radii, brown gradient panels, glossy gold gradient fills, small bright badges (palette boards fix this with flat matte fills, 3-6px corners).

## Option H, grown up: what was done

Base = Option H legacy forms (Codex proportions) + painterly terrain, then per variant: scene light override (sun/hemisphere colour and intensity, hour, season) in `tools/concepts/map-concept-entry.ts`, a hue-band material remap (honey timber to plaster/clay, toy greens to sage; `tools/concepts/grade.py` `remap`), and a filmic grade (lift, S-curve, split tone, bloom, vignette, grain). No wood grain, no carved terraces. Numbers per variant are printed on each board and live in `tools/concepts/recipes.py`.

- V1 Honey stone and plaster: warm honey key, pale plaster, sage greens (the recommendation).
- V2 Earth tones, honey light: desaturated clay/straw/slate, honey only in the light.
- V3 Golden hour, painterly filmic: low sun, bloom, cool lifted shadows (E-style atmosphere).
- V4 Dusk amber: sun at the horizon, amber/rose highlights, plum shadows.

Mean luminance of every board and render was checked with `tools/concepts/lumcheck.py` (boards 0.30 to 0.64; hero summer frames 0.39 to 0.51, winter 0.48 to 0.55; nothing near-black, threshold 0.12).

## UI colour schemes (real Hearth HUD, `src/ui/hearth/*.css` untouched)

`tools/concepts/ui_palettes.py` re-tints the shipped CSS text and appends token overrides; `ui-palette-shot.mjs` renders the real `HudHearth` (glance and building scenarios, 1440x900, plus 390x844). Flat matte fills, 3-6px corners, Lora headings + Inter or Lora body. The harness measured min text 16px and min icon 24px for every palette (glance scenario).

| Palette | Mode | Text/panel | Dim/panel | Accent/panel | Ink/accent |
|---|---|---|---|---|---|
| P1 Honey and charcoal | dark | 13.7 | 9.4 | 9.8 | 8.1 |
| P2 Parchment and walnut ink | light | 11.1 | 5.8 | 5.1 | 6.1 |
| P3 Slate and bronze | dark | 12.1 | 7.4 | 7.0 | 5.9 |
| P4 Sage and bone | light | 9.9 | 5.0 | 4.5 | 5.2 |
| P5 Indigo dusk and amber | dark | 13.0 | 8.0 | 9.7 | 8.7 |
| P6 Terracotta and cream | light | 12.0 | 5.5 | 4.8 | 5.3 |

## Recommended pairing

1. Scene V1 (honey stone and plaster) + HUD P1 (honey and charcoal): H's warm honey light and clarity, no wood, one honey accent on flat charcoal.
2. Evening alternative: V3 + P5. Quiet alternative: V2 + P3 (use if honey accents feel too yellow on plaster).
3. To make it real: ship the building forms already in Option H, add a plaster/stone palette (`setCarvedPalette`), lower grass saturation, add a filmic grade pass, and re-skin the HUD tokens (`--hw-*`); the trees need a model pass, not a grade.

## Unverified / limits

- One seed (7, river-valley), one start camp, one hand-placed village (huts, workshop, warehouse, hearth, temple, market, forge at age 3; `house` could not be placed without hut upgrades). Terrain is a flat plain; the vista cannot show relief.
- "Codex look" = the archived `current` renderer + `?map=classic` + lobed trees that still exist in the repo, not the original Codex-era build; the old screenshots were only used for reference.
- The grade and the hue remap are post-processing on a PNG. A real implementation would need materials/shaders in the game; the remap also shifts any orange pixel (animals, skin), so it is a mood test, not a material spec.
- Harness shadows off, SwiftShader, no GPU timing, no performance claim.
- HUD: only glance, building and phone-glance scenarios were rendered; build tray, council and other screens were not re-checked. The shipped dark navy minimap stays dark in the light palettes. The 390px phone layout is cramped in every palette (existing layout, not a palette effect). Contrast ratios are computed from the tokens, not sampled from pixels.
- Boris has not seen or approved any of this.

## Reproduce

```
export NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=/mnt/user-data/uploads/hearthwild.nosync/node_modules/three
python3 tools/concepts/mkshots.py 7 36 185 river-valley shots.json tools/concepts/looks-h-grown.json hero,close,vista
node tools/concepts/map-concept.mjs shots.json --out=raw
for c in hero close vista; do python3 tools/concepts/trial.py raw $c graded; done
sh tools/concepts/run-ui-palettes.sh ui graded/hero-v1-summer.png
sh tools/concepts/run-pairing.sh ui graded pair
python3 tools/concepts/make_boards.py graded ui boards all
```
(`looks-cmp.json`-style comparison: `renderStyle` village/current/optionH, `mapStyle` painterly/classic, `treeSet` botanical/lobed.)
