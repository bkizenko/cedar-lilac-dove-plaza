# Defense CPU performance — 2026-10-31

The active-loop neighborhood grid reduced average simulation-step time by **17.2%** in one controlled saved-village comparison. Complete encoded end states matched byte-for-byte, including the same 3,168 random calls. This is CPU evidence, **not a browser FPS or smooth-play qualification**.

## Measurement

Both isolated copies used the same indexed source based on `074429e`, including pottery/vessel support and the same-team prefilter. Only the after copy added the defense grid. The generation-7, 1,560m scenario contained 245 units and 408 buildings. Each low-priority process ran 20 warm-up steps, then 120 measured `Game.step(1/30)` calls with identical seeded randomness. The source save was unchanged and both runs reported no simulation errors.

| Sampled step | Before | After | Change |
|---|---:|---:|---:|
| Mean | 42.10ms | 34.88ms | −17.2% |
| Median | 39.09ms | 32.16ms | −17.7% |
| 95th percentile | 53.52ms | 48.63ms | −9.1% |
| Maximum | 114.09ms | 112.97ms | −1.0% |

The remaining **113ms maximum** matters: the change reduces repeated defense scanning, but does not eliminate periodic simulation stalls or establish steady rendering performance. Do not compound this percentage with measurements from earlier runs.

## Exact behavior and scope

A 64m-cell grid supplies conservative candidates for the existing 65m emergency-response radius. It starts immediately before the sequential actor loop, updates each processed actor in `finally`, and closes before boat-passenger synchronization, separation, births and contact-order movement. Original array ordinals preserve equal-distance target ordering. Every original circular-distance, diplomacy, visibility and civilian-protection predicate still runs on candidates; response cadence is unchanged.

Direct calls outside the loop, populations below 64, changed state/time/array identity or count, and unexpected coordinates/membership use the original full scan. Future code that moves another resident inside the loop must update or invalidate the grid. Current coordinate writers and `steer` call sites were audited; livestock proxy movement does not move another resident.

## Rejected candidates

- A live 65m square check before the circle preserved state but measured 41.86→42.02ms mean; reverted.
- Replacing `foodDemand` filter/reduce with a direct loop preserved arithmetic and state but measured 41.25→41.48ms; reverted.
- A step-level food-demand/reserve cache was rejected **without implementation or a benchmark**: stocks, deaths/births, journeys, maturity, habitat and weather can change between calls. Cached demand could change survival behavior.

The separate same-team predicate was retained: `isFoe(a,a)` is always false. Its earlier single comparison showed only a modest mean improvement, not a tail-latency guarantee.

[Machine-readable safe metric summary](metrics/defense-performance-2026-10-31.json) contains counts, timings and hashes; it contains no serialized village, resident records, inventories or coordinates.

## Regression checks

All **40 bounded defense cases pass** on an indexed source export. Each priority scenario now uses the same fixed random stream as the successful control and restores randomness afterward, including the async case; all ten original scenario bodies and assertions are unchanged. Two obsolete surplus assertions were replaced with stronger physical-delivery and cache-equipment checks: the old tests assumed two food loads within 80 seconds and instant remote arming. No simulation rules were changed to make those tests pass.
