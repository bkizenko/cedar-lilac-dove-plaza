# Steering target checks — 2026-11-01

Moving the existing destination/footprint bounds checks before the pure `solidBuilding` predicate reduced steady simulation work in one controlled saved-village comparison. It adds no cache or response delay and retains the original building order, live conditions, entrance selection and route behavior.

Both isolated variants used `5472220`, the same input and random stream, 20 warm-up steps and 120 measured `Game.step(1/30)` calls at low process priority. No profiler or hot function wrappers ran during timing. Complete encoded end-state hashes matched, with 3,165 random calls in each run; the source save was unchanged and neither run reported simulation errors.

| Sampled step | Before | After | Change |
|---|---:|---:|---:|
| Mean | 39.07 ms | 35.98 ms | −7.9% |
| Median | 35.68 ms | 31.29 ms | −12.3% |
| 95th percentile | 57.70 ms | 64.43 ms | +11.7% |
| Maximum | 109.14 ms | 120.76 ms | +10.6% |

**Tail latency did not improve.** This is evidence of less steady work, not elimination of buffering or a browser FPS qualification.

One additional, unmeasured step counted the pure query after the timing window. Both variants made 115 steering calls; solidity checks inside steering fell from **45,728 to 52**. Total solidity checks fell from 46,255 to 579. That step's complete encoded state and random-call count also matched. Three focused tests cover ordered redirects, inclusive boundaries, missing entrances, current gates/plans/HP and rereading live conditions with a cached route.

## Rejected prisoner candidate

A separate sparse-prisoner candidate also preserved the complete state hash and the same 3,165 random calls, but showed no useful overall gain: mean **35.52→38.42 ms**, median 32.19→31.88 ms, 95th percentile 54.96→73.88 ms, maximum 101.38→148.27 ms. It was rejected and reverted. This separate pair used different instrumentation; its absolute timings should not be compared with the steering pair above.

## Remaining task-board stalls

The earlier profile's 112 ms frame included 41.9 ms in task refresh, 22.1 ms in assignment and 12.7 ms in rival review. Within the sampled refresh subtree, obstruction checks and task insertion dominated.

A static next-step candidate is to distinguish assignment-only resets from geometry lifecycle resets. `WorkBoard.reset` currently discards persistent resource-obstruction results even when geometry has not changed. `refreshObstructions` already validates world/state identity and exact current solid footprints; individual resource entries validate their current coordinates. Retaining those results across assignment-only resets may avoid cold rescans. World/load resets must still release old references, and task priorities, occupancy and navigation resets must remain unchanged. This proposal is **not implemented or measured**; it needs mutation/invalidation tests and a new same-state performance gate.

[Safe aggregate metrics](metrics/steer-bounds-performance-2026-11-01.json) contain only timings, counts and hashes, without village state, resident records, coordinates or inventories.
