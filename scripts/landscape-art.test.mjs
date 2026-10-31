import test from 'node:test';
import assert from 'node:assert/strict';
import {landscapeSample,LANDSCAPE_ART_RULES} from '../src/scene/landscapeArt.ts';
test('landscape art exposes real slopes, keeps flat valleys vegetated and remains deterministic',()=>{
 const valley=landscapeSample(42,20,30,8,.05,.02),cliff=landscapeSample(42,20,30,22,1.2,.3);
 assert.equal(valley.exposure,0);assert.equal(cliff.exposure,1);
 assert.deepEqual(cliff,landscapeSample(42,20,30,22,1.2,.3));
 const nearby=landscapeSample(42,20.1,30.1,22,1.2,.3);
 assert.ok(Math.abs(cliff.r-nearby.r)<.01);assert.ok(Math.abs(cliff.b-nearby.b)<.01);
 const layer=landscapeSample(42,20,30,22+LANDSCAPE_ART_RULES.strataMetres/2,1.2,.3);
 assert.ok(Math.abs(layer.r-cliff.r)>.01,'height strata are visible');
 for(const seed of [42,9876,123456])for(let x=-500;x<500;x+=17){
  const art=landscapeSample(seed,x,x/2,x/25,.7,.3);
  for(const k of ['r','g','b'])assert.ok(art[k]>=0&&art[k]<=1);
  assert.ok(art.shade>=.9&&art.shade<=1.1);
 }
});

import {ATMOSPHERE_RULES,atmosphericDensity,atmosphericObscurance} from '../src/scene/landscapeArt.ts';
import {campStockBundles} from '../src/scene/campVisual.ts';
test('clear atmosphere preserves nearby work and separates distant ridges while storms retain visibility pressure',()=>{
 const clear=atmosphericDensity('clear',false,0),storm=atmosphericDensity('storm',false,0);
 assert.equal(clear,ATMOSPHERE_RULES.clearDensity);
 assert.ok(atmosphericObscurance(40,clear)<.02);
 assert.ok(atmosphericObscurance(300,clear)>.3);
 assert.ok(storm>clear);assert.ok(atmosphericObscurance(150,storm)>atmosphericObscurance(150,clear));
 assert.ok(atmosphericDensity('clear',false,.8)>clear);
});
test('camp inventory markers disappear when empty and are bounded by actual stored goods',()=>{
 assert.equal(campStockBundles(0),0);assert.equal(campStockBundles(-5),0);
 assert.equal(campStockBundles(1),1);assert.equal(campStockBundles(20),1);assert.equal(campStockBundles(21),2);assert.equal(campStockBundles(10000),8);
});

import * as THREE from 'three';
import {CampVisual} from '../src/scene/campVisual.ts';
test('camp marker batches follow inventory, knowledge, wet ground and actual hall completion',()=>{
 const scene=new THREE.Scene(),view=new CampVisual(scene,1);
 const tribe={alive:true,food:21,wood:0,stone:20};
 const game={world:{camps:[{team:0,x:0,z:0}],waterY:0},state:{buildings:[]},tribe:()=>tribe,exploredAt:()=>true,height:()=>2,finished:b=>b.done};
 view.sync(game);assert.deepEqual(scene.children.slice(0,3).map(m=>m.count),[2,0,1]);
 tribe.food=0;view.sync(game);assert.deepEqual(scene.children.slice(0,3).map(m=>m.count),[0,0,1]);
 game.state.buildings.push({team:0,type:'townhall',done:false});view.sync(game);assert.equal(scene.children[2].count,1);
 game.state.buildings[0].done=true;view.sync(game);assert.deepEqual(scene.children.slice(0,3).map(m=>m.count),[0,0,0]);
 game.state.buildings=[];game.height=()=>0;view.sync(game);assert.deepEqual(scene.children.slice(0,3).map(m=>m.count),[0,0,0]);
 game.height=()=>2;game.exploredAt=()=>false;view.sync(game);assert.deepEqual(scene.children.slice(0,3).map(m=>m.count),[0,0,0]);
 view.dispose();assert.equal(scene.children.length,0);
});

import {Game} from '../src/game/sim.ts';
import {initializeSurvival,tickSurvival} from '../src/game/survivalNeeds.ts';
test('camp embers represent actual last-tick fuel combustion, with no lights or free fire after depletion',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();g.state.units=g.state.units.filter(u=>u.team===0);
 g.world.camps=g.world.camps.filter(c=>c.team===0);g.state.buildings=[];g.world.heights.fill(4);
 g.exploredAt=()=>true;g.clockState=()=>({weather:'Clear · 0°C'});initializeSurvival(g);g.tribe(0).wood=1;
 const scene=new THREE.Scene(),view=new CampVisual(scene,1),embers=scene.getObjectByName('camp-embers');
 view.sync(g);assert.equal(embers.count,0,'no glow before fuel actually burns');
 const before=g.tribe(0).wood;tickSurvival(g,1);view.sync(g);
 assert.ok(g.tribe(0).wood<before);assert.equal(embers.count,6);assert.equal(scene.children.filter(o=>o.isLight).length,0);
 g.tribe(0).wood=0;tickSurvival(g,1);view.sync(g);assert.equal(embers.count,0,'empty stores cannot sustain fire');
 g.tribe(0).wood=50;g.clockState=()=>({weather:'Clear · 20°C'});tickSurvival(g,1);view.sync(g);assert.equal(embers.count,0,'warm weather does not burn free decorative fuel');
 view.dispose();assert.equal(scene.children.length,0);
});
