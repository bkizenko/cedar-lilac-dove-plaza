# Rejected resource-refresh performance experiment

The candidate is **not adopted**. No runtime or test implementation from this experiment belongs in the published source.

Baseline: published `8e95bca5941dea87fb6ceba5d29335272685b4d3`. Candidate source remained isolated in `.play/perf-refresh-resource-lists`. The prior actual 4× saved-village CPU profile identified `WorkBoard.refresh` at 9.94% inclusive samples; that refresh implementation was unchanged by the preceding assignment-query optimization. This experiment did not rerun a CPU profile.

The proposed change sampled non-depleted, physically unobstructed tree/forage/stone/copper/iron resource lists once per synchronous refresh, rather than repeating the same geometry predicate for every society. Task order, slots, priorities and per-society eligibility were retained. Fish deliberately remained live: actual dock surveys can append finite fish sections during the building loop. Crop initialization and quarry seam initialization were audited; neither changes the filtered resource arrays during refresh. No long-lived cache, terrain/resource reduction, scheduling-rate change or gameplay-rule relaxation was proposed.

## Correctness evidence

16 focused checks passed: 13 existing WorkBoard obstruction, assignment query and tree-capacity checks, plus three experiment checks for once-per-refresh obstruction queries, live footprint/depletion/insertion changes and a real finite dock survey visible to later societies in the same refresh. Four public native-terrain actual `Game.step` probes matched full encoded state, external diagnostic random draws and exact task tables including order, slots and priorities. Those authored state mutations are equivalence probes, not campaign progression qualification. Candidate-dependent tests remain with the isolated experiment and are not added to the published suite.

The private authorized village remained unchanged: 245 living people across all teams, 363 standing buildings and its original resources, orders and terrain. Each A–B–B–A branch used ordinary Resume/speed 4, 20 warmup steps and 100 measured `Game.step(1/30)` updates. Both exact navigation modes were prepared before warmup; full encode was unchanged by preparation and both 520² grids and component-label hashes matched. The public visitor-decline handler was available if contact paused the run; zero declines were needed. No grants or body/terrain corrections occurred.

All four initial, post-warmup and final encoded states matched exactly; so did 30,698 external diagnostic random draws and final state `2651825821`. Final encoded hash: `f408287de2f1a52bf6f63492eca2143dde42d2a9591fca0fef386aedd644b32f`. This external RNG control is not a claim that the game persists RNG state.

## Timings and rejection

The first timing cohort was contaminated by an overlapping browser import of the large saved village. Parent confirmed the overlap. Its state-equivalence result is retained, but all performance conclusions from it are rejected.

After confirmed closure of both test tabs and explicit CPU clearance from all agents, one clean repeat produced:

| Branch | Mean update ms | p95 ms | Maximum ms |
|---|---:|---:|---:|
| A1 | 27.481 | 41.894 | 77.965 |
| B1 | 29.132 | 45.907 | 121.114 |
| B2 | 25.448 | 38.751 | 52.423 |
| A2 | 25.882 | 40.754 | 54.290 |

Mean across A runs: **26.681 ms**; B: **27.290 ms**, a 2.28% higher observed mean. Mean process CPU per 100 measured steps was almost flat: 3388.736 vs 3370.041 ms; that includes V8 background work. The 15 refresh-bearing steps per branch averaged 35.118 vs 34.136 ms, about 2.8% lower. Those frames include other work and do not isolate refresh cost. Neither that local observation nor the reduced query count demonstrates an overall benefit. The candidate is rejected; no further timing repetitions were used to search for a favorable outcome.

Full aggregate evidence, source fingerprints and immutable fixture hash are in the accompanying three `docs/metrics/resource-refresh-*.json` files. Raw save/profile/full states remain local only. No browser/FPS, cold navigation, whole-campaign or acceptance-gate claim follows from this experiment. The previously published assignment-local query optimization is unaffected.
