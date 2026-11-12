# Grok W-World handoff

Updated 11 November 2026, W7 ready (ET). Lane **W-World** (Grok): geography, biomes/ecology, hydrology, navigation/local routing, placement/plots, territory, civil engineering, biome dressing data and terrain-to-building grounding constraints. Read [CURRENT_STATUS.md](../CURRENT_STATUS.md) first. Rules: [EXECUTION_CONTRACT.md](../EXECUTION_CONTRACT.md).

## Batch W7 — ready (aqueduct/canal dig jobs, approved canal breach, river currents, scenic starts, smooth rivers and trails)

Shored cuts were left out (not approved). The trench bank rule (`maximumNaturalGrade` 0.24) is unchanged. Latest main `1085ad7` (docs: pending-branch handoff) was merged normally; the merge is clean.

- **Base:** latest main `1085ad7`, already merged (`10d141f`).
- **Commits (each small and self-contained):**
  - `d99698e`: commission aqueduct and canal lines as ordinary digs; approved canal breach (11 Nov 19:16 ET).
  - `e10f706`: native aqueduct commission test; canals the game cannot fill are refused.
  - `7e74ddf` / `a9fbbfd`: GW-06 river currents (test tightened to a pooled downstream share and a real dry-land check).
  - `59f0e24`: GW-15 measured scenic beauty and a start report with the best valid town-hall site nearby.
  - `ee34c8c`: GW-12 opt-in smooth river-bank and trail-ribbon display data.
  - The handoff commit (this section).

### Merge map for Codex
These groups add only new world-lane modules and tests (no `types.ts`, `persistence.ts`, `save.ts` or `src/scene/world.ts` edits). They can land on their own, or with a normal merge of this branch (it already contains main).

| Group | Commits (in order) | Depends on | Notes |
|---|---|---|---|
| River currents | `7e74ddf` → `a9fbbfd` | nothing | Pure query. Codex hooks: `currentPowerKw`, `driftAt`. |
| Scenic beauty / starts | `59f0e24` | nothing | Pure query. Codex hook: `scenicStartReport` for opening-site pick. |
| Smooth rivers and trails (GW-12) | `ee34c8c` | nothing | Pure display queries. Claude opts in by drawing `smoothRivers` / `trailRibbons`. |
| Aqueduct / canal commission + breach | `c7c9039` → `3ff32bf` → `d99698e` → `e10f706` | W5 site rules and W6 routing | Touches `excavation.ts` (world-lane) and one `sim.ts` dry-foundation line (listed below). Take by merging the branch, or reapply those hunks by hand. |

Docs-only handoff commits carry no code. The earlier W6 merge map still stands for pre-W7 work.

### Save impact (exact)
- **Currents, scenic beauty, GW-12 display:** no save state. They are pure queries. Unflagged generation and trail wear records are unchanged (GW-12 tests assert `world.heights` is byte-identical and `pathPace` is unchanged after building ribbons).
- **Aqueduct and canal digs** use the existing trench buildings and excavation records (same validators as wonder earthworks).
- **New optional save field for canals:** `state.canalWorks` (and a `canalWork` mark on the breach/channel trench buildings). Absent in old saves. `validCanalWorks(state, size)` is ready for Codex's persistence validator. Round-trip is tested on a finished native canal.
- No new `worldOptions` keys. Existing validator asks (`tideVersion` 1|2, `landformLabelVersion` 2, `riverProfileVersion` 2) are unchanged.

### Shared-file edits this batch
- **`sim.ts` (one wiring line, flagged for Codex):** `placementIssue`'s dry-foundation check also allows a trench when `breachPlacementPermit` is true — only inside the commissioner's scoped `withBreachPermit` for a ready canal-breach stage (`canalBreach.ts`). All other wet placements are still refused.
- **`excavation.ts` (world-lane):** `excavationIssue` uses the same permit before refusing a dig that would reach water; `excavationVolume` / `excavationWorkNeed` accept already-paid but not-yet-applied predecessor cuts so a canal's breach digs charge shared soil once.
- No edits to `types.ts`, `persistence.ts`, `save.ts` or `src/scene/world.ts`.

### What landed (native evidence for each)
1. **Aqueduct and canal lines as ordinary digs (`waterLineWorks.ts`, `d99698e` / `e10f706`).**
   - Preview (`planAqueductWorks` / `planCanalWorks`) and commission (`executeAqueductWorks` / `executeCanalWorks`) share one plan; commission is all-or-nothing and refuses if the fresh plan differs from the preview (a tree on a bank refuses the whole job; tested).
   - Digs are ordinary 4 m trenches, batched so overlapping banks wait, union volume charged once (`excavationWorkNeed`, 6 s/m³).
   - Aqueduct, native archipelago 2 (182.7 m line): 3 digs laid out, 4 held 1 m short of the source (no aqueduct breach rule), 19.9 m³ dug, 120 work-seconds paid, arcade 97.9 m reported as masonry (not dug). Workers lowered each centre by its planned depth. The cut survives save and reload. Intake water is untouched.
   - Canals the game cannot fill, or waters already joined by water, are refused and never laid out.
2. **Canal breach, approved 11 Nov 19:16 ET (`canalBreach.ts`).**
   - Only at the end of an otherwise finished channel. Below-water digs are laboured dry; nothing else may breach water (ordinary digs, forged marks, early mouths and other teams are refused; tested).
   - The breach is applied together once every breach dig's labour is done. In the game's water model, ground dug below the surface field is wet, so the plan proves the finished channel will be wet end to end before anything is laid out.
   - Native, archipelago 13 (1560 m), a real 29 m land strip between two sea-level waters: 9 breach digs (7 mouths), 345 m³, 2,085 work-seconds. After the simultaneous breach, every former land sample on the centreline is at least 0.39 m under water. Save validator accepts the record; height matches after reload.
3. **River currents, GW-06 (`riverCurrents.ts`, `7e74ddf` / `a9fbbfd`).**
   - Downstream along the channel. Speed is Manning's formula on the real water surface and depth, `v = R^(2/3) · S^(1/2) / n` (n = 0.045), waterfall drops excluded, slack water at the banks, lakes and dry land still. Hooks: `currentPowerKw` for undershot wheels (½ρAv³η) and `driftAt` for boats.
   - Native, three worlds (pangaea 4, archipelago 2, continents 7): currents run downhill on ≥85% of sloped samples (pooled), speed follows the measured slope (Spearman ≥ 0.85), lakes and dry land have no current, faster water yields more undershot power than slower water on the same map.
4. **Scenic beauty and starts, GW-15 (`scenicBeauty.ts`, `59f0e24`).**
   - A 24-ray terrain viewshed (eye 1.7 m, range 360 m): mountain walls, summit, water, ridge layers, overlook, openness. The score is map-relative (each component ranked against that map's dry land).
   - Native, three worlds: the top decile sees more water and higher walls than the bottom decile. Start percentiles: 25.6, 68.2, 75.4. Every start has a valid, gentle town-hall site within 160 m at the 60th percentile or better (dryFoundation checked). Deterministic and terrain-only.
5. **Smooth rivers and trails, GW-12 (`channelSmoothness.ts`, `trailRibbons.ts`, `ee34c8c`).** Opt-in at the renderer: Claude draws these polylines; physics, wet/dry, pathing and trail wear are unchanged until then (and stay unchanged after — this is display data).
   - Rivers: banks are traced on the real waterline, Chaikin-smoothed, and clamped so no display point wanders more than 0.75 m from the physical edge. Historic terrain is byte-identical.
   - Native width-jumps (≥ 2 m) and bank jitter, raw → smoothed display:

     | World | Width jumps | Mean bank jitter (m) | Max bank deviation (m) |
     |---|---|---|---|
     | Pangaea 4 (v18) | 63 → 0 | 0.074 → 0.004 | 0.433 |
     | Archipelago 2 (v18) | 23 → 0 | 0.070 → 0.004 | 0.306 |
     | Continents 7 (v19) | 7 → 0 | 0.048 → 0.003 | 0.282 |

     Display centres stay wet (≥ 85% of stations; usually all). A synthetic 4 m grid staircase is measured as blocky and comes out smoother, still on the physical waterline.
   - Trails: adjacent worn cells are chained by position and heading into one ribbon, Chaikin-smoothed, with display wear scaled to 0.45× and width capped at 1.15 m (the current instanced ellipse is ~2.6 m wide). `pathPace` is unchanged. A 23-cell staircase walk becomes one 64.9 m ribbon of width 1.15 m that stays on the worn cells; axis-aligned corner share drops (0.136 → 0).

### Wiring requests
- **Codex:** `validCanalWorks` in persistence; a UI/job to commit `planAqueductWorks` / `planCanalWorks` (preview and commit must use the same plan); `currentPowerKw` as the undershot mill rate hook; `driftAt` on boats; `scenicStartReport` as an input to opening-site pick; existing validators (`tideVersion` 1|2, `landformLabelVersion` 2, `riverProfileVersion` 2); well / mill / cistern building hooks from W5–W6 (still open).
- **Claude Experience:** draw `smoothRivers(g)` (centre + left/right banks, or feed the clamped polylines to `riverSurfaceData`) instead of the raw centreline; draw `trailRibbons(g)` instead of one instanced ellipse per 4 m cell in `world.ts`. Current arrows from `riverCurrentProfile`. Scenic overlay from `scenicSurvey` if wanted.
- **Still not approved:** shored cuts. Dominated-territory wiring still waits on the Societies merge.

### Checks (W7)
- Focused W7 tests (6 files, 12 tests: water-line-works, canal-breach, river-currents, scenic-beauty, channel-smoothness, trail-ribbons): **12/12 pass**.
- `tsc --noEmit` clean. Eslint clean on all new and touched W7 files (`waterLineWorks.ts`, `canalBreach.ts`, `excavation.ts`, `riverCurrents.ts`, `scenicBeauty.ts`, `channelSmoothness.ts`, `trailRibbons.ts`, and their tests).

### Next (W8 proposal)
- Shored cuts only if Boris approves.
- Dominated-territory wiring after the Societies merge.
- Extension shapes beyond rectangles (L-wings) if eraMode wants them.
- Follow up once Claude wires the GW-12 polylines (visual check, no physics change).

## Batch W6 — ready (sea-only tides, routed aqueducts/canals, extension footprint checks, water-works hooks, merge map)

Shored cuts were left out as instructed (pending Boris). The trench bank rule (`maximumNaturalGrade` 0.24) is unchanged.

- **Base:** latest main `d86d7da` (perf: population scans/defense neighbours), merged normally after the W6 commits. Nobody else has pushed to `agents/grok-world` (head was my `3541a67` before this handoff).
- **Commits (each small and self-contained):**
  - `2ff347a`: sea-only tides (`tideVersion: 2`).
  - `3ff32bf`: aqueducts and canals routed around terrain (`waterRoutes.ts`).
  - `3541a67`: terrain checks for eraMode extension footprints (`extensionFootprints.ts`).
  - The handoff commit (this section), with a one-comment `sim.ts` touch (see the shared-file list).

### Merge map for Codex (verified, not estimated)
Each group below was cherry-picked onto a clean `origin/main` (`8f8e692`; the later `d86d7da` touches only `defense*`, `haulage.ts` and `settlement.ts`, none of these files) in a scratch worktree. Then `tsc --noEmit` and the group's own tests were run there.

| Group | Commits (in order) | Depends on | On main alone |
|---|---|---|---|
| Extension footprint checks | `3541a67` | nothing | ✅ tsc clean, 2/2 tests |
| Deep-water extents | `b7bb032` | nothing | ✅ 4/4 |
| Site sampling | `aad71a0` | nothing | ✅ 5/5 |
| River sections | `cfcf3a8` | nothing | ✅ 5/5 |
| Observed water routes | `26bd1c8` | nothing | ✅ 5/5 |
| Land value + dominated territory | `10d6d81` → `3dae8b0` | `dominatedTerritory` imports `landValue` | ✅ 5/5 |
| Mountains + town capacity | `1b7cade` → `70ed21c` | `townCapacity` imports `mountains` | ✅ 7/7 |
| Landform metrics + river profile v2 | `2ee0fa2` → `e158781` | — | ✅ 3/3 |
| Wonder earthworks | `aad71a0` → `0fb6099` | siteSample | ✅ 3/3 |
| Wonder sites | `aad71a0`, `cfcf3a8`, `b7bb032` → `096b111` | siteSample, waterSections, deepWater | ✅ 4/4 |
| Water works + routed aqueducts/canals | `cfcf3a8` → `c7c9039` → `3ff32bf` | waterSections; `3ff32bf` needs `c7c9039` | ✅ 8/8 |
| Sim-wired features: quarter turn `346faad`, flow fields `d2929b5`/`dacc651`/`0d98101`/`19d9eed`/`7fd6b6b`, tides `a3ae419` → hills labels `f66b7b1` → sea-only tides `2ff347a`, W1/W2 routing and fog | — | `sim.ts` hunks written on older mains | ❌ cherry-pick conflicts in `sim.ts` (and `worldOptions.ts`/`worldVariety.ts` for the option chain). Take these by **merging the branch** (it already contains main, so it merges cleanly), or reapply the listed `sim.ts` lines by hand. |

- The option-key chain (`e158781` → `a3ae419` → `f66b7b1` → `2ff347a`) touches the same lines of `worldOptions.ts`/`worldVariety.ts`, so it must go in that order.
- `2ff347a` needs `a3ae419`; it is not useful alone.
- Docs-only handoff commits (`74b3433`, `004107a`, `152d82f`, `b3174e2`, `145c4ef`, `c44d50f`, `5e618fd`, `b910e04`, this one) carry no code.

### Save impact (exact)
- **Unchanged without the new options.** Unflagged generation is byte-identical to main on all 48 hash worlds (same hash list as main, re-run on this head).
- **One new optional value:** `worldOptions.tideVersion: 2`, inside the already optional `worldOptions` key (W5 added `1`). **Codex:** the validator becomes `tideVersion === 1 || tideVersion === 2` when present (plus `landformLabelVersion === 2`, `riverProfileVersion === 2`).
- `world.seaTideY` is **runtime-only**, never saved. It is recomputed from saved game time on the first tick after load (tested: same sea level after save and reload).
- Routes and extension checks are pure queries with no save state.

### Shared-file edits this batch
- **`sim.ts`:** the comment on the existing `advanceTide(this)` line now says it runs for version 1 or 2. No code change.
- **`worldgen.ts` (world lane):** an optional `seaTideY?: number` on `WorldData`, runtime-only.
- **World-lane files:** `localWater.ts` (`seaSurfaceY`), `deepWater.ts` and `terrainWalkCache.ts` (cache keys include the tide), `tides.ts`, `worldOptions.ts`/`worldVariety.ts` (`tideVersion: 1|2`).
- No edits to `types.ts`, `persistence.ts`, `save.ts`, `src/scene/world.ts` or camera code.

### What landed (native evidence for each)
1. **Sea-only tides (`tideVersion: 2`, `2ff347a`).**
   - `world.waterY` stays the weather level, and a runtime `world.seaTideY` offset applies only where the background sea is the surface (`seaSurfaceY(world)` in all three `waterSurfaceAt` branches). Rivers and lakes stay at the weather level.
   - **Why an offset, not a separate inland level:** sim formulas that subtract `waterY` (placement margins, excavation water clearance) become stricter at the coast during a high tide and never looser inland. A separate inland channel would have loosened them inland and moved the rendered rivers.
   - Caches are keyed on the tide: the walk-grid level key is `waterY|seaTideY`, and deep water includes `seaTideY`.
   - **Native, archipelago 2:**
     - Sea levels over a cycle: +0.15, +0.30, −0.15, −0.18 m.
     - Walkable cells: 75,868 at low tide → 71,999 at high.
     - Every sampled inland water surface stayed constant through the cycle.
     - The walk grid matches a fresh build at every level.
   - v1 (shared channel) behaves exactly as in W5. `tideFacts` reports `seaOnly`.
2. **Aqueducts and canals routed around terrain (`waterRoutes.ts`, `3ff32bf`).**
   - Dijkstra on an 8 m grid (160 m padding, at most 40,000 cells). The routes obey the same limits as the W5 straight checks: aqueduct cut ≤ 2 m (one dig), arcade ≤ 12 m, canal locks every 2.5 m of rise, no embankment fill. Unexplored cells are skipped for team 0.
   - `routeAqueduct` uses one fixed grade, `max(minimum grade, fall / (1.25 × straight distance))`, in both the search and `measureAqueduct`. The returned polyline is re-measured on real ground.
   - `routeCanal` costs water cells at 0.15 and land by height above the lower water. It reports `alreadyJoinedByWater` when the two waters already connect, so only land crossings count as canals.
   - **Native:**
     - Aqueducts, 77 source–target pairs: 6 feasible straight → 15 feasible routed. Routed length is 1.15–1.21× the straight line, 1–5 ms per route.
     - Canals, 36 pairs: 15 feasible straight → 12 real routed canals, plus 23 pairs already joined by water.
3. **Terrain checks for eraMode extension footprints (`extensionFootprints.ts`, `3541a67`).**
   - Builds on footprint expansion (`b.expansion`, which grows symmetrically and only for plots). An eraMode extension upgrade is a **one-sided wing** on any finished building: `extensionFootprint(b, side, grow)` returns the full and added rectangles (north = −z, east = +x).
   - `extensionTerrainCheck(g, b, side, {growMetres, team})` returns issues, the footprint, the added area, the centre shift, the foundation (step, cut, fill, levelling work-seconds) and the open approach sides. It checks that:
     - the building is finished, has no pending expansion, and stays within 3× its original size;
     - the wing is inside the map, on a dry foundation, and on explored ground;
     - it is not in another team's territory;
     - it keeps 0.5 m clearance from other buildings, including their reserved expansions;
     - no trench is being dug next to it (`excavationConstructionIssue`) and it covers no resources;
     - its foundation step versus the building floor is at most 1 m (no free earthworks: levelling volume and work are reported);
     - at least one approach side stays open.
   - `extensionOptions(g, b)` returns every side, sorted best first.
   - **Native, after 900 sim-seconds of settlement:**
     - Pangaea 4: 15 buildings, 8 of 60 side options pass.
     - Continents 7: 32 pass and 92 are refused.
     - Applying every passing option left each building reachable through `interactionSpot` and overlapping nothing.
     - A neighbouring building, resources, a pending expansion and an oversized wing each block the sides they affect (tested).

### Water-works hooks proposed to Codex (recipes, inventories and jobs stay Codex's)
1. **Well building:** `placementIssue` for `type === 'well'` returns `wellSite(g, x, z, team).issues[0]`. Build time = `excavationWorkNeed` for the shaft (`depth` × 1.5 m²). In `survivalNeeds`, `sourceFor` also offers finished wells (source = well centre, bank = `interactionSpot`). `sourceWet` stays true while `depth` is at or below the drought table (`wellSite` already digs to the dry-season level). That gives inland villages water without walking to a river.
2. **Watermill / windmill:** placement validated by `watermillSite` / `windmillSite`. The returned power index (head × width class for mills; exposure for windmills) multiplies the grinding recipe rate. Watermills are idle while `sourceWet` fails (drought) and windmills during calm weather if Codex adds wind.
3. **Aqueduct / canal construction:** the player commits a polyline from `routeAqueduct` / `routeCanal`. Construction is a sequence of ordinary excavation digs along it, batched like wonder earthworks (`continueWonderEarthwork` pattern), plus arcade materials per metre over 0.5 m. **Rule question for Codex/Boris (not changed):** excavation refuses any dig that reaches water (`waterClearanceMeters` 0.35), so a canal's last metre to the river or sea can't be dug today. Canals need a "breach" step allowed only at the end of a finished channel. That is not the trench bank rule, but it is still a rule change, so I left it.
4. **Cistern:** `cisternCatchment(g, x, z)` litres per season feed the cistern's storage. The pit is a wonder-style earthwork (already labour-real).
5. **Sea mesh (tide v2):** in `src/scene/world.ts`, sea plane y = `world.waterY + (world.seaTideY ?? 0)`, and the same on the minimap shoreline. Without this, the v2 sim tide is correct but invisible (river/lake meshes must not move).
6. **Validators:** `tideVersion` 1|2, `landformLabelVersion` 2, `riverProfileVersion` 2.

### Checks (W6)
- All 23 branch test files (W1–W6) plus main's new `defense-neighbors` test, after merging `d86d7da`: **105/105 pass**.
- Walk-cache, v17-water, deep-water, excavation-live and wonder-sites tests: 15/15 with tide v2 present.
- Unflagged hashes are identical to main on 48/48 worlds (re-run after the merge).
- `tsc` and eslint are clean on all new and touched files.

### Next (W7 proposal)
- Shored cuts once Boris decides.
- Canal breach rule (if approved).
- Linear-earthwork job helper for committed aqueduct/canal polylines.
- Dominated-territory wiring after the Societies merge.
- Extension shapes beyond rectangles (L-wings) if eraMode wants them.

## Batch W5 — ready (earthworks as labour, water works, tides, hills labels, flow fields at 120 residents)

World status lives only in this file (the PM relays it). Boris's decisions are noted: camera = Codex's fixed-angle collision (no camera code touched), and eraMode defaults to fixed with rebuild/extension upgrades.

- **Base:** latest main (`8f8e692`, already merged; no new main commits since).
- **Commits:**
  - `0fb6099`: wonder earthworks.
  - `c7c9039`: water works.
  - `a3ae419`: tides plus a terrain walk cache per water level.
  - `f66b7b1`: hills/plains labels.
  - `19d9eed` and `7fd6b6b`: flow fields at 120 residents.

### Save impact (exact)
- **Unchanged without the new options.** Unflagged generation is byte-identical to main for all 48 hash worlds (v18/v19 × 1040/1560 × 3 layouts × seeds 1, 2, 3, 5), same hashes as main `0bbcdb5`. The habitat path is identical when the option is off (tested label-for-label).
- **Two new optional `worldOptions` keys**, saved with the world, both absent by default. Old saves don't have them:
  - `tideVersion: 1`.
  - `landformLabelVersion: 2`.
  They round-trip today because persistence passes `worldOptions` through (tested). **Codex:** add validators (`=== 1` / `=== 2` when present) next to the `riverProfileVersion` one.
- **Earthworks add no save state.** They are ordinary trench buildings and excavation records, with the existing validators. Progress is derived from the live digs.

### Shared-file edits this batch
- **`sim.ts`:** one import and one wiring line after `tickWeather`: `advanceTide(this)`. It is a no-op unless `worldOptions.tideVersion===1`.
- **World-lane files:**
  - `worldOptions.ts` and `worldVariety.ts`: the two option keys.
  - `ecology.ts`: `habitatKindAt` reads relief labels only when opted in.
  - `landformCoherence.ts`: the same label source for its habitat probe.
  - `terrainWalkCache.ts`: keeps one exact grid per water level.
- The complete earlier `sim.ts` list is in W4 below and is unchanged.

### What landed (native evidence for each)
1. **Wonder earthworks as real labour (`wonderEarthworks.ts`).**
   - A wonder cut (cistern pit, sunken court) runs as ordinary excavation digs on a 4 m lattice. Each dig takes the deepest 0.5–2 m depth up to its need that validates: the same trench buildings, workers, `excavationWorkNeed` (6 s/m³), save records and validators. Nothing edits terrain directly.
   - Preview (`planWonderEarthwork`) and commission (`executeWonderEarthwork`) share `stageIssue`, and commission is all-or-nothing (a tree on one bank refuses the whole earthwork; tested).
   - Digs go out in batches whose banks don't overlap an unfinished dig. Overlapping digs in progress would each charge for the shared soil (measured: 11,886 work-seconds asked against 4,074 real), so batching makes each later dig pay only the soil that's left.
   - `continueWonderEarthwork` (the wonder owner's tick or UI) lays out the next batch, and `wonderEarthworkProgress` reads progress from the live digs.
   - **Native, pangaea 4, 12 × 12 m cistern, 5 workers:**
     - Planned 679 m³ and 4,074 work-seconds; dug 679 m³ and paid 4,089 (the difference is the 18 s minimum per dig).
     - The centre fell 27.83 → 25.83 m (design floor 25.93).
     - The cut survives save and reload.
   - Fill is never conjured: a court is cut-only (orchestra levelled to its lowest ground, tiers at half the natural grade), and any fill or depth shortfall is reported.
   - **Finding:** the existing trench rule allows at most 0.24 natural grade under the banks, and that's what limits physical wonders:

     | World | Cistern sites | Digs validate now | After clearing trees/stones |
     |---|---|---|---|
     | Pangaea 4 | 649 | 6 | 14 |
     | Archipelago 2 | 83 | 0 | 0 |
     | Continents 7 | 125 | 0 | 0 |

     Assembly courts: 3 of 113 now and 4 after clearing on pangaea 4; 0 on the other two worlds.
   - **Proposal (Codex/Boris):** a shored-cut rule. Steeper banks and deeper than 2 m when revetted, at a timber/stone cost, recorded as an optional `shoring` field on the dig with a validator. Not done: it changes an existing rule.
   - Rule the game already has: later player digs aren't auto-assigned by the job board, so the player (or the wonder owner) orders diggers.
2. **Water works site rules (GW-05/06, `waterWorks.ts`).** Pure queries. Recipes, inventories, outputs and jobs stay Codex's; these are the hooks.
   - `wellSite`:
     - Groundwater is the nearest fresh level pulled toward sea level with distance and rising at 35% of relief under higher ground. The dig goes to the dry-season table; minimum 1 m, at most 12 m by hand.
     - Refused within 40 m of the sea (brackish).
     - Native, 20 m lattice:
       - Pangaea 4: 419 fresh well sites; 1,259 are deeper than hand-dug wells allow (upland).
       - Archipelago 2: 304 sites, median depth 2.3 m.
       - Continents 7: 1,340 sites, median depth 2.6 m.
   - `watermillSite`:
     - The wheel stands in the river and the house on dry bank. Head comes from the real water surface along the river section or a waterfall within 30 m.
     - Wheels are overshot (head ≥ 1 m), undershot (width ≥ 6 m) or breastshot.
     - Native: 120 / 80 / 113 sites; more than 90% of wheels are in water (asserted).
   - `windmillSite`: at least 2.5 m above the surrounding rings, horizon ≤ 0.1 rad all round (the sailing wind changes direction), and clear of trees. Native: 55 / 27 / 14 sites.
   - `aqueductRoute`: a constant-fall channel from a fresh source. The cut is limited to one dig (2 m; deeper needs a tunnel) and the arcade to 12 m. Native: 6 of 77 straight routes are feasible.
   - `cisternCatchment`: upslope catchment by steepest descent on an 8 m grid, giving seasonal litres. A summit gathers ≤ 9 cells; a native hollow gathers more than 4 times that.
   - `canalRoute`: level reaches with locks every 2.5 m of rise, dig volume and work, refusing cuts over 2 m and water standing above the ground (embankment fill is never dug). A native archipelago canal across a land strip is feasible.
   - **Codex hooks:** a well or windmill or watermill building type validated with these site functions; the well as a fresh source for `survivalNeeds`' water collection; mill power index → recipe rate; aqueduct/canal construction as linear excavation work.
3. **Tides behind a game option (`tides.ts`, `worldOptions.tideVersion: 1`, default off).**
   - Six stepped stages over a 720 s period, 0.3 m amplitude.
   - Combined with weather, the level stays inside the seasonal envelope the game already handles (drought −0.18 … flood +0.55), so tides can't create a water state weather couldn't.
   - Phase comes from saved game time, so a reloaded game stands at the same tide (tested).
   - **Exact behaviour:** the tide uses the game's single water-level channel (`world.waterY`), as weather does. So, exactly as with floods, river and lake surfaces shift with it. A sea-only tide needs `waterSurfaceAt` to separate the sea offset, plus every cache keyed on `waterY`; that's proposed, not done.
   - **Native, archipelago 2:**
     - Walkable cells go from 75,911 at low tide to 72,003 at high.
     - A walk rebuild after a level change costs about 310 ms, so `terrainWalkCache` now keeps one exact grid per level: returning tide or weather levels cost 0 ms. Parity with a fresh build is tested, and the existing cache invalidation tests pass.
   - `tideFacts(g)` gives stage, offset, range and seconds to high water, for Experience/Societies (and to replace `tides: false` in wonder facts when on).
4. **Hills vs plains as an opt-in setting (`landformLabels.ts`, `worldOptions.landformLabelVersion: 2`).**
   - Terrain, water, camps and resource positions are unchanged (tested).
   - The compatibility habitat family (plains/forest/hills, used by cultivation crop candidates, wild-plant species, animal grazing and discovery) is read from measured relief. Open ground rougher than the world's own 60th-percentile relief (at least 3 m) is hills; smoother open ground is plains. Woodland stays woodland, and two majority passes clean up speckle.
   - **Native:** hills are rougher than plains at 8, 24 and 48 m on **6/6 worlds** (historic labels: 2/6). Speckle is 1.1–1.7% (historic 0.3–0.9%).
   - With the option, forage species and crop candidates follow the new labels, which is the intended gameplay change. Forage still stands in the same places.
5. **Flow fields at 120 residents on native terrain (test added).**
   - Pangaea 4, 120 residents ordered to busy destinations for 120 sim-seconds, with `Math.random` seeded identically for both runs.

     | Destinations | Sim time, A* → flow | Arrivals within 10 m, A* → flow | Fields built |
     |---|---|---|---|
     | 1 | 7.2 s → 4.1 s | 82 → 87 | 8 (963 hits) |
     | 3 | 7.0 s → 4.4 s | 72 → 79 | 18 |

   - **Codex:** this is the native 100+ run that gates `setFlowFieldsEnabled(game, true)`. A full-economy run needs a working-village fixture; my 115-worker auto-work attempt didn't start gathering, so it isn't evidence.

### Checks (W5)
- W2–W5 set plus save and cache tests (22 files): 83 tests pass.
- The one failure seen during the run was the unseeded flow-field crowd test (random-dependent). It is now seeded and passes deterministically twice.
- `tsc` and eslint are clean on all new and touched files.

### Next (W6 proposal)
- Shored cuts (with Codex), so wonders work on catchment slopes.
- A sea-only tide (`waterSurfaceAt` split plus cache keys).
- Aqueduct and canal routing around terrain (not just straight lines).
- Building-type hooks for wells, mills and windmills (Codex recipes).
- Territory/influence while dominated, wired once Societies merges.
- `b.expansion` already reserves expansion footprints in placement, so eraMode extension upgrades can reuse it; Grok will supply terrain checks for any new footprint shape.

## Batch W4 — ready (rivers, deep water, flow fields, territory, mountains, towns, wonder sites, dominated territory)

The board is relayed by the PM worker. From W4 on, Grok status and answers live only in this file; `claude-coordination.md` is not edited on `agents/grok-world`.

- **Base:** main `0bbcdb5` merged (`9252ded`, normal merge). Conflict: main shipped its own version of the G10 observed-fog hunk in `sim.ts`; main's side was taken (it adds `observedVisionAge`). Main's `test-lab-observed-fog` passes 4/4 on the branch.
- **Code commits:**
  - `e158781`: GW-12 river profile v2 and the wet-only river metric.
  - `b7bb032`: G16 deep-water extents.
  - `d2929b5` and `dacc651`: flow fields.
  - `0d98101`: the flow-field switch.
  - `10d6d81`: GW-09 land value and claims.
  - `1b7cade`: GW-13 mountains.
  - `70ed21c`: GW-14 town capacity.
  - `096b111`: wonder site facts.
  - `3dae8b0`: territory while dominated.

### Save impact (exact)
- **Existing saves load the stored world unchanged.** A save stores seed + `worldgenVersion` + `worldOptions` and regenerates the world on load (`decodeGame` → `reset`). With the new flag absent, generation is byte-identical to main.
  - Evidence: SHA-1 over heights, water heights, water bodies, rivers, trees, stones, camps, fish, options, dock sites and waterfalls for 48 worlds (worldgen 18 and 19 × 1040/1560 × pangaea/continents/archipelago × seeds 1, 2, 3, 5). Branch = main `0bbcdb5` for all 48, after the final river code and the merge.
  - `v14-random-save`, `v15-save`, `terrain-quality` and `test-lab-observed-fog` all pass on the branch.
- **New optional field:** `worldOptions.riverProfileVersion?: 2`.
  - It is set only when a new-world request asks for it, and saved inside `worldOptions`. Old saves don't have it.
  - `persistence.ts` does not validate unknown `worldOptions` keys, so it round-trips today (tested). Codex should add an explicit validator (`=== 2` when present) in its file.
- No other state is persisted by W4. Deep water, flow fields, land value, mountains, town capacity, wonder sites and dominated territory are all derived or in-memory.

### Shared-file edits on this branch (complete list vs main `0bbcdb5`; owner Codex)
- **`sim.ts` W4:**
  - Import `flowPath` and one wiring line in `Game.steer()`: `flowPath(...) ?? findPath(...)`.
  - **Behind a switch:** `setFlowFieldsEnabled(game, true)`. Default off, so routing is exactly the historic A*.
- **`sim.ts` W3:**
  - `updateVision` calls `unitSightRadius` / `buildingSightRadius` (values unchanged).
  - Trailing optional `quarterTurn=false` on `placementIssue` / `placementValid` / `placeBuilding`. It is off unless a caller passes it.
- **`sim.ts` W1/W2 — not behind a switch:**
  - `steer()` stall escalation, route `stalled` / `nearest` fields, interaction-spot target before route reuse, the attack-move closest-reachable fallback (GW-07), and `ROUTE_PROGRESS_RULES` arrival.
  - These are bug fixes for stuck and looping residents and for orders into unseen ground, not new systems. **Codex: rule whether they need a switch;** Grok will add one on request.
- **World-lane files touched:**
  - `worldgen.ts`: one line choosing settled water bodies when `riverProfileVersion===2`.
  - `worldOptions.ts`: two optional type fields.
  - `worldVariety.ts`: carries the flag into options.
- **Untouched:** `types.ts`, `persistence.ts`, `save.ts`, `world.ts`, `engine.ts`, `constants.ts`. No camera code.

### What landed (native-terrain evidence for each)
1. **GW-12 rivers (`e158781`).**
   - **Correction to W3:** the archipelago "rivers that rise ~3 m and dead-end" were a metric artefact, not terrain. A dry spring head reports the background level, which flipped the orientation. Metric v2 counts only wet samples and orients by the first and last wet sample. Mouths are found by water beyond the end that is no higher than the river's surface.
   - **Real defect found:** the composed tributary dips below the primary lake it feeds, so water steps up 0.07–0.15 m into the lake (9 of 24 v18 1040 worlds). Fix: `riverProfiles.settleRiverInflows`. Upstream of the last point where a river's course is inside a lake it doesn't rise from, the surface is at least that lake's level, with an entry point inserted. The input is copied, never mutated.
   - Opt-in via `riverProfileVersion: 2`, so historic worlds are unchanged.
   - **Native matrix with the flag** (95 worlds, 437 rivers): **0 rising rivers and 0 dead ends**, and **no player start moved** (camps identical to unflagged) in every world. That covers v18 at 1040, 1560 and 2080 (24 worlds each: 3 layouts × seeds 1–8) and v19 at 1040 (23 worlds). v19 pangaea 6 can't generate even unflagged; that's existing behaviour, and identical on main.
   - Terrain heights are untouched (only the water surface over the tributary's last reach rises, by at most 0.16 m), so scenic starts can't degrade.
   - **Codex ask:** new-world requests (`engine.restart` / Test Lab) should pass `riverProfileVersion: 2`, plus the validator above.
   - **Hills vs plains: measured, not changed.** "Hills" is an ecological-province label independent of the terrain. On continents seed 7 (v18 1040), median relief over 48 m is 1.2 m for hills against 3.4 m for plains; pangaea 1–3 are similar. Fixing that means reshaping terrain under hill provinces or relabelling habitat from relief; both move trees and resources and re-run opening-site qualification, so it doesn't fit cleanly. Proposed for W5 as a second opt-in flag (`landformLabelVersion`), gated on `hillsRougherThanPlains` across the seed matrix.
2. **G16 deep-water extents (`b7bb032`, `deepWater.ts`).**
   - 8 m grid sampled with the game's own `waterAt − height`. That matches Societies' `deepWater()` 2.5 m predicate exactly at cell centres (tested every 7th cell).
   - Regions are open sea (touching the map edge) or inland. `offshoreMetres` uses a chamfer distance to the nearest dry cell. The cache is keyed to the water level, so floods and droughts recompute.
   - `pickDeepWaterPoint(g, seededUnit, {near, minOffshoreMetres, openSeaOnly})` is a deterministic, area-uniform storm spawn.
   - Native: archipelago seed 2 at 1040 has 7 regions (2 open sea); 46 ms on a 2080 map. Simulation-side truth only.
   - **For Societies:** swap `deepWater()` for `deepWaterAt(g,x,z).deep` and spawn with `pickDeepWaterPoint` so storms stay on open sea and off the beach.
3. **Shared flow fields (`d2929b5`, `0d98101`, Claude request 3).**
   - One reverse Dijkstra field per hot goal cell, with `findPath`'s exact move rules. Paths have the same optimal cost as A* (native check: 150 starts on a v18 walk grid, every first-attempt A* route matched at equal cost).
   - Built after 8 requests to one goal in a nav revision, LRU of 8 fields, discarded on any walk rebuild. Field cap 140k expansions; when it returns null, the existing A* fallbacks run unchanged.
   - Measured: 120 residents to one goal take 314 ms with A* against 49–63 ms with the field (build 22–30 ms). An early 22-resident game over 300 sim-seconds built none, so overhead there is nil.
   - Default **off**. Codex can enable it after the Phase-1 perf run.
4. **GW-09 land value and claims (`10d6d81`).**
   - `landValueField` on the 192² territory grid: soil + fresh water (cached per world), plus standing finite resources weighted by remaining amount, trail wear, and finished bridges/docks. Water cells are worth 0.
   - `claimSummary` gives owned cells, area and value per team. Contested cells (254) are attributed to every team whose real influence reaches them.
   - Codex owns any score use. Borders at rivers were already handled by the geographic influence costs (water/cliff/port).
5. **GW-13 mountains (`1b7cade`).**
   - `mountainSurvey`: relative massifs (median known land + 9 m, so no universal gentle bias), summit, prominence, walkable share, `connectedToHome`, summit hikeability on the real walk grid (verified with `findPath`), approach point, and up to 12 prospect targets spaced ≥ 28 m.
   - Native: every home-landmass massif summit is hikeable on pangaea 1 (6/6) and pangaea 4 (12/12). Unhikeable ones are on other landmasses.
   - For the player, everything is clipped to explored cells, including the median baseline.
   - Mining yields are Codex's; prospecting jobs are Codex/Claude.
6. **GW-14 multiple towns (`70ed21c`).** `townCapacity` per landmass (walk-grid components).
   - Sites are tested with the real `placementIssue('townhall')`, so spacing, clump, terrain and the explored-site rule all apply.
   - Two capacities: what the current 75 m rule admits, and towns whose full territories don't overlap (about 170 m spacing from existing constants).
   - Native results:
     - Pangaea 4: 717k m², 23 non-overlapping towns.
     - Archipelago 2: 4, 1, 3 and 2 towns on four islands.
     - Continents 2 (1560): 29 and 21.
   - The current five-hall cap ignores island size; scaling it is a rules call for Codex/Boris.
   - Cost is 40 ms to 1.3 s, so it is an on-demand query, not per frame.
7. **Wonder site facts for Claude Experience (`096b111`, `wonderSites.ts`).**
   - `siteWaterFacts`: nearest river section id, distance and width. `tides: false`: the game has no tides; the seasonal water-level range is 0.73 m (drought −0.18 … flood +0.55). Also flood clearance.
   - `wonderSiteRules` covers all six families:
     - Cistern needs a catchment: at least 40% of a ring 24 m out stands 2 m or more above the rim.
     - Assembly court needs a hillside (grade 0.12–0.5) facing open ground: the downhill apron is gentle, dry and unbuilt.
     - Observatory needs at least 6 m prominence.
     - Harbour needs 2.5 m of depth at its face and a shore.
     - Cascade garden needs a 3 m or greater drop and running water within 40 m.
     - Mill market must be on a river at least 6 m wide, within 25 m, and at most 40% wet.
     - The player can't site on unexplored ground.
   - Native qualifying sites (two worlds, 20 m lattice): cistern 750, court 138, observatory 113, garden 90, mill 134, **harbour 1**. Deep harbour faces are rare, which is input for G14.
   - `wonderTerrainCut` gives cut and fill for the cistern pit (floor = rim − depth) and the cavea (tiers raked uphill from the bema), with work seconds at the game's excavation rate (6 s/m³), so the cut isn't free. Exact on synthetic ground.
   - Replace `wonderSiteIssues` thresholds with `wonderSiteRules`.
8. **Territory while dominated (`3dae8b0`, `dominatedTerritory.ts`).**
   - A hook distinct from land value. It reads `state.dominations` structurally (Societies' shape).
   - An active tribute, puppet or autonomy gives the overlord a sphere over the subject's own painted territory within 40 m (120 m for autonomy). Strength = terms weight (0.5 / 0.8 / 0.3) × leverage. Ownership never transfers; lapsed, released or rebelled arrangements give no sphere.
   - Third-party teams contesting the subject's land are listed for the protection duty.
   - Native test: real halls and influence fields on pangaea 4.

### Checks (W4)
- New suites: `river-profiles` 3/3, `landform-coherence` 4/4, `deep-water` 4/4, `flow-fields` 5/5, `land-value` 2/2, `mountains` 3/3, `town-capacity` 4/4, `wonder-sites` 4/4, `dominated-territory` 3/3.
- W2–W4 set with save tests on the merged tree: 61/61.
- Routing set (17 files) vs main `f09578d`: branch 60 of 65 pass, main 39 of 54. **No branch-only failures.** The 5 branch failures (caravan routes) fail on main too, and the branch passes 10 that fail on main (W2 fixture repairs).
- `tsc` passes. Eslint is clean on new files; `sim.ts` has the same 1 error and 18 warnings as main.

### Folded into W5 planning (from the completion plan)
- **Tides:** a real tidal water level would be a new world-state system. It would need a sim water-level hook (Codex) and a saved phase. Proposal: tide range per coast from deep-water/open-sea extents, driven by `weatherWaterLevel` plus a tide term, behind a game option.
- **River width:** already exposed per section (`riverWidthMetres`, `siteWaterFacts`). Width variation along rivers (narrows and broads) goes with the hills opt-in flag.
- **Terrain cuts:** wonder cuts are computed; making them physical (like trenches, through `excavation.ts` work) needs a persisted cut record (optional field and validator, Codex).

## Batch W3 — ready (review fixes, observed water routes, river sections, quarter-turn footprints, landform metrics)

- **Base main:** `9faabf9` merged (`dfcdc20`; append-only board conflict resolved by keeping both sides). Code commits: `f41f395` (W2 review fixes), `26bd1c8` (`planObservedWaterRoute`), `cfcf3a8` (GW-04 river sections), `346faad` (GW-08 quarter-turn footprints), `2ee0fa2` (landform coherence metrics). Main `f09578d` merged afterwards (clean, no conflicts).
- **Codex review of `b3174e2` — answered:**
  1. Fertility summary leak: fixed. `fertilityPreview` now reports `state: 'complete' | 'partial' | 'unknown'`. Hidden cells never contribute. All-hidden gives `summary: null`. The harvest `fieldTerrain()` value is used only when every placement survey point is explored. New all-hidden and mixed-visibility regressions.
  2. `observedVision()` persistence: acknowledged; Codex owns `encodeGame`. No Grok edit.
  3. Divergent sight radii: fixed. New `sightRadii.ts` is the single source used by both `Game.updateVision` (shared `sim.ts` hunk: two calls replaced, values unchanged) and the tracer. Attribution now uses `stampVision`'s exact cell-centre predicate (no tolerance). New boundary test covers tower 22/30, fortification 5, unfinished dock 12 and finished dock `DOCK_R+4`.
  4. Evidence class: agreed. The anti-loop and unseen-command results are source/fixture evidence, not 100+-resident timing or native ferry-arrival qualification.
- **Claude request 1 — delivered (`26bd1c8`):** `planObservedWaterRoute(g, team, fromDockId, target, {maxNodes?, navigation?, knows?})` returns either `{waypoints, reachesTarget, endsAtFrontier, expandedNodes}` or `{rejected: 'unobserved'|'no-water-connection'|'budget'|'preparing'|'no-dock', expandedNodes}`.
  - Knowledge: team 0 uses its fog. NPC teams use `teamKnowledge`, which follows exactly the `rivalKnows` rules (parity test on 600 points per team), plus the team's own finished docks (`DOCK_R+4`).
  - The navigation grid is never read at an unobserved cell (a guarded-grid test throws on any such read). Scrambling every hidden cell gives a byte-identical plan.
  - `preparing` means the cached water navigation is still building; it is never proof that no route exists.
  - Evidence limit: the longest fixture route is 140 m (a river), 244 nodes, about 1 ms. There is no open-sea or 100+-voyage measurement yet.
- **GW-04 river sections (`cfcf3a8`):** each river is cut into deterministic ~48 m channel sections with oriented rectangles (`section.corners` for display).
  - Clicking anywhere in a section selects the whole section (`waterReachAt(...).section`). Fish and clay membership is exclusive (nearest centreline) and requires water connected to the channel, so a separate pond is excluded (an existing `water-reach` test caught this, and it passes).
  - Re-surveys never duplicate fish. `waterReachReport` adds `fishRecoveryPerMinute` (the game's own `renewFish` run on copies) and `section`.
  - **Save impact: none.** Sections are derived from the world; fish nodes and clay deposits keep their persisted shapes. No new save field was needed, so no Codex save coordination is required for this slice.
  - Measured stock: 33/18/17 sections (seeds 0/1/7); median 208–330 fish per section; 440–600 fish per 100 m of river. Whether that is superabundant ("50 rivers worth of fish") is a stock-balance call for Codex: W supplies the section budget seam if a cap is wanted.
  - For Claude: draw the selection from `section.corners` instead of the fixed ring (`world.ts` resource ring); show `fishRecoveryPerMinute` in `WaterReachPanel`.
- **GW-08 quarter-turn footprints (`346faad`):** new `footprints.ts` (`turnableBuilding`, `turnedFootprint`, `buildingQuarterTurns`).
  - **Shared `sim.ts` hunk (flagged for Codex):** a trailing optional `quarterTurn=false` parameter on `placementIssue`, `placementValid` and `placeBuilding`. When it is set, the footprint is the catalogue `w`/`d` swapped. The same `d` feeds site preparation, explored-site, excavation, shore, dry-foundation and overlap checks, so preview and commit run one validation. `placeBuilding` stores the swapped `b.w/b.d` and never relocates a turned plan. All existing callers are unchanged (default false).
  - Collision, the walk grid and saves already read each building's own `w`/`d` (no code reads `BUILDINGS[b.type].w` for a placed building), so a turned building is solid over its turned rectangle. Spacing rules are unchanged: no shrinking through solid buildings.
  - **Save impact: none.** The turn is derived from the saved footprint (`buildingQuarterTurns(b)` is 1 when `w`/`d` equal the swapped catalogue pair). `persistence.ts` only checks that `w`/`d` are numbers; the round trip is tested.
  - Turnable: dryrack, hut, lumber, workshop, barracks, forge, temple, market, stables, university. Excluded: square footprints, drawn plots (already any rectangle), linear works, bridge, dock, quarry, trench/moat, gate, house (its own planner).
  - **Tighter gaps, measured:** ordinary buildings already pass at an edge gap of −1.25 m (the 0.42 overlap factor); drawn plots and warehouses stop at +0.5 m (0.25 m clearance). Spacing was not the blocker; orientation was. A turned barracks now fits a slot about 0.25 m narrower than an unturned one, and anything tighter is still refused.
  - **Needs other owners:** an R-key or rotate button in the placement ghost (`engine.ts`, Codex) passing `quarterTurn` to both preview and commit, and the mesh yaw `buildingQuarterTurns(b)*π/2` (Claude/renderer). Until that is wired, players see no change.
- **Landform coherence metrics (`2ee0fa2`, GW-11/12/15 measurement):** new `landformCoherence.ts` (offline diagnostics, about 2–12 ms per world).
  - Per river: downstream inferred from the water surface; `rises` and `riseMetres` (the surface climbing downstream by more than 5 cm); `containedFraction` (both banks 4 m beyond the edge above surface + 0.3 m); `dryBedFraction`; drop, gradient and sinuosity; `mouth` = open-water / confluence / map-edge / dead-end.
  - Regional: habitat contiguity on a 64² land grid (`speckledFraction`, fragment patches of 3 cells or fewer), per-habitat patch counts, median relief by habitat and `hillsRougherThanPlains`.
  - **Baseline (worldgen 24, 1040 m, seeds 1–3):**
    - Pangaea: 3 rivers, 0.82–0.92 km in total, containment 0.76–0.80, no dead ends. Seed 3 has one 0.15 m rise on the short tributary.
    - Continents: 4 rivers, containment 0.70–0.78. Seed 2 has a 0.07 m tributary rise.
    - Archipelago: containment 0.60–0.70. **Seed 2 has two short rivers (73 m and 61 m) that rise about 3 m going downstream and dead-end.** This is a real GW-12 defect for W4.
    - Speckle is at most 1.1% everywhere. Relief contradicts the label on some maps: pangaea seeds 1–3 and continents seed 2 have hills smoother than plains. That is input for GW-11 (no universal gentle-land bias; hills should read as hills).
  - The metrics do not change generation.
- **Checks (W3, merged tree on `f09578d`):** `quarter-turn-footprints` 3/3, `landform-coherence` 4/4. All W2+W3 water, fog and placement files: 11 files, 55/55. Shared water/sea files vs main `f09578d` (`npc-sea-native`, `rival-sea-exploration`, `water-index-value`, `water-reach`): 23/23 on both. Placement/plot/save set (10 files, 50 tests): 49 pass; the one failure (`scalable-plots` "plans preserve their area seed bill…") fails identically on main. `tsc` passes; eslint has no new findings (`sim.ts` has the same 1 error and 18 warnings as main).
- **Checks (earlier W3 commits):** `fog-provenance` 6/6, `field-area` 5/5, `observed-water-route` 5/5, `river-sections` 5/5. Fishing/pottery/clay regression set (26 files, 120 tests): 118 pass. The 2 failures (`station-catalogue` "search combines terms…" and "audited statuses…") fail identically on main `9faabf9`. `tsc` passes; eslint is clean on new and changed files.

## Batch W2 — fixture repair, fog provenance, unseen moves, whole-area fields, fertility preview

- **Lane / task:** W-World / W2 (GW-02, GW-07, GW-10, board G10, native-route fixture drift; GW-03 measured and proposed).
- **Base main:** `f6c0747` (merged into the branch; no force-push). **Code commits:** `19f9944` (fixtures), `b67ad02` (G10), `403f506` (GW-07), `b789597` (GW-02 + GW-10). Merge: `138575d`.

### Claimed files (W2)

New, Grok-owned: `src/game/fogProvenance.ts`, `src/game/fieldArea.ts`, `src/game/fertilityPreview.ts`, `scripts/helpers/native-site-scouting.mjs`, `scripts/fog-provenance.test.mjs`, `scripts/unseen-moves.test.mjs`, `scripts/field-area.test.mjs`. W-owned fixtures edited: `scripts/intentional-ground-routes.test.mjs`, `scripts/v17-native-routes.test.mjs`, `scripts/v18c4b-native-routes.test.mjs`.
**Shared hunks (please review, Codex):**
- `src/game/sim.ts` — `updateVision()` keeps the observed fog under the Test Lab reveal (`observedFog`, new public `observedVision()`), cleared on reset. `steer()`: the closest-reachable-ground fallback now also covers player attack-moves, and fallback routes carry `nearest` (new optional field in the in-memory route record) so they settle within 2.5 m.
- `src/game/boats.ts` — `riverboatDestination(…, closestWhenUnexplored=false)`; only the player's own `commandRiverboat` (not mission/NPC callers) passes `true`.
- `src/game/routeProgress.ts` (W-owned) — `nearestArrivalMetres: 2.5`.

### Before → after

- **Native-route fixtures (pre-existing main failures).** Before: `intentional-ground-routes` V17 build and all 9 `v17`/`v18c4b-native-routes` tests failed on main because they placed on unexplored sites. After: V17 sends a second actual resident to scout the hearth site through `issueMove` + ordinary steps (164 s, 884 m walked, no step over 1.8 m) before the founder builds. The quarry fixtures judge candidate sites with `admissibleOnceExplored`, a read-only survey that restores fog byte-for-byte (asserted). The founder's physical walk then explores the site, and placement asserts `placementIssue() === null` on arrival. The explore-first rule is unchanged. 12/12 pass.
- **G10 "it autoexplored a lot" (reproduced; root cause found).** The same message asks about saving in the Test Lab. Test Lab's "Reveal the whole map" (the checkbox, which the "ferry" test action also switches on) used to overwrite `Game.vision`. Switching it off decayed every cell to explored, permanently: 72 → 36,864 → 36,864 cells. After: the reveal is a reversible overlay. Residents keep observing under it, and switching it off restores real fog (72 → 36,864 → 72). The new `fogProvenance.ts` tracer attributes every newly explored cell to an observer. An unattended 240 s native game has 0 unattributed reveals, all from ordinary residents' work (hunters stalking deer, wood, food). Automatic search parties exist but only start when food is low.
- **GW-07 unseen moves.** Before: a plain move into unseen water already went to the closest ground. But an attack-move stood still with a failed route (0 m walked); groups contended for one shore cell (some never settled); and a boat ordered into unexplored land got "No connected navigable water near that destination". Each of these hinted at hidden terrain. After: an attack-move goes as close as it can, groups all settle, and the boat sails to the closest point of its connected water. Explored targets and mission/NPC callers keep the old behaviour.
- **GW-02 whole-area fields.** Measured with the whole map revealed: about 97% of dry ground at grade ≤ 0.5 already accepts fields at 1×/2×/3×. Real refusals are exploration, the 3× clamp (24.6 m maximum per field) and the high-water dryness margin. `planFieldArea(g, a, b)` covers any dragged rectangle with adjacent fields (each up to 3×, 0.6 m headland). Every tile uses `Game.placementIssue` and is committed via `Game.placeBuilding`. The audit test proves the preview verdict equals the commit outcome for every tile, with and without fog. Example: a 60×40 m drag over 3.4 m of rolling relief became 6 fields covering 96%, with heights unchanged. A refused tile (fog, wet, steep) is refused alone; the rest commit.
- **GW-10 fertility preview.** `fertilityPreview(g, {x,z,w,d})` returns per-2 m cell `soil`, `crops`, `freshwaterMetres` and `greenness` (0..1) for the renderer, plus a summary that is the harvest's own `fieldTerrain()` (preview number = yield number). Unexplored cells are `null`, so nothing leaks. Measured: mean yield factor is 1.08 within 20 m of a river vs 0.91 beyond 60 m (seed 0), so greener shows the river margins.
- **GW-03 camera (measured, proposal only; no camera code in this batch).** The zoom angle on level ground was already fixed on main (`3ec1beb`). Over mountains, a 480 m native pan (seed 42) shows eye height swinging up to 247 m and a pitch standard deviation of 22°. This is the clearance lift (up to the 192 m cap) when a ridge sits between camera and focus, then its slow decay. It is not focus jitter: an area-smoothed focus height changed nothing (tested and reverted). A dolly-in-before-lift prototype cut peak eye height to 108 m and pitch SD to 14° at every zoom. But it changes the established contract test "a foreground ridge lifts the eye without changing the requested horizontal orbit", so it is posted on the board for a decision.

### Contracts (new)

- `Game.observedVision(): Uint8Array` — fog as residents actually observed it, ignoring any Test Lab overlay. **Codex:** `encodeGame` should persist this instead of `vision` when `testLabRevealMap` is on (save.ts/persistence.ts are yours). Today a Test Lab save written with the reveal on still stores the filled grid.
- `attributeReveals(g, before) / traceFog(g, seconds)` (`fogProvenance.ts`) — diagnostic only, no save state.
- `planFieldArea(g, a, b, team) → {tiles:[{x,z,w,d,issue}], columns, rows, valid, seeds}` and `placeFieldArea(g, plan, team) → placed tiles`. Pure planning; commits only through `placeBuilding`.
- `fertilityPreview(g, plot) → FertilityPreview` v1 (cells row-major, −z first; `null` = unexplored).

### Save impact

None. `observedFog` and the route `nearest` flag are in-memory only. No persisted shape changed, and there is no migration.

### Executed checks (W2)

- Fixtures: `intentional-ground-routes` + `v17-native-routes` + `v18c4b-native-routes`: 12/12 pass (main: 10 of these fail).
- New: `fog-provenance` 5/5, `unseen-moves` 4/4 (the boat case fails on the pre-change `boats.ts`, confirming the leak), `field-area` 4/4.
- Reveal/vision regression set (`seed-testing`, `riverboats`): only `riverboats` "paid hull construction resumes…" fails, and it fails identically on main.
- Move/boat regression set (62 files that use `issueMove`, attack-move, riverboats or `steer`; 638 tests): failure set identical to main except two branch-only names, `warfare` "arming selected adults…" and `witnessed-frontier-claims` "paid unseen town creation…". Both fail 3/3 on unmodified main too, so they were just missing from main's concurrent log. Main-only: V17 (now fixed), threshing floor and camp raider (known flaky).
- `npx tsc --noEmit`: pass. `eslint` on new and changed files: clean, apart from the pre-existing `sim.ts` `prefer-const` error at the `bld` line, which is on main too.
- Full suite: `npm test`, run concurrently on one box. **Main `f6c0747`: 2346 tests, 2180 pass, 161 fail, 5 skipped. Branch at W2 head `b3174e2`: 2370 tests, 2213 pass, 152 fail, 5 skipped** (+24 tests: the W2 suites).
  - Main-only (fixed or flaky): the 8 `v17`/`v18c4b-native-routes` upland-quarry tests and `intentional-ground-routes` native V17 (fixed by `19f9944`). Also `townhall-costs` "explicit free hearth placement…" and "new village civilians defeat a finite camp raider" (known flaky).
  - Branch-only: `production` "actual two finite hunted animals feed a physical skin-clothing chain…" and `emergency-shelter` "real Game.step preserves occupied shelter…". Both are flaky on unmodified main `9faabf9` too: 3 isolated runs per tree went branch 2/3 clean, W3 head 2/3 clean, main 2/3 clean, and one main run failed both.
  - Result: no new deterministic failure; 9 fewer failures than main.
  - Suite-generated tracked files were restored and not committed.

### Rollback

Revert `b789597`, `403f506`, `b67ad02`, `19f9944` independently. The G10 and GW-07 hunks are small and self-contained.

### State

Pushed to `agents/grok-world`; ready for Codex review. Engine/view wiring for the field-area planner and the fertility highlight is requested on the board (engine.ts is Codex's; highlight styling is Claude's). Not published.

## Batch W1 — tight-space routing + grounding query

- **Lane / task:** W-World / native tight-space routing (first milestone) + Claude board request Grok-2 (`sampleSite`).
- **Base main:** `8f635f62a9b87837de10fa8ea0f1898d3a206ed6`. **Branch:** `agents/grok-world`. **Code commits:** `2a9fa79` (anti-loop routing), `5f2b1b2` (keep the 1 m straight-line fallback), `aad71a0` (`sampleSite`). Later commits are docs/status only.
- **Workers:** one session ran this batch. The planned World/Ecology and Navigation/Civil workers will each claim their own files below.

### Claimed files (Grok)

New, Grok-owned: `src/game/routeProgress.ts`, `src/game/siteSample.ts`, `scripts/tight-space-routing.test.mjs`, `scripts/site-sample.test.mjs`, this handoff.
Existing Grok-domain modules (claim for upcoming batches): `navigation.ts`, `localCorridor.ts`, `localEscape.ts`, `terrainWalkCache.ts`, `plots.ts`, `plotExpansion.ts`, `plotTopography.ts`, `fieldTerrain.ts`, `sitePreparation.ts` (terrain/admissibility parts only; payment stays Codex), `crossings.ts`, `bridgeWorkApproach.ts`, `excavation.ts`, `linearConstruction.ts`, `hydrology.ts`, `riverSurface.ts`, `naturalRiverRoute.ts`, `ecologicalProvinces.ts`, `ecology.ts` (terrain/soil parts), `territory.ts`, `influenceField.ts`, `influenceWater.ts`, `frontiers.ts`, worldgen/geography modules.
**Shared seam edited (Codex owns the integration file):** `src/game/sim.ts`, only inside `Game.steer()` and the `paths` route record (new optional `stalled` flag). No other `sim.ts` behaviour changed.

### Before → after

- **Before:** a body that can physically fit through a gap still met coarse-blocked 2 m cells there. If its straight line looked clear, it walked in, the coarse-cell escape pushed it back out and deleted the route, and the next plan repeated the straight line. That loop never ended, and `stuckT` stayed 0 because the actor moved every frame. Reproduced on main: a 0.9 m-radius actor and a 1.9 m gap between two long stores, at 3 m, 10 m and 40 m approaches, still had not arrived after 6000 frames. Precise corridors to a building's interaction spot were also not recognised as retained routes, because the escape check compared against `u.tx` instead of the resolved frontage spot.
- **After:**
  - A straight move of 28 m or less that passes a chained 0.25 m body-collision check is kept as a precise route, and coarse recovery no longer overrides it. If the fine check fails, the old 1 m check still decides.
  - A watchdog (`routeProgress.ts`) flags a stall when the actor goes 3 s without closing at least 0.25 m on its waypoint. `stuckT` then reports the real time without progress, so job-level stuck handlers fire. The route escalates: it skips the straight line, prefers the fine corridor, and backs off replans up to 3 s.
  - Coarse escape now keeps the stall escalation instead of deleting the route.
  - All three fixture approaches now arrive. A too-narrow gap (1.7 m) still detours, so collision never shrinks. Every frame is checked for no teleport and for body clearance.

### Shared contracts

- `routeStallSeconds(unit, route, now) → seconds`. Units are seconds; the threshold is `ROUTE_PROGRESS_RULES.stallSeconds = 3`; state lives in a per-unit WeakMap and is not saved. A replan to the same destination (within 2 m) keeps the stall clock.
- `preciseSegmentClear(game, unit, x, z) → boolean`. Chained `canStep` at 0.25 m spacing; pure.
- **For Claude Experience — `sampleSite(ground, {x,z,w,d,rotation?}) → SiteSample` v1 (`src/game/siteSample.ts`).** Units are metres in world XZ/Y; grade is rise/run. Fields:
  - `columns`, `rows`, row-major `heights` (local −X → +X, then −Z → +Z; at most 25×25)
  - `min`/`max`/`meanHeightMetres`, `heightRangeMetres`, `foundationDepthMetres` (high corner to low corner, for the downhill plinth)
  - `maxGrade`, `meanGrade`, `downhillRadians` (world frame, `atan2(x,z)`)
  - `wetFraction`, `minimumDryClearanceMetres`
  - `biome` (province kind at the centre, or null), `biomeShares`

  It is pure: it never edits or flattens terrain. Grade comes from the same in-footprint survey as field placement. Call it at build or placement time, not per frame.
- Biome dressing data: the existing `PROVINCE_KINDS` / `PROVINCE_PROFILES` (`ecologicalProvinces.ts`) remain the authoritative eight kinds. A dressing-density/visual-family contract proposal will follow on the board before any change.

### Save impact

None. Route state and the stall watchdog stay in memory only. The persisted `stuckT` keeps its type and meaning ("seconds without progress"); it now also counts oscillation. No migration.

### Executed checks

- `node --import ./scripts/game-loader.mjs --test scripts/tight-space-routing.test.mjs`: 6/6 pass.
- `node --import ./scripts/game-loader.mjs --test scripts/site-sample.test.mjs`: 5/5 pass.
- Navigation/route regression set (`local-corridor`, `local-escape`, `navigation-rebuild`, `navigation-neighbor-labels`, `intentional-ground-routes`, `bridge-work-approach`, `hunting-route-arrival`, `ground-laid-workplaces`, `natural-river-route`, `water-navigation-preparation`, `site-preparation-runtime`, `worker-activity`, `cold-paid-recovery`, `v17`/`v18c4b-native-routes`): every failure also fails on unmodified main (see below).
- `hunting-projectiles`, `coastal-trade`, `cereal-processing`, `barracks-shelter`: an earlier draft regressed hunting stalking and coastal beach. That was fixed in `Keep the established straight-line check…`, and all four files now pass, apart from cereal tests that flake on main too.
- After merging main `860863a`: `npx tsc --noEmit` passes, and the post-merge focused set passes 32/32 (`tight-space-routing`, `site-sample`, `local-corridor`, `local-escape`, `hunting-projectiles`, `graphics-render-style`).
- `npx tsc --noEmit` at W1 head: pass. `npx eslint` on new files: clean. `sim.ts` has the same 19 problems (1 error) as main.
- **Full-suite comparison (`npm test`, same base 8f635f6, run concurrently on one box):** main 2334 tests, 2169 pass, 160 fail. Branch at `5f2b1b2`: 2340 tests, 2175 pass, 160 fail (+6 new tight-space tests; `site-sample` was committed after this run started and ran separately, 5/5).
  - Failure-set difference: two failures only on the branch and two only on main.
    - Branch-only: `townhall-costs` "explicit free hearth placement…" fails intermittently on main too (1 of 6 isolated main runs; 1 of 3 branch runs). `cereal-processing` "practiced threshing floor…" also flakes on main.
    - Main-only: `barracks-shelter`, and "new village civilians defeat a finite camp raider" (flaky).
  - Result: no new deterministic failure from W1.
  - Note: the suite writes `docs/NOMADIC_CAMP_SCENARIOS_2026-10-31.json`, `docs/metrics/v18c4b-native5-2026-11-03.json` and `.qualification/`. Those were restored or removed and not committed.

### Pre-existing failures on main (not caused by W1)

- *(Fixed in W2 `19f9944`.)* `intentional-ground-routes` "native V17 … build" and all 9 `v17`/`v18c4b-native-routes` upland-quarry tests fail on main. Cause: fixture drift. Newer explore-before-placing rules (`Explore the whole site first`, `Explore the quarry site first`) reject unexplored targets that these fixtures place directly. This is not a routing regression. Proposed fix (W-owned tests): explore the target site in each fixture through actual scouting, rather than weakening the rule. Queued as W2.
- `cereal-processing` "parked paid cereal inputs…" and "a practiced threshing floor…" flake on main.

### Blockers

- None for source work. Push access is available (gh is authenticated as bkizenko).
- The Mac's one-heavy-run rule does not apply on this separate box. No game build or browser session was run, because this batch changes no rendering.

### Rollback

Revert the W1 commits. They are self-contained (two new modules, two new tests, and the `steer()` hunk).

### State

Source pushed to `agents/grok-world`; ready for Codex review/merge. Not published. No gate credit: frozen release stays at 34/98.

## Answers to Claude board requests (claude-coordination.md)

1. **Water route query for NPC voyages.** Accepted as W-owned. Proposed contract: `planObservedWaterRoute(g, team, fromDockId, target, {maxNodes}) → {waypoints} | {rejected: 'unobserved'|'no-water-connection'|'budget'}`. It searches only water cells the team has observed, using the existing `waterNavigation` grid, and never reveals unobserved water. Scheduled for W3. Until then, Societies can call `waterNavigation(g, aboard)` + `findPath` on observed cells only.
2. **`sampleSite`.** Delivered in W1 (above).
3. **Flow fields for hot destinations.** Accepted. Planned after the stall watchdog proves itself: per-destination integration fields keyed on navigation revision, for caches, hearths, fields and muster points, with bounded count and LRU eviction. Scheduled for W4, with a CPU budget measured on 100+ residents.

## User-sentiment additions (from docs/parallel/chat-context, missed or underweighted in the handoff/backlog)

Each item has a source pointer (`file#message`, where `#` is the `## N. user` heading number in the export); all are W-owned unless marked. Per the board's single-writer rule, `FULL_GAME_BACKLOG.json`, `CURRENT_STATUS.md` and `TASK_LANES.json` are left to Codex: these GW rows are the intake list for Codex to copy after review. GW items overlap Claude's G1–G12 only where noted; none duplicate them.

| ID | Requirement | User quote / source | Batch |
|---|---|---|---|
| GW-01 | Repeated **tight-space stuck/loop** failures, raised repeatedly with escalating frustration. Precise local routing plus anti-loop are acceptance-critical, not polish. | "need better and morew precise nav in tight areas. people constantly get stuck and in loops" — scenic#749; also scenic#585, #745; keyboard#185, #187, #265 | W1 delivered (`2a9fa79`, `5f2b1b2`) |
| GW-02 | **Whole drawn area plants as one field**; fields roll over hills; obstacles queue for clearing instead of blocking. Only genuinely steep or wet ground is refused, by actual sampled grade. | "I should have been able to plant this whole area as one field" — scenic#690; "plant fields that roll up and down the hill" — scenic#432; "can't plant fields on perfectly fine ground" — scenic#751; "fields arent being fully planted" — scenic#696 | W2 delivered: planner/API + audit `b789597`; engine wiring requested from Codex |
| GW-03 | **Stable camera over mountains and while zooming** (no angle change on zoom, no terrain jitter). Not in the backlog at all. | "camera is unstable when going over the mtns" — scenic#649; "why does the camerwa angle change when you zoom in and out?" — scenic#745 | W2 measured; flat-ground zoom already fixed on main (`3ec1beb`); mountain lift = dolly-before-lift proposal on the board (contract decision) |
| GW-04 | **River fish/clay are finite per clickable rectangular reach section**, with visible remaining quantity, depletion/refill rates and uneven richness. No point-circle superabundance. | "river should be clickable in sections … resource depletion rates that you can see" — scenic#458; "selection for river shouldnt be these little circles but big rectangular sections" — scenic#696; "50 rivers worth of fish in one river" — scenic#712 | W3 sections/rates delivered `cfcf3a8`; stock cap = Codex balance call; rectangle drawing = Claude |
| GW-05 | **Wells as a building**; water collection automatic from wells and freshwater. | "well should be a bbuilding" — scenic#696; "water should be one of those things people auto gather" — scenic#696 | W5 |
| GW-06 | **River currents and elevation drive watermills and windmills**, plus Roman-scale works (aqueducts, cisterns, canals). Backlog has no watermill/cistern entry. | "windmills and watermills should definitely be a thing, but will need currents in rivers from that and elevation … build some crazy stuff like the romans did" — scenic#448; "ability to dig canals" — scenic#777 | W5 site rules delivered `c7c9039`; currents and Roman-work jobs in W7 (`7e74ddf`, `d99698e`); mill/boat/UI hooks remain Codex |
| GW-07 | **Moves to unseen ground still go, or go as close as possible**, without revealing water or hinting at hidden terrain. | "if i tell people to go to an areas thats not in line of sight thehy sjould still go or go as close as tehy can b otherwise its hinting" — scenic#458 | W2 delivered `403f506` |
| GW-08 | **Buildings fit tighter gaps and can rotate** during construction (rotated footprints in placement and collision). | "all buildings shoudl fit in to tighter gaps … be able to rotate buldings" — scenic#458 | W3 (footprint/collision; mesh rotation is Claude) |
| GW-09 | **Territory borders behave at rivers**; claims are contested by planted flags/forts; valuable land (resources, soil, routes) scores more. Score/prestige formula is Codex. | "borders get weird at rivers" — scenic#444; "plant a flag, but if someone else wants it they plant a flag, its contested" — scenic#786 | W4 (physical claim/border field); score formula → Codex |
| GW-10 | **Fertility visible and water-proximate**: river margins best for farming; placement highlight greener on more fertile soil. | "rivers should be best place to plant food. … the more fertile a land is the more green it should be" — scenic#440; "fields closer to water are higher yield?" — scenic#432 | W2 delivered data `b789597`; Claude highlight styling, Codex engine wiring |
| GW-11 | **Landforms distributed, never clustered; no two islands or maps identical**; no bias toward gentle land (some maps hilly, some mountainous, some flat). | "all the topographical features are in one area" — scenic#362; "no two islands or maps shoudl ever be exactly the same" — scenic#199; "right now the bias is on ordinary gentle land" — scenic#372 | W3 (verify and measure; partly delivered earlier) |
| GW-12 | **Smooth, non-blocky rivers and smoother, less pronounced trails.** | "shuoldn't have blocky rivers like this. should be smooth" — scenic#368; "trails should be smoother, less blocky, and less pronounced" — keyboard#187 | W4 profile v2 `e158781`; W7 display polylines `ee34c8c` (`smoothRivers`, `trailRibbons`); Claude still wires the renderer |
| GW-13 | **Mountains are hikeable**; residents can be assigned to a mountain to prospect. | "almost all are hikable and climabel … assign people to mountains and have them just go and start looking for minerals" — keyboard#903 | W4 (routes/admissibility; mining economy is Codex) |
| GW-14 | **Multiple towns per large island**; settlement planning supports more than one settlement per landmass. | "possible to have multiple townds per island depending on size" — scenic#65 | W4 |
| G10 (board) | **Fog provenance:** the map auto-explored without anyone being sent. Fog may only clear from actual observers or valid returned reports. Accepted as W; reproduce first (COMPLETION_LOG `CHAT-G10-FOG-PROVENANCE`). | "it autoexplored a lot fior nme idk y" — scenic#482 | W2 delivered `b67ad02` (Test Lab reveal was permanent; now an overlay) |
| G14 (board) | **Deep-water port and draft admission** for larger hulls; W supplies water-depth/site admission, Codex the hulls (COMPLETION_LOG `CHAT-G14-DEEPWATER-PORTS`). | keyboard#841 "deep water ports" | W3 |
| GW-15 | **Scenic beauty is measured, with above-average player starts** (Bierstadt/Cole sublime vistas). | "even how beautiful a place is is measurable" — scenic#2; "albert bierstadt and thomas cole style" — scenic#9 | W7 delivered `59f0e24`; Codex opening-site hook `scenicStartReport` |

### Board items for other owners (not implemented by Grok)

- **Claude Experience:** buildings themselves slope with terrain, with no oversized platforms; use `sampleSite` (scenic#440, #582, #432). Smooth river and trail rendering from W data (scenic#368): use `smoothRivers` / `trailRibbons` (W7 `ee34c8c`).
- **Claude Societies:** raiders retreat to a real camp or off-map instead of idling at the shore (scenic#693, #690). NPC villages clear forest for building (scenic#649).
- **Codex:** score/prestige value of claimed land (scenic#786); the clay → mud-brick chain (scenic#767; W supplies finite reach clay in GW-04).

## Coordination log

- 11 Nov, after W1: read `COORDINATION.md`, `CURRENT_STATUS.md`, `TASK_LANES.json`, `EXECUTION_CONTRACT.md`, `COMPLETION_LOG.md` and the Claude board (`handoffs/claude-coordination.md`, including Codex's round-1 response). Fetched `agents/claude-*` (societies and experience WIP, no handoff files yet), `agents/gemini-*` (stale), `agents/grok-*` (none ahead) and `work/codex-*`. No open GitHub issues or PRs.
- Adopted the board's standardization rules: new behaviour goes in new modules, with one wiring hunk in shared files; optional save fields only; no reformatting; merge `origin/main` into this branch rather than rebasing pushed commits; canonical backlog and status files are single-writer (Codex).
- Merged `origin/main` `860863a` into this branch. The W1 code was first rebased onto `8f635f6` before it was ever pushed; nothing pushed was rewritten.
- 11 Nov, W2: merged `origin/main` `f6c0747` (docs-only change; one append-only conflict in `claude-coordination.md`, resolved by keeping both sections). Re-read the board (Claude integration round 1 reply, Codex reconcile) and `codex-platform.md`. Checked every remote agent branch: none touches `src/scene/cameraClearance.ts`, `world.ts` camera code, `boats.ts`, `fieldArea`/`fertility` or the edited fixtures. Noted: `findExploreTarget` uses `Math.random` (unseeded) in the sim, so explorer targets are not replay-deterministic (flagged for Codex, not changed).
- 11 Nov, W3: merged main `9faabf9` and then `f09578d` (clean). Re-read the board on main and on `agents/claude-coordination` (PM check-ins through 17:02 ET): no new asks to Grok. The camera proposal has no Claude reply yet. The G16 deep-water extent ask is still open (W4). No file overlap with the Claude branches (PM-verified).
- File claims are disjoint from Claude's (`seaExploration.ts`, `coastal*`, `rivalDevelopment.ts`, `scoutProvisions.ts`, `workCommitments.ts`, `src/scene/building*`, `carved*`) and from Codex's platform files. The only shared hunk is `Game.steer()` in `sim.ts`.

- 11 Nov, W7: merged main `1085ad7` (docs-only pending-branch handoff; clean). Canal breach had been approved 11 Nov 19:16 ET; shored cuts still are not. GW-12 implemented as renderer-opt-in display data so historic wet/dry, pathing and trail pace stay identical. Read `GROK_CLAUDE_MERGE_HANDOFF_2026-11-11.md`: the remaining Worker vs curd UI conflicts are Claude's; no new shared-file overlap for this batch beyond the listed `sim.ts` permit line.

## Next batch order

- **W2:** done (above). Follow-ups awaiting other owners: engine wiring of `planFieldArea`/`fertilityPreview` (Codex/Claude); camera dolly-before-lift decision (Boris/Claude); `observedVision()` in Test Lab saves (Codex).
- **W3:** done (above). Follow-ups awaiting other owners: the `quarterTurn` control and mesh yaw; a decision on a section stock cap; `observedVision()` in saves.
- **W4:** done (above). Awaiting other owners: `riverProfileVersion` in new-world requests plus a validator; enabling flow fields; a ruling on the W1/W2 steer switch; Societies adopting `deepWaterAt` / `pickDeepWaterPoint` and `dominationSpheres`; Claude adopting `wonderSiteRules` / `wonderTerrainCut`.
- **W5:** done (above). Awaiting other owners: validators for `tideVersion` and `landformLabelVersion`; a shored-cut rule decision; building-type hooks for water works; enabling flow fields.
- **W6:** done (above). Awaiting other owners: sea-mesh wiring for tide v2; validators (`tideVersion` 1|2); the water-works building hooks; adopting `extensionTerrainCheck` in eraMode upgrades. Canal breach was approved 11 Nov 19:16 ET and landed in W7. The W6 merge map still says which earlier commits can land alone.
- **W7:** done (above). Awaiting other owners: Claude to draw `smoothRivers` / `trailRibbons`; Codex canal/aqueduct commission UI plus `validCanalWorks`; `currentPowerKw` / `driftAt` / `scenicStartReport` hooks; existing option validators. Shored cuts still await Boris. Dominated-territory wiring still waits on the Societies merge.
- **W8:** shored cuts only if approved; dominated-territory wiring after Societies; L-wings if eraMode wants them; visual check after Claude wires GW-12.
