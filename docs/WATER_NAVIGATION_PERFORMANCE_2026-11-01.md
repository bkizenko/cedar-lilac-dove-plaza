# Water-navigation preparation — 2026-11-01

The cold navigation query in `c9d697f` synchronously sampled and labeled **270,400 cells**. On the saved-village diagnostic it took **49.84ms**: 32.54ms sampling, 0.68ms obstacle/fall rasterization and 16.40ms labeling. A warm lookup took 0.0028ms. An ordinary navigation revision with unchanged physical input repeated 38.32ms of work and produced identical grid and label hashes.

## Change and evidence

Terrain/water overrides now reuse exact input snapshots across irrelevant navigation revisions. Buildings and waterfall barriers are applied to the current walk grid; labels reuse only when the complete output grid is byte-identical. The traversal no longer creates four neighbor arrays per visited cell.

NPC opportunity checks can use `requestWaterNavigation(g, waterOnly)` and advance pending work through `tickWaterNavigationPreparation(g)`. Both modes share a 2ms target per 16ms interval. `pending` means preparation, never unreachable. Publication is atomic and current; changed physical revisions restart incomplete work. Reset/load discards the old queue. No partial or stale grid is returned as ready.

| Diagnostic | Result |
|---|---:|
| Unchanged physical input after navigation revision | 38.32→7.40ms |
| Both cooperative modes ready | 1.21s wall, 58 calls |
| Cooperative call mean /95th percentile | 2.11 / 2.20ms |
| Cooperative maximum | 4.58ms |
| Legacy synchronous cold query | 50.10ms |

The cooperative budget is **a target, not a hard 2ms maximum**: allocation, snapshot validation and runtime pauses cannot be interrupted mid-operation. The legacy synchronous API intentionally remains available and exact, so an unprepared manual command or active caller can still block for about 50ms. Pending-aware coastal opportunity callers avoid that cold blocking; this does not establish complete browser smoothness.

The sampled grids and exact label IDs match the frozen algorithm. Both synchronous and cooperative build-only diagnostics left the full encoded game state unchanged. Tests cover both modes, elevated local water, waterfalls, solids/plans/gates, in-place terrain and local-water changes with navigation invalidation, permanent cuts, shared budgets, mid-build changes and reset. Custom instance sampler closures have unobservable inputs, so changing simulation time invalidates their pending work; the qualified normal path uses the game's revisioned physical samplers.

## Fresh V14 check

A separate short untouched seed 1/V14/pangaea/1,040m run used 10 warm and 45 measured `Game.step(.2)` calls. It began with 22 units and 3,575 trees: mean 2.23ms, median 1.22ms,95th percentile 7.63ms, maximum 22.06ms, no simulation errors. The largest ordinary sampled frame involved walk-component labeling. This covers only the first 11 simulation seconds and does not qualify mature V14 villages; earlier multi-minute wall-clock observations were not reproduced as sustained CPU cost.

The selected navigation/boat run passed 35 cases; its one blocked-maker compatibility-alias assertion also failed on published `c9d697f`. That assertion now checks the canonical paid project instead: preserved progress, no refund or second charge, successful reassignment, and eventual physical canoe completion. The corrected end-to-end case passes separately. No runtime change was needed for that test.

[Safe aggregate metrics](metrics/water-navigation-performance-2026-11-01.json) contain timings, counts and hashes, without serialized villages, resident records, inventories or coordinates.
