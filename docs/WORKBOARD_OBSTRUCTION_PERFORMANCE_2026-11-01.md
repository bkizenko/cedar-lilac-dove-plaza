# Resource-obstruction performance qualification

The spatial index narrows candidate building footprints before applying the existing exact strict resource obstruction predicate. It preserves the original full-clearing WorkBoard reset. Bounds are conservative; malformed geometry or excessive bucket references fall back to the original complete candidate list. No food, needs, profits, routes or NPC review cadence are cached or reduced.

## Exact query evidence

On an actual saved village, 237 solid buildings and 3,949 resource nodes produced the same complete obstruction mask (65 blocked nodes). Four counterbalanced query rounds measured 36.07/54.55/33.31/26.31 ms before and 4.42/2.67/1.15/1.12 ms with the index. Candidate references fell from a worst-case 935,913 to 11,864, using 2,437 bucket references. The source and full encoded state were unchanged. This is a query microcomparison, not a complete simulation or frame-rate result.

## Full simulation replay

A frozen `3c69426` baseline was compared sequentially with only the spatial-index helper and its WorkBoard hooks. Both water navigation modes and all geographic influence/paint preparation were completed before the initial encoded-state hash; this controls initial cooperative preparation timing. Each process then ran 20 warm steps and 120 measured ordinary `Game.step(1/30)` steps, with the same deterministic random stream. The private source save was not modified or published.

Initial and final complete encoded-state hashes matched, as did all 3,167 random calls. Both runs reported no simulation errors. All five full-clearing resets and geometry rebuilds remained in place.

| Measurement | Baseline | Spatial index |
| --- | ---: | ---: |
| Mean step | 88.57 ms | 117.14 ms |
| Median step | 79.89 ms | 97.20 ms |
| 95th percentile step | 133.75 ms | 210.67 ms |
| Maximum step | 300.64 ms | 652.88 ms |
| Total measured WorkBoard refresh time | 297.95 ms | 192.48 ms |
| Maximum WorkBoard refresh | 68.88 ms | 46.34 ms |

The complete sequential run became slower despite lower WorkBoard refresh time. Therefore this run establishes behavior equivalence and reduced obstruction/refresh work; it does **not** establish improved total simulation speed or smooth browser play. Large remaining step stalls are unresolved. No further performance cycle was used to select a favorable result.

## Rejected reset retention

An earlier candidate preserved obstruction entries across assignment-only resets. Its unprimed replay had differing final physical state despite identical initial state and random-call count. A one-simulated-second coastal review difference was consistent with wall-budget preparation timing, but that did not prove all differences harmless. Retention was removed rather than treating the failed full-state gate as a pass. The spatial index works with original reset semantics.

The accompanying aggregate JSON contains measurements and state hashes only, with no private actors, coordinates, inventories or save contents.
