import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

test("saved seed345 carriers take the real dry river detour and deposit their original logs",()=>{
  let g=new Game();g.reset(345,2);g.state.units=[];g.state.buildings=[];
  // Reduced from the actual year-two stranded save. These people crossed during
  // drought, then sat for >1100 seconds when the normal shoreline returned.
  for(const[type,x,z]of[
    ["townhall",162.55161492813403,-230.1144198707345],
    ["hut",164.04330682188345,-221.26447845436272],
    ["hut",156.87384507300357,-237.27432698752202],
    ["barracks",153.55161492813403,-222.1144198707345],
    ["cairn",174.55161492813403,-236.1144198707345],
    ["warehouse",170,-224],["warehouse",162,-238],
    ["farm",158,-244],["farm",154,-230],["quarry",154,-210],
  ])g.state.buildings.push(g.makeBld(type,x,z,1));
  for(const[x,z,carry]of[[224.4092642541533,-214.4092642541533,3],[225.18708171345853,-215.18708171345853,5]]){
    const u=g.spawnUnit("worker",x,z,1);
    Object.assign(u,{order:"return",carry,carryType:"wood",node:null,stuckT:1150});
  }
  g.state.time=3600;g.state.weather="rain";
  g=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  const people=[...g.state.units],wood=g.tribe(1).wood,water=g.world.waterY;
  assert.ok(g.workBoard.connected(g,people[0].x,people[0].z,g.campOf(1).x,g.campOf(1).z));
  let distance=0,steps=0;
  for(;steps<3500&&people.some(u=>u.carry>0);steps++){
    g.state.time+=.1;g.navBudget=4;
    for(const u of people){
      if(!u.carry)continue;
      const x=u.x,z=u.z,pace=g.travelSpeed(u);
      g.workerAI(u,.1);
      const moved=Math.hypot(u.x-x,u.z-z);distance+=moved;
      assert.ok(moved<=pace*.1+1e-7,"recovery must walk, never teleport");
      assert.ok(g.height(u.x,u.z)>=water+.12-1e-7,"every actual step remains on dry ground");
      assert.ok(g.state.buildings.every(b=>!g.solidBuilding(b)||Math.abs(u.x-b.x)>=b.w*.4+u.r||Math.abs(u.z-b.z)>=b.d*.4+u.r),
        "return travel never cuts through a building");
    }
  }
  assert.ok(steps<3500,"the saved carriers must complete the return journey");
  assert.ok(distance>500,"both carriers follow the long physical detour around the river");
  assert.equal(g.tribe(1).wood,wood+8);assert.ok(people.every(u=>u.carry===0));
  assert.equal(g.world.waterY,water,"recovery cannot lower the river");
});

test("navigation and physical steps agree on dry low ground without permitting wet foundations",()=>{
  const g=new Game();g.reset(345,2);g.state.units=[];g.state.buildings=[];
  g.height=()=>g.world.waterY+.13;g.rebuildWalk();
  const u=g.spawnUnit("worker",0,40,0);
  assert.equal(g.walkable(2,40),true);assert.equal(g.canStep(u,2,40),true);
  assert.equal(g.dryFoundation("hut",0,40),false,"building foundations retain their separate dry apron clearance");
  g.height=()=>g.world.waterY+.11;g.rebuildWalk();u.y=g.height(u.x,u.z);
  assert.equal(g.walkable(2,40),false);assert.equal(g.canStep(u,2,40),false);
  assert.equal(g.dryFoundation("hut",0,40),false);
});
