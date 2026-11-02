# Assignment-local food queries: 4× simulation trial

Baseline: published `b0c9557e32b88956df9138f197705e3482400cef`, isolated snapshot, all 171 game modules fingerprinted. Authorized saved village remained private and unchanged: 245 living people across all societies (57 player), 363 standing buildings, original geography/resources/orders. No geography, tree, workload, survival or conflict rules were removed.

## Diagnosis and change

One 20-step warmup plus 100 profiled `Game.step(1/30)` updates at ordinary speed 4 advanced 16 simulated seconds including warmup. Mean update 33.71 ms, median 29.72, p95 54.68, maximum 81.60. V8 inspector sampling overhead is included; this is not a browser timing. `WorkBoard.assign` consumed 26.3% inclusive samples; repeated `foodWorkTarget`/storage and `foodDemand` queries were significant. Inclusive figures overlap and must not be added.

During one synchronous task-scoring loop, food stock, household membership and completed storage do not change. The candidate lazily reuses those two query results only inside that loop. Every later assignment evaluates fresh state, including intra-step deaths, team changes, maturation, missions and completed/destroyed/transferred/expanded storage. Crop availability may initialize crop metadata; it does not change either cached query's inputs. The fallback/no-work branch remains unchanged. No per-frame or long-lived aggregate cache was added.

## Exact control and timing

The first cold asynchronous-navigation cohort was **rejected**: A1/B1 matched all encoded state and random draws, but repeated B2 differed in `state.coastalTradeReviewAt` alone. Wall-budgeted cooperative navigation preparation completed at a different simulated time. The entire failed cohort is retained as unqualified evidence; no fields were removed or normalized.

With parent approval, the sole replacement A–B–B–A trial prepared both existing exact navigation modes synchronously before each warmup. Preparation left the full encoded state unchanged; both 520² navigation grids and component-label hashes matched across all four branches. This measures **sustained ready-navigation-cache 4× updates**, excluding cold preparation and decode. Each branch used 20 warmup + 100 measured real updates, the same external LCG state, ordinary Resume/speed 4 and the public visitor-decline handler if needed (zero visits needed declining in this short interval). No stock/body/terrain changes or corrective gameplay commands occurred.

| Branch | Mean ms | p95 ms | Max ms |
|---|---:|---:|---:|
| A1 | 28.752 | 45.224 | 74.528 |
| B1 | 26.919 | 42.008 | 71.886 |
| B2 | 25.537 | 39.911 | 52.963 |
| A2 | 27.854 | 41.528 | 58.338 |

Mean across A runs: 28.303 ms; B: 26.228 ms, **7.33% lower observed mean**. All four complete initial, post-warmup and final encoded states matched. All 30,698 external random draws and final diagnostic RNG state `2651825821` matched. Final encoded SHA-256: `f408287de2f1a52bf6f63492eca2143dde42d2a9591fca0fef386aedd644b32f`. No simulation errors. External RNG is a diagnostic control, not a claim that game RNG is serialized.

## Validation and reproduction

13 focused checks passed: two new assignment-query/cargo tests plus 11 existing WorkBoard obstruction/tree-capacity tests. Three public native-terrain `Game.step` equivalence probes exercise storage completion/death/transfer/expansion; household death/dependency/team changes; and food reserve 90/240 boundaries, explicit job locks, hunting and work policies. Every step compares full encoded state and exact external random draws. These deliberately authored live changes are equivalence probes, not campaign progression evidence.

Run `scripts/diagnostics/assignment-query-equivalence.mjs` with baseline source, candidate source and aggregate output paths. Run `scripts/diagnostics/assignment-query-saved-village.mjs` with baseline source, candidate source, an authorized private fixture and aggregate output paths; never commit a private fixture. The latter excludes decode/navigation preparation from update timings and aborts on any complete-state, RNG or navigation-coverage mismatch.

Artifacts under `docs/metrics/` record the source fingerprint, immutable fixture hash, unqualified cold cohort, exact-control ready-cache cohort and public probes. Raw save/profile/full replay states remain private local. No new acceptance gate is claimed. Browser fast-forward FPS, rare periodic stalls, cold asynchronous readiness and long campaign behavior remain unqualified. Parent owns combined typecheck/build and actual browser review.
