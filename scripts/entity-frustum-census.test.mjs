import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {countEntityFrustum} from '../src/scene/entityFrustumCensus.ts';
const owner=(id,team=0)=>({id,team,hp:100});
function camera(){const c=new THREE.PerspectiveCamera(60,1,.1,100);c.position.set(0,0,10);c.lookAt(0,0,0);c.updateProjectionMatrix();c.updateMatrixWorld();return c;}
function mesh(points){const m=new THREE.InstancedMesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial(),points.length);points.forEach((p,i)=>m.setMatrixAt(i,new THREE.Matrix4().makeTranslation(...p)));m.count=points.length;return m;}
test('actual instance bounds, capacity, ownership and duplicate parts, without centre-only tests',()=>{
 const c=camera(),owners=[owner(1),owner(2),owner(3,1),owner(4)],m=mesh([[0,0,0],[6,0,0],[0,0,0],[0,0,0]]);m.count=3;
 // x6 centre is outside the 5.77m half-width, but the box edge intersects.
 const before=Array.from(m.instanceMatrix.array),r=countEntityFrustum(c,[{mesh:m,owners},{mesh:m,owners}],owners);
 assert.deepEqual(r,{total:3,represented:2,inFrustum:2});assert.deepEqual(Array.from(m.instanceMatrix.array),before);
 c.position.x=100;c.lookAt(100,0,0);assert.equal(countEntityFrustum(c,[{mesh:m,owners}],owners).inFrustum,0);
});
test('hidden parents, layers, material, dummy body scales and shelter admission exclude models',()=>{
 const c=camera(),owners=[owner(1)],m=mesh([[0,0,0]]),parent=new THREE.Group();parent.add(m);
 const count=()=>countEntityFrustum(c,[{mesh:m,owners}],owners).represented;
 assert.equal(count(),1);parent.visible=false;assert.equal(count(),0);parent.visible=true;
 m.layers.set(2);assert.equal(count(),0);m.layers.set(0);m.material.visible=false;assert.equal(count(),0);m.material.visible=true;
 m.material.transparent=true;m.material.opacity=0;assert.equal(count(),0);m.material.opacity=1;
 m.geometry.setDrawRange(0,0);assert.equal(count(),0);m.geometry.setDrawRange(0,Infinity);
 m.setMatrixAt(0,new THREE.Matrix4().makeScale(.001,.001,.001));assert.equal(count(),0);
 m.setMatrixAt(0,new THREE.Matrix4());assert.equal(countEntityFrustum(c,[{mesh:m,owners,admitted:()=>false}],owners).represented,0);
});
test('world transforms, shader-deformation envelope and dead owners',()=>{
 const c=camera(),owners=[owner(1),{...owner(2),hp:0}],m=mesh([[0,0,0],[0,0,0]]);m.position.x=8;
 assert.equal(countEntityFrustum(c,[{mesh:m,owners}],owners).inFrustum,0);
 m.geometry.setAttribute('buildingArt',new THREE.InstancedBufferAttribute(new Float32Array([-2,0,0,0,0,0,0,0]),4));
 assert.deepEqual(countEntityFrustum(c,[{mesh:m,owners}],owners),{total:1,represented:1,inFrustum:1});
});
