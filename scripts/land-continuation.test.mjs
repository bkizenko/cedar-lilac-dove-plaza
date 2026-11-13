import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {generateWorld} from '../src/game/worldgen.ts';import {LandContinuation} from '../src/scene/landContinuation.ts';import {TerrainSurface} from '../src/scene/terrainSurface.ts';
test('continental border scenery is bounded, noninteractive, and disposes its own geometry/materials',()=>{
 const world=generateWorld(42,14,{size:1040,layout:'pangaea'}),scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#bdc8c6',.002);
 const surface=new TerrainSurface(world.heights,world.size,42),ground=new THREE.MeshStandardMaterial({vertexColors:true}),layer=new LandContinuation(scene,{world},surface,ground);
 assert.equal(scene.children.length,1,'the flat fog sheet is gone: the land beyond the border is the horizon ring');assert.equal(scene.children.find(m=>m.name==='nonplayable-border-mist'),undefined);assert.equal(layer.mesh.name,'nonplayable-land-continuation');assert.equal(layer.mesh.castShadow,false);assert.ok(layer.mesh.geometry.getAttribute('position').count<25000);
 const ray=new THREE.Raycaster(new THREE.Vector3(600,100,0),new THREE.Vector3(0,-1,0));assert.deepEqual(ray.intersectObjects(scene.children),[],'visual land grants no target/picking surface');
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <dithering_fragment>'};layer.mesh.material.onBeforeCompile(shader,{});assert.match(shader.fragmentShader,/borderHaze/);assert.doesNotMatch(shader.fragmentShader,/mix\(gl_FragColor\.rgb,fogColor/,'no white fog wash at the border');assert.ok(shader.uniforms.surfaceDetail);
 layer.dispose();assert.equal(scene.children.length,0);surface.dispose();ground.dispose();
});
