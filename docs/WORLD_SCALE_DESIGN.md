# World scale design: bigger land, layered simulation, delegated empires

Status: design plus first slice (chunked terrain query layer, opt-in, not wired to the renderer). Owner ask: a world more realistic in size; more abstraction levels and managers as villages grow into empires; a real-Earth map later (parked, see `docs/FUTURE_SYSTEMS_AUDIT.md` section A).

## BLUF

1. **Target 10x linear (10,400 m, 100x the area, 108 km2) as the standard large world and 20x (20,800 m, 400x, 433 km2) as the ceiling for the first release.** Both fit an 8 GB M1 browser tab only if terrain is streamed in chunks and everything far from the player is simulated as aggregates. Neither fits as one whole-grid map: 20x would be 5,121 x 5,121 vertices (105 MB of heights alone, before geology, water and bank terrain) and a 20x-bigger per-frame sim.
2. **Three simulation tiers, one rule: nothing is created or lost when a place changes tier.** Full (people, animals, buildings as entities) near the player and around villages that are being watched; Reduced (a village runs its economy without entities moving on screen) for the player's other villages; Regional (counts, stocks, caravans and armies as ledger rows) for everything else. Moving between tiers is a ledger transfer with deterministic materialisation, tested as a conservation property.
3. **A strategic layer sits on top: regions, governors, stewards with policies, standing orders, caravan routes, notifications by exception.** The player stops micro-managing at roughly 3 to 4 villages and delegates by region. This reuses what exists: influence field (territory), commanders (armies), waystations and corridor wear (routes), caravans and trade planning, and the ruler/dynasty system (governors are people with traits and loyalty).
4. **Ordering by dependency:** shared scale constants, then chunked terrain data (first slice shipped with this document), then per-chunk generation (mapgen v2), then renderer chunk path, then the regional ledger and tier promotion, then the strategic layer, then the notification system, then the real-Earth window on top of the same chunk source.
5. **Honest numbers.** With the current walk pace (243 m per game day, `routeWear.ts`) a 10.4 km world takes 43 game days to cross loaded (1.3 game years); 20.8 km takes 86 days. That is the intended feel: long journeys are weeks, so caravans, waystations and delegation matter. Nothing below was measured on an M1; every budget is an estimate and is marked so.

## 1. Why the land feels toy-like, and what bigger actually buys

Audit finding: 1 game metre is about 103 real metres at the current day-walk pace, because people walk 5.4 m/s x 0.8 for 56.25 s of simulation day = 243 m, against a real 25 km day. People and buildings are 1:1 human scale; the land is compressed about 100x relative to them. Worlds are 1040, 1560 and 2080 m.

Two separate things get conflated:

| Quantity | Meaning | Fixed by |
|---|---|---|
| Geometry scale | real metres of land per game metre | world size vs the real region it depicts |
| Pace scale | real metres a traveller covers per game day vs game metres | unit speed and the day length |

Making the world s times wider does not change pace scale (still 243 m per day). It changes geometry scale: a fixed real region (the audit's 107 km pace-true window) drawn into a world 10x wider has about 10 real metres per game metre instead of 103; at 20x about 5. Terrain features (a hill 300 m across, a river 20 m wide) stop being 100x too small relative to a person and a house. Travel then takes 10 to 20 times longer in game days, which is the pressure that makes abstraction and delegation necessary rather than optional. Full 1:1 geometry (107 km window as 107,000 m) is a later regime that only works with the regional tier carrying nearly everything; it is not a first-release target.

### Recommended target sizes

| Size | Linear | Area | Edge-to-edge walk (loaded, 243 m/day) | Pace-true real window (103 m real per game m, for the Earth map) | Geometry scale if the window stays 107 km | Verdict |
|---|---|---|---|---|---|---|
| 1,040 m (today) | 1x | 1.1 km2 | 4.3 days | 107 km | 103 m per m | legacy, stays |
| 2,080 m (today) | 2x | 4.3 km2 | 8.6 days | 214 km | 51 m per m | legacy, stays |
| **10,400 m** | **10x** | **108 km2** | **43 days (1.3 years)** | 1,071 km | 10.3 m per m | **standard large** |
| **20,800 m** | **20x** | **433 km2** | **86 days (2.7 years)** | 2,142 km | 5.1 m per m | **ceiling, first release** |
| 41,600 m | 40x | 1,731 km2 | 171 days | 4,284 km | 2.6 m per m | research only: needs regional tier proven at scale |

Justification for 10x to 20x, not 4x and not 100x:

- **Below about 8x** a settled valley fills the map within a few years and there is nothing for governors to govern; the strategic layer would be decoration.
- **Above about 20x** the macro height field (mapgen cell about 40 m at 10x if the 256-cell working grid is merely stretched) and hydrology need a finer macro grid (512 x 512 to 1024 x 1024); generation cost and the number of aggregate regions grow with area while the player's attention does not. The first release should prove the tiers at 10x before raising the ceiling.
- Chunk memory is **not** the limiter: with LOD rings a 20 km world needs about 470 chunks resident (17 MB data, table in section 3), the same order as today's 2080 m map (1 MB of height grid plus bank terrain and water).
- The limiter is **sim entities and per-cell fields** (influence field, flow fields, trails, wear). Those are what the tiers and the regional ledger bound.

## 2. Ordered work, by dependency (no time estimates)

Each step lists what it needs and what it must not break. Earlier steps are safe to ship alone.

| # | Step | Needs | Done when |
|---|---|---|---|
| 0 | `REAL_WORLD_SCALE` module: day-walk metres, pace-true k, cell and chunk metres in one place (FUTURE_SYSTEMS_AUDIT A6.1) | nothing | waystations, routes, caravans and chunk code read one constant set |
| 1 | **Chunked terrain data and queries** (`src/game/terrainChunks.ts`), opt-in `chunkTerrainVersion 1` | 0 (soft) | seams, LOD seams, cache caps, determinism, edit shards tested. **Shipped in this slice** |
| 2 | Mapgen v2 per chunk: macro plan once, detail per chunk (section 3.3), geology per chunk | 1 | chunks from a macro plan agree on borders; a 10x preset generates inside its budget |
| 3 | Renderer chunk path behind the same switch: one mesh per chunk, LOD per selection ring, skirts, shared index buffers; horizon/fog agent's far rings become the outermost ring | 1; coordinate with the horizon work | legacy renderer path stays default; frame cost within table 3.4 |
| 4 | Placement and resources per chunk (trees, stones, forage, camps from seeded per-chunk streams); chunk-local indices replace world-global arrays for far chunks | 2 | far chunks hold no entities, only counts in the regional ledger |
| 5 | Regional ledger and tier promotion/demotion (section 4) | 4 | conservation property tests pass for random promote/demote sequences |
| 6 | Strategic layer: regions, governors, stewards, standing orders (section 5) | 5 | a played empire of 8 or more villages runs with less than a few decisions per game month |
| 7 | Notifications by exception and delegation budgets (section 5.4) | 6 | digests and alerts, with caps and snooze |
| 8 | Save migration for chunked worlds and regional ledger (section 7) | 1, 5 | old saves load unchanged; new saves round-trip |
| 9 | Real-Earth window as another `TerrainSource` (DEM-backed), same chunk path | 1, 2 | `terrainFromDem` plugs in as a source; no renderer change |

Step 9 is deliberately last: because chunks are a pure function of a `TerrainSource`, the Earth map is "a different source", not a different system. That is the main reason to do chunking first.

## 3. Terrain chunk streaming

### 3.1 Chunk definition (implemented)

- Chunk = 64 x 64 cells, **65 x 65 vertices at every LOD**. LOD 0 spacing 4 m (the legacy grid is 4.0625 m), so a LOD 0 chunk spans 256 m. LOD n spans 256 x 2^n m with spacing 4 x 2^n m. Max LOD 5 (8,192 m span, 128 m spacing).
- World coordinates are centred like the game. Chunk (cx, cz) at LOD n covers [cx x span, (cx+1) x span). Keys are `lod:cx:cz`.
- Per vertex: `Float32` height (4 B) and five `Uint8` geology planes (rock, under, strata, soil, landform = 5 B). **38,025 B per chunk, about 37 KB**, identical at every LOD. Water surface, bank terrain and fluvial rasters are not in slice 1; they follow the same per-chunk pattern in step 2.
- A chunk is a **pure function** of (source, lod, cx, cz, edits). Every vertex is computed from its integer lattice index to world metres, never accumulated, so neighbours agree to the bit; a coarse chunk's vertices are exact subsets of the fine chunk's vertices (no height cracks between LODs; renderers still need skirts or stitched edges for the unsampled midpoints); evicting and rebuilding gives the same bytes.

### 3.2 LOD rings

Selection is a **restricted quadtree** around a focus (`selectChunks`): the extent is tiled exactly once, a chunk splits while its nearest point is within `splitFactor` (2.2) x span of the focus. Measured on the implementation (focus at the centre, default factor):

| World | Chunks resident | By LOD (0/1/2/3/4) | Data |
|---|---|---|---|
| 1,040 m | 36 | 36 / 0 / 0 / 0 / 0 | 1.3 MB |
| 2,080 m | 100 | 100 / 0 / 0 / 0 / 0 | 3.6 MB |
| 10,400 m | 360 | 144 / 108 / 108 / 0 / 0 | 13 MB |
| 20,800 m | 468 | 144 / 108 / 108 / 108 / 0 | 17 MB |
| 41,600 m | 576 | 144 / 108 / 108 / 108 / 108 | 21 MB |

Ring radii for LOD 0..3 are about 560 m, 1.1 km, 2.3 km, 4.5 km. Chunk count grows with the log of the world size, not its area. A focus away from the centre selects fewer chunks (extent clipped). Adjacent chunks may differ by more than one LOD; the renderer step adds a 2:1 balance pass or skirts. The selection counts are the number of chunk records, not draw calls; the renderer will merge far chunks (step 3).

Rings tie to the draw-distance bands in `drawDistance.ts` (Ultra camera far 3,200 m): the first release uses LOD 0 to the near/mid band, LOD 1 to 2 for the far band and the horizon agent's low-poly rings for the horizon band. The two must share one table; this design does not change those numbers.

### 3.3 Mapgen v2 per chunk

Today `generateMapWorld` is a global pipeline on a 256-cell working grid: layout, ranges, stream-power erosion, climate, lakes and drainage, rivers, height field, game grid, biomes, placement. Erosion and drainage are global; they cannot run per chunk. Plan:

1. **Macro plan once per seed** at 512 x 512 (10x) to 1024 x 1024 (20x), about 20 m macro cells: layout, ranges, erosion, climate, lake and river *networks as vector polylines with flow and width*, geology province plan (`geology/structure.ts`). Memory 1 to 4 MB per float plane; a few planes, under 40 MB. Seconds of generation, run in a worker with progress (cost **UNVERIFIED**: the 256-grid pipeline takes tens of seconds in Node today for a whole world, measured informally at about 35 s per generated world in the test suite; 4x to 16x the cells needs profiling before commitment).
2. **Detail per chunk**: macro height (bicubic) plus band-limited noise seeded from world coordinates and the seed (never from chunk indices), plus river channels cut from the polylines near the chunk (distance to polyline within the chunk's bounding box), lake basins from the lake list, bank terrain from the same rules as `bankTerrain.ts`. All terms are functions of world position, which preserves seam agreement. The slice already does the first two terms (bicubic stretch plus 3-octave detail with a land mask); rivers and banks are step 2.
3. **Geology per chunk**: province id and structural plan come from the macro plan; rock, strata, soil and landform tag are read per vertex from the plan and the chunk's own heights (`buildGeologyGrid` already does this per cell, from final heights). Slope-dependent tags (scree, cliff) need a one-vertex halo; the chunk builder samples height at index -1 and 65 analytically, so the border vertices still agree (this halo rule must be tested when added). Today's slice uses nearest macro cell lookups, which agree on borders trivially and are blocky at stretch.
4. **Placement per chunk**: trees, stones, forage, copper and iron from seeded streams keyed by (seed, chunk, kind), thinned by the ecology grid; camps and fair starts stay macro-level decisions (they need global fairness measurement).
5. **Determinism rule**: no chunk may read another chunk's output; only the macro plan and world coordinates. The test suite enforces this by building chunks in different orders and comparing bytes.

The macro plan needs the existing candidate/retry logic (up to 9 attempts, fairness checks); that stays at macro level.

### 3.4 Memory budget for an 8 GB M1 (estimates, not measurements)

A browser tab on an 8 GB machine should be planned against roughly 1.0 to 1.5 GB of combined JS heap and GPU memory (shared with the OS, the browser and other tabs). Targets at 10x and 20x:

| Item | 10x | 20x | Notes |
|---|---|---|---|
| Terrain chunk data (resident set) | 13 MB | 17 MB | measured chunk count x 38 KB; cache cap default 96 MB (about 2,500 chunks, covers pinned set plus recently used) |
| Terrain GPU meshes (positions + normals, 32 B per vertex, shared indices) | 50 MB | 65 MB | 360 or 468 chunks x 4,225 vertices x 32 B; **estimate** |
| Macro plan (height, flow, climate, geology planes, vectors) | 25 MB | 60 MB | 512^2 or 1024^2 x ~6 planes x 4 B |
| Edit shards (only touched chunks) | < 1 MB | < 1 MB | per-chunk lists of cuts |
| Regional ledger (section 4) | < 1 MB | < 2 MB | one row per region (1,024 m): 121 or 441 rows x about 1 KB |
| Full-tier simulation | cap about 600 to 900 entities | same | per-entity cost dominates; keep today's measured budget (PERFORMANCE_REPORT.md) |
| Per-cell fields at Full tier only (influence, flow, trails, wear) | window of about 2.3 km square | same | today `INFLUENCE_RULES` caps 90,000 visited cells per source with 32 m bins; the field becomes windowed |
| Trees and filler | today's per-level caps in `drawDistance.ts` | same | far trees are cosmetic and per chunk |
| **Total new at 20x** | **about 150 to 200 MB over today** | | **UNVERIFIED**; needs a profiled spike on the target machine |

Worker plan: macro plan and chunk builds run in a worker returning transferable `Float32Array`s; the main thread only receives finished chunks. One chunk build is 4,225 height evaluations (bicubic plus 3 octaves) plus geology; **UNVERIFIED**, likely a few milliseconds each, so a ring change of 20 to 50 chunks is spread over frames with a per-frame budget (same pattern as `INFLUENCE_RULES.sliceMilliseconds`).

### 3.5 Persistence of edits per chunk

Saves never contain terrain, only seed, options and edits. The slice stores edits (bowl-shaped cuts: centre, radius, depth, id) as **shards keyed by the LOD 0 chunks they touch**; an edit that straddles a border is listed in each touched shard and de-duplicated by id on load. A save therefore grows with what the player changed, loading can restore only shards near the player, and any LOD gets the edit (a coarse chunk collects the shards beneath it). Existing excavation records (`TerrainCut` in `excavation.ts`: x, z, w, d, depth) map onto edits in step 3; their profile differs from the cosine bowl, so the real adapter must reuse `cutAmount` rather than approximate it.

## 4. Simulation level of detail

### 4.1 Tiers

| Tier | Where | What exists | Cost driver |
|---|---|---|---|
| T0 Full | within about 600 m of the camera focus and within the active footprint of villages under attention (selected, under threat, in a trade handshake) | every person, animal, building, tree as an entity; flow fields, influence at fine bins; combat and pathing | entities (cap about 600 to 900) |
| T1 Reduced | the player's other villages, allied or contested ones, waystations in use | stock, population by role and skill bucket, building list with condition, work output by schedule; no walking, no pathing; named people kept as individuals | per-village arithmetic per sim step |
| T2 Regional | everything else | region row: population buckets, resource stocks and regrowth, army and caravan records, owner, stance, route usage | one row per region per tick |

Region = a square of 1,024 m (4 x 4 LOD 0 chunks). 10x world: 11 x 11 = 121 regions; 20x world: 21 x 21 = 441. A region row also records which village and waystation ids lie in it.

### 4.2 What each aggregate holds

- **Population:** integer counts by (age band, sex, role) plus a list of **named persons** (rulers, commanders, heirs, governors, anyone the player has selected or named) who are never aggregated. Birth, death and ageing run on the buckets at the region's coarse tick, using the existing mortality shape in `dynasty.ts` (`yearlyDeathChance`).
- **Resources:** stocks by good (integers or fixed-point), and per-chunk regrowth state for wild resources as counts per kind with a seeded depletion record, not per-tree rows.
- **Armies:** a record per army: commander id (a real person, `commanders.ts`), manifest (counts by unit type and rank bucket, armour/weapon grades as histograms), position as a point or a route progress parameter, destination, stance, supply carried. Combat between aggregates resolves by the same counters (`combatCounters`) on histograms; deterministic RNG seeded by (tick, army ids).
- **Caravans:** a record: route id, progress parameter t along the route polyline, direction, cargo manifest (good -> integer), escort count, owner, ETA. Pace along a route uses `ROUTE_RULES.dayWalkMetres`; waystation rest stops are known events at known t.

### 4.3 Promotion and demotion rules

Conservation invariants (each a test):

1. **People:** total head count (entities plus bucket counts plus named persons) is unchanged by any transition; named persons keep id, name, age, traits and skills through both directions.
2. **Goods:** total of every good (stocks, carried loads, caravan manifests, building stores) is unchanged; nothing is rounded away: when a bucket cannot be split evenly the remainder goes to a deterministic, documented holder (the largest holder), and the transfer log records it.
3. **No teleporting:** an aggregate has a position or route parameter at all times. Promotion materialises entities at the position the aggregate would occupy now (route parameter advanced by elapsed time since its last update, along the same path the T0 pathing would take), in formation, never at the nearest convenient spawn point. Demotion records each entity's position and destination and takes the centroid and heading; entities that have not yet reached the demotion boundary finish walking in T0 first (hand-off at the boundary, not at the moment of leaving the radius).
4. **No double counting:** an entity is in exactly one tier; a transition is atomic within a sim step and logged with a transfer id.
5. **Determinism:** materialised anonymous people are generated from a seed of (region, bucket, transfer sequence number), so the same save and the same camera path give the same crowd.

Hysteresis: promote at distance Rp (600 m), demote at Rd = 1.4 x Rp, with a minimum dwell (a few sim seconds) so the camera sliding along a boundary does not flicker. Promotion is rate-limited per frame (spawn budget), spread over several frames, oldest-first by importance (named persons and buildings first). Anything that must interact with a T0 thing (a caravan arriving at a T0 village, a raid reaching a T0 wall) is promoted before contact: a T2 record whose route or path crosses a T0 boundary within N seconds is promoted ahead of time (lookahead along its route).

Region-to-region flows: caravans and migrants in transit are in-transit records on the edge between regions, so goods are never in two regions at once and never nowhere.

Production and economy in T1/T2: the village's work output is computed from the same recipe tables as T0, by schedule (workers x hours x skill), with the same inputs consumed. Rates must match T0 within a tolerance verified by a cross-tier test (run the same village in T0 and T1 for a season and compare stocks); known divergence (pathing delays, congestion) is stated as a constant efficiency factor measured from T0 runs, not a free multiplier.

### 4.4 What stays global

Calendar and seasons, weather (per region from a coarse field), diplomacy and treaties, the market price vector per market, ruler and dynasty records, research and technology, notifications, the command gateway. These are already society-level, not entity-level.

## 5. Strategic layer: managers and delegation

### 5.1 Structure

```
Realm (player)
 +- Province (governor)           ~ 4 to 16 regions; created when the player holds enough regions
     +- Region (steward)          1,024 m square: 1 to 6 villages, waystations, wild land
         +- Village (existing)    unchanged; the foreman/steward layer of the village is the existing sim
```

- **Governor:** a person (from the dynasty or appointed; `dynasty.ts`, `rulerGenome.ts`) with traits (competence, loyalty, ambition) that bias how well and how faithfully orders are executed. Succession, rebellion risk and marriage ties come from the existing ruler/dynasty systems; delegation is *why* ruler traits start to matter at scale.
- **Regional steward:** executes a **policy**, not commands: weights over food security, construction, defence, trade, expansion, a stock reserve target per good, a threat response (fortify, call levy, request help), a worker-allocation preference. A policy is a small record the player edits; a steward turns it into the same commands the player would issue, through the existing command gateway, so validation and ownership rules are unchanged.
- **Standing orders:** condition -> action pairs with a scope: "if grain in region R below N days of food, request caravan from nearest surplus", "always keep two guards at each waystation on route X", "when threatened and strength below S, retreat to village V". Evaluated at the region's tick, not per frame.

### 5.2 Caravan routes and waystations

Routes are a graph: nodes are villages and waystations, edges carry length, corridor wear (from `routeWear.ts`, stored per edge, not per cell, for distant parts), safety, toll and ownership. Today waystations appear on corridors longer than a day's walk at 0.85 x that distance spacing (`waystations.ts`, max 40 total). At 10x, long routes are the norm; the cap and the per-corridor limit become per-province budgets. A standing caravan route is a standing order: (from, to, good, quantity or reserve rule, escort policy). Caravans are T2 records between nodes (4.2) and promoted when near the player or a threat.

### 5.3 Ties to existing systems

| Existing system | At scale |
|---|---|
| Influence field (`influenceField.ts`, 32 m bins, 90,000 visited cells per source cap) | T0 window keeps the fine field. Per region, a coarse ownership/strength grid (for example 64 m cells) is stored in the region row from the last time the area was T0/T1; borders far away change only by region-level events (village founded, conquered, abandoned). Territory colours on the map come from the coarse grid. |
| Commanders (`commanders.ts`) | Commanders stay real persons; their groups aggregate in T2 as manifests; aura radius and capacity rules apply to the manifest. A governor may hold a commander's army in garrison via a standing order. |
| Waystations and corridor wear | per-edge state (5.2); building a waystation is a regional steward action funded from the region stock. |
| Rulers and dynasties | governors and stewards are Persons; legitimacy and succession affect province loyalty; a rebellion is a regional event that flips ownership and spawns an army record. |
| Trade (`tradePlanning`, `tradePricing`, caravans) | one market per region with a price vector; inter-region trade by caravan records; planners run per region pair at the steward's tick; player trade offers stay T0. |
| Polity tier (`polityModel.ts`: band, chiefdom, state) | gates how many layers exist: a band has no governors; a chiefdom gets stewards; a state gets provinces and governors. This keeps early game unchanged. |

### 5.4 Notifications by exception

The player sees: **alerts** (a threshold crossed: famine risk, siege, rebellion, caravan lost, waystation raided), **decisions** (an order that needs the player: a steward asks for more funds beyond its cap, a governor proposes a treaty) and a **digest** per game month ("3 caravans delivered, grain in the north fell 12 percent, no threats"). Rules: severity levels, per-source rate limits, de-duplication by cause, snooze, a hard cap on interruptive alerts per game week, and every alert links to a camera jump and to the policy that caused it. Delegation budgets: each steward has a spending cap per season; exceeding it becomes a decision.

## 6. Risks and open questions

- Mapgen cost at 512^2 to 1024^2 working grids is unmeasured. Mitigation: worker generation, progress UI, and a macro cache keyed by (seed, preset, size).
- Cross-tier economic fidelity (4.3) is the hardest correctness problem; without the T0-vs-T1 comparison tests the regional economy will drift and players will exploit it by moving the camera.
- Gameplay thresholds in game metres (flood clearance, bridge spans, harbour depth) assume the current macro relief; stretched worlds need those checked against the vertical scale policy (FUTURE_SYSTEMS_AUDIT A5).
- Whole-grid consumers (`sampleHeight(world.heights, ...)`, fords, placement, water index, bank terrain, excavation caches) are many; step 3/4 must route them through a height provider before any world exceeds the old grid. The slice deliberately touches none of them.
- The horizon/fog work is rendering only and compatible: it draws beyond the chunk set. This design needs one shared ring table when step 3 starts.
- Real-Earth map (parked): a `TerrainSource` backed by a DEM window; vertical scale policy from the audit applies.

## 7. Migration of old saves

- Old maps stay exactly as they are. Nothing is regenerated, resized or converted. `chunkTerrainVersion` is absent in every existing save and in every new world unless explicitly requested; absent means the whole-grid terrain path, byte for byte (tested: height grid identical with the option on or off).
- The option is stored in `worldOptions` (`chunkTerrainVersion: 1`, optional `chunkTerrainScale`) and validated in `persistence.ts` for worldgen version 21 and above only. A save without it restores to the legacy path; a save with it regenerates the same chunk source from the seed and options.
- Scale-1 chunks on an existing world reproduce its heights and geology at every chunk vertex (tested), so a legacy world can be viewed through the chunk path without visible change; this is the compatibility bridge for the renderer step.
- Later fields (regional ledger, governors, standing orders) follow the repo's existing pattern: optional state fields, absent means off, features switched on by explicit migration only for new games. A world that was made small is never silently promoted to regions; offering "extend this world" (new land outside the old map, old map untouched in the middle) is a future opt-in, not an automatic step.
- New saves store: seed, options, edit shards, regional ledger and strategic records. Terrain and macro plan are always regenerated from the seed (deterministic).

## 8. First slice shipped with this document

`src/game/terrainChunks.ts`: chunk definition and rules, `TerrainSource` and `sourceFromWorld` (a generated world, optionally stretched by an integer or real factor with deterministic detail), `buildChunk`, `selectChunks` (LOD rings as a restricted quadtree), `ChunkTerrain` (LRU cache with byte cap and pinning, point height and geology queries, edit shards with export and import), and `selectionBudget`. Opt-in through `WorldRequest.chunkTerrainVersion` (and `chunkTerrainScale`); the chunk layer is attached as a non-enumerable `world.chunkTerrain`. Tests: `scripts/terrain-chunks.test.mjs`. Debug image: `docs/renders/world-scale/` from `tools/render-preview/world-scale.mjs`.

Not in the slice: renderer use, water and bank terrain per chunk, rivers per chunk, placement, simulation tiers, strategic layer, a Game-level setting UI.
