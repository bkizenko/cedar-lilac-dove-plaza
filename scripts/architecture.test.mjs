import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import * as THREE from 'three';
import {architectureStyle} from '../src/scene/architecture.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {WorldView}=await import('../src/scene/world.ts');
test('six ages have distinct stable material palettes, with local roof variations',()=>{
 const styles=Array.from({length:6},(_,age)=>architectureStyle(345,0,age));
 assert.equal(new Set(styles.map(s=>s.roof+s.timber+s.roofHeight)).size,6);
 for(let age=0;age<6;age++){
  assert.deepEqual(architectureStyle(345,1,age),architectureStyle(345,1,age));
  assert.notEqual(architectureStyle(345,0,age).roof,architectureStyle(345,1,age).roof);
 }
});
test('era details appear only on completed discovered buildings, stay bounded and do not change their simulation footprint',()=>{
 const view=Object.create(WorldView.prototype);view.villageStyles=new Map();view.bldMeshes=new Map();
 view.eraDetails=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),16);
 const b={id:1,type:'hut',x:5,y:4,z:5,w:5,d:5,team:0,build:1,hp:100};let age=0;
 const game={state:{seed:345,buildings:[b]},tribe:()=>({age}),exploredAt:()=>false};
 const original={...b};view.syncEraDetails(game);assert.equal(view.eraDetails.count,0);
 age=1;view.syncEraDetails(game);assert.equal(view.eraDetails.count,4);
 age=5;view.syncEraDetails(game);assert.equal(view.eraDetails.count,10);assert.deepEqual(b,original);
 for(let i=0;i<view.eraDetails.count;i++){const m=new THREE.Matrix4();view.eraDetails.getMatrixAt(i,m);assert.ok(m.elements.every(Number.isFinite));}
 game.state.buildings=[{...b,team:1},{...b,build:.5},{...b,type:'farm'}];view.syncEraDetails(game);assert.equal(view.eraDetails.count,0);
 game.state.buildings=Array.from({length:100},(_,i)=>({...b,id:i}));view.syncEraDetails(game);assert.equal(view.eraDetails.count,16);
 view.eraDetails.geometry.dispose();view.eraDetails.material.dispose();
});

test('building materials allow era colors through and rebuilt scenes own disposable materials',async()=>{
 const view=Object.create(WorldView.prototype);view.scene=new THREE.Scene();view.bldMeshes=new Map();view.mats=new Proxy({}, {get(target,key){return target[key]??=new THREE.MeshStandardMaterial({color:0xb88858});}});
 view.buildBuildings();
 const hut=view.bldMeshes.get('hut');assert.equal(hut.timber.material.color.getHexString(),'ffffff');
 assert.notEqual(hut.timber.material,view.mats.timber);assert.notEqual(hut.roof.material,view.mats.thatch);
 for(const m of view.bldMeshes.values()){m.timber.geometry.dispose();m.roof.geometry.dispose();m.extra?.geometry.dispose();m.timber.material.dispose();m.roof.material.dispose();}
 view.eraDetails.geometry.dispose();view.eraDetails.material.dispose();for(const material of Object.values(view.mats))material.dispose();
});


test('local timber, earth and stone palettes distinguish habitats through every age',()=>{
 for(let age=0;age<6;age++){
  const styles=['plains','forest','hills'].map(h=>architectureStyle(345,1,age,h));
  assert.equal(new Set(styles.map(s=>s.timber)).size,3);
  assert.equal(new Set(styles.map(s=>s.roof)).size,1,'local materials retain the village roof identity');
 }
});
