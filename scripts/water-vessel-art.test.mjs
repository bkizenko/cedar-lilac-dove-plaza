import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {WaterVesselLayer,waterVesselGeometry,vesselStyleColor,WATER_VESSEL_ART} from '../src/scene/waterVesselLayer.ts';
const person=(id,extra={})=>({id,team:0,hp:100,x:0,z:0,waterVessel:{version:1,tripsRemaining:20,origin:{version:1,team:0,site:2,style:'river-incised'}},...extra});
test('only actual serviceable equipment renders and low graphics retains readable owned vessels',()=>{
 const scene=new THREE.Scene(),layer=new WaterVesselLayer(scene),u=person(1),before=JSON.stringify(u),g={visibleAt:()=>false};layer.beginFrame('low',true);
 assert.equal(layer.write(g,u,new THREE.Matrix4()),true);
 for(const p of [person(2,{waterVessel:undefined}),person(3,{waterVessel:{version:1,tripsRemaining:0}}),person(4,{hp:0}),person(5,{shelterId:1}),person(6,{team:1})])assert.equal(layer.write(g,p,new THREE.Matrix4()),false);
 layer.endFrame();assert.equal(layer.mesh.count,1);assert.equal(layer.mesh.castShadow,false);assert.equal(JSON.stringify(u),before);layer.dispose();
});
test('water jar uses final body transform and ray picking resolves its actual carrier',()=>{
 const scene=new THREE.Scene(),layer=new WaterVesselLayer(scene),u=person(1),matrix=new THREE.Matrix4().compose(new THREE.Vector3(12,8,-9),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.7,-.1)),new THREE.Vector3(1.6,1.7,1.8)),actual=new THREE.Matrix4();
 layer.beginFrame('high',true);layer.write({visibleAt:()=>true},u,matrix);layer.endFrame();layer.mesh.getMatrixAt(0,actual);
 for(let i=0;i<16;i++)assert.ok(Math.abs(actual.elements[i]-matrix.elements[i])<1e-5);assert.equal(layer.mesh.castShadow,true);
 scene.updateMatrixWorld(true);layer.mesh.computeBoundingSphere();const target=new THREE.Vector3(-.28,.43,.02).applyMatrix4(matrix),from=new THREE.Vector3(-.28,.43,3).applyMatrix4(matrix),ray=new THREE.Raycaster(from,target.clone().sub(from).normalize()),hits=ray.intersectObject(layer.mesh);assert.ok(hits.length);assert.equal(layer.sources().get(layer.mesh)[hits[0].instanceId],u);
 layer.beginFrame('low');layer.endFrame();assert.equal(layer.mesh.count,0);assert.equal(ray.intersectObject(layer.mesh).length,0);layer.dispose();
});
test('provenance appearance is repeatable and bounded, with geometry and materials released once',()=>{
 assert.equal(vesselStyleColor('river-incised').getHex(),vesselStyleColor('river-incised').getHex());assert.notEqual(vesselStyleColor('river-incised').getHex(),vesselStyleColor('ochre-banded').getHex());
 const geo=waterVesselGeometry();assert.ok(geo.attributes.position.count<2500);assert.equal(geo.attributes.position.count,geo.attributes.color.count);assert.ok(geo.boundingBox.max.y<1);geo.dispose();
 const scene=new THREE.Scene(),layer=new WaterVesselLayer(scene);let geos=0,mats=0;layer.mesh.geometry.addEventListener('dispose',()=>geos++);layer.mesh.material.addEventListener('dispose',()=>mats++);assert.equal(layer.mesh.instanceMatrix.count,WATER_VESSEL_ART.capacity);layer.dispose();layer.dispose();assert.equal(geos,1);assert.equal(mats,1);assert.equal(scene.children.length,0);
});
