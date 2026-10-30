import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {plotModules} from '../src/scene/plotModules.ts';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {WorldView}=await import('../src/scene/world.ts');
import {BUILDINGS} from '../src/game/constants.ts';
function building(type,w=1,d=1){const def=BUILDINGS[type];return {id:1,type,team:0,x:0,y:4,z:0,hp:100,build:1,w:def.w*w,d:def.d*d};}
test('plot bays cover rectangular area, stay human scaled and cache their layout',()=>{
 const b=building('warehouse',3,2),parts=plotModules(b);assert.equal(parts.length,6);assert.equal(plotModules(b),parts);
 assert.ok(Math.abs(parts.reduce((n,p)=>n+p.sx*p.sz,0)-6)<1e-8);assert.ok(parts.every(p=>p.sx<=1&&p.sz<=1));
 b.w=BUILDINGS.warehouse.w;assert.equal(plotModules(b).length,2);
});
test('renderer maps every store bay and crop patch back to one actual building without changing its state',()=>{
 const v=Object.create(WorldView.prototype);v.scene=new THREE.Scene();v.bldMeshes=new Map();v.buildingInstances=new Map();v.villageStyles=new Map();
 v.mats=new Proxy({}, {get(t,k){return t[k]??=new THREE.MeshStandardMaterial();}});v.buildBuildings();
 const store=building('warehouse',2,3),farm={...building('farm',3,2),id:2,crop:{planted:1,tended:1,ripened:true,remaining:100}};
 const game={state:{seed:345,buildings:[store,farm]},tribe:()=>({age:0}),exploredAt:()=>false,height:()=>4,world:{biomes:[]}};
 const before=JSON.stringify(game.state.buildings);v.syncBuildings(game);
 const sm=v.bldMeshes.get('warehouse'),fm=v.bldMeshes.get('farm');assert.equal(sm.timber.count,6);assert.equal(fm.timber.count,1);assert.equal(fm.roof.count,1);assert.equal(fm.extra.count,6);
 assert.ok(v.buildingInstances.get(sm.roof).every(b=>b===store));assert.ok(v.buildingInstances.get(fm.extra).every(b=>b===farm));
 assert.equal(JSON.stringify(game.state.buildings),before);
 const mat=new THREE.Matrix4(),scale=new THREE.Vector3();sm.timber.getMatrixAt(0,mat);scale.setFromMatrixScale(mat);assert.equal(scale.x,1);assert.equal(scale.z,1);
 fm.extra.getMatrixAt(0,mat);const matureHeight=new THREE.Vector3().setFromMatrixScale(mat).y;
 farm.crop={planted:0,tended:0,ripened:false,remaining:0};v.syncBuildings(game);fm.extra.getMatrixAt(0,mat);assert.ok(new THREE.Vector3().setFromMatrixScale(mat).y<matureHeight*.1);
 const hidden={...store,team:1,id:3};game.state.buildings=[hidden];v.syncBuildings(game);assert.equal(sm.timber.count,0);assert.equal(v.buildingInstances.get(sm.roof).length,0);
 for(const m of v.bldMeshes.values())for(const mesh of [m.timber,m.roof,m.extra])if(mesh){mesh.geometry.dispose();mesh.material.dispose();}v.eraDetails.geometry.dispose();v.eraDetails.material.dispose();
});
