import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {fireHuntingProjectile,advanceHuntingProjectile,workerHuntAI,HUNTING_FLIGHT_RULES,HUNTING_WEAPONS,huntingSightClear} from '../src/game/hunting.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(slope=0){
 const g=new Game();g.reset(123456);g.enterIsland();
 const n=g.world.segs+1;
 for(let z=0;z<n;z++)for(let x=0;x<n;x++)g.world.heights[z*n+x]=Math.max(4,4+(x/g.world.segs*g.world.size-g.world.size/2)*slope);
 g.state.buildings=[g.makeBld('townhall',-60,38,0)];g.state.units=[];g.state.wildlife=[];g.state.autoWorkEnabled=false;g.vision.fill(2);g.rebuildWalk();
 const u=g.spawnUnit('archer',0,38,0);u.order='hold';
 const c={id:g.id(),species:'deer',x:6,z:38,y:g.height(6,38),hp:3,maxHp:3,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife=[c];return {g,u,c};
}
test('steep physical relief cannot create an out-of-range hunting shot or an unsaveable flight',()=>{
 const {g,u,c}=fixture(10);c.x=8;c.y=g.height(c.x,c.z);
 assert.ok(c.y-u.y>70);assert.equal(huntingSightClear(g,{x:u.x,y:u.y+1.2,z:u.z},{x:c.x,y:c.y+.4,z:c.z}),true);
 assert.equal(fireHuntingProjectile(g,u,c),false);assert.equal(g.state.projectiles.length,0);assert.equal(c.hp,3);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 u.order='gather';u.node=c;let stalked=0;g.nearestWalk=()=>({x:c.x,z:c.z});g.walkable=()=>true;g.workBoard.connected=()=>true;g.steer=()=>{stalked++;return false;};
 workerHuntAI(g,u,1);assert.equal(stalked,1);assert.equal(u.workReason,'Stalking deer');assert.equal(g.state.projectiles.length,0);
});
test('a legal uphill shot preserves bounded life and actual 3D velocity through save/load and contact',()=>{
 const {g,u,c}=fixture(.5);assert.equal(fireHuntingProjectile(g,u,c),true);
 const original=g.state.projectiles[0];assert.ok(original.huntingVelocity.y>0);assert.ok(original.life<=HUNTING_FLIGHT_RULES.maxFlightSeconds);
 const restored=decodeGame(encodeGame(g)),p=restored.state.projectiles[0],prey=restored.state.wildlife.find(a=>a.id===c.id);
 assert.deepEqual(p,original);assert.equal(advanceHuntingProjectile(restored,p,.5),true);assert.equal(prey.hp,1.5);
 const bad=encodeGame(g);bad.state.projectiles[0].life=HUNTING_FLIGHT_RULES.maxFlightSeconds+.001;assert.throws(()=>decodeGame(bad));
});
test('lead beyond actual weapon range keeps stalking instead of launching or waiting forever',()=>{
 const {g,u,c}=fixture();c.x=HUNTING_WEAPONS.bow.range-.05;c.vx=4;
 assert.equal(fireHuntingProjectile(g,u,c),false);u.order='gather';u.node=c;
 let stalked=0;g.nearestWalk=()=>({x:c.x,z:c.z});g.walkable=()=>true;g.workBoard.connected=()=>true;g.steer=()=>{stalked++;return false;};
 workerHuntAI(g,u,1);assert.equal(stalked,1);assert.equal(g.state.projectiles.length,0);
});
test('a generated hillside keeps identical terrain and legal uphill flight after a real save restore',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();g.state.buildings=[];g.state.units=[];g.state.wildlife=[];g.state.autoWorkEnabled=false;g.vision.fill(2);g.rebuildWalk();
 let site;
 search:for(let z=-180;z<=180;z+=4)for(let x=-180;x<=180;x+=4){
  const y=g.height(x,z),targetY=g.height(x+6,z),rise=targetY-y;
  if(y>3&&rise>=1&&rise<=4&&huntingSightClear(g,{x,y:y+1.2,z},{x:x+6,y:targetY+.4,z})){site={x,z,y,targetY};break search;}
 }
 assert.ok(site,'seed contains a real visible hillside');
 const u=g.spawnUnit('archer',site.x,site.z,0);u.order='hold';
 const c={id:g.id(),species:'deer',x:site.x+6,z:site.z,y:site.targetY,hp:3,maxHp:3,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife=[c];
 assert.equal(fireHuntingProjectile(g,u,c),true);
 const restored=decodeGame(encodeGame(g)),p=restored.state.projectiles[0],prey=restored.state.wildlife.find(a=>a.id===c.id);
 assert.equal(restored.height(u.x,u.z),g.height(u.x,u.z));assert.equal(restored.height(c.x,c.z),g.height(c.x,c.z));
 assert.deepEqual(p,g.state.projectiles[0]);assert.equal(advanceHuntingProjectile(g,g.state.projectiles[0],.5),true);assert.equal(advanceHuntingProjectile(restored,p,.5),true);assert.equal(prey.hp,c.hp);assert.equal(c.hp,1.5);
});
