# Building material textures, hut variety and workplace props (2026-11-13)

**BLUF.** Carved buildings now draw with a procedural per-material texture set (13 materials, seeded, tiling) instead of one shared 256 px grain map, weather by age, season and moisture in the shader, and ship a hut-variety pass plus trade-specific workplace props. Palette is untouched (no global colour change; the muted tone and taste envelope switches are as before). Legacy switches: `setBuildingTextureMode('legacy')`, `setHutVariety(false)`, `setWorksDetail(false)`.

## Texture set (`src/scene/buildingTextures.ts`)
- Layers: thatch, reed, timber (grain, checks, weathering), plank (boards, nails, gaps), wattle-and-daub (cracks, exposed rods), mud brick (courses, straw flecks), lime plaster (pits, hairline cracks, stains), ashlar (dressed courses), rubble, slate, clay tile, hide/felt (seams, stitches), turf.
- Packing: two RGBA8 layered atlases (WebGL2 2-D array textures: one bind each, real mips, clean tiling): A = albedo detail multiplier + height, B = roughness + cavity + stain mask. Normal-style relief is a height-derivative bump (High/Ultra only, the existing `DETAIL_RULES.bump` switch).
- Size follows the Detail option: Standard 128 px, High 192, Ultra 256. Measured GPU memory (both atlases, full mip chain, 13 layers): **Standard 2.17 MB, High 4.88 MB, Ultra 8.66 MB** (`textureMemory`). Only the active size stays resident.
- Selection (`layerForMat`): civ swatch course first (wattle, brick, log, felt, turf, thatch, tile, plank, ashlar...), then palette id, then slot and era (stone is rubble before era 2, ashlar after; walls era 3+ ashlar). Per-vertex `bm` (4 bytes: layer, wear, height fraction in part, per-part seed) is packed by `buildCarvedMesh`; per-building UV offset comes from the instance position so one variant never looks stamped.
- Weathering (fragment shader, `patchBuildingShader`): moss on north faces and bases (more with wear, spring/autumn), soot near roof ridges, rain streaks under eaves, splash dirt at the base, sun bleach on south and up faces (summer), wet darkening and lower roughness in rain. World wiring: `setBuildingWeather` from the season mix and weather in `world.ts`.
- `spec.tex = {era, wear}` is set in `variantSpec` (civ ctx or family wealth).

## Hut variety (`src/scene/hutVariety.ts`)
Plan scaled per building (oval or long via `Part.oval`, D-shaped back), door width, height and position, lean-to, porch, annex, hurdle, drying rack, plinth course of another material, painted band on richer huts, patched roof on poorer, finial on richer, 2-4 alternate base forms per civ. Mekhari raft hut now sits on a low sill (no stilts). All parts start at y >= 0. Measured variety (`tools/render-preview/hut-variety-score.mjs`, 12 huts per civ, mid tier, mean pairwise silhouette distance 1-IoU): **0.139 before, 0.262 after** (40 huts/civ, every civ up; min civ 0.216). The mid tier is capped at 990 by `capMidTier` after dressing.

## Workplace props (`src/scene/worksDetail.ts`)
Forge, kiln/pottery, oven, loom, drying rack/smokehouse/tannery, sawyer, temple, market, stables, quay, tower, gate, palisade, hearth, mill, college, generic bench: seeded per building id, wear patches, inside the footprint, near-only except 140 mid triangles, held under the near ceiling. Under a CivSkin they take that society's swatches.

## Checks
`scripts/building-textures.test.mjs`: determinism, seam tiling, memory budget, material choice, per-vertex layers for all civs, weather clamps, shader patch, hut variety (distinct, ground level, caps), legacy switches, works props for all 14 civs plus neutral, watermill wheel for all civs (rotor present at near and mid). Renders: `docs/renders/materials/` (`tools/render-preview/materials-sheets.sh`).

## Known gaps
Watermill, mill and bridge are Village-family only (no per-civ grammar); the wheel exists and turns with `spin` but is not civ-styled. Halls/temples/markets keep their civ massing (props and textures added, not redesigned). Real GPU frame cost was not measured (SwiftShader only).
