import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {enableCombatDoctrine} from '../src/game/combatDoctrine.ts';
import {assignGuardDuty,guardDutyAI} from '../src/game/guardDuty.ts';
import {setTorches,tickLighting,isLit,lightingOf,lightingStatus,chooseFuel,torchSites} from '../src/game/lighting.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function world(){const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 const gate=g.makeBld('gate',30,0,0);gate.done=true;gate.progress=1;g.state.buildings=[g.makeBld('townhall',0,0,0),gate];g.state.buildings[0].done=true;
 g.state.conflict='quiet';g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();enableCombatDoctrine(g);Object.assign(g.tribe(0),{wood:100,age:0});
 const night=()=>{g.isNight=()=>true;};const day=()=>{g.isNight=()=>false;};return {g,night,day};}
test('torches are off by default and use no fuel; old saves load',()=>{
 const {g,night}=world();night();tickLighting(g,10);assert.equal(g.tribe(0).wood,100);assert.equal(lightingOf(g),undefined);assert.ok(decodeGame(encodeGame(g)));
});
test('lit at night burns logs, then charcoal from Bronze, then oil; dark when out of fuel',()=>{
 const {g,night,day}=world();setTorches(g,true);day();tickLighting(g,10);assert.equal(g.tribe(0).wood,100,'nothing burns by day');
 night();assert.equal(isLit(g,30,0),false,'not lit until a tick chooses fuel');tickLighting(g,120);
 assert.equal(lightingOf(g).fuel,'wood');assert.equal(g.tribe(0).wood,98,'one gate burns 1 log per 60s');assert.equal(isLit(g,34,0),true);assert.equal(isLit(g,80,0),false);
 g.tribe(0).age=1;g.tribe(0).items={charcoal:5};assert.equal(chooseFuel(g),'charcoal');tickLighting(g,180);assert.equal(g.tribe(0).items.charcoal,4);assert.equal(g.tribe(0).wood,98);
 g.tribe(0).age=3;g.tribe(0).items={oliveOil:2};assert.equal(chooseFuel(g),'oil');
 g.tribe(0).items={};g.tribe(0).wood=3;tickLighting(g,10);assert.equal(lightingOf(g).fuel,null);assert.equal(isLit(g,30,0),false);assert.match(lightingStatus(g),/no fuel/);
 assert.ok(decodeGame(encodeGame(g)).state.lighting.on);
});
test('guards at posts add torch sites; unlit guards see less at night',()=>{
 const {g,night}=world();setTorches(g,true);night();const u=g.spawnUnit('spearman',10,10,0);u.militia=true;u.y=4;assignGuardDuty(g,u.id,'post',10,10);
 assert.equal(torchSites(g).length,2);tickLighting(g,1);assert.ok(g.nearTorch(10,10,0),'lit guard counts as near a torch');
 const foe=g.spawnUnit('spearman',10,19,3);foe.y=4;foe.order='hold';
 g.state.buildings=g.state.buildings.filter(b=>b.type!=='townhall'&&b.type!=='gate');
 u.order='hold';u.target=null;setTorches(g,false);night();g.state.time+=1;guardDutyAI(g,u,.1);
 assert.notEqual(u.order,'attack','unlit guard at night does not see a foe 9 m away (reach 6 m)');
 g.isNight=()=>false;u.order='hold';guardDutyAI(g,u,.1);assert.equal(u.order,'attack','by day the same guard meets the foe');
});
