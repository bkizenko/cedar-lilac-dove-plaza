# Building detail and variety notes (2026-11-13)

**BLUF.** Boris's complaint (Codex hut richer, ours low detail and cookie-cutter) had two causes, both fixed in source. (1) Detail: the carved/civ grammars drew each hut as 2 to 4 massing solids with no construction marks. (2) Sameness: a society's huts and houses came from a pool of 4 to 5 shared variants per family, and era 0 and 1 civ huts were one fixed form per civ, so six huts in a village were clones. Now every skinned hut, house, granary and craft shed is keyed by its own id (64 dwelling variants, 32 workshop variants), gets per-building proportions and form, and a seeded construction-detail layer (`src/scene/buildingDetail.ts`). Palette is unchanged; a muted adult tone exists as an opt-in switch (`setBuildingMute`, default off). Triangle caps hold (civ near 1600 / mid 1000 / far 660).

## What made the archived Codex-era hut read as richer

Studied from the legacy renderer (`src/scene/meshes.ts` `thatchHut`, `buildingSurfaces.ts`), `docs/renders/buildings/homes-before.png`, `docs/renders/surface/after-grounding-g1-hut.jpg`, `screenshots/building-materials-townhall-desktop.png`, `docs/concepts/compare-close.png`:

- Surface texture on every material: woven thatch strands with lapped courses, plank seams and knots, daub weave, ashlar joints (bump + roughness maps, `buildingSurfaces.ts`). Ours were flat vertex colours with one shared grain.
- Stepped, overhanging roof: four stacked slabs, so the thatch reads as layers with a hard shadow line under each, not one cone.
- Dark framed door plus a dark side window and a stoop slab, giving a clear focal point and scale.
- A single clear silhouette at mid distance (low wide mass, big roof), warm against cool ground. Little trim noise.

## What was added (procedural, inside the carved budgets)

`dressDwelling(parts, mats, rng, opts)` reads the massing a generator emitted (wall block or drum, roof cone or gable, door) and appends seeded parts. Near-only unless it must read at mid zoom (lod 1: wall courses, thatch ledges, base skirt, lashing band).

- Walls: courses, or post-and-rail daub frame, or log ends at corners; mud-plaster patches (count rises with wear); lashing band with knots; earth skirt or footing stones; soot smear over the door.
- Roofs: stepped thatch ledges with lap lines (cones), lap lines on gables, ragged eave fringe, rafter ends, ridge roll, ridge pole ends, offset smoke hole with cap or dark patch.
- Yard: 1 to 4 of firewood stack, pots, leaning tool, sack, hanging herbs, bench, jar, chosen per building and mirrored away from the door.
- Richness is budgeted: busy massings (rich-era houses) get fewer extras, and added parts are trimmed to the remaining near-tier triangles.

## Variety

- `civBuildings.poor()`: per-building wall size, height, roof pitch and overhang; larger door offset; nilemark, hanrei, vedara, aureline, kaaltun and sahelan now pick between 2 to 3 forms (round hut, flat parapet block, hipped box, sod gable, cone hut) so civs no longer share one round hut.
- `buildingStyleMap.carvedVariantFor`: for a skinned society the variant index is the building id (`SKIN_DWELLING_VARIANTS = 64`; workshops 32), so two huts in one village never share geometry. Draw calls grow with distinct buildings in view, bounded by the layer's 192-bucket eviction. Unskinned (neutral Village) keeps the old small pool (tests pin it).
- Per-village heraldry (finial, rim trim, banner) is untouched and still applied after the base build.
- Ghost placement uses `carvedVariantFor`/`variantSpec`, the same builder; nothing forks.

## Palette

No global palette change. The approved civ swatches still show (some are saturated: aureline teal, nilemark blue trim, aureline green). `setBuildingMute(true)` desaturates every civ swatch (saturation x 0.55, cap 0.4, lightness x 0.93); it is part of the variant key, so it can be flipped at runtime. Option H "V1 honey stone and plaster" is the existing opt-in `setCarvedPalette('honey')` and the concept boards; it was not changed. Previews: `BUILDING_MUTE=1 tools/render-preview/building-detail-sheets.sh after-muted`.

## Where to look

- Renders: `docs/renders/building-detail/` (`before-*`, `after-*`, `after-muted-*`; `mid-a/b` = 7 civs x 6 huts, `close-1..7` = 2 civs x 6 huts, `house-variety-mid-a/b` = 4 era-3 houses per civ).
- Re-render: `NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=<three> tools/render-preview/building-detail-sheets.sh before|after|after-muted`.
- Known gaps: era 2+ civ houses (hand-authored towers, courtyards) get lighter dressing because their massing already uses most of the near budget; civic halls and markets are not dressed; the carved material still has one shared grain map (no per-material thatch/plank texture), which is the next step if Boris wants Codex-level surface texture.
