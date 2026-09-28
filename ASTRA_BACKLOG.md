# Astra execution backlog

Execute sequentially; dependencies are IDs below. First ten tasks are 01–10. Phase numbers follow audit → foundation → slice → economy → combat → AI → content → survival → polish → optimization → alpha. Parallel work is optional only on disjoint contracts. Read this plus the relevant spec, not the original giant prompt. Status/evidence belongs in DEVELOPMENT_STATUS.md.

## 01 — Audit and freeze contracts
- Phase: 0
- Objective: Audit and freeze contracts.
- Dependencies: none.
- Existing files affected: REPOSITORY_AUDIT.md, GAME_DESIGN.md, ARCHITECTURE.md.
- New files/systems: Persistent specs.
- Implementation: Record dispositions, all system rules and asset inventory before implementation.
- Assets: Existing repository.
- Acceptance criteria: Audit differentiates real systems and gaps; first ten tasks executable.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 02 — Keyboard world commands
- Phase: 1
- Objective: Keyboard world commands.
- Dependencies: 01.
- Existing files affected: engine.ts, GameApp.tsx, Hud.tsx, styles.css.
- New files/systems: input.ts if needed.
- Implementation: Add center target, selection cycling, visible resource cycling, contextual order, placement, zoom, group store/recall, focus-safe shortcuts and help.
- Assets: Existing scene.
- Acceptance criteria: Start, select, gather, place, train, fight and use every menu with keys; UI typing never pans.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 03 — Acoustic adaptive score
- Phase: 1
- Objective: Acoustic adaptive score.
- Dependencies: 01.
- Existing files affected: audio.ts, engine.ts, Hud.tsx.
- New files/systems: music.ts, public/audio, THIRD_PARTY_ASSETS.md.
- Implementation: Replace oscillator score with local licensed tracks, progressive stages, combat hysteresis, crossfade, sliders, credits and lifecycle cleanup.
- Assets: Folk Round, Celtic Impulse, Five Armies; verify CC BY.
- Acceptance criteria: Decode each MP3; village/adventure/battle transition; mute/hidden/dispose work; no oscillator music.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 04 — Reliable save and resume
- Phase: 0
- Objective: Reliable save and resume.
- Dependencies: 01.
- Existing files affected: save.ts, sim.ts, engine.ts, GameApp.tsx.
- New files/systems: persistence.ts, save tests.
- Implementation: Version full state; serialize entity refs as IDs; validate then restore; primary/backup and resume UI.
- Assets: None.
- Acceptance criteria: Reload preserves resources, orders, queues, research, weather, AI timers and explored fog; corrupt save does not erase good state.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 05 — Fixed simulation cadence
- Phase: 0
- Objective: Fixed simulation cadence.
- Dependencies: 04.
- Existing files affected: engine.ts.
- New files/systems: timing.ts tests.
- Implementation: Accumulate frame delta and tick 30Hz, bounded catchup, clear on restart/load/visibility; retain speed semantics.
- Assets: None.
- Acceptance criteria: Equal elapsed time under 30/60/144fps gives equal ticks; hidden tab does not catch up.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 06 — Route around obstacles
- Phase: 1
- Objective: Route around obstacles.
- Dependencies: 05.
- Existing files affected: sim.ts steer/rebuildWalk.
- New files/systems: navigation.ts tests.
- Implementation: Add bounded A* no corner-cut, per-order cached paths/occupancy revision, replace teleport unsticking.
- Assets: Existing occupancy map.
- Acceptance criteria: Navigate U obstacle and narrow route; unreachable order stays finite and never teleports.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 07 — RTS selection and combat orders
- Phase: 2
- Objective: RTS selection and combat orders.
- Dependencies: 02,06.
- Existing files affected: engine.ts, sim.ts, types.ts.
- New files/systems: order regression tests.
- Implementation: Screen-space drag selection, retained attack-move destination, hold firing, target visibility guard.
- Assets: Existing units.
- Acceptance criteria: Rotated box selects only visible projected units; attack-move resumes; hold never chases.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 08 — Vertical slice integration gate
- Phase: 2
- Objective: Vertical slice integration gate.
- Dependencies: 03,04,05,06,07.
- Existing files affected: scripts, DEVELOPMENT_STATUS.md.
- New files/systems: game tests and QA checklist.
- Implementation: Build/typecheck; desktop/mobile render; 20-minute keyboard settlement/combat/save session.
- Assets: Current assets.
- Acceptance criteria: All slice criteria in GAME_DESIGN satisfied or explicitly open; production preview verified.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 09 — Spatial query budget
- Phase: 3
- Objective: Spatial query budget.
- Dependencies: 08.
- Existing files affected: sim.ts separate/acquireTarget/findNode.
- New files/systems: spatial.ts benchmark.
- Implementation: Bucket unit/resource queries; stagger AI scans; measure before/after with 240 people.
- Assets: None.
- Acceptance criteria: No missed neighbors at cell borders; p95 simulation <8ms target measured.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 10 — Construction and repair refinement
- Phase: 3
- Objective: Construction and repair refinement.
- Dependencies: 08.
- Existing files affected: sim.ts buildAI/placeBuilding, constants.ts.
- New files/systems: construction system tests.
- Implementation: Shared footprint reservation, repair/cancel refunds, blocked-builder indicator; extract construction seam.
- Assets: Existing buildings.
- Acceptance criteria: No double spending; blocked sites rejected; repair bounded by resources; canceled queues safe.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 11 — Survival economy and priorities
- Phase: 3
- Objective: Survival economy and priorities.
- Dependencies: 10.
- Existing files affected: sim.ts workerAI/tickPeople.
- New files/systems: economy.ts.
- Implementation: Add reserves/trends and warmth/tool modifiers; ordered job priorities; integrate granary/workshop.
- Assets: Manifest storage/production.
- Acceptance criteria: Winter has warning; manual orders persist; conservation tests.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 12 — Death and job animation
- Phase: 2
- Objective: Death and job animation.
- Dependencies: 08.
- Existing files affected: scene/meshes.ts, world.ts.
- New files/systems: animation state adapters.
- Implementation: Add staged death and role-specific actions using existing articulated geometry; then rig importer.
- Assets: Manifest clips.
- Acceptance criteria: No instant disappear; no colliding corpses; foot sliding measured.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 13 — Shared character rig
- Phase: 6
- Objective: Shared character rig.
- Dependencies: 12.
- Existing files affected: scene/meshes.ts.
- New files/systems: scene/assets.ts.
- Implementation: Review free rig candidates, use one palette/rig and equipment socket convention; import only licensed cohesive assets.
- Assets: Modular human manifest.
- Acceptance criteria: All clips/equipment pass import validation; record provenance.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 14 — Defenses and gate navigation
- Phase: 4
- Objective: Defenses and gate navigation.
- Dependencies: 09,10.
- Existing files affected: types.ts, constants.ts, sim.ts, world.ts.
- New files/systems: wall placement and gate state.
- Implementation: Segments, corners, tower and gate; friendly aperture and hostile blocking; invalidate local nav.
- Assets: Manifest defenses.
- Acceptance criteria: Army passes open gate and routes around closed gate without teleport.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 15 — Soft counters and formations
- Phase: 4
- Objective: Soft counters and formations.
- Dependencies: 07,09,13.
- Existing files affected: constants.ts, sim.ts.
- New files/systems: combat.ts, formations.ts.
- Implementation: Derived armor/bonus damage, stable slots, retreat, queued orders and patrol.
- Assets: Weapon kit.
- Acceptance criteria: Counters match spec; 60-unit choke tests; hold/stop consistent.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 16 — Strategic tribe director
- Phase: 5
- Objective: Strategic tribe director.
- Dependencies: 11,14,15.
- Existing files affected: sim.ts rivalTick.
- New files/systems: ai director/economy/military.
- Implementation: Separate budgeted decisions from per-unit AI; scouts respect fog, recover economy after losses.
- Assets: Existing rivals.
- Acceptance criteria: 30-minute seeded scenarios show defend, recover and raid without resource cheats.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 17 — Prehistoric technology graph
- Phase: 6
- Objective: Prehistoric technology graph.
- Dependencies: 11,15.
- Existing files affected: constants.ts, Hud.tsx.
- New files/systems: technology definitions/system.
- Implementation: Three campaign eras, timed prerequisite graph, economic/military exclusivity; migrate old saves explicitly.
- Assets: Age variations.
- Acceptance criteria: Acyclic graph, unlock cost consistency, reload no double buffs.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 18 — Cohesive environment pack pass
- Phase: 6
- Objective: Cohesive environment pack pass.
- Dependencies: 08.
- Existing files affected: world.ts, meshes.ts.
- New files/systems: optional GLB scenery subset.
- Implementation: Compare existing assets with verified CC0 Nature Kit; replace only matched coordinated families, instance repeated meshes.
- Assets: Kenney candidate, existing art.
- Acceptance criteria: Visual review at three zooms, no perf regression, licenses documented.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 19 — Wildlife and seasonal habitat
- Phase: 7
- Objective: Wildlife and seasonal habitat.
- Dependencies: 09,11,18.
- Existing files affected: sim.ts tickWildlife.
- New files/systems: wildlife system.
- Implementation: Herd flee, boar aggression, wolf hazard, bounded habitat spawning and optional migration.
- Assets: Manifest wildlife.
- Acceptance criteria: No infinite prey; predators signaled; offscreen simulation bounded.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 20 — Fog and scouting audit
- Phase: 5
- Objective: Fog and scouting audit.
- Dependencies: 07,16.
- Existing files affected: world.ts, Hud.tsx, sim.ts.
- New files/systems: visibility tests.
- Implementation: Shared visibility contract for rendering/selection/AI/minimap, last-known building ghosts.
- Assets: None.
- Acceptance criteria: Hidden units cannot leak through keys, target commands, minimap or AI.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 21 — HUD and teaching pass
- Phase: 8
- Objective: HUD and teaching pass.
- Dependencies: 17,19,20.
- Existing files affected: Hud.tsx, GameApp.tsx, styles.css.
- New files/systems: tutorial/objective data.
- Implementation: Contextual hints, tooltips, food/worker alerts, key remapping, scale controls and minimap navigation.
- Assets: Existing UI.
- Acceptance criteria: New player reaches farm/raid unassisted; keyboard-only full match.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 22 — Natural SFX and environment mix
- Phase: 8
- Objective: Natural SFX and environment mix.
- Dependencies: 03,19.
- Existing files affected: audio.ts.
- New files/systems: licensed SFX manifest.
- Implementation: Find coherent CC0 work/nature/impact samples; spatial attenuation, voice budgets and UI cues.
- Assets: Verified free samples.
- Acceptance criteria: No clipping/voice leak; readable attack/work feedback; full credits.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 23 — Save migration and deterministic replay
- Phase: 9
- Objective: Save migration and deterministic replay.
- Dependencies: 16,17,19.
- Existing files affected: rng.ts, persistence.ts, sim.ts.
- New files/systems: migration fixtures/replay tests.
- Implementation: Replace simulation randomness with serialized PRNG and timestamped commands; support supported old save versions.
- Assets: None.
- Acceptance criteria: Replay hashes match across frame rates; midbattle save resumes identically.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 24 — Performance and balance gate
- Phase: 9
- Objective: Performance and balance gate.
- Dependencies: 13,14,15,18,21,22,23.
- Existing files affected: all game systems.
- New files/systems: profiling fixtures.
- Implementation: Stress target populations, texture/memory/restart leaks, food and military balance; tune data only when possible.
- Assets: Final asset subset.
- Acceptance criteria: Meet documented frame budgets, 60-minute soak and repeated reloads.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## 25 — Playable alpha packaging
- Phase: 10
- Objective: Playable alpha packaging.
- Dependencies: 24.
- Existing files affected: README, status, deployment config.
- New files/systems: release checklist.
- Implementation: Build production, test fresh/save/defeat/victory, offline cached assets, credits, input guide; package release.
- Assets: Licensed final subset.
- Acceptance criteria: Complete match and all release gates; no claim of finished alpha before signoff.
- Do not: replace functioning terrain/renderer, duplicate balance definitions, weaken keyboard support, silently migrate saves, or introduce assets with unclear redistribution rights.

## Decisions and blockers
Stack, resource model, three-era target campaign, keyboard scheme, shared character rig, music direction and free-asset policy are decided above. No user decision blocks foundation work. Before full alpha, obtain gameplay/visual feedback on difficulty and historical looseness; measured performance and actual license evidence gate final asset choices. Existing later ages remain until migration is tested.
