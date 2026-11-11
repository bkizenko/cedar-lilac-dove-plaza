# Batch handoff — Claude Experience

- **Lane / task ID:** A-Experience, Deliverable 1 — opt-in Option H render style (palette, carved terrace, structural building generator), compact H UI foundation, budget note. Coordination gaps G2, G3, G4 from `agents/claude-coordination` `docs/parallel/handoffs/claude-coordination.md`.
- **Owner / claimed files:** Claude Experience. All files below are new or Experience-owned; no shared file edited. `src/scene/world.ts`, `src/game/*`, renderMetrics/culling, `FULL_GAME_BACKLOG.json`, `CURRENT_STATUS.md` untouched.
  - `src/scene/carvedPalette.ts`, `carvedTerrace.ts`, `buildingParts.ts`, `buildingFamilies.ts`, `buildingStyleMap.ts`, `carvedMesh.ts`, `carvedBudget.ts`, `renderStyle.ts` (pure, tested)
  - `src/scene/carvedBuildingLayer.ts` (three.js adapter, **unexecuted**)
  - `src/ui/h/theme.css`, `compactModel.ts`, `CompactParts.tsx`, `portraitModel.ts`, `LeaderPortrait.tsx`
  - `src/scene/wonderPlans.ts` (pure, tested)
  - `scripts/carved-buildings.test.mjs`, `scripts/render-style.test.mjs`, `scripts/h-compact-ui.test.mjs`, `scripts/wonder-plans.test.mjs`
- **Base main / branch / commit:** started from `8f635f6`; merged origin/main `860863a` / `agents/claude-experience` / head: see `git log` (commits listed in the final section).

## Item status (backlog IDs)

| Item | Backlog / gap ID | Status |
|---|---|---|
| Option H carved palette, light rig, grain, terrace colours | astra_tasks `18` (Cohesive environment pack pass) | source pushed |
| Structural building families keyed to stable building IDs | request_audit row "More useful buildings, Dawn of Man breadth"; astra `18` | source pushed |
| Era/wealth variants per building ID; per-village tradition | G3 (board; no backlog ID yet) | source pushed |
| Golden-hour-dominant daytime grade (H rig only; winter/storm/night exceptions kept) | `CHAT-G2-GOLDEN-HOUR` (G2) | source pushed (grade function; Codex daylight wiring needed) |
| Leader encounter portrait presentation | `CHAT-G4-LEADER-PRESENTATION` (G4) | source pushed (Societies wires content) |
| Compact H UI tokens/components | astra_tasks `21` (HUD and teaching pass) | source pushed |
| Far impostor cards + single shared vertex-colour material | coordination board perf item | source pushed (adapter unexecuted) |
| Seeded wonder plans: Ring Observatory, Cascade Garden (`src/scene/wonderPlans.ts`) | qa_additions `QA-050` | source pushed |

## Before → after

Before: live graphics only; WIP generator (a3755ea) unreviewed. After: nothing changes in the running game (render style defaults to `current`; no live file wires the new layer). New pure modules generate footprint-true, structurally varied carved buildings and their triangle meshes; an adapter and UI parts are ready for opt-in integration.

Review fixes to the crashed WIP: 4-sided cone caps were inset by 1/√2 (tower/gate/church roofs narrower than walls) → new `pyramid` shape; longhouse "hips" were vertical-backed wedges poking out of the roof → true `hip` shape; palisade/gate segments left 20 cm gaps between cells → wall margin 2 cm; palisade stake count used width not wall length; windows now dark `recess`; carved roof course lines (near LOD) added; palette re-measured from the original board (wood hue 27–31°, sat ~0.6; the proof's default "natural" palette was grey-brown and its "warm" palette rendered beige under the game's cool sky light — hence a warm H light rig).

## Shared contracts

- Building identity: input `{worldSeed, type: BldType, id, era, habitat, footprint (w,d from the Building), waterSide?, wallAxis?, settlementSeed?, prosperity?}`; output variant key + `BuildingSpec` (metres, Y up, origin at footprint base centre, entrance +Z). Deterministic; generator version is implicit in source — a save should store nothing new (all inputs already exist), so no migration.
- Every current `BldType` is now mapped (batch 2); only an unknown future type returns `null` → classic renderer. In live use `grindingStone` is ALWAYS a quern shelter; a powered watermill needs the review-only input `reviewWatermill:true` (Codex review). `lit?:boolean` must carry the real fire state (omitted = lit, preview only).
- Render style: Codex's `graphics.ts` contract (`'current'` default, `'optionH'` opt-in); `resolveRenderStyle(search, stored)` adds a review-only `?render=h` override.

## Interface requests

- **Codex:** (1) DONE on main: `src/game/graphics.ts` `RenderStyle='current'|'optionH'`; `src/scene/renderStyle.ts` now consumes it (plus a non-persisted `?render=h` review override) — no second stored key. (2) LOD/culling hook: per-building camera distance or tier + frustum pre-filter, so `CarvedBuildingLayer.sync(instances, cameraPos, tierFor)` receives visible buildings only. (3) world.ts call site when style = carvedH: hide classic building meshes for mapped types, build `CarvedInstance[]` (x, y = foundation level, z, yaw from facing/gate rotation, progress = build fraction), call `applyCarvedLightRig` once and keep its restore. (4) daylight: lerp sun/hemi towards `carvedDaylightGrade(t)` in H style only, without changing daylight share. (5) Render-check on integration — I cannot.
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
- Units/people unchanged. Tree/trade/wonder specs below are pure; no adapter for trees, caravans, parcels, or the trade dialog icons exists yet.
- Rollback: revert the branch commits; no live file depends on them.
- **State:** source pushed; not ready-to-merge as runtime (adapter unexecuted); pure modules + tests safe to merge any time. Overall acceptance unchanged at **34/98**; this batch's verified-acceptance share is 0 gates (no published native evidence).


---

## Batch 2 (this branch, merged with origin/main; nothing rendered)

Commits (oldest first): `bb26421` remaining building types + Codex review fixes; trees commit; `506c9f5` caravan/parcel specs; `cfeac67` trade dialog; WIP commits for harbour/market; final commit "wonder plans: Crescent Harbor and Mill Market + tests + handoff" (see `git log`).

### Item status (backlog IDs; FULL_GAME_BACKLOG.json and CURRENT_STATUS.md untouched)

| Item | Backlog / gap ID | Status |
|---|---|---|
| Remaining building types carved: farm=`fieldPlot`, pen, dock=`pier`, bridge, keep, stables, university=`college` (stoa early / collegiate hall+cloister later), quarry, cairn, grove, cornerstone=`outpost`, threshingFloor, stonewall, trench, moat. Each has a real-world reference, era/material/climate/wealth/tradition variation, footprint-true parts (field/pen/quarry are many thin functional pieces, never one platform; tests cap any flat slab at 70% of the footprint) | request_audit "More useful buildings"; astra `18`; G3 | source pushed, tests pass (not rendered) |
| Codex review fixes: `rotateParts` transforms `beam.ends` (quarter-turn-after-fit test); every retained LOD tier supported (`ensureTierSupport` adds a far-tier pier under anything a coarse tier would leave floating, tested at tiers 0/1/2 on ~4k specs); grindingStone stays a quern; fire only when `lit` | Codex review (coordination.md "Codex response") | source pushed, tests pass |
| Trade dialog view model + `TradeDialog.tsx` | user priority: trade presentation | model tested; TSX unexecuted |
| Caravan carved models (pack animal, sled, cart, boat per hull class, market stall), armed-escort variant, real-cargo loads, dropped parcel | same; item 107 (Societies parcel request) | source pushed, tests pass |
| Carved trees (broadleaf, conifer, cypress, shrub) | astra `18` | source pushed, tests pass |
| Wonder plans 3 and 4: Crescent Harbor, Mill Market | `QA-050` | source pushed, tests pass; 4 of 6 families done (Canyon Cistern, Assembly Court remain) |

### New files
`src/scene/buildingHelpers.ts` (shared types/helpers, split out of buildingFamilies), `buildingFamiliesExtra.ts` (15 new families), `carvedTrees.ts`, `goodsVisuals.ts`, `caravanModels.ts`, `hullSizes.ts`; `src/ui/h/tradeModel.ts`, `TradeDialog.tsx`; tests `scripts/carved-trees.test.mjs`, `caravan-models.test.mjs`, `trade-dialog.test.mjs` (+ extended `carved-buildings.test.mjs`, `wonder-plans.test.mjs`). Edited: `buildingFamilies.ts` (registry merge, rotateParts, tier support), `buildingStyleMap.ts`, `carvedBudget.ts`, `carvedBuildingLayer.ts` (cache key only: adds `reviewWatermill` and `lit`), `wonderPlans.ts`.

### Generator inputs added
`reviewWatermill?`, `lit?`. Dock takes `waterSide` (deck runs toward that side). Bridge turns to its long axis from the footprint (w>d means east-west). Stone wall/trench/moat take `wallAxis` `'x'|'z'|'corner'`; a corner joins the +X and +Z neighbours, the adapter must yaw it for other corners. Bridge piles/piers stand on y=0 (bank level): the renderer or Grok must extend them to the bed.

### Trade dialog (`src/ui/h/tradeModel.ts`) input interface (placeholder until the Societies trade slice lands; map real shapes onto it)
`TradeDialogInput = {player:SideInput, partner:SideInput, leader:{name,society,relation?}, proposal:{give:Stack[],get:Stack[]}|null, limits?:{hardBlock?,atWar?,routeBlocked?,carryCapacity?,counterAllowed?}}`, `Stack={kind,amount,label?}`, `SideInput={name,held,offers,wants,knowledge:'exact'|'observed'|'unknown'}`. Partner stock is shown only per `knowledge`; unknown shows nothing; observed stock never blocks a deal. Relation → stance via the existing `stanceFor`; undefined stays "unknown". Exactly one blocker, ranked: sim hard block 100, war 95, hostile 90, route 80, empty/one-sided proposal 74-75, player short 70, partner exactly known short 60, carry capacity 50, same good both sides 40. Counter stays enabled on shortage, disabled on hard blocks. Chips merge duplicate kinds, sort by amount, show 6 then "+N more". Icon ids come from `goodIconId`; the icon art/CSS (`h-good-*`) does not exist yet.

### Caravan / stall / parcel specs (`caravanModels.ts`, `goodsVisuals.ts`)
`caravanSpec({carrier:'packAnimal'|'sled'|'cart'|'boat'|'stall', seed, cargo:[{kind,amount}], capacity?, escort?, boatClass?})`. Loads come ONLY from the passed cargo; empty cargo draws an empty carrier; fill = held/capacity decides how many load units; every kind present gets at least one unit while slots remain and `cargo.overflowKinds` reports what could not be shown. Boat footprints equal `hullSize(seats)` (2.6+0.9*seats long, 0.55+0.22*seats wide) for `riverboat|scoutCanoe|freightPunt`; a test fails if `src/game/boatClasses.ts` gains a class or changes seats. Escort adds a guard with spear, shield and iron helm beside the carrier (footprint widens 0.8 m). `parcelSpec(kind, amount, seed)`: 1-6 units by amount, footprint about 1.2 m. Goods kinds covered: grain, pulses, tubers, berries, provisions, bread, porridge, fish variants, meat variants, milk, wood, stone, copper, iron, cordage, pottery, hides, cloth; unknown kinds get a crate.
Triangles (exact counts, not measured on device): carriers at most 1400 near / 700 far in tests.

### Trees (`carvedTrees.ts`)
4 species x 4 structural variants, tiers near/mid/far plus 4-triangle crossed-quad impostor beyond 110 m (`TREE_LOD_DISTANCES=[25,60,110]`). Per-tree variety is instance data (scale, yaw, lean, season tint), geometry shared per species x variant x tier. `speciesMix(habitat, moisture)`, `treeInstance({worldSeed,id,habitat,moisture?,season?,growth?})`; the season and growth inputs must be real state. Triangle caps per variant: near 520, mid 150, far 40. ESTIMATE per 1,000 trees: typical view (5/20/40/35% near/mid/far/impostor) about 42k triangles, 52 instanced draws, 0.75 MB resident; dense view (30/30/30/10%) about 106k triangles. Unmeasured on the M1/8 GB; shadows from trees are not budgeted.

### New-family triangle estimates (avg near / mid / far, exact part counts)
fieldPlot 705/620/136, pen 695/629/130 (scales with dragged size; 28 m pen capped under 3200 near in a test), pier 676/475/50, bridge 729/518/40, keep 448/180/61, stables 384/198/20, college 533/346/210, quarry 373/111/42, cairn 403/244/190, grove 763/507/428, outpost 262/192/104, threshing 651/410/64, stoneWall 103/56/24, trench 105/28/28, moat 80/52/12. All inside the existing caps (2600/1400/700).

### Wonder plans 3 and 4 (`wonderPlans.ts`, version unchanged at 1; existing families' seeds unaffected)
`generateWonderPlan(family, worldSeed, siteId, footprint, site?)`; `site={tidalRangeM?, exposed?, flow?, flowDir?, flowSpeedMps?, riverWidthM?, bankHeightM?}` (Grok to supply).
- **Crescent Harbor** (suggested footprint 48x40): quay arc round a circular basin open at +Z; warehouses on plinths exactly their own size at quay level, some with a columned loading walk; landward street stair, 1-2 stairs down to the water; bollard berths packed from real hull classes (corners inside the basin, no overlaps, mooring line at most 3.2 m, every bollard and boarding point within 1.7 m of the quay walk, stair rise at most 0.2 m); tidal range raises the quay (quay top 1.0 to 2.2 m); exposed coast adds a harbour light (unlit iron lantern, no fire). Water is y=0 and the quay is a solid stone block with core fill; stages: groundworks, water stairs, berthing, warehouses, arcade, light, with m3 per material.
- **Mill Market** (suggested 34x28): a stream channel with water surface at y=0.3, a mill house on a stone-faced court with an undershot wheel whose rim bottom is 0.1 to 0.5 m below the surface (all parts stay above y=0), hump-backed arch bridge (voussoir ring, haunch fill, parapets, steps rise at most 0.2 m, tread 0.28 m) to a south landing court, market stalls on a clear aisle joined to the bridge steps, mill door path, two entry stairs; bank height and flow direction/speed change the plan (fast water adds a sluice weir; flow flips the mill and stalls). Courts are under 45% of the site by test.
Circulation is tested with the same straight-line segment blocker as the observatory (eye height above the court); it is not a navmesh. The plans assume Grok places the origin at water level (harbour) or riverbed (market) and raises/cuts terrain to the stated levels.

### Checks (executed in this environment, Node via `scripts/game-loader.mjs`)
```
carved-buildings 26/26   render-style 1/1   h-compact-ui 5/5   wonder-plans 15/15
carved-trees 6/6         caravan-models 8/8 trade-dialog 5/5
```
Total **66/66** pass. Not run: `tsc --noEmit` (no node_modules here; repo tsc rejects `baseUrl`), any browser/three.js, `CompactParts.tsx`, `LeaderPortrait.tsx`, `TradeDialog.tsx`, `carvedBuildingLayer.ts`.

### Assumptions to verify (Codex/Grok)
- Boat hull dimensions are derived from seats; there is no hull length/beam in `boatClasses.ts` yet (G13 adjustable boat dimensions would replace `hullSize`).
- Harbour/market levels (water at y=0, quay top, court level) need terrain support from Grok; bridge piles end at y=0.
- Wheel is "in water" only relative to the plan's own water surface y; the real water mesh must match `waterSurfaceY`.
- Fire/lit, weather awnings and any prop state must be passed by the adapter from real state; the generator default (lit, summer) is preview-only.
- Mill Market and Crescent Harbor stairs use rise at most 0.2 m, tread at least 0.28 m, which is steep for carts: the bridge is a pedestrian/pack crossing, not a cart road.
- The LOD seam `InstanceCameraCull.query(mesh,instance,{near,mid},out)` (work/codex-instance-lod-contract 15e6a63b) is not consumed yet; I built no culling.

### Interface requests
- **Societies:** send the real trade-offer/goods shapes (TradeDeal, observed stocks, relation) so `tradeModel.ts` input can be replaced by a direct mapping; confirm parcel kinds for dropped cargo (`parcelSpec` takes kind+amount).
- **Codex:** expose hull length/beam per class (or confirm the seat formula); wire `lit` from real fire state; consume the culling seam in the carved layer; icon art for `h-good-*`.
- **Grok:** site facts listed above (tide range, exposure, flow speed/direction, river width, bank height) and terrain levels for harbour and market.

### Next action
Canyon Cistern and Assembly Court wonder plans; instancing adapter for trees and caravans once the culling seam merges; an H-vs-E render review (cannot be done here).
