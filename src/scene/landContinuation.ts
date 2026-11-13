import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {TerrainSurface} from './terrainSurface';
import {biomeSurfaceAttributes} from './biomeSceneLayer';
/** Atmospheric border scenery; never included in picking, resources or navigation. */
export class LandContinuation {
 readonly mesh:THREE.Mesh;
 constructor(scene:THREE.Scene,g:Game,surface:TerrainSurface,ground:THREE.MeshStandardMaterial){
  const data=g.world.landContinuation!,half=g.world.size/2;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(data.positions.length).fill(.42),3));geometry.setAttribute('surfaceRock',new THREE.Float32BufferAttribute(new Float32Array(data.positions.length/3).fill(.15),1));geometry.setAttribute('surfaceSand',new THREE.Float32BufferAttribute(new Float32Array(data.positions.length/3),1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  if(g.world.bankTerrain)geometry.setAttribute('surfaceBank',new THREE.BufferAttribute(new Float32Array(data.positions.length/3),1));
  if(g.world.ecology){const a=biomeSurfaceAttributes(g.world.ecology,geometry.getAttribute('position') as THREE.BufferAttribute);geometry.setAttribute('biomeCover',new THREE.BufferAttribute(a.cover,4));geometry.setAttribute('biomeMaterial',new THREE.BufferAttribute(a.material,4));geometry.setAttribute('biomeTint',new THREE.BufferAttribute(a.tint,3));}
  const material=ground.clone();surface.bind(material,!!g.world.ecology);const prior=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.transparent=true;material.depthWrite=false;material.customProgramCacheKey=()=>`${key}-bounded-border-v2`;
  material.onBeforeCompile=(shader,renderer)=>{prior.call(material,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
   float borderDistance=max(max(abs(vSurfaceWorld.x),abs(vSurfaceWorld.z))-${half.toFixed(1)},0.);
   float borderHaze=smoothstep(${(data.width*.5).toFixed(1)},${data.width.toFixed(1)},borderDistance);
   gl_FragColor.a*=1.-borderHaze;
  `);};
  this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='nonplayable-land-continuation';this.mesh.receiveShadow=true;this.mesh.raycast=()=>{};this.mesh.renderOrder=2;scene.add(this.mesh);
 }
 /** The land beyond the border is the horizon ring (horizonRing.ts): this band fades into it, no fog sheet. */
 sync(_g:Game){}
 dispose(){for(const mesh of [this.mesh]){mesh.parent?.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}}
}
