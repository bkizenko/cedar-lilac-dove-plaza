# Skip unused on-shift food urgency queries

This candidate changes one predicate in `routineRest`: household food urgency is queried only off shift, with night work disabled. The result previously could not affect the rest decision during a working shift or explicit night work. All meaningful hunger, fatigue, storm and child rules remain. No aggregate food cache, team snapshot, terrain change, behavior reduction or cross-frame stale data is introduced. Living membership, age, mission independence and team are still queried live whenever hunger can affect rest.

## Actual intermediate diagnosis

The frozen source cohort is `.play/perf-intermediate-candidate`, SHA256 `dfe4881541911d10b5f310a52b38a0a182ceb9d1462080e01cca88c791e41772` over170 game modules. It precedes the later NPC-cooking/stale-hunting-route fixes and is **not final-release acceptance/performance evidence**.

One authorized private year-three village contains245 living people (57 player) across all six societies and363 standing buildings. No raw save/profile is committed. The private local copy and immutable original were checked unchanged. One sequential Node/arm64 profile used20 warm-up and100 measured actual `Game.step(1/30)` calls, preserved saved speed1, and performed only ordinary Resume after decode. The external diagnostic `Math.random` stream was fixed; this is not a persisted game-RNG claim.

Observed profiled wall mean26.46ms, median24.30ms, p9541.35ms, maximum118.35ms. Root QA was closed, but other focused checks could occur; these are observational Node timings, not browser frame rate. Samples attributed341 reserve-query samples (~256ms inclusive across100 updates) to `routineRest`; its clock was on shift at about12:59. Other inclusive hotspots remained workerAI30.5%, supply approach7.7%, work assignment7.6%, emergency response7.6% and interaction spot6.7%. These overlap and must not be summed. Inspector setup/post samples are included in the profile total. The aggregate profile report is `metrics/intermediate-world-cpu-2026-11-02.json`.

## One A–B–B–A trial

Both other specialists reported CPU clear and held heavy work. Four sequential runs used the same immutable real village, fresh decode, external LCG seed`0x51ed270b`,20 warm-up and100 measured1/30 updates. There was no profiler or per-method wrapper and no stock/order/body/terrain/speed manipulation.

| Run | Mean update ms | p95 ms | Maximum ms |
|---|---:|---:|---:|
| A1 original |24.7077|31.8853|86.8181|
| B1 predicate |22.1850|28.2560|84.1611|
| B2 predicate |21.9033|29.2986|72.1997|
| A2 original |22.9437|29.0698|70.3468|

Mean across runs23.8257→22.0442ms, an observed7.48% reduction in this short cohort. Tails are mixed, and one cohort does not establish general smoothness, browser FPS or final-release performance. All four initial, warm and final **full encoded states** match; external RNG draw counts/end states also match. The common final SHA256 is`2db9d05559efa1847ad4c3aad47795909dc15161c327485a7f4e223c69e74dde`, with3001 draws including decode and final external state3993374022. Both saved source/copy files remain unchanged. See `metrics/rest-query-abba-2026-11-02.json`.

## Behavioral qualification

Seven focused assertions cover the existing job/child exclusions, on/off-shift work, explicit night work, fatigue/storm paths, the exact240-second hunger boundary, and live household membership/death changes. Four additional **full Game.step** public controlled comparisons each execute five updates on unchanged generated legacy terrain: on-shift hungry, off-shift hungry, off-shift exact240-second boundary and explicit night work. Every intermediate encoded-state hash and external RNG state/draw count matches the baseline. These initial fixtures declare their time/food/job conditions and make no midrun corrective changes; they are component equivalence, not campaign evidence. See `metrics/rest-query-public-equivalence-2026-11-02.json` and `scripts/diagnostics/rest-query-equivalence.mjs` (baseline root, candidate root, aggregate-output path).

Parent integration/typecheck and any newer source-cohort recheck remain required. No release-gate credit is asserted.
