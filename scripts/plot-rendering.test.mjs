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
 const game={state:{seed:345,buildings:[store,farm]},tribe:()=>({age:0}),exploredAt:()=>false,terrainRevision:()=>0,height:()=>4,world:{biomes:[]}};
 const before=JSON.stringify(game.state.buildings);v.syncBuildings(game);
 const sm=v.bldMeshes.get('warehouse'),fm=v.bldMeshes.get('farm');assert.equal(sm.timber.count,6);assert.equal(fm.timber.count,1);assert.equal(fm.roof.count,0);assert.equal(fm.extra.count,6);
 assert.ok(v.buildingInstances.get(sm.roof).every(b=>b===store));assert.ok(v.buildingInstances.get(fm.extra).every(b=>b===farm));
 assert.equal(JSON.stringify(game.state.buildings),before);
 const mat=new THREE.Matrix4(),scale=new THREE.Vector3();sm.timber.getMatrixAt(0,mat);scale.setFromMatrixScale(mat);assert.equal(scale.x,1);assert.equal(scale.z,1);
 fm.extra.getMatrixAt(0,mat);const matureHeight=new THREE.Vector3().setFromMatrixScale(mat).y;
 farm.crop={planted:0,tended:0,ripened:false,remaining:0};v.syncBuildings(game);fm.extra.getMatrixAt(0,mat);assert.ok(new THREE.Vector3().setFromMatrixScale(mat).y<matureHeight*.1);
 const hidden={...store,team:1,id:3};game.state.buildings=[hidden];v.syncBuildings(game);assert.equal(sm.timber.count,0);assert.equal(v.buildingInstances.get(sm.roof).length,0);
 for(const m of v.bldMeshes.values())for(const mesh of [m.timber,m.roof,m.extra])if(mesh){mesh.geometry.dispose();mesh.material.dispose();}v.eraDetails.geometry.dispose();v.eraDetails.material.dispose();
});

test('sloped planted fields use terrain displacement for crops and shadows without a roof building', async()=>{
 const {FieldSurface}=await import('../src/scene/fieldSurface.ts');
 const {MAP,SEGS}=await import('../src/game/constants.ts');
 const v=Object.create(WorldView.prototype);v.scene=new THREE.Scene();v.bldMeshes=new Map();v.buildingInstances=new Map();v.villageStyles=new Map();
 const heights=new Float32Array((SEGS+1)**2);
 for(let z=0;z<=SEGS;z++)for(let x=0;x<=SEGS;x++)heights[z*(SEGS+1)+x]=4+(x/SEGS*MAP-MAP/2)*.2;
 v.fieldSurface=new FieldSurface(heights);
 v.mats=new Proxy({}, {get(t,k){return t[k]??=new THREE.MeshStandardMaterial();}});v.buildBuildings();
 const farm={...building('farm',3,2),crop:{planted:1,tended:1,ripened:true,remaining:100}};
 const game={state:{seed:345,buildings:[farm]},tribe:()=>({age:0}),exploredAt:()=>false,terrainRevision:()=>0,height:(x,z)=>4+x*.2+z*.1,world:{biomes:[]}};
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
 assert.equal(field.roof.count,0);assert.equal(field.roof.geometry.getAttribute('position'),undefined);
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

test('territory and fog overlay follows every terrain vertex on enlarged maps',()=>{
 const v=Object.create(WorldView.prototype);v.mapSize=1040;v.look=new THREE.Vector3();v.scene=new THREE.Scene();v.cameraClearance={invalidate(){}};
 v.fowMesh=new THREE.Mesh(new THREE.PlaneGeometry(1040,1040,2,2),new THREE.ShaderMaterial({uniforms:{uHalf:{value:520},uSize:{value:1040}}}));
 for(const name of ['disposeWorld','buildTerrain','buildNature','buildBuildings','buildUnits','buildHearths','buildWildlife','updateCamera'])v[name]=()=>{};
 const height=(x,z)=>Math.abs(x)<1&&Math.abs(z)<1?45:4;
 const game={state:{time:0,units:[],buildings:[],tribes:[]},world:{size:2080,heights:new Float32Array(25),waterY:0,camps:[]},height,waterAt:()=>0,navigationRevision:()=>0};
 v.rebuild(game);
 assert.equal(v.fowMesh.geometry.parameters.widthSegments,4);
 const positions=v.fowMesh.geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getZ(i)-height(positions.getX(i),-positions.getY(i))-.8)<.00001);
 assert.equal(v.fowMesh.material.uniforms.uSize.value,2080);
 v.fieldSurface.dispose();v.fowMesh.geometry.dispose();v.fowMesh.material.dispose();
});
test('rigid buildings clear uphill terrain and receive full-depth footings without rewriting saved placement',async()=>{
 const {foundationProfile}=await import('../src/scene/foundations.ts');
 const b=building('townhall'),before=JSON.stringify(b),g={world:{heights:new Float32Array(9)},terrainRevision:()=>0,height:(x,z)=>4+x*.2+z*.1};
 const f=foundationProfile(g,b);assert.ok(f.level>4);assert.ok(f.bottom<4);
 assert.equal(JSON.stringify(b),before);assert.equal(foundationProfile(g,b),f,'cached support calculation');
 const v=Object.create(WorldView.prototype);v.scene=new THREE.Scene();v.bldMeshes=new Map();v.buildingInstances=new Map();v.villageStyles=new Map();v.mats=new Proxy({},{get(t,k){return t[k]??=new THREE.MeshStandardMaterial();}});v.buildBuildings();
 const game={...g,state:{seed:345,buildings:[b]},tribe:()=>({age:0}),finished:b=>b.build>=1&&b.hp>0,exploredAt:()=>true};v.syncBuildings(game);
 const matrix=new THREE.Matrix4();v.bldMeshes.get('townhall').timber.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[13]-f.level)<.00001);assert.ok(v.foundations.mesh.count>1,'wall bearings receive separate support strips');
 assert.equal(v.foundations.metrics.overflow,0);
});

test('expanded grain bays render at human scale and select the same workshop',()=>{
 const view=Object.create(WorldView.prototype);
 view.scene=new THREE.Scene();
 view.bldMeshes=new Map();
 view.buildingInstances=new Map();
 view.villageStyles=new Map();
 view.mats=new Proxy({},{get(target,key){return target[key]??=new THREE.MeshStandardMaterial();}});
 view.buildBuildings();
 const grain=['threshingFloor','grindingStone','oven'].map((type,index)=>({...building(type,2,1),id:index+1}));
 const game={state:{seed:345,buildings:grain},tribe:()=>({age:0}),exploredAt:()=>true,height:()=>4,terrainRevision:()=>0,world:{biomes:[]}};
 view.syncBuildings(game);
 for(const workshop of grain){
  const {timber}=view.bldMeshes.get(workshop.type);
  assert.equal(timber.count,2);
  assert.deepEqual(view.buildingInstances.get(timber),[workshop,workshop]);
  const matrix=new THREE.Matrix4();
  timber.getMatrixAt(1,matrix);
  assert.equal(matrix.elements[12],BUILDINGS[workshop.type].w/2);
  assert.equal(new THREE.Vector3().setFromMatrixScale(matrix).x,1);
 }
});

test('expanded foreign grain bays and their footings use the same axis-aligned footprint',async()=>{
 const {buildingGroundSupports}=await import('../src/scene/buildingGrounding.ts');
 const {buildingGeos}=await import('../src/scene/meshes.ts');
 buildingGeos();
 const foreign={...building('threshingFloor',2,1),team:1};
 const own={...foreign,team:0};
 const g={state:{},world:{heights:new Float32Array(9)},height:(x,z)=>4+x*.09+z*.07,terrainRevision:()=>0};
 const ownSupports=buildingGroundSupports(g,own);
 assert.ok(ownSupports.length>0);
 assert.deepEqual(buildingGroundSupports(g,foreign),ownSupports);
 assert.notDeepEqual(buildingGroundSupports(g,building('threshingFloor')),
  buildingGroundSupports(g,{...building('threshingFloor'),team:1}),'ordinary foreign sites retain team styling');
});
