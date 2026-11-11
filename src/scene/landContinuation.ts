import * as THREE from 'three';
import type {Game} from '../game/sim';
import type {TerrainSurface} from './terrainSurface';
import {biomeSurfaceAttributes} from './biomeSceneLayer';
/** Atmospheric border scenery; never included in picking, resources or navigation. */
export class LandContinuation {
 readonly mesh:THREE.Mesh;
 private mist:THREE.Mesh;
 constructor(scene:THREE.Scene,g:Game,surface:TerrainSurface,ground:THREE.MeshStandardMaterial){
  const data=g.world.landContinuation!,half=g.world.size/2;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(data.positions.length).fill(.42),3));geometry.setAttribute('surfaceRock',new THREE.Float32BufferAttribute(new Float32Array(data.positions.length/3).fill(.15),1));geometry.setAttribute('surfaceSand',new THREE.Float32BufferAttribute(new Float32Array(data.positions.length/3),1));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  if(g.world.bankTerrain)geometry.setAttribute('surfaceBank',new THREE.BufferAttribute(new Float32Array(data.positions.length/3),1));
  if(g.world.ecology){const a=biomeSurfaceAttributes(g.world.ecology,geometry.getAttribute('position') as THREE.BufferAttribute);geometry.setAttribute('biomeCover',new THREE.BufferAttribute(a.cover,4));geometry.setAttribute('biomeMaterial',new THREE.BufferAttribute(a.material,4));geometry.setAttribute('biomeTint',new THREE.BufferAttribute(a.tint,3));}
  const material=ground.clone();surface.bind(material,!!g.world.ecology);const prior=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.transparent=true;material.depthWrite=false;material.customProgramCacheKey=()=>`${key}-bounded-border-v1`;
  material.onBeforeCompile=(shader,renderer)=>{prior.call(material,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
   float borderDistance=max(max(abs(vSurfaceWorld.x),abs(vSurfaceWorld.z))-${half.toFixed(1)},0.);
   float borderHaze=smoothstep(${(data.width*.25).toFixed(1)},${data.width.toFixed(1)},borderDistance);
   #ifdef USE_FOG
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,borderHaze);
   #endif
   gl_FragColor.a*=1.-borderHaze;
  `);};
  this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='nonplayable-land-continuation';this.mesh.receiveShadow=true;this.mesh.raycast=()=>{};this.mesh.renderOrder=2;scene.add(this.mesh);
  // A soft fog sheet hides the distant ocean beneath continental map borders.
  // It is outside playable bounds and below continued land, with no collider.
  const outer=half+10000,shape=new THREE.Shape([new THREE.Vector2(-outer,-outer),new THREE.Vector2(outer,-outer),new THREE.Vector2(outer,outer),new THREE.Vector2(-outer,outer)]),hole=new THREE.Path([new THREE.Vector2(-half,-half),new THREE.Vector2(-half,half),new THREE.Vector2(half,half),new THREE.Vector2(half,-half)]);shape.holes.push(hole);
  const fog=(scene.fog as THREE.FogExp2)?.color||new THREE.Color('#bec9c7'),mistMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{fogTint:{value:fog}},vertexShader:'varying vec2 borderXZ;void main(){vec4 w=modelMatrix*vec4(position,1.);borderXZ=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:`
   varying vec2 borderXZ;
   uniform vec3 fogTint;
   void main(){
    float d=max(max(abs(borderXZ.x),abs(borderXZ.y))-${half.toFixed(1)},0.);
    gl_FragColor=vec4(fogTint,smoothstep(0.,${data.width.toFixed(1)},d));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `});
  const mistGeo=new THREE.ShapeGeometry(shape);mistGeo.rotateX(-Math.PI/2);this.mist=new THREE.Mesh(mistGeo,mistMat);this.mist.name='nonplayable-border-mist';this.mist.position.y=g.world.waterY+.015;this.mist.raycast=()=>{};this.mist.renderOrder=1;scene.add(this.mist);
 }
 sync(g:Game){this.mist.position.y=g.world.waterY+.015;}
 dispose(){for(const mesh of [this.mesh,this.mist]){mesh.parent?.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}}
}
