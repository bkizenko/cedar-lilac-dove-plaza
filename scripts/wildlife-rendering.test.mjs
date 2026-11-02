import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {wildlifeInstanceAnimals,growWildlifeMesh} from '../src/scene/wildlifeInstances.ts';
const animal=(id,x=0,hp=10)=>({id,species:'deer',x,y:0,z:0,hp,scale:1,facing:0});
test('visible real animals compact without species population cap and excluded animals cannot acquire instance identity',()=>{
 const animals=Array.from({length:40},(_,i)=>animal(i,i));animals[5].hp=0;animals[6].hp=0;
 const before=structuredClone(animals),list=wildlifeInstanceAnimals(animals,'deer',x=>x!==4,x=>x!==5,c=>c.id===5);
 assert.equal(list.length,37);assert.ok(list.includes(animals[39]));assert.ok(!list.some(c=>[4,5,6].includes(c.id)));assert.deepEqual(animals,before);
});
test('moving herd grows one shared draw mesh and cannot disappear behind stale frustum bounds',()=>{
 const scene=new THREE.Scene(),old=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),12);scene.add(old);
 const mesh=growWildlifeMesh(scene,old,40);assert.equal(scene.children.length,1);assert.ok(mesh.instanceMatrix.count>=40);assert.equal(mesh.frustumCulled,false);assert.equal(mesh.geometry,old.geometry);
 const matrix=new THREE.Matrix4();for(let i=0;i<40;i++)mesh.setMatrixAt(i,matrix.makeTranslation(i*3,0,0));mesh.count=40;mesh.computeBoundingSphere();scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(117,5,0),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(mesh)[0].instanceId,39);
 mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
});
