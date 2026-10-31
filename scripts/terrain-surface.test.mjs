import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {surfacePixels,TerrainSurface,SURFACE_RULES} from '../src/scene/terrainSurface.ts';
import {makeDepthWater,riverWaterGeometry,clippedRiverGeometry,addLocalWaters} from '../src/scene/depthWater.ts';
test('original surface atlas is deterministic, has independent fracture/grain/roughness information and stays bounded',()=>{
 const a=surfacePixels(42),b=surfacePixels(42),c=surfacePixels(43);
 assert.deepEqual(a,b);assert.notDeepEqual(a,c);assert.equal(a.length,SURFACE_RULES.textureSize**2*4);
 for(let channel=0;channel<4;channel++){const values=new Set();for(let i=channel;i<a.length;i+=4)values.add(a[i]);assert.ok(values.size>30,`channel ${channel} has actual detail`);}
});
test('terrain surface augments albedo roughness and normals without changing authoritative heightfield',()=>{
 const heights=new Float32Array([0,1,2,3]),before=heights.slice(),surface=new TerrainSurface(heights,20,42),material=new THREE.MeshStandardMaterial({vertexColors:true});
 surface.bind(material);assert.equal(material.flatShading,false,'ordinary terrain keeps smooth vertex normals');const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
 material.onBeforeCompile(shader,null);assert.match(shader.fragmentShader,/surfacePerturb\(-vViewPosition/);assert.match(shader.fragmentShader,/roughnessFactor=clamp/);assert.match(shader.fragmentShader,/diffuseColor.rgb\*=variation/);
 assert.equal(shader.uniforms.surfaceDetail.value,surface.detail);assert.deepEqual(heights,before);
 const time={value:7},water=makeDepthWater(surface,time);assert.equal(water.uniforms.uTime,time);assert.equal(water.uniforms.uHeights.value,surface.heights,'water shares one authoritative height texture');
 assert.match(water.fragmentShader,/smoothstep\(0\.35,5\.00,depth\)/,'shader limits are GLSL float literals');assert.match(water.fragmentShader,/bedHeight/);assert.match(water.fragmentShader,/foam/);assert.equal(water.fog,true);
 surface.dispose();material.dispose();water.dispose();
});
test('local river, lake and falling-water surfaces keep actual elevations and bounded geometry',()=>{
 const pts=[{x:0,z:0,y:20},{x:10,z:0,y:19},{x:20,z:5,y:18}],geo=riverWaterGeometry(pts,8);
 assert.ok(geo.attributes.position.count>6);assert.ok(geo.index.count>12);assert.equal(geo.attributes.position.getY(0),20);assert.equal(geo.attributes.position.getY(geo.attributes.position.count-1),18);
 const group=new THREE.Group(),material=new THREE.MeshBasicMaterial();
 addLocalWaters(group,[{kind:'river',id:0,pts,width:8},{kind:'lake',id:1,x:20,z:30,rx:12,rz:8,surfaceY:18}],[{x:20,z:5,upperY:18,lowerY:3,width:8,dx:1,dz:0}],material,material);
 assert.equal(group.children.length,3);assert.equal(group.children[1].position.y,18);
 const fall=group.children[2].geometry.attributes.position;let low=Infinity,high=-Infinity;
 for(let i=0;i<fall.count;i++){low=Math.min(low,fall.getY(i));high=Math.max(high,fall.getY(i));for(let j=0;j<3;j++)assert.ok(Number.isFinite(fall.array[i*3+j]));}
 assert.equal(low,3);assert.equal(high,18);
 for(const mesh of group.children)mesh.geometry.dispose();geo.dispose();material.dispose();
});

import {duneSandWeight} from '../src/scene/terrainSurface.ts';
test('sand material follows the actual rotated dune footprint, not a broad search radius',()=>{
 const features=[{kind:'dunes',x:10,z:20,radius:100,shape:{rx:30,rz:10,rotation:Math.PI/2}}];
 assert.equal(duneSandWeight(features,10,20),1);
 assert.equal(duneSandWeight(features,25,20),0,'outside narrow rotated ellipse remains original ground');
 assert.ok(Math.abs(duneSandWeight(features,10,48)-4/9)<1e-10);
 assert.equal(duneSandWeight([{kind:'dunes',x:10,z:20,radius:100}],10,20),0,'legacy markers do not imply a physical sand footprint');
});


import {lakeContains,lakeBoundaryDistance} from '../src/game/localWater.ts';
test('river surfaces clip to the shared physical shoreline and lake meshes use that actual polygon',()=>{
 const lake={kind:'lake',id:'irregular',x:0,z:0,rx:12,rz:10,surfaceY:8,shoreline:[{x:-10,z:-8},{x:7,z:-6},{x:12,z:2},{x:4,z:9},{x:-8,z:5}]};
 const river=clippedRiverGeometry([{x:0,z:0,y:8},{x:30,z:0,y:7}],6,[lake]),pos=river.attributes.position;
 assert.ok(pos.count>0);
 for(let i=0;i<pos.count;i+=3){const x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3;assert.ok(lakeBoundaryDistance(lake,x,z)>=-1e-5,'river stays outside lake within float vertex precision');}
 const scene=new THREE.Group(),material=new THREE.MeshBasicMaterial();addLocalWaters(scene,[lake],[],material,material);
 const lakePos=scene.children[0].geometry.attributes.position,coordinates=[];for(let i=0;i<lakePos.count;i++)coordinates.push([lakePos.getX(i),lakePos.getZ(i)]);
 assert.ok(coordinates.some(([x,z])=>Math.abs(x-12)<1e-6&&Math.abs(z-2)<1e-6),'uses asymmetrical shore vertex instead of an ellipse');
 river.dispose();scene.children[0].geometry.dispose();material.dispose();
});

test('curved variable-width river is one stitched manifold grid without interior cracks',()=>{
 const geometry=riverWaterGeometry([{x:0,y:8,z:0,w:8},{x:10,y:7.8,z:1,w:12},{x:17,y:7.5,z:9,w:9},{x:30,y:7,z:11,w:8}],10);
 const indices=geometry.index.array,edges=new Map();
 for(let i=0;i<indices.length;i+=3)for(const [a,b]of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){const key=a<b?`${a}/${b}`:`${b}/${a}`;edges.set(key,(edges.get(key)||0)+1);}
 const boundary=new Map();for(const [key,count]of edges){assert.ok(count===1||count===2);if(count!==1)continue;const [a,b]=key.split('/').map(Number);for(const [x,y]of [[a,b],[b,a]]){const next=boundary.get(x)||[];next.push(y);boundary.set(x,next);}}
 assert.ok([...boundary.values()].every(neighbors=>neighbors.length===2));
 const seen=new Set(),queue=[boundary.keys().next().value];for(let i=0;i<queue.length;i++){const x=queue[i];if(seen.has(x))continue;seen.add(x);queue.push(...boundary.get(x));}
 assert.equal(seen.size,boundary.size,'one outer boundary; no separate crack boundaries at segment joins');
 assert.equal(geometry.attributes.position.count-edges.size+indices.length/3,1,'stitched ribbon is a topological disk');
 geometry.dispose();
});

test('ecology surface attributes affect material channels only when the optional ecology gate is enabled',()=>{
 const heights=new Float32Array([0,1,2,3]),surface=new TerrainSurface(heights,20,42),material=new THREE.MeshStandardMaterial();
 const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
 surface.bind(material);const legacy=shader();material.onBeforeCompile(legacy,null);assert.doesNotMatch(legacy.fragmentShader,/vBiomeCover/);assert.doesNotMatch(legacy.vertexShader,/attribute vec4 biomeCover/);
 surface.bind(material,true);const ecological=shader();material.onBeforeCompile(ecological,null);
 assert.match(ecological.vertexShader,/vBiomeCover=biomeCover/);assert.match(ecological.fragmentShader,/roughnessFactor=mix\(roughnessFactor,clamp\(vBiomeMaterial.x/);assert.match(ecological.fragmentShader,/vBiomeMaterial.y\/0.055/);assert.match(ecological.fragmentShader,/vBiomeCover.y\*\.09/);
 assert.deepEqual(heights,new Float32Array([0,1,2,3]));surface.dispose();material.dispose();
});
