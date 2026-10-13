import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";

test("paired food searchers leave a reached frontier despite citizen separation",()=>{
  const g=new Game();g.reset(71,2);g.enterIsland();
  g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];g.rebuildWalk();
  const workers=[g.spawnUnit("worker",-.55,70,0),g.spawnUnit("worker",.55,70,0)];
  for(const u of workers)Object.assign(u,{order:"explore",searchJob:"food",tx:0,tz:70,workCheckAt:Infinity});
  let arrivals=0;
  g.findExploreTarget=()=>{arrivals++;return{x:24,z:70};};
  for(let frame=0;frame<90;frame++){
    g.state.time+=.1;g.navBudget=4;
    for(const u of workers)g.exploreAI(u,.1);
    g.separate(.1);
  }
  assert.ok(arrivals>=2,"both searchers must advance from the reached fog cell");
  for(const u of workers){
    assert.ok(u.x>10,"separation cannot trap a searcher forever at the old destination");
    assert.equal(u.order,"explore");assert.equal(u.stuckT,0);
  }
});

test("ordinary exploration still waits for actual arrival before choosing the next frontier",()=>{
  const g=new Game();g.reset(71,2);g.enterIsland();
  g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];g.rebuildWalk();
  const u=g.spawnUnit("worker",0,70,0);Object.assign(u,{order:"explore",tx:20,tz:70});
  let arrivals=0;g.findExploreTarget=()=>{arrivals++;return{x:40,z:70};};
  g.navBudget=4;g.exploreAI(u,.1);
  assert.equal(arrivals,0);assert.ok(u.x>0&&u.x<2);
});
