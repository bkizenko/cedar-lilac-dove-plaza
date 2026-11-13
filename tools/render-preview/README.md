# Option H render previews

Renders of the **real** Option H generator output (`src/scene/*`: building
families, carved terrace colours, trees, caravans, wonder plans) for review
against the original board (`docs/art-reference/style-options-D-I.png`,
panel H = bottom-middle). These are previews, not in-game screenshots.

Scenes are defined once in `scenes.mjs` (built in Node through
`scripts/game-loader.mjs`) and drawn by three backends:

| Backend | Command | Output dir | Runs where |
|---|---|---|---|
| Stand-in WebGL2 (no deps, `renderer.html`) | `node tools/render-preview/render.mjs all` | `docs/art-reference/h-renders/` | anywhere with Playwright Chromium |
| three.js 0.185.1 (`three.html`, MeshStandardMaterial like the adapter, PCF soft shadows, GTAO, Neutral/AgX/ACES) | `node tools/render-preview/render-three.mjs all` | `docs/art-reference/h-renders/three/` | needs `npm ci` |
| Blender Cycles (`tools/blender/`) | `BLENDER=/path/blender node tools/blender/run.mjs` | `docs/art-reference/h-renders/blender/` | needs Blender 4.2 |

## three.js: three commands on a fresh machine

```
npm ci
npx playwright install --with-deps chromium
node tools/render-preview/render-three.mjs all      # -> docs/art-reference/h-renders/three/*.png
```

Options: `--rig=adapter` (CARVED_LIGHT_RIG exactly) or `--rig=tuned` (default,
this preview's proposal), `--tone=neutral|agx|aces`, `--no-ao`. `all` also
writes `b-village-agx.png`, `b-village-aces.png` and `b-village-adapter-rig.png`.

## Blender

```
npm ci && npx playwright install --with-deps chromium   # label overlay only
# Blender 4.2 LTS: https://download.blender.org/release/Blender4.2/
BLENDER=$HOME/blender/blender node tools/blender/run.mjs [--samples=96] [--quick] [scene ...]
```

## CI

`.github/workflows/render-previews.yml` runs the stand-in + three.js job and
the Blender job (workflow_dispatch, or push to `agents/claude-experience-render`
touching these tools) and uploads PNGs as 7-day artifacts.

## Terrain and rig defaults

The default is natural terrain (grass, soil, rock, sandy banks) under the warm `golden` rig, following user feedback after review 1. `--terrain=carved` restores the carved-wood terraces with the `tuned` rig, and `village-carved` is kept for comparison. All three backends accept `--terrain` and `--rig`.

## Single scene

```
node tools/render-preview/render.mjs list
node tools/render-preview/render.mjs village out.png [--rig=adapter]
```

Outputs are 1600x1000 (800x500 CSS at DPR 2); Blender renders 1920x1200, and
the hero shot is 3840x2400.

## What is and is not generator output

Generator output: every building, tree, caravan, stall, parcel and wonder mesh
(`buildCarvedMesh`), including its vertex colours, and terrain colours
(`carvedTerrainColorsForPositions`). This review's own additions: the review
heightfield and village layout, display plinths, the light direction (the rig
does not define one) and the `tuned` rig numbers.

Only the stand-in renderer was run in its authoring sandbox. `render-three.mjs`
and the Blender scripts were written without three/Blender available: they are
syntax-checked, and the exporter was run in Node.

## First-person (eye-level) frames of the real game

`fp.mjs` (entry `fp-entry.tsx`, shots `fp-shots.json`, evidence shots `fp-findings.json`, crops `fp-crops.mjs`) renders the real `Game` + `WorldView` + `HudHearth` with the camera at an adult eye (1.55 m). Output is PNG with a mean-luminance guard (`--min-lum`, default 70). See `docs/FIRST_PERSON_DESIGN.md`, "Real eye-level renders".
