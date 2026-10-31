import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PROVINCE_KINDS,PROVINCE_PROFILES} from '../src/game/ecologicalProvinces.ts';
import {BiomeSceneLayer,biomeDressingCandidates,biomeSurfaceParametersAt,biomeSurfaceAttributes,dressingGroundAllowed} from '../src/scene/biomeSceneLayer.ts';
function grid(kind='meadow'){
 const width=8,index=PROVINCE_KINDS.indexOf(kind);return {version:1,size:192,width,cellMeters:24,kinds:new Uint8Array(width*width).fill(index),freshwaterDistanceMeters:new Float32Array(width*width).fill(20),soil:new Float32Array(width*width).fill(PROVINCE_PROFILES[kind].soil),moisture:new Float32Array(width*width).fill(PROVINCE_PROFILES[kind].moisture),temperatureOffsetCelsius:new Float32Array(width*width),metrics:{regions:[]}};
}
function game(){return {world:{size:192},state:{seed:42,trees:[{id:1,x:0,y:4,z:0,amount:50,scale:1,regenT:0}],buildings:[]},height:()=>4,waterAt:()=>1,exploredAt:()=>true,seasonMix:()=>({winter:0,autumn:0,snow:0})};}
test('biome surface profiles blend multiple physical material channels without moving terrain vertices',()=>{
 const ecology=grid();for(let z=0;z<8;z++)for(let x=4;x<8;x++)ecology.kinds[z*8+x]=PROVINCE_KINDS.indexOf('arid');
 const meadow=biomeSurfaceParametersAt(ecology,-60,0),arid=biomeSurfaceParametersAt(ecology,60,0),edge=biomeSurfaceParametersAt(ecology,0,0);
 assert.ok(meadow.organic>arid.organic);assert.ok(meadow.grit<arid.grit);assert.ok(edge.organic<meadow.organic&&edge.organic>arid.organic);assert.notEqual(meadow.detailScaleMetres,arid.detailScaleMetres);
 const positions=new THREE.BufferAttribute(new Float32Array([-60,5,0,60,19,0]),3),before=positions.array.slice(),attributes=biomeSurfaceAttributes(ecology,positions);
 assert.deepEqual(positions.array,before);assert.equal(attributes.cover.length,8);assert.equal(attributes.material.length,8);assert.equal(attributes.tint.length,6);
});
test('deterministic dressing is dry, known, rooted on real ground and avoids work footprints',()=>{
 const g=game(),ecology=grid(),before=structuredClone(g.state),points=biomeDressingCandidates(g,ecology,{x:0,z:0},'med');
 assert.ok(points.length>20&&points.length<=1024);assert.deepEqual(points,biomeDressingCandidates(g,ecology,{x:0,z:0},'med'));
 assert.ok(points.every(p=>p.y===4));assert.deepEqual(g.state,before);
 g.state.buildings=[{hp:100,x:0,z:0,w:16,d:16}];assert.equal(dressingGroundAllowed(g,0,0),false);
 g.waterAt=()=>5;assert.equal(biomeDressingCandidates(g,ecology,{x:0,z:0},'med').length,0);
 g.waterAt=()=>1;g.exploredAt=()=>false;assert.equal(biomeDressingCandidates(g,ecology,{x:0,z:0},'med').length,0);
 assert.equal(biomeDressingCandidates(game(),ecology,{x:0,z:0},'low').length,0);
});
test('integration layer mounts actual resource forms and honors refresh/depletion without touching game state',()=>{
 const g=game(),scene=new THREE.Scene(),layer=new BiomeSceneLayer(scene,g,grid('wetland')),before=structuredClone(g.state);
 const first=layer.sync(g,{x:0,z:0},'med',.1);assert.equal(first.treeReport.resourceCount,1);assert.ok(scene.children.some(o=>o.name==='resource-willow-trunk'));assert.deepEqual(g.state,before);
 const idle=layer.sync(g,{x:0,z:0},'med',.01);assert.equal(idle.treeReport,undefined);
 g.state.trees[0].amount=0;const depleted=layer.sync(g,{x:0,z:0},'med',.2);assert.equal(depleted.treeReport.nearCanopies,0);
 layer.dispose();assert.equal(scene.children.length,0);
});
