import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {emergencyResponse} from '../src/game/defense.ts';
function fixture(){
 const g=new Game();g.reset(42,2);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];
 g.vision.fill(2);g.state.time=200;g.state.paused=false;g.state.conflict='quiet';
 const hut=g.makeBld('hut',0,38,0);g.state.buildings.push(hut);g.rebuildWalk();
 const u=g.spawnUnit('worker',10,38,0);u.hp=u.maxHp*.2;
 const enemy=g.spawnUnit('spearman',18,38,3);enemy.order='hold';return {g,hut,u,enemy};
}
test('wounded resident physically reaches an entrance before sheltering, without healing or teleporting',()=>{
 const {g,hut,u,enemy}=fixture(),hp=u.hp;
 const start={x:u.x,z:u.z};emergencyResponse(g,u,.1);
 assert.equal(u.shelterId,undefined);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)<1);
 assert.ok(g.walkable(u.tx,u.tz),'destination is a walkable entrance, not solid centre');
 for(let i=0;i<600&&!u.shelterId;i++){g.state.time+=.1;emergencyResponse(g,u,.1);}
 assert.equal(u.shelterId,hut.id);assert.equal(u.hp,hp);assert.equal(u.order,'hold');
 enemy.target=u;emergencyResponse(g,u,.1);assert.equal(enemy.target,null,'concealed occupants stop existing pursuit');
 assert.notEqual(g.acquireTarget(enemy,50),u,'normal enemy targeting excludes occupants');
 hut.hp=0;u.shelterId=undefined;emergencyResponse(g,u,.1);assert.equal(u.shelterId,undefined);assert.match(u.workReason,/escaping|blocked/);
});
test('full or unreachable shelter never hides a resident remotely',()=>{
 const {g,hut,u}=fixture();
 for(let i=0;i<5;i++){const p=g.spawnUnit('worker',0,38,0);p.shelterId=hut.id;}
 emergencyResponse(g,u,.1);assert.equal(u.shelterId,undefined);assert.match(u.workReason,/escaping|blocked/);
 g.state.units=g.state.units.filter(p=>p===u||p.team===3);g.interactionSpot=()=>null;
 emergencyResponse(g,u,.1);assert.equal(u.shelterId,undefined);assert.match(u.workReason,/escaping|blocked/);
});
test('sheltered residents rejoin normal work after the alarm expires',()=>{
 const {g,hut,u,enemy}=fixture();const entrance=g.interactionSpot(u,hut);u.x=entrance.x;u.z=entrance.z;
 emergencyResponse(g,u,.1);assert.equal(u.shelterId,hut.id);
 enemy.hp=0;g.state.time+=11;u.shelterId=undefined;
 assert.equal(emergencyResponse(g,u,.1),false);assert.equal(u.emergency,undefined);assert.equal(u.order,'idle');
});
test('real Game.step preserves occupied shelter and releases survivors when its building is destroyed',()=>{
 const {g,hut,u,enemy}=fixture();
 for(const key of ['trees','forage','stones','copper','iron','fish','wildlife'])g.state[key]=[];
 g.state.encounter=undefined;g.state.contacts=[3];g.state.weather='clear';g.state.weatherT=10000;
 g.dayPhase=()=>.5;g.visibleAt=()=>true;g.state.ended=null;g.tribe(0).food=150;
 const entrance=g.interactionSpot(u,hut);u.x=entrance.x;u.z=entrance.z;u.y=g.height(u.x,u.z);
 const hp=u.hp;
 for(let i=0;i<20;i++){
  g.step(.1);assert.equal(u.shelterId,hut.id,`frame ${i}: shelter remains occupied`);
  assert.notEqual(g.acquireTarget(enemy,50),u);assert.equal(u.hp,hp,'emergency shelter itself does not heal');
 }
 assert.deepEqual(g.simulationErrors,[]);
 // Damage the physical shelter through the normal combat path, not a shelter flag.
 g.applyCombatDamage(3,hut,hut.hp+1);assert.equal(hut.hp,0);
 g.step(.1);
 assert.equal(u.shelterId,undefined);assert.ok(g.state.units.includes(u)&&u.hp>0);
 assert.equal(g.acquireTarget(enemy,50),u,'survivor is exposed again after the shelter falls');
 assert.match(u.workReason,/escaping|blocked/);
});
