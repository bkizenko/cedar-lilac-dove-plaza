import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {Game} from '../src/game/sim.ts';import {sampleHeight} from '../src/game/worldgen.ts';
import {EXCAVATION_RULES,configureExcavation,excavationWorkNeed,commitExcavation,excavationHeightAt,excavationCuts,cutAmount,cutBounds,excavationIssue,excavationTerrain,setExcavationDepth,excavationConstructionIssue,migratePaidTrenches,validExcavations} from '../src/game/excavation.ts';
import {ExcavationLayer} from '../src/scene/excavationLayer.ts';import {FieldSurface} from '../src/scene/fieldSurface.ts';
import {earthworkPace} from '../src/game/fortifications.ts';
function fixture(){const g=new Game();g.reset(42,1);g.world.heights.fill(8);g.world.waterHeights=undefined;g.state.buildings=[];g.state.excavations=[];for(const k of ['trees','forage','stones','copper','iron'])g.state[k]=[];return g;}
function building(g,depth=1,x=0){const b=g.makeBld('trench',x,0,0);b.excavationDepth=depth;b.build=0;g.state.buildings.push(b);return b;}
function height(g,x,z){return excavationHeightAt(g,x,z,sampleHeight(g.world.heights,x,z,g.world.size));}
test('a plan and unfinished work cannot create a cut; completed paid work commits once',()=>{
 const g=fixture(),b=building(g);configureExcavation(g,b);assert.ok(b.excavationVolume>0);assert.ok(b.excavationWorkSeconds>18);
 assert.equal(commitExcavation(g,b),false);b.build=.99;assert.equal(commitExcavation(g,b),false);assert.equal(height(g,0,0),8);
 b.build=1;b.plannedCost={wood:1};assert.equal(commitExcavation(g,b),false);delete b.plannedCost;
 const stocks=JSON.stringify(g.tribe(0));assert.equal(commitExcavation(g,b),true);assert.equal(commitExcavation(g,b),true);assert.equal(excavationCuts(g).length,1);assert.equal(JSON.stringify(g.tribe(0)),stocks);
 assert.ok(height(g,0,0)<7.05);g.state.buildings=[];assert.ok(height(g,0,0)<7.05);assert.equal(earthworkPace(g,0,0),.5);
});
test('chosen depth scales real volume and labor, smooth banks stay within usable grades',()=>{
 let lastVolume=0,lastWork=0;
 for(const depth of EXCAVATION_RULES.depths){const g=fixture(),b=building(g,depth);configureExcavation(g,b);assert.ok(b.excavationVolume>lastVolume);assert.ok(excavationWorkNeed(g,b)>lastWork);lastVolume=b.excavationVolume;lastWork=excavationWorkNeed(g,b);b.build=1;assert.ok(commitExcavation(g,b));
  assert.ok(Math.abs((8-height(g,0,0))-depth)<.02);
  const bounds=cutBounds(excavationCuts(g)[0]);let maxGrade=0;for(let x=bounds.x0-.5;x<bounds.x1+.5;x+=.1)maxGrade=Math.max(maxGrade,Math.abs(height(g,x+.05,0)-height(g,x-.05,0))/.1);
  assert.ok(maxGrade<=EXCAVATION_RULES.maximumBankGrade+.025,`${depth}: actual fine-triangle grade ${maxGrade}`);
 }
});
test('joined trenches pay only for additional soil; previous soil and dry base remain immutable',()=>{
 const g=fixture(),a=building(g,1);configureExcavation(g,a);a.build=1;commitExcavation(g,a);const repeated=building(g,1);configureExcavation(g,repeated);assert.ok(repeated.excavationVolume<.001,"already removed soil is never charged again");g.state.buildings.pop();const base=g.world.heights.slice(),b=building(g,1,4);configureExcavation(g,b);assert.ok(b.excavationVolume>0&&b.excavationVolume<a.excavationVolume);b.build=1;assert.ok(commitExcavation(g,b));assert.deepEqual(g.world.heights,base);
});
test('water, occupied ground, standing resources and steep natural terrain reject impossible cuts',()=>{
 const g=fixture(),b=building(g,2);g.world.heights.fill(2);assert.match(excavationIssue(g,b),/water/);g.world.heights.fill(8);
 const hut=g.makeBld('hut',4,0,0);g.state.buildings.push(hut);assert.match(excavationIssue(g,b),/structures/);g.state.buildings=[b];g.state.trees=[{id:1,x:0,z:0,amount:10}];assert.match(excavationIssue(g,b),/resources/);g.state.trees=[];
 assert.match(excavationConstructionIssue(g,'farm',2,0,8,8),/banks/);assert.equal(setExcavationDepth(g,100),false);
 for(let i=0;i<g.world.heights.length;i++)g.world.heights[i]=8+(i%(g.world.segs+1))*2;assert.match(excavationIssue(g,b),/gentler/);
});
test('coarse terrain holes, local rendered triangles, and field/shadow atlas describe identical real ground',()=>{
 const g=fixture(),b=building(g);b.build=1;assert.ok(commitExcavation(g,b));
 const geometry=new THREE.PlaneGeometry(g.world.size,g.world.size,g.world.segs,g.world.segs);geometry.rotateX(-Math.PI/2);const p=geometry.getAttribute('position');for(let i=0;i<p.count;i++)p.setY(i,8);geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(p.count*3).fill(.5),3));
 const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide}),base=new THREE.Mesh(geometry,material),fields=new FieldSurface(g.world.heights,g.world.size),layer=new ExcavationLayer(base,fields);layer.sync(g);base.updateMatrixWorld();layer.mesh.updateMatrixWorld();
 assert.ok(base.geometry.index.count<g.world.segs*g.world.segs*6);assert.ok(layer.mesh.geometry.getAttribute('position').count<=EXCAVATION_RULES.maximumTiles*17*17);
 const ray=new THREE.Raycaster();for(const [x,z] of [[0,0],[.13,.27],[2.5,1.2],[-3.4,0],[5,4]]){ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects([base,layer.mesh])[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-height(g,x,z))<1e-5,`${x}/${z}: renderer ${hit.point.y} physical ${height(g,x,z)}`);}
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:''};fields.depth.onBeforeCompile(shader,{});assert.match(shader.vertexShader,/refinedExcavationHeight\(worldXZ,baseHeight\)/);assert.equal(shader.uniforms.cutAtlas.value,fields.excavations.uniforms.cutAtlas.value);
 const data=excavationTerrain(g);assert.equal(data.tiles.size,fields.excavations.uniforms.cutInfo.value.w);layer.dispose();fields.dispose();geometry.dispose();material.dispose();
});

test('legacy completed paid work migrates once while unfinished work retains only its actual paid seconds',()=>{
 const g=fixture(),old=building(g);delete old.excavationDepth;old.build=1;migratePaidTrenches(g);assert.equal(excavationCuts(g).length,1);assert.equal(excavationCuts(g)[0].legacyPaid,true);assert.equal(excavationCuts(g)[0].workSeconds,18);migratePaidTrenches(g);assert.equal(excavationCuts(g).length,1);
 const pending=building(g,1,30);delete pending.excavationDepth;pending.build=.5;configureExcavation(g,pending);assert.ok(Math.abs(pending.build*pending.excavationWorkSeconds-9)<1e-8);assert.equal(excavationCuts(g).length,1);
});
test('permanent records round-trip independently of building markers and reject malformed or excessive geometry',()=>{
 const g=fixture(),b=building(g);configureExcavation(g,b);b.build=1;commitExcavation(g,b);const records=JSON.parse(JSON.stringify(excavationCuts(g)));assert.equal(validExcavations(records,g.world.size,g.world.segs),true);assert.equal(validExcavations([...records,...records],g.world.size,g.world.segs),false);assert.equal(validExcavations([{...records[0],depth:100}],g.world.size,g.world.segs),false);
 const loaded=fixture();loaded.state.buildings=[];loaded.state.excavations=records;assert.equal(height(loaded,0,0),height(g,0,0));
 const edge=fixture(),edgeCut=building(edge,.5,-511.2);edgeCut.build=1;assert.ok(commitExcavation(edge,edgeCut));assert.equal(height(edge,520,-8.125),8,"outside-world sampling cannot alias a tile on the opposite edge");
});
test('the shared Game.height adapter lets a real resident walk down and out of a permanent 2m cut',()=>{
 const g=fixture(),b=building(g,2);configureExcavation(g,b);b.build=1;assert.ok(commitExcavation(g,b));g.state.buildings=[];
 // The integrator-owned Game.height hook is injected here to test its exact
 // physical contract without editing shared simulation files in this batch.
 g.height=(x,z)=>height(g,x,z);g.rebuildWalk();const u=g.spawnUnit('worker',-12,0,0);g.state.units=[u];u.order='move';u.tx=12;u.tz=0;
 let lowest=u.y,steps=0,maxStep=0;while(Math.hypot(u.x-12,u.z)>.6&&steps++<2000){const x=u.x,z=u.z;g.state.time+=.1;g.navBudget=10;g.steer(u,.1);lowest=Math.min(lowest,u.y);maxStep=Math.max(maxStep,Math.hypot(u.x-x,u.z-z));assert.ok(Math.abs(u.y-height(g,u.x,u.z))<1e-5);}
 assert.ok(Math.hypot(u.x-12,u.z)<=.6,'resident reaches the opposite bank');assert.ok(lowest<6.05,'resident physically descends to the excavated floor');assert.ok(u.y>7.9,'resident climbs back onto original ground');assert.ok(maxStep<1,'no positional jump');
});

test('simultaneously reserved neighbors reduce remaining soil without losing already performed labor',()=>{
 const g=fixture(),a=building(g,1,0),b=building(g,1,3);configureExcavation(g,a);configureExcavation(g,b);const before=excavationWorkNeed(g,b);b.build=.1;const paid=b.build*before;a.build=1;assert.ok(commitExcavation(g,a));const after=excavationWorkNeed(g,b);assert.ok(after<before);assert.ok(Math.abs(b.build*after-paid)<1e-8);assert.equal(excavationCuts(g).length,1,'adjusting a work estimate cannot create unpaid soil removal');
});
