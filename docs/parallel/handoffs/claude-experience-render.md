# Handoff — Claude Experience render review

- **Branch** `agents/claude-experience-render`, based on `agents/claude-experience` (c2f1e54, later merged to 51b575c for civic families and unitAppearance). I only added new files: `tools/render-preview/**`, `tools/blender/**`, `.github/workflows/render-previews.yml` and this note. No `src` file was edited.
- **Renders are local-only** until the user has reviewed them. Pushed: tooling, workflow and this note. Not pushed: PNGs in `docs/art-reference/h-renders/` (committed only on the local branch `agents/claude-experience-render-pngs`).
- **What these images are:** real generator output (`buildCarvedMesh` meshes and vertex colours, `carvedTerrainColorsForPositions` terrain colours) drawn by a **stand-in WebGL2 renderer**. They are not three.js and not in-game screenshots. The heightfield, the layouts, the display plinths and the sun direction are this review's own choices.

## How to rerun

```
node tools/render-preview/render.mjs all                    # stand-in, writes docs/art-reference/h-renders/*.png
node tools/render-preview/render.mjs village out.png --rig=adapter
NODE_PATH=<global node_modules with sharp> node tools/render-preview/compare.mjs   # g-compare-board-vs-render.png + numbers
npm ci && npx playwright install --with-deps chromium && node tools/render-preview/render-three.mjs all   # real three.js
BLENDER=/path/blender node tools/blender/run.mjs            # Cycles
```

Both the three.js and Blender pipelines run in GitHub Actions (`render-previews.yml`, workflow_dispatch). The three.js job passed in CI run 43106700599. I couldn't download its artifact here, so I have not seen those images. The Blender script has never run anywhere I could observe: it is `py_compile`-checked only, and its exporter was run in Node.

## Outputs (`docs/art-reference/h-renders/`, 1600x1000)

- `a1-families-1.png`, `a2-families-2.png`, `a3-families-3.png`: all 29 core and extra families at near LOD. Columns: E0 wattle, E2 poor, E2 rich, E3 stone, E5.
- `a4-closeup-near-detail.png`: six families up close (roof courses, recessed windows).
- `a5-civic-1.png`, `a6-civic-2.png`: the 19 civic families, same five columns.
- `b-village.png`: village after board panel H, tuned rig. Also `b-village-adapter-rig.png` (CARVED_LIGHT_RIG as-is), `b-village-hero.png` (closer camera) and `b-village-mid-lod.png` (mid-tier meshes).
- `b2-town-centre.png`: market hall, shrine, town hall, fort barracks and smithy.
- `c-wonders.png`: the six wonder plans. `d-caravans-stalls.png`: carriers, boats, stalls, parcels. `e-lod-tiers.png`: near, mid, far and impostor with triangle counts.
- `f0-civ-lineup.png` plus `f1..f6-civ-*.png`: the same layout for six cultures. Each uses cultureGrammar (habit, palette, flag, pottery, roofTone) and unitAppearance (owned gear only).
- `g-compare-board-vs-render.png`: board H crop next to the village render, with measured numbers.

## Measured wood tones (same mask on every image: hue 12–48°, sat ≥ .28, val ≥ .22)

| | hue | sat | val | p10/50/90 val | mean |
|---|---|---|---|---|---|
| Board H (UI excluded) | 30.3° | 0.610 | 0.695 | .44/.74/.87 | #b17d48 |
| Render, CARVED_LIGHT_RIG as-is | 31.5° | **0.830** | **0.632** | .49/.65/.71 | #a1621d |
| Render, tuned preview rig | 28.9° | 0.609 | 0.735 | .55/.76/.83 | #bc814c |

**Warmth.** The hue is already right: the palette is within about 1° of the board. The current rig misses in the other direction from "not orange enough". It renders about 0.22 more saturated and about 0.06 darker than the board, which reads as rust or brown-orange rather than light honey. There are two causes:
1. The lights are warm (#fff0d8 sun, #ffe8c8 sky) on top of albedos that are already warm, so the warmth is applied twice.
2. The Neutral tone map subtracts a 0.04 toe from all channels, and that raises saturation.

The board's "orange" comes from light value and bright tops, not from chroma. Earlier attempts read beige because the light was cool. This one reads rust because the light is warm on top of the toe. The tuned rig gets sat and val within a few hundredths of the board. Its value distribution is still narrower: less deep shadow (p10 .55 vs .44) and less pale inlay.

## Critique against the board (stand-in render; judge it again in three.js)

1. **Wood grain.** Building grain is right in kind but averages away beyond about 30 m: 90 lines per 1.8 m tile is sub-pixel at village zoom. On the board, grain is the main texture and stays visible at distance. Terrain grain (`woodGrain`, a 2.4 m sinusoid at a fixed angle) reads as diagonal corrugation, not grain. It doesn't follow the contours, and it is still visible at 0.035 amplitude.
2. **Carved contour land.** `terracedHeight` produces soft ramped risers (18% of each band), so the hills look like sand terraces. The board has crisp, thin, dark edges with laminated layers stacked inside each band.
3. **Silhouettes and scale.**
   - The church is narrow (about 4 m) with a tower on the nave. The board has a broad nave with a separate bell tower.
   - The watermill sits on the 3x3 grindingStone footprint, so it is tiny; the board mill is house-sized with a large wheel.
   - The bridge is a timber trestle or clapper. The board's arched stone bridge exists only inside the millMarket wonder.
   - The houses are consistent and readable, but their massing is close to identical. The board mixes L-plans and two-storey houses.
4. **Era and prosperity variation** is clear for roundhouse, cottage, storehouse, tower, church, keep, college, shrine and lyceum. It is near-invisible for granary, palisade, gate, quern, hearth, trench, moat, outpost and threshing.
5. **Roof and window detail** is present at near LOD (courses, recessed windows, chimneys). Civic families use the `tile` swatch (#c0723c), which reads distinctly redder than the wood. It is good for separation but drifts from the all-wood board.
6. **Trees.** The 8x6 sphere lobes look faceted, and the crowns sit slightly too green and dark next to the board's smooth domes.
7. **Water.** The slate-blue reads correctly as the only cool hue. The board water is a little lighter and has a pale bank lip.
8. **Platforms.** Wonder courts and plinths are sensible. Fields (fieldPlot) look good. Pens are large and empty.
9. **Civ lineup.** Most of the difference between civs comes from the civic buildings (shrine grammar, roof scale, banner, doorway) plus roofTone and trees. Core cottages and longhouses barely change between cultures, and stilts are not drawn by the core families. At village zoom, units are too small to read.

## Recommended changes (proposal for the other worker or Codex; not applied)

```diff
 // src/scene/carvedPalette.ts  CARVED_LIGHT_RIG
-exposure:1,
-hemiSky:'#ffe8c8',hemiGround:'#94643a',hemiIntensity:1.05,
-sun:'#fff0d8',sunIntensity:1.9,
+exposure:1.06,
+hemiSky:'#fff8f0',hemiGround:'#b08058',hemiIntensity:1.35,   // neutral light: the warmth lives in the albedos
+sun:'#fffaf2',sunIntensity:2.9,                               // stronger key, less fill = board's bright tops
 // CARVED_TERRAIN
-grainAmplitude:.07,
+grainAmplitude:.015,          // and make the grain follow contour bands instead of a fixed angle
 // wood albedos x0.86 saturation (cancels the Neutral toe); same hue:
-woodLight:'#dfa56b' woodMid:'#c8884d' woodDark:'#9c6433' thatch:'#cf9553' shingle:'#b97a40' tile:'#c0723c'
+woodLight:'#d9a778' woodMid:'#c28a5c' woodDark:'#976640' thatch:'#c99763' shingle:'#b37c4f' tile:'#b9754c'
-stone:'#dcb688' plaster:'#e6b77e' bands:['#d1935a','#c8894f','#d79e63','#c17e44'] riser:'#7e4d22'
+stone:'#d8b791' plaster:'#e1b88a' bands:['#cb9568','#c28b5d','#d1a070','#bb8053'] riser:'#7a4f2e'
```

You can choose either the rig change or the albedo change on its own; I measured them together. If both are applied, re-measure in three.js. The `tuned` rig in `tools/render-preview/rigs.mjs` applies exactly these values (albedo saturation via shader, `albedoSat: .86`).

Structural proposals, roughly in order of value:
- Contour-following terrain grain, with sharper risers (about 0.08 of a band) and a dark edge line.
- A larger review watermill footprint, or a house-sized mill family.
- A stone arch bridge variant for stone eras.
- A broad-nave church with a detached tower.
- 12x8 sphere segments for near-LOD tree crowns, and a slightly yellower foliage swatch.
- Core families should consume culture habits (stilts, courtyard) as the civic families already do.

## Limits

- The stand-in is WebGL2 on SwiftShader with one directional light and 5x5 PCF shadows. It has hemisphere fill, Khronos Neutral tone mapping, three-style linear fog (switched off for sheets) and a tiny Schlick specular. There is no IBL, AO pass, SSAO or bloom.
- The three adapter (`carvedBuildingLayer.ts`) is still unexecuted, so the real in-game look is unknown.
- All numbers are pixel statistics of preview images.
- The sun direction is mine (from the left-front at about 38° elevation); the rig doesn't define one.
- Civ-sheet interpretations that are mine and not the generator's:
  - flag drawn as 10x6 colour cells;
  - pots as lathe meshes from `pottery.profile`;
  - a plain body stand-in under the unitAppearance gear parts;
  - roofTone mixed 45% into roof swatches;
  - palette.ground mixed 30% into the ground.
