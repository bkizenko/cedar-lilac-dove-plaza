import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {manageRivalFields} from '../src/game/rivalFarming.ts';
import {crop} from '../src/game/settlement.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function setup(){const g=new Game();g.reset(345);g.enterIsland();g.state.time=0;g.world.biomes=[{kind:'forest',x:0,z:0}];g.world.heights.fill(4);Object.assign(g.tribe(1),{cultivated:['grain','pulses','tubers'],food:10000});g.state.units=g.state.units.filter(u=>u.team!==1);for(let i=0;i<8;i++)g.spawnUnit('worker',0,30,1);g.state.buildings=g.state.buildings.filter(b=>b.team!==1||b.type!=='farm');const b=g.makeBld('farm',20,30,1);g.state.buildings.push(b);crop(g,b);return {g,b};}
test('rivals choose learned woodland crops without free food or altering planted fields',()=>{
 const {g,b}=setup(),food=g.tribe(1).food;assert.ok(manageRivalFields(g,1));assert.equal(b.crop.kind,'tubers');assert.equal(g.tribe(1).food,food);
 b.crop.planted=.5;g.tribe(1).cultivated=['grain'];g.state.time+=61;manageRivalFields(g,1);assert.equal(b.crop.kind,'tubers');assert.equal(b.crop.planted,.5);
});
test('rivals do not invent crop knowledge and use pulses to conserve tired soil',()=>{
 const {g,b}=setup();g.tribe(1).cultivated=['grain'];manageRivalFields(g,1);assert.equal(b.crop.kind,'grain');
 g.tribe(1).cultivated=['grain','pulses'];b.fertility=.6;g.state.time+=61;manageRivalFields(g,1);assert.equal(b.crop.kind,'pulses');
 const saved=decodeGame(encodeGame(g));assert.equal(saved.state.buildings.find(v=>v.id===b.id).crop.kind,'pulses');
});
test('only surplus fields rest and a food shortage reopens them during spring',()=>{
 const {g,b}=setup();b.fertility=.5;for(let i=0;i<24;i++){const f=g.makeBld('farm',40+i*2,30,1);g.state.buildings.push(f);crop(g,f);f.fertility=.5;}
 manageRivalFields(g,1);const resting=g.state.buildings.filter(f=>f.team===1&&f.fallowYear===0);assert.ok(resting.length>0&&resting.length<=5);
 g.tribe(1).food=1;g.state.time+=61;manageRivalFields(g,1);assert.ok(resting.every(f=>f.fallowYear===undefined));
 const player=g.makeBld('farm',0,0,0);g.state.buildings.push(player);assert.equal(manageRivalFields(g,0),0);assert.equal(player.cropType,undefined);
});
