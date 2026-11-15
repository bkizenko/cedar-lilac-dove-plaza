# Bigger maps: enabling work and measured budgets

## BLUF
Two new world sizes (2940 m = 8x, 4160 m = 16x the 1040 m area) generate, run, save and reload. Nav and fog grids now derive from world size (`src/game/gridScale.ts`) and are bit-identical for 1040/1560/2080 (digest test). Large saves overflow to IndexedDB with localStorage fallback (`src/game/saveStore.ts`). This is NOT the hierarchical/windowed nav grid, the chunked renderer path, or Regional tier from PLAN-future section 3; sizes above 4160 are not offered.

## Grid rule
- Nav: 520 cells up to 2080 m; above that `min(1300, round(size/4))` (4 m cell: 735 at 2940, 1040 at 4160). Cap 1300 means worlds above 5200 m would coarsen the cell.
- Fog/territory: 192 cells up to 2080 m; above that `round(192*size/2080)` (10.8 m cell: 271, 384), cap 1024.
- Fog/territory/nav arrays are allocated in `Game.reset` (`sizeGrids`); the scene rebuilds its fog textures when the grid length differs; the save validator expects `fowCells(size)^2` vision cells.

## Measured (Node 24, Apple M-series dev machine under other load; test `scripts/bigger-maps-budget.test.mjs`, seed 777, pangaea, worldgen 22)
| size | generate | step median / p95 | heap delta | RSS | stored save at start | decode (regenerates terrain) |
|---|---|---|---|---|---|---|
| 2940 | 15.1 s | 32.8 / 224.6 ms | 67 MB | 428 MB | 0.64 MB chars | 18.0 s |
| 4160 | 29.7 s | 46.7 / 560.3 ms | 62.5 MB | 495 MB | 1.03 MB chars | 27.4 s |
Step times are for the starting village at 0.25 s steps (the 2080 reference was not re-measured here). p95 spikes are path searches on the bigger nav grid. Heap delta excludes typed arrays outside the JS heap (RSS is the better total). Rebuild-walk 11/25 ms looks cached; [UNVERIFIED] cold cost. Generation and load times block the main thread unless run in a Worker: [UNVERIFIED] in browser. Late-game saves with many villages/buildings and frame rate/GPU memory in the renderer: [UNVERIFIED] (not measured; no browser run).

## Save path
Values over 2,000,000 chars, or any write that throws QuotaExceededError, go to IndexedDB (db `hearthwild-saves`); a pointer `hwidb1:<length>` is written to the same localStorage key only after the IndexedDB commit. Old saves load unchanged and move only when next written. `hydrateSaveStorage()` runs before the engine boots. Failure paths (named in `saveStorageStatus()` and shown in the Save status menu): idb-unavailable (quota error rethrown, autosave reports failure), idb-write-failed, idb-read-failed, idb-missing-value, pointer-write-failed. Multi-tab: another tab's IndexedDB write is not picked up until reload [UNVERIFIED in a browser].
