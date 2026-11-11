# Batch handoff — Claude Experience

- **Lane / task ID:** A-Experience, Deliverable 1 — opt-in Option H render style (palette, carved terrace, structural building generator), compact H UI foundation, budget note. Coordination gaps G2, G3, G4 from `agents/claude-coordination` `docs/parallel/handoffs/claude-coordination.md`.
- **Owner / claimed files:** Claude Experience. All files below are new or Experience-owned; no shared file edited. `src/scene/world.ts`, `src/game/*`, renderMetrics/culling, `FULL_GAME_BACKLOG.json`, `CURRENT_STATUS.md` untouched.
  - `src/scene/carvedPalette.ts`, `carvedTerrace.ts`, `buildingParts.ts`, `buildingFamilies.ts`, `buildingStyleMap.ts`, `carvedMesh.ts`, `carvedBudget.ts`, `renderStyle.ts` (pure, tested)
  - `src/scene/carvedBuildingLayer.ts` (three.js adapter, **unexecuted**)
  - `src/ui/h/theme.css`, `compactModel.ts`, `CompactParts.tsx`, `portraitModel.ts`, `LeaderPortrait.tsx`
  - `src/scene/wonderPlans.ts` (pure, tested)
  - `scripts/carved-buildings.test.mjs`, `scripts/render-style.test.mjs`, `scripts/h-compact-ui.test.mjs`, `scripts/wonder-plans.test.mjs`
- **Base main / branch / commit:** base `8f635f6` (origin/main, unchanged at last fetch) / `agents/claude-experience` / head: see `git log` (commits listed in the final section).

## Item status (backlog IDs)

| Item | Backlog / gap ID | Status |
|---|---|---|
| Option H carved palette, light rig, grain, terrace colours | astra_tasks `18` (Cohesive environment pack pass) | source pushed |
| Structural building families keyed to stable building IDs | request_audit row "More useful buildings, Dawn of Man breadth"; astra `18` | source pushed |
| Era/wealth variants per building ID; per-village tradition | G3 | source pushed |
| Golden-hour-dominant daytime grade (H rig only) | G2 | source pushed (grade function; Codex daylight wiring needed) |
| Leader encounter portrait presentation | G4 | source pushed (Societies wires content) |
| Compact H UI tokens/components | astra_tasks `21` (HUD and teaching pass) | source pushed |
| Far impostor cards + single shared vertex-colour material | coordination board perf item | source pushed (adapter unexecuted) |
| Seeded wonder plans: Ring Observatory, Cascade Garden (`src/scene/wonderPlans.ts`) | qa_additions `QA-050` | source pushed |

## Before → after

Before: live graphics only; WIP generator (a3755ea) unreviewed. After: nothing changes in the running game (render style defaults to `classic`; no live file wires the new layer). New pure modules generate footprint-true, structurally varied carved buildings and their triangle meshes; an adapter and UI parts are ready for opt-in integration.

Review fixes to the crashed WIP: 4-sided cone caps were inset by 1/√2 (tower/gate/church roofs narrower than walls) → new `pyramid` shape; longhouse "hips" were vertical-backed wedges poking out of the roof → true `hip` shape; palisade/gate segments left 20 cm gaps between cells → wall margin 2 cm; palisade stake count used width not wall length; windows now dark `recess`; carved roof course lines (near LOD) added; palette re-measured from the original board (wood hue 27–31°, sat ~0.6; the proof's default "natural" palette was grey-brown and its "warm" palette rendered beige under the game's cool sky light — hence a warm H light rig).

## Shared contracts

- Building identity: input `{worldSeed, type: BldType, id, era, habitat, footprint (w,d from the Building), waterSide?, wallAxis?, settlementSeed?, prosperity?}`; output variant key + `BuildingSpec` (metres, Y up, origin at footprint base centre, entrance +Z). Deterministic; generator version is implicit in source — a save should store nothing new (all inputs already exist), so no migration.
- Unmapped types (farm, pen, dock, bridge, quarry, keep, stables, university, cairn, grove, cornerstone, stonewall, trench, moat, threshingFloor) return `null` → keep the classic renderer.
- Render style: `resolveRenderStyle(search, stored)` → `'classic' | 'carvedH'`, default classic; `?render=h` opts in.

## Interface requests

- **Codex:** (1) render-style setting in graphics settings using `src/scene/renderStyle.ts` values (or rename — tell me); default classic. (2) LOD/culling hook: per-building camera distance or tier + frustum pre-filter, so `CarvedBuildingLayer.sync(instances, cameraPos, tierFor)` receives visible buildings only. (3) world.ts call site when style = carvedH: hide classic building meshes for mapped types, build `CarvedInstance[]` (x, y = foundation level, z, yaw from facing/gate rotation, progress = build fraction), call `applyCarvedLightRig` once and keep its restore. (4) daylight: lerp sun/hemi towards `carvedDaylightGrade(t)` in H style only, without changing daylight share. (5) Render-check on integration — I cannot.
- **Grok:** terrain height sampler `(x,z)=>y` and water level for `carvedTerrainColorsForPositions`; path/trail weight `(x,z)=>0..1` for inlaid paths; `waterSide` for grinding-stone sites adjacent to flowing water; settlement identity (founding hall id) for `settlementSeed`; biome → `habitat` mapping (`plains|forest|hills|desert|tundra|wetland`).
- **Societies:** wire `LeaderPortrait` beside `LeaderConversation` with actual relation value and observed goods only.

## Checks (executed here)

```
node --import ./scripts/game-loader.mjs --test scripts/carved-buildings.test.mjs   # 18/18 pass (incl. G2/G3)
node --import ./scripts/game-loader.mjs --test scripts/render-style.test.mjs       # 1/1 pass
node --import ./scripts/game-loader.mjs --test scripts/h-compact-ui.test.mjs       # 5/5 pass (incl. G4)
node --import ./scripts/game-loader.mjs --test scripts/wonder-plans.test.mjs       # 7/7 pass
```
Total: **31/31** pass (18 + 1 + 5 + 7).
Type check: repo `tsc --noEmit` cannot run here (tsc 7 rejects `baseUrl`; no node_modules). A scratch strict tsconfig over every new file reports **0 errors** in pure TS/TSX; the only errors are missing `three` type members from an `any` stub (expected without node_modules). New files introduce no errors in existing files.

## Evidence limits — read this

**Nothing was rendered, screenshotted or visually reviewed.** three.js is not installed here; `carvedBuildingLayer.ts`, `CompactParts.tsx` and `LeaderPortrait.tsx` have never executed. Palette numbers are measured from the board PNG, but warmth on screen depends on the adapter's sRGB→linear conversion, the H light rig and tone mapping — must be judged against the original board H (not the H/E comparison) in a real render. Tests prove geometry contracts (footprint, ground, determinism, variation, counts), not beauty.

## Budget note (ESTIMATES, unmeasured on M1/8 GB)

Triangles per building, avg / max, at near (<30 m) / mid (30–70 m) / far (70–120 m); beyond 120 m every building is a 4-triangle impostor card:

| Family | avg near / mid / far | max near / mid / far |
|---|---|---|
| roundhouse | 215 / 113 / 77 | 244 / 136 / 84 |
| cottage | 272 / 136 / 35 | 340 / 172 / 44 |
| longhouse | 143 / 105 / 20 | 236 / 164 / 20 |
| granary | 543 / 406 / 188 | 716 / 560 / 248 |
| storehouse | 253 / 74 / 32 | 304 / 100 / 40 |
| watermill | 346 / 248 / 80 | 368 / 260 / 80 |
| quernShelter | 160 / 148 / 68 | 160 / 148 / 68 |
| workshop | 256 / 148 / 87 | 364 / 232 / 188 |
| palisade (4 m) | 432 / 288 / 12 | 432 / 288 / 12 |
| gate | 113 / 113 / 77 | 136 / 136 / 100 |
| tower | 252 / 160 / 55 | 362 / 210 / 66 |
| church/temple | 380 / 96 / 50 | 458 / 122 / 78 |
| market stalls | 381 / 360 / 122 | 524 / 484 / 160 |
| hearth | 185 / 158 / 118 | 232 / 184 / 144 |

Village estimates (`estimateVillage`): 60 buildings spread 10–190 m → ~6.2k tris, 37 draw calls (+36 shadow), ~0.9 MB resident geometry; 60 buildings all near → ~20k tris, 29 draws, ~1.5 MB; 150 buildings → ~9.2k tris, 47 draws, ~1.1 MB. Memory: 48 B/vertex non-indexed (pos, normal, colour, uv, grain); one 256² grain texture (256 KB + mips); one shared material, so one shader program. Draw calls scale with distinct (variant × LOD) buckets (cap 192), not building count — well inside an 8 GB shared-memory budget; the likely limit is draw submission and shadows, so mid/far buckets do not cast shadows. If draws are the bottleneck, next step is merging static same-LOD buildings per terrain chunk (BatchedMesh) — needs Codex's chunk/culling seam.

## Wonder plans (QA-050, first two of six approved families)

`generateWonderPlan(family, worldSeed, siteId, footprint)` → parts (same carved pipeline/palette), functional spaces with purposes and areas, circulation (entrances, paths, stairs with rise/tread), and five construction stages with physical volumes (m³ stone/timber/cloth/planting; no prices — Codex). Versioned (`WONDER_GENERATOR_VERSION=1`) for save reproduction. Ring Observatory: interrupted ring of 16–24 segments, arched openings with piers, entry stair, sight slot proven unobstructed from the court, gnomon and sighting frames. Cascade Garden: 2–4 terraces with real retaining walls, a water spine whose cascades equal the wall heights, stair flights to every terrace (rise ≤ 0.2 m, tread ≥ 0.28 m) in lanes kept clear of beds/trees/channels, top pergola. Based on the approved sheet and the GLB blockout descriptions; site slope/water source must come from Grok before placement. Crescent Harbor, Canyon Cistern, Assembly Court and Mill Market are not yet generated.

## Remaining / next

- Codex integration items above; then a real H vs E side-by-side review at fixed layout/camera (close/mid/wide) before any default change.
- Not yet mapped: farm, pen, dock, bridge, keep, stables, university, cairn, grove, stonewall, threshing floor. Trees/foliage carved instancing not yet written (palette tokens exist). Units/people unchanged.
- Rollback: revert the branch commits; no live file depends on them.
- **State:** source pushed; not ready-to-merge as runtime (adapter unexecuted); pure modules + tests safe to merge any time. Overall acceptance unchanged at **34/98**; this batch's verified-acceptance share is 0 gates (no published native evidence).
