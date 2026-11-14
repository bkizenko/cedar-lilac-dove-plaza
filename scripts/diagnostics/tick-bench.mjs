// Headless simulation tick benchmark. Usage: node --import ./scripts/game-loader.mjs scripts/diagnostics/tick-bench.mjs [population=150] [ticks=600] [repeats=3]
// Math.random is seeded so before/after runs follow the same trajectory; reports the best repeat (least machine noise).
import { Game } from "../../src/game/sim.ts";
const pop = +(process.argv[2] || 150), N = +(process.argv[3] || 600), R = +(process.argv[4] || 3);
const results = [];
for (let r = 0; r < R; r++) {
  let s = 12345; Math.random = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const g = new Game(); g.reset(123456); g.enterIsland(); g.state.conflict = "quiet"; g.tribe(0).food = 10000;
  const home = g.campOf(0);
  for (let i = g.popNow(0); i < pop; i++) g.spawnUnit(i % 4 === 0 ? "spearman" : "worker", home.x + (i % 15) * 2 - 14, home.z + Math.floor(i / 15) * 2 + 15, 0);
  for (let i = 0; i < 90; i++) g.step(1 / 30);
  const f = [];
  for (let i = 0; i < N; i++) { const t = performance.now(); g.step(1 / 30); f.push(performance.now() - t); }
  f.sort((a, b) => a - b);
  results.push({ avg: f.reduce((a, b) => a + b, 0) / N, p50: f[N >> 1], p99: f[Math.floor(N * .99)] });
}
results.sort((a, b) => a.avg - b.avg);
const b = results[0];
console.log(JSON.stringify({ pop, ticks: N, msPerTickAvg: +b.avg.toFixed(3), p50: +b.p50.toFixed(2), p99: +b.p99.toFixed(2) }));
