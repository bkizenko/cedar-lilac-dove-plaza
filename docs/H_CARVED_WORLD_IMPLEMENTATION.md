# H carved-world implementation prototype

Planning only, November 10, 2026. This document changes no live renderer, model or saved village. It specifies the next reviewable 3D prototype and its performance qualification.

## Exact visual reference

Use the **bottom-centre H panel** of the original D–I sheet:

`/Users/boriskizenko/Documents/Hearthwild Art Archive/concept-sheets-2026-11-10/exec-f8893bda-4867-47a5-8334-5e27a5ee4ed2.png`

The sheet was opened and inspected for this plan. H is a carved wooden tabletop world: honey-coloured grain runs over rounded hills and miniature buildings; hills show laminated contour edges; trees have rounded olive crowns and carved trunks; the river is muted blue; roads are light inlays; controls are small and white. It is not a photorealistic medieval village with a warmer colour grade. The later `village-H-E-comparison.png` misrepresented H and must not replace this reference.

Keep **E, the top-centre panel on that same sheet**, intact as a separate approved comparison. Keep the current graphics tag `art-baseline-2026-11-10-ebdb6e2` and its archived playable release. Prototype H as a selectable visual pack in an isolated test session; changing a visual pack must not regenerate terrain, move buildings, alter inventories or overwrite a village save.

### Style rules

- Actual 3D depth, open doorways, modeled roof edges and work tools. Wood colour alone on current boxes is insufficient.
- A common carved material language across terrain, architecture and figures, with restrained olive vegetation and blue water.
- Beveled silhouettes and visible construction joints. Variation should look handmade, structurally intentional and culturally coherent.
- Terrain is a carved landscape, not a giant rectangular plinth under each object. Hearths are a few stones and a fire; fields lie on the land; ordinary houses and shelters meet it on small footings/posts. Large engineered terraces belong to appropriate civic or defensive structures.
- Keep the existing compact command language. No glossy reward buttons, ornate mobile-game frames, exaggerated building upgrade sparkle, plastic saturation or floating resource numerals across the landscape.

Initial **proposed** swatches, chosen visually rather than claimed as exact image samples: honey wood `#B98249`, light cut wood `#D4AA6C`, grain shadow `#83542D`, olive crown `#747349`, river `#6F9C9B`, path inlay `#CBB88C`, UI ivory `#F3EEE1`. Lighting and exposure must preserve material distinction without turning night into a black screen.

## Translate the existing scene, rather than build a second game

| Surface | Existing integration point | H prototype |
|---|---|---|
| Terrain | `src/scene/terrainSurface.ts`, `world.ts`, `bankTerrainLayer.ts`, `excavationSurface.ts` | A shared world-space wood-grain material and elevation-contour treatment bound to the actual terrain. Keep the current bank/excavation sampling contract. |
| Rivers and lakes | `depthWater.ts`, `src/game/riverSurface.ts`, `bankSurface.ts` | A matte blue inlay/water surface with continuous bends, restrained longitudinal flow and contact shading at the carved banks. |
| Houses and workshops | `meshes.ts`, `architecture.ts`, `productionWorkplaces.ts`, `buildingGrounding.ts`, `groundContacts.ts`, `plotModules.ts` | New coherent mesh families with authored contact points, entrances and expansion modules. Retain physical footprints and interaction approaches. |
| Materials and variation | `buildingSurfaces.ts`, `buildingCharacter.ts`, `buildingCraftsmanship.ts` | Shared wood palette/atlas; local grain direction follows beams and roof pieces. A saved design specification chooses actual silhouette variants, not only a 2% roof scale. |
| Plants | `vegetationKit.ts`, `biomeVegetation.ts`, `wildPlants.ts`, `contourFields.ts` | Rounded carved broadleaf crowns, distinct conifers, scrub and riparian reeds; crops retain type, maturity and seasonal condition. |
| People and props | `world.ts` unit/cargo/work effects, `wornGarments.ts`, `waterVesselLayer.ts` | A shared stylized figure rig and readable work clips, with actual owned equipment attached to the right hand/body/socket. |
| Submission and measurement | `instanceCameraCull.ts`, `entityFrustumCensus.ts`, `renderMetrics.ts`, game runtime profile | Reuse visibility filtering and actual frame accounting. Add style-pack asset residency measurements; do not infer memory from visible triangles alone. |

### Terrain grain and laminated contours

Start with material shading on the **same rendered/collision surface**. Use a low-frequency grain field with a small reusable detail texture, not a unique high-resolution image for every region. Blend side/end grain by the actual surface orientation. Bands follow true elevation, with broad, soft transitions on gentle ground and stronger layer edges on steep rock faces. Fade fine grain at distance to prevent shimmering.

The laminated look must not flatten the world's hills, valleys, terraces, canyons or island variation. Avoid changing all walkable slopes into stairs. A later close-view geometry pass may model carved ledges on nonwalkable cliff sides, but the ground used for feet, fields, structures and boats must still match the common height sampler. If geometry changes traversal, that is a separate terrain/gameplay change requiring full navigation qualification.

### Rivers

Use the real river centreline, width, elevation, confluences and water mask. Resample curved bends consistently in the bank and water meshes. No zigzagging tile edges, gaps at joins, vertical black strips or independently smoothed water floating above a different channel. The H style can simplify water reflection; it cannot excuse blocky or incoherent rivers.

Low uses an opaque/matte blue surface where appropriate and a single subtle flow pattern. Medium may add shallow/deep tint, restrained highlights and foam at real falls. No planar reflection camera or screen-space reflection in the first prototype. Docks, rowers, water collection and fishing sections still use physical water state. Visual flow is not proof of usable mill power; mills require separately measured current/head and mechanics.

## A varied building family

Prototype eight functional silhouettes first:

1. Round reed/timber dwelling with an offset porch, then a rectangular plank house with a different roof axis.
2. Open-sided crafting shelter with visible bench/tools.
3. Low stone-ring hearth without a canopy or broad platform.
4. Threshing yard with a grounded work surface, sheaf piles and flails.
5. Grinding shelter with a distinguishable quern and flour sacks.
6. Bread oven with a visible oven mouth, fuel stack and preparation table.
7. Storehouse with real door and cargo frontage, shaped differently from a home.
8. Mill house at a usable river/bridge location, or an unpowered model clearly labeled as a visual example until mechanics exist.

For each family author at least three base floor/roof plans. Vary roof ridge direction, one/two bays, porch location, frontage, annex, entrance and wear within a finite shared parts kit. Keep required work positions, upgrade sockets, collision footprint and door clearance stable. Terrain contact can change post lengths and step a large structure's bays; it must not squash or tilt an entire house arbitrarily.

A deterministic design record should contain `generatorVersion`, campaign/culture/settlement/building seeds, family, plan, roof, material, trim and permitted modules. Save that record or a reproducible versioned reference. Existing saves receive a deterministic visual assignment; reloading cannot reshuffle the village. New games vary the combinations. Detect near-duplicate important silhouettes, but do not claim a finite parts catalogue can mathematically guarantee every possible future map/building is globally unique.

Apply the same carved language to the approved Ring Observatory, Crescent Harbor, Cascade Garden, Canyon Cistern, Assembly Court and Mill Market. Preserve their original approved sheet and three existing GLB blockouts. They establish shapes, not finished textured/rigged assets or implemented wonder functions. Do not give every culture the European church silhouette visible in H's illustrative village.

## Character motion that communicates work

One shared rig and a small body-proportion range are sufficient initially. Author idle, walk, loaded walk, thresh, winnow, grind, oven work, chop, row and melee/ranged combat clips. Connect clip selection to the actual simulation phase. A milling worker should move a handstone; a waiting worker should not play a work loop; a sailor should occupy the boat. Props, clothing and weapons must match inventory.

Begin with one male/female-neutral base proportion and interchangeable clothing/equipment silhouettes rather than a unique skeletal model for every resident. Use a small near-camera animated pool, with baked/interpolated pose data for middle distance and static simplified figures at map distance. The pool changes presentation, never resident identities or task progress. Do not create an `AnimationMixer` plus independent textures/materials for every distant resident. Validate hands against tools, feet on slopes, load changes and interrupted jobs before multiplying clips.

## Apple M1, 8 GB: provisional budgets to test

These are **targets for the prototype**, not measurements or promised FPS. The shipped pixel ceilings are now 0.8 million Low (b4bc89f; native disposable-browser observation799617pixels) and 2.1 million Medium; shadows default off. Keep those existing limits and native-resolution HTML controls.

| Budget | Low | Medium |
|---|---:|---:|
| Ordinary building close/mid geometry | roughly 1–3k / 300–800 triangles | roughly 2–6k / 500–1,500 triangles |
| Wonder close geometry | 8–15k triangles | 15–30k triangles |
| High-detail animated people pool | 0–4, with cheaper pose animation elsewhere | 8–12, with cheaper pose animation elsewhere |
| Submitted scene geometry, initial target | ≤450k triangles | ≤800k triangles |
| Draw calls, initial target | ≤120 per composited frame | ≤180 per composited frame |
| Resident style textures, proposed ceiling | 32 MiB decoded GPU texture estimate | 64 MiB decoded GPU texture estimate |
| Live real-time shadows | off | off initially; explicitly optional later |
| Water reflection passes | none | none |

Use shared atlases and materials, instanced static modules, bounded animation data and mipmaps. Inspect actual draw-call totals across all postprocessing passes; checking a single scene pass undercounts cost. Texture count alone is not texture memory. Track texture dimensions/formats, geometry buffers, renderer resources, browser heap estimates and process/unified-memory pressure separately.

Not drawing an unseen region reduces submission/GPU work but does **not** automatically release its memory. Partition static scenery into spatial chunks, retain the visible region plus a small adjacent margin, and use a bounded cache with reference-counted disposal of unneeded GPU resources. Reuse shared materials/geometry when chunks unload; no per-camera-move disposal/rebuild storm. Keep whole-map simulation, saved inventories, terrain, rivers and actors running independently. No despawning traders, raiders, animals or remote workers to meet a graphics budget.

## First reviewable deliverable and acceptance

Build one isolated **playable H river-settlement slice** using an actual saved village and its unchanged seed/terrain. Include the eight building silhouettes above, a smooth river bend, one slope-adapted farm, rounded broadleaf and distinct conifer trees, one working food chain and one rowing boat. Use the exact same camera bookmarks for current graphics, H and retained E references. Do not generate another illustration and call it a game capture.

Review close, working and wide views in spring/autumn/winter; UI idle, selected person, workshop queue, construction, knowledge and first contact. Show source reference and actual prototype together. Capture only the minimal temporary comparison images needed for review, then remove diagnostic screenshots after the fix; preserve user-requested reference sheets and approved assets.

Acceptance requires:

- H is recognizably the original carved world, including terrain grain/contours, not just warm roofs.
- Buildings and workstations are identifiable by silhouette; ordinary bases are not larger rectangular slabs; doors, footings, fields and river joins align with actual ground/water.
- Crops/trees/people update at all LODs, without surviving canopies, detached tools or changed ownership on zoom.
- A work animation corresponds to actual input/work/output; camera changes and art switches conserve all simulation state.
- Same 30/100/300-resident saves at 1× and 4×, with idle/work/raid scenes and repeated camera travel. Report p50/p95/p99 frame gaps, long stalls, simulation/scene/draw/interface/save costs and memory trend.
- Native M1 qualification aims for p95 ≤16.7 ms in the standard scene and ≤33.3 ms in the 300-person Medium stress scene. Software-rendered headless checks prove rendering correctness only. If the budget fails, reduce detail, view range, water effects and nearby animation pool before removing gameplay.

Only after that review should the style pack expand to additional cultures, naval forces, armor, flags and generated wonder families. The full backlog remains active; this prototype does not replace food reliability, geography, diplomacy or combat work.

## Fidelity clarification and actual host — 2026-11-11

User explicitly means matching the original H image's material, form, detail and composition in navigable3D, not reusing the current crude models with wood colors. Earlier generated wonder pictures are illustrations unless a real model/renderer capture exists. Do not call those pictures proof of delivered3D. Keep visual overhaul in chat review and separate from the live village.

Read-only host inspection: MacBookAir10,1; Apple M1,7GPUcores,8GBunifiedmemory;2560×1600display. This establishes the hardware, not measured performance of a nonexistent H scene. The current scene already instances many repeated objects; the improvement requires better assets and shading plus measured budgets, not merely introducing the word instancing.

A credible full-H candidate uses actual bevels/recesses/roof silhouettes and modular construction, baked material/AO/normal detail, consistent grain direction, restrained blue water, smooth contact shading, LODs that preserve silhouette, shared compressed texture sets, and camera-local high detail. Ordinary houses must not sit on oversized square slabs. Avoid allocating unique4K textures for every house or separate animated rigs for hundreds of offscreen units. Not drawing offscreen objects does not release memory; bounded asset residency and explicit disposal are separate requirements.

Proposed interactive review: orbit an actual house, mill and terrain/river slice in daylight, then a living settlement. Show close/normal/wide views with honest native frame timing and process/memory trend. Initial busy-scene target30fps sustained (p95framegap≤33.3ms),60fps where feasible; do not promise measured throughput or near-photographic offline lighting. Existing earlier60fps targets remain stretch targets pending this actual host prototype. No acceptance credit from generated pictures or software-rendered headless FPS.

Sources: [Three.js object submission costs](https://threejs.org/manual/pages/optimize-lots-of-objects.html); [Three.js decoded texture memory](https://threejs.org/manual/pages/textures.html); [Blender render baking](https://docs.blender.org/manual/en/latest/render/cycles/baking.html). These support implementation techniques, not a guarantee of matching the concept or FPS.
