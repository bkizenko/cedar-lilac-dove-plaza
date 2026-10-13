import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { growthFoodNeed } from "../src/game/pantry.ts";
import { foodDemand } from "../src/game/settlement.ts";

function winterVillage(policy){
  const g=new Game();g.reset(71,2);g.enterIsland();g.state.time=1390;
  g.setGrowthPolicy(policy);g.state.weather="clear";
  g.state.units=g.state.units.filter(u=>u.team===0);
  g.state.buildings=g.state.buildings.filter(b=>b.team===0);
  for(const t of g.state.tribes)if(t.id!==0)t.alive=false;
  const hall=g.campOf(0),child=g.spawnUnit("worker",hall.x+7,hall.z,0);
  child.maturesAt=g.state.time+240;child.stature=.6;
  g.state.birthT=0;
  return{g,child};
}

test("a short winter surplus cannot trigger another birth under any welcome policy",()=>{
  for(const policy of ["stable","welcome","eager"]){
    const{g,child}=winterVillage(policy),before=g.popNow(0),maturesAt=child.maturesAt;
    g.tribe(0).food=foodDemand(g,0)*500;
    assert.ok(g.tribe(0).food<growthFoodNeed(g,0),"reproduce reserves passing the old 480-second check");
    g.tickPeople(.1);
    assert.equal(g.popNow(0),before,"do not add another mouth without the projected seasonal reserve");
    assert.equal(child.maturesAt,maturesAt);assert.equal(child.stature,.6);
    assert.ok(child.hp>0,"the guard never removes existing children");
  }
});

test("ample real provisions permit growth for welcoming and enthusiastic villages",()=>{
  for(const policy of ["welcome","eager"]){
    const{g,child}=winterVillage(policy),before=g.popNow(0),maturesAt=child.maturesAt;
    g.tribe(0).food=growthFoodNeed(g,0)+80;
    g.tickPeople(.1);
    assert.equal(g.popNow(0),before+1,"this is a sustainable floor, not a permanent population cap");
    const babies=g.state.units.filter(u=>u.team===0&&u!==child&&u.maturesAt>g.state.time);
    assert.equal(babies.length,1);assert.equal(babies[0].maturesAt,g.state.time+360);
    assert.equal(child.maturesAt,maturesAt);
  }
});
