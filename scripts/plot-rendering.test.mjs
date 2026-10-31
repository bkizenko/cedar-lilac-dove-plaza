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

test('sloped fields use terrain displacement for crops and shadows while the shed stays upright on its own ground', async()=>{
 const {FieldSurface}=await import('../src/scene/fieldSurface.ts');
 const {MAP,SEGS}=await import('../src/game/constants.ts');
 const v=Object.create(WorldView.prototype);v.scene=new THREE.Scene();v.bldMeshes=new Map();v.buildingInstances=new Map();v.villageStyles=new Map();
 const heights=new Float32Array((SEGS+1)**2);
 for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++)heights[z*(SEGS+1)+x]=4+(x/SEGS*MAP-MAP/2)*.2;
 v.fieldSurface=new FieldSurface(heights);
 v.mats=new Proxy({}, {get(t,k){return t[k]??=new THREE.MeshStandardMaterial();}});v.buildBuildings();
 const farm={...building('farm',3,2),crop:{planted:1,tended:1,ripened:true,remaining:100}};
 const game={state:{seed:345,buildings:[farm]},tribe:()=>({age:0}),exploredAt:()=>false,height:(x,z)=>4+x*.2+z*.1,world:{biomes:[]}};
 const before=JSON.stringify(farm);v.syncBuildings(game);
 const field=v.bldMeshes.get('farm'),m=new THREE.Matrix4();
 for(const mesh of [field.timber,field.extra]){
  mesh.getMatrixAt(0,m);assert.equal(m.elements[1],0);assert.equal(m.elements[9],0,'field no longer tilts as a rigid tray');
  assert.equal(mesh.customDepthMaterial,v.fieldSurface.depth);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader};mesh.material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.fieldHeights.value,v.fieldSurface.texture);assert.match(shader.vertexShader,/fieldHeight\(fieldWorld.xz\)/);
 }
 const shadow={uniforms:{},vertexShader:THREE.ShaderLib.depth.vertexShader};v.fieldSurface.depth.onBeforeCompile(shadow);
 assert.match(shadow.vertexShader,/fieldHeight\(fieldWorld.xz\)/);assert.equal(shadow.uniforms.fieldHeights.value,v.fieldSurface.texture);
 field.roof.getMatrixAt(0,m);assert.ok(Math.abs(m.elements[13]-game.height(m.elements[12],m.elements[14]))<1e-5);
 assert.equal(JSON.stringify(farm),before,'rendering must preserve the saved crop and plot');
 assert.ok(field.timber.geometry.attributes.color,'soil and stakes retain distinct materials');
 assert.notEqual(field.extra.material,v.mats.crop,'field deformation must not affect shared crops elsewhere');
 for(const parts of v.bldMeshes.values())for(const mesh of [parts.timber,parts.roof,parts.extra])if(mesh){mesh.geometry.dispose();mesh.material.dispose();}
 v.fieldSurface.dispose();v.eraDetails.geometry.dispose();v.eraDetails.material.dispose();
});

test('a terrain-conforming field can be selected on its ground footprint without revealing a hidden foreign field',()=>{
 const v=Object.create(WorldView.prototype);v.renderer={domElement:{clientWidth:800,clientHeight:600}};
 v.camera=new THREE.PerspectiveCamera();v.bldMeshes=new Map();v.unitMeshes=new Map();
 const own=building('farm',3,2),foreign={...building('farm'),id:2,team:1,x:30};let point={x:0,z:0};v.groundAt=()=>point;
 const game={state:{buildings:[own,foreign]},visibleAt:()=>false};
 assert.equal(v.pickEntity(400,300,game),own);point={x:30,z:0};assert.equal(v.pickEntity(400,300,game),null);
 game.visibleAt=()=>true;assert.equal(v.pickEntity(400,300,game),foreign);
});
