// Deterministic scenario setup; simulation retains its existing stochastic events.
import { Game } from "../../src/game/sim.ts";
const g = new Game();
g.reset(123456);
g.enterIsland();
g.state.conflict = process.env.DAWN_CONFLICT || "quiet";
const home = g.campOf(0);
let built = false;
for (let frame = 0; frame < 54000 && !g.state.ended; frame++) {
  if (!built) {
    const pos = g.findOpenSpot(home.x, home.z, "farm", 0);
    if (pos) {
      g.placeBuilding("farm", pos.x, pos.z, 0);
      built = true;
    }
  }
  g.step(1 / 30);
  if (frame % 9000 === 8999) {
    const workers = g.state.units.filter((u) => u.team === 0 && u.type === "worker" && u.hp > 0);
    console.log(
      JSON.stringify({
        minute: Math.round(g.state.time / 60),
        food: Math.floor(g.tribe(0).food),
        wood: Math.floor(g.tribe(0).wood),
        pop: g.popNow(0),
        workers: workers.map((u) => ({ order: u.order, reason: u.workReason, carry: u.carry })),
        fields: g.state.buildings
          .filter((b) => b.team === 0 && b.type === "farm")
          .map((b) => ({ build: b.build, crop: b.crop })),
        wars: g.state.tribes.filter((t) => t.id > 0 && t.id < 3 && t.hostile).map((t) => t.name),
      }),
    );
  }
}
console.log("ended", g.state.ended, "time", g.state.time);
