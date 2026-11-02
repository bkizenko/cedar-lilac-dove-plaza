import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { carryingCapacity } from "../src/game/haulage.ts";
import { CARCASS_MEAT, carcassAvailable, carcassStateValid, huntable, updateCarcass, wildlifeFleeSpeed, workerHuntAI } from "../src/game/hunting.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

function fixture(species = "deer") {
  const g = new Game(); g.reset(123456); g.enterIsland();
  g.world.heights.fill(4); g.state.units = []; g.state.buildings = [];
  g.state.trees = []; g.state.forage = []; g.state.fish = []; g.state.stones = [];
  g.state.weather = "clear"; g.clockState = () => ({ period: "Day" });
  g.vision.fill(2);
  g.state.buildings = [g.makeBld("townhall", 0, 60, 0)];
  const u = g.spawnUnit("worker", 0, 38, 0);
  const hp = species === "deer" ? 3 : species === "boar" ? 4 : 2;
  const prey = { id: g.id(), species, x: 3, z: 38, y: 4, hp, maxHp: hp,
    facing: 0, vx: 0, vz: 0, wanderT: 20, fly: 0, scale: 1 };
  g.state.wildlife = [prey];
  Object.assign(u, { order: "gather", node: prey, job: "food", jobLock: true, huntOnly: true });
  g.rebuildWalk();
  return { g, u, prey };
}
function advance(g, u, dt = 0.1) {
  g.state.time += dt; g.navBudget = 5; workerHuntAI(g, u, dt);g.updateProjectiles(dt,true);
}

test("a drifted final chase waypoint cannot abandon the reachable carcass at 2.03235m",()=>{
 const {g,u,prey}=fixture();prey.hp=0;prey.x=27.64375;prey.vx=prey.vz=0;prey.carcass={meat:24,diedAt:0};
 u.x=24;u.z=38;u.tx=26;u.tz=38;g.navBudget=5;g.steer(u,.1);
 assert.equal(g.peekMovementRoute(u.id)?.tx,26);
 u.x=25.6114;u.y=4;u.z=38;
 const x=u.x;g.navBudget=5;workerHuntAI(g,u,.1);
 assert.ok(u.x>x,"must physically close toward the real carcass");assert.equal(u.carry,0,"cannot butcher outside the unchanged 1.8m reach");assert.equal(u.node,prey);assert.equal(g.peekMovementRoute(u.id)?.tx,prey.x);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 for(let i=0;i<1200&&!(g.tribe(0).items?.rawMeat>0);i++){
  g.state.time+=.1;g.navBudget=5;
  if(u.order==='return')g.workerAI(u,.1);else workerHuntAI(g,u,.1);
 }
 assert.ok(g.tribe(0).items?.rawMeat>0,"real butchery and delivery complete");
 assert.equal((g.tribe(0).items?.rawMeat||0)+u.carry+prey.carcass.meat,CARCASS_MEAT.deer);
 const restored=decodeGame(encodeGame(g));assert.equal(restored.tribe(0).items.rawMeat,g.tribe(0).items.rawMeat);
});
