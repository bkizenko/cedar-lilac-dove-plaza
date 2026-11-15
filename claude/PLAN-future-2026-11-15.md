# Plan: first person, future eras and planets, huge and real maps, loading screen and name, donut map, fuller ages

Author: Claude planning helper, 2026-11-15. Base: `main` at `a155ca30` (read-only on source; this is the only file added). No durations anywhere (Boris's rule). Claims are tied to file:line from the checkout; anything not checked in source or at a primary web page is marked **[UNVERIFIED]**. "Cloud lane" means the lanes the cloud session owns in `claude/HANDOFF-local-claude-code-2026-11-15.md` (P5 ships/harbors, P7 health, P8 UI, P9 animals, P10 food); these plans must not duplicate them.

## BLUF

1. **Order of work: (6) fuller ages first, then (4) loading screen and name, (5) donut preset, (1) first-person Phases 0 to 2, (3) bigger maps (requires the walk-grid and fog-grid rewrite before any size increase), (2) future eras and planets last; the real-Earth map is the last step of (3).** Eras and planets multiply content that does not exist yet for Bronze to Renaissance, and large maps need systems (regional tier, nav grid) that planets also need.
2. **The six ages are thin because only 9 of 45 building types are age-gated, no unit exists for Classical, no ship/wonder/knowledge topic exists for Medieval/Renaissance, and `ResKind` has no tin, so "Bronze" is copper only** (`constants.ts`, `tradeFleet.ts`, `wonderDefs.ts`, `knowledge.ts`). Section 6 lists per-age additions with priorities.
3. **Bigger maps are blocked by three fixed-size grids, not by terrain memory:** nav grid `WALK = 520` (`sim.ts:263`), fog grid `FOW = 192` (`constants.ts:592`), and `WORLD_SIZES = [1040,1560,2080]` validated in saves (`persistence.ts:192`). Terrain chunking already exists as an opt-in, unrendered slice (`terrainChunks.ts`). Saves are `localStorage`, about 0.7 to 2.8 MB compressed at today's sizes (`docs/LOSSLESS_SAVE_CAPACITY_2026-11-02.md`), so a 10x world needs an IndexedDB save path first.
4. **"Hearthwild" is a working title by the repo's own evidence (README and GAME_DESIGN say "Dawn of Empire", `__root.tsx` says "Hearthwild", the save key says `dawn-of-empire-v17`); recommended new name: "Longhearth"** (section 4). Rename display strings only; never change `SAVE_KEY` or the `hearthwildStorage` envelope tag.
5. **Donut map needs one new preset plus one engine fix: `deepWater.ts` marks only water touching the map edge as open sea, so the inner ocean would be classed as an inland lake** and disable voyages/storms/ports there. Ship behaviour itself stays in the cloud lane (P5).

---

## 0. Ground truth used by every section

| Fact | Source |
|---|---|
| Ages: `AGES = ["Stone","Bronze","Iron","Classical","Medieval","Renaissance"]`; final age is 5 and hard-coded as `5` in several places | `constants.ts:25`; `sim.ts:3942, 3987, 5577, 6509`; `advancement.ts:14`; `persistence.ts:284, 293, 347` (age 0..5 validated); `wonderDefs.ts:126` (minAge 0..5) |
| Age advance = reserves, not a payment: `AGE_COST` (pop 50/75/100/125/150, food, wood, stone, copper from Iron, iron from Classical), plus completed buildings (`warehouse`,`workshop`; `forge` from Bronze; `market` or `temple` at Classical; both at Medieval+) and building variety `[0,4,5,6,7,8]` | `constants.ts:29-36`; `advancement.ts:7-27` |
| Each age gives a stat multiplier `AGE_STAT = [1,1.1,1.22,1.35,1.5,1.68]` (hp and damage of all units) and one binary choice (econ or army) from `AGE_CHOICES` (5 pairs) | `constants.ts:38, 532-557`; `sim.ts:3983-3993` |
| Project rule: technology is a needs-driven knowledge/practice network (need, observation, experiment, proven, adoption), not a Civ-style queue; existing age thresholds stay until deliberately changed | `AGENTS.project.md`; `knowledge.ts:23` (`KnowledgeStage`) |
| One `Game` holds one `world` (`WorldData`); a new world replaces the whole village through `Engine.restart` (`game.reset` then `installVillage`) | `sim.ts:458`; `engine.ts:499-507` |
| Desktop-only; mobile effort is out of scope | `AGENTS.project.md` |
| Failing-before-this-work test list and publish procedure | `claude/HANDOFF-local-claude-code-2026-11-15.md` (Rules) |

Existing design docs to reuse, not rewrite: `docs/FIRST_PERSON_DESIGN.md` (486 lines, design plus real-render findings), `docs/WORLD_SCALE_DESIGN.md` (chunking, tiers, memory estimates), `docs/FUTURE_SYSTEMS_AUDIT.md` section A (real-Earth window and scale model), `src/game/productionCatalog.ts` (100 design "stations" with stage and status).

---

## 1. First-person mode

### Current state in code
- **No first-person code exists.** No pointer-lock use anywhere in `src` (grep `requestPointerLock` returns nothing). One orbit camera: `updateCamera` in `src/scene/world.ts:1404-1428` (`dist` clamped 14..520, `pitch` 0.2..1.36, `look` target, terrain clearance via `TerrainCameraClearance`). Eight places read `this.dist` (culls, shadows, tree detail); building cull radius is `8 + dist*.12` (`world.ts:2087`), shadow half-extent derives from `dist` (`world.ts:1654`).
- **Input conventions today** (`engine.ts:1267-1272`): W/Up = pan forward (`pan.z += 1`), S/Down back, **A/Left = pan.x -1 (left)**, D/Right right; Q/E rotate, PageUp/PageDown zoom (`keyboard.ts:44-56`; README "Play without a mouse"). `cameraInput.ts` gates wheel/touch to the canvas. First person must keep: A moves left, D right, W forward, mouse right turns right.
- Terrain queries available to an avatar: `Game.height(x,z)` (`sim.ts:413`), `Game.waterAt` (`:411`), `Game.walkable` (`:1142`), `visibleAt`/`exploredAt` (fog). Player ruler exists as a unit: `spawnUnit("leader", ...)` at the camp (`sim.ts:674`; `UNITS.leader` "Chieftain", speed 3.6), so a "walk as the leader" avatar is possible without new unit types. [Whether that unit survives succession/death is UNVERIFIED; check `dynasty.ts`/`rulersRuntime.ts`.]
- Prior design (`docs/FIRST_PERSON_DESIGN.md`) already decided: first person is only a camera mode (same renderer, same HUD); primary mode "Walk" with a **bodiless witness** avatar; secondary "Audience" and "Ride along" (read-only camera on a villager's eyes); reporters walk up to you (read model shared with pins). Its eye-level render findings F1 to F7 and the P0/P1/P2 fix list are the work list for the renderer (terrain faceting at 4.06 m cells, flat door slabs, near-fade for ground cover, eye below water).

### Boris's ask vs the prior design
Boris asked to "walk as a villager/leader". The prior design's default is a bodiless witness (no free actions). Resolution proposed here: **Phase 1 Walk = witness at leader eye height (default, no sim change); Phase 4 Ride-along = the camera follows a chosen villager or the leader unit read-only; "possession" with orders is allowed only through existing typed commands** (`commandGateway.ts`/`engineDispatch.ts`). Decision for Boris is recorded in the checklist below.

### Proposed design
1. **Camera seam (Phase 0).** Add `viewMode: 'orbit' | 'walk'` to `Engine`/`WorldView`. In walk mode `updateCamera` takes a pose `{x,y,z,yaw,pitch}` instead of `look/dist`, sets `camera.near = 0.1`, FOV 62 to 70, and feeds the sun, shadow box, building cull and tree LOD from the eye (the prototype in `tools/render-preview/fp-entry.tsx` shows the ~30-line recipe; do not keep `dist` consumers on the stale orbit value). Exiting restores the exact stored orbit pose.
2. **Input.** Pointer lock for mouse; drag-to-look on trackpads (owner's hardware is a laptop per the prior doc). Keys: W/S forward/back, **A/D strafe left/right**, mouse yaw right = turn right, Shift sprint, Esc leaves pointer lock then walk mode, Space pause. Toggle key: `KeyO` or `KeyU`, which do not appear in `keyboard.ts` [re-grep `engine.ts` before binding]. Keep `eventInsideUi` gating so HUD clicks never steer.
3. **Avatar and collision.** Capsule radius 0.4 m, eye 1.6 m; ground = `Game.height`; reject steps where `Game.waterAt(x,z) > height - 0.3` (wading limit), where `Game.walkable` is false (buildings are solid in the walk grid), and where `visibleAt`/`exploredAt` is false (never reveals fog). Slope limit: reuse `terrainWalkCache`/walk rule `|dh| <= 2.45` per cell (`sim.ts:1091-1100`), but at eye level also smooth the capsule over 1 to 2 m so 4 m cell facets do not jitter.
4. **Interaction.** Crosshair ray (existing `pickEntity`, `world.ts:1434`) selects people/buildings; E opens the same panels as click-select; orders go through the existing command gateway. "Click person then building" (L3 lane) is the same flow, so build it once.
5. **Reports and audience** per prior doc phases 2 to 3 (new pure `reports.ts` read model; hall interior kit). Not first priority.
6. **Eye-level quality (the real cost).** Order from the prior doc: P0 near-fade for ground cover within 0.9 m, water/terrain clamp, eye-based sun/cull path; P1 shadows on with a tight ±40 m frustum, near-LOD people faces/hands, framed door reveals; P2 slope-aware terrain texturing, optional 1 m tessellation ring.
7. **Performance.** Same renderer, so cost = near-LOD everything in a smaller frustum. Existing draw-distance governor (`drawDistance.ts`) and `entityFrustumCensus.ts` apply. Measure p95 frame time walk vs orbit on the 8 GB M1 per the prior doc's phase table; the numbers in the prior doc are unmeasured estimates **[UNVERIFIED]**.

### Dependencies and risks
- `world.ts` is 3,485 lines with one orbit camera read in eight places (prior doc risk); touch it in one change set. L3 lane (building behaviour, "people standing inside buildings") overlaps with interiors: coordinate.
- No interiors exist; a door you can look through shows nothing. Start with the hall only (prior doc decision 5).
- Worker mode: `Engine` has a parked experimental simulation Worker (`simulationWorkerHost.ts`); queries used by the avatar (`height`, `walkable`, `visibleAt`) must be in the render-query allowlist (`simulationRenderProjection.ts`) before walk works with the Worker on. Currently Worker is deferred (AGENTS.md), so main-thread only is fine.

### Suggested order of work
1. Seam and pose override with orbit restore (no new features). 2. Pointer-lock input plus capsule walk on the real height field. 3. Eye-level P0 fixes. 4. Selection/interaction with existing panels. 5. P1 fixes (shadows, doors, near people). 6. Reports. 7. Audience hall. 8. Ride-along.

### Definition of done (Phase 0 to 1)
- [ ] Toggle in and out 20 times; orbit pose restored bit-exactly (test with stored vs restored `look/yaw/pitch/dist`).
- [ ] A moves left, D right under the walk camera at yaw 0 and yaw pi (assert on camera-space delta; this is the project's top ship-blocker rule).
- [ ] Walk a full village loop at 1.6 m without entering a building footprint or water deeper than 0.3 m; never leaves explored fog.
- [ ] Eye below water impossible (clamp test); ground cover near-fade verified in a real engine frame (`tools/render-preview/fp.mjs`).
- [ ] p95 frame time recorded for walk vs orbit, same seed, built game on the M1.
- [ ] Existing saves unaffected (no save field added in Phases 0 to 1).

---

## 2. Future eras, resources, buildings, units, planets

### Current state in code
- Last age = Renaissance (`AGES[5]`). Age count is baked into: `AGE_COST`/`AGE_STAT`/`AGE_CHOICES`/`AGE_BUILDING_VARIETY` array lengths, `buildingHoverText.ts:8` (own copy of the names array), `productionCatalog.ts:11` (`ProductionStage` union), `music.ts:15-20` and `scene/audioState.ts:30-31` (age ladders up to 4 only), `persistence.ts` (age 0..5 validation x3), `wonderDefs.ts:126`, `sim.ts` final-age checks, `advancement.ts:14`. A save with `age <= 5` stays valid if the cap is raised.
- **Resource model is five kinds only:** `ResKind = food|wood|stone|copper|iron` (`types.ts:39`); secondary goods live in `ITEM_KINDS` (`production.ts:49`, 40 kinds up to `ironMetal`). There is no tin, bronze, steel, coal, oil, lime, salt, glass, gunpowder or any energy resource.
- **Polity stages** (`eras.ts`) already run to `maturePolity` (any form, parties, press) and gate diplomacy actions; they are political, not technological.
- Time and scale: simulation day is 56.25 s, year 1800 s (`calendarPacing.ts`); walking is 243 m per game day (`routeWear.ts:36`, per `FUTURE_SYSTEMS_AUDIT.md`).

### Proposed era list after Renaissance
Keep the existing six ages untouched in meaning; add (names are working titles):

| Idx | Age | Defining shift | New primary resources/goods | Key practices (knowledge topics, need-driven) | New buildings | New units | Rival/AI hook |
|---|---|---|---|---|---|---|---|
| 6 | **Industrial** | Fuel moves from charcoal to coal; machines replace labour | coal, coke, steel, bricks, rope-and-rail, early chemicals (saltpetre/sulphur from Renaissance gunpowder) | coal seam observation, coking, steam pumping, rail traction, factory division of labour, standard parts | colliery, steelworks, brickworks, factory, railway station/line, telegraph office, sanitation works | rifleman, field gun, steamship crew | rivals gain "coal gate"; AI builds rail corridors via existing `routeWear` corridors |
| 7 | **Electric (Modern)** | Power networks and oil | oil, refined fuel, electric power (a flow, not a stock), concrete, aluminium | generator, grid, internal combustion, radio, aviation | power plant, substation, refinery, concrete works, airfield, hospital, broadcasting tower | tank, aircraft, motor truck | power as a measured flow like `watermill` power is "live river flow" (`constants.ts` watermill hint) |
| 8 | **Information** | Computation and global networks | silicon, rare earths, data (non-stock service) | computing, satellite comms, automation | data centre, solar and nuclear plants, research lab | drone, robot hauler | tech parity pressure for rivals |
| 9 | **Orbital** | First leaving the planet | rocket fuel, structural alloys, vacuum goods | launch, orbit, closed-loop life support | launch pad, mission control, orbital yard | rocket, orbiter | space race as the end-game rivalry |
| 10 | **Interplanetary** | Colonies | regolith-derived goods, ice water, local energy | surface habitation, in-situ resource use, transfer-window planning | landing site, habitat dome, regolith mine, ice extractor, mass driver, colony hall | lander crews, colony workers | colonies are separate settlements (below) |

Interstellar is out of scope; stop at Interplanetary (confirm with Boris).

### Tech/resource trees (design rule)
Express future techs as **knowledge topics** in the existing shape (`KnowledgeTopic`: need, observation, experiment, result, adoption; `knowledge.ts:23`) so the player pursues practical problems, not a named-invention queue (project rule). Each age adds: (a) 4 to 6 topics gated by actual evidence (e.g. "Coal as fuel": observe coal outcrop sample, burn test in a kiln, proven when a delivered batch fires pottery, adopted by a colliery); (b) 2 to 3 resource transitions that create new scarcity (wood to charcoal to coal to electricity); (c) one binary `AGE_CHOICES` pair per age; (d) required civic buildings in `missingAgeBuildings` (`advancement.ts:12`) and a building-variety count (extend `AGE_BUILDING_VARIETY`, currently `[0,4,5,6,7,8]`).

Technical route for new goods: add to `ITEM_KINDS`/`ITEM_NAMES` (`production.ts`) and recipes, not to `ResKind`, except where a new gatherable node type is needed (coal, oil, tin). A new `ResKind` ripples through `Cost`, `TRADE_OFFERS`, `GATHER`, barter and the rival economy tables (`barter.ts`, `rivalDevelopment.ts`, `tradeNeeds.ts` all special-case copper/iron by age), so add tin/coal/oil as **item kinds with a node source** (`mining.ts`-style) first and promote later if needed [UNVERIFIED: whether `ResourceNode.kind` can carry new kinds without touching `worldgen.ts` placement and saved node records; read `types.ts` `ResourceNode` and `persistence.ts` node validation before deciding].

### Planetary and space layer
- **Representation (recommended, Option A):** a planet is a **record plus a seed, not a loaded map**. New saved state `planets: {id, name, kind, seed, preset, gravity, atmosphere, colonies: ColonyLedger[]}` (optional field, validated like other optional fields in `persistence.ts`; saves without it load unchanged). The active planet is the one `Game.world` holds. Switching planets = `Engine.restart`-style replacement (`engine.ts:499`) with the target planet's world generated from `seed` and the colony ledger materialised into a village. The home planet's village is checkpointed (the existing protected checkpoint path) before the switch.
- Inactive planets and colonies run in the **Regional tier** from `docs/WORLD_SCALE_DESIGN.md` section 4 (ledger rows of stocks, population, production, no entities). That design is not built (steps 5 to 8 of its table are open), so planets depend on it. Conservation rule from that doc applies: nothing is created or lost on tier change.
- **Procedural planet maps** reuse `generateMapWorld` (`mapgen/index.ts:57`) with new presets (`barren-rock`, `ice`, `desert`, `ocean-moon`) and parameters `waterY`, gravity (affects fall/damage/carry), atmosphere (requires habitat buildings; no outdoor farms). `PresetSpec` already carries temperature, wetness, relief, lakes (`presets.ts`). Presets are validated against a hard-coded list in `persistence.ts:196`; that list must become data.
- **Transport:** (1) launch pad turns goods into a **cargo manifest row** in the planet ledger; (2) transfer windows (a periodic event on the game calendar) deliver after travel time; (3) crew and colonists are people records moved between ledgers (same conservation tests as tier moves); (4) no free teleporting of resources. Ships (Section 5 dependency) remain sea vessels; spacecraft are a separate asset type with their own record.
- **Colonies:** a colony hall founds a ledger entry with a starter kit shipped from the home planet; local production (regolith, ice) feeds its stocks; the player can "visit" (materialise) it. Colonies need life support goods (water, power, oxygen as flows) the Industrial/Electric ages introduce.

### Dependencies and risks
- Needs Section 6 (content for ages 1 to 5) and the regional ledger from Section 3 first; otherwise ages 6 to 10 are empty shells.
- Age cap refactor: replace literals `5` with `FINAL_AGE = AGES.length - 1` in all sites above; update the validator and three separate copies of the age names (`constants.ts`, `buildingHoverText.ts`, UI).
- Save version: `SAVE_VERSION = 17` (`constants.ts:530`); optional fields keep it at 17 as in prior batches; `worldgenVersion` whitelist in `persistence.ts:192-199` already enumerates 7..21; new presets or sizes need version 22 with the whitelist updated.
- Scope risk: very large content; ship each age as a vertical slice (one resource transition, one building chain, one unit, one rival behaviour).

### Suggested order of work
1. `FINAL_AGE` refactor and data-driven age tables (no gameplay change). 2. Finish Section 6 so ages 1 to 5 are full. 3. Industrial slice (coal, steelworks). 4. Electric slice (power as a flow). 5. Regional ledger (shared with Section 3). 6. Planet record, ledger and `Engine` world swap. 7. Orbital slice (launch pad, manifests). 8. Colony slice.

### Definition of done (per age slice)
- [ ] Age appears in `AGES`; `ageUpIssue` gates it with measurable infrastructure; every age-count literal replaced.
- [ ] At least 4 knowledge topics reach "adopted" from real evidence in a scripted playthrough; no free resource appears (conservation test passes).
- [ ] New resource scarcity creates a real choice (a test shows the previous fuel/material is insufficient at that population).
- [ ] Rivals reach the age and use the new buildings without remote rewards.
- [ ] Old saves load; new fields optional and validated; save size measured and recorded.

---

## 3. Much bigger maps and a real-Earth map

### Current state in code
- Sizes: `WORLD_SIZES = [1040,1560,2080]` (`worldOptions.ts:5`), validated in saves (`persistence.ts:192`). `MAP = 1040` in `constants.ts:6` (imported by `worldgen.ts`, `trails.ts`, `persistence.ts`, `scene/world.ts`, which later overwrites `mapSize` from `game.world.size`, `world.ts:825`).
- Generator: `generateMapWorld(seed, request)` (`mapgen/index.ts:57`): macro grid fixed `WORKING_CELLS = 256` (`:35`); final height grid `segs = round(size/1040*256)`, i.e. cell about 4.06 m at every size (`:58`), so a 20,800 m world would be a 5,121 x 5,121 grid (about 105 MB of heights alone, per `WORLD_SCALE_DESIGN.md`). Up to 9 candidate retries with fairness checks (`:64`).
- Fixed-size simulation grids: **nav grid `WALK = 520`** (`sim.ts:263`; 29 references; cell = `size/520` = 4 m at 2080, **20 m at 10,400**, coarser than a 4 m building footprint), **fog grid `FOW = 192`** (`constants.ts:592`; cell 54 m at 10,400), `rebuildWalk` (`sim.ts:1084`) loops every cell with `travelHeight` and bank checks.
- Terrain chunking: `src/game/terrainChunks.ts` (64x64-cell chunks, 65x65 vertices at every LOD, pure function of source/lod/chunk/edits, quadtree selection, 96 MB default cache); opt-in via `worldOptions.chunkTerrainVersion 1` and **not wired to the renderer or sim** (header of the file; `worldgen.ts:145-147`).
- Saves: `localStorage` with a zlib+UTF15 codec (`storageCodec.ts`, `save.ts`); measured compressed totals about 0.67 / 2.16 / 2.80 MB at 1040 / 1560 / 2080 (`docs/LOSSLESS_SAVE_CAPACITY_2026-11-02.md`); Web Storage quota assumed 5 MiB UTF-16 there.
- Rivals: `rivalCountForArea` returns 2/3/4 by area thresholds 550,000 and 585,000 m2 (`factions.ts:4`), so every size above 1560 gets 4; larger worlds need a rule beyond that.
- Real-world data in repo: none (`FUTURE_SYSTEMS_AUDIT.md` A1).

### Proposed design

**3a. Standard bigger sizes.** Adopt the target in `WORLD_SCALE_DESIGN.md`: 10,400 m (10x linear, 108 km2) standard large, 20,800 m ceiling; unchanged walk pace (243 m/day) means a 10.4 km world is 43 game days edge to edge. Work items beyond that doc's table, discovered in code:
1. **Sizes as data:** `WORLD_SIZES` and the validator whitelist become derived from one table; `worldgenVersion 22`.
2. **Nav grid:** replace the single `WALK` grid by a hierarchical grid: fine 4 m cells only in a window around the active villages (reuse the "Full tier" window of 2.3 km square), coarse cells (e.g. 32 m) for long-range routing via the existing route/corridor system (`routeWear.ts`, `waystations.ts`). `rebuildWalk` must become windowed/incremental. This is the largest single change.
3. **Fog grid:** make `FOW` proportional to size or tile it per region (cell 54 m at 10 km hides every building-scale detail); `fogProvenance.ts` and 7 files reference it.
4. **Renderer path:** wire `terrainChunks.ts` to the renderer per steps 2 to 3 of `WORLD_SCALE_DESIGN.md` (one mesh per chunk, LOD rings tied to `drawDistance.ts` bands, skirts), behind the existing legacy default.
5. **Mapgen:** keep the 256 working grid for a 10x world only if it is stretched with chunk-level detail (macro cell 40 m, too coarse for rivers); move to a 512 to 1024 macro grid per the design doc and run it in a Worker with stage progress (also feeds the loading screen, Section 4). Generation time per world is **[UNVERIFIED]** (the design doc quotes about 35 s in tests, informal).
6. **Simulation scale:** Regional tier and tier promotion (steps 5 to 7 of the design doc) before any size above 2080 is playable; entity caps of 600 to 900 at Full tier come from the doc and are estimates **[UNVERIFIED]**.
7. **Save path:** at 10x the village count and node records grow; move autosave to IndexedDB with the same codec (key `SAVE_KEY` unchanged for old slots; new slots separate); keep export/import JSON. Memory estimates (150 to 200 MB extra at 20x) are the design doc's, **[UNVERIFIED]** until a profiled spike on the M1.
8. **UI:** minimap (`WorldMinimap.tsx`, `minimapModel.ts`), world setup (`WorldSetup.tsx`), camera pan limit and `dist` clamp 520 (`world.ts:1417`) all assume one screen-sized world.

**3b. Real-Earth map: design = a window, not a globe** (`FUTURE_SYSTEMS_AUDIT.md` A3/A4; reuse, do not redo). `terrainFromDem(window): Terrain` returning the existing `Terrain` contract (`mapgen/terrain.ts:8`) so hydrology, biomes and placement run unchanged; window catalogue baked at build time into small Int16 files under `public/` with a manifest `{id, lat, lon, spanKm, k, source, licence, attribution}`; new preset `real-earth` and generation number; passing-window curation script; latitude-aware climate and a per-world lapse scale. Pace-true scale k about 103 real m per game m (derived from the walk constants and an assumed 25 km/day, see that doc), so 1040 m = 107 km; at 10,400 m the same real window is k about 10 (finer detail, coastline fidelity, real river courses plausible).

**Data source options (verified at primary pages on 2026-11-15)**

| Source | Resolution | Licence / terms as stated by the primary page | Verdict |
|---|---|---|---|
| **ETOPO 2022** (NOAA NCEI) | 15, 30, 60 arc-second; ice-surface and bedrock; GeoTIFF/NetCDF; "Grid Extract" tool for subsets ([NCEI product page](https://www.ncei.noaa.gov/products/etopo-global-relief-model)) | NCEI page states **no licence**; the data.gov record's licence field is `creativecommons.org/publicdomain/zero/1.0/` (CC0) but its `rights` field says "otherRestrictions" with no detail ([data.gov](https://catalog.data.gov/dataset/etopo-2022-15-arc-second-global-relief-model)). Citation requested, DOI 10.25921/fd45-gt74. File sizes not stated on the page | Preferred single baked source. **Licence is ambiguous between the two official pages: flag, keep the NOAA citation in the credits, and ask NCEI if redistribution of derived windows is relied on [UNVERIFIED]** |
| **GEBCO grid** | Latest is **GEBCO_2026**, 15 arc-second; about 4 GB compressed, 7 GB uncompressed netCDF; GeoTIFF 7.2 GB ([GEBCO](https://www.gebco.net/data-products/gridded-bathymetry-data)). (The older audit cited 2025; superseded.) | "placed in the public domain and may be used free of charge"; acknowledge source (citation and DOI on the page); commercial use not addressed on that page, check the linked conditions of use [UNVERIFIED] | Equal-quality fallback; credit required |
| **Copernicus DEM GLO-30 / GLO-90** | 30 m (1") / 90 m (3"); vertical accuracy under 4 m LE90 ([Copernicus Data Space](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)) | "free license", registration required; public may view and download GLO-30/90; distribution notice "provided under COPERNICUS by the European Union and ESA; all rights reserved", adapted data needs a "produced using" notice | Only if sub-km detail is wanted at 10x+; redistribution notice must ship in credits; check ESA user licence before bundling baked windows [UNVERIFIED] |
| **AWS Terrain Tiles** (Mapzen/Tilezen) | tiled elevation on S3 | Page names no licence type, links to the joerd attribution document; suggested citation "Terrain Tiles was accessed on DATE from registry.opendata.aws/terrain-tiles" ([registry](https://registry.opendata.aws/terrain-tiles/)). Zoom levels and formats not stated there | Not recommended for baking (mixed upstream sources, attribution chain); do not fetch at runtime (the artifact/CSP and offline-play rules favour baked data) |
| **Natural Earth** | vector and raster, 1:10m, 1:50m, 1:110m | "All versions of Natural Earth raster + vector map data ... are in the public domain"; attribution not required ([terms](https://www.naturalearthdata.com/about/terms-of-use/)) | Coastline/river/lake vector overlays for river pinning and optional real names. That it carries a usable river layer at the needed detail is **[UNVERIFIED]** |
| SRTM 30 m | 1 arc-second land | Not fetched this pass **[UNVERIFIED]** | Not needed |

**Resolution, chunking, budgets (real map).** Baked window sizes: 257x257 Int16 = 132 KB raw, 513x513 = 526 KB, 2,561x2,561 (10x) = 13 MB raw before deflate (arithmetic). A 30-window catalogue at 1x to 2x is a few MB (per prior doc); at 10x either ship fewer windows or derive from ETOPO at runtime from a single regional download (Offline play and licences argue for baking). Streaming: a `TerrainSource` backed by the baked array plugs into `terrainChunks.ts` unchanged (the design's step 9 "just another source"); chunk 38 KB each; resident set 360 to 468 chunks = 13 to 17 MB (design doc). Heightmap import: area-average resample to the cell size, quantise to decimetres, store lat/lon/k in the manifest; biome import: derive from latitude, elevation, wetness and the existing biome classifier (`mapgen/biomes.ts`) rather than importing land-cover data (a land-cover dataset has not been sourced; **[UNVERIFIED]**). Save size: saves hold only `{windowId, manifest hash, terrainSeed}` plus the usual edits and entities; the terrain is never in the save (same rule as today, `WORLD_SCALE_DESIGN.md` 3.5).

### Dependencies and risks
- 3a nav/fog grids are prerequisites for any world above 2080 m. Regional tier is prerequisite for villages beyond watch range.
- `persistence.ts` whitelists (`worldgenVersion`, preset names, `WORLD_SIZES`) must change in the same commit as new generation numbers; old saves must regenerate identically from `mapgenV20`/`mapgen` v1 (frozen, `mapgenV20/README.md`).
- Real windows may fail fairness/start checks; curate and store only passing windows.
- Licensing: ETOPO ambiguity and Copernicus notice obligations (above).
- Whole-planet walking is infeasible at honest pace (continent crossing is days of 1x play per `FUTURE_SYSTEMS_AUDIT.md` A4); a globe needs the abstract journey layer, not the unit-walk sim.

### Suggested order of work
1. Size table and version bump with validator update. 2. Windowed nav grid and fog tiling at the current sizes (behaviour-preserving, tested against existing nav tests). 3. Chunked renderer path behind a switch. 4. Mapgen v2 macro plan in a Worker with progress. 5. 10,400 m playable with Full/Reduced tiers. 6. IndexedDB save path. 7. Regional ledger. 8. `terrainFromDem` and window tool with licence/attribution manifest. 9. Real-Earth preset, curation, UI picker with attribution display.

### Definition of done
- [ ] A 10,400 m world generates, saves, reloads and plays on the target Mac within the recorded memory and frame budgets (numbers measured, not estimated).
- [ ] Old 1040/1560/2080 saves load unchanged and produce identical heights (hash test).
- [ ] Nav tests pass at 4 m resolution around villages at every size; no unit walks through a building footprint.
- [ ] Autosave of a 10x village completes without `QuotaExceededError` (IndexedDB path), export/import round-trips.
- [ ] Real-Earth: at least one curated window passes fairness; credits screen shows the required attributions; manifest hash stored in `world.options`.

---

## 4. Loading screen and a new name

### Current state in code
- Boot overlay is a static div "Raising the camp..." with the title block, shown while `!hud.started` (`src/ui/GameApp.tsx:195-222`). The richer welcome (title, `WorldSetup`, Begin button) is disabled by `SHOW_WELCOME=false` (`GameApp.tsx:4`).
- World creation is **synchronous on the main thread**: `Engine.restart` calls `new Game().reset(...)` which calls `generateWorld` (`sim.ts:458`, `engine.ts:503`). The page cannot repaint a progress bar during generation; the mapgen pipeline is a single sync call chain (`mapgen/index.ts` `buildOnce`, then `worldgen.ts` post-passes). Generation time per world (informal about 35 s in tests, per `WORLD_SCALE_DESIGN.md`) is **[UNVERIFIED]** for a browser.
- Name usage: `__root.tsx:6` `APP_NAME = "Hearthwild"` (tab title), `src/lib/og/site.json` title, `GameApp.tsx` "HEARTH / WILD" splash; `README.md:1` and `GAME_DESIGN.md:1` say "Dawn of Empire"; `constants.ts:529` `SAVE_KEY = "dawn-of-empire-v17"`; `storageCodec.ts:13` envelope tag `hearthwildStorage`; 44 source/tool/test files contain the lowercase string (grep). No file in the repo says "working title"; the repo itself uses two names, which is the evidence it is provisional. Boris's statement is the authority.

### Proposed loading screen
1. **Stage list with real progress**: `mapgen/index.ts` already has natural stages (terrain, climate, hydrology, height field, biomes, placement; `buildOnce`), `worldgen.ts` adds geography, ecology, water, rivals. Add an optional `onProgress(stage, fraction)` argument threaded through `WorldRequest` (not saved) and a stage weight table.
2. **Make progress visible**: Option 1 (minimal): paint the loading overlay, wait two animation frames, then run the sync generation (CSS transform/opacity animations usually keep running on the compositor while the main thread is blocked: **[UNVERIFIED]** in this app's Chromium). Option 2 (real): turn the chain into stages that `await` a macro-task yield between them, or run `generateWorld` in a Worker and transfer typed arrays; Worker needs `WorldData` to be structured-cloneable (it carries class instances such as `chunkTerrain`, local water indexes and closures: **[UNVERIFIED]**, check `worldgen.ts` before choosing).
3. **Content**: world seed and preset name, stage text in the game's voice ("Raising the ridges", "Cutting the rivers", "Seeding the woods", "Finding the first fire"), a tip rotation from existing help (`H` keyboard help), art from the game's own palette (`ART_DIRECTION.md`); no fake percentages: bar = completed stage weights.
4. **Also cover**: resume saved village (decode and validate steps in `engine.ts` `prepareVillage`), asset/shader warm-up, and error state (existing "Raise the camp again" retry).
5. Desktop only; no mobile layout work.

### Name: working-title check and candidates
**Check:** `Hearthwild` is the tab title and splash only; docs and the storage key use "Dawn of Empire" (a different, older name). Treat both as working titles. Hearthwild fits a campfire survival start but not a game that ends in orbit (Section 2).

Eight candidates (none checked for trademarks, store-name clashes or domains: **[UNVERIFIED]**; do that before adopting):

| # | Name | Rationale |
|---|---|---|
| 1 | **Longhearth** | Keeps the hearth motif of the opening camp, "long" carries the span from first fire to colonies and the ages; short, one word, ownable. |
| 2 | **Firstlight** | Dawn imagery matching the dawn/ages framing; also reads as first fire and first launch. (Common word; likely crowded.) |
| 3 | **Wayfire** | Fire as the thread: campfire, forge, furnace, engine exhaust; "way" suggests journeys and routes. |
| 4 | **Emberward** | Ember becomes a lasting civilisation and then a rocket plume; slightly fantasy in tone. |
| 5 | **Hearth and Horizon** | Literal arc: home camp to the horizon (maps, seas, space); long but descriptive. |
| 6 | **Many Hearths** | Emphasises the many societies and villages that make the world; understated. |
| 7 | **Kindled** | The act of starting a society; short; weak on the space end. |
| 8 | **Landfall** | Settlement, ships and planets all share the idea of arriving; likely overlaps existing titles [UNVERIFIED]. |

**Recommendation: Longhearth** (display name "Longhearth"; tagline keeps "A home on open ground"). Rename scope when chosen: `APP_NAME` (`__root.tsx:6`), `src/lib/og/site.json` (and regenerate share card via the `og` flow), the splash block in `GameApp.tsx`, `README.md`, `GAME_DESIGN.md`, `PLAY.txt`; **do not change** `SAVE_KEY`, the `hearthwildStorage` envelope tag, CSS `.hw` classes, `tools/` names or test fixtures (saves and tests depend on them). Folder name `hearthwild-render` stays.

### Dependencies and risks
Worker generation conflicts with the parked Worker policy (AGENTS.md, "expanding the experimental Worker is deferred"): use staged main-thread yields for the first version. Name change touches the og branding file the platform injects; keep platform branding rules in `AGENTS.md` intact.

### Suggested order of work
1. Progress callback plumbing and stage weights. 2. Overlay component with stage text and bar (also used for resume). 3. Yield between stages (or Worker if `WorldData` is cloneable). 4. Name decision by Boris, then display-string rename.

### Definition of done
- [ ] Creating a new world shows a moving bar with at least 6 distinct stages; the UI is not frozen between stages (measure longest main-thread block between yields).
- [ ] Failure shows the engine's own message and a retry; resume saved village shows decode/validate stages.
- [ ] Old and new saves still load (`SAVE_KEY` unchanged); a grep for display-name strings shows the new name in tab title, splash, README and og card only.
- [ ] Names shortlisted by Boris; trademark/domain check done before the rename merges.

---

## 5. Donut-shaped map

### Current state in code
- Presets: `MAP_PRESETS = ['archipelago','island','continents','pangaea','river-valley','highland','steppe','lakeland']` (`mapgen/presets.ts:2`); land shapes are generated as blobs in `buildBlobs` (`mapgen/terrain.ts:~35-110`, coordinates as fractions of the map) and then eroded. `PresetSpec` carries `land`, `ranges`, `landmasses`, climate and geology. Candidate selection retries up to 9 times, falling back to `river-valley` after attempt 6 (`mapgen/index.ts:64-68`).
- `components()` (`terrain.ts`) labels connected land components; `placement.ts` places starts with fairness checks and resource clusters.
- Persistence whitelists the 8 preset names (`persistence.ts:196`).
- Ships: `tradeFleet.ts` `SHIP_CLASSES` raft (age 0), dugout, sailboat (age 1), trader (age 2), merchantman (age 3); naval designs and port works in `navalClasses.ts`; deep-water regions in `deepWater.ts`; `coastalStrategy.ts` caps harbour distance at 320 m (`COASTAL_BOOTSTRAP_RULES.maximumHarborDistanceMetres`). Ship, harbor and water-only-route behaviour is **cloud lane P5** (recent commit `bb4fd1d9` "Trade: water-only ship routes, ship classes, harbour slots...").
- **Defect to fix first:** `deepWater.ts` header: "A region touching the map edge is open sea; any other deep region ... is inland." A central ocean enclosed by a ring never touches the edge unless the ring is open, so it would be classed as an inland deep lake (affects storms, voyages and port admission).

### Proposed design
1. **New preset `ring`** (name in UI "Ring World" or "Atoll"): add to `MAP_PRESETS`, a `PresetSpec` (`land` 0.18 to 0.24 of area, `landmasses: [1,1]` for the ring plus separate islands counted separately, relief about 0.9, hills 1, ranges 1 to 2 low along the ring spine, rivers short, lakes 0 to 1), and a `buildBlobs` case.
2. **Ring shape:** blobs along a closed circle of radius R about 0.33 (map fraction) with jittered radius, width 0.06 to 0.10, overlapping by at least 40% of blob width so the ring is continuous; apply a low-frequency radial wobble so it is not a perfect circle; ring circumference about 2.1 km at 1040 m (2 pi x 343 m) and 4.3 km at 2080 m; at 10x size 21 km. Verify continuity with `components()` after erosion; if the ring splits, retry (the existing 9-attempt loop) and reject on rejected reasons like other `V20 ...` errors.
3. **Islands in the middle ocean:** 5 to 9 blobs inside radius 0.22 (classes like archipelago: 1 to 2 mid islands radius 0.04 to 0.07, 4 to 7 islets radius 0.012 to 0.03), kept apart by the same gap logic (`gap` 0.03 to 0.05) and at least 0.06 map fractions from the ring so a boat crossing is meaningful (about 60 m at 1040, 125 m at 2080) and no more than about 0.2 so harbour-to-harbour trips stay inside the ship range rules (confirm with P5).
4. **Resources and balance:** ring land gets baseline wood/stone/farmland and exactly one starter copper seam and one iron seam per society sector (so nobody is soft-locked; `placement.ts` start fairness handles minimum metals); islands receive 2 to 3 times the metal seam size and count, plus the unique goods slot (obsidian/salt/dyes/hardwood) and richer fish grounds. The reward must cost ships: first crossing needs a sailboat (age 1) or dugout in calm weather; the lure is Bronze acceleration. Tune with measured stocks: expected copper per society in ring vs islands (tool in `scripts/` based on `placeWorld` outputs).
5. **Starts and rivals:** place society starts at equal angular spacing on the ring (fairness measure = angular spread plus path distance along the ring; replace pure Euclidean spread for this preset). Land contact is along the ring only, so raids and trade are linear: expect two neighbours per society; compensate with the central sea as the third front (sea raiders `TEAM 3`).
6. **Navigation:** the central ocean must be tagged open sea (fix in `deepWater.ts`: treat deep regions above an area threshold, or flagged by the terrain `sea` mask rather than edge contact, as open sea). Both outer and inner coasts are valid harbour sites.
7. **Save/version:** new preset name needs `persistence.ts:196` list update (data-driven, see Section 2) and `worldgenVersion 22` only if generation output of existing presets changes; adding a preset does not change existing seeds (new `case`), so a minor flag may suffice [UNVERIFIED: confirm `mapgenVersion` rules in `persistence.ts:197`].
8. **UI:** preset blurb and minimap thumbnail in `WorldSetup.tsx`; map gallery tool `scene/mapGallery.ts`.

### Dependencies and risks
- Ship systems are cloud-owned (P5): this plan must wait for or coordinate with their open-sea ranges, harbour slots, storm exposure (`seaStorms.ts`) and AI crossing logic (`coastalStrategy.ts`). Only generator, placement and the `deepWater.ts` classification belong to this lane.
- Thin ring land (about 60 to 100 m wide at 1040) may fail the opening-site, farmland and drinking-water requirements (`openingWater.ts`, `COMPACT_SETTLEMENT_RULES`); widen the ring near each start (bulges) rather than the whole ring.
- Mapgen must still include the full geological feature catalogue (`AGENTS.project.md` map rules): distribute rivers, hills, canyons, cliffs, terraces across ring segments and islands; one smooth ring is not acceptable.
- Near-copy islands are rejected by the coast fingerprint rule (`coastFingerprint.ts`); keep island silhouettes varied.

### Suggested order of work
1. Fix open-sea classification (with a test). 2. `ring` blobs plus continuity gate. 3. Island belt and gap rules. 4. Resource weighting and start placement. 5. Fairness metric by ring path. 6. Rival and raid behaviour check with P5 ships on main. 7. UI entry and minimap.

### Definition of done
- [ ] 100 seeds: ring continuous (single ring component) and 5 to 9 interior islands in at least 95; failures retried within the 9-attempt loop, none fall to fallback silently.
- [ ] Every society start has fresh water, fertile ground, one copper and one iron source on the ring; islands hold at least 2x the metal of an average ring sector (measured by a script).
- [ ] Inner sea classified open sea; a sailboat voyage ring-to-island succeeds in a scripted test; storm exposure applies.
- [ ] Rendered terrain inspected at gameplay scale shows varied dramatic and ordinary landforms; screenshots saved.
- [ ] Old saves with the 8 presets unchanged (hash check).

---

## 6. Fuller ages: Bronze to the end

### Audit: what each age currently unlocks (from the data tables)

Buildings by `BUILDINGS[..].age` (`constants.ts`): age 0 = about 36 of 45 types (every workshop, mill, aqueduct, canal, well, cistern, barracks, dock, pen, bridge, townhall, hut, farm...); **age 1**: forge, watchtower, stables; **age 2**: stone wall; **age 3**: temple, market; **age 4**: keep, flooded moat; **age 5**: academy (university). (Watermill, windmill, aqueduct, canal show age 0 although the production catalogue lists them as Medieval/Classical; cloud lane P8 owns "mill ages", so do not touch that here.)

| Age | Buildings | Units (`UNITS[..].age`) | Goods and mechanics gated by `age` | Other |
|---|---|---|---|---|
| Stone (0) | nearly all workplaces | worker, leader | stone spear, hunting bow (`warfare.ts`); wooden boats (raft, dugout); wild crafts; crops; knowledge topics for fibre, pottery, cooking, preservation, brewing, dairy, milling, baking, hides, garments (`knowledge.ts`, `*Knowledge.ts`) | 14 catalogue stations available, 24 partial, 10 planned |
| Bronze (1) | forge, watchtower, stables | spearman, archer, swordsman | copper mining and trade (`mining.ts:98`; `encounters.ts:23`; `barter.ts`), metal blade (copper 6, `warfare.ts`), copper farm tools (`farmTools.ts`), sailboat (`tradeFleet.ts`), stonework terrace flag (`terraceRuntime.ts:21`), copper smelting topic (`knowledge.ts:96`) | catalogue: 8 partial, 12 planned; **there is no tin and no bronze item**; "Bronze" is copper only |
| Iron (2) | stone wall | none new | iron mining and trade, iron tools (`farmTools.ts:17`), bloom and consolidation recipes (`production.ts`), trading ship, irrigation known (`terraceRuntime.ts:20`), wonders minAge 2 (12 of them) | catalogue: 7 partial, 6 planned |
| Classical (3) | temple (+8 pop), market (-12% gather time, `sim.ts:1017`) | **none** | merchantman, wonders minAge 3 (9), civic institutions ritual/learning (`societyCivic.ts`) | catalogue: 8 partial, 9 planned (baths, sewers, infirmary, council hall, fountains, siege yard all planned) |
| Medieval (4) | keep (+6 pop), moat | cavalry (needs iron 4, stables) | cavalry, crossbow/ballista data (`weaponFamilies.ts`; data table is only referenced by `scene/itemRegistry.ts`, live crafting uses the three weapons in `warfare.ts`) | catalogue: 5 planned, 0 working; **no ship class, no wonder, no knowledge topic** |
| Renaissance (5) | academy (+10 pop) | none (`warden`/`ranger` are age 9: unreachable placeholders) | royal-guard army pick (+50% hp), `AGE_STAT` 1.68 | catalogue: 3 planned; academy has no teaching mechanic beyond +10 pop (`societyCivic.ts:196` learning institution needs university or workshop) |

Catalogue counts by stage and status (`productionCatalog.ts` stations): Stone 14 available / 24 partial / 10 planned; Bronze 8 partial / 12 planned; Iron 7 / 6; Classical 8 / 9; Medieval 0 / 5; Renaissance 0 / 3. Statuses may lag the code (`well`, `cistern`, `aqueduct`, `watermill`, `windmill` exist in `BUILDINGS`; the catalogue still marks several "planned"): audit before using as a work list.

**What the player feels (inference, not measured):** from Iron on, advancing mostly raises a hit-point multiplier, unlocks one or two buildings that add population or a flat bonus, and swaps a binary choice; few new decisions, no new scarcity after iron, no new unit until cavalry in Medieval, no age 4 to 5 ship or wonder.

### Thin spots
1. Bronze without tin/bronze; copper is the same resource as in Iron-age tools.
2. Iron age adds only a wall and iron; steel and dressed stone are catalogue-planned.
3. Classical: no unit, no sanitation/health building, no coin/market mechanics beyond -12% gather time.
4. Medieval and Renaissance: almost nothing beyond keep/moat/academy; no ships, wonders or topics after age 3.
5. `AGE_STAT` is the main age reward; it is not a mechanic.
6. Mills, aqueducts, canals sit at age 0 (cloud lane P8 fixes ages; align the content below with the final ages).

### Proposed additions per age (priority P0 = do first, P1, P2). Every item must follow the physical-goods rules (real inputs, labour, delivery, no free resources).

**Bronze (1)**
- P0 Tin and bronze: tin seams (rare, often on other landmasses or islands; ties to Section 5) as a node type, alloying recipe at the forge (`copper + tin -> bronze`; catalogue station-53), bronze tools/weapons tier above copper with measurable damage/durability/yield deltas; bronze requires trade or exploration, creating the first real long-distance good.
- P0 Wheelwright/cart yard (station-56 partial), reed/thatch roofing (station-37), hay/fodder store (38, 39) so livestock matter.
- P1 Casting mould workshop (54), salt pans and salt curing (46, 47), well lining (59), builders' yard (60), flax retting (41).
- P2 Ore crushing (51), trade stall (58 partial).

**Iron (2)**
- P0 Dressed-stone yard and lime/mortar (64, 65) so stone buildings need a prepared material and fuel; bridge/road works (66) as maintained roads.
- P0 Iron-age unit identity: heavier infantry via armor plus iron blades (wire `weaponFamilies.ts` data into live crafting, shared with L1 military lane).
- P1 Roof tile/brick kiln (92), regional store/caravan waystation (73, `waystations.ts` exists), garrison store/training ground (69), pack-animal station (72).
- P2 Staffed tower/gatehouse (68), repair yard (71), workshop apprenticeship (74).

**Classical (3)**
- P0 Water and health chain: public bath, latrine/sewer, fountain, infirmary (stations 77 to 81) tying to P7 health (cloud lane: coordinate, do not duplicate disease rules) and aqueduct reservoir works (78).
- P0 A real Classical unit: heavy spear/legion-style formation or pike (`weaponFamilies.ts` has `pike` age 3, `warBow` age 3) with training ground; commanders from L1.
- P0 Market depth: coinage/price discovery from actual trades (`TRADE_QUOTES.md`), merchant stores (75), harbour/warehouse/ship repair (87).
- P1 Council hall/records office (83) tied to governance lane L2a (government types by population from Bronze), stone housing/fire service (89), civil engineering/surveying (100), siege/military engineering yard (90).
- P1 Wonders: already 9 at minAge 3; add 2 to 3 civic ones.
- P2 School/library/writing (86) feeding the knowledge network (records already exist as `methodRecords.ts`).

**Medieval (4)**
- P0 Steel: carbon/fuel control, graded steel and failed batches (station-93); steel tools/weapons tier; first age after iron where a new metal matters.
- P0 Agricultural leap: heavy plough with draught animals and three-field rotation modelled through existing farm yield/fertility (`cultivation.ts`, `draftTraction.ts`, `docs/FARM_CALIBRATION_RESEARCH_2026-11-11.md`), real mills for the grain chain (cloud lane P8 keeps ages).
- P0 Ships: carrack/cog-class larger sailing ship and shipyard (station-99; `navalClasses.ts` port tier 2 to 3 exist) after P5 lands.
- P1 Mounted service: saddler/farrier/mounted stable (94), castle/siegeworks (95), guild halls with specialist quality (96).
- P1 Wonders: add Medieval wonders (none exist at minAge 4).
- P2 Cathedral/long-term civic building affecting prestige and succession (`dynasty.ts`).

**Renaissance (5)**
- P0 Paper/ink/printing and records (97) feeding the knowledge network: books make taught practice transferable (`tradedTeaching.ts`, `capturedKnowledge.ts` exist) and slow knowledge loss.
- P0 Gunpowder chain: saltpetre/sulphur/charcoal, handguns and cannon with ammunition stocks, counters to walls (`weaponFamilies.ts` has `catapult` age 5, `ballista` 4; siege rules in `siegeRam.ts`).
- P0 Academy with real teaching: qualified teachers raise the learner's practice over time (skills model `docs/SKILLS_MODEL.md`), not only +10 pop (98).
- P1 Ocean ship (galleon/caravel) with long-range exploration and colony-like overseas founding (`coastalCommission.ts`, `boatExploration.ts`); banks/credit via trade ledgers.
- P2 Glass, lenses, surveying instruments, canals with locks (canal building exists).

**Cross-age mechanics (P0)**
- Make age rewards mechanical: replace pure `AGE_STAT` growth with equipment-derived power (already moving that way via weapons/armor), keep a small stat floor for continuity.
- Each age introduces at least one new scarcity or logistics pressure (Bronze tin trade, Iron fuel for bloom, Classical water/sanitation, Medieval soil fertility and steel fuel, Renaissance gunpowder inputs).
- Each age gets 1 new rival behaviour (rival development tables `rivalDevelopment.ts`) and at least 1 new unit or ship class (Classical and Renaissance units, Medieval and Renaissance ships are currently missing).
- Raise `AGE_BUILDING_VARIETY` and required civic buildings only with content, or advancing becomes an empty gate.
- Keep `AGE_COST` reserve rule and the needs-driven knowledge model; existing thresholds change only deliberately (project rule).

### Dependencies and risks
- Overlaps with active local lanes: L1 military (weapons per age/material, commanders), L2a governance (government types by population from Bronze), L3 building behaviour (build time scaling, building look primitive to wealthy); and cloud lanes P5 ships, P7 health, P8 mill ages. Claim the specific stations before editing and read the lane files.
- New goods ripple through rival economy (`rivalDevelopment.ts`, `tradeNeeds.ts`, `barter.ts`, which special-case copper and iron by age); extend those tables in the same change or rivals will ignore tin/steel.
- Balance tests: the failing-before list in the handoff includes several production and workload tests; run only the relevant ones and record deltas.

### Suggested order of work
1. Tin and bronze (P0 Bronze) including trade and rival tables. 2. Dressed stone and lime (Iron). 3. Classical water/health chain with P7. 4. Classical unit and market depth. 5. Steel and plough (Medieval). 6. Medieval ship (after P5). 7. Printing, gunpowder and academy teaching (Renaissance). 8. Age-wide wonders and rival behaviours. 9. Retire `AGE_STAT` dominance.

### Definition of done (per age)
- [ ] Every age lists at least one new resource or logistics pressure, one new building chain, one new unit or ship class, one new knowledge topic that completes from real evidence, and one rival behaviour; each verified in a scripted run.
- [ ] Catalogue statuses in `productionCatalog.ts` updated to match code (planned items either implemented or reclassified).
- [ ] No resource appears without input labour and delivery (conservation tests); saves round-trip.
- [ ] Documented balance numbers (cost, work seconds, yield) and the measured effect on a settlement of the age's typical population.

---

## 7. Decisions needed from Boris (defaults given)

1. First-person avatar: bodiless witness first, leader/villager ride-along later (default) vs controllable leader from day one.
2. Final age: stop at Interplanetary (default) vs add Interstellar.
3. Name: Longhearth (default) or another candidate; trademark check before use.
4. Real-Earth: bake windows from ETOPO 2022 (default), keep GEBCO as fallback; ETOPO licence wording must be confirmed with NCEI.
5. Large maps: 10,400 m as standard large and 20,800 m as ceiling (default), contingent on nav/fog rewrite and IndexedDB saves.
6. Donut: ring is a preset in the normal setup list (default) vs special scenario.

## 8. Unverified items (collected)
- ETOPO 2022 redistribution terms (NCEI page states no licence; data.gov says CC0 plus "otherRestrictions").
- GEBCO commercial-use conditions beyond "public domain, free of charge".
- Copernicus DEM ESA user-licence fit for redistributing baked windows.
- AWS Terrain Tiles upstream licences and zoom/format specifics; SRTM licence; Natural Earth river detail suitability; any land-cover dataset.
- World generation time per world and Worker-transferability of `WorldData`.
- Whether the leader unit persists through succession; whether `ResourceNode.kind` can take new kinds without placement/validator changes.
- All memory and frame-time estimates in `WORLD_SCALE_DESIGN.md` and `FIRST_PERSON_DESIGN.md` (never measured on the M1).
- CSS compositor-thread behaviour during main-thread generation in this app's Chromium.
- Trademark, store and domain availability of every candidate name.
- Whether `KeyO`/`KeyU` are free in all key handlers (only `keyboard.ts` was grepped).
