# Grok W-World handoff

Updated 11 November 2026, W2 (ET). Lane **W-World** (Grok): geography, biomes/ecology, hydrology, navigation/local routing, placement/plots, territory, civil engineering, biome dressing data and terrain-to-building grounding constraints. Read [CURRENT_STATUS.md](../CURRENT_STATUS.md) first. Rules: [EXECUTION_CONTRACT.md](../EXECUTION_CONTRACT.md).

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
- Full suite: FULL_SUITE_PLACEHOLDER

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
| GW-04 | **River fish/clay are finite per clickable rectangular reach section**, with visible remaining quantity, depletion/refill rates and uneven richness. No point-circle superabundance. | "river should be clickable in sections … resource depletion rates that you can see" — scenic#458; "selection for river shouldnt be these little circles but big rectangular sections" — scenic#696; "50 rivers worth of fish in one river" — scenic#712 | W3 |
| GW-05 | **Wells as a building**; water collection automatic from wells and freshwater. | "well should be a bbuilding" — scenic#696; "water should be one of those things people auto gather" — scenic#696 | W5 |
| GW-06 | **River currents and elevation drive watermills and windmills**, plus Roman-scale works (aqueducts, cisterns, canals). Backlog has no watermill/cistern entry. | "windmills and watermills should definitely be a thing, but will need currents in rivers from that and elevation … build some crazy stuff like the romans did" — scenic#448; "ability to dig canals" — scenic#777 | W5 |
| GW-07 | **Moves to unseen ground still go, or go as close as possible**, without revealing water or hinting at hidden terrain. | "if i tell people to go to an areas thats not in line of sight thehy sjould still go or go as close as tehy can b otherwise its hinting" — scenic#458 | W2 delivered `403f506` |
| GW-08 | **Buildings fit tighter gaps and can rotate** during construction (rotated footprints in placement and collision). | "all buildings shoudl fit in to tighter gaps … be able to rotate buldings" — scenic#458 | W3 (footprint/collision; mesh rotation is Claude) |
| GW-09 | **Territory borders behave at rivers**; claims are contested by planted flags/forts; valuable land (resources, soil, routes) scores more. Score/prestige formula is Codex. | "borders get weird at rivers" — scenic#444; "plant a flag, but if someone else wants it they plant a flag, its contested" — scenic#786 | W4 (physical claim/border field); score formula → Codex |
| GW-10 | **Fertility visible and water-proximate**: river margins best for farming; placement highlight greener on more fertile soil. | "rivers should be best place to plant food. … the more fertile a land is the more green it should be" — scenic#440; "fields closer to water are higher yield?" — scenic#432 | W2 delivered data `b789597`; Claude highlight styling, Codex engine wiring |
| GW-11 | **Landforms distributed, never clustered; no two islands or maps identical**; no bias toward gentle land (some maps hilly, some mountainous, some flat). | "all the topographical features are in one area" — scenic#362; "no two islands or maps shoudl ever be exactly the same" — scenic#199; "right now the bias is on ordinary gentle land" — scenic#372 | W3 (verify and measure; partly delivered earlier) |
| GW-12 | **Smooth, non-blocky rivers and smoother, less pronounced trails.** | "shuoldn't have blocky rivers like this. should be smooth" — scenic#368; "trails should be smoother, less blocky, and less pronounced" — keyboard#187 | W3 data; Claude renders |
| GW-13 | **Mountains are hikeable**; residents can be assigned to a mountain to prospect. | "almost all are hikable and climabel … assign people to mountains and have them just go and start looking for minerals" — keyboard#903 | W4 (routes/admissibility; mining economy is Codex) |
| GW-14 | **Multiple towns per large island**; settlement planning supports more than one settlement per landmass. | "possible to have multiple townds per island depending on size" — scenic#65 | W4 |
| G10 (board) | **Fog provenance:** the map auto-explored without anyone being sent. Fog may only clear from actual observers or valid returned reports. Accepted as W; reproduce first (COMPLETION_LOG `CHAT-G10-FOG-PROVENANCE`). | "it autoexplored a lot fior nme idk y" — scenic#482 | W2 delivered `b67ad02` (Test Lab reveal was permanent; now an overlay) |
| G14 (board) | **Deep-water port and draft admission** for larger hulls; W supplies water-depth/site admission, Codex the hulls (COMPLETION_LOG `CHAT-G14-DEEPWATER-PORTS`). | keyboard#841 "deep water ports" | W3 |
| GW-15 | **Scenic beauty is measured, with above-average player starts** (Bierstadt/Cole sublime vistas). | "even how beautiful a place is is measurable" — scenic#2; "albert bierstadt and thomas cole style" — scenic#9 | W3 (metric audit) |

### Board items for other owners (not implemented by Grok)

- **Claude Experience:** buildings themselves slope with terrain, with no oversized platforms; use `sampleSite` (scenic#440, #582, #432). Smooth river and trail rendering from W data (scenic#368).
- **Claude Societies:** raiders retreat to a real camp or off-map instead of idling at the shore (scenic#693, #690). NPC villages clear forest for building (scenic#649).
- **Codex:** score/prestige value of claimed land (scenic#786); the clay → mud-brick chain (scenic#767; W supplies finite reach clay in GW-04).

## Coordination log

- 11 Nov, after W1: read `COORDINATION.md`, `CURRENT_STATUS.md`, `TASK_LANES.json`, `EXECUTION_CONTRACT.md`, `COMPLETION_LOG.md` and the Claude board (`handoffs/claude-coordination.md`, including Codex's round-1 response). Fetched `agents/claude-*` (societies and experience WIP, no handoff files yet), `agents/gemini-*` (stale), `agents/grok-*` (none ahead) and `work/codex-*`. No open GitHub issues or PRs.
- Adopted the board's standardization rules: new behaviour goes in new modules, with one wiring hunk in shared files; optional save fields only; no reformatting; merge `origin/main` into this branch rather than rebasing pushed commits; canonical backlog and status files are single-writer (Codex).
- Merged `origin/main` `860863a` into this branch. The W1 code was first rebased onto `8f635f6` before it was ever pushed; nothing pushed was rewritten.
- 11 Nov, W2: merged `origin/main` `f6c0747` (docs-only change; one append-only conflict in `claude-coordination.md`, resolved by keeping both sections). Re-read the board (Claude integration round 1 reply, Codex reconcile) and `codex-platform.md`. Checked every remote agent branch: none touches `src/scene/cameraClearance.ts`, `world.ts` camera code, `boats.ts`, `fieldArea`/`fertility` or the edited fixtures. Noted: `findExploreTarget` uses `Math.random` (unseeded) in the sim, so explorer targets are not replay-deterministic (flagged for Codex, not changed).
- File claims are disjoint from Claude's (`seaExploration.ts`, `coastal*`, `rivalDevelopment.ts`, `scoutProvisions.ts`, `workCommitments.ts`, `src/scene/building*`, `carved*`) and from Codex's platform files. The only shared hunk is `Game.steer()` in `sim.ts`.

## Next batch order

- **W2:** done (above). Follow-ups awaiting other owners: engine wiring of `planFieldArea`/`fertilityPreview` (Codex/Claude); camera dolly-before-lift decision (Boris/Claude); `observedVision()` in Test Lab saves (Codex).
- **W3:** GW-04 finite reach fish/clay; GW-08 rotated tight footprints; Claude request 1 (observed water routes); GW-11/12/15 terrain coherence metrics.
- **W4:** flow fields (Claude request 3); GW-09 territory and claims; GW-13 mountains; GW-14 multiple towns.
- **W5:** GW-05 wells; GW-06 watermills, windmills, aqueducts, cisterns and canals.
