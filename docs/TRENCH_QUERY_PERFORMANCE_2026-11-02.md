# Scoped trench construction queries

The independent `d048d1a` candidate reduces a measured periodic settlement-search stall by indexing only trench building types for the duration of one synchronous `findOpenSpot` call. It does not include the rejected resource broadphase, distance-bound or assignment candidates.

`excavationConstructionIssue` previously scanned every building before rejecting each candidate's ground. The authorized mature save contains 408 buildings and zero trenches. One rival settlement search can test 372 candidates; the former helper therefore examined up to 151,776 ordinary building types per search. The scoped view scans those 408 types once. It retains every trench object in original array order, with all original live hp, construction progress, paid-plan, chosen-depth and exact bank-intersection predicates. It neither caches cut geometry nor omits distant or oversized banks. State/array/length changes use the live full array; nested calls and exceptions restore the prior context. The next search rebuilds the view.

Five focused cases pass, including 17,480 comparisons with the original bank predicate, falsey/NaN hp and paid-plan behavior, live trench changes, state/array changes, and nested/exception cleanup. Twenty-nine existing excavation, cultivation/food and haulage cases also pass (34 total). Isolated typecheck and production build pass.

## Controlled saved-village comparison

Four fresh low-priority processes ran A–B–B–A from the same unchanged private input, with 20 warm-up and 180 measured ordinary `Game.step(1/30)` updates at 4× per process. No actor, stock, route, terrain, clock or simulation-cadence modification was made. Decode was excluded. All four complete initial/final encoded states and all 31,825 update-time random calls match.

| Measure | Baseline | Candidate |
| --- | ---: | ---: |
| Mean update | 31.98ms | 31.49ms |
| Pooled p95 | 48.97ms | 46.41ms |
| Largest measured update | 101.03ms | 69.07ms |
| Periodic settlement update 85, mean | 100.50ms | 61.15ms |

The mean improvement is modest, 1.54%. The targeted settlement update improves 39.16%; both baseline runs measured roughly 100–101ms and both candidate runs roughly 61–62ms. This is a consistent periodic CPU-tail reduction, not a cure for sustained simulation cost or a browser FPS result. Long updates remain possible. Rendering, GPU execution, browser autosave and interface overhead were not measured here.

The complete final encoded-state SHA-256 is `a4fb86a74f383bf4786534b7c270afeb2d3ab16f947f7abd7ec0654d652be9ca`. This feature HEAD intentionally differs from earlier `1a90ade` experiments; only the baseline/candidate comparison inside this `d048d1a` experiment establishes equivalence. Exact input/initial/source hashes, individual runs and logs are in the aggregate JSON. No private save payload is published.
