import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

test("new habitats offer cohesive reachable prey without increasing the world's animal budget", () => {
  for (const [seed, species] of [[71,"goat"],[982,"boar"],[123456,"deer"]]) {
    const g=new Game(); g.reset(seed,2);
    const home=g.campOf(0);
    const nearby=g.state.wildlife.filter(c=>c.species!=="bird"&&Math.hypot(c.x-home.x,c.z-home.z)<80);
    assert.ok(nearby.length>=10,`seed ${seed}: an actual local herd`);
    assert.ok(nearby.every(c=>c.species===species),`seed ${seed}: prey follows the habitat, not the player faction`);
    assert.ok(nearby.some(c=>Math.hypot(c.x-home.x,c.z-home.z)<35),"food search can encounter a nearby grazing group");
    const groups=new Map();
    for(const c of nearby){
      assert.ok(g.walkable(c.x,c.z),"prey must occupy huntable terrain");
      assert.ok(g.workBoard.connected(g,home.x,home.z,c.x,c.z),"herds cannot be placed beyond an impassable bank");
      assert.ok(g.height(c.x,c.z)>g.world.waterY+.35);
      const key=JSON.stringify(c.grazing); groups.set(key,(groups.get(key)||0)+1);
    }
    assert.ok(groups.size<=3 && [...groups.values()].every(n=>n>=2),"animals graze in groups instead of isolated dots");
    for(const [kind,max] of [["deer",20],["boar",16],["goat",26],["bird",17]])
      assert.ok(g.state.wildlife.filter(c=>c.species===kind).length<=max,"existing finite animal counts stay capped");
  }
});

test("loading keeps established herd positions, surviving numbers and finite carcasses",()=>{
  const g=new Game();g.reset(71,2);g.state.time=140;
  g.state.wildlife=g.state.wildlife.slice(3);
  const dead=g.state.wildlife.find(c=>c.species!=="bird");
  dead.hp=0;dead.carcass={meat:5,diedAt:110};dead.x+=19;dead.z-=7;
  for(const c of g.state.wildlife)delete c.grazing; // A save from before grazing ranges existed.
  const raw=JSON.parse(JSON.stringify(encodeGame(g))),loaded=decodeGame(raw);
  assert.deepEqual(loaded.state.wildlife,raw.state.wildlife,"generation may not refill meat, move animals or resurrect hunted prey");
});
