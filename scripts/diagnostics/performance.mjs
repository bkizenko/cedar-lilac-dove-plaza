import { Game } from "../../src/game/sim.ts";
const methods = [
  "workerAI",
  "combatAI",
  "barbarianAI",
  "steer",
  "separate",
  "updateVision",
  "rebuildWalk",
  "tickWildlife",
  "tickPeople",
  "tickRegions",
  "defendHome",
];
for (const population of [50, 150, 300]) {
  const g = new Game();
  g.reset(123456);
  g.enterIsland();
  g.state.conflict = "quiet";
  g.tribe(0).food = 10000;
  const home = g.campOf(0);
  for (let i = g.popNow(0); i < population; i++)
    g.spawnUnit(
      i % 4 === 0 ? "spearman" : "worker",
      home.x + (i % 15) * 2 - 14,
      home.z + Math.floor(i / 15) * 2 + 15,
      0,
    );
  for (let i = 0; i < 90; i++) g.step(1 / 30);
  const costs = {};
  for (const key of methods) {
    const original = g[key].bind(g);
    costs[key] = 0;
    g[key] = (...args) => {
      const t = performance.now();
      try {
        return original(...args);
      } finally {
        costs[key] += performance.now() - t;
      }
    };
  }
  const frames = [];
  for (let i = 0; i < 300; i++) {
    const t = performance.now();
    g.step(1 / 30);
    frames.push(performance.now() - t);
  }
  frames.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      population,
      totalUnits: g.state.units.filter((u) => u.hp > 0).length,
      p50: frames[150],
      p95: frames[285],
      p99: frames[297],
      max: frames[299],
      average: frames.reduce((a, b) => a + b, 0) / frames.length,
      methodMsPerStep: Object.fromEntries(
        Object.entries(costs).map(([k, v]) => [k, +(v / frames.length).toFixed(3)]),
      ),
    }),
  );
}
