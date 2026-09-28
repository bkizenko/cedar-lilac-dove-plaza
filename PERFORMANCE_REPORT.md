# Simulation performance checkpoint

Measured on this Mac with the standalone Node diagnostic, seed 123456, 90 warm-up steps and 300 measured fixed steps per population. Instrumentation adds overhead, scenarios retain stochastic events, and these samples are not renderer benchmarks or a guarantee of frame rate.

| Player population | Before average ms | After average ms | Before p99 ms | After p99 ms |
|---|---:|---:|---:|---:|
| 50 | 0.60 | 0.68 | 3.18 | 3.51 |
| 150 | 1.41 | 0.85 | 9.58 | 1.99 |
| 300 | 2.95 | 1.45 | 24.55 | 2.55 |

Population counts are now computed once per update instead of per person. Job-slot occupancy is shared within a simulation step, and idle-worker retries are spread over time. Existing behavior/regression tests remain the correctness gate.

Occasional navigation rebuilds still produce approximately 30–40 ms outliers. Terrain navigation rebuilds and browser renderer/GPU timings remain profiling work. Do not interpret the average timings as a complete 300-unit gameplay test.

Reproduce: `node --import ./scripts/game-loader.mjs scripts/diagnostics/performance.mjs`.
