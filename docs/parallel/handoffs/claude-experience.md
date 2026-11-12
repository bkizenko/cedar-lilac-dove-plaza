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

## Batch 3 (merged with origin/main; nothing rendered, nothing run in the browser)

### Status
- Site grounding adapter: DONE as pure code, tested (`b65841f`). Not wired into the live carved layer.
- Trade dialog mapping to Societies `tradeNeeds`: DONE as a pure adapter, tested (`622840c`). `TradeDialog.tsx` is still unexecuted and does not yet call the adapter.
- Canyon Cistern and Assembly Court wonder plans: DONE as pure plans, tested (`1ba661c`). No terrain, water mesh or placement code consumes them yet.
- Interface requests below: recorded only, nothing built for them.

### New / changed files
- `src/scene/siteGrounding.ts`: `SiteSampleLike` (structural mirror of Grok's `SiteSample` v1, `src/game/siteSample.ts`; no import from the sim), `groundSite`, `plinthSpec`, `habitatFromSite`, `siteHeightAt`, `wonderSiteIssues`, `wonderSiteFromSample`, `GROUNDING_RULES`.
- `src/ui/h/tradeNeedsAdapter.ts`: `tradeNeedsInput`, `tradeNeedsView`, `offerSides`, `reasonText`, structural `OfferLike` (mirrors `TradeOffer`).
- `src/ui/h/tradeModel.ts`: `limits.relationBlocks`, `leader.trust` -> `leader.trustText`.
- `src/scene/goodsVisuals.ts`: visuals for every `GoodKind` (food, spears, bows, blades, paddedArmor, basket, goat); `led` flag.
- `src/scene/caravanModels.ts`: `cargo.led` (animals walk on a lead; not loaded, not in `fill`).
- `src/scene/wonderPlans.ts`: `canyonCistern`, `assemblyCourt`; `WonderSite.grade`; plan fields `cistern`, `assembly`. Generator version stays 1 (existing seeds unchanged).
- Tests: `site-grounding.test.mjs` (7), `trade-dialog.test.mjs` (9), `wonder-plans.test.mjs` (21).

### Site grounding: how it uses SiteSample v1
- Floor level = max(mean height, max height - 1.2 m). Plinth boxes sit wholly under the footprint, follow the lattice depth, and are capped at 1.2 m (verdict `steep` beyond 2.4 m visible or grade > 0.6). The footprint is never moved or resized; no terrain edits.
- Entrance steps (rise 0.18, tread 0.3) are specified for the +Z edge only when it sits below the floor; they lie outside the footprint, so the caller must reserve that strip.
- `downhillRadians` is returned in the building frame (`downhillLocalRadians = downhill - yaw`); the `atan2(x,z)` convention from SiteSample is assumed, not checked against Grok's tests.
- `wetFraction > 0.02` gives verdict `wet`. Habitat is the heaviest mapped habitat across `biomeShares` (forest kinds add up); unknown kinds fall back to plains.
- Wonder facts: flow direction from the sign of downhill x, speed from sqrt(meanGrade), bank height from relief, `exposed` from warm-coast share, `grade` from meanGrade. Wonder suitability (`wonderSiteIssues`) uses wet and grade thresholds I chose; Grok/Codex should replace them with real placement rules.

### Societies `tradeNeeds` mapping, and mismatches found
- Offers to team 0 are mirrored: the player pays `offer.get` and receives `offer.give`. Only accept or decline exists (`answerTradeOffer`); counter is always disabled in the view.
- Acceptance fails on war ('foe') or when the player's stock is below `get.amount`; the adapter predicts only those two. All proposer-side failures ('no-carriers', 'too-heavy', 'home-short', 'no-pen') appear only after acceptance as a decline, so the UI cannot warn about them.
- Mismatches:
  1. Route trust is 0..1 (`offer.trust`) while the portrait stance uses a relation value; both are shown separately and neither drives the other. The engine ignores relation for accept, so the dialog does not block on a hostile relation.
  2. `qualifies` and `commit` are not exported; the adapter re-implements the war and stock checks. A drift risk.
  3. No partner stock is exposed to the player, so partner `knowledge` is `'unknown'` and no partner stock is drawn.
  4. Price: the proposer asks `fairGet * (1 - spread)`, so the player pays about `1 - spread` of worth. The dialog calls that "In your favour" (ratio <= 0.9) or "Fair". Confirm with Societies that this is intended.
  5. A goat is a living animal (`animals`), not a load; caravan models list it under `cargo.led`, and the live livestock renderer must draw it.
  6. Reason codes seen in the engine and mapped to text: foe, refused, expired, no-need, no-surplus, proposer-short, partner-short, no-carriers, too-heavy, home-short, no-pen, partner-no-pen, carrier-lost, loading-timeout, journey-timeout, became-foe, invalid, cooldown. New codes fall through as raw text.
- Not verified: I did not run the real engine; the adapter test uses offers I constructed with the same field names.

### Wonder plans 5 and 6
- Canyon Cistern: y=0 is the pit floor; rim walk at `rimY` (2.0-4.2 m, from `bankHeightM`). One entry stair up the front wall, two stepwell flights descend the side walls into the water (rise <= 0.18, tread 0.3). Catchment chain on one side wall: gutter, 1-2 silt tanks (2 when `flowSpeedMps >= 1.5`), inlet spout above the water; lowered overflow weir on the opposite wall; draw-off is the lowest dry step on each flight. Shade roof on piers covers 30-50% of the back (up to 90% when `exposed`), never over the flights. `capacityM3` subtracts submerged steps and piers. Stages: groundworks, flights, roof, catchment, lifting (m³ by material; water carries no volume).
- Assembly Court: bema at the centre of a paved floor, 5-10 raked tiers round it (`grade > 0.25` gives 6-7), 3-5 radial aisle stairs (rise 0.19, tread 0.45), crown wall open at each aisle (taller when `exposed`), stoa colonnade with a 3.6 m central gate on the +Z side. Tier rise (0.34-0.40) is chosen so every row clears the row in front by >= 0.1 m of sightline to the speaker; the test recomputes that from the plan numbers. Seats are counted at 0.5 m per seat.
- Not checked: acoustics, crowd flow, and whether a real stairway of 0.19 m rise suits horses. Footprints used in tests: cistern 30x30, assembly 32x28.
- Known limits: the cistern floor y=0 means the pit is modelled as raised walls on level ground; Grok's terrain would have to supply the real cut. Water bodies are `water` material boxes; the real water mesh is separate.

### Checks (executed here, Node via `scripts/game-loader.mjs`)
- `wonder-plans` 21/21, `site-grounding` 7/7, `trade-dialog` 9/9, `caravan-models` 8/8, `carved-buildings` 26/26, `carved-trees` 6/6, `render-style` 1/1, `h-compact-ui` 5/5: 83/83. No test touches a renderer; no screenshot or browser check was run.

### Interface requests (requests only; nothing built)
- **Codex:** (1) hull length and beam per boat class in `boatClasses.ts` (or confirm the seat formula) to replace `hullSize`; (2) a `lit` fire state per building (hearth, kiln, forge) so `lit` comes from real state instead of the preview default; (3) icon art for the `h-good-*` ids that `goodIconId` returns (grain, pulses, tubers, berries, provisions, bread, porridge, fish, meat, milk, wood, stone, copper, iron, spear, bow, blade, armor, basket, goat, cordage, pot, hide, cloth, parcel).
- **Societies:** export a dry-run of the accept check (e.g. `tradeAnswerBlocker(g,offerId)`) so the dialog stops re-implementing `qualifies`/`commit`; expose the partner's last-observed stock if the player is meant to see it.
- **Grok:** tide range and river width are not in `SiteSample`; wonder placement rules (cistern needs a catchment slope, assembly court wants a hillside facing open ground); terrain cut for the cistern pit and the cavea.

### Next action
Instancing adapter for trees and caravans once `InstanceCameraCull.query` merges; wiring `siteGrounding` into the carved layer and `tradeNeedsView` into `TradeDialog.tsx` (both need a browser to check); an H-vs-E render review (cannot be done here).

## Batch 4 (pure specs only; no existing live file edited; nothing rendered)

### Status
- Culture grammar: DONE, tested (`c2f1e54`). `src/scene/cultureGrammar.ts`.
- Unit appearance: DONE, tested (`7d80143`). `src/scene/unitAppearance.ts`.
- Ruins: DONE, tested (`ruins.ts`, commit after `7d80143`). `src/scene/ruins.ts`.
- None of these is wired into the renderer, the sim or any UI. Nothing was drawn.

### Culture grammar
- `generateCulture({seed, climate?, material?, craft?, coastal?})` gives a palette (5 colours built from climate-gated pigments with seeded jitter), a flag grammar (12 divisions, 16 charges, 16 border motifs, 4 placements), a pottery form with lathe profile, handles, decoration, technique and firing, dress for all four seasons, and an architectural habit (material, `FamilyContext.tradition`-compatible bias, courtyard, stilts, ornament, roof tone).
- It is not mapped to any modern ethnicity. Motifs are neutral technique tokens (stepped, meander, spiral, wave, lozenge, zigzag, dots, comb, scroll, lattice, chevron, radiate, knot, cloud, reed, feather) inspired by river-terrace, canyon, brush-scroll, wave-spiral, woven and impressed traditions. Climate and craft only bias the draw; a test shows 60 cultures in one climate still give at least 8 pottery forms and 55 flag layouts.
- Diversity over 300 seeds (seeds 1-300, executed): 300 distinct palettes, 300 distinct flag layouts, 300 distinct pottery keys, all 12 pottery forms, 11+ flag divisions and 15+ charges used. These count distinct combinations including small colour jitter; the coarse layout (division, charge, placement) has at least 120 distinct values.
- Dress uses only real `GarmentKind` ids (`skinClothes`, `leatherClothes`, `lightClothes`, `hideCoat`, `woolCoat`), gated by climate and season (arid summer is always `lightClothes`; cold winter is always at least 1.35 heat burden; winter is never lighter than summer). `dressFor(culture, season, ownedGarment)` returns the real garment when one is passed.
- `toSocietyIdentity(culture)` projects the flag onto the existing `SocietyIdentity` shape (symbol, pattern, primary, secondary, emblem). Every projection passes `identityIssue` (tested for 300 seeds), including the 3:1 emblem contrast rule. It does not edit `societyIdentity.ts` or any state.
- Limits: the colour names are real pigments, but I did not check the palettes visually. Flag layouts are specs, not drawn. Pottery profiles are numbers, not meshes.

### Unit appearance
- `unitAppearance({type, seed, gear, culture, season, era?, affiliation?})` returns `UnitPart[]` (each with a `slot`), `slotColors`, a shared `geometryKey`, an instance `tint`, `brightness` (same constants as `wornGarments.ts` and `wornArmor.ts`), what was `rendered`, what was `ignored`, and the body `fit` (mirrors `wornGarmentFit`).
- Rendered only from real state: an owned garment (`Unit.garment.item` with condition above 0), an owned `paddedTorso` asset, and the weapon implied by the real unit type (spearman, archer, swordsman; none for worker, leader, warden, ranger, cavalry). Headwear is part of the garment cut and appears only with a garment. There is no shield, helmet or mail anywhere in the sim, so none is drawn. Unknown armor kinds are listed in `ignored`.
- Culture chooses cut (wrap, tunic, poncho, robe, kilt, cape, trousers), headwear, dye and trim motif. Skins and hides take 20% of the dye, wool and light cloth 80 to 85%. Era only adds trim richness (era 2 and 3).
- One culture gives at most 4 geometry variants (hem, sash) for any number of units; individual variation beyond that is a tint within 5%.
- LOD triangle budgets, measured max over 300 cultures x 4 seasons x 4 unit types x 5 garments with armor and era 3: near 728 (budget 800), mid 312 (budget 340), far 108 (budget 120). Budgets are set from the measurements, not from a target.
- Not checked: how the parts look on the live body, and that the existing live garment and armor layers still draw their own geometry; this module replaces neither.

### Ruins
- `ruinSpec(source, {seed, decay, overgrowth?, climate?})` takes any building or wonder spec (parts and footprint) and returns a `RuinSpec` with `ruin.standing`, `rubble`, `fallen`, `growth` part indices, volume stats and `slots`.
- Physical rules: roofs fail first and are all gone at decay 0.6 or more; a sound building (decay 0) keeps its roof; timber walls and posts rot to stumps, stone survives lower; walls are cut into segments with a broken skyline; fallen stone becomes rubble beside the wall it came from, never more than fell (tested for every source); fallen roof timbers and thatch litter lie inside; anything left hanging falls too; fire, cloth and water are dropped; far-tier supports of the clean building are dropped and regenerated, so every LOD tier is supported.
- Growth: wet and temperate ruins get shrubs, vines on standing faces and saplings; arid ruins get sand drifts. Footprint unchanged.
- Artifact slots (`kind`: hearth, threshold, rubble, roofFall, floorPit, wallNiche, foundation): each has a position inside the footprint, depth, rarity 0 to 2, access (open, under-rubble, in-wall, under-wall, dug) and the covering part index when it has one. Slots never lie inside open air, never inside a standing wall unless they are wall niches or foundation deposits, and are at least 0.55 m apart. Content belongs to the game.
- Tested on every carved building type (except the four axis walls) at eras 0, 2, 3 and 12 wonder plans, at decays 0.25, 0.6 and 0.9. Extra triangles over the source at decay 0.5 with overgrowth 0.8 (executed, worst case): near 2984, mid 1228, far 388. A large wonder ruin is therefore heavy at the near tier.
- Known limits: rubble and growth are ground-level boxes and spheres; no leaning or toppled walls; the dig depth (`depthM`) is data only; ruins of palisades, stone walls, trenches and moats are untested because those families are axis-dependent; I did not look at any ruin.

### Checks (executed here, Node via `scripts/game-loader.mjs`)
- `culture-grammar` 6/6, `unit-appearance` 8/8, `ruins` 6/6, `wonder-plans` 21/21; previous files unchanged. No renderer, browser or screenshot check.

### Interface requests
- **Societies:** (1) culture to naming hooks: a stable `cultureSeed` per society so names, greetings and trade-good preferences can be drawn from the same grammar (`Culture.key`, `motifs`, `craft`, `climate` are available); (2) diplomacy hooks: culture traits are descriptive only here, so say which of them (if any) should feed relation or trade preferences; (3) adopt `toSocietyIdentity(culture)` when founding a society, if Societies wants culture-driven flags.
- **Codex:** (1) an armor ownership snapshot: a function returning, for each visible unit id, `{garment?: {item, condition}, armor?: {kind, condition}}` from `Unit.garment` and `wornArmor(g, u)`, so the renderer need not touch sim state per part; (2) tell us whether shields, helmets or mail will ever exist as owned items; until they do none is drawn; (3) a per-unit culture id (or settlement seed) the layer can pass to `unitAppearance`; (4) a ruined-building state in the sim (abandoned or destroyed with a decay value) before `ruinSpec` can be used.
- **Grok:** the artifact slots need a terrain-aware dig depth and a rule for what may be buried where; ruins should sit on the same `SiteSample` plinth as the original building.

### Next action
Same as Batch 3: instancing adapters and wiring into the carved layer, `TradeDialog.tsx`, once a browser or the Codex culling seam is available.

## Batch 5 (pure specs and models; no existing live file edited; nothing rendered or heard)

### Status
- Animation clips: DONE, tested (`b857dea`). `src/scene/animationClips.ts`.
- Audio state spec: DONE, tested (`8c5451b`). `src/scene/audioState.ts`.
- Minimal UI models and components: DONE, models tested (`src/ui/h/minimalModels.ts`, `src/ui/h/MinimalParts.tsx`). The components are not wired, not run in a browser and not type-checked (see Checks).
- The render worker (`agents/claude-experience-render`) was not touched.

### Animation clips
- Clips: idle, walk, carry, row, fight, thresh, winnow, grind, bake, tend, chop, quarry, plant, harvest, craft. Each is a keyframe table (7 body parts plus a root offset) that loops seamlessly (tested).
- Selection reads real state names: `Unit.order`, `ProductionProject.phase` and recipe id (every one of the real recipe ids in `PRODUCTION_RECIPES` maps to a clip, tested), node kind, `fieldAction`, boat rowing, carried load. Thresh, winnow, grind and bake recipes drive their own clips; cook, smoke, kiln and ferment recipes drive `tend`; other working recipes drive `craft`. `curing` and `paused` always give `idle`, so no one pretends to work.
- Phase comes from real progress: seconds of work done for work clips, metres walked for walk and carry, metres rowed for row. Wall-clock time drives only idle breathing. A paused task keeps its progress, so its pose freezes.
- Load: stride is up to 30% shorter, bob up to 80% larger, lean up to 14 degrees; the walk clip itself ignores load.
- Variation: per-unit phase offset, speed 0.92 to 1.08 and amplitude 0.95 to 1.05; one shared rig.
- LOD: under 35 m full, under 70 m trunk, legs and tool arm only, beyond that no animation and no effects. Distances are my choice.
- Effects: fixed pool, caps dust 96, chaff 96, smoke 48, steam 32; at most 6 alive per source; spawn-rate limits per kind per second. Smoke and steam are emitted only when the caller says a real fire is lit; dust only on dry ground, none at mid tier. 100,000 spawn attempts never exceed the caps (tested).
- Not checked: how any pose looks on the live body mesh, joint axis conventions against the existing rig, and whether the rates feel right. The part axes (rx forward) are a convention I chose.

### Audio state spec
- `MusicDirector(seed).step(input, dt)` gives calm, trade, attack or defense. Inputs are `Game.musicMood()` ('raid' becomes defense, 'pillage' becomes attack), a real "trade in progress" boolean, age, season and calm mode. There is no timer or random state change; a property test over 20,000 steps shows defense and attack exist only within 20 s of their real flag, and a raid is answered in the same step.
- Rules: defense is immediate; leaving combat needs 20 s quiet; trade needs 5 s of real trade to start and lingers 15 s; calm tracks match the live `peacefulMusic` for every age, season and calm setting (tested against `music.ts`). Track choice is seeded; rests between pieces are seeded gaps of 20 to 40 s.
- Skip: next track in the state's pool, never the same, lasts until the state changes; skipping during defense does not end defense (as `music.ts` allows peaceful pieces during battle).
- Palette: every track in the tables is a shipped acoustic recording; the source has no oscillator or random call (tested). The instrument lists are policy (allowed and forbidden classes); the `acoustic` flag per track is the asset author's declaration. I have not listened to the tracks.
- Ambient mixer `ambientMix`: wind, birds, crickets, frogs, insects, surf, rain, river, fire, murmur and snow hush from biome, season, hour, weather, water distance, lit-fire distance and people count; a smoother bounds gain change. No fire sound without a lit fire in range.
- Mismatches: attack and defense share the single shipped battle track; trade shares folk and village with calm. No ambient audio files exist, so the layers are ids and gains only.

### Minimal UI models
- Knowledge cards: at most 40 words each, clipped from real `KnowledgeTopic` fields; evidence chips only from real fields (seen, trial count, proven result, limit); an unexplored topic shows "none yet". In-progress topics sort first.
- Crafting boxes: icon (from `goodIconId` or recipe family), label up to 4 words, percent, state, and a cause line only when stalled; at most 14 words per box; list capped at 4 plus "+N more".
- Ledger: tabs production, history and comparison from real `SeasonReports` samples; partial seasons are never compared; the season-end report exists only within 90 s after a season ends and is otherwise null.
- Notifications: urgent kinds only (starvation, dehydration, freezing, homeless, sickness, workers-idle, blocked-critical), urgency at least 0.6, one line "cause - remedy" up to 18 words, one per kind, at most 3, 60 s repeat gate. Raid, landing, arrival, attack and enemy ids and kinds are never shown, even when supplied (tested).
- Word caps are tested by counting what each view would display, with 200-word source strings.
- Mismatches: there is no existing notification or "need signal" shape in the sim, so `Signal` is my structural type; Codex or Societies must say where urgency comes from. The knowledge model assumes `knowledge.ts` field names as of this merge.

### Checks (executed here, Node via `scripts/game-loader.mjs`)
- `animation-clips` 8/8, `audio-state` 8/8, `minimal-ui` 6/6 (new, 22 tests); earlier files unchanged. Total 125/125.
- Type-checking was NOT done: `tsc` in this checkout fails on its own configuration (`baseUrl` removed, missing `@types/node` and `vite/client`), so `MinimalParts.tsx` and all new `.ts` files are verified only by the Node test loader, which strips types.
- No browser, audio device or screenshot was used.

### Interface requests
- **Codex:** (1) per-unit data for clips: distance walked (odometer) and whether a unit is moving, rowing, in range of its target, plus the node kind or field action being worked; (2) a `lit` fire query by position (shared with `lit` in the building request); (3) separate battle tracks for attack and defense, a trade-piece pool and ambient loops (wind, birds, crickets, frogs, surf, river, fire, murmur) as acoustic recordings; (4) a "trade in progress" boolean for the music director (suggest: any open offer awaiting the player, or a caravan or envoy trading); (5) where the minimal components should be mounted.
- **Societies:** an urgent-need signal source (`{kind, urgency, cause, remedy}` per village need) so notices come from real shortages rather than a parallel check.
- **Grok:** biome and coastal flag per listener position and a water distance query, for the ambient mixer.

### Next action
Wiring (instancing adapters, siteGrounding, TradeDialog, animation, audio director, minimal components) still needs a browser or the Codex seams.

## Batch 6: civic families, culture-by-default, residency proposal

Status: pure specs and tests only; nothing rendered, nothing heard, `tsc` unusable in this checkout (not type-checked). No existing live file edited.

- `src/scene/buildingFamiliesCivic.ts`: 19 families (marketHall, shrine, archive, lyceum, fortBarracks, smithy, kilnYard, storeBarn, dryingYard, tannery, loomHouse, bakeryOven, windmill, horseMill, harborStore, shipyard, beacon, gatehouse, townHall), each with a real-world reference in `notes.reference`. `generateCivic(family,ctx,key)` = generate, seeded additions (porch, stack, woodpile, fence, prosperity banner), culture dress, fit to footprint, ground every LOD tier.
- Variation: era, wealth, material, climate, seeded structure (>=8 structural signatures in 25 seeds per family), town hall by era (<=1 longhall ring, 2 moot hall, 3+ arcaded hall, 5+ palace with clock tower), market hall small/medium/large (stalls ring + well), shrine in 3 grammars (terrace, colonnade, pavilion) chosen from the culture key, fort walls closed except the gate (gap == entry width; `gateOpen:false` closes leaves).
- Culture is the default: passing `culture` takes material/climate/tradition from `Culture.architecture` (unless `pinned`) and dresses roof pitch scale, finials, banner, doorway form (post/arch/gable), courtyard wall, stilts. Test: 6 cultures give >=4 distinct silhouettes for every family; all footprint-true and grounded at all tiers.
- Triangle budgets (near/mid/far, worst of 25 seeds x contexts, +15%) are embedded in `scripts/civic-buildings.test.mjs`.
- Proposed new sim ids for Codex (family ready, no sim id yet): `archive`, `granary`, `windmill`, `horsemill`, `shipyard`, `gatehouse`, `beacon`. Existing ids remapped via `CIVIC_ROLES`: market, temple, university, barracks, forge, kiln, warehouse, smokehouse, dryrack, tanner, fibreWorkshop, oven, townhall, watchtower. The live `familyForType` is unchanged; wiring is a Codex decision.
- `src/scene/visibleSet.ts` (PROPOSAL, pure): `visibleSet({camera,settlements,previous})` returns per-chunk residency (full / merged / impostor / none), one cluster card per far settlement, stats, and `state` to feed back as `previous` (hysteresis 12 m). Defaults: bands 60/140/320/far 900, caps 260 draws, 2500 instances, 150 full buildings, 40 cards; caps enforced by degrading farthest chunks first. Tests: 20 villages / 500 buildings, sweep and dense layout (worst frame 29 and 177 draws). Codex owns culling; renderMetrics and instanceCameraCull untouched.
- Limits: chunk costs are modelled (draws = distinct kinds when full), not measured in a browser; cluster card and merged-chunk meshes are not built here.

## Batch 7: per-civ architecture bible (user direction after reviewing renders)

User direction: (1) terrain is NATURAL, never carved wood; only the warm golden-hour grade stays; wood only where a building is timber. (2) Concept art (docs/art-reference/approved-wonder-concepts.png) is the fidelity target: fitted ashlar, timber-framed thatch and tile roofs, canvas awnings, cream banners with simple emblems (sun-star, waves, mountain and river, water drop), natural dry-grass hills and red rock. (3) Cultures must differ in MATERIAL, plan, roof and civic building, not tint. (4) Invented civs, inspiration only. (5) Every building individually imperfect. (6) People differ by cut, headgear, colour and insignia.

Rule for every civ below: a distinct primary wall material (own swatch, own course pattern), a distinct roof form, a distinct plan, a distinct civic building, a banner emblem. Nothing is copied from a real culture; each is an invented blend of climate logic and construction method.

| id | inspiration (loose) | biome | wall | roof | house plan | civic building |
|---|---|---|---|---|---|---|
| sandrill | Nabatean | canyon, arid | rose sandstone, rock-cut | flat, stepped parapet | facade cut into a cliff face with a single bay | carved tomb-temple facade with a crowning urn; cistern hall |
| nilemark | Egyptian | river desert | whitewashed mudbrick, battered walls | flat with palm-rib shade | block house, roof terrace | pylon gate temple with papyrus-bundle columns |
| tigrane | Mesopotamian | river plain, arid | baked brick with bitumen bands | barrel vault and flat | courtyard block | stepped ziggurat with a shrine on top |
| hanrei | East Asian | wet temperate | timber post-and-beam on stone plinth, paper screens | upturned-eave tile hip | pavilion with veranda | tiered pagoda hall |
| vedara | South Asian | monsoon | laterite and carved sandstone | flat with chhatri pavilions | haveli courtyard | curvilinear tower temple with a stepped tank |
| aureline | Greco-Roman | mediterranean | white ashlar limestone | low terracotta gable | atrium house | columned temple with pediment; basilica |
| sahelan | West African | savanna | rammed earth with projecting beam ends | flat; conical thatch granaries | buttressed block | tall buttressed mud hall with spiked pinnacles |
| quillan | Andean | high mountain | fitted polygonal stone, trapezoid doors | steep grass thatch | terraced rectangle | trapezoid ceremonial hall on terraces |
| kaaltun | Mesoamerican | jungle, hot | plastered limestone, corbelled | palm thatch on platforms | pole-and-thatch house on a low platform | stepped pyramid with a roof comb temple |
| mekhari | Southeast Asian | tropical wet | bamboo and woven reed on stilts | huge saddle (boat) thatch | stilt house | tiered saddle-roof hall |
| brythen | Britannic | cool temperate | wattle and daub | conical thatch | roundhouse in a ditch ring | great round hall, ring rampart |
| rusvolt | Russian | boreal | notched logs | steep plank gable | log cabin with carved lintel | wooden tiered church with onion domes |
| steppan | Central Asian | steppe | felt over lattice | felt dome | yurt | great yurt with banner poles; mudbrick caravanserai in late eras |
| skoldar | Nordic | cold coast | turf over stave frame | turf, low | earth-banked longhouse | stave hall with dragon-head gables |

Age grammar (era 0..5): 0-1 dwellings are the poorest local form (reed, wattle, hide, turf); 2-3 add the signature wall material and a civic hall; 4-5 add stone or fired plinths, second storeys, civic monuments and carved trim. Wealth adds trim, banners, size; wear adds lean, rubble, patched roofs.

Per-instance imperfection (seeded): footprint scale +-6%, wall lean up to 1.5 degrees, uneven heights, roof pitch and overhang jitter, off-centre doors, optional add-ons (lean-to, stack, porch), rubble and patched roofs by wear.

People: each civ takes its own cut, headwear, dye palette and emblem through the culture (unitAppearance renders only owned gear, so distinction is by garment cut, headwear, dye, trim motif and sash/insignia, never invented armor).

Terrain: new `biomeTerrain.ts` replaces the carved terrace in the H style: grass, dirt, rock on slopes, sand at shores, snow by height and latitude, brown savanna or steppe per biome, isotropic noise (no grain stripes). `carvedTerrace.ts` is deprecated; keep only the golden-hour grade.

### Batch 7 implementation status (pure modules, nothing rendered or heard, `tsc` unusable here)

- `src/scene/biomeTerrain.ts`: natural terrain (12 biomes: grass, dirt, rock on slopes, sand shores, snow by height only where the biome snows, brown savanna and steppe, red canyon rock). Isotropic noise, no grain, no terraces; `goldenHour` is the only look kept. `bakeTerrainColors(heightSampler,half,segments,waterY,biome,seed,pathWeight)` is the drop-in for `bakeCarvedTerrainColors`. `carvedTerrace.ts` marked deprecated (kept for its old tests). Do NOT use `terracedHeight` in-game.
- `src/scene/civStyles.ts`: the 14-civ bible as data (own wall swatch and construction course, roof form, plan, civic kind, emblem primitives, dress). Materials are `${civ}.${slot}` ids resolved through `spec.materials` (the renderer must read that table, not CARVED_MATERIALS, for civ parts).
- `src/scene/civBuildings.ts`: `generateCivBuilding(civ,role,{seed,era,wealth,wear,footprint})` for house, civic, granary, market. Era 0-1 is the poorest local dwelling per civ. Each instance is imperfect (size, per-wall lean, uneven heights, door offset, add-ons, rubble by wear). Budgets measured over 14 civs x 4 roles x 8 seeds: worst 1324/872/560 triangles near/mid/far, test caps 1600/1000/660. Banners come back as `spec.banners` for the emblem texture.
- `src/scene/civPeople.ts`: `cultureForCiv(civ,seed)` gives each civ its own cut, headwear, dye, trim motif and flag so `unitAppearance` renders different people (still only owned gear, no invented armor); `emblemSvg`, `emblemInk` (3:1 on the cloth), `insignia`, and `civShowcase(civ,seed)` (7-building review scene on the civ's biome) for the render worker.
- Tests: `scripts/biome-terrain.test.mjs`, `civ-architecture.test.mjs`, `civ-people.test.mjs`.
- Wiring (Codex): choose civ per settlement; call `generateCivBuilding` instead of the generic families for house/hall/granary/market; feed terrain colours from `biomeTerrain`; swap the material table lookup. The 19 civic families from Batch 6 remain for roles the civ grammar does not cover (smithy, kiln, tannery, shipyard and so on) and accept `culture`.
- Limits: shapes are blockouts of the described forms; nothing has been looked at. Fidelity against the concept sheet (fitted ashlar joints, awning cloth, carved lintels) needs the renderer to apply each swatch's `course` pattern. Render worker: use `civShowcase(civ,seed)` per civ.

## Batch 8: modular wonder kit grammar, presets, eraMode (plan, then status below)

Plan. (1) Wonders become a SEEDED ASSEMBLY of hand-authored kit pieces, not six fixed layouts: 18 pieces (base terrace, plinth, causeway, colonnade, tholos ring, arch, dome, spire, pylon pair, ziggurat tiers, pagoda tiers, statue, gate, wall run, brazier, relief panel, water feature, banner pair) plus 6 FUNCTION CORES that carry the wonder's gameplay identity (observatory sight ring with an open sight slot, cascade terraces with a water run, harbour basin with quay, mill race with wheel, cistern pit with catchment, assembly bema with tiers). (2) A seeded grammar per civ picks base, axis (processional, cross, radial, linear, spiral), crown, flanks, enclosure, water, relief and banners; civ biases the pools but the seed reshuffles them, so the same civ looks different each game. Materials and emblems come from civStyles. (3) Site: siteGrounding supplies plinth and floor; slope, wetness and downhill steer the axis and base. (4) Instancing: every piece is generated at a canonical size class (S/M/L/XL) so one mesh serves many placements (quarter-turn yaw, translate only); the plan lists `meshKeys` and instance counts. (5) Preset = {v,seed,civ,family,options} as small JSON with validating deserialize. (6) eraMode on buildings: 'morph' (existing behaviour) or 'fixed' (look fixed by its own build-time era, wealth, material; never morphs); layered villages assign each building its own built era; upgrades only through explicit extensions. Tests: >=20 seeds per civ with distinct silhouettes, determinism, footprint, grounding, LOD budgets, preset round trip, function identity present, eraMode invariants.

### Batch 8 status (pure modules; nothing rendered or heard; `tsc` unusable here)

- `src/scene/wonderKit.ts`: `generateWonderKit(preset,site?)` with 18 kit pieces and 6 function cores (sightRing, cascadeTerraces, basinQuay, millRace, cisternPit, bemaTiers) mapped to the six wonder functions. Seeded grammar picks base, axis (5), crown (civ-biased pool, seed-shuffled), flanks, enclosure, water, relief, banners; civ materials from civStyles plus shared water/fire/foliage. Output: flat `parts`, `pieces` (kit, variant, size class, x, z, quarter turn, role), `meshKeys` and `instances` (one canonical mesh per key: render with instancing, translate + quarter turn only), `identity` (core present, sight azimuth, basin, bema), `silhouette`, `triangles`. LOD by role: base/core/crown reach the far tier, flanks/enclosure/water stop at mid, relief/banners near only. Measured worst 3122/2928/1152 triangles (caps 3500/3300/1300). Site: steep ground goes linear with a plinth from siteGrounding, wet ground gets a causeway.
- Presets: `serializePreset` / `deserializePreset` (JSON under 220 bytes, validated and clamped; `{v,s,c,f,o}`).
- eraMode in `civBuildings.ts`: `eraMode:'morph'|'fixed'` (default 'morph', existing behaviour). 'fixed' uses `built:{era,wealth}` (or the era first generated at) so advancing the world era never changes a building. `villageLayers(seed,era,n)` gives each building its own build era; `rebuild()` and `extend()` are the only upgrade paths (a wing built with its own era's techniques, at most two, base untouched). Build-time techniques now exist: era 3 dressed plinth and door frame, era 4 corner quoins, era 5 cornice.
- Old `wonderPlans.ts` stays as the sim binding (berths, stairs, seat counts, cistern catchment) until Codex adopts the kit plan; the kit plan exposes only the identity anchors. Interface request: Codex to decide whether sim data should be derived from the kit's core piece, and where the preset is stored in the save.
- Tests: `scripts/wonder-kit.test.mjs` (9), `scripts/era-mode.test.mjs` (7).
